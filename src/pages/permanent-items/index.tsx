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
import { ethers } from 'ethers'
import localforage from 'localforage'
import { STALE_TIME } from 'consts'
import _gtcr from 'assets/abis/PermanentGTCR.json'
import { WalletContext } from 'contexts/wallet-context'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import { PERMANENT_ITEMS_QUERY, PERMANENT_REGISTRY_QUERY } from 'utils/graphql'
import {
  P_FILTER_KEYS,
  searchStrToFilterObjPermanent,
  updateLightFilter,
} from 'utils/filters'
import { parseIpfs } from 'utils/ipfs-parse'
import {
  capitalizeFirstLetter,
  jurorsAndCourtIDFromExtraData,
} from 'utils/string'
import { truncateAtWord } from 'utils/truncate-at-word'
import { formatDurationLong } from 'utils/time'
import { getAddressPage } from 'utils/network-utils'
import { STATUS_CODE } from 'utils/permanent-item-status'
import { getListOfListsAddresses } from 'config/list-of-lists'
import useUrlChainId from 'hooks/use-url-chain-id'
import useArbitrationCost from 'hooks/arbitration-cost'
import useTokenSymbol from 'hooks/token-symbol'
import useNativeCurrency from 'hooks/native-currency'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import useStoredLayout from 'hooks/use-stored-layout'
import { useAttachment } from 'hooks/use-attachment'
import { useEthersProvider } from 'hooks/ethers-adapters'
import ETHAmount from 'components/eth-amount'
import TokenAmount from 'components/token-amount'
import { Pagination } from 'components/ui'
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
import { stakeEntryStatus } from 'components/curate/entry-status'
import type { ExplainerStep } from 'components/curate/explainer'
import type { V2Field } from 'components/curate/v2'
import {
  Button,
  Data,
  Page,
  Small,
  truncateMiddle,
} from 'components/curate/primitives'
import { CurateIcon } from 'components/curate/icons'
import ErrorPage from '../error-page'

/*
 * Stake Curate registry page. The registry is read first (its periods and
 * multipliers are needed to derive statuses), then the items for the current
 * filters and page. The UI is RegistryHeader (identity, action, stats,
 * parameters, explainer), RegistryToolbar, EntryList and Pagination.
 */

const NSFW_FILTER_KEY = 'NSFW_FILTER_KEY'
const ITEMS_PER_PAGE = 40
const KIND_LABEL = 'Stake Curate'

// Registries whose description says "see terms and conditions" link to them.
const TERMS_AND_CONDITIONS_URLS: Record<string, string | undefined> = {
  '0x7305c57b731876f452da8574a77d05957820e588':
    'https://cdn.kleros.link/ipfs/QmcZ53agYqpPhYijRFzduC3EC64coFGZkhbRN1sPDyW7di',
}

const TERMS_PATTERN = /see\s+(?:the\s+)?terms?\s*(?:and|&)?\s*conditions?/gi

/** Statuses hidden behind a reveal while the sensitive-content filter is on. */
const HIDDEN_STATUSES = new Set([
  STATUS_CODE.REJECTED,
  STATUS_CODE.REMOVED,
  STATUS_CODE.WITHDRAWN,
  STATUS_CODE.DISPUTED,
  STATUS_CODE.CROWDFUNDING,
  STATUS_CODE.CROWDFUNDING_WINNER,
])

/** Label of the synthetic locked-stake column, shown in every layout. */
const STAKE_COLUMN_LABEL = 'Locked stake'

/** The stake column, with a label the registry's own columns do not use. */
const stakeColumnFor = (columns: V2Field[]): V2Field => {
  const labels = new Set(columns.map((column) => column.label))
  return {
    label: labels.has(STAKE_COLUMN_LABEL)
      ? `${STAKE_COLUMN_LABEL} (token)`
      : STAKE_COLUMN_LABEL,
    type: 'text',
  }
}

/**
 * A Stake Curate subgraph item: decoded fields arrive nested under
 * `metadata.props` or flattened as `props`.
 */
interface StakeItem extends SubgraphItem {
  itemID: string
  metadata?: { props?: V2Field[] } | null
  props?: V2Field[]
}

const integer = new Intl.NumberFormat('en-US')
const formatInt = (value: number) => integer.format(value)

/**
 * The Stake Curate subgraph reports negative counters on some lists. A
 * negative count is a broken counter, not a number to show.
 */
const isCount = (value: number) => Number.isFinite(value) && value >= 0

const itemFields = (item: StakeItem): V2Field[] =>
  item.metadata?.props ?? item.props ?? []

const matchesSearch = (item: StakeItem, rawSearch: string): boolean => {
  const query = rawSearch.trim().toLowerCase()
  if (!query) return true
  const text = [
    item.itemID,
    item.status,
    ...itemFields(item).map(
      (field) => `${field.label ?? ''} ${String(field.value ?? '')}`,
    ),
  ]
    .join(' ')
    .toLowerCase()
  return text.includes(query)
}

/** Token amount in units, trimmed to three decimals, as TokenAmount does. */
const formatToken = (
  amount: string | number | undefined,
  decimals: number,
): string => {
  if (amount === undefined) return ''
  const [whole, fraction = ''] = ethers.utils
    .formatUnits(String(amount), decimals)
    .split('.')
  const trimmed = fraction.slice(0, 3).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

/** "50%" from a basis-point multiplier and the contract's divisor. */
const formatPercent = (
  multiplier: string | number,
  divisor: string | number,
): string | undefined => {
  const m = Number(multiplier)
  const d = Number(divisor)
  if (!Number.isFinite(m) || !Number.isFinite(d) || d <= 0) return
  return `${Number(((m * 100) / d).toFixed(2))}%`
}

const seconds = (value: string | number | undefined): number | undefined => {
  if (value === undefined) return
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

const TermsLink = styled.a`
  color: var(--color-primary);
  text-decoration: underline;

  &:hover {
    color: var(--color-primary-hover);
  }
`

const ExplorerLink = styled.a`
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const Notice = styled.div`
  margin-bottom: 12px;
`

const ListFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
`

/** The description with each "see terms and conditions" phrase as a link. */
const withTermsLink = (
  description: string,
  tcrAddress?: string,
): React.ReactNode => {
  const termsUrl = tcrAddress
    ? TERMS_AND_CONDITIONS_URLS[tcrAddress.toLowerCase()]
    : undefined
  if (!termsUrl) return description

  const parts: React.ReactNode[] = []
  const regex = new RegExp(TERMS_PATTERN.source, 'gi')
  let lastIndex = 0
  let match = regex.exec(description)
  while (match) {
    if (match.index > lastIndex)
      parts.push(description.slice(lastIndex, match.index))
    parts.push(
      <TermsLink
        key={match.index}
        href={termsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {match[0]}
      </TermsLink>,
    )
    lastIndex = regex.lastIndex
    match = regex.exec(description)
  }
  if (parts.length === 0) return description
  if (lastIndex < description.length) parts.push(description.slice(lastIndex))
  return <>{parts}</>
}

const AddressValue = ({
  chainId,
  address,
}: {
  chainId: number
  address?: string
}) => {
  if (!address) return null
  return (
    <ExplorerLink
      href={getAddressPage({ networkId: chainId, address })}
      target="_blank"
      rel="noopener noreferrer"
      title={address}
    >
      {truncateMiddle(address, 8, 6)}
    </ExplorerLink>
  )
}

const StakeRegistry = () => {
  const navigate = useNavigate()
  const { search } = useLocation()
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const chainId = useUrlChainId()
  const timestamp = useContext(WalletContext)?.timestamp
  const now = useNow()
  const openAttachment = useAttachment()
  const { graphqlBatcher } = useGraphqlBatcher()
  const library = useEthersProvider({ chainId: chainId ?? undefined })
  const nativeCurrency = useNativeCurrency()
  const [layout, setLayout] = useStoredLayout('registry-entries', 'table')
  const [nsfwFilterOn, setNsfwFilterOn] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set())

  const queryOptions = searchStrToFilterObjPermanent(search)
  const { oldestFirst, page, absent, registered, disputed } = queryOptions
  const currentPage = Number(page) || 1
  const registryId = tcrAddress?.toLowerCase()

  // The registry comes first: its periods and multipliers drive everything.
  const registryQuery = useQuery({
    queryKey: ['permanentRegistry', tcrAddress, chainId],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: PERMANENT_REGISTRY_QUERY,
        variables: { lowerCaseTCRAddress: registryId },
        chainId: chainId!,
        isPermanent: true,
      }),
    enabled: !!chainId && !!registryId,
    staleTime: Infinity,
  })
  const registry = registryQuery.data?.registry as SubgraphRegistry | undefined

  const itemsWhere = useMemo(() => {
    const statuses: string[] = []
    if (absent) statuses.push('Absent')
    if (registered) statuses.push('Submitted', 'Reincluded')
    if (disputed) statuses.push('Disputed')
    if (statuses.length === 0) return { registry: registryId }
    return { registry: registryId, status_in: statuses }
  }, [absent, registered, disputed, registryId])

  const itemsVariables = useMemo(
    () => ({
      skip: (currentPage - 1) * ITEMS_PER_PAGE,
      first: ITEMS_PER_PAGE,
      orderDirection: oldestFirst ? 'asc' : 'desc',
      where: itemsWhere,
    }),
    [currentPage, oldestFirst, itemsWhere],
  )

  const itemsQuery = useQuery({
    queryKey: ['permanentItems', chainId, itemsVariables],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: PERMANENT_ITEMS_QUERY,
        variables: itemsVariables,
        chainId: chainId!,
        isPermanent: true,
      }),
    enabled: !!registry && !!chainId,
    staleTime: STALE_TIME,
  })

  // The columns live only in the MetaEvidence file, not in the subgraph.
  const arbitrationSetting = registry?.arbitrationSettings?.[0]
  const metaEvidenceURI = arbitrationSetting?.metaEvidenceURI
  const columnsQuery = useQuery({
    queryKey: ['permanentRegistryColumns', metaEvidenceURI],
    queryFn: async () => {
      const response = await fetch(parseIpfs(metaEvidenceURI!))
      const file: MetaEvidence = await response.json()
      return file.metadata?.columns ?? []
    },
    enabled: !!metaEvidenceURI,
    staleTime: Infinity,
  })
  const columns = columnsQuery.data

  // Governor and the multiplier divisor are not indexed; read them on-chain.
  const contractQuery = useQuery({
    queryKey: ['permanentRegistryContract', chainId, registryId],
    queryFn: async () => {
      const contract = new ethers.Contract(tcrAddress!, _gtcr, library!)
      const [governor, divisor] = await Promise.all([
        contract.governor(),
        contract.MULTIPLIER_DIVISOR(),
      ])
      return { governor: String(governor), divisor: String(divisor) }
    },
    enabled: !!tcrAddress && !!library,
    staleTime: Infinity,
  })

  const arbitrationCost = useArbitrationCost({
    address: registry?.arbitrator?.id,
    arbitratorExtraData: arbitrationSetting?.arbitratorExtraData,
    library,
  })
  const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenSymbol(
    registry?.token,
  )

  // The sensitive-content setting is shared with the other registry pages.
  useEffect(() => {
    ;(async () => {
      const saved = await localforage.getItem(NSFW_FILTER_KEY)
      if (typeof saved === 'boolean') setNsfwFilterOn(saved)
    })()
  }, [])
  const toggleNsfwFilter = useCallback((checked: boolean) => {
    setNsfwFilterOn(checked)
    localforage.setItem(NSFW_FILTER_KEY, checked)
  }, [])

  const counts = useMemo(
    () => ({
      submitted: Number(registry?.numberOfSubmitted ?? 0),
      absent: Number(registry?.numberOfAbsent ?? 0),
      disputed: Number(registry?.numberOfDisputed ?? 0),
    }),
    [registry],
  )

  const countsKnown =
    isCount(counts.submitted) &&
    isCount(counts.absent) &&
    isCount(counts.disputed)

  const itemCount = useMemo(() => {
    if (!registry) return 0
    const hasAnyFilter = absent || registered || disputed
    if (!hasAnyFilter) return counts.submitted + counts.absent + counts.disputed
    let sum = 0
    if (absent) sum += counts.absent
    if (registered) sum += counts.submitted
    if (disputed) sum += counts.disputed
    return sum
  }, [registry, absent, registered, disputed, counts])

  // The batcher resolves failed requests to {}, so guard the items field.
  const items: StakeItem[] = useMemo(
    () => itemsQuery.data?.items ?? [],
    [itemsQuery.data],
  )
  const visibleItems = useMemo(
    () => items.filter((item) => matchesSearch(item, itemSearch)),
    [items, itemSearch],
  )

  // Columns live in the MetaEvidence file. Until it loads, or when the IPFS
  // fetch fails, the first entry's own labels stand in.
  const baseColumns = useMemo<V2Field[]>(
    () => columns ?? (items[0] ? itemFields(items[0]) : []),
    [columns, items],
  )
  const stakeColumn = useMemo(() => stakeColumnFor(baseColumns), [baseColumns])

  const metadata = arbitrationSetting?.metadata
  const title = metadata?.title
  const itemName = metadata?.itemName || 'entry'
  const itemNamePlural = metadata?.itemNamePlural || `${itemName}s`
  const policyURI = metadata?.policyURI

  const normalizedDescription = metadata?.description
    ? metadata.description.endsWith('.')
      ? metadata.description
      : `${metadata.description}.`
    : ''
  const description = capitalizeFirstLetter(normalizedDescription)
  const descriptionNode = description
    ? withTermsLink(description, tcrAddress)
    : undefined

  useDocumentHead(
    truncateAtWord(
      title ? `${title} - Kleros · Curate` : 'Kleros · Curate',
      60,
    ),
    truncateAtWord(
      title
        ? `Explore the ${title} list on Kleros Curate: ${normalizedDescription}`
        : 'Explore curated lists on Kleros Curate.',
      160,
    ),
  )

  const openSubmit = useCallback(() => {
    if (chainId && tcrAddress) navigate(`/tcr/${chainId}/${tcrAddress}/submit`)
  }, [chainId, tcrAddress, navigate])

  const openPolicy = useCallback(() => {
    if (policyURI) openAttachment(parseIpfs(policyURI), true)
  }, [policyURI, openAttachment])

  const reveal = useCallback((itemID: string) => {
    setRevealed((previous) => new Set(previous).add(itemID))
  }, [])

  const entries: EntryRow[] = useMemo(
    () =>
      visibleItems.map((item) => {
        const status = stakeEntryStatus(item, timestamp, registry)
        const hidden =
          nsfwFilterOn &&
          !revealed.has(item.itemID) &&
          status?.code !== undefined &&
          HIDDEN_STATUSES.has(status.code)
        const onList = status ? status.tone !== 'off' : true
        return {
          id: item.itemID,
          href: `/tcr/${chainId}/${tcrAddress}/${item.itemID}`,
          fields: [
            ...itemFields(item),
            {
              ...stakeColumn,
              value:
                onList && item.stake
                  ? `${formatToken(item.stake, tokenDecimals)} ${tokenSymbol}`
                  : '',
            },
          ],
          status,
          hidden,
          onReveal: hidden ? () => reveal(item.itemID) : undefined,
        }
      }),
    [
      visibleItems,
      timestamp,
      registry,
      nsfwFilterOn,
      revealed,
      chainId,
      tcrAddress,
      tokenDecimals,
      tokenSymbol,
      stakeColumn,
      reveal,
    ],
  )

  const listColumns = useMemo<V2Field[]>(
    () => [...tableColumns(baseColumns), stakeColumn],
    [baseColumns, stakeColumn],
  )

  const chips: FilterChip[] = [
    {
      key: P_FILTER_KEYS.REGISTERED,
      label: 'Listed',
      tone: 'registered',
      checked: !!registered,
    },
    {
      key: P_FILTER_KEYS.DISPUTED,
      label: 'Disputed',
      tone: 'contested',
      checked: !!disputed,
    },
    {
      key: P_FILTER_KEYS.ABSENT,
      label: 'Rejected or removed',
      tone: 'off',
      checked: !!absent,
    },
  ]

  const setFilter = (filter: string, checked: boolean) =>
    navigate({
      search: updateLightFilter({ prevQuery: search, filter, checked }),
    })

  const setPage = (nextPage: number) => {
    const params = new URLSearchParams(search)
    params.set(P_FILTER_KEYS.PAGE, String(nextPage))
    navigate({ search: `?${params.toString()}` })
  }

  const minStake = registry?.submissionMinDeposit ? (
    <TokenAmount
      amount={registry.submissionMinDeposit}
      tokenDecimals={tokenDecimals}
      precision={3}
      displayUnit={` ${tokenSymbol}`}
    />
  ) : undefined
  const arbitrationDeposit = arbitrationCost.arbitrationCost ? (
    <ETHAmount
      amount={arbitrationCost.arbitrationCost}
      displayUnit={` ${nativeCurrency}`}
    />
  ) : undefined
  const divisor = contractQuery.data?.divisor
  const challengePercent =
    registry?.challengeStakeMultiplier !== undefined && divisor
      ? formatPercent(registry.challengeStakeMultiplier, divisor)
      : undefined
  const withdrawingPeriod = seconds(registry?.withdrawingPeriod)
  const periodValue = (value: string | number | undefined) => {
    const s = seconds(value)
    return s === undefined ? undefined : formatDurationLong(s)
  }

  // The extra data encodes the court id and the number of jurors drawn.
  const arbitratorExtraData = arbitrationSetting?.arbitratorExtraData
  const court = useMemo(() => {
    if (!arbitratorExtraData) return undefined
    try {
      return jurorsAndCourtIDFromExtraData(arbitratorExtraData)
    } catch {
      return undefined
    }
  }, [arbitratorExtraData])

  // RegistryHeader prints '—' for an undefined value: unknown, not zero.
  const countValue = (value: number) =>
    registry && countsKnown ? formatInt(value) : undefined

  const stats: RegistryStat[] = [
    {
      label: 'Entries',
      value: countValue(counts.submitted + counts.absent + counts.disputed),
    },
    { label: 'Listed', value: countValue(counts.submitted) },
    { label: 'Disputed', value: countValue(counts.disputed) },
  ]

  const parameters: RegistryParameter[] = [
    {
      label: 'Minimum stake',
      value: minStake,
      hint: `Locked in ${tokenSymbol} for as long as the ${itemName} is listed. You can stake more than the minimum.`,
    },
    {
      label: 'Arbitration deposit',
      value: arbitrationDeposit,
      hint: `Paid in ${nativeCurrency} with the stake and held with the ${itemName}. If a challenger wins it goes to them to cover the juror fees they paid; if you win it stays locked; it comes back with the stake when you withdraw.`,
    },
    {
      label: 'Challenger stake',
      value: challengePercent
        ? `${challengePercent} of the entry's stake`
        : registry?.challengeStakeMultiplier !== undefined
          ? `${registry.challengeStakeMultiplier} (raw multiplier)`
          : undefined,
      hint: challengePercent
        ? `Locked in ${tokenSymbol} by the challenger, who also pays the arbitration cost to the court. If the challenge fails it is added to the entry's stake.`
        : "Share of the entry's stake, in basis points; the percentage appears once the contract divisor has loaded.",
    },
    {
      label: 'Submission period',
      value: periodValue(registry?.submissionPeriod),
      hint: `After this a new ${itemName} counts as accepted. It can still be challenged.`,
    },
    {
      label: 'Reinclusion period',
      value: periodValue(registry?.reinclusionPeriod),
      hint: `After a ruling keeps the ${itemName}, it counts as accepted again once this period has passed.`,
    },
    {
      label: 'Withdrawing period',
      value: periodValue(registry?.withdrawingPeriod),
      hint: `Between starting a withdrawal and taking the stake back. The ${itemName} can still be challenged meanwhile.`,
    },
    {
      label: 'Arbitration params cooldown',
      value: periodValue(registry?.arbitrationParamsCooldown),
      hint: 'Delay before new arbitration settings apply to every entry.',
    },
    {
      label: 'Arbitrator',
      value:
        chainId && registry?.arbitrator?.id ? (
          <>
            <AddressValue chainId={chainId} address={registry.arbitrator.id} />
            {court && (
              <span title={`Extra data ${arbitratorExtraData}`}>
                {' · '}Court {court.courtID} · {court.numberOfJurors} jurors
              </span>
            )}
          </>
        ) : undefined,
      hint: court
        ? `Challenges go to court ${court.courtID}, which draws ${court.numberOfJurors} jurors.`
        : arbitratorExtraData
          ? `Extra data ${arbitratorExtraData.slice(0, 18)}…`
          : undefined,
    },
    {
      label: 'Governor',
      value:
        chainId && contractQuery.data?.governor ? (
          <AddressValue
            chainId={chainId}
            address={contractQuery.data.governor}
          />
        ) : undefined,
      hint: 'Can change the periods, the multipliers and the arbitration settings.',
    },
    {
      label: 'Rejected or removed',
      value: countValue(counts.absent),
      hint: `${capitalizeFirstLetter(itemNamePlural)} no longer on the list: withdrawn, or removed after a challenge.`,
    },
  ]

  const explainerSteps: ExplainerStep[] = [
    {
      title: 'Stake to list',
      body: (
        <>
          You lock{' '}
          {minStake ? (
            <>
              at least <Data>{minStake}</Data>
            </>
          ) : (
            'the minimum stake'
          )}{' '}
          and{' '}
          {arbitrationDeposit ? (
            <>
              a <Data>{arbitrationDeposit}</Data> arbitration deposit
            </>
          ) : (
            'an arbitration deposit'
          )}
          . The stake stays locked while your {itemName} is listed, and anyone
          can challenge it at any time.
          {withdrawingPeriod !== undefined &&
            ` Taking it back takes ${formatDurationLong(withdrawingPeriod)}.`}
        </>
      ),
    },
    {
      title: 'A challenger stakes against it',
      body: `A challenger locks ${
        challengePercent
          ? `${challengePercent} of your stake`
          : 'a share of your stake'
      } and pays the arbitration cost to the court, then Kleros jurors rule on the listing policy. The challenger recovers that cost from your deposit only if they win.`,
    },
    {
      title: 'Win and your stake grows, lose and the challenger takes it',
      body: `If you win, the challenger's stake is added to yours, so the next challenge costs more (progressive protection). If you lose, the challenger takes your stake and the arbitration deposit, and the ${itemName} leaves the list.`,
    },
  ]

  if (!chainId || !tcrAddress)
    return (
      <ErrorPage
        code="404"
        title="List not found"
        message="This address does not point to a Stake Curate list on a supported chain."
      />
    )

  if (registryQuery.isError || (registryQuery.data && !registry))
    return (
      <ErrorPage
        code="404"
        title="List not found"
        message="This Stake Curate list could not be loaded."
        tip="Check the address and the chain in the address bar. Is this list on Gnosis?"
      />
    )

  const loading = !registry
  const itemsLoading = loading || itemsQuery.isLoading
  const verified = getListOfListsAddresses(chainId).includes(
    tcrAddress.toLowerCase(),
  )
  const pageStart = (currentPage - 1) * ITEMS_PER_PAGE + 1
  const pageEnd = Math.min(currentPage * ITEMS_PER_PAGE, itemCount)

  return (
    <Page>
      <RegistryHeader
        title={title}
        // RegistryHeader types the description as a string; the terms link
        // needs a node. React renders either, so the node goes through.
        description={descriptionNode as string}
        logoURI={metadata?.logoURI}
        chainId={chainId}
        address={tcrAddress}
        verified={verified}
        kindLabel={KIND_LABEL}
        itemName={itemName}
        primaryLabel={`Submit ${itemName}`}
        primaryAmount={
          minStake && arbitrationDeposit ? (
            <>
              {minStake} + {arbitrationDeposit}
            </>
          ) : (
            minStake
          )
        }
        onPrimary={openSubmit}
        policyURI={policyURI}
        onOpenPolicy={policyURI ? openPolicy : undefined}
        stats={stats}
        parameters={parameters}
        explainerId={`registry-stake-${tcrAddress.toLowerCase()}`}
        explainerHeading="Your stake stays locked, and a challenge can come at any time."
        explainerSteps={explainerSteps}
        loading={loading}
      />

      <RegistryToolbar
        search={itemSearch}
        onSearch={setItemSearch}
        placeholder={`Search ${itemNamePlural}`}
        chips={chips}
        onChipChange={setFilter}
        sort={oldestFirst ? 'oldest' : 'newest'}
        onSortChange={(sort) =>
          setFilter(P_FILTER_KEYS.OLDEST_FIRST, sort === 'oldest')
        }
        layout={layout}
        onLayoutChange={setLayout}
        nsfwFilter={nsfwFilterOn}
        onNsfwChange={toggleNsfwFilter}
        shown={entries.length}
        total={countsKnown ? itemCount : items.length}
      />

      {columnsQuery.isError && (
        <Notice role="status">
          <Small $muted>
            Column names could not be loaded; showing the entries&apos; own
            labels.
          </Small>
        </Notice>
      )}

      <EntryList
        layout={layout}
        entries={entries}
        columns={listColumns}
        now={now}
        itemName={itemName}
        itemNamePlural={itemNamePlural}
        loading={itemsLoading}
        emptyAction={
          <Button
            type="button"
            $variant="primary"
            $size="sm"
            onClick={openSubmit}
          >
            <CurateIcon name="submit" size={14} />
            Submit {itemName}
          </Button>
        }
      />

      {countsKnown && itemCount > 0 && (
        <ListFooter>
          <Small $muted>
            {formatInt(pageStart)}–{formatInt(pageEnd)} of{' '}
            {formatInt(itemCount)} {itemNamePlural}
          </Small>
          {itemCount > ITEMS_PER_PAGE && (
            <Pagination
              current={currentPage}
              pageSize={ITEMS_PER_PAGE}
              total={itemCount}
              onChange={setPage}
            />
          )}
        </ListFooter>
      )}
    </Page>
  )
}

export default StakeRegistry
