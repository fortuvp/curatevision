import { NETWORKS_INFO } from 'config/networks'
import type { StatusTone } from 'components/curate/primitives'
import { formatAgo } from 'utils/time'
import type {
  DashboardActivity,
  DashboardData,
  DashboardDay,
  DashboardRegistry,
  RegistryKind,
  UnchallengedRow,
} from './types'

/* Pure view helpers for the dashboard: filters, sorts and board mapping. */

export type ChainFilter = 'all' | number
export type TrustFilter = 'all' | 'verified' | 'unverified'
export type KindFilter = 'all' | RegistryKind
export type RegistrySort = 'signal' | 'activity' | 'items' | 'recent'

export const SUPPORTED_CHAIN_IDS = Object.values(NETWORKS_INFO).map((info) =>
  Number(info.chainId),
)

/** Sepolia is a testnet: it is selectable, but never part of "All chains". */
export const TESTNET_CHAIN_IDS = [11155111]
export const MAINNET_CHAIN_IDS = SUPPORTED_CHAIN_IDS.filter(
  (chainId) => !TESTNET_CHAIN_IDS.includes(chainId),
)

/** Chains a filter value covers: 'all' ("All chains") means every mainnet. */
export const scopeChains = (chain: ChainFilter): number[] =>
  chain === 'all' ? MAINNET_CHAIN_IDS : [chain]

export const chainInfo = (chainId: number) =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]

export const kindLabel = (kind: RegistryKind): string =>
  kind === 'light' ? 'Light' : kind === 'permanent' ? 'Stake' : 'Classic'

export const registryHref = (registry: DashboardRegistry) =>
  `/tcr/${registry.chainId}/${registry.address}`

export const validTrust = (value: string | null): TrustFilter =>
  value === 'verified' || value === 'unverified' ? value : 'all'

export const validKind = (value: string | null): KindFilter =>
  value === 'classic' || value === 'light' || value === 'permanent'
    ? value
    : 'all'

export const validSort = (value: string | null): RegistrySort =>
  value === 'activity' || value === 'items' || value === 'recent'
    ? value
    : 'signal'

export const validChain = (value: string | null): ChainFilter =>
  value && SUPPORTED_CHAIN_IDS.includes(Number(value)) ? Number(value) : 'all'

/**
 * Every entry a list holds, the figure its registry page shows. Light
 * lists count settled entries in `itemCount` and the ones with an open
 * request in `pendingCount`; Classic (`numberOfItems`) and Stake (submitted,
 * absent and disputed) already count every entry in `itemCount`.
 */
export const entryCount = (registry: DashboardRegistry): number =>
  registry.kind === 'light'
    ? registry.itemCount + registry.pendingCount
    : registry.itemCount

/*
 * Challenge windows. A Light or Classic request can be challenged while
 * now <= submissionTime + its list's challengePeriodDuration (the
 * contracts' own check, against the list's current period); past that it
 * only waits to be executed. Periods are read on chain (data.ts).
 */

/** True when every row's list period is known, so each can be placed. */
export const rowsPlaced = (
  rows: UnchallengedRow[],
  periods: Record<string, number> | undefined,
): boolean =>
  !!periods &&
  rows.every((row) => row.submittedAt > 0 && periods[row.registry] >= 0)

/** The rows still inside their window at `now`, closing soonest first. */
export const openWindows = (
  rows: UnchallengedRow[],
  periods: Record<string, number>,
  now: number,
): { row: UnchallengedRow; closes: number }[] =>
  rows
    .filter((row) => periods[row.registry] >= 0 && row.submittedAt > 0)
    .map((row) => ({ row, closes: row.submittedAt + periods[row.registry] }))
    .filter(({ closes }) => now <= closes)
    .sort((a, b) => a.closes - b.closes || a.row.id.localeCompare(b.row.id))

/** True when a chain's unchallenged requests can all be placed in their windows. */
export const chainWindowsKnown = (
  data: DashboardData,
  chainId: number,
): boolean => {
  const rows = data.unchallengedRows?.[chainId] ?? []
  return rows.length === 0 || rowsPlaced(rows, data.challengePeriods?.[chainId])
}

/** True when a chain still misses a period or its closing-soon cards. */
export const windowsPending = (data: DashboardData, chainId: number): boolean =>
  (data.unchallengedRows?.[chainId]?.length ?? 0) > 0 &&
  (!chainWindowsKnown(data, chainId) || !data.closingSoon?.[chainId])

/**
 * Every figure the dashboard (and the landing page) shows for a scope of
 * chains, from one load of the data: one definition for both pages.
 * `now` (unix seconds) places unchallenged requests in their windows.
 */
export const scopedFigures = (
  data: DashboardData,
  chains: number[],
  now: number = Math.floor(Date.now() / 1000),
) => {
  const scoped = data.registries.filter((r) => chains.includes(r.chainId))
  let curators = 0
  let challenges = 0
  let decided = 0
  let won = 0
  for (const user of data.users) {
    let active = false
    for (const [id, stats] of Object.entries(user.chains))
      if (chains.includes(Number(id))) {
        active = true
        challenges += stats.challenges
        decided += stats.decidedChallenges
        won += stats.successfulChallenges
      }
    if (active) curators += 1
  }
  let unchallenged = 0
  let unchallengedCapped = false
  for (const chainId of chains) {
    unchallenged += data.unchallengedCount[chainId]?.count ?? 0
    unchallengedCapped ||= !!data.unchallengedCount[chainId]?.capped
  }
  /*
   * The unchallenged requests split by their challenge window: still open
   * (anyone can challenge and win the deposit) or past it (nobody can
   * challenge any more; they only wait to be executed). Only when every one
   * of them could be placed: otherwise the windows are unknown. The
   * deposits of the open ones are summed per chain (each in its own coin).
   */
  const windowsKnown = chains.every((chainId) =>
    chainWindowsKnown(data, chainId),
  )
  let inWindow = 0
  let pastWindow = 0
  const inWindowDeposits: Record<number, bigint> = {}
  if (windowsKnown)
    for (const chainId of chains) {
      const rows = data.unchallengedRows?.[chainId] ?? []
      const open = openWindows(
        rows,
        data.challengePeriods?.[chainId] ?? {},
        now,
      )
      inWindow += open.length
      pastWindow += rows.length - open.length
      for (const { row } of open)
        inWindowDeposits[chainId] =
          (inWindowDeposits[chainId] ?? 0n) + BigInt(row.deposit || '0')
    }
  return {
    registries: scoped.length,
    verified: scoped.filter((r) => r.trustStatus === 'verified').length,
    entries: scoped.reduce((sum, r) => sum + entryCount(r), 0),
    // Stake Curate has no requests (its counter is listed items).
    requestsOpen: scoped
      .filter((r) => r.kind !== 'permanent')
      .reduce((sum, r) => sum + r.pendingCount, 0),
    inCourt: data.openDisputes.filter((a) => chains.includes(a.chainId)).length,
    unchallenged,
    unchallengedCapped,
    windowsKnown,
    inWindow,
    pastWindow,
    inWindowDeposits,
    decidedCapped: chains.some((chainId) => data.decidedCapped[chainId]),
    curators,
    challenges,
    decided,
    won,
  }
}

/** The 30-day series summed over a scope of chains, oldest day first. */
export const scopedSeries = (
  data: DashboardData,
  chains: number[],
): DashboardDay[] =>
  data.series.map((day, index) => {
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

const signalScore = (registry: DashboardRegistry): number => {
  const trust = registry.trustStatus === 'verified' ? 100000 : 0
  const kind =
    registry.kind === 'light'
      ? 16000
      : registry.kind === 'classic'
        ? 12000
        : 7000
  const recent = registry.lastActivityAt
    ? Math.min(6000, registry.lastActivityAt / 1000000)
    : 0
  return (
    trust +
    kind +
    Math.min(registry.activeCount, 300) * 150 +
    Math.min(registry.pendingCount, 200) * 80 +
    Math.min(entryCount(registry), 12000) +
    recent
  )
}

/* Stake Curate has no requests: its "submitted" state is not an open request. */
const openRequests = (registry: DashboardRegistry) =>
  registry.kind === 'permanent' ? 0 : registry.pendingCount

export const sortRegistries = (
  registries: DashboardRegistry[],
  sort: RegistrySort,
): DashboardRegistry[] =>
  [...registries].sort((a, b) => {
    if (sort === 'items')
      return entryCount(b) - entryCount(a) || signalScore(b) - signalScore(a)
    if (sort === 'recent')
      return (
        (b.lastActivityAt || 0) - (a.lastActivityAt || 0) ||
        signalScore(b) - signalScore(a)
      )
    if (sort === 'activity')
      return (
        openRequests(b) - openRequests(a) ||
        b.disputeCount - a.disputeCount ||
        signalScore(b) - signalScore(a)
      )
    return signalScore(b) - signalScore(a)
  })

const includes = (needle: string, values: Array<string | number | undefined>) =>
  !needle ||
  values.some(
    (value) =>
      value !== undefined && String(value).toLowerCase().includes(needle),
  )

export const filterRegistries = (
  registries: DashboardRegistry[],
  filters: {
    chain: ChainFilter
    trust: TrustFilter
    kind: KindFilter
    search: string
  },
): DashboardRegistry[] => {
  const needle = filters.search.trim().toLowerCase()
  return registries.filter((registry) => {
    if (filters.chain !== 'all' && registry.chainId !== filters.chain)
      return false
    if (filters.trust !== 'all' && registry.trustStatus !== filters.trust)
      return false
    if (filters.kind !== 'all' && registry.kind !== filters.kind) return false
    return includes(needle, [
      registry.title,
      registry.description,
      registry.address,
      kindLabel(registry.kind),
      chainInfo(registry.chainId)?.name,
    ])
  })
}

/** One row of the Happening now board. */
export interface DashboardCard {
  id: string
  /** Registry logo (IPFS or http URL), shown as the row avatar. */
  logo?: string | null
  href: string
  registry: string
  /** List address (lowercase), to tell lists apart. */
  registryAddress: string
  identifiers: { label: string; value: string }[]
  chainId: number
  actor?: string
  /** "submitted 3h ago", "challenged 2 years ago" */
  when: string
  /** "Dispute", "Kept by ruling"; empty for none. */
  detail: string
  /** An identifier set in mono after the detail, e.g. "#1040". */
  detailId?: string
  tone: StatusTone
  /** Submission or removal request (Light and Classic). */
  request?: 'submission' | 'removal'
  /** The request's base deposit in wei: what a winning challenger takes. */
  deposit?: string
  /** The request's challenge window, when its list's period is known. */
  windowStart?: number
  windowEnd?: number
  /** When the row's event happened (unix seconds), for the time line. */
  at: number
}

const DAY = 86400

/** "3h ago", "12d 4h ago"; past two months "5 months ago", "2 years ago". */
export const formatAgoLong = (timestamp: number, now: number): string => {
  const days = Math.floor((now - timestamp) / DAY)
  if (days < 60) return formatAgo(timestamp, now)
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  const years = Math.floor(days / 365)
  return years === 1 ? 'a year ago' : `${years} years ago`
}

const toCard = (
  activity: DashboardActivity,
  now: number,
  verb: string,
  detail: string = activity.status,
  window?: { start: number; end: number },
): DashboardCard => ({
  id: activity.id,
  href: activity.href,
  registry: activity.registryTitle,
  registryAddress: activity.registryAddress,
  identifiers: activity.previewProps ?? [],
  chainId: activity.chainId,
  actor: activity.actor,
  when: `${verb} ${formatAgoLong(activity.timestamp, now)}`,
  at: activity.timestamp,
  detail,
  request: activity.requestType,
  deposit: activity.deposit,
  windowStart: window?.start,
  windowEnd: window?.end,
  tone:
    activity.kind === 'resolution'
      ? activity.outcome === 'registered' || activity.outcome === 'kept'
        ? 'registered'
        : activity.outcome === 'no-ruling'
          ? 'neutral'
          : 'off'
      : activity.kind === 'challenge'
        ? 'contested'
        : 'window',
})

/** A list that holds open requests, with how many. */
export interface OpenList {
  chainId: number
  registry: string
  count: number
}

/**
 * The board, all in the page's chain scope:
 *  - open: when every window is known, the requests still inside their
 *    challenge window, closing soonest first, as far as the loaded cards
 *    keep that order exact; otherwise the newest unchallenged requests,
 *    with no claim about their window.
 *  - openLists: every list holding those requests, most first (the whole
 *    count, not only the loaded cards).
 *  - live: every dispute open right now.
 *  - decided: every ruling in the 30-day window.
 */
export const buildBoard = (
  data: DashboardData,
  now: number,
  chains: number[],
) => {
  const inScope = (activity: DashboardActivity) =>
    chains.includes(activity.chainId)
  const unique = () => {
    const seen = new Set<string>()
    return (activity: DashboardActivity) => {
      if (seen.has(activity.id)) return false
      seen.add(activity.id)
      return true
    }
  }
  const verb = (activity: DashboardActivity) =>
    activity.requestType === 'removal' ? 'removal asked' : 'submitted'
  const windowsKnown = chains.every((chainId) =>
    chainWindowsKnown(data, chainId),
  )

  let open: DashboardCard[]
  if (windowsKnown) {
    const placed = chains.map((chainId) => {
      const periods = data.challengePeriods?.[chainId] ?? {}
      const soon = data.closingSoon?.[chainId]
      const cards = (
        soon ?? data.unchallenged.filter((a) => a.chainId === chainId)
      )
        .filter(unique())
        .map((activity) => {
          const period = periods[activity.registryAddress]
          return {
            activity,
            start: activity.timestamp,
            end: period >= 0 ? activity.timestamp + period : -1,
          }
        })
        .filter(({ start, end }) => start > 0 && now <= end)
      const total = openWindows(
        data.unchallengedRows?.[chainId] ?? [],
        periods,
        now,
      ).length
      // Past the last loaded card a chain may close others first: rows
      // from other chains stop there, so the order shown stays exact.
      const bound =
        soon && total > cards.length && cards.length > 0
          ? Math.max(...cards.map(({ end }) => end))
          : Infinity
      return { cards, bound }
    })
    const cutoff = Math.min(...placed.map(({ bound }) => bound))
    open = placed
      .flatMap(({ cards }) => cards)
      .filter(({ end }) => end <= cutoff)
      .sort((a, b) => a.end - b.end)
      .map(({ activity, start, end }) =>
        toCard(activity, now, verb(activity), '', { start, end }),
      )
  } else
    open = data.unchallenged
      .filter(inScope)
      .filter(unique())
      .map((activity) => toCard(activity, now, verb(activity), ''))

  const byList = new Map<string, OpenList>()
  for (const chainId of chains) {
    const rows = data.unchallengedRows?.[chainId] ?? []
    const counted = windowsKnown
      ? openWindows(rows, data.challengePeriods?.[chainId] ?? {}, now).map(
          ({ row }) => row,
        )
      : rows
    for (const row of counted) {
      const key = `${chainId}:${row.registry}`
      const list = byList.get(key) ?? {
        chainId,
        registry: row.registry,
        count: 0,
      }
      list.count += 1
      byList.set(key, list)
    }
  }
  const openLists = [...byList.values()].sort((a, b) => b.count - a.count)

  const live = data.openDisputes
    .filter(inScope)
    .filter(unique())
    .map((activity) => ({
      ...toCard(activity, now, 'challenged', 'Dispute'),
      detailId: activity.disputeID ? `#${activity.disputeID}` : undefined,
    }))
  const rulings = data.decided
    .filter(inScope)
    .filter((activity) => activity.kind === 'resolution')
    .filter(unique())
    .map((activity) => toCard(activity, now, 'decided'))
  return { open, openLists, windowsKnown, live, decided: rulings }
}
