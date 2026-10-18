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
    Math.min(registry.itemCount, 12000) +
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
      return b.itemCount - a.itemCount || signalScore(b) - signalScore(a)
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
): BoardCard => ({
  id: activity.id,
  href: activity.href,
  registry: activity.registryTitle,
  identifiers: activity.previewProps ?? [],
  chainId: activity.chainId,
  actor: activity.actor,
  when: `${verb} ${formatAgo(activity.timestamp, now)}`,
  detail: activity.status,
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
 * The three attention columns. The dashboard query does not return each
 * registry's challengePeriodDuration, so "window open" cards show when the
 * request was made; the exact countdown lives on the registry and item pages.
 */
export const buildBoard = (
  activities: DashboardActivity[],
  disputes: DashboardActivity[],
  openDisputes: DashboardActivity[],
  now: number,
  chains: number[],
) => {
  const inScope = (activity: DashboardActivity) =>
    chains.includes(activity.chainId)
  const seen = new Set<string>()
  const unique = (activity: DashboardActivity) => {
    const key = activity.href
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }
  const windowOpen = activities
    .filter(inScope)
    .filter(
      (activity) =>
        (activity.kind === 'submission' || activity.kind === 'removal') &&
        activity.itemID,
    )
    .filter(unique)
    .map((activity) =>
      toCard(
        {
          ...activity,
          status:
            activity.kind === 'removal'
              ? 'removal · window open'
              : 'window open',
        },
        now,
        activity.kind === 'removal' ? 'removal asked' : 'submitted',
      ),
    )
  // Every dispute that is open right now, not only the latest ones.
  const inCourt = openDisputes
    .filter(inScope)
    .filter(unique)
    .map((activity) => toCard(activity, now, 'challenged'))
  const decided = disputes
    .filter(inScope)
    .filter((activity) => activity.kind === 'resolution')
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(unique)
    .map((activity) => toCard(activity, now, 'decided'))
  return { windowOpen, inCourt, decided }
}
