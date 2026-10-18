import React, { useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import { parseIpfs } from 'utils/ipfs-parse'
import { formatAgo } from 'utils/time'
import { NETWORKS, NETWORKS_INFO } from 'config/networks'
import { CurateIcon } from 'components/curate/icons'
import {
  ButtonLink,
  ChainChip,
  Data,
  HeroStatement,
  Label,
  Page,
  SegmentedControl,
  SkeletonBlock,
  Small,
  StatusDot,
  Surface,
  Table,
  TableScroller,
  truncateMiddle,
} from 'components/curate/primitives'
import { StatusBoard } from 'components/curate/status-board'
import { OrbitChart } from 'components/curate/orbit-chart'
import { AreaChart } from 'components/curate/motion/area-chart'
import { RingGauge } from 'components/curate/motion/ring-gauge'
import { AnimatedNumber } from 'components/curate/motion/animated-number'
import { reveal } from 'components/curate/motion/reveal'
import { fetchDashboardData } from './data'
import type { DashboardRegistry } from './types'
import {
  SUPPORTED_CHAIN_IDS,
  buildBoard,
  chainInfo,
  kindLabel,
  registryHref,
  sortRegistries,
  validChain,
  type ChainFilter,
} from './view'

/*
 * Dashboard: a short statement, the entries per chain as the data hero, one
 * strip of live figures, what is open or in court right now, and the most
 * active registries and curators. Every figure comes from the indexers.
 */

const integer = new Intl.NumberFormat('en-US')
const formatInt = (value: number) => integer.format(Math.round(value))

const mediaUrl = (uri?: string | null): string | null => {
  if (!uri) return null
  if (/^https?:\/\//i.test(uri)) return uri
  return parseIpfs(uri)
}

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--status-registered) 55%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`

/* ---------- Hero (YMax composition) ---------- */

const Hero = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22px;

  > * {
    ${reveal}
  }
  padding: 56px 0 8px;
  text-align: center;

  @media (max-width: 720px) {
    padding-top: 24px;
    align-items: flex-start;
    text-align: left;
  }
`

const LivePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 14px 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;

  b {
    color: var(--color-primary);
    font-weight: 500;
  }

  i {
    width: 7px;
    height: 7px;
    border-radius: var(--radius-pill);
    background: var(--status-registered);
    animation: ${pulse} 2.4s infinite;
  }
`

const Headline = styled(HeroStatement)`
  max-width: 14ch;
`

const Lede = styled.p`
  margin: 0;
  max-width: 46ch;
  color: var(--color-muted);
  font-size: 18px;
  line-height: 28px;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 6px;
`

const Checks = styled.ul`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 28px;
  margin: 18px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-muted);
    font-size: 14px;
  }

  svg {
    color: var(--color-primary);
  }

  @media (max-width: 720px) {
    justify-content: flex-start;
  }
`

const Featured = styled(Surface)`
  margin-top: 64px;
  padding: 28px 28px 20px;
  ${reveal}

  @media (max-width: 720px) {
    padding: 20px 16px 16px;
  }
`

const FeaturedTop = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px 40px;
  margin-bottom: 20px;
`

const HeadlineFigure = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const InlineStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 36px;
  margin-right: auto;
  padding-bottom: 6px;
`

const InlineStat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  b {
    color: var(--color-text);
    font-size: 18px;
    line-height: 22px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
`

const SeriesLegend = styled.ul`
  display: flex;
  gap: 18px;
  margin: 0;
  padding: 0 0 6px;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-muted);
    font-size: 13px;
  }

  i {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    box-shadow: 0 0 10px currentColor;
  }
`

const Big = styled.span<{ $hero?: boolean }>`
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: ${({ $hero }) =>
    $hero
      ? 'clamp(48px, 3.6vw + 24px, 80px)'
      : 'clamp(30px, 1.6vw + 20px, 44px)'};
  line-height: 0.95;
  font-weight: 500;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
`

const Gauges = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const GaugeCard = styled(Surface)`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px 22px;
  ${reveal}

  h3 {
    margin: 0 0 6px;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 24px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }
`

const Legend = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;

  li {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-muted);
    font-size: var(--fs-small);
  }

  i {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-pill);
  }
`

/* ---------- Sections ---------- */

const SectionHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin: 80px 0 20px;
`

const SectionTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 34px;
  font-weight: 500;
  letter-spacing: -0.03em;
`

const Split = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`

const RegistryCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const Logo = styled.span<{ $image?: string | null }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: ${({ $image }) =>
    $image ? `url(${$image}) center / cover` : 'var(--color-raised)'};
  color: var(--color-faint);
`

const RegistryName = styled(Link)`
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-weight: 500;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary);
  }
`

const SeeAll = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    color: var(--color-text);
  }
`

const CuratorRow = styled(Link)`
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--glass-border);
  color: inherit;
  text-decoration: none;

  &:last-child {
    border-bottom: 0;
  }

  &:hover strong {
    color: var(--color-primary);
  }

  strong {
    display: block;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
  }
`

const Rank = styled.span`
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: 12px;
`

const Won = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 12px;
`

const RegistryLogo = ({ registry }: { registry: DashboardRegistry }) => (
  <Logo $image={mediaUrl(registry.logoURI)} aria-hidden>
    {!registry.logoURI && <CurateIcon name="registry" size={15} />}
  </Logo>
)

const Dashboard = () => {
  useDocumentHead(
    'Kleros Curate',
    'Browse Kleros Curate registries, follow entries in a challenge window or in court, and earn by challenging entries that break a list policy.',
  )
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const chain: ChainFilter = validChain(searchParams.get('chain'))
  const now = useNow(30_000)

  const query = useQuery({
    queryKey: ['curateDashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const data = query.data
  const loading = query.isLoading || !data

  const setChain = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('chain')
    else next.set('chain', value)
    setSearchParams(next, { replace: true })
  }

  const board = useMemo(
    () =>
      data
        ? buildBoard(data.activities, data.disputes, now, chain)
        : { windowOpen: [], inCourt: [], decided: [] },
    [data, now, chain],
  )

  const segments = useMemo(
    () =>
      SUPPORTED_CHAIN_IDS.map((chainId) => {
        const info = NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
        return {
          key: String(chainId),
          label: info?.name ?? String(chainId),
          color: info?.color ?? 'var(--color-primary)',
          value: (data?.registries ?? [])
            .filter((registry) => registry.chainId === chainId)
            .reduce((sum, registry) => sum + registry.itemCount, 0),
        }
      }),
    [data],
  )

  const topRegistries = useMemo(
    () =>
      data
        ? sortRegistries(
            data.registries.filter(
              (registry) => chain === 'all' || registry.chainId === chain,
            ),
            'activity',
          ).slice(0, 8)
        : [],
    [data, chain],
  )

  const curators = useMemo(
    () =>
      (data?.users ?? [])
        .filter((user) => chain === 'all' || user.chains[chain])
        .slice(0, 6),
    [data, chain],
  )

  const chartLabels = useMemo(
    () =>
      (data?.series ?? []).map((d) =>
        new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(d.day * 1000)),
      ),
    [data],
  )

  const challengeStats = useMemo(() => {
    const users = data?.users ?? []
    const challenges = users.reduce((sum, user) => sum + user.challenges, 0)
    const won = users.reduce((sum, user) => sum + user.successfulChallenges, 0)
    return { challenges, won, ratio: challenges ? won / challenges : 0 }
  }, [data])

  const launchChain = chain === 'all' ? NETWORKS.gnosis : chain
  const totalEntries = segments.reduce((sum, seg) => sum + seg.value, 0)

  return (
    <Page>
      <Hero>
        <LivePill>
          <i aria-hidden />
          <b>Live</b>
          {data
            ? `Updated ${formatAgo(Math.floor(data.generatedAt / 1000), now)}`
            : 'Connecting to the indexers'}
        </LivePill>
        <Headline>
          Lists anyone can challenge. <em>Settled by jurors.</em>
        </Headline>
        <Lede>
          Every entry is backed by a deposit. Challenge one that breaks the
          list’s policy and, if jurors agree, you win its deposit.
        </Lede>
        <Actions>
          <ButtonLink to="/browse" $variant="primary">
            Explore registries
          </ButtonLink>
          <ButtonLink to={`/launch/${launchChain}`} $variant="secondary">
            Launch a list
          </ButtonLink>
        </Actions>
        <Checks>
          <li>
            <CurateIcon name="check" size={16} /> Open to anyone
          </li>
          <li>
            <CurateIcon name="check" size={16} /> Deposits back if unchallenged
          </li>
          <li>
            <CurateIcon name="check" size={16} /> Disputes settled by Kleros
          </li>
        </Checks>
      </Hero>

      <Featured
        $featured
        $padding="none"
        aria-label="Live figures"
        style={{ ['--i' as string]: 5 }}
      >
        <FeaturedTop>
          <HeadlineFigure>
            <Label $tone="faint">Entries curated</Label>
            <Big $hero>
              <AnimatedNumber value={loading ? undefined : totalEntries} />
            </Big>
          </HeadlineFigure>
          <InlineStats>
            {[
              { label: 'Registries', value: data?.metrics.registries },
              {
                label: 'Requests open',
                value: data?.metrics.activeVerification,
              },
              { label: 'In court now', value: data?.metrics.disputes },
              { label: 'Curators · 30 days', value: data?.metrics.curators },
            ].map((figure) => (
              <InlineStat key={figure.label}>
                <Label $tone="faint">{figure.label}</Label>
                <b>
                  <AnimatedNumber value={figure.value} />
                </b>
              </InlineStat>
            ))}
          </InlineStats>
          <SeriesLegend aria-label="Chart series">
            <li style={{ color: 'var(--color-primary)' }}>
              <i style={{ background: 'var(--color-primary)' }} aria-hidden />
              <span style={{ color: 'var(--color-muted)' }}>Requests</span>
            </li>
            <li style={{ color: 'var(--status-contested)' }}>
              <i
                style={{ background: 'var(--status-contested)' }}
                aria-hidden
              />
              <span style={{ color: 'var(--color-muted)' }}>Challenges</span>
            </li>
          </SeriesLegend>
        </FeaturedTop>
        {loading ? (
          <SkeletonBlock $height="240px" />
        ) : (
          <AreaChart
            height={240}
            labels={chartLabels}
            series={[
              {
                key: 'requests',
                label: 'Requests',
                color: 'var(--color-primary)',
                values: data.series.map((d) => d.submissions + d.removals),
              },
              {
                key: 'challenges',
                label: 'Challenges',
                color: 'var(--status-contested)',
                values: data.series.map((d) => d.challenges),
              },
            ]}
            ariaLabel={`Requests and challenges per day over the last 30 days: ${formatInt(
              data.series.reduce(
                (sum, d) => sum + d.submissions + d.removals,
                0,
              ),
            )} requests, ${formatInt(
              data.series.reduce((sum, d) => sum + d.challenges, 0),
            )} challenges`}
          />
        )}
        {data?.seriesTruncated && (
          <Small $faint>
            Some chains had more requests than this view loads; their earliest
            days may be undercounted.
          </Small>
        )}
      </Featured>

      <Gauges>
        <GaugeCard $padding="none" style={{ ['--i' as string]: 6 }}>
          {loading ? (
            <SkeletonBlock
              $width="148px"
              $height="148px"
              style={{ borderRadius: '50%' }}
            />
          ) : (
            <OrbitChart
              segments={segments}
              total={`${segments.filter((seg) => seg.value > 0).length}`}
              caption="Chains"
              ariaLabel={`Entries per chain: ${segments
                .map((seg) => `${seg.label} ${formatInt(seg.value)}`)
                .join(', ')}`}
              size={148}
            />
          )}
          <div>
            <h3>Where entries live</h3>
            <Legend aria-label="Entries per chain">
              {segments.map((seg) => (
                <li key={seg.key}>
                  <i style={{ background: seg.color }} aria-hidden />
                  {seg.label}
                  <Data $muted $weight={400}>
                    {loading ? '—' : formatInt(seg.value)}
                  </Data>
                </li>
              ))}
            </Legend>
          </div>
        </GaugeCard>
        <GaugeCard $padding="none" style={{ ['--i' as string]: 7 }}>
          <RingGauge
            size={148}
            ratio={
              data?.metrics.registries
                ? data.metrics.verifiedRegistries / data.metrics.registries
                : 0
            }
            from="var(--status-registered)"
            to="var(--aurora-b)"
            label={`Verified registries: ${data?.metrics.verifiedRegistries ?? 0} of ${data?.metrics.registries ?? 0}`}
            caption="Verified"
          />
          <div>
            <h3>Verified registries</h3>
            <Small $muted>
              {data
                ? `${formatInt(data.metrics.verifiedRegistries)} of ${formatInt(data.metrics.registries)} are on the Kleros Verified list of lists.`
                : '—'}
            </Small>
          </div>
        </GaugeCard>
        <GaugeCard $padding="none" style={{ ['--i' as string]: 8 }}>
          <RingGauge
            size={148}
            ratio={challengeStats.ratio}
            from="var(--status-contested)"
            to="var(--color-danger)"
            label={`Challenges won in 30 days: ${challengeStats.won} of ${challengeStats.challenges}`}
            caption="Won"
          />
          <div>
            <h3>Challenges that won</h3>
            <Small $muted>
              {data
                ? `${formatInt(challengeStats.won)} of ${formatInt(challengeStats.challenges)} challenges in the last 30 days took the entry off the list.`
                : '—'}
            </Small>
          </div>
        </GaugeCard>
      </Gauges>

      <SectionHead>
        <SectionTitle>Happening now</SectionTitle>
        <SegmentedControl
          ariaLabel="Chain"
          value={chain === 'all' ? 'all' : String(chain)}
          onChange={setChain}
          options={[
            { value: 'all', label: 'All chains' },
            ...SUPPORTED_CHAIN_IDS.map((chainId) => ({
              value: String(chainId),
              label: chainInfo(chainId)?.name ?? String(chainId),
            })),
          ]}
        />
      </SectionHead>
      {loading ? (
        <Split style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <SkeletonBlock $height="320px" />
          <SkeletonBlock $height="320px" />
          <SkeletonBlock $height="320px" />
        </Split>
      ) : (
        <StatusBoard
          limit={4}
          columns={[
            {
              id: 'window',
              title: 'Open to challenge',
              hint: 'Challenge window open',
              tone: 'window',
              cards: board.windowOpen,
              empty: 'Nothing open right now',
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
              title: 'Decided',
              hint: 'Recent rulings',
              tone: 'registered',
              cards: board.decided,
              empty: 'No recent rulings',
            },
          ]}
        />
      )}

      <SectionHead>
        <SectionTitle>Most active</SectionTitle>
        <SeeAll to="/browse">
          All registries <CurateIcon name="submit" size={13} />
        </SeeAll>
      </SectionHead>
      <Split>
        {loading ? (
          <SkeletonBlock $height="420px" />
        ) : (
          <TableScroller>
            <Table>
              <thead>
                <tr>
                  <th>Registry</th>
                  <th>Chain</th>
                  <th className="num">Entries</th>
                  <th className="num">Open</th>
                  <th className="num">In court</th>
                </tr>
              </thead>
              <tbody>
                {topRegistries.map((registry) => (
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
                            {kindLabel(registry.kind)}
                            {registry.trustStatus === 'verified' &&
                              ' · Verified'}
                          </Small>
                        </div>
                      </RegistryCell>
                    </td>
                    <td>
                      <ChainChip chainId={registry.chainId} size="sm" />
                    </td>
                    <td className="num">{formatInt(registry.itemCount)}</td>
                    <td className="num">{formatInt(registry.pendingCount)}</td>
                    <td className="num">{formatInt(registry.disputeCount)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableScroller>
        )}

        <Surface $padding="standard" aria-label="Top curators">
          <Label $tone="faint">Top curators · 30 days</Label>
          {loading ? (
            <SkeletonBlock $height="260px" style={{ marginTop: 16 }} />
          ) : curators.length === 0 ? (
            <Small $faint>No curator activity in the last 30 days.</Small>
          ) : (
            <div style={{ marginTop: 8 }}>
              {curators.map((user, index) => (
                <CuratorRow key={user.address} to={`/address/${user.address}`}>
                  <Rank>{String(index + 1).padStart(2, '0')}</Rank>
                  <span style={{ minWidth: 0 }}>
                    <strong>{truncateMiddle(user.address)}</strong>
                    <Small $faint>
                      {formatInt(user.submissions)} submitted ·{' '}
                      {formatInt(user.challenges)} challenged
                    </Small>
                  </span>
                  <Won title="Challenges won">
                    <StatusDot
                      $tone={
                        user.successfulChallenges > 0 ? 'registered' : 'neutral'
                      }
                      aria-hidden
                    />
                    {formatInt(user.successfulChallenges)} won
                  </Won>
                </CuratorRow>
              ))}
            </div>
          )}
        </Surface>
      </Split>
    </Page>
  )
}

export default Dashboard
