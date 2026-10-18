import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import useStoredLayout, { LAYOUT_OPTIONS } from 'hooks/use-stored-layout'
import { parseIpfs } from 'utils/ipfs-parse'
import { formatAgo } from 'utils/time'
import { NETWORKS } from 'config/networks'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonLink,
  ChainChip,
  Chip,
  Data,
  EmptyState,
  Figure,
  Grid,
  Heading,
  Label,
  ListRow,
  Page,
  PanelHeader,
  PanelTitle,
  Rail,
  Row,
  SearchField,
  Section,
  SegmentedControl,
  SkeletonBlock,
  Small,
  SplitGrid,
  Stack,
  Statement,
  Status,
  Surface,
  Table,
  TableScroller,
  truncateMiddle,
} from 'components/curate/primitives'
import { Explainer, LifecycleSchematic } from 'components/curate/explainer'
import { StatusBoard } from 'components/curate/status-board'
import { Gauge } from 'components/curate/gauge'
import { Pagination } from 'components/ui'
import { fetchDashboardData } from './data'
import type {
  DashboardActivity,
  DashboardRegistry,
  DashboardUser,
} from './types'
import {
  SUPPORTED_CHAIN_IDS,
  buildBoard,
  chainInfo,
  filterRegistries,
  kindLabel,
  registryHref,
  sortRegistries,
  validChain,
  validKind,
  validSort,
  validTrust,
  type ChainFilter,
  type KindFilter,
  type RegistrySort,
  type TrustFilter,
} from './view'

/*
 * Dashboard (DESIGN.md, Layout): statement + live figures; "How Curate works"
 * explainer (collapsible, remembered); what needs attention (status columns);
 * registry explorer (table, cards, rows); activity and curators in a side rail.
 * Every figure is read from the indexers; nothing here is invented.
 */

const PAGE_SIZE = 12

const integer = new Intl.NumberFormat('en-US')
const formatInt = (value: number) => integer.format(Math.round(value))

const mediaUrl = (uri?: string | null): string | null => {
  if (!uri) return null
  if (/^https?:\/\//i.test(uri)) return uri
  return parseIpfs(uri)
}

/* ---------- Hero ---------- */

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 32px;
  align-items: stretch;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 16px;
  padding: 8px 0;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
`

const FiguresGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 12px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const FigureCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const ChainRails = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  align-items: center;
  gap: 6px 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
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

const Logo = styled.span<{ $image?: string | null }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: ${({ $image }) =>
    $image ? `url(${$image}) center / cover` : 'var(--color-raised)'};
  color: var(--color-faint);
  overflow: hidden;
`

const RegistryCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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

const RegistryTitle = styled.span`
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
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

const RowsShell = styled.div`
  display: flex;
  flex-direction: column;
`

const RowCopy = styled.div`
  min-width: 0;
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
  align-items: center;
  gap: 12px;

  @media (max-width: 600px) {
    display: none;
  }
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

const ActivityTitle = styled.span`
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-overflow: ellipsis;
  white-space: nowrap;
`

const CuratorRow = styled(Link)`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border);
  color: inherit;
  text-decoration: none;

  &:last-child {
    border-bottom: 0;
  }

  &:hover dd {
    color: var(--color-primary);
  }
`

const Dot = styled.span<{
  $tone: 'registered' | 'window' | 'contested' | 'off' | 'neutral'
}>`
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--status-${({ $tone }) => $tone});
`

const activityTone = (activity: DashboardActivity) =>
  activity.kind === 'challenge'
    ? 'contested'
    : activity.kind === 'resolution'
      ? activity.outcome === 'registered' || activity.outcome === 'kept'
        ? 'registered'
        : 'off'
      : 'window'

const RegistryLogo = ({ registry }: { registry: DashboardRegistry }) => (
  <Logo $image={mediaUrl(registry.logoURI)} aria-hidden>
    {!registry.logoURI && <CurateIcon name="registry" size={16} />}
  </Logo>
)

const TrustChip = ({ registry }: { registry: DashboardRegistry }) =>
  registry.trustStatus === 'verified' ? (
    <Chip title="Listed on the Kleros Verified list of lists">
      <Dot $tone="registered" aria-hidden /> Verified
    </Chip>
  ) : (
    <Chip title="Not on the Kleros Verified list of lists">Discovery</Chip>
  )

/* ---------- Page ---------- */

const Dashboard = () => {
  useDocumentHead(
    'Kleros Curate',
    'Browse Kleros Curate registries, follow entries in a challenge window or in court, and earn by challenging entries that break a list policy.',
  )
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const chain: ChainFilter = validChain(searchParams.get('chain'))
  const trust = validTrust(searchParams.get('trust'))
  const kind = validKind(searchParams.get('kind'))
  const sort = validSort(searchParams.get('sort'))
  const search = searchParams.get('q') || ''
  const [page, setPage] = useState(1)
  const [layout, setLayout] = useStoredLayout('registries', 'table')
  const now = useNow(30_000)

  const query = useQuery({
    queryKey: ['curateDashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const data = query.data

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    setPage(1)
  }, [chain, trust, kind, sort, search])

  const registries = useMemo(
    () =>
      data
        ? sortRegistries(
            filterRegistries(data.registries, { chain, trust, kind, search }),
            sort,
          )
        : [],
    [data, chain, trust, kind, search, sort],
  )
  const pageCount = Math.max(1, Math.ceil(registries.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = registries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const board = useMemo(
    () =>
      data
        ? buildBoard(data.activities, data.disputes, now, chain)
        : { windowOpen: [], inCourt: [], decided: [] },
    [data, now, chain],
  )

  const chainShares = useMemo(() => {
    const all = data?.registries ?? []
    const total = all.reduce((sum, registry) => sum + registry.itemCount, 0)
    return SUPPORTED_CHAIN_IDS.map((chainId) => {
      const items = all
        .filter((registry) => registry.chainId === chainId)
        .reduce((sum, registry) => sum + registry.itemCount, 0)
      return { chainId, items, share: total ? items / total : 0 }
    })
  }, [data])

  const challengeStats = useMemo(() => {
    const users = data?.users ?? []
    const challenges = users.reduce((sum, user) => sum + user.challenges, 0)
    const won = users.reduce((sum, user) => sum + user.successfulChallenges, 0)
    return { challenges, won, ratio: challenges ? won / challenges : 0 }
  }, [data])

  const latest = useMemo(
    () =>
      (data?.activities ?? [])
        .filter((activity) => chain === 'all' || activity.chainId === chain)
        .slice(0, 8),
    [data, chain],
  )

  const curators = useMemo(
    () =>
      (data?.users ?? [])
        .filter((user) => chain === 'all' || user.chains[chain])
        .slice(0, 6),
    [data, chain],
  )

  const launchChain = chain === 'all' ? NETWORKS.gnosis : chain
  const loading = query.isLoading || !data

  return (
    <Page>
      <Hero>
        <HeroCopy>
          <Label>Kleros Curate</Label>
          <Statement>
            Lists anyone can add to, anyone can challenge, and jurors settle.
          </Statement>
          <Body $muted $large>
            Every entry is backed by a deposit. During the challenge window
            anyone can contest it; a Kleros court rules against the list’s
            policy and the winner is paid. Browse the registries, follow what is
            open or in court, and curate for rewards.
          </Body>
          <Actions>
            <ButtonLink to="/browse" $variant="primary">
              <CurateIcon name="registry" size={16} />
              Browse registries
            </ButtonLink>
            <ButtonLink to={`/launch/${launchChain}`} $variant="secondary">
              <CurateIcon name="factory" size={16} />
              Launch a list
            </ButtonLink>
            <ButtonLink to="/guide" $variant="ghost">
              Read the guide
            </ButtonLink>
          </Actions>
        </HeroCopy>

        <Surface $padding="standard" aria-label="Live figures">
          <PanelHeader>
            <PanelTitle>
              <CurateIcon name="activity" size={16} />
              Live figures
            </PanelTitle>
            <Label $tone="faint">
              {data
                ? `Updated ${formatAgo(Math.floor(data.generatedAt / 1000), now)}`
                : 'Loading'}
            </Label>
          </PanelHeader>
          {loading ? (
            <SkeletonBlock $height="200px" />
          ) : (
            <>
              <FiguresGrid>
                <FigureCell>
                  <Figure>{formatInt(data.metrics.registries)}</Figure>
                  <Label>Registries</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(data.metrics.curatedItems)}</Figure>
                  <Label>Entries</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(data.metrics.activeVerification)}</Figure>
                  <Label>Requests open</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(data.metrics.disputes)}</Figure>
                  <Label>In court now</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(data.metrics.curators)}</Figure>
                  <Label>Curators · 30d</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(data.metrics.verifiedRegistries)}</Figure>
                  <Label>Verified lists</Label>
                </FigureCell>
              </FiguresGrid>
              <ChainRails aria-label="Entries per chain">
                {chainShares.map((share) => (
                  <React.Fragment key={share.chainId}>
                    <Small $muted>{chainInfo(share.chainId)?.name}</Small>
                    <Rail $value={share.share} $tone="neutral" />
                    <Data $muted>{formatInt(share.items)}</Data>
                  </React.Fragment>
                ))}
              </ChainRails>
            </>
          )}
        </Surface>
      </Hero>

      <Section>
        <Explainer
          id="dashboard-how-curate-works"
          eyebrow="How Curate works"
          heading="Three steps, one deposit, a court if needed."
          steps={[
            {
              title: 'Submit with a deposit',
              body: 'Add an entry to a list. You lock the list’s base deposit plus the arbitration cost. If nobody challenges, it comes back in full.',
            },
            {
              title: 'Anyone can challenge during the window',
              body: 'Each list sets a challenge period and shows it before you sign. A challenger locks their own deposit and gives a reason.',
            },
            {
              title: 'Kleros jurors decide; the winner is paid',
              body: 'The court rules on the list’s policy. The winner takes the pool minus one arbitration cost; the loser’s deposit is lost.',
            },
          ]}
          schematic={<LifecycleSchematic />}
          footer={
            <Link to="/guide" style={{ fontSize: 13, fontWeight: 500 }}>
              Read the guide
            </Link>
          }
        />
      </Section>

      <Section>
        <PanelHeader>
          <div>
            <Heading>What needs attention</Heading>
            <Small $muted>
              Latest requests across every registry. Exact countdowns are on
              each registry and item page.
            </Small>
          </div>
          <SegmentedControl
            ariaLabel="Chain"
            value={chain === 'all' ? 'all' : String(chain)}
            onChange={(value) =>
              setParam({ chain: value === 'all' ? null : value })
            }
            options={[
              { value: 'all', label: 'All chains' },
              ...SUPPORTED_CHAIN_IDS.map((chainId) => ({
                value: String(chainId),
                label: chainInfo(chainId)?.name ?? String(chainId),
              })),
            ]}
          />
        </PanelHeader>
        {loading ? (
          <Grid $min={280}>
            <SkeletonBlock $height="220px" />
            <SkeletonBlock $height="220px" />
            <SkeletonBlock $height="220px" />
          </Grid>
        ) : (
          <StatusBoard
            columns={[
              {
                id: 'window',
                title: 'Window open',
                hint: 'Can be challenged',
                tone: 'window',
                cards: board.windowOpen,
                empty: 'No open requests indexed',
              },
              {
                id: 'court',
                title: 'In court',
                hint: 'Jurors deciding',
                tone: 'contested',
                cards: board.inCourt,
                empty: 'No disputes open',
              },
              {
                id: 'decided',
                title: 'Recently decided',
                hint: 'Rulings',
                tone: 'registered',
                cards: board.decided,
                empty: 'No recent rulings',
              },
            ]}
          />
        )}
      </Section>

      <Section>
        <SplitGrid $rail={340}>
          <Surface $padding="none" id="registry-explorer">
            <Toolbar>
              <ToolbarSearch>
                <CurateIcon name="search" size={16} />
                <input
                  aria-label="Search registries"
                  placeholder="Search registries by name, address or chain"
                  value={search}
                  onChange={(event) =>
                    setParam({ q: event.currentTarget.value || null })
                  }
                />
                {search && (
                  <Button
                    type="button"
                    $variant="ghost"
                    $size="sm"
                    aria-label="Clear search"
                    onClick={() => setParam({ q: null })}
                  >
                    <CurateIcon name="close" size={14} />
                  </Button>
                )}
              </ToolbarSearch>
              <SegmentedControl<TrustFilter>
                ariaLabel="Trust"
                value={trust}
                onChange={(value) =>
                  setParam({ trust: value === 'all' ? null : value })
                }
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'unverified', label: 'Discovery' },
                ]}
              />
              <SegmentedControl<KindFilter>
                ariaLabel="Registry type"
                value={kind}
                onChange={(value) =>
                  setParam({ kind: value === 'all' ? null : value })
                }
                options={[
                  { value: 'all', label: 'Any type' },
                  { value: 'light', label: 'Light' },
                  { value: 'classic', label: 'Classic' },
                  { value: 'permanent', label: 'Stake' },
                ]}
              />
              <SegmentedControl<RegistrySort>
                ariaLabel="Sort"
                value={sort}
                onChange={(value) =>
                  setParam({ sort: value === 'signal' ? null : value })
                }
                options={[
                  { value: 'signal', label: 'Relevance' },
                  { value: 'activity', label: 'Open requests' },
                  { value: 'items', label: 'Entries' },
                ]}
              />
              <SegmentedControl
                ariaLabel="Layout"
                value={layout}
                onChange={setLayout}
                options={LAYOUT_OPTIONS}
              />
            </Toolbar>

            {loading ? (
              <Stack $gap={0} style={{ padding: 16 }}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonBlock key={index} $height="44px" />
                ))}
              </Stack>
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
              <TableScroller style={{ border: 0, borderRadius: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Registry</th>
                      <th>Chain</th>
                      <th className="num">Entries</th>
                      <th className="num">Open</th>
                      <th className="num">In court</th>
                      <th>Trust</th>
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
                            <div style={{ minWidth: 0 }}>
                              <RegistryName to={registryHref(registry)}>
                                {registry.title}
                              </RegistryName>
                              <Small $faint>
                                {kindLabel(registry.kind)} ·{' '}
                                {truncateMiddle(registry.address)}
                              </Small>
                            </div>
                          </RegistryCell>
                        </td>
                        <td>
                          <ChainChip chainId={registry.chainId} size="sm" />
                        </td>
                        <td className="num">{formatInt(registry.itemCount)}</td>
                        <td className="num">
                          {formatInt(registry.pendingCount)}
                        </td>
                        <td className="num">
                          {formatInt(registry.disputeCount)}
                        </td>
                        <td>
                          <TrustChip registry={registry} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableScroller>
            ) : layout === 'cards' ? (
              <Grid $min={260} style={{ padding: 16 }}>
                {visible.map((registry) => (
                  <Card key={registry.id} to={registryHref(registry)}>
                    <Row $gap={10}>
                      <RegistryLogo registry={registry} />
                      <div style={{ minWidth: 0 }}>
                        <RegistryTitle>{registry.title}</RegistryTitle>
                        <Small $faint>{kindLabel(registry.kind)}</Small>
                      </div>
                    </Row>
                    {registry.description && (
                      <CardDescription>{registry.description}</CardDescription>
                    )}
                    <Row $gap={6} $wrap>
                      <ChainChip chainId={registry.chainId} size="sm" />
                      <TrustChip registry={registry} />
                    </Row>
                    <CardStats>
                      <FigureCell>
                        <Data>{formatInt(registry.itemCount)}</Data>
                        <Label $tone="faint">Entries</Label>
                      </FigureCell>
                      <FigureCell>
                        <Data>{formatInt(registry.pendingCount)}</Data>
                        <Label $tone="faint">Open</Label>
                      </FigureCell>
                      <FigureCell>
                        <Data>{formatInt(registry.disputeCount)}</Data>
                        <Label $tone="faint">In court</Label>
                      </FigureCell>
                    </CardStats>
                  </Card>
                ))}
              </Grid>
            ) : (
              <RowsShell>
                {visible.map((registry) => (
                  <ListRow key={registry.id} to={registryHref(registry)}>
                    <Row $gap={10}>
                      <RegistryLogo registry={registry} />
                      <RowCopy>
                        <RegistryTitle>{registry.title}</RegistryTitle>
                        <RowDescription>
                          {registry.description ||
                            `${kindLabel(registry.kind)} registry · ${truncateMiddle(registry.address)}`}
                        </RowDescription>
                      </RowCopy>
                    </Row>
                    <RowRight>
                      <ChainChip chainId={registry.chainId} size="sm" />
                      <TrustChip registry={registry} />
                      <Data title="Entries">
                        {formatInt(registry.itemCount)}
                      </Data>
                    </RowRight>
                  </ListRow>
                ))}
              </RowsShell>
            )}

            {!loading && registries.length > 0 && (
              <Footer>
                <Small $muted>
                  {formatInt((currentPage - 1) * PAGE_SIZE + 1)}–
                  {formatInt(
                    Math.min(currentPage * PAGE_SIZE, registries.length),
                  )}{' '}
                  of {formatInt(registries.length)} registries
                </Small>
                {registries.length > PAGE_SIZE && (
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={registries.length}
                    onChange={setPage}
                  />
                )}
              </Footer>
            )}
          </Surface>

          <Stack $gap={16}>
            <Surface $padding="standard" aria-label="At a glance">
              <PanelHeader>
                <PanelTitle>At a glance</PanelTitle>
              </PanelHeader>
              {loading ? (
                <SkeletonBlock $height="180px" />
              ) : (
                <Stack $gap={18}>
                  <Gauge
                    ratio={
                      data.metrics.registries
                        ? data.metrics.verifiedRegistries /
                          data.metrics.registries
                        : 0
                    }
                    tone="registered"
                    label="Verified registries"
                    value={`${formatInt(data.metrics.verifiedRegistries)} of ${formatInt(data.metrics.registries)}`}
                    hint="On the Kleros Verified list of lists"
                  />
                  <Gauge
                    ratio={challengeStats.ratio}
                    tone="contested"
                    label="Challenges won · 30d"
                    value={`${formatInt(challengeStats.won)} of ${formatInt(challengeStats.challenges)}`}
                    hint="Challenges that ended with the entry off the list"
                  />
                  <Gauge
                    ratio={
                      data.metrics.curatedItems +
                      data.metrics.activeVerification
                        ? data.metrics.activeVerification /
                          (data.metrics.curatedItems +
                            data.metrics.activeVerification)
                        : 0
                    }
                    tone="window"
                    label="Requests open"
                    value={`${formatInt(data.metrics.activeVerification)} open`}
                    hint="Share of all entries with a request in progress"
                  />
                </Stack>
              )}
            </Surface>

            <Surface $padding="standard" aria-label="Latest activity">
              <PanelHeader>
                <PanelTitle>Latest activity</PanelTitle>
                <Label $tone="faint">{latest.length}</Label>
              </PanelHeader>
              {loading ? (
                <SkeletonBlock $height="200px" />
              ) : latest.length === 0 ? (
                <Small $faint>No activity indexed yet.</Small>
              ) : (
                <div>
                  {latest.map((activity) => (
                    <ActivityItem key={activity.id} to={activity.href}>
                      <Dot $tone={activityTone(activity)} aria-hidden />
                      <span style={{ minWidth: 0 }}>
                        <ActivityTitle title={activity.registryTitle}>
                          {activity.registryTitle}
                        </ActivityTitle>
                        <Small $muted>{activity.status}</Small>
                      </span>
                      <Data $muted $weight={400}>
                        {formatAgo(activity.timestamp, now)}
                      </Data>
                    </ActivityItem>
                  ))}
                </div>
              )}
            </Surface>

            <Surface $padding="standard" aria-label="Top curators">
              <PanelHeader>
                <PanelTitle>Top curators · 30d</PanelTitle>
                <Label $tone="faint">By activity</Label>
              </PanelHeader>
              {loading ? (
                <SkeletonBlock $height="160px" />
              ) : curators.length === 0 ? (
                <Small $faint>No curator activity in the last 30 days.</Small>
              ) : (
                <div>
                  {curators.map((user: DashboardUser, index) => (
                    <CuratorRow
                      key={user.address}
                      to={`/address/${user.address}`}
                    >
                      <Data $muted>{index + 1}</Data>
                      <dl style={{ margin: 0, minWidth: 0 }}>
                        <dd style={{ margin: 0 }}>
                          <Data>{truncateMiddle(user.address)}</Data>
                        </dd>
                        <dd style={{ margin: 0 }}>
                          <Small $muted>
                            {formatInt(user.submissions)} submissions ·{' '}
                            {formatInt(user.challenges)} challenges
                          </Small>
                        </dd>
                      </dl>
                      <Status
                        tone={
                          user.successfulChallenges > 0
                            ? 'registered'
                            : 'neutral'
                        }
                        label={`${formatInt(user.successfulChallenges)} won`}
                      />
                    </CuratorRow>
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

export default Dashboard
