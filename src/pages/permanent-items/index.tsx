// fetch registry data (you need to know about the period cooldown)
// fetch items according to selected filter
// assign NSFW and render everything as usual

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
import localforage from 'localforage'
import { useQuery } from '@tanstack/react-query'
import { STALE_TIME } from 'consts'
import ErrorPage from '../error-page'
import { WalletContext } from 'contexts/wallet-context'
import SubmitModal from '../permanent-item-details/modals/submit'
import {
  filterLabelPermanent,
  LIGHT_FILTER_KEYS,
  searchStrToFilterObjPermanent,
  updateLightFilter,
} from 'utils/filters'
import ItemCard from './item-card'
import Banner from './banner'
import { PERMANENT_ITEMS_QUERY, PERMANENT_REGISTRY_QUERY } from 'utils/graphql'
import { parseIpfs } from 'utils/ipfs-parse'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import useArbitrationCost from 'hooks/arbitration-cost'
import useTokenSymbol from 'hooks/token-symbol'
import useNativeCurrency from 'hooks/native-currency'
import { useEthersProvider } from 'hooks/ethers-adapters'
import RegistryInfoPanel from 'components/curate/registry-info-panel'
import ETHAmount from 'components/eth-amount'
import TokenAmount from 'components/token-amount'
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
  margin-top: 24px;
  width: 100%;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius-sm);
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.055),
      rgba(255, 255, 255, 0.025)
    ),
    var(--curate-surface);
  box-shadow: var(--curate-shadow);

  ${smallScreenStyle(
    () => css`
      flex-direction: column;
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
      checked
        ? 'rgba(76, 201, 240, 0.13)'
        : theme.name === 'dark'
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(255, 255, 255, 0.62)'} !important;
    border: 1px solid
      ${({ theme, checked }) =>
        checked
          ? 'var(--curate-border-strong)'
          : theme.filterBorderColor} !important;
    color: ${({ theme, checked }) =>
      checked ? 'var(--curate-text)' : theme.filterTextColor} !important;
    height: 32px;
    line-height: 30px;
    border-radius: 999px;
    font-weight: 750;
    cursor: pointer;
  }

  &.ui-tag-checkable:hover {
    color: ${({ theme, checked }) =>
      checked ? theme.textOnPrimary || '#fff' : theme.textPrimary} !important;
    border-color: ${({ theme, checked }) =>
      checked ? theme.primaryColorHover : theme.textPrimary} !important;
    cursor: pointer;
  }
`

export const StyledPagination = styled(Pagination)`
  justify-content: flex-end;
  display: flex;
  flex-wrap: wrap;
  margin-top: 2em;
`

export const StyledGrid = styled.div`
  display: flex;
  flex-direction: column;
  margin: 24px 0;
  gap: 8px;
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
  const [submissionFormOpen, setSubmissionFormOpen] = useState<
    boolean | undefined
  >()
  const [_error, _setError] = useState<string | undefined>()
  const [columns, setColumns] = useState<Column[] | undefined>()
  const queryOptions = searchStrToFilterObjPermanent(search)
  const [nsfwFilterOn, setNSFWFilter] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [viewMode, setViewMode] = useState<V2RegistryViewMode>('list')
  const [queryItemParams, _setQueryItemParams] = useState<
    Record<string, unknown> | undefined
  >()
  const toggleNSFWFilter = useCallback((checked) => {
    setNSFWFilter(checked)
    localforage.setItem(NSFW_FILTER_KEY, checked)
  }, [])
  const library = useEthersProvider({
    chainId: chainId ? Number(chainId) : undefined,
  })
  const { graphqlBatcher } = useGraphqlBatcher()

  // get registry data first, you need some variables from here to query the items.
  const registryQuery = useQuery({
    queryKey: ['permanentRegistry', tcrAddress, chainId],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: PERMANENT_REGISTRY_QUERY,
        variables: { lowerCaseTCRAddress: tcrAddress.toLowerCase() },
        chainId: chainId!,
        isPermanent: true,
      }),
    enabled: !!chainId,
    staleTime: Infinity,
  })

  const { oldestFirst, page, absent, registered, disputed } = queryOptions

  const itemsWhere = useMemo(() => {
    // Build status array for multi-select support
    const statuses = []

    if (absent) statuses.push('Absent')
    if (registered) {
      statuses.push('Submitted')
      statuses.push('Reincluded')
    }
    if (disputed) statuses.push('Disputed')

    // No filters selected - return all items
    if (statuses.length === 0) return { registry: tcrAddress.toLowerCase() }

    // Use status_in for filtering (handles both single and multi-select)
    return {
      registry: tcrAddress.toLowerCase(),
      status_in: statuses,
    }
  }, [absent, registered, disputed, tcrAddress])

  const orderDirection = oldestFirst ? 'asc' : 'desc'

  const itemsVariables = useMemo(
    () => ({
      skip: (Number(page) - 1) * ITEMS_PER_PAGE,
      first: ITEMS_PER_PAGE,
      orderDirection: orderDirection,
      where: itemsWhere,
    }),
    [page, orderDirection, itemsWhere],
  )

  const itemsQuery = useQuery({
    queryKey: ['permanentItems', itemsVariables],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: PERMANENT_ITEMS_QUERY,
        variables: itemsVariables,
        chainId: chainId!,
        isPermanent: true,
      }),
    enabled: !!registryQuery.data && !registryQuery.isLoading && !!chainId,
    staleTime: STALE_TIME,
  })

  const itemCount = useMemo(() => {
    if (!registryQuery.data || !itemsQuery.data || !registryQuery.data.registry)
      return 0
    const r = registryQuery.data.registry

    // Count selected filters and sum their counts
    const hasAnyFilter = absent || registered || disputed

    if (!hasAnyFilter)
      // No filters - return total count
      return (
        Number(r.numberOfAbsent) +
        Number(r.numberOfSubmitted) +
        Number(r.numberOfDisputed)
      )

    // Sum counts for selected filters
    let sum = 0
    if (absent) sum += Number(r.numberOfAbsent)
    if (registered) sum += Number(r.numberOfSubmitted)
    if (disputed) sum += Number(r.numberOfDisputed)

    return sum
  }, [absent, registered, disputed, registryQuery.data, itemsQuery.data])

  // Load NSFW user setting from localforage.
  useEffect(() => {
    ;(async () => {
      const savedSetting = await localforage.getItem(NSFW_FILTER_KEY)
      if (typeof savedSetting === 'boolean') setNSFWFilter(savedSetting)
    })()
  }, [])

  // The graphql batcher resolves failed requests to {}, so guard against
  // a truthy result that has no items field.
  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data])
  const visibleItems = useMemo(
    () => items.filter((item) => itemMatchesSearch(item, itemSearch)),
    [itemSearch, items],
  )

  useEffect(() => {
    if (!registryQuery.data || !registryQuery.data.registry) return
    ;(async () => {
      const arbSetting = registryQuery.data.registry.arbitrationSettings[0]
      const response = await fetch(parseIpfs(arbSetting.metaEvidenceURI))
      const file = await response.json()
      setColumns(file.metadata.columns) // btw we do this because thegraph doesnt have it... would be nice
    })()
  }, [registryQuery.data])

  const arbitrationCost = useArbitrationCost({
    address: registryQuery.data?.registry?.arbitrator?.id,
    arbitratorExtraData:
      registryQuery.data?.registry?.arbitrationSettings?.[0]
        ?.arbitratorExtraData,
    library,
  })
  const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenSymbol(
    registryQuery.data?.registry?.token,
  )
  const nativeCurrency = useNativeCurrency()

  // provisional early return
  if (!registryQuery.data) return null

  const r = registryQuery.data.registry
  const metadata = r?.arbitrationSettings?.[0]?.metadata
  const tokenDepositUnit = tokenSymbol ? ` ${tokenSymbol}` : ''
  const nativeDepositUnit = nativeCurrency ? ` ${nativeCurrency}` : ''
  const tokenDepositValue = (amount: unknown) =>
    amount ? (
      <TokenAmount
        amount={amount as string}
        tokenDecimals={tokenDecimals}
        precision={3}
        displayUnit={tokenDepositUnit}
      />
    ) : undefined
  const nativeDepositValue = (amount: unknown) =>
    amount ? (
      <ETHAmount
        amount={amount as string}
        decimals={18}
        displayUnit={nativeDepositUnit}
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
  const totalRegistryItems =
    Number(r?.numberOfSubmitted ?? 0) +
    Number(r?.numberOfAbsent ?? 0) +
    Number(r?.numberOfDisputed ?? 0)

  if (!r)
    return (
      <ErrorPage
        code="404"
        message="The gods are having trouble finding this list."
        tip="Make sure your wallet is set to the correct network (is this on Gnosis Chain?)."
      />
    )

  return (
    <>
      <Banner
        metadata={metadata}
        setSubmissionFormOpen={setSubmissionFormOpen}
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
            value: String(totalRegistryItems),
          },
          {
            label: 'Removed items',
            icon: 'remove',
            value: r.numberOfAbsent,
          },
          {
            label: 'Disputes generated',
            icon: 'dispute',
            value: r.numberOfDisputed,
          },
          {
            label: 'Submission minimum',
            icon: 'submit',
            value: tokenDepositValue(r.submissionMinDeposit),
            hint: 'Minimum bounty required for permanent submissions.',
          },
          {
            label: 'Submission period',
            icon: 'activity',
            value: periodValue(r.submissionPeriod),
          },
          {
            label: 'Withdrawing period',
            icon: 'remove',
            value: periodValue(r.withdrawingPeriod),
          },
          {
            label: 'Reinclusion period',
            icon: 'challenge',
            value: periodValue(r.reinclusionPeriod),
          },
          {
            label: 'Arbitration fee',
            icon: 'court',
            value: arbitrationCost.arbitrationCost
              ? nativeDepositValue(arbitrationCost.arbitrationCost)
              : undefined,
            hint: 'Arbitration fees are paid up front to open or continue a dispute. They are reimbursed to the side that wins, so parties acting in good faith should not ultimately bear them.',
          },
          {
            label: 'Arbitrator',
            icon: 'court',
            value: r.arbitrator?.id,
            hint: r.arbitrationSettings?.[0]?.arbitratorExtraData
              ? `Extra data ${r.arbitrationSettings[0].arbitratorExtraData.slice(
                  0,
                  18,
                )}...`
              : undefined,
          },
          {
            label: 'Submitted',
            icon: 'registry',
            value: r.numberOfSubmitted,
          },
          {
            label: 'Disputed',
            icon: 'dispute',
            value: r.numberOfDisputed,
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
                        key !== LIGHT_FILTER_KEYS.OLDEST_FIRST,
                      // &&
                      // key !== 'mySubmissions' &&
                      // key !== 'myChallenges'
                    )
                    .map((key) =>
                      filterLabelPermanent[key] ? (
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
                          {filterLabelPermanent[key]}
                        </StyledTag>
                      ) : null,
                    )}
                </StyledFilters>
                <ToolbarMeta>
                  {visibleItems.length}/{itemCount || 0} shown
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
                {visibleItems.length === 0 && !itemsQuery.data
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <Card key={i} style={{ height: '100%' }} loading />
                    ))
                  : visibleItems.map((item, _i) => (
                      <ItemCard
                        item={item}
                        columns={columns}
                        key={item.itemID}
                        metadata={metadata}
                        chainId={chainId}
                        tcrAddress={tcrAddress}
                        registry={r}
                        timestamp={timestamp}
                        forceReveal={!nsfwFilterOn}
                        tokenSymbol={tokenSymbol}
                        viewMode={viewMode}
                      />
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
        {metadata && columns && arbitrationCost.arbitrationCost && (
          <>
            <SubmitModal
              visible={submissionFormOpen}
              onCancel={() => setSubmissionFormOpen(false)}
              submissionDeposit={r.submissionMinDeposit}
              submissionPeriod={r.submissionPeriod}
              arbitrationCost={arbitrationCost.arbitrationCost}
              withdrawingPeriod={r.withdrawingPeriod}
              tcrAddress={tcrAddress}
              tokenAddress={r.token}
              metadata={metadata}
              columns={columns}
              initialValues={queryItemParams}
            />
          </>
        )}
      </StyledLayoutContent>
    </>
  )
}

export default Items
