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
  TESTNET_CHAIN_IDS,
  buildBoard,
  scopeChains,
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

const ScopeBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 22px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--glass-border);
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

  const chains = useMemo(() => scopeChains(chain), [chain])
  const scoped = useMemo(
    () => (data?.registries ?? []).filter((r) => chains.includes(r.chainId)),
    [data, chains],
  )

  const board = useMemo(() => {
    if (!data) return { windowOpen: [], inCourt: [], decided: [] }
    const logos = new Map(
      data.registries.map((registry) => [
        `${registry.chainId}:${registry.address}`,
        mediaUrl(registry.logoURI),
      ]),
    )
    const withLogo = (cards: ReturnType<typeof buildBoard>['windowOpen']) =>
      cards.map((card) => ({
        ...card,
        logo: logos.get(
          `${card.chainId}:${card.href.split('/')[3]?.toLowerCase()}`,
        ),
      }))
    const built = buildBoard(
      data.activities,
      data.disputes,
      data.openDisputes,
      now,
      chains,
    )
    return {
      windowOpen: withLogo(built.windowOpen),
      inCourt: withLogo(built.inCourt),
      decided: withLogo(built.decided),
    }
  }, [data, now, chains])

  /** Every figure on the page describes the same scope. */
  const figures = useMemo(() => {
    if (!data) return undefined
    const users = data.users.filter((user) =>
      Object.keys(user.chains).some((id) => chains.includes(Number(id))),
    )
    let challenges = 0
    let won = 0
    for (const user of data.users)
      for (const [id, stats] of Object.entries(user.chains))
        if (chains.includes(Number(id))) {
          challenges += stats.challenges
          won += stats.successfulChallenges
        }
    return {
      registries: scoped.length,
      verified: scoped.filter((r) => r.trustStatus === 'verified').length,
      entries: scoped.reduce((sum, r) => sum + r.itemCount, 0),
      // Stake Curate has no requests (its counter is listed items).
      requestsOpen: scoped
        .filter((r) => r.kind !== 'permanent')
        .reduce((sum, r) => sum + r.pendingCount, 0),
      inCourt: data.openDisputes.filter((a) => chains.includes(a.chainId))
        .length,
      curators: users.length,
      challenges,
      won,
    }
  }, [data, scoped, chains])

  const series = useMemo(() => {
    if (!data) return []
    return data.series.map((day, index) => {
      const sum = { ...day, submissions: 0, removals: 0, challenges: 0 }
      for (const chainId of chains) {
        const other = data.seriesByChain[chainId]?.[index]
        if (!other) continue
        sum.submissions += other.submissions
        sum.removals += other.removals
        sum.challenges += other.challenges
      }
      return sum
    })
  }, [data, chains])

  /**
   * The breakdown ring: across several chains it splits entries by chain;
   * on one chain it splits them by list (top four, then the rest).
   */
  const breakdown = useMemo(() => {
    if (chains.length > 1)
      return {
        title: 'Entries by chain',
        segments: chains.map((chainId) => {
          const info = NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
          return {
            key: String(chainId),
            label: info?.name ?? String(chainId),
            color: info?.color ?? 'var(--color-primary)',
            value: scoped
              .filter((r) => r.chainId === chainId)
              .reduce((sum, r) => sum + r.itemCount, 0),
          }
        }),
      }
    const ranked = [...scoped].sort((a, b) => b.itemCount - a.itemCount)
    const palette = [
      'var(--color-primary)',
      'var(--aurora-b)',
      'var(--status-registered)',
      'var(--status-contested)',
    ]
    const top = ranked.slice(0, 4).map((r, index) => ({
      key: r.id,
      label: r.title,
      color: palette[index],
      value: r.itemCount,
    }))
    const rest = ranked.slice(4).reduce((sum, r) => sum + r.itemCount, 0)
    return {
      title: 'Entries by list',
      segments: rest
        ? [
            ...top,
            {
              key: 'rest',
              label: `${ranked.length - 4} other lists`,
              color: 'var(--color-faint)',
              value: rest,
            },
          ]
        : top,
    }
  }, [chains, scoped])

  const topRegistries = useMemo(
    () => sortRegistries(scoped, 'activity').slice(0, 8),
    [scoped],
  )

  const curators = useMemo(
    () =>
      (data?.users ?? [])
        .filter((user) =>
          Object.keys(user.chains).some((id) => chains.includes(Number(id))),
        )
        .slice(0, 6),
    [data, chains],
  )

  const chartLabels = useMemo(
    () =>
      series.map((d) =>
        new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
          timeZone: 'UTC',
        }).format(new Date(d.day * 1000)),
      ),
    [series],
  )

  const launchChain = chain === 'all' ? NETWORKS.gnosis : chain
  const breakdownTotal = breakdown.segments.reduce(
    (sum, seg) => sum + seg.value,
    0,
  )
  // The ring's arcs are shares, so the centre names the biggest one.
  const leading = breakdownTotal
    ? [...breakdown.segments]
        .sort((a, b) => b.value - a.value)
        .map((seg) => ({
          label: seg.label,
          share: seg.value / breakdownTotal,
        }))[0]
    : undefined

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
        <ScopeBar>
          <Label $tone="faint">
            {chain === 'all'
              ? 'Ethereum and Gnosis'
              : `${chainInfo(chain)?.name ?? chain}${TESTNET_CHAIN_IDS.includes(chain) ? ' · test network' : ''}`}
          </Label>
          <SegmentedControl
            ariaLabel="Scope"
            value={chain === 'all' ? 'all' : String(chain)}
            onChange={setChain}
            options={[
              { value: 'all', label: 'Mainnets' },
              ...SUPPORTED_CHAIN_IDS.map((chainId) => ({
                value: String(chainId),
                label: chainInfo(chainId)?.name ?? String(chainId),
              })),
            ]}
          />
        </ScopeBar>
        <FeaturedTop>
          <HeadlineFigure>
            <Label $tone="faint">Entries curated</Label>
            <Big $hero>
              <AnimatedNumber value={figures?.entries} />
            </Big>
          </HeadlineFigure>
          <InlineStats>
            {[
              { label: 'Registries', value: figures?.registries },
              { label: 'Requests open', value: figures?.requestsOpen },
              { label: 'In court now', value: figures?.inCourt },
              { label: 'Curators · 30 days', value: figures?.curators },
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
            <li>
              <Label $tone="faint">Per day · last 30 days</Label>
            </li>
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
            key={chains.join('-')}
            height={240}
            labels={chartLabels}
            series={[
              {
                key: 'requests',
                label: 'Requests',
                color: 'var(--color-primary)',
                values: series.map((d) => d.submissions + d.removals),
              },
              {
                key: 'challenges',
                label: 'Challenges',
                color: 'var(--status-contested)',
                values: series.map((d) => d.challenges),
              },
            ]}
            ariaLabel={`Requests and challenges per day over the last 30 days: ${formatInt(
              series.reduce((sum, d) => sum + d.submissions + d.removals, 0),
            )} requests, ${formatInt(
              series.reduce((sum, d) => sum + d.challenges, 0),
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
              key={chains.join('-')}
              segments={breakdown.segments}
              total={leading ? `${Math.round(leading.share * 100)}%` : '—'}
              caption={leading ? `in ${leading.label}` : 'No entries'}
              ariaLabel={`${breakdown.title}: ${breakdown.segments
                .map(
                  (seg) =>
                    `${seg.label} ${formatInt(seg.value)} (${breakdownTotal ? Math.round((seg.value / breakdownTotal) * 100) : 0}%)`,
                )
                .join(', ')}`}
              size={148}
            />
          )}
          <div style={{ minWidth: 0 }}>
            <h3>{breakdown.title}</h3>
            <Legend aria-label={breakdown.title}>
              {breakdown.segments.map((seg) => (
                <li key={seg.key}>
                  <i style={{ background: seg.color }} aria-hidden />
                  <span
                    style={{
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {seg.label}
                  </span>
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
            key={`v-${chains.join('-')}`}
            size={148}
            ratio={
              figures?.registries ? figures.verified / figures.registries : 0
            }
            from="var(--status-registered)"
            to="var(--aurora-b)"
            label={`Verified registries: ${figures?.verified ?? 0} of ${figures?.registries ?? 0}`}
            caption="of lists verified"
          />
          <div>
            <h3>Verified registries</h3>
            <Small $muted>
              {figures
                ? `${formatInt(figures.verified)} of ${formatInt(figures.registries)} are on the Kleros Verified list of lists.`
                : '—'}
            </Small>
          </div>
        </GaugeCard>
        <GaugeCard $padding="none" style={{ ['--i' as string]: 8 }}>
          <RingGauge
            key={`c-${chains.join('-')}`}
            size={148}
            ratio={figures?.challenges ? figures.won / figures.challenges : 0}
            from="var(--status-contested)"
            to="var(--color-danger)"
            label={`Challenges won in 30 days: ${figures?.won ?? 0} of ${figures?.challenges ?? 0}`}
            caption="of challenges won"
          />
          <div>
            <h3>Challenges that won</h3>
            <Small $muted>
              {figures
                ? figures.challenges
                  ? `${formatInt(figures.won)} of ${formatInt(figures.challenges)} challenges in the last 30 days took the entry off the list.`
                  : 'No challenges in the last 30 days.'
                : '—'}
            </Small>
          </div>
        </GaugeCard>
      </Gauges>

      <SectionHead>
        <SectionTitle>Happening now</SectionTitle>
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
                    <td className="num">
                      {registry.kind === 'permanent'
                        ? '—'
                        : formatInt(registry.pendingCount)}
                    </td>
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
