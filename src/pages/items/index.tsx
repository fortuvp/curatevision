/* eslint-disable no-unused-vars */
import { Card, Spin, Select } from 'components/ui'
import { useNavigate, useParams } from 'react-router-dom'
import useUrlChainId from 'hooks/use-url-chain-id'
import React, {
  useEffect,
  useState,
  useContext,
  useMemo,
  useCallback,
} from 'react'
import localforage from 'localforage'
import { useQuery } from '@tanstack/react-query'
import { request } from 'graphql-request'
import { STALE_TIME } from 'consts'
import ErrorPage from '../error-page'
import { WalletContext } from 'contexts/wallet-context'
import { TCRViewContext } from 'contexts/tcr-view-context'
import { BigNumber } from 'ethers'
import { gtcrDecode } from '@kleros/gtcr-encoder'
import SubmitModal from '../item-details/modals/submit'
import SubmitConnectModal from '../item-details/modals/submit-connect'
import {
  searchStrToFilterObjLight,
  filterLabelLight,
  FILTER_KEYS,
  updateLightFilter,
} from 'utils/filters'
import ItemCard from './item-card'
import { type EnrichedItem } from 'pages/light-items/item-card'
import Banner from './banner'
import { DISPUTE_STATUS } from 'utils/item-status'
import { CLASSIC_REGISTRY_ITEMS_QUERY } from 'utils/graphql'
import RegistryInfoPanel from 'components/curate/registry-info-panel'
import ETHAmount from 'components/eth-amount'
import { NETWORKS_INFO } from 'config/networks'
import { subgraphUrl } from 'config/tcr-addresses'
import { getListOfListsAddresses } from 'config/list-of-lists'
import humanizeDuration from 'humanize-duration'
import { CurateIcon } from 'components/curate/icons'
import {
  NSFW_FILTER_KEY,
  StyledLayoutContent,
  StyledContent,
  StyledFilters,
  StyledSwitch,
  StyledTag,
  StyledSelect,
  StyledGrid,
  StyledPagination,
  FiltersContainer,
  ITEMS_PER_PAGE,
  pagingItem,
} from 'pages/light-items'
import {
  ToolbarMeta,
  ToolbarSearch,
  ToolbarSearchInput,
  V2RegistryViewMode,
  ViewModeToggle,
  itemMatchesSearch,
} from 'components/curate/v2-registry-toolbar'

const MAX_ENTITIES = 1000

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
  requests: RawRequest[]
  [key: string]: unknown
}

const Items = () => {
  const navigate = useNavigate()
  const search = window.location.search || ''
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
  const arbitrator = tcrViewContext?.arbitrator
  const arbitratorExtraData = tcrViewContext?.arbitratorExtraData
  const governor = tcrViewContext?.governor
  const [submissionFormOpen, setSubmissionFormOpen] = useState<
    boolean | undefined
  >()
  const queryOptions = searchStrToFilterObjLight(search)
  const [nsfwFilterOn, setNSFWFilter] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [viewMode, setViewMode] = useState<V2RegistryViewMode>('list')
  const [queryItemParams, setQueryItemParams] = useState<string[] | undefined>()

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
      offset: (Number(page) - 1) * ITEMS_PER_PAGE,
      limit: MAX_ENTITIES,
      order_by: [{ latestRequestSubmissionTime: orderDirection }],
      where: itemsWhere,
    }),
    [page, orderDirection, itemsWhere],
  )

  const itemsQuery = useQuery({
    queryKey: ['classicItems', queryVariables],
    queryFn: () => {
      const url = subgraphUrl[chainId!]
      if (!url) throw new Error(`No subgraph URL for chain ${chainId}`)
      return request(url, CLASSIC_REGISTRY_ITEMS_QUERY, queryVariables)
    },
    enabled: !!chainId,
    staleTime: STALE_TIME,
    refetchInterval: 30_000, // Poll subgraph every 30s for status changes
  })

  // big useEffect for fetching + encoding the data was transformed into
  // a basic useQuery hook to fetch data, and a memo to encode items
  // due to rerendering loop problems with useEffects
  const encodedItems = useMemo(() => {
    if (!itemsQuery.data || itemsQuery.isLoading) return null
    let items = itemsQuery.data.items

    items = items.map((item: RawItem) => {
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
      } = rounds[0] ?? {}

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

    return items
  }, [itemsQuery.data, itemsQuery.isLoading])

  // Decode items once meta evidence and items were fetched.
  const items = useMemo(() => {
    if (!metaEvidence || metaEvidence.address !== tcrAddress || !encodedItems)
      return

    return encodedItems.map((item: SubgraphItem, i: number) => {
      let decodedItem: ReturnType<typeof gtcrDecode> | undefined
      const errors: string[] = []
      const columns = metaEvidence.metadata?.columns || []
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
        tcrData: {
          ...item, // Spread to convert from array to object.
        },
        columns: columns.map(
          (col: Column, i: number) => ({
            value: decodedItem && decodedItem[i],
            ...col,
          }),
          { key: i },
        ),
        errors,
      }
    })
  }, [metaEvidence, tcrAddress, encodedItems])

  const visibleItems = useMemo(() => {
    if (!items) return

    return [...items]
      .filter((item) => itemMatchesSearch(item, itemSearch))
      .sort(
        (
          { tcrData: tcrDataA }: EnrichedItem,
          { tcrData: tcrDataB }: EnrichedItem,
        ) => {
          // Display items with pending requests first.
          if (!tcrDataA || !tcrDataB) return 0 // Handle errored TCRs.
          if (!tcrDataA.resolved && tcrDataB.resolved) return -1
          if (tcrDataA.resolved && !tcrDataB.resolved) return 1
          return 0
        },
      )
  }, [itemSearch, items])

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

  const { metadata } = metaEvidence || {}
  const { isConnectedTCR } = metadata || {}

  const itemCount = Math.floor(itemsQuery.data?.items?.length) ?? 0
  const loadedItems = itemsQuery.data?.items ?? []
  const loadedRemovedCount = loadedItems.filter(
    (item: RawItem) => item.status === 'Absent',
  ).length
  const loadedDisputeCount = loadedItems.filter((item: RawItem) =>
    item.requests?.some(
      (request: RawRequest) => request.disputed || request.disputeID,
    ),
  ).length
  const nativeSymbol =
    chainId && NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
      ? ` ${
          NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO].nativeCurrency
            .symbol
        }`
      : ' ETH'
  const depositValue = (amount: unknown) =>
    amount ? (
      <ETHAmount
        amount={amount as string}
        decimals={18}
        displayUnit={nativeSymbol}
      />
    ) : undefined
  const periodValue = (seconds: unknown) =>
    seconds
      ? humanizeDuration(Number(seconds) * 1000, {
          largest: 2,
          round: true,
        })
      : undefined
  const verifiedSource =
    !!chainId &&
    !!tcrAddress &&
    getListOfListsAddresses(chainId).includes(tcrAddress.toLowerCase())

  return (
    <>
      <Banner
        metaEvidence={metaEvidence}
        setSubmissionFormOpen={setSubmissionFormOpen}
        connectedTCRAddr={connectedTCRAddr}
        tcrAddress={tcrAddress}
      />
      <RegistryInfoPanel
        chainId={chainId ?? undefined}
        address={tcrAddress}
        verified={verifiedSource}
        fields={[
          {
            label: 'Loaded items',
            icon: 'registry',
            value: String(itemCount),
            hint: 'Classic registry sample currently loaded on this page.',
          },
          {
            label: 'Removed loaded',
            icon: 'remove',
            value: String(loadedRemovedCount),
          },
          {
            label: 'Disputes loaded',
            icon: 'dispute',
            value: String(loadedDisputeCount),
          },
          {
            label: 'Submission deposit',
            icon: 'submit',
            value: depositValue(submissionDeposit),
            hint: 'Requester stake plus the current arbitration fee.',
          },
          {
            label: 'Challenge deposit',
            icon: 'challenge',
            value: depositValue(submissionChallengeDeposit),
            hint: 'Required to challenge a pending registration.',
          },
          {
            label: 'Removal deposit',
            icon: 'remove',
            value: depositValue(removalDeposit),
          },
          {
            label: 'Removal challenge',
            icon: 'dispute',
            value: depositValue(removalChallengeDeposit),
          },
          {
            label: 'Challenge period',
            icon: 'activity',
            value: periodValue(challengePeriodDuration),
          },
          {
            label: 'Arbitration fee',
            icon: 'court',
            value: depositValue(arbitrationCost),
            hint: 'Arbitration fees are paid up front to open or continue a dispute. They are reimbursed to the side that wins, so parties acting in good faith should not ultimately bear them.',
          },
          {
            label: 'Governor',
            icon: 'verified',
            value: governor ? String(governor) : undefined,
          },
          {
            label: 'Arbitrator',
            icon: 'court',
            value: arbitrator ? String(arbitrator) : undefined,
            hint: arbitratorExtraData
              ? `Extra data ${String(arbitratorExtraData).slice(0, 18)}...`
              : undefined,
          },
        ]}
      />
      <StyledLayoutContent>
        <StyledContent>
          <Spin spinning={itemsQuery.isLoading || !metadata}>
            <>
              <FiltersContainer id="items-filters">
                <ToolbarSearch>
                  <CurateIcon name="search" size={18} />
                  <ToolbarSearchInput
                    aria-label="Search registry entries"
                    placeholder="Search entries"
                    value={itemSearch}
                    onChange={(event) => setItemSearch(event.target.value)}
                  />
                </ToolbarSearch>
                <StyledFilters>
                  <StyledSwitch
                    checkedChildren="NSFW Filter: On"
                    unCheckedChildren="NSFW Filter: Off"
                    checked={nsfwFilterOn}
                    onChange={toggleNSFWFilter}
                  />
                  {Object.keys(queryOptions)
                    .filter(
                      (key) =>
                        key !== FILTER_KEYS.PAGE &&
                        key !== FILTER_KEYS.OLDEST_FIRST &&
                        key !== 'mySubmissions' &&
                        key !== 'myChallenges',
                    )
                    .map((key) =>
                      filterLabelLight[key] ? (
                        <StyledTag
                          key={key}
                          checked={!!queryOptions[key]}
                          onChange={(checked) => {
                            const newQueryStr = updateLightFilter({
                              prevQuery: search,
                              filter: key,
                              checked,
                            })
                            navigate({
                              search: newQueryStr,
                            })
                          }}
                        >
                          {filterLabelLight[key]}
                        </StyledTag>
                      ) : null,
                    )}
                </StyledFilters>
                <ToolbarMeta>
                  {visibleItems?.length ?? 0}/{itemCount || 0} shown
                </ToolbarMeta>
                <ViewModeToggle viewMode={viewMode} onChange={setViewMode} />
                <StyledSelect
                  defaultValue={oldestFirst ? 'oldestFirst' : 'newestFirst'}
                  onChange={(val) => {
                    const newQueryStr = updateLightFilter({
                      prevQuery: search,
                      filter: 'oldestFirst',
                      checked: val === 'oldestFirst',
                    })
                    navigate({
                      search: newQueryStr,
                    })
                  }}
                >
                  <Select.Option value="newestFirst">Newest</Select.Option>
                  <Select.Option value="oldestFirst">Oldest</Select.Option>
                </StyledSelect>
              </FiltersContainer>
              <StyledGrid id="items-grid-view" $viewMode={viewMode}>
                {visibleItems
                  ? visibleItems.map((item, i) => (
                      <ItemCard
                        item={item}
                        key={i}
                        metaEvidence={metaEvidence}
                        chainId={chainId ?? undefined}
                        tcrAddress={tcrAddress}
                        challengePeriodDuration={challengePeriodDuration}
                        timestamp={timestamp}
                        forceReveal={!nsfwFilterOn}
                        viewMode={viewMode}
                      />
                    ))
                  : Array.from({ length: 8 }).map((_, i) => (
                      <Card key={i} style={{ height: '100%' }} loading />
                    ))}
              </StyledGrid>
              <StyledPagination
                total={itemCount || 0}
                current={Number(queryOptions.page)}
                itemRender={pagingItem}
                pageSize={ITEMS_PER_PAGE}
                onChange={(newPage) => {
                  navigate({
                    search: /page=\d+/g.test(search)
                      ? search.replace(/page=\d+/g, `page=${newPage}`)
                      : `${search}&page=${newPage}`,
                  })
                }}
              />
            </>
          </Spin>
        </StyledContent>
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
      </StyledLayoutContent>
    </>
  )
}

export default Items
