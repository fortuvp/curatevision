import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import styled from 'styled-components'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BigNumber, utils as ethersUtils } from 'ethers'
import localforage from 'localforage'
import { STALE_TIME } from 'consts'
import useUrlChainId from 'hooks/use-url-chain-id'
import useNow from 'hooks/use-now'
import useStoredLayout from 'hooks/use-stored-layout'
import useDocumentHead from 'hooks/use-document-head'
import { useAttachment } from 'hooks/use-attachment'
import { WalletContext } from 'contexts/wallet-context'
import { LightTCRViewContext } from 'contexts/light-tcr-view-context'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import { LIGHT_ITEMS_QUERY } from 'utils/graphql'
import { searchStrToFilterObjLight, updateLightFilter } from 'utils/filters'
import { DISPUTE_STATUS, STATUS_CODE } from 'utils/item-status'
import { parseIpfs } from 'utils/ipfs-parse'
import { formatDurationLong } from 'utils/time'
import { getAddressPage } from 'utils/network-utils'
import { ZERO_ADDRESS, capitalizeFirstLetter } from 'utils/string'
import { truncateAtWord } from 'utils/truncate-at-word'
import { NETWORKS_INFO } from 'config/networks'
import { klerosAddresses } from 'config/tcr-addresses'
import { getListOfListsAddresses } from 'config/list-of-lists'
import useSeerMarketsData from 'components/custom-registries/seer/use-seer-markets-data'
import { isSeerRegistry } from 'components/custom-registries/seer/is-seer-registry'
import ETHAmount from 'components/eth-amount'
import { Pagination } from 'components/ui'
import type { V2Field } from 'components/curate/v2'
import {
  Button,
  Grid,
  Page,
  SkeletonBlock,
  Stack,
  truncateMiddle,
} from 'components/curate/primitives'
import {
  RegistryHeader,
  type RegistryParameter,
  type RegistryStat,
} from 'components/curate/registry-header'
import {
  RegistryToolbar,
  type FilterChip,
} from 'components/curate/registry-toolbar'
import {
  EntryList,
  tableColumns,
  type EntryRow,
} from 'components/curate/entry-list'
import { lightEntryStatus } from 'components/curate/entry-status'
import type { ExplainerStep } from 'components/curate/explainer'
import ErrorPage from '../error-page'
import SubmitModal from '../light-item-details/modals/submit'
import SubmitConnectModal from '../light-item-details/modals/submit-connect'

/*
 * Light Curate registry page (/tcr/:chainId/:tcrAddress). The header carries
 * the list's identity, the one action with its exact deposit, live counts and
 * the parameters; the toolbar drives the URL filters; the entries render in
 * the remembered layout with a dot, a label and the time left on every row.
 */

export const NSFW_FILTER_KEY = 'NSFW_FILTER_KEY'
export const ITEMS_PER_PAGE = 40

/** Statuses hidden behind a reveal while the sensitive-content filter is on. */
const HIDDEN_STATUS_CODES = new Set<number>([
  STATUS_CODE.REJECTED,
  STATUS_CODE.REMOVED,
  STATUS_CODE.CHALLENGED,
  STATUS_CODE.CROWDFUNDING,
  STATUS_CODE.CROWDFUNDING_WINNER,
])

/** A dispute round exactly as the subgraph returns it (numbers as strings). */
interface RawRound {
  appealPeriodStart: string
  appealPeriodEnd: string
  ruling: string
  hasPaidRequester: boolean
  hasPaidChallenger: boolean
  amountPaidRequester: string
  amountPaidChallenger: string
}

/** A request exactly as the subgraph returns it. */
interface RawRequest {
  disputed: boolean
  disputeID: string
  submissionTime: string
  resolved: boolean
  deposit: string
  rounds: RawRound[]
}

/** A light item exactly as the subgraph returns it, before decoding. */
interface RawLightItem {
  status: string
  data: string
  requests: RawRequest[]
  props?: V2Field[]
  itemID?: string
  decodedData?: unknown[]
  mergedData?: V2Field[]
  [key: string]: unknown
}

interface RegistryCounters {
  numberOfAbsent: string
  numberOfRegistered: string
  numberOfRegistrationRequested: string
  numberOfClearingRequested: string
  numberOfChallengedRegistrations: string
  numberOfChallengedClearing: string
}

interface LightItemsResult {
  lregistry?: RegistryCounters | null
  litems?: RawLightItem[]
}

interface SeerMarket {
  marketName?: string
  outcomes?: string[]
}

/** A subgraph item with its decoded fields, as the list renders it. */
interface RegistryItem {
  tcrData: SubgraphItem & { mergedData?: V2Field[] }
  columns: V2Field[]
  errors: string[]
  seerMarketData?: SeerMarket
}

const integer = new Intl.NumberFormat('en-US')

/** "51.6 xDAI" from a wei amount, for hints and sentences. */
const formatAmount = (
  amount: BigNumber | undefined,
  symbol: string,
): string | undefined =>
  amount
    ? `${ethersUtils.formatEther(amount).replace(/\.?0+$/, '')} ${symbol}`
    : undefined

/**
 * ERC-792 extra data as Kleros encodes it: the court id in the first 32
 * bytes, the number of jurors in the next 32. Only meaningful when the
 * list's arbitrator is the chain's Kleros arbitrator; other arbitrators may
 * lay their extra data out differently, so callers check that first.
 */
const decodeCourt = (
  extraData: string | undefined,
): { courtId: string; jurors: string } | undefined => {
  if (!extraData || !extraData.startsWith('0x')) return undefined
  const hex = extraData.slice(2)
  if (!/^[0-9a-fA-F]{128,}$/.test(hex)) return undefined
  return {
    courtId: BigNumber.from(`0x${hex.slice(0, 64)}`).toString(),
    jurors: BigNumber.from(`0x${hex.slice(64, 128)}`).toString(),
  }
}

/** "Tag" reads as "tag" in a sentence; acronyms such as "NFT" stay as they are. */
const sentenceCase = (name: string): string =>
  name.length > 1 && name[1] === name[1].toLowerCase()
    ? name[0].toLowerCase() + name.slice(1)
    : name

const valueText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number')
    return String(value)
  if (Array.isArray(value)) return value.map(valueText).join(' ')
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>)
      .map(valueText)
      .join(' ')
  return ''
}

/** Matches the search box against the item id, its status and its values. */
const itemMatchesSearch = (item: RegistryItem, rawSearch: string): boolean => {
  const query = rawSearch.trim().toLowerCase()
  if (!query) return true
  const text = [
    item.tcrData.itemID,
    item.tcrData.ID,
    item.tcrData.status,
    item.columns.map((column) => column.value),
    item.tcrData.mergedData?.map((field) => field.value),
  ]
    .map(valueText)
    .join(' ')
    .toLowerCase()
  return text.includes(query)
}

const pagingItem = (
  _page: number,
  type: string,
  originalElement: React.ReactNode,
) => {
  if (type === 'prev') return <span>Previous</span>
  if (type === 'next') return <span>Next</span>
  return originalElement
}

const AddressLink = styled.a`
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const Entries = styled.section`
  margin-top: 0;
`

const PaginationRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 16px;
`

const Items = () => {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { tcrAddress } = useParams()
  const chainId = useUrlChainId()
  const timestamp = useContext(WalletContext)?.timestamp
  const tcrViewContext = useContext(LightTCRViewContext)
  const metaEvidence = tcrViewContext?.metaEvidence
  const challengePeriodDuration = tcrViewContext?.challengePeriodDuration
  const tcrError = tcrViewContext?.tcrError
  const gtcrView = tcrViewContext?.gtcrView
  const connectedTCRAddr = tcrViewContext?.connectedTCRAddr
  const submissionDeposit = tcrViewContext?.submissionDeposit
  const submissionBaseDeposit = tcrViewContext?.submissionBaseDeposit
  const submissionChallengeDeposit = tcrViewContext?.submissionChallengeDeposit
  const removalDeposit = tcrViewContext?.removalDeposit
  const removalChallengeDeposit = tcrViewContext?.removalChallengeDeposit
  const arbitrationCost = tcrViewContext?.arbitrationCost
  const arbitrator = tcrViewContext?.arbitrator
  const arbitratorExtraData = tcrViewContext?.arbitratorExtraData
  const governor = tcrViewContext?.governor
  const openAttachment = useAttachment()
  const now = useNow()
  const [layout, setLayout] = useStoredLayout('entries', 'table')

  const [submissionFormOpen, setSubmissionFormOpen] = useState<
    boolean | undefined
  >()
  const [error, setError] = useState<string | undefined>()
  const [nsfwFilterOn, setNSFWFilter] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [queryItemParams, setQueryItemParams] = useState<string[] | undefined>()
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())
  const [decodedItems, setDecodedItems] = useState<SubgraphItem[] | undefined>(
    undefined,
  )

  const toggleNSFWFilter = useCallback((checked: boolean) => {
    setNSFWFilter(checked)
    localforage.setItem(NSFW_FILTER_KEY, checked)
  }, [])

  const seerMarketsData = useSeerMarketsData(
    chainId ?? 0,
    tcrAddress ?? '',
    decodedItems ?? [],
  ) as Record<string, SeerMarket | undefined>
  const { graphqlBatcher } = useGraphqlBatcher()

  const queryOptions = searchStrToFilterObjLight(search)
  const {
    oldestFirst,
    page,
    absent,
    registered,
    submitted,
    removalRequested,
    challengedSubmissions,
    challengedRemovals,
  } = queryOptions
  const orderDirection = oldestFirst ? 'asc' : 'desc'

  const itemsWhere = useMemo(() => {
    // Build conditions array for multi-select support
    const conditions = []

    if (absent) conditions.push({ status: { _eq: 'Absent' } })
    if (registered) conditions.push({ status: { _eq: 'Registered' } })
    if (submitted)
      conditions.push({
        status: { _eq: 'RegistrationRequested' },
        disputed: { _eq: false },
      })
    if (removalRequested)
      conditions.push({
        status: { _eq: 'ClearingRequested' },
        disputed: { _eq: false },
      })
    if (challengedSubmissions)
      conditions.push({
        status: { _eq: 'RegistrationRequested' },
        disputed: { _eq: true },
      })
    if (challengedRemovals)
      conditions.push({
        status: { _eq: 'ClearingRequested' },
        disputed: { _eq: true },
      })

    // No filters selected - return all items
    if (conditions.length === 0)
      return { registry_id: { _eq: tcrAddress?.toLowerCase() } }

    // Single filter - no need for _or
    if (conditions.length === 1)
      return {
        registry_id: { _eq: tcrAddress?.toLowerCase() },
        ...conditions[0],
      }

    // Multiple filters - use _or clause
    return {
      registry_id: { _eq: tcrAddress?.toLowerCase() },
      _or: conditions,
    }
  }, [
    absent,
    challengedRemovals,
    challengedSubmissions,
    registered,
    removalRequested,
    submitted,
    tcrAddress,
  ])

  const queryVariables = useMemo(
    () => ({
      offset: (Number(page) - 1) * ITEMS_PER_PAGE,
      limit: ITEMS_PER_PAGE,
      order_by: [{ latestRequestSubmissionTime: orderDirection }],
      where: itemsWhere,
      registryId: tcrAddress?.toLowerCase(),
    }),
    [page, orderDirection, itemsWhere, tcrAddress],
  )

  const itemsQuery = useQuery({
    queryKey: ['lightItems', queryVariables],
    queryFn: (): Promise<LightItemsResult> =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: LIGHT_ITEMS_QUERY,
        variables: queryVariables,
        chainId: chainId!,
      }),
    enabled: !!chainId,
    staleTime: STALE_TIME,
  })

  const counters = itemsQuery.data?.lregistry ?? undefined

  const itemCount = useMemo(() => {
    if (!counters) return 0
    const r = counters

    // Count selected filters and sum their counts
    const hasAnyFilter =
      absent ||
      registered ||
      submitted ||
      removalRequested ||
      challengedSubmissions ||
      challengedRemovals

    if (!hasAnyFilter)
      // No filters - return total count
      return (
        Number(r.numberOfAbsent) +
        Number(r.numberOfRegistered) +
        Number(r.numberOfRegistrationRequested) +
        Number(r.numberOfClearingRequested) +
        Number(r.numberOfChallengedRegistrations) +
        Number(r.numberOfChallengedClearing)
      )

    // Sum counts for selected filters
    // Note: numberOfRegistrationRequested and numberOfChallengedRegistrations are mutually exclusive
    // (unchallenged vs challenged), not subsets
    let sum = 0
    if (absent) sum += Number(r.numberOfAbsent)
    if (registered) sum += Number(r.numberOfRegistered)
    if (submitted) sum += Number(r.numberOfRegistrationRequested)
    if (removalRequested) sum += Number(r.numberOfClearingRequested)
    if (challengedSubmissions) sum += Number(r.numberOfChallengedRegistrations)
    if (challengedRemovals) sum += Number(r.numberOfChallengedClearing)

    return sum
  }, [
    absent,
    registered,
    submitted,
    removalRequested,
    challengedSubmissions,
    challengedRemovals,
    counters,
  ])

  useEffect(() => {
    const data = itemsQuery.data

    if (itemsQuery.error) {
      console.error(itemsQuery.error)
      setError(itemsQuery.error.message)
      return
    }

    if (!data || itemsQuery.isLoading) return
    // Prevents the background IPFS callback from overwriting items
    // if the user paginated/filtered before it resolved.
    let stale = false

    const addDecodedFields = (items: RawLightItem[]) =>
      items.map((item: RawLightItem) => ({
        ...item,
        decodedData: item.props?.map(({ value }) => value) || [],
        mergedData: item.props || [],
      }))

    const transformItems = (items: RawLightItem[]) =>
      items.map((item: RawLightItem) => {
        const {
          disputed,
          disputeID,
          submissionTime,
          rounds,
          resolved,
          deposit,
        } = item.requests[0] ?? {}

        const {
          appealPeriodStart,
          appealPeriodEnd,
          ruling,
          hasPaidRequester,
          hasPaidChallenger,
          amountPaidRequester,
          amountPaidChallenger,
        } = rounds[0] ?? {}

        const currentRuling =
          ruling === 'None' ? 0 : ruling === 'Accept' ? 1 : 2
        const disputeStatus = !disputed
          ? DISPUTE_STATUS.WAITING
          : resolved
            ? DISPUTE_STATUS.SOLVED
            : Number(appealPeriodEnd) > Date.now() / 1000
              ? DISPUTE_STATUS.APPEALABLE
              : DISPUTE_STATUS.WAITING

        return {
          ...item,
          ID: item.itemID,
          itemID: item.itemID,
          disputeStatus,
          disputed,
          resolved,
          decodedData: item.decodedData,
          mergedData: item.mergedData,
          disputeID,
          deposit,
          submissionTime: BigNumber.from(submissionTime),
          hasPaid: [false, hasPaidRequester, hasPaidChallenger],
          currentRuling,
          appealStart: BigNumber.from(appealPeriodStart),
          appealEnd: BigNumber.from(appealPeriodEnd),
          amountPaid: [
            BigNumber.from(0),
            BigNumber.from(amountPaidRequester),
            BigNumber.from(amountPaidChallenger),
          ],
        }
      })

    // Render items immediately with whatever data the subgraph has.
    const itemsWithDecoded = addDecodedFields(data.litems ?? [])
    setDecodedItems(
      transformItems(itemsWithDecoded) as unknown as SubgraphItem[],
    )

    // HACK: the graph could have failed to include the props.
    // This may be because at indexing time, the IPFS file was not available.
    // In that case, we manually fetch the props in the background so one
    // broken item doesn't block the entire page from rendering.
    const needsIpfs = itemsWithDecoded.some((i) => i.decodedData.length === 0)
    if (needsIpfs)
      void (async () => {
        const results = await Promise.allSettled(
          itemsWithDecoded.map(async (i) => {
            if (i.decodedData.length === 0)
              try {
                const response = await fetch(parseIpfs(i.data))
                if (!response.ok) return i
                const item = await response.json()
                const mergedData = item.columns.map((column: Column) => ({
                  label: column.label,
                  description: column.description,
                  type: column.type,
                  isIdentifier: column.isIdentifier,
                  value: item.values[column.label],
                }))
                const decodedData = mergedData.map(
                  (d: { value?: unknown }) => d.value,
                )
                return { ...i, mergedData, decodedData, props: mergedData }
              } catch {
                return i
              }

            return i
          }),
        )
        if (stale) return
        // Every promise has a try/catch returning the original item, so all settle as fulfilled.
        const patched = results.map(
          (r) =>
            (r as PromiseFulfilledResult<(typeof itemsWithDecoded)[number]>)
              .value,
        )
        setDecodedItems(transformItems(patched) as unknown as SubgraphItem[])
      })()

    return () => {
      stale = true
    }
  }, [itemsQuery.data, itemsQuery.error, itemsQuery.isLoading])

  // Load NSFW user setting from localforage.
  useEffect(() => {
    ;(async () => {
      const savedSetting = await localforage.getItem(NSFW_FILTER_KEY)
      if (typeof savedSetting === 'boolean') setNSFWFilter(savedSetting)
    })()
  }, [])

  // Pair every subgraph item with the list's columns and, for Seer, its market.
  const items = useMemo<RegistryItem[] | undefined>(() => {
    if (!metaEvidence || metaEvidence.address !== tcrAddress || !decodedItems)
      return undefined

    const columns = metaEvidence.metadata?.columns || []
    const seer =
      tcrAddress != null &&
      chainId != null &&
      isSeerRegistry(tcrAddress, chainId)

    return decodedItems.map((item: SubgraphItem) => {
      const decodedData = item.decodedData
      return {
        tcrData: { ...item, decodedData },
        columns: columns.map((col: Column, index: number) => ({
          value: decodedData && decodedData[index],
          ...col,
        })),
        errors: [],
        seerMarketData:
          seer && (decodedData?.length ?? 0) > 1
            ? seerMarketsData[String(decodedData?.[1]).toLowerCase()]
            : undefined,
      }
    })
  }, [metaEvidence, tcrAddress, decodedItems, chainId, seerMarketsData])

  const visibleItems = useMemo(() => {
    if (!items) return undefined

    return [...items]
      .filter((item) => itemMatchesSearch(item, itemSearch))
      .sort(({ tcrData: tcrDataA }, { tcrData: tcrDataB }) => {
        // Display items with pending requests first.
        if (!tcrDataA || !tcrDataB) return 0 // Handle errored TCRs.
        if (!tcrDataA.resolved && tcrDataB.resolved) return -1
        if (tcrDataA.resolved && !tcrDataB.resolved) return 1
        return 0
      })
  }, [itemSearch, items])

  // This component supports URL actions.
  // This means someone can be sent to curate with a bunch of data to submit
  // an item to a list.
  useEffect(() => {
    const params = new URLSearchParams(search)
    if (!params.get('action')) return

    const initialValues: string[] = []
    params.forEach((value, key) => {
      if (key !== 'action') initialValues.push(value)
    })

    setQueryItemParams(initialValues)
    setSubmissionFormOpen(true)
  }, [search])

  /* ---------- Derived copy and figures ---------- */

  const { metadata, fileURI } = metaEvidence || {}
  const { isConnectedTCR, isTCRofTCRs, relTcrDisabled, logoURI } =
    metadata || {}
  const tcrTitle = metadata?.tcrTitle ?? metadata?.title ?? metaEvidence?.title
  const tcrDescription =
    metadata?.tcrDescription ??
    metadata?.description ??
    metaEvidence?.description
  const normalizedDescription = tcrDescription
    ? tcrDescription[tcrDescription.length - 1] === '.'
      ? tcrDescription
      : `${tcrDescription}.`
    : ''
  const rawItemName = metadata?.itemName ?? metaEvidence?.itemName
  const rawItemNamePlural =
    metadata?.itemNamePlural ?? metaEvidence?.itemNamePlural
  const itemName = sentenceCase(rawItemName ?? 'entry')
  // A list that names its items but not their plural gets a plain "s";
  // a list that names neither falls back to "entries", never "entrys".
  const itemNamePlural = sentenceCase(
    rawItemNamePlural ?? (rawItemName ? `${rawItemName}s` : 'entries'),
  )

  const fullSeoTitle = tcrTitle
    ? `${tcrTitle} - Kleros · Curate`
    : 'Kleros · Curate'
  const fullSeoMetaDescription = metadata
    ? `Explore the ${tcrTitle} list on Kleros Curate: ${normalizedDescription}`
    : 'Explore curated lists on Kleros Curate.'
  useDocumentHead(
    truncateAtWord(fullSeoTitle, 60),
    truncateAtWord(fullSeoMetaDescription, 160),
  )

  const networkInfo = chainId
    ? NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
    : undefined
  const nativeSymbol = networkInfo?.nativeCurrency.symbol ?? 'ETH'
  const depositValue = (amount: BigNumber | undefined) =>
    amount ? (
      <ETHAmount
        amount={amount}
        decimals={18}
        displayUnit={` ${nativeSymbol}`}
      />
    ) : undefined
  const addressValue = (address: string | undefined) => {
    if (!address) return undefined
    const href = chainId
      ? getAddressPage({ networkId: chainId, address })
      : undefined
    return href ? (
      <AddressLink
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={address}
      >
        {truncateMiddle(address, 8, 6)}
      </AddressLink>
    ) : (
      <span title={address}>{truncateMiddle(address, 8, 6)}</span>
    )
  }

  // Court and juror figures are only read from the extra data when the
  // list's arbitrator is this chain's Kleros arbitrator.
  const klerosArbitrator = chainId
    ? klerosAddresses[chainId]?.arbitrator
    : undefined
  const isKlerosArbitrator =
    !!klerosArbitrator &&
    !!arbitrator &&
    klerosArbitrator.toLowerCase() === arbitrator.toLowerCase()
  const court = isKlerosArbitrator
    ? decodeCourt(arbitratorExtraData)
    : undefined
  const courtLabel = court
    ? `Court ${court.courtId} · ${court.jurors} jurors`
    : arbitratorExtraData
      ? truncateMiddle(arbitratorExtraData, 10, 6)
      : undefined
  const challengePeriod = challengePeriodDuration
    ? formatDurationLong(challengePeriodDuration.toNumber())
    : undefined
  const submissionTotal = formatAmount(submissionDeposit, nativeSymbol)
  const submissionBase = formatAmount(submissionBaseDeposit, nativeSymbol)
  const arbitration = formatAmount(arbitrationCost, nativeSymbol)
  const challengeTotal = formatAmount(submissionChallengeDeposit, nativeSymbol)
  /** "30 xDAI base deposit + 21.6 xDAI arbitration cost", shown with every total. */
  const submissionBreakdown =
    submissionBase && arbitration
      ? `${submissionBase} base deposit + ${arbitration} arbitration cost`
      : undefined
  const rejectedOrRemoved = counters
    ? integer.format(Number(counters.numberOfAbsent))
    : undefined

  const verified =
    !!chainId &&
    !!tcrAddress &&
    getListOfListsAddresses(chainId).includes(tcrAddress.toLowerCase())

  const stats: RegistryStat[] = useMemo(() => {
    if (!counters)
      return [
        { label: 'Entries' },
        { label: 'Open requests' },
        { label: 'In court' },
      ]
    const inCourt =
      Number(counters.numberOfChallengedRegistrations) +
      Number(counters.numberOfChallengedClearing)
    const openRequests =
      Number(counters.numberOfRegistrationRequested) +
      Number(counters.numberOfClearingRequested) +
      inCourt
    const entries =
      Number(counters.numberOfAbsent) +
      Number(counters.numberOfRegistered) +
      openRequests
    return [
      { label: 'Entries', value: integer.format(entries) },
      { label: 'Open requests', value: integer.format(openRequests) },
      { label: 'In court', value: integer.format(inCourt) },
    ]
  }, [counters])

  const parameters: RegistryParameter[] = [
    {
      label: 'Submission deposit',
      value: depositValue(submissionDeposit),
      hint: submissionBreakdown,
    },
    {
      label: 'Challenge deposit',
      value: depositValue(submissionChallengeDeposit),
    },
    { label: 'Removal deposit', value: depositValue(removalDeposit) },
    {
      label: 'Removal challenge deposit',
      value: depositValue(removalChallengeDeposit),
    },
    { label: 'Challenge period', value: challengePeriod },
    { label: 'Arbitration cost', value: depositValue(arbitrationCost) },
    { label: 'Court', value: courtLabel },
    { label: 'Arbitrator', value: addressValue(arbitrator) },
    { label: 'Governor', value: addressValue(governor) },
    {
      label: 'Rejected or removed',
      value: rejectedOrRemoved,
      hint: 'Included in the Entries count',
    },
  ]

  // The header already says the deposit comes back in full if nobody
  // challenges; the steps carry the breakdown, the execution and the loss case.
  const explainerSteps: ExplainerStep[] = [
    {
      title: 'Submit with a deposit',
      body:
        submissionTotal && submissionBreakdown
          ? `You send ${submissionTotal} = ${submissionBreakdown}. If challenged and you lose, it goes to the challenger minus the arbitration cost.`
          : submissionTotal
            ? `You send ${submissionTotal}: the list’s base deposit plus the arbitration cost. If challenged and you lose, it goes to the challenger minus the arbitration cost.`
            : 'You lock the list’s base deposit plus the arbitration cost. If challenged and you lose, it goes to the challenger minus the arbitration cost.',
    },
    {
      title: challengePeriod
        ? `Anyone can challenge for ${challengePeriod}`
        : 'Anyone can challenge during the window',
      body: challengeTotal
        ? `Anyone who thinks your ${itemName} breaks the listing policy can lock ${challengeTotal} and give a reason. If nobody does, the request can be executed once the period ends: the ${itemName} is registered and your deposit comes back.`
        : `Anyone who thinks your ${itemName} breaks the listing policy can lock a challenge deposit and give a reason. If nobody does, the request can be executed once the period ends: the ${itemName} is registered and your deposit comes back.`,
    },
    {
      title: isKlerosArbitrator
        ? 'Kleros jurors decide; the winner is paid'
        : 'The arbitrator decides; the winner is paid',
      body: court
        ? `Kleros court ${court.courtId} draws ${court.jurors} jurors who decide whether the ${itemName} meets the listing policy. The winner takes the pool minus one arbitration cost; the loser’s deposit is lost.`
        : isKlerosArbitrator
          ? `A Kleros court decides whether the ${itemName} meets the listing policy. The winner takes the pool minus one arbitration cost; the loser’s deposit is lost.`
          : `The list’s arbitrator decides whether the ${itemName} meets the listing policy. The winner takes the pool minus one arbitration cost; the loser’s deposit is lost.`,
    },
  ]

  const onPrimary = () => {
    if (chainId && tcrAddress) navigate(`/tcr/${chainId}/${tcrAddress}/submit`)
    else setSubmissionFormOpen(true)
  }
  const onOpenPolicy = fileURI
    ? () => openAttachment(parseIpfs(fileURI), true)
    : undefined
  const badgesListTo =
    connectedTCRAddr && connectedTCRAddr !== ZERO_ADDRESS && !relTcrDisabled
      ? `/tcr/${chainId}/${connectedTCRAddr}`
      : undefined

  const chips: FilterChip[] = [
    {
      key: 'absent',
      label: 'Rejected or removed',
      tone: 'off',
      checked: !!absent,
    },
    {
      key: 'registered',
      label: 'Registered',
      tone: 'registered',
      checked: !!registered,
    },
    {
      key: 'submitted',
      label: 'Submitted',
      tone: 'window',
      checked: !!submitted,
    },
    {
      key: 'removalRequested',
      label: 'Removal requested',
      tone: 'window',
      checked: !!removalRequested,
    },
    {
      key: 'challengedSubmissions',
      label: 'Challenged submissions',
      tone: 'contested',
      checked: !!challengedSubmissions,
    },
    {
      key: 'challengedRemovals',
      label: 'Challenged removals',
      tone: 'contested',
      checked: !!challengedRemovals,
    },
  ]

  const setFilter = (filter: string, checked: boolean) =>
    navigate({
      search: updateLightFilter({ prevQuery: search, filter, checked }),
    })

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(search)
    params.set('page', String(newPage))
    navigate({ search: `?${params.toString()}` })
  }

  const hasSeerMarkets =
    tcrAddress != null &&
    chainId != null &&
    isSeerRegistry(tcrAddress, chainId) &&
    Object.keys(seerMarketsData).length > 0
  const columns = useMemo(() => {
    const base = tableColumns((metadata?.columns ?? []) as V2Field[])
    // Seer registries also show the market name fetched for each entry.
    return hasSeerMarkets ? [...base, { label: 'Market', type: 'text' }] : base
  }, [metadata, hasSeerMarkets])

  const entries: EntryRow[] = useMemo(() => {
    if (!visibleItems || !tcrAddress) return []
    return visibleItems.map((item) => {
      const id = String(item.tcrData.itemID ?? item.tcrData.ID ?? '')
      const status = lightEntryStatus(
        item.tcrData,
        timestamp,
        challengePeriodDuration,
      )
      const fields: V2Field[] = [
        ...(item.tcrData.mergedData?.length
          ? item.tcrData.mergedData
          : item.columns),
      ]
      if (item.seerMarketData?.marketName)
        fields.push({
          label: 'Market',
          value: item.seerMarketData.marketName,
          type: 'text',
        })
      const firstColumnValue = item.columns[0]?.value
      const openListTo =
        isTCRofTCRs && typeof firstColumnValue === 'string'
          ? `/tcr/${chainId}/${firstColumnValue}`
          : undefined
      const hidden =
        nsfwFilterOn &&
        status?.code !== undefined &&
        HIDDEN_STATUS_CODES.has(status.code) &&
        !revealed.has(id)
      return {
        id,
        href: `/tcr/${chainId}/${tcrAddress}/${id}`,
        fields,
        status,
        openListTo,
        hidden,
        onReveal: hidden
          ? () => setRevealed((prev) => new Set(prev).add(id))
          : undefined,
      }
    })
  }, [
    visibleItems,
    tcrAddress,
    chainId,
    timestamp,
    challengePeriodDuration,
    isTCRofTCRs,
    nsfwFilterOn,
    revealed,
  ])

  /* ---------- Error states ---------- */

  if (!tcrAddress)
    return (
      <ErrorPage
        code="404"
        message="This list could not be found."
        tip="Check the address, and that the chain in the URL is the one the list lives on."
      />
    )

  if (tcrError || error)
    return (
      <ErrorPage
        code="400"
        message={
          typeof tcrError === 'string'
            ? tcrError
            : error || 'This list could not be loaded.'
        }
      />
    )

  const listLoading = itemsQuery.isLoading || !metadata || !visibleItems
  const showPagination = itemCount > ITEMS_PER_PAGE

  return (
    <Page>
      <RegistryHeader
        title={tcrTitle}
        description={
          normalizedDescription
            ? capitalizeFirstLetter(normalizedDescription)
            : undefined
        }
        logoURI={logoURI}
        chainId={chainId ?? undefined}
        address={tcrAddress}
        verified={verified}
        kindLabel="Light Curate"
        itemName={itemName}
        primaryLabel={`Submit ${itemName}`}
        primaryAmount={
          submissionDeposit ? (
            <span title={submissionBreakdown}>
              {depositValue(submissionDeposit)}
            </span>
          ) : undefined
        }
        onPrimary={onPrimary}
        policyURI={fileURI}
        onOpenPolicy={onOpenPolicy}
        badgesListTo={badgesListTo}
        stats={stats}
        parameters={parameters}
        explainerId={`registry-light-${tcrAddress.toLowerCase()}`}
        explainerHeading="One deposit, one window, a court if needed."
        explainerSteps={explainerSteps}
        loading={!metadata}
      />

      <RegistryToolbar
        search={itemSearch}
        onSearch={setItemSearch}
        placeholder={`Search ${itemNamePlural}`}
        chips={chips}
        onChipChange={setFilter}
        sort={oldestFirst ? 'oldest' : 'newest'}
        onSortChange={(sort) => setFilter('oldestFirst', sort === 'oldest')}
        layout={layout}
        onLayoutChange={setLayout}
        nsfwFilter={nsfwFilterOn}
        onNsfwChange={toggleNSFWFilter}
        shown={listLoading ? 0 : (visibleItems?.length ?? 0)}
        total={itemCount}
      />

      <Entries
        aria-label={capitalizeFirstLetter(itemNamePlural)}
        aria-busy={listLoading}
      >
        {listLoading ? (
          layout === 'cards' ? (
            <Grid $min={260}>
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock key={index} $height="180px" />
              ))}
            </Grid>
          ) : (
            <Stack $gap={8}>
              {Array.from({ length: 8 }).map((_, index) => (
                <SkeletonBlock key={index} $height="44px" />
              ))}
            </Stack>
          )
        ) : (
          <EntryList
            layout={layout}
            entries={entries}
            columns={columns}
            now={now}
            itemName={itemName}
            itemNamePlural={itemNamePlural}
            emptyAction={
              <Button
                type="button"
                $variant="primary"
                $size="sm"
                onClick={onPrimary}
              >
                Submit {itemName}
              </Button>
            }
          />
        )}
        {showPagination && (
          <PaginationRow>
            <Pagination
              total={itemCount}
              current={Number(page)}
              itemRender={pagingItem}
              pageSize={ITEMS_PER_PAGE}
              onChange={goToPage}
            />
          </PaginationRow>
        )}
      </Entries>

      {metaEvidence && metadata && (
        <>
          {isConnectedTCR ? (
            <SubmitConnectModal
              visible={submissionFormOpen}
              onCancel={() => setSubmissionFormOpen(false)}
              tcrAddress={tcrAddress}
              gtcrView={gtcrView}
            />
          ) : (
            <SubmitModal
              visible={submissionFormOpen}
              onCancel={() => setSubmissionFormOpen(false)}
              submissionDeposit={submissionDeposit}
              challengePeriodDuration={challengePeriodDuration}
              tcrAddress={tcrAddress}
              metaEvidence={metaEvidence}
              initialValues={queryItemParams}
            />
          )}
        </>
      )}
    </Page>
  )
}

export default Items
