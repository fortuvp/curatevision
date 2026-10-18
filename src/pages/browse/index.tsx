import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import useStoredLayout, { LAYOUT_OPTIONS } from 'hooks/use-stored-layout'
import { formatAgo } from 'utils/time'
import ChainLogo from 'components/chain-logo'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonLink,
  ChainChip,
  Chip,
  ChipButton,
  Data,
  EmptyState,
  Figure,
  Grid,
  Label,
  ListRow,
  Page,
  PanelHeader,
  PanelTitle,
  Row,
  SearchField,
  Section,
  SegmentedControl,
  SkeletonBlock,
  Small,
  SplitGrid,
  Stack,
  Statement,
  StatusDot,
  Surface,
  Table,
  TableScroller,
  truncateMiddle,
} from 'components/curate/primitives'
import { Pagination } from 'components/ui'
import { fetchDashboardData } from 'pages/dashboard/data'
import {
  applyCreationTimes,
  fetchRegistryCreationTimes,
} from 'utils/registry-creation'
import type { DashboardRegistry } from 'pages/dashboard/types'
import {
  KIND_OPTIONS,
  PAGE_SIZE,
  SORT_OPTIONS,
  SUPPORTED_CHAIN_IDS,
  VERIFICATION_CHAIN_IDS,
  activityTone,
  chainName,
  filterRegistries,
  kindLabel,
  mediaUrl,
  parseChains,
  parseKinds,
  parsePage,
  parseSort,
  parseTrust,
  pendingLabel,
  registryHref,
  sortRegistries,
  summarize,
  toggleKind,
  verificationHref,
  type TrustMode,
} from './view'

/*
 * Browse (/browse): every registry the indexers know, across chains. A short
 * statement on what registries are, figures for the chosen chain scope, then
 * the explorer: search, trust, type toggles and sort, a remembered table /
 * cards / rows layout and pagination. The chain is chosen in the app bar
 * through ?chain. Every figure is read from the data; nothing here is
 * invented.
 */

const integer = new Intl.NumberFormat('en-US')
const formatInt = (value: number) => integer.format(Math.round(value))

/* ---------- Hero ---------- */

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(300px, 0.8fr);
  gap: 32px;
  align-items: center;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const FiguresGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px 16px;
`

const FigureCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

/* ---------- Explorer ---------- */

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
`

const ToolbarSearch = styled(SearchField)`
  flex: 1 1 260px;
`

const KindChips = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
`

const SortField = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-muted);
  transition: border-color var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus-within {
    border-color: var(--color-primary);
  }

  select {
    height: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-text);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
    font-weight: 500;
    cursor: pointer;
  }
`

const Notice = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-raised);
`

const Logo = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-raised);
  color: var(--color-faint);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const RegistryCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const TextCell = styled.div`
  min-width: 0;
`

const RegistryName = styled(Link)`
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary);
  }
`

const RegistryTitle = styled.span`
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 180px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--motion),
    box-shadow var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-card-hover);
  }
`

const CardDescription = styled.p`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin: 0;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const CardStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
`

const PaddedStack = styled(Stack)`
  padding: 16px;
`

const FlushScroller = styled(TableScroller)`
  border: 0;
  border-radius: 0;
`

const CardGrid = styled(Grid)`
  padding: 16px;
`

const RowsShell = styled.div`
  display: flex;
  flex-direction: column;
`

/* On a phone the counts flow to a second line instead of disappearing. */
const RegistryRow = styled(ListRow)`
  @media (max-width: 600px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
`

const RowDescription = styled.div`
  overflow: hidden;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RowRight = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
`

const StatPair = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
`

/* ---------- Rail ---------- */

const ActivityItem = styled(Link)`
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  color: inherit;
  text-decoration: none;

  &:last-child {
    border-bottom: 0;
  }

  &:hover > span:nth-child(2) {
    color: var(--color-primary);
  }
`

const ActivityCopy = styled.span`
  min-width: 0;
`

const ActivityTitle = styled.span`
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ---------- Pieces ---------- */

/** Registry logo from its metadata, falling back to the registry icon. */
const RegistryLogo = ({ registry }: { registry: DashboardRegistry }) => {
  const [failed, setFailed] = useState(false)
  const image = mediaUrl(registry.logoURI)
  return (
    <Logo aria-hidden>
      {image && !failed ? (
        <img src={image} alt="" onError={() => setFailed(true)} />
      ) : (
        <CurateIcon name="registry" size={16} />
      )}
    </Logo>
  )
}

const TrustChip = ({ registry }: { registry: DashboardRegistry }) =>
  registry.trustStatus === 'verified' ? (
    <Chip title="Listed on the Kleros Verified list of lists for this chain">
      <StatusDot $tone="registered" aria-hidden /> Verified
    </Chip>
  ) : (
    <Chip title="Not on the Kleros Verified list of lists for this chain">
      Discovery
    </Chip>
  )

/** A count with its unit, for rows and for table cells whose meaning differs per kind. */
const Stat = ({
  value,
  label,
  title,
}: {
  value: number
  label: string
  title?: string
}) => (
  <StatPair title={title}>
    <Data>{formatInt(value)}</Data>
    <Small $faint>{label}</Small>
  </StatPair>
)

const STAKE_PENDING_TITLE =
  'Stake lists report the entries currently listed, not open requests'

const Counts = ({ registry }: { registry: DashboardRegistry }) => (
  <CardStats>
    <FigureCell>
      <Data>{formatInt(registry.itemCount)}</Data>
      <Label $tone="faint">Entries</Label>
    </FigureCell>
    <FigureCell>
      <Data>{formatInt(registry.pendingCount)}</Data>
      <Label $tone="faint">{pendingLabel(registry.kind)}</Label>
    </FigureCell>
    <FigureCell>
      <Data>{formatInt(registry.disputeCount)}</Data>
      <Label $tone="faint">In court</Label>
    </FigureCell>
  </CardStats>
)

/* ---------- Page ---------- */

const BrowsePage = () => {
  useDocumentHead(
    'Browse registries | Kleros Curate',
    'Browse Kleros Verified and discovery Curate registries across Ethereum, Gnosis and Sepolia.',
  )
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const chainParam = searchParams.get('chain')
  const chains = useMemo(() => parseChains(chainParam), [chainParam])
  const trust = parseTrust(searchParams.get('trust'))
  const kindParam = searchParams.get('kind')
  const kinds = useMemo(() => parseKinds(kindParam), [kindParam])
  const sort = parseSort(searchParams.get('sort'))
  const search = searchParams.get('q') || ''
  const requestedPage = parsePage(searchParams.get('page'))
  const [layout, setLayout] = useStoredLayout('browse', 'table')
  const now = useNow(30_000)

  const query = useQuery({
    queryKey: ['curateDashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const data = query.data

  // Real creation blocks (factory NewGTCR events), cached once read. Until
  // they arrive the dashboard data already carries whatever was cached.
  const creation = useQuery({
    queryKey: ['registryCreationTimes'],
    queryFn: () => fetchRegistryCreationTimes(SUPPORTED_CHAIN_IDS),
    staleTime: 10 * 60_000,
  })

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setSearchParams(next, { replace: true })
  }

  // Any filter change returns to the first page, including changes made
  // elsewhere (the app bar's chain chip, back and forward navigation).
  const filterKey = `${chainParam ?? ''}|${trust}|${kindParam ?? ''}|${sort}|${search}`
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    if (!searchParams.get('page')) return
    const next = new URLSearchParams(searchParams)
    next.delete('page')
    setSearchParams(next, { replace: true })
  }, [filterKey, searchParams, setSearchParams])

  // Old links carried the layout in the URL (?view=list or ?view=cards). The
  // layout is now remembered per device, so adopt it once and drop the param.
  useEffect(() => {
    const view = searchParams.get('view')
    if (view === null) return
    if (view === 'list') setLayout('rows')
    else if (view === 'cards') setLayout('cards')
    const next = new URLSearchParams(searchParams)
    next.delete('view')
    setSearchParams(next, { replace: true })
  }, [searchParams, setLayout, setSearchParams])

  const registries = useMemo(
    () =>
      data
        ? sortRegistries(
            filterRegistries(
              creation.data
                ? applyCreationTimes(data.registries, creation.data)
                : data.registries,
              { chains, trust, kinds, search },
            ),
            sort,
          )
        : [],
    [data, creation.data, chains, trust, kinds, search, sort],
  )
  const pageCount = Math.max(1, Math.ceil(registries.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, pageCount)
  const visible = registries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const figures = useMemo(
    () => summarize(data?.registries ?? [], chains),
    [data, chains],
  )

  const latest = useMemo(
    () =>
      (data?.activities ?? [])
        .filter(
          (activity) =>
            chains.length === 0 || chains.includes(activity.chainId),
        )
        .slice(0, 5),
    [data, chains],
  )

  const verificationChains =
    chains.length === 1 && VERIFICATION_CHAIN_IDS.includes(chains[0])
      ? chains
      : VERIFICATION_CHAIN_IDS
  const scopeLabel =
    chains.length === 0
      ? `${formatInt(SUPPORTED_CHAIN_IDS.length)} chains`
      : chains.map(chainName).join(', ')

  const loading = query.isLoading || (!data && !query.isError)
  const failed = query.isError && !data

  return (
    <Page>
      <Section>
        <Hero>
          <Stack $gap={16}>
            <Label>Registries</Label>
            <Statement>Browse every Curate registry.</Statement>
            <Body $muted $large>
              A registry is an on-chain list with a written policy. Anyone can
              add an entry with a deposit, anyone can challenge it, and Kleros
              jurors settle disputes. Verified registries are listed on the
              Kleros Verified list of lists for their chain; discovery
              registries are every other list the indexers found. Pick a chain
              in the app bar to narrow the scope.
            </Body>
          </Stack>
          <Surface
            as="section"
            $padding="standard"
            aria-label="Registries at a glance"
          >
            <PanelHeader>
              <PanelTitle>At a glance</PanelTitle>
              <Small $faint>{scopeLabel}</Small>
            </PanelHeader>
            {loading ? (
              <SkeletonBlock $height="120px" />
            ) : failed ? (
              <Small $muted>No figures until the indexers answer.</Small>
            ) : (
              <FiguresGrid>
                <FigureCell>
                  <Figure>{formatInt(figures.verified)}</Figure>
                  <Label $tone="faint">Verified registries</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(figures.discovery)}</Figure>
                  <Label $tone="faint">Discovery registries</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(figures.entries)}</Figure>
                  <Label $tone="faint">Entries</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(figures.openRequests)}</Figure>
                  <Label $tone="faint">Open requests</Label>
                </FigureCell>
              </FiguresGrid>
            )}
          </Surface>
        </Hero>
      </Section>

      <Section>
        <SplitGrid $rail={320}>
          <Surface as="section" $padding="none" aria-label="Registry explorer">
            <Toolbar>
              <ToolbarSearch>
                <CurateIcon name="search" size={16} />
                <input
                  aria-label="Search registries"
                  placeholder="Search by name, address, chain or type"
                  value={search}
                  onChange={(event) =>
                    setParam({
                      q: event.currentTarget.value || null,
                      page: null,
                    })
                  }
                />
                {search && (
                  <Button
                    type="button"
                    $variant="ghost"
                    $size="sm"
                    aria-label="Clear search"
                    onClick={() => setParam({ q: null, page: null })}
                  >
                    <CurateIcon name="close" size={14} />
                  </Button>
                )}
              </ToolbarSearch>
              <SegmentedControl<TrustMode>
                ariaLabel="Trust"
                value={trust}
                onChange={(value) =>
                  setParam({
                    trust: value === 'verified' ? null : value,
                    page: null,
                  })
                }
                options={[
                  { value: 'verified', label: 'Verified' },
                  { value: 'unverified', label: 'Discovery' },
                ]}
              />
              <KindChips role="group" aria-label="Registry type">
                {KIND_OPTIONS.map((option) => {
                  const selected = kinds.includes(option.value)
                  return (
                    <ChipButton
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      $selected={selected}
                      onClick={() =>
                        setParam({
                          kind:
                            toggleKind(kinds, option.value).join(',') || null,
                          page: null,
                        })
                      }
                    >
                      {option.label}
                    </ChipButton>
                  )
                })}
              </KindChips>
              <SortField>
                <Label>Sort</Label>
                <select
                  aria-label="Sort registries"
                  value={sort}
                  onChange={(event) =>
                    setParam({
                      sort:
                        event.currentTarget.value === 'recent-submission'
                          ? null
                          : event.currentTarget.value,
                      page: null,
                    })
                  }
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </SortField>
              <SegmentedControl
                ariaLabel="Layout"
                value={layout}
                onChange={setLayout}
                options={LAYOUT_OPTIONS}
              />
            </Toolbar>

            {trust === 'unverified' && (
              <Notice>
                <CurateIcon name="shield" size={16} />
                <Small $muted>
                  Discovery registries are not on the Kleros Verified list of
                  lists. Read a list&apos;s policy before you act on it.
                </Small>
              </Notice>
            )}

            {loading ? (
              <PaddedStack $gap={0}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonBlock key={index} $height="44px" />
                ))}
              </PaddedStack>
            ) : failed ? (
              <EmptyState
                icon="registry"
                title="Registries could not be loaded"
                action={
                  <Button
                    type="button"
                    $variant="secondary"
                    $size="sm"
                    onClick={() => query.refetch()}
                  >
                    Try again
                  </Button>
                }
              >
                The indexers did not answer. Check your connection and try
                again.
              </EmptyState>
            ) : registries.length === 0 ? (
              <EmptyState
                icon="filter"
                title="No registries match"
                action={
                  <Button
                    type="button"
                    $variant="secondary"
                    $size="sm"
                    onClick={() =>
                      setParam({
                        q: null,
                        trust: null,
                        kind: null,
                        chain: null,
                        page: null,
                      })
                    }
                  >
                    Clear filters
                  </Button>
                }
              >
                Change the search, chain, type or trust filter.
              </EmptyState>
            ) : layout === 'table' ? (
              <FlushScroller>
                <Table>
                  <thead>
                    <tr>
                      <th>Registry</th>
                      <th>Chain</th>
                      <th>Trust</th>
                      <th className="num">Entries</th>
                      <th className="num">Open requests</th>
                      <th className="num">In court</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((registry) => (
                      <tr
                        key={registry.id}
                        data-href={registryHref(registry)}
                        onClick={() => navigate(registryHref(registry))}
                      >
                        <td>
                          <RegistryCell>
                            <RegistryLogo registry={registry} />
                            <TextCell>
                              <RegistryName
                                to={registryHref(registry)}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {registry.title}
                              </RegistryName>
                              <Small $faint>
                                {kindLabel(registry.kind)} ·{' '}
                                <Data $muted $weight={400}>
                                  {truncateMiddle(registry.address)}
                                </Data>
                              </Small>
                            </TextCell>
                          </RegistryCell>
                        </td>
                        <td>
                          <ChainChip chainId={registry.chainId} size="sm" />
                        </td>
                        <td>
                          <TrustChip registry={registry} />
                        </td>
                        <td className="num">{formatInt(registry.itemCount)}</td>
                        <td className="num">
                          {registry.kind === 'permanent' ? (
                            <Stat
                              value={registry.pendingCount}
                              label="listed"
                              title={STAKE_PENDING_TITLE}
                            />
                          ) : (
                            formatInt(registry.pendingCount)
                          )}
                        </td>
                        <td className="num">
                          {formatInt(registry.disputeCount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </FlushScroller>
            ) : layout === 'cards' ? (
              <CardGrid $min={260}>
                {visible.map((registry) => (
                  <Card key={registry.id} to={registryHref(registry)}>
                    <Row $gap={10}>
                      <RegistryLogo registry={registry} />
                      <TextCell>
                        <RegistryTitle>{registry.title}</RegistryTitle>
                        <Small $faint>{kindLabel(registry.kind)}</Small>
                      </TextCell>
                    </Row>
                    <CardDescription>
                      {registry.description ||
                        `${kindLabel(registry.kind)} registry at ${truncateMiddle(registry.address)}`}
                    </CardDescription>
                    <Row $gap={6} $wrap>
                      <ChainChip chainId={registry.chainId} size="sm" />
                      <TrustChip registry={registry} />
                    </Row>
                    <Counts registry={registry} />
                  </Card>
                ))}
              </CardGrid>
            ) : (
              <RowsShell>
                {visible.map((registry) => (
                  <RegistryRow key={registry.id} to={registryHref(registry)}>
                    <Row $gap={10}>
                      <RegistryLogo registry={registry} />
                      <TextCell>
                        <RegistryTitle>{registry.title}</RegistryTitle>
                        <RowDescription>
                          {kindLabel(registry.kind)} ·{' '}
                          {registry.description ||
                            truncateMiddle(registry.address)}
                        </RowDescription>
                      </TextCell>
                    </Row>
                    <RowRight>
                      <ChainChip chainId={registry.chainId} size="sm" />
                      <TrustChip registry={registry} />
                      <Stat value={registry.itemCount} label="entries" />
                      <Stat
                        value={registry.pendingCount}
                        label={pendingLabel(registry.kind).toLowerCase()}
                        title={
                          registry.kind === 'permanent'
                            ? STAKE_PENDING_TITLE
                            : undefined
                        }
                      />
                      <Stat value={registry.disputeCount} label="in court" />
                    </RowRight>
                  </RegistryRow>
                ))}
              </RowsShell>
            )}

            {!loading && !failed && registries.length > 0 && (
              <Footer>
                <Small $muted>
                  {formatInt((currentPage - 1) * PAGE_SIZE + 1)}–
                  {formatInt(
                    Math.min(currentPage * PAGE_SIZE, registries.length),
                  )}{' '}
                  of {formatInt(registries.length)}{' '}
                  {trust === 'verified' ? 'verified' : 'discovery'} registries
                </Small>
                {registries.length > PAGE_SIZE && (
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={registries.length}
                    onChange={(page: number) =>
                      setParam({ page: page === 1 ? null : String(page) })
                    }
                  />
                )}
              </Footer>
            )}
          </Surface>

          <Stack as="aside" $gap={16} aria-label="Verification and activity">
            <Surface
              as="section"
              $padding="standard"
              aria-label="Get a registry verified"
            >
              <PanelHeader>
                <PanelTitle>Get a registry verified</PanelTitle>
              </PanelHeader>
              <Stack $gap={12}>
                <Body $muted>
                  A registry becomes verified once it is accepted into the
                  Kleros Verified list of lists for its chain. Submit yours
                  there; the list of lists has its own deposit and challenge
                  period.
                </Body>
                <Stack $gap={8}>
                  {verificationChains.map((chainId) => {
                    const href = verificationHref(chainId)
                    return href ? (
                      <ButtonLink
                        key={chainId}
                        to={href}
                        $variant="secondary"
                        $size="sm"
                      >
                        <ChainLogo chainId={chainId} size={16} />
                        Submit a registry on {chainName(chainId)}
                      </ButtonLink>
                    ) : null
                  })}
                </Stack>
              </Stack>
            </Surface>

            <Surface
              as="section"
              $padding="standard"
              aria-label="Recent activity"
            >
              <PanelHeader>
                <PanelTitle>Recent activity</PanelTitle>
                <Small $faint>{scopeLabel}</Small>
              </PanelHeader>
              {loading ? (
                <SkeletonBlock $height="160px" />
              ) : latest.length === 0 ? (
                <Small $muted>No recent requests in this scope.</Small>
              ) : (
                <div>
                  {latest.map((activity) => (
                    <ActivityItem key={activity.id} to={activity.href}>
                      <StatusDot $tone={activityTone(activity)} aria-hidden />
                      <ActivityCopy>
                        <ActivityTitle>{activity.status}</ActivityTitle>
                        <Small $faint>
                          {activity.registryTitle} ·{' '}
                          {formatAgo(activity.timestamp, now)}
                        </Small>
                      </ActivityCopy>
                      <ChainChip chainId={activity.chainId} size="sm" />
                    </ActivityItem>
                  ))}
                </div>
              )}
            </Surface>
          </Stack>
        </SplitGrid>
      </Section>
    </Page>
  )
}

export default BrowsePage
