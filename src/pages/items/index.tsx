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
import { request } from 'graphql-request'
import localforage from 'localforage'
import { BigNumber, ethers } from 'ethers'
import { gtcrDecode } from '@kleros/gtcr-encoder'
import { STALE_TIME } from 'consts'
import { Pagination } from 'components/ui'
import useUrlChainId from 'hooks/use-url-chain-id'
import useNow from 'hooks/use-now'
import useStoredLayout from 'hooks/use-stored-layout'
import useDocumentHead from 'hooks/use-document-head'
import useNativeCurrency from 'hooks/native-currency'
import { useAttachment } from 'hooks/use-attachment'
import { WalletContext } from 'contexts/wallet-context'
import { TCRViewContext } from 'contexts/tcr-view-context'
import { subgraphUrl } from 'config/tcr-addresses'
import { getListOfListsAddresses } from 'config/list-of-lists'
import { CLASSIC_REGISTRY_ITEMS_QUERY } from 'utils/graphql'
import { CONTRACT_STATUS, DISPUTE_STATUS, STATUS_CODE } from 'utils/item-status'
import {
  FILTER_KEYS,
  searchStrToFilterObjLight,
  updateLightFilter,
} from 'utils/filters'
import { parseIpfs } from 'utils/ipfs-parse'
import { getAddressPage } from 'utils/network-utils'
import { formatDurationLong } from 'utils/time'
import {
  ZERO_ADDRESS,
  capitalizeFirstLetter,
  getArticleFor,
  jurorsAndCourtIDFromExtraData,
} from 'utils/string'
import { truncateAtWord } from 'utils/truncate-at-word'
import {
  Button,
  EmptyState,
  Page,
  Small,
  Surface,
  truncateMiddle,
  type StatusTone,
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
import {
  lightEntryStatus,
  type EntryStatusView,
} from 'components/curate/entry-status'
import type { ExplainerStep } from 'components/curate/explainer'
import type { V2Field } from 'components/curate/v2'
import ErrorPage from '../error-page'
import SubmitModal from '../item-details/modals/submit'
import SubmitConnectModal from '../item-details/modals/submit-connect'

/*
 * Classic Curate registry page. Same composition as the Light page
 * (RegistryHeader, RegistryToolbar, EntryList, Pagination, submit modals) on
 * the Classic data path: items are read straight from the subgraph with
 * graphql-request and decoded on the client with gtcrDecode. Every figure on
 * the page comes from the loaded items or the registry's on-chain parameters.
 */

const MAX_ENTITIES = 1000
const ITEMS_PER_PAGE = 40
const NSFW_FILTER_KEY = 'NSFW_FILTER_KEY'
const KIND_LABEL = 'Classic Curate'

/** Statuses hidden behind a reveal while the sensitive-content filter is on. */
const HIDDEN_STATUS_CODES = new Set([
  STATUS_CODE.REJECTED,
  STATUS_CODE.REMOVED,
  STATUS_CODE.CHALLENGED,
  STATUS_CODE.CROWDFUNDING,
  STATUS_CODE.CROWDFUNDING_WINNER,
])

/** URL filter keys shown as chips, in plain language with their status role. */
const FILTER_CHIPS: { key: string; label: string; tone: StatusTone }[] = [
  { key: FILTER_KEYS.REGISTERED, label: 'Registered', tone: 'registered' },
  { key: FILTER_KEYS.SUBMITTED, label: 'Submitted', tone: 'window' },
  {
    key: FILTER_KEYS.REMOVAL_REQUESTED,
    label: 'Removal requested',
    tone: 'window',
  },
  {
    key: FILTER_KEYS.CHALLENGED_SUBMISSIONS,
    label: 'Challenged submissions',
    tone: 'contested',
  },
  {
    key: FILTER_KEYS.CHALLENGED_REMOVALS,
    label: 'Challenged removals',
    tone: 'contested',
  },
  { key: FILTER_KEYS.ABSENT, label: 'Rejected or removed', tone: 'off' },
]

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

/** A classic item exactly as the subgraph returns it. */
interface RawItem {
  itemID: string
  status: string
  data: string
  requests: RawRequest[]
  [key: string]: unknown
}

interface ClassicItemsResult {
  items: RawItem[]
}

/** A loaded item: its request data for the status machine and its decoded fields. */
interface DecodedEntry {
  tcrData: SubgraphItem
  columns: V2Field[]
  errors: string[]
}

/** "51.6 xDAI" from a wei amount; undefined while the amount is unknown. */
const formatAmount = (
  amount: BigNumber | undefined,
  symbol: string,
): string | undefined =>
  amount
    ? `${ethers.utils.formatEther(amount).replace(/\.?0+$/, '')} ${symbol}`
    : undefined

/**
 * "Address Tag" → "address tag" for mid-sentence use; every word is
 * lowercased except acronyms such as "NFT".
 */
const midSentence = (name: string): string =>
  name
    .split(' ')
    .map((word) =>
      word.length > 1 && word.slice(1) === word.slice(1).toLowerCase()
        ? word.toLowerCase()
        : word,
    )
    .join(' ')

const valueToText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number')
    return String(value)
  if (Array.isArray(value)) return value.map(valueToText).join(' ')
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>)
      .map(valueToText)
      .join(' ')
  return ''
}

const entryMatchesSearch = (entry: DecodedEntry, rawSearch: string) => {
  const query = rawSearch.trim().toLowerCase()
  if (!query) return true
  const text = [
    entry.tcrData.itemID,
    entry.tcrData.ID,
    entry.tcrData.status,
    ...entry.columns.map(
      (column) => `${column.label ?? ''} ${valueToText(column.value)}`,
    ),
  ]
    .map(valueToText)
    .join(' ')
    .toLowerCase()
  return text.includes(query)
}

/**
 * Registered and Absent entries need no clock or challenge period, so they
 * keep a status while the on-chain parameters are still loading. Same labels
 * and roles as utils/item-status.ts.
 */
const settledStatus = (item: SubgraphItem): EntryStatusView | undefined => {
  if (item.status === CONTRACT_STATUS.REGISTERED)
    return {
      code: STATUS_CODE.REGISTERED,
      tone: 'registered',
      label: 'Registered',
    }
  if (item.status === CONTRACT_STATUS.ABSENT)
    return item.requests?.[0]?.requestType === CONTRACT_STATUS.REMOVAL_REQUESTED
      ? { code: STATUS_CODE.REMOVED, tone: 'off', label: 'Removed' }
      : { code: STATUS_CODE.REJECTED, tone: 'off', label: 'Rejected' }
  return undefined
}

/** Entries with a pending request first, as the old page ordered them. */
const pendingFirst = (a: DecodedEntry, b: DecodedEntry) => {
  if (!a.tcrData.resolved && b.tcrData.resolved) return -1
  if (a.tcrData.resolved && !b.tcrData.resolved) return 1
  return 0
}

const Note = styled.p`
  margin: 16px 0 0;
  max-width: 68ch;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const ListFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
`

const AddressLink = styled.a`
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const Items = () => {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { tcrAddress } = useParams()
  const chainId = useUrlChainId()
  const timestamp = useContext(WalletContext)?.timestamp
  const tcrViewContext = useContext(TCRViewContext)
  const metaEvidence = tcrViewContext?.metaEvidence
  const challengePeriodDuration = tcrViewContext?.challengePeriodDuration
  const tcrError = tcrViewContext?.tcrError
  const gtcrView = tcrViewContext?.gtcrView
  const connectedTCRAddr = tcrViewContext?.connectedTCRAddr
  const submissionDeposit = tcrViewContext?.submissionDeposit
  const submissionChallengeDeposit = tcrViewContext?.submissionChallengeDeposit
  const removalDeposit = tcrViewContext?.removalDeposit
  const removalChallengeDeposit = tcrViewContext?.removalChallengeDeposit
  const arbitrationCost = tcrViewContext?.arbitrationCost
  const submissionBaseDeposit = tcrViewContext?.submissionBaseDeposit
  const submissionChallengeBaseDeposit =
    tcrViewContext?.submissionChallengeBaseDeposit
  const removalBaseDeposit = tcrViewContext?.removalBaseDeposit
  const removalChallengeBaseDeposit =
    tcrViewContext?.removalChallengeBaseDeposit
  const arbitrator = tcrViewContext?.arbitrator
  const arbitratorExtraData = tcrViewContext?.arbitratorExtraData
  const governor = tcrViewContext?.governor
  const nativeCurrency = useNativeCurrency()
  const openAttachment = useAttachment()
  const now = useNow()
  const [layout, setLayout] = useStoredLayout('entries', 'table')
  const [submissionFormOpen, setSubmissionFormOpen] = useState<
    boolean | undefined
  >()
  const [nsfwFilterOn, setNSFWFilter] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [queryItemParams, setQueryItemParams] = useState<string[] | undefined>()
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(() => new Set())
  const queryOptions = searchStrToFilterObjLight(search)

  const toggleNSFWFilter = useCallback((checked: boolean) => {
    setNSFWFilter(checked)
    localforage.setItem(NSFW_FILTER_KEY, checked)
  }, [])

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
  const currentPage = Math.max(1, Number(page) || 1)
  const offset = (currentPage - 1) * ITEMS_PER_PAGE

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

  // Load NSFW user setting from localforage.
  useEffect(() => {
    ;(async () => {
      const savedSetting = await localforage.getItem(NSFW_FILTER_KEY)
      if (typeof savedSetting === 'boolean') setNSFWFilter(savedSetting)
    })()
  }, [])

  const queryVariables = useMemo(
    () => ({
      offset,
      limit: MAX_ENTITIES,
      order_by: [{ latestRequestSubmissionTime: orderDirection }],
      where: itemsWhere,
    }),
    [offset, orderDirection, itemsWhere],
  )

  const itemsQuery = useQuery({
    queryKey: ['classicItems', queryVariables],
    queryFn: () => {
      const url = subgraphUrl[chainId!]
      if (!url) throw new Error(`No subgraph URL for chain ${chainId}`)
      return request<ClassicItemsResult>(
        url,
        CLASSIC_REGISTRY_ITEMS_QUERY,
        queryVariables,
      )
    },
    enabled: !!chainId,
    staleTime: STALE_TIME,
    refetchInterval: 30_000, // Poll subgraph every 30s for status changes
  })
  const loadedItems = itemsQuery.data?.items

  // The subgraph rows reshaped into what the status machine and the item
  // pages expect (a basic useQuery plus a memo, no effect chains).
  const encodedItems = useMemo<SubgraphItem[] | undefined>(() => {
    if (!loadedItems || itemsQuery.isLoading) return undefined

    return loadedItems.map((item: RawItem) => {
      const { disputed, disputeID, submissionTime, rounds, resolved, deposit } =
        item.requests[0] ?? {}

      const {
        appealPeriodStart,
        appealPeriodEnd,
        ruling,
        hasPaidRequester,
        hasPaidChallenger,
        amountPaidRequester,
        amountPaidChallenger,
      } = rounds?.[0] ?? {}

      const currentRuling = ruling === 'None' ? 0 : ruling === 'Accept' ? 1 : 2
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
        disputeID,
        deposit,
        submissionTime: BigNumber.from(submissionTime ?? 0),
        hasPaid: [false, hasPaidRequester, hasPaidChallenger],
        currentRuling,
        appealStart: BigNumber.from(appealPeriodStart ?? 0),
        appealEnd: BigNumber.from(appealPeriodEnd ?? 0),
        amountPaid: [
          BigNumber.from(0),
          BigNumber.from(amountPaidRequester ?? 0),
          BigNumber.from(amountPaidChallenger ?? 0),
        ],
      } as unknown as SubgraphItem
    })
  }, [loadedItems, itemsQuery.isLoading])

  // Decode items once meta evidence and items were fetched.
  const items = useMemo<DecodedEntry[] | undefined>(() => {
    if (!metaEvidence || metaEvidence.address !== tcrAddress || !encodedItems)
      return undefined

    const columns = metaEvidence.metadata?.columns || []
    return encodedItems.map((item) => {
      let decodedItem: ReturnType<typeof gtcrDecode> | undefined
      const errors: string[] = []
      try {
        decodedItem = gtcrDecode({ values: item.data, columns })
      } catch {
        errors.push(
          `Error decoding item ${item.itemID} of list at ${tcrAddress}`,
        )
        console.warn(
          `Error decoding item ${item.itemID} of list at ${tcrAddress}`,
        )
      }

      // Return the item columns along with its TCR status data.
      return {
        tcrData: item,
        columns: columns.map(
          (column: Column, index: number): V2Field => ({
            ...column,
            value: decodedItem?.[index],
          }),
        ),
        errors,
      }
    })
  }, [metaEvidence, tcrAddress, encodedItems])

  // Search covers everything loaded; a page is one slice of the loaded set
  // (the query's offset already starts at this page), pending requests first.
  const searching = itemSearch.trim() !== ''
  const matchingItems = useMemo(
    () => items?.filter((entry) => entryMatchesSearch(entry, itemSearch)),
    [items, itemSearch],
  )
  const visibleItems = useMemo(() => {
    if (!matchingItems) return undefined
    // Promote pending requests across every loaded row, then take the page.
    const ordered = [...matchingItems].sort(pendingFirst)
    return searching ? ordered : ordered.slice(0, ITEMS_PER_PAGE)
  }, [matchingItems, searching])

  // Check if there an action in the URL.
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

  const { metadata, fileURI } = metaEvidence || {}
  const { tcrTitle, tcrDescription, logoURI } = metadata || {}
  const itemName = metadata?.itemName || 'entry'
  const itemNamePlural = metadata?.itemNamePlural || `${itemName}s`
  const isConnectedTCR = Boolean(metadata?.isConnectedTCR)
  const isTCRofTCRs = Boolean(metadata?.isTCRofTCRs)
  const relTcrDisabled = Boolean(metadata?.relTcrDisabled)

  const normalizedDescription = tcrDescription
    ? tcrDescription.endsWith('.')
      ? tcrDescription
      : `${tcrDescription}.`
    : ''
  const seoTitle = truncateAtWord(
    tcrTitle ? `${tcrTitle} - Kleros · Curate` : 'Kleros · Curate',
    60,
  )
  const seoDescription = truncateAtWord(
    metadata
      ? `Explore the ${tcrTitle} list on Kleros Curate: ${normalizedDescription}`
      : 'Explore curated lists on Kleros Curate.',
    160,
  )
  useDocumentHead(seoTitle, seoDescription)

  const columns = useMemo(
    () => tableColumns((metadata?.columns ?? []) as V2Field[]),
    [metadata],
  )

  // The reveal button sits inside the row link in the cards and rows
  // layouts, so the click must not also open the entry.
  const reveal = useCallback((id: string, event?: React.SyntheticEvent) => {
    event?.preventDefault?.()
    event?.stopPropagation?.()
    setRevealed((previous) => new Set(previous).add(id))
  }, [])

  const entries = useMemo<EntryRow[]>(() => {
    if (!visibleItems || !tcrAddress) return []
    return visibleItems.map((entry) => {
      const id = String(entry.tcrData.ID ?? entry.tcrData.itemID)
      const status =
        lightEntryStatus(entry.tcrData, timestamp, challengePeriodDuration) ??
        settledStatus(entry.tcrData)
      const firstValue = entry.columns[0]?.value
      const hidden =
        nsfwFilterOn &&
        !revealed.has(id) &&
        status?.code !== undefined &&
        HIDDEN_STATUS_CODES.has(status.code)
      return {
        id,
        href: `/tcr/${chainId}/${tcrAddress}/${id}`,
        fields: entry.columns,
        status,
        openListTo:
          isTCRofTCRs && typeof firstValue === 'string'
            ? `/tcr/${chainId}/${firstValue}`
            : undefined,
        hidden,
        onReveal: hidden
          ? (event?: React.SyntheticEvent) => reveal(id, event)
          : undefined,
      }
    })
  }, [
    visibleItems,
    tcrAddress,
    chainId,
    timestamp,
    challengePeriodDuration,
    nsfwFilterOn,
    revealed,
    isTCRofTCRs,
    reveal,
  ])

  const court = useMemo(() => {
    if (!arbitratorExtraData) return undefined
    try {
      return jurorsAndCourtIDFromExtraData(String(arbitratorExtraData))
    } catch {
      return undefined
    }
  }, [arbitratorExtraData])

  if (!tcrAddress)
    return (
      <ErrorPage
        code="404"
        message="The gods are having trouble finding this list."
        tip="Make sure your wallet is set to the correct network (is this on Gnosis Chain?)."
      />
    )

  if (tcrError)
    return (
      <ErrorPage
        code="400"
        message={
          typeof tcrError === 'string' ? tcrError : 'Decoding this item.'
        }
      />
    )

  // Counts from the loaded items, exactly as the old page computed them.
  const loadedCount = loadedItems?.length
  const removedCount = loadedItems?.filter(
    (item: RawItem) => item.status === 'Absent',
  ).length
  // The subgraph returns disputeID "0" for requests that were never
  // disputed, so a bare truthiness check would count every item.
  const disputedCount = loadedItems?.filter((item: RawItem) =>
    item.requests?.some(
      (request: RawRequest) =>
        request.disputed || (!!request.disputeID && request.disputeID !== '0'),
    ),
  ).length
  const stats: RegistryStat[] = [
    { label: 'Entries loaded', value: loadedCount },
    { label: 'Rejected or removed · loaded', value: removedCount },
    { label: 'Disputed · loaded', value: disputedCount },
  ]

  const periodSeconds = challengePeriodDuration
    ? challengePeriodDuration.toNumber()
    : undefined
  const periodText = periodSeconds
    ? formatDurationLong(periodSeconds)
    : undefined
  const costText = formatAmount(arbitrationCost, nativeCurrency)
  const breakdown = (base: BigNumber | undefined) =>
    base && costText
      ? `${formatAmount(base, nativeCurrency)} base deposit + ${costText} arbitration cost`
      : undefined
  const submitTotal = formatAmount(submissionDeposit, nativeCurrency)
  const challengeTotal = formatAmount(
    submissionChallengeDeposit,
    nativeCurrency,
  )

  // Addresses are middle-truncated, carry the full value in the title and
  // open the chain explorer (DESIGN.md address rule).
  const addressValue = (address: unknown) => {
    if (typeof address !== 'string' || !address) return undefined
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

  const parameters: RegistryParameter[] = [
    {
      label: 'Submit',
      value: submitTotal,
      hint: breakdown(submissionBaseDeposit),
    },
    {
      label: 'Challenge a submission',
      value: challengeTotal,
      hint: breakdown(submissionChallengeBaseDeposit),
    },
    {
      label: 'Remove',
      value: formatAmount(removalDeposit, nativeCurrency),
      hint: breakdown(removalBaseDeposit),
    },
    {
      label: 'Challenge a removal',
      value: formatAmount(removalChallengeDeposit, nativeCurrency),
      hint: breakdown(removalChallengeBaseDeposit),
    },
    {
      label: 'Challenge period',
      value: periodText,
      hint: 'Time anyone has to challenge a submission or a removal.',
    },
    {
      label: 'Arbitration cost',
      value: costText,
      hint: 'Paid to the court when a dispute opens. The winner takes the pool minus one arbitration cost.',
    },
    {
      label: 'Court',
      value: court
        ? `Court ${court.courtID} · ${court.numberOfJurors} juror${court.numberOfJurors === 1 ? '' : 's'}`
        : undefined,
      hint: 'The Kleros court and jury size that decide a challenge.',
    },
    {
      label: 'Arbitrator',
      value: addressValue(arbitrator),
      hint: 'The contract that runs disputes for this list.',
    },
    {
      label: 'Governor',
      value: addressValue(governor),
      hint: 'Can change the deposits, the challenge period, the court and the policy.',
    },
  ]

  const article = getArticleFor(itemName)
  const itemWord = midSentence(itemName)
  const explainerSteps: ExplainerStep[] = [
    {
      title: `Submit ${article} ${itemWord} with a deposit`,
      body:
        submitTotal && submissionBaseDeposit && costText
          ? `You send now ${submitTotal} = ${formatAmount(submissionBaseDeposit, nativeCurrency)} base deposit + ${costText} arbitration cost. It comes back in full if nobody challenges.`
          : 'You lock the list’s base deposit plus the arbitration cost. It comes back in full if nobody challenges.',
    },
    {
      title: periodText
        ? `Anyone can challenge for ${periodText}`
        : 'Anyone can challenge during the challenge period',
      body: challengeTotal
        ? `A challenger locks ${challengeTotal} and gives a reason. Kleros jurors then rule on the listing policy.`
        : 'A challenger locks their own deposit and gives a reason. Kleros jurors then rule on the listing policy.',
    },
    {
      title: 'Jurors decide; the winner is paid',
      body: 'The winner takes the pool minus one arbitration cost; the loser’s deposit is lost. Unchallenged requests are executed and the deposit returns.',
    },
  ]

  const verified =
    !!chainId &&
    getListOfListsAddresses(chainId).includes(tcrAddress.toLowerCase())
  const badgesListTo =
    chainId &&
    connectedTCRAddr &&
    connectedTCRAddr !== ZERO_ADDRESS &&
    !relTcrDisabled
      ? `/tcr/${chainId}/${connectedTCRAddr}`
      : undefined

  const openSubmit = () => {
    if (chainId && tcrAddress) navigate(`/tcr/${chainId}/${tcrAddress}/submit`)
    else setSubmissionFormOpen(true)
  }

  const setFilter = (filter: string, checked: boolean) =>
    navigate({
      search: updateLightFilter({ prevQuery: search, filter, checked }),
    })

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(search)
    params.set(FILTER_KEYS.PAGE, String(newPage))
    navigate({ search: `?${params.toString()}` })
  }

  const chips: FilterChip[] = FILTER_CHIPS.map((chip) => ({
    ...chip,
    checked: Boolean(queryOptions[chip.key]),
  }))
  const filtersActive = searching || chips.some((chip) => chip.checked)
  const clearFilters = () => {
    setItemSearch('')
    navigate({ search: '' })
  }

  const loading = itemsQuery.isLoading || !metadata || !items
  const loadedTotal = loadedItems?.length ?? 0
  const knownTotal = offset + loadedTotal
  const shownFrom = offset + 1
  const shownTo = offset + entries.length

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
        kindLabel={KIND_LABEL}
        itemName={itemWord}
        primaryLabel={`Submit ${article} ${itemWord}`}
        primaryAmount={submitTotal}
        onPrimary={openSubmit}
        policyURI={fileURI}
        onOpenPolicy={
          fileURI ? () => openAttachment(parseIpfs(fileURI), true) : undefined
        }
        badgesListTo={badgesListTo}
        stats={stats}
        parameters={parameters}
        explainerId={`registry-classic-${tcrAddress.toLowerCase()}`}
        explainerHeading="One deposit, a challenge window, a court if needed."
        explainerSteps={explainerSteps}
        loading={!metaEvidence}
      />

      <Note>
        Classic Curate is deprecated: this list keeps working, but new lists use
        Light Curate.
      </Note>

      <RegistryToolbar
        search={itemSearch}
        onSearch={setItemSearch}
        placeholder={`Search ${itemNamePlural}`}
        chips={chips}
        onChipChange={setFilter}
        sort={oldestFirst ? 'oldest' : 'newest'}
        onSortChange={(sort) =>
          setFilter(FILTER_KEYS.OLDEST_FIRST, sort === 'oldest')
        }
        layout={layout}
        onLayoutChange={setLayout}
        nsfwFilter={nsfwFilterOn}
        onNsfwChange={toggleNSFWFilter}
        shown={entries.length}
        total={loadedTotal}
      />

      {itemsQuery.error ? (
        <Surface $padding="none">
          <EmptyState
            icon="activity"
            title={`Could not load the ${itemNamePlural}`}
            action={
              <Button
                type="button"
                $variant="secondary"
                $size="sm"
                onClick={() => itemsQuery.refetch()}
              >
                Try again
              </Button>
            }
          >
            {itemsQuery.error.message}
          </EmptyState>
        </Surface>
      ) : (
        <EntryList
          layout={layout}
          entries={entries}
          columns={columns}
          now={now}
          itemName={itemWord}
          itemNamePlural={itemNamePlural}
          loading={loading}
          emptyAction={
            filtersActive ? (
              <Button
                type="button"
                $variant="secondary"
                $size="sm"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Past the last page (?page=N with no rows) the footer stays so the
          pagination can take the reader back. */}
      {!loading && !itemsQuery.error && (entries.length > 0 || offset > 0) && (
        <ListFooter>
          <Small $muted>
            {searching
              ? `${entries.length} of ${loadedTotal} loaded ${itemNamePlural} match`
              : entries.length === 0
                ? `No ${itemNamePlural} on page ${currentPage}`
                : `${capitalizeFirstLetter(itemNamePlural)} ${shownFrom}–${shownTo} of ${knownTotal} loaded`}
          </Small>
          {!searching && (knownTotal > ITEMS_PER_PAGE || offset > 0) && (
            <Pagination
              current={currentPage}
              pageSize={ITEMS_PER_PAGE}
              total={knownTotal}
              onChange={goToPage}
            />
          )}
        </ListFooter>
      )}

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
