import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import useStoredLayout, { type ListLayout } from 'hooks/use-stored-layout'
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
import { Button, Page, truncateMiddle } from 'components/curate/primitives'
import { CurateIcon } from 'components/curate/icons'
import { reveal } from 'components/curate/motion/reveal'
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
import {
  RegistryLightEmpty,
  RegistryLightSkeleton,
} from 'components/curate/registry-light-states'
import ErrorPage from '../error-page'
import SubmitModal from '../light-item-details/modals/submit'
import SubmitConnectModal from '../light-item-details/modals/submit-connect'

/*
 * Light Curate registry page (/tcr/:chainId/:tcrAddress): the header panel
 * (identity, the one action with its exact deposit, the counts and the share
 * registered as a ring), the toolbar (URL filters with each status's count),
 * then the entries in the remembered layout, each with its status and time
 * left. Nothing else sits between the header and the entries. A page or
 * filter change keeps the current rows and counts (dimmed) until the next
 * page lands, so nothing flashes or counts up again.
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

/* An explorer link: a 24px target, and it says it opens a new tab. */
const AddressLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  color: var(--color-primary);
  text-decoration: none;

  svg {
    flex: 0 0 auto;
    opacity: 0.8;
  }

  &:hover {
    text-decoration: underline;
  }
`

const SrOnly = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

/* The empty state's way out: a ghost button with a hairline, not a fill. */
const GhostButton = styled(Button)`
  border-color: var(--glass-border);
`

const Toolbar = styled.div`
  ${reveal}
`

/* While the next page or filter loads, the current rows stay and dim. */
const Entries = styled.section`
  margin-top: 0;

  > :first-child {
    transition: opacity var(--dur-hover, 180ms) var(--ease-out, ease-out);
  }

  &[data-refreshing='true'] > :first-child {
    opacity: 0.55;
  }
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 12px 16px;
  margin-top: 18px;
  ${reveal}
`

/** Phones open on stacked rows; wider screens on the table. */
const defaultLayout = (): ListLayout =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 720px)').matches
    ? 'rows'
    : 'table'

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
  // A remembered choice wins; the fallback follows the viewport on arrival.
  const [fallbackLayout] = useState(defaultLayout)
  const [layout, setLayout] = useStoredLayout('entries', fallbackLayout)

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
    // A page or filter change keeps this registry's last result on screen
    // until the next one lands; another registry never inherits it.
    placeholderData: (previous, previousQuery) =>
      (previousQuery?.queryKey[1] as { registryId?: string } | undefined)
        ?.registryId === tcrAddress?.toLowerCase()
        ? previous
        : undefined,
  })
  const refreshing = itemsQuery.isPlaceholderData && itemsQuery.isFetching

  // The registry-wide counters, kept across a refetch that comes back
  // without them, for this registry only.
  const countersKey = `${chainId}:${tcrAddress?.toLowerCase()}`
  const lastCounters = useRef<{ key: string; value: RegistryCounters }>()
  const freshCounters = itemsQuery.data?.lregistry ?? undefined
  if (freshCounters)
    lastCounters.current = { key: countersKey, value: freshCounters }
  const counters =
    freshCounters ??
    (lastCounters.current?.key === countersKey
      ? lastCounters.current.value
      : undefined)

  /** The registry's live counters, one per status filter. */
  const counts = useMemo(() => {
    if (!counters) return undefined
    const absentCount = Number(counters.numberOfAbsent)
    const registeredCount = Number(counters.numberOfRegistered)
    const submittedCount = Number(counters.numberOfRegistrationRequested)
    const removalCount = Number(counters.numberOfClearingRequested)
    const challengedSubmissionCount = Number(
      counters.numberOfChallengedRegistrations,
    )
    const challengedRemovalCount = Number(counters.numberOfChallengedClearing)
    const inCourt = challengedSubmissionCount + challengedRemovalCount
    const openRequests = submittedCount + removalCount + inCourt
    return {
      absent: absentCount,
      registered: registeredCount,
      submitted: submittedCount,
      removalRequested: removalCount,
      challengedSubmissions: challengedSubmissionCount,
      challengedRemovals: challengedRemovalCount,
      inCourt,
      openRequests,
      total: absentCount + registeredCount + openRequests,
    }
  }, [counters])

  /** Entries the current filters cover: all of them, or the selected sum. */
  const itemCount = useMemo(() => {
    if (!counts) return 0
    const hasAnyFilter =
      absent ||
      registered ||
      submitted ||
      removalRequested ||
      challengedSubmissions ||
      challengedRemovals
    if (!hasAnyFilter) return counts.total
    // Submitted and challenged submissions are disjoint (unchallenged vs
    // challenged), as are the two removal counters, so the sum is exact.
    let sum = 0
    if (absent) sum += counts.absent
    if (registered) sum += counts.registered
    if (submitted) sum += counts.submitted
    if (removalRequested) sum += counts.removalRequested
    if (challengedSubmissions) sum += counts.challengedSubmissions
    if (challengedRemovals) sum += counts.challengedRemovals
    return sum
  }, [
    absent,
    registered,
    submitted,
    removalRequested,
    challengedSubmissions,
    challengedRemovals,
    counts,
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
        <CurateIcon name="external" size={14} aria-hidden />
        <SrOnly> (opens in a new tab)</SrOnly>
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
  const rejectedOrRemoved = counts ? integer.format(counts.absent) : undefined

  const verified =
    !!chainId &&
    !!tcrAddress &&
    getListOfListsAddresses(chainId).includes(tcrAddress.toLowerCase())

  const stats: RegistryStat[] = [
    { label: 'Entries', value: counts && integer.format(counts.total) },
    {
      label: 'Open requests',
      value: counts && integer.format(counts.openRequests),
    },
    { label: 'In court', value: counts && integer.format(counts.inCourt) },
  ]

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

  // One line per step: the header already says the deposit comes back in
  // full if nobody challenges; the steps add the breakdown and the loss case.
  const explainerSteps: ExplainerStep[] = [
    {
      title: 'Submit with a deposit',
      body: `${
        submissionTotal && submissionBreakdown
          ? `You send ${submissionTotal} = ${submissionBreakdown}.`
          : 'You send the base deposit plus the arbitration cost.'
      } If challenged and you lose, it goes to the challenger minus the arbitration cost.`,
    },
    {
      title: challengePeriod
        ? `Anyone can challenge for ${challengePeriod}`
        : 'Anyone can challenge during the window',
      body: `A challenger locks ${
        challengeTotal ?? 'a challenge deposit'
      }. Unchallenged, the request can be executed when the period ends: the ${itemName} is registered and your deposit comes back.`,
    },
    {
      title: isKlerosArbitrator
        ? 'Kleros jurors decide; the winner is paid'
        : 'The arbitrator decides; the winner is paid',
      body: `${
        court
          ? `Kleros court ${court.courtId} draws ${court.jurors} jurors.`
          : isKlerosArbitrator
            ? 'A Kleros court rules on the listing policy.'
            : 'The list’s arbitrator rules on the listing policy.'
      } The winner takes the pool minus one arbitration cost.`,
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

  // Each chip carries its status's live count from the registry counters.
  const withCount = (label: string, count?: number) =>
    count !== undefined && Number.isFinite(count)
      ? `${label} ${integer.format(count)}`
      : label
  // Listed first, then the open requests, then the challenged ones; the
  // rejected and removed close the rail.
  const chips: FilterChip[] = [
    {
      key: 'registered',
      label: withCount('Registered', counts?.registered),
      tone: 'registered',
      checked: !!registered,
    },
    {
      key: 'submitted',
      label: withCount('Submitted', counts?.submitted),
      tone: 'window',
      checked: !!submitted,
    },
    {
      key: 'removalRequested',
      label: withCount('Removal requested', counts?.removalRequested),
      tone: 'window',
      checked: !!removalRequested,
    },
    {
      key: 'challengedSubmissions',
      label: withCount('Challenged submissions', counts?.challengedSubmissions),
      tone: 'contested',
      checked: !!challengedSubmissions,
    },
    {
      key: 'challengedRemovals',
      label: withCount('Challenged removals', counts?.challengedRemovals),
      tone: 'contested',
      checked: !!challengedRemovals,
    },
    {
      key: 'absent',
      label: withCount('Rejected or removed', counts?.absent),
      tone: 'off',
      checked: !!absent,
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

  // Clears the search and every status filter and returns to page 1; the
  // sort order is a preference, not a filter, so it stays.
  const clearFilters = () => {
    setItemSearch('')
    navigate({ search: oldestFirst ? '?oldestFirst=true' : '' })
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
      // An entry whose status is not known yet stays hidden too, so nothing
      // the filter covers shows before its status arrives.
      const hidden =
        nsfwFilterOn &&
        !revealed.has(id) &&
        (status?.code === undefined || HIDDEN_STATUS_CODES.has(status.code))
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

  // Statuses need the chain's clock and the challenge period; until both are
  // known the skeleton stays, so the sensitive-content filter never lets an
  // entry through early.
  const listLoading =
    itemsQuery.isLoading ||
    !metadata ||
    !visibleItems ||
    !timestamp ||
    !challengePeriodDuration
  const showPagination = itemCount > ITEMS_PER_PAGE
  const pageNumber = Number(page) || 1
  const pageItemCount = items?.length ?? 0
  const searching = itemSearch.trim() !== ''
  // The search filters the page already loaded, not the whole list.
  const pageScopedSearch = itemCount > ITEMS_PER_PAGE
  const filtersActive = !!(
    absent ||
    registered ||
    submitted ||
    removalRequested ||
    challengedSubmissions ||
    challengedRemovals
  )
  const pageCount = Math.ceil(itemCount / ITEMS_PER_PAGE)
  const plural = capitalizeFirstLetter(itemNamePlural)

  // Why the list is empty decides what it says and offers.
  const emptyView = ((): {
    title: string
    line?: string
    action?: React.ReactNode
  } => {
    if (pageNumber > 1 && pageItemCount === 0)
      return {
        title: `Page ${integer.format(pageNumber)} is past the end`,
        line:
          pageCount > 0
            ? `The last page is ${integer.format(pageCount)}.`
            : undefined,
        action: (
          <GhostButton
            type="button"
            $variant="ghost"
            $size="sm"
            onClick={() => goToPage(1)}
          >
            Go to page 1
          </GhostButton>
        ),
      }
    if (searching)
      return {
        title: `No ${itemNamePlural} match`,
        line: pageScopedSearch
          ? `The search covers the ${integer.format(pageItemCount)} ${itemNamePlural} on page ${integer.format(pageNumber)}.`
          : undefined,
        action: (
          <GhostButton
            type="button"
            $variant="ghost"
            $size="sm"
            onClick={filtersActive ? clearFilters : () => setItemSearch('')}
          >
            {filtersActive ? 'Clear filters' : 'Clear search'}
          </GhostButton>
        ),
      }
    if (filtersActive)
      return {
        title: `No ${itemNamePlural} match`,
        line: `No ${itemName} has these statuses right now.`,
        action: (
          <GhostButton
            type="button"
            $variant="ghost"
            $size="sm"
            onClick={clearFilters}
          >
            Clear filters
          </GhostButton>
        ),
      }
    if (counts?.total === 0)
      return {
        title: `No ${itemNamePlural} yet`,
        line: 'Be the first to submit one.',
        action: (
          <Button
            type="button"
            $variant="secondary"
            $size="sm"
            onClick={onPrimary}
          >
            Submit {itemName}
          </Button>
        ),
      }
    return { title: `No ${itemNamePlural} to show` }
  })()

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
        registeredCount={counts?.registered}
        totalCount={counts?.total}
        parameters={parameters}
        explainerId={`registry-light-${tcrAddress.toLowerCase()}`}
        explainerHeading="One deposit, one window, a court if needed."
        explainerSteps={explainerSteps}
        loading={!metadata || (!counters && itemsQuery.isFetching)}
      />

      <Toolbar style={{ ['--i' as string]: 1 }}>
        <RegistryToolbar
          search={itemSearch}
          onSearch={setItemSearch}
          placeholder={
            pageScopedSearch ? 'Search this page' : `Search ${itemNamePlural}`
          }
          chips={chips}
          onChipChange={setFilter}
          sort={oldestFirst ? 'oldest' : 'newest'}
          onSortChange={(sort) => setFilter('oldestFirst', sort === 'oldest')}
          layout={layout}
          onLayoutChange={setLayout}
          nsfwFilter={nsfwFilterOn}
          onNsfwChange={toggleNSFWFilter}
          shown={listLoading ? 0 : (visibleItems?.length ?? 0)}
          total={searching ? pageItemCount : itemCount}
        />
      </Toolbar>

      <Entries
        aria-label={plural}
        aria-busy={listLoading || itemsQuery.isFetching}
        data-refreshing={refreshing && !listLoading}
      >
        {listLoading ? (
          <RegistryLightSkeleton layout={layout} />
        ) : entries.length === 0 ? (
          <RegistryLightEmpty
            title={emptyView.title}
            line={emptyView.line}
            action={emptyView.action}
          />
        ) : (
          <EntryList
            layout={layout}
            entries={entries}
            columns={columns}
            now={now}
            itemName={itemName}
            itemNamePlural={itemNamePlural}
          />
        )}
        {showPagination && (
          <Footer style={{ ['--i' as string]: 2 }}>
            <Pagination
              total={itemCount}
              current={pageNumber}
              pageSize={ITEMS_PER_PAGE}
              onChange={goToPage}
            />
          </Footer>
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
