/* eslint-disable no-unused-vars */
import React, {
  useEffect,
  useState,
  useContext,
  useMemo,
  useCallback,
} from 'react'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import {
  Card,
  Layout,
  Spin,
  Pagination,
  Tag,
  Select,
  Switch,
} from 'components/ui'
import { useNavigate, useParams } from 'react-router-dom'
import useUrlChainId from 'hooks/use-url-chain-id'
import { BigNumber } from 'ethers'
import localforage from 'localforage'
import { useQuery } from '@tanstack/react-query'
import { STALE_TIME } from 'consts'
import ErrorPage from '../error-page'
import { WalletContext } from 'contexts/wallet-context'
import { LightTCRViewContext } from 'contexts/light-tcr-view-context'
import SubmitModal from '../light-item-details/modals/submit'
import SubmitConnectModal from '../light-item-details/modals/submit-connect'
import {
  filterLabelLight,
  LIGHT_FILTER_KEYS,
  searchStrToFilterObjLight,
  updateLightFilter,
} from 'utils/filters'
import ItemCard from './item-card'
import Banner from './banner'
import { DISPUTE_STATUS } from 'utils/item-status'
import { LIGHT_ITEMS_QUERY } from 'utils/graphql'
import { parseIpfs } from 'utils/ipfs-parse'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import useSeerMarketsData from 'components/custom-registries/seer/use-seer-markets-data'
import { isSeerRegistry } from 'components/custom-registries/seer/is-seer-registry'
import RegistryInfoPanel from 'components/curate/registry-info-panel'
import ETHAmount from 'components/eth-amount'
import { NETWORKS_INFO } from 'config/networks'
import { getListOfListsAddresses } from 'config/list-of-lists'
import humanizeDuration from 'humanize-duration'
import { CurateIcon } from 'components/curate/icons'
import {
  ToolbarMeta,
  ToolbarSearch,
  ToolbarSearchInput,
  V2RegistryViewMode,
  ViewModeToggle,
  itemMatchesSearch,
} from 'components/curate/v2-registry-toolbar'

export const NSFW_FILTER_KEY = 'NSFW_FILTER_KEY'

export const StyledTopPadding = styled.div`
  padding-top: 24px;
  display: flex;
`

export const StyledContent = styled(Layout.Content)`
  word-break: break-word;
`

export const StyledLayoutContent = styled.div`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 var(--horizontal-padding) 56px;
  display: flex;
  flex-direction: column;
`

export const FiltersContainer = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
  padding: 16px 0;
  border-bottom: 1px solid var(--klerosUIComponentsStroke);
  background: transparent;

  ${smallScreenStyle(
    () => css`
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    `,
  )}
`

export const StyledFilters = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  flex: 1;
`

export const StyledSelect = styled(Select)`
  width: 120px;
  margin-left: auto;
  flex-shrink: 0;

  .ui-select-selector {
    min-height: 36px;
  }

  ${smallScreenStyle(
    () => css`
      &.ui-select {
        margin-left: 0;
      }
    `,
  )}
`

export const StyledTag = styled(Tag.CheckableTag)`
  cursor: pointer;
  transition: all 0.2s ease !important;

  &.ui-tag-checkable {
    background-color: ${({ theme, checked }) =>
      checked ? theme.curateLiveSoft : 'transparent'} !important;
    border: 1px solid
      ${({ theme, checked }) =>
        checked ? theme.primaryColor : theme.borderColor} !important;
    color: ${({ theme, checked }) =>
      checked ? theme.primaryColor : theme.textSecondary} !important;
    height: 32px;
    line-height: 30px;
    border-radius: 3px;
    font-weight: 600;
    cursor: pointer;
  }

  &.ui-tag-checkable:hover {
    color: ${({ theme }) => theme.primaryColor} !important;
    border-color: ${({ theme }) => theme.primaryColor} !important;
    cursor: pointer;
  }

  &.ui-tag-checkable-checked {
    background-color: var(--klerosUIComponentsMediumBlue) !important;
    border-color: var(--klerosUIComponentsPrimaryBlue) !important;
    color: var(--klerosUIComponentsPrimaryBlue) !important;
  }
`

export const StyledPagination = styled(Pagination)`
  justify-content: flex-end;
  display: flex;
  flex-wrap: wrap;
  margin-top: 2em;
`

export const StyledGrid = styled.div<{ $viewMode?: V2RegistryViewMode }>`
  display: ${({ $viewMode }) => ($viewMode === 'grid' ? 'grid' : 'flex')};
  grid-template-columns: ${({ $viewMode }) =>
    $viewMode === 'grid' ? 'repeat(auto-fill, minmax(246px, 1fr))' : 'none'};
  flex-direction: column;
  margin: 24px 0;
  gap: ${({ $viewMode }) => ($viewMode === 'grid' ? '24px' : '8px')};
`

export const StyledSwitch = styled(Switch)`
  &.ui-switch-checked {
    background-color: ${({ theme }) => theme.buttonSecondaryBg};
    margin-right: 8px;
  }

  &.ui-switch {
    margin-right: 8px;
  }
`

export const pagingItem = (_, type, originalElement) => {
  if (type === 'prev') return <span>Previous</span>
  if (type === 'next') return <span>Next</span>
  return originalElement
}

export const ITEMS_PER_PAGE = 40

const Items = () => {
  const navigate = useNavigate()
  const { tcrAddress } = useParams()
  const chainId = useUrlChainId()
  const search = window.location.search
  const { timestamp } = useContext(WalletContext)
  const {
    _gtcr,
    metaEvidence,
    challengePeriodDuration,
    tcrError,
    gtcrView,
    connectedTCRAddr,
    submissionDeposit,
    submissionChallengeDeposit,
    removalDeposit,
    removalChallengeDeposit,
    arbitrationCost,
    arbitrator,
    arbitratorExtraData,
    governor,
  } = useContext(LightTCRViewContext)
  const [submissionFormOpen, setSubmissionFormOpen] = useState<
    boolean | undefined
  >()
  const [error, setError] = useState<string | undefined>()
  const queryOptions = searchStrToFilterObjLight(search)
  const [nsfwFilterOn, setNSFWFilter] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [viewMode, setViewMode] = useState<V2RegistryViewMode>('list')
  const [queryItemParams, setQueryItemParams] = useState<
    Record<string, unknown> | undefined
  >()
  const toggleNSFWFilter = useCallback((checked) => {
    setNSFWFilter(checked)
    localforage.setItem(NSFW_FILTER_KEY, checked)
  }, [])
  const [decodedItems, setDecodedItems] = useState(undefined)
  const seerMarketsData = useSeerMarketsData(chainId, tcrAddress, decodedItems)
  const { graphqlBatcher } = useGraphqlBatcher()

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
      return { registry_id: { _eq: tcrAddress.toLowerCase() } }

    // Single filter - no need for _or
    if (conditions.length === 1)
      return {
        registry_id: { _eq: tcrAddress.toLowerCase() },
        ...conditions[0],
      }

    // Multiple filters - use _or clause
    return {
      registry_id: { _eq: tcrAddress.toLowerCase() },
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
      registryId: tcrAddress.toLowerCase(),
    }),
    [page, orderDirection, itemsWhere, tcrAddress],
  )

  const itemsQuery = useQuery({
    queryKey: ['lightItems', queryVariables],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: LIGHT_ITEMS_QUERY,
        variables: queryVariables,
        chainId: chainId!,
      }),
    enabled: !!chainId,
    staleTime: STALE_TIME,
  })

  const itemCount = useMemo(() => {
    if (!itemsQuery.data) return 0
    const r = itemsQuery.data.lregistry

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
    itemsQuery.data,
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

    const addDecodedFields = (items) =>
      items.map((item) => ({
        ...item,
        decodedData: item.props?.map(({ value }) => value) || [],
        mergedData: item.props || [],
      }))

    const transformItems = (items) =>
      items.map((item) => {
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
          data,
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
    const itemsWithDecoded = addDecodedFields(data.litems)
    setDecodedItems(transformItems(itemsWithDecoded))

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
                const mergedData = item.columns.map((column) => ({
                  label: column.label,
                  description: column.description,
                  type: column.type,
                  isIdentifier: column.isIdentifier,
                  value: item.values[column.label],
                }))
                const decodedData = mergedData.map((d) => d.value)
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
        setDecodedItems(transformItems(patched))
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

  // More data wrangling/bandaid to deal with legacy code.
  // Most of this should be refactored or even better, deleted.
  const items = useMemo(() => {
    if (!metaEvidence || metaEvidence.address !== tcrAddress || !decodedItems)
      return

    return decodedItems.map((item, i) => {
      let decodedData
      const errors = []
      const { columns } = metaEvidence.metadata
      try {
        decodedData = item.decodedData
        // eslint-disable-next-line no-unused-vars
      } catch (err) {
        errors.push(
          `Error decoding item ${item.itemID} of list at ${tcrAddress}`,
        )
        console.warn(
          `Error decoding item ${item.itemID} of list at ${tcrAddress}`,
        )
        console.warn(err)
      }

      // Return the item columns along with its TCR status data.
      return {
        tcrData: {
          ...item, // Spread to convert from array to object.
          decodedData,
        },
        columns: columns.map(
          (col, i) => ({
            value: decodedData && decodedData[i],
            ...col,
          }),
          { key: i },
        ),
        errors,
        seerMarketData:
          isSeerRegistry(tcrAddress, chainId) &&
          item?.decodedData?.length > 1 &&
          seerMarketsData[item.decodedData[1].toLowerCase()],
      }
    })
  }, [metaEvidence, tcrAddress, decodedItems, chainId, seerMarketsData])

  const visibleItems = useMemo(() => {
    if (!items) return

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

  if (!tcrAddress)
    return (
      <ErrorPage
        code="404"
        message="The gods are having trouble finding this list."
        tip="Make sure your wallet is set to the correct network (is this on Gnosis Chain?)."
      />
    )

  if (tcrError || error)
    return (
      <ErrorPage
        code="400"
        message={tcrError || error || 'Decoding this item.'}
      />
    )

  const { metadata } = metaEvidence || {}
  const { isConnectedTCR } = metadata || {}
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
  const registryStats = itemsQuery.data?.lregistry
  const totalRegistryItems = registryStats
    ? Number(registryStats.numberOfAbsent) +
      Number(registryStats.numberOfRegistered) +
      Number(registryStats.numberOfRegistrationRequested) +
      Number(registryStats.numberOfClearingRequested) +
      Number(registryStats.numberOfChallengedRegistrations) +
      Number(registryStats.numberOfChallengedClearing)
    : undefined
  const totalRegistryDisputes = registryStats
    ? Number(registryStats.numberOfChallengedRegistrations) +
      Number(registryStats.numberOfChallengedClearing)
    : undefined

  return (
    <>
      <Banner
        metaEvidence={metaEvidence}
        setSubmissionFormOpen={setSubmissionFormOpen}
        connectedTCRAddr={connectedTCRAddr}
        tcrAddress={tcrAddress}
      />
      <RegistryInfoPanel
        chainId={chainId}
        address={tcrAddress}
        verified={verifiedSource}
        fields={[
          {
            label: 'Total items',
            icon: 'registry',
            value:
              totalRegistryItems !== undefined
                ? String(totalRegistryItems)
                : undefined,
          },
          {
            label: 'Removed items',
            icon: 'remove',
            value: registryStats?.numberOfAbsent,
          },
          {
            label: 'Disputes generated',
            icon: 'dispute',
            value:
              totalRegistryDisputes !== undefined
                ? String(totalRegistryDisputes)
                : undefined,
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
                        key !== LIGHT_FILTER_KEYS.PAGE &&
                        key !== LIGHT_FILTER_KEYS.OLDEST_FIRST &&
                        key !== 'mySubmissions' &&
                        key !== 'myChallenges',
                    )
                    .map((key) =>
                      filterLabelLight[key] ? (
                        <StyledTag
                          key={key}
                          checked={queryOptions[key]}
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
                        chainId={chainId}
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
