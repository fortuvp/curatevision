import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import useStoredLayout from 'hooks/use-stored-layout'
import {
  ButtonLink,
  Page,
  Surface,
  truncateMiddle,
} from 'components/curate/primitives'
import { reveal } from 'components/curate/motion/reveal'
import { ZERO_ADDRESS, normalizeAddress } from 'pages/dashboard/data'
import {
  ACTIVITY_LIMIT,
  SUPPORTED_CHAIN_IDS,
  buildBadges,
  chainName,
  emptyStats,
  fetchAddressProfileData,
  type AddressProfileData,
  type AddressStats,
} from './data'
import { GovernancePanel } from './governance'
import {
  PAGE_SIZE,
  activeChains,
  filterActivities,
  inScope,
  parseFilter,
  parseScope,
  type ActivityFilter,
} from './view'
import { ProfilePanel } from './profile'
import { ActivitySection } from './activity'
import { QuietState } from './parts'

/*
 * Curator profile (/address/:address): who this address is on Curate. One
 * featured panel leads with the entries it submitted, its other counts, its
 * requests and challenges over time and its challenge record; its actions
 * follow as rows, then the lists it governs. Every number comes from the
 * profile data and describes the chosen scope (all chains or one, ?chain=);
 * nothing the data layer lacks (rewards, entry status) is shown.
 */

const Governed = styled.div`
  ${reveal}
`

const AddressPage = () => {
  const params = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const address = normalizeAddress(params.address)
  const validAddress = isAddress(address)
  const isZero = address === ZERO_ADDRESS
  const filter = parseFilter(searchParams.get('show'))
  const scope = parseScope(searchParams.get('chain'))
  const [page, setPage] = useState(1)
  const [layout, setLayout] = useStoredLayout('address', 'rows')
  const now = useNow(30_000)
  const { address: connectedAddress, isConnected } = useAccount()
  const isYou =
    validAddress &&
    isConnected &&
    normalizeAddress(connectedAddress) === address

  useDocumentHead(
    validAddress
      ? `Curator ${truncateMiddle(address)} · Kleros Curate`
      : 'Curator profile · Kleros Curate',
    validAddress
      ? `Submissions, removals, challenges and governed lists of ${address} across Kleros Curate registries.`
      : 'Curator profiles across Kleros Curate registries: submissions, removals, challenges and governed lists.',
  )

  const query = useQuery({
    queryKey: ['addressProfile', address],
    queryFn: () => fetchAddressProfileData(address),
    enabled: validAddress,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
  const data: AddressProfileData | undefined = query.data
  // isPending is false once the query errors, so the error state can render.
  const loading = validAddress && query.isPending

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
  }
  const setFilter = (value: ActivityFilter) => setParam('show', value, 'all')
  const setScope = (value: string) => setParam('chain', value, 'all')

  useEffect(() => {
    setPage(1)
  }, [filter, scope, address])

  const chains = useMemo(() => activeChains(data?.chainBreakdown), [data])
  const activities = useMemo(
    () =>
      (data?.activities ?? []).filter((activity) =>
        inScope(scope, activity.chainId),
      ),
    [data, scope],
  )
  const shown = useMemo(
    () => filterActivities(activities, filter),
    [activities, filter],
  )
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = shown.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const stats: AddressStats | undefined = data
    ? scope === 'all'
      ? data.stats
      : (data.chainBreakdown[scope] ?? emptyStats())
    : undefined
  const badges = data
    ? scope === 'all'
      ? data.badges
      : buildBadges(stats ?? emptyStats())
    : undefined
  const listed = data?.activities.length ?? 0
  const complete = listed < ACTIVITY_LIMIT
  const capped = (data?.cappedChains ?? []).filter((chainId) =>
    inScope(scope, chainId),
  )
  // A quiet scope says so once, in the profile panel; no empty list below.
  const quiet = !loading && !query.isError && activities.length === 0
  const chainList =
    scope === 'all'
      ? SUPPORTED_CHAIN_IDS.map(chainName).join(', ')
      : chainName(scope)

  if (!validAddress)
    return (
      <Page>
        <Surface $padding="none">
          <QuietState
            icon="user"
            title="Not an address"
            action={
              <ButtonLink to="/browse" $variant="secondary" $size="sm">
                Browse registries
              </ButtonLink>
            }
          >
            A profile lives at /address followed by a 0x address of 40 hex
            characters.
          </QuietState>
        </Surface>
      </Page>
    )

  return (
    <Page>
      <ProfilePanel
        address={address}
        isYou={isYou}
        isZero={isZero}
        loading={loading}
        error={query.isError}
        onRetry={() => query.refetch()}
        generatedAt={data?.generatedAt}
        scope={scope}
        onScope={setScope}
        chains={chains}
        stats={stats}
        activities={activities}
        complete={complete}
        listed={listed}
        capped={capped}
        now={now}
      />

      {!query.isError && !quiet && (
        <ActivitySection
          address={address}
          loading={loading}
          activities={activities}
          shown={shown}
          visible={visible}
          filter={filter}
          onFilter={setFilter}
          page={currentPage}
          onPage={setPage}
          layout={layout}
          onLayout={setLayout}
          badges={badges}
          badgeScope={scope === 'all' ? 'All chains' : chainName(scope)}
          truncated={!complete}
          chainList={chainList}
          now={now}
        />
      )}

      {!query.isError && (
        <Governed style={{ ['--i' as string]: 4 }}>
          <GovernancePanel
            registries={(data?.governedRegistries ?? []).filter((registry) =>
              inScope(scope, registry.chainId),
            )}
            profileAddress={address}
            loading={loading}
            isZero={isZero}
          />
        </Governed>
      )}
    </Page>
  )
}

export default AddressPage
