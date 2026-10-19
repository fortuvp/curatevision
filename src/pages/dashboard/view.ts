import { NETWORKS_INFO } from 'config/networks'
import type { BoardCard } from 'components/curate/status-board'
import { formatAgo } from 'utils/time'
import type {
  DashboardActivity,
  DashboardRegistry,
  RegistryKind,
} from './types'

/* Pure view helpers for the dashboard: filters, sorts and board mapping. */

export type ChainFilter = 'all' | number
export type TrustFilter = 'all' | 'verified' | 'unverified'
export type KindFilter = 'all' | RegistryKind
export type RegistrySort = 'signal' | 'activity' | 'items' | 'recent'

export const SUPPORTED_CHAIN_IDS = Object.values(NETWORKS_INFO).map((info) =>
  Number(info.chainId),
)

/** Sepolia is a testnet: it is selectable, but never part of "all". */
export const TESTNET_CHAIN_IDS = [11155111]
export const MAINNET_CHAIN_IDS = SUPPORTED_CHAIN_IDS.filter(
  (chainId) => !TESTNET_CHAIN_IDS.includes(chainId),
)

/** Chains a filter value covers: 'all' means every mainnet. */
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

const toCard = (
  activity: DashboardActivity,
  now: number,
  verb: string,
  detail: string = activity.status,
): BoardCard => ({
  id: activity.id,
  href: activity.href,
  registry: activity.registryTitle,
  identifiers: activity.previewProps ?? [],
  chainId: activity.chainId,
  actor: activity.actor,
  when: `${verb} ${formatAgo(activity.timestamp, now)}`,
  detail,
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

/**
 * The three attention columns, all in the page's chain scope:
 *  - unchallenged: unresolved requests nobody has challenged. The indexer
 *    has no challenge period, so a card never claims its window is still
 *    open (the item page has the countdown); some may be waiting to be
 *    executed.
 *  - in court: every dispute open right now.
 *  - decided: every ruling in the 30-day window.
 */
export const buildBoard = (
  unchallenged: DashboardActivity[],
  decided: DashboardActivity[],
  openDisputes: DashboardActivity[],
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
  const open = unchallenged
    .filter(inScope)
    .filter(unique())
    .map((activity) =>
      toCard(
        activity,
        now,
        activity.kind === 'removal' ? 'removal asked' : 'submitted',
        '',
      ),
    )
  const inCourt = openDisputes
    .filter(inScope)
    .filter(unique())
    .map((activity) => ({
      ...toCard(activity, now, 'challenged', 'Dispute'),
      detailId: activity.disputeID ? `#${activity.disputeID}` : undefined,
    }))
  const rulings = decided
    .filter(inScope)
    .filter((activity) => activity.kind === 'resolution')
    .filter(unique())
    .map((activity) => toCard(activity, now, 'decided'))
  return { open, inCourt, decided: rulings }
}
