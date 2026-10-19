import { NETWORKS_INFO } from 'config/networks'
import { VERIFIED_LIST_OF_LISTS_ADDRESSES } from 'config/list-of-lists'
import { parseIpfs } from 'utils/ipfs-parse'
import type {
  DashboardActivity,
  DashboardRegistry,
  RegistryKind,
} from 'pages/dashboard/types'
import type { StatusTone } from 'components/curate/primitives'
import { TESTNET_CHAIN_IDS } from 'pages/dashboard/view'

/*
 * Pure view helpers for /browse: URL parameter parsing, filters, sorts and
 * the links a registry row needs. Nothing here fetches or invents data.
 */

export type TrustMode = 'verified' | 'unverified'
export type BrowseSort =
  | 'recent-submission'
  | 'recent-creation'
  | 'activity'
  | 'items'
  | 'disputes'
  | 'name'

export const PAGE_SIZE = 15

/**
 * The creation date a row may show: only while sorting by newest, and only
 * when it is the list's real creation block (the factory event), not its
 * first request.
 */
export const shownCreation = (
  registry: DashboardRegistry,
  sort: BrowseSort,
): number | null =>
  sort === 'recent-creation' && registry.createdAtExact && registry.createdAt
    ? registry.createdAt
    : null

export const SUPPORTED_CHAIN_IDS = Object.values(NETWORKS_INFO).map((info) =>
  Number(info.chainId),
)

export const chainInfo = (chainId: number) =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]

export const chainName = (chainId: number): string =>
  chainInfo(chainId)?.name ?? `Chain ${chainId}`

const listFormat = new Intl.ListFormat('en-GB', {
  style: 'long',
  type: 'conjunction',
})

const isTestnet = (chainId: number) => TESTNET_CHAIN_IDS.includes(chainId)

/** The chains a `chain` filter covers: none chosen means every chain. */
export const scopeChainIds = (chains: number[]): number[] =>
  chains.length === 0 ? SUPPORTED_CHAIN_IDS : chains

/** A chain's name, marked as a testnet where it is one ("Sepolia testnet"). */
const scopeName = (chainId: number): string =>
  isTestnet(chainId) ? `${chainName(chainId)} testnet` : chainName(chainId)

/** "Ethereum, Gnosis and Sepolia testnet" for no chain filter, else the chosen chains. */
export const scopeText = (chains: number[]): string =>
  listFormat.format(scopeChainIds(chains).map(scopeName))

/**
 * What a share of registries is a share of: "of 390 registries · incl.
 * Sepolia testnet" when a testnet is in scope next to mainnets, so the figure
 * is not mistaken for the mainnet share the home page shows.
 */
export const shareCaption = (total: number, chains: number[]): string => {
  const scoped = scopeChainIds(chains)
  const testnets = scoped.filter(isTestnet)
  const count = `of ${new Intl.NumberFormat('en-US').format(total)} ${
    total === 1 ? 'registry' : 'registries'
  }`
  if (testnets.length === 0) return count
  const names = listFormat.format(testnets.map(scopeName))
  return testnets.length === scoped.length
    ? `${count} on ${names}`
    : `${count} · incl. ${names}`
}

/** Chains that have a Kleros Verified list of lists a registry can be submitted to. */
export const VERIFICATION_CHAIN_IDS = Object.keys(
  VERIFIED_LIST_OF_LISTS_ADDRESSES,
).map(Number)

export const kindLabel = (kind: RegistryKind): string =>
  kind === 'light' ? 'Light' : kind === 'permanent' ? 'Stake' : 'Classic'

export const registryHref = (registry: DashboardRegistry): string =>
  `/tcr/${registry.chainId}/${registry.address}`

/** Submission form of the chain's Kleros Verified list of lists, or null. */
export const verificationHref = (chainId: number): string | null => {
  const address =
    VERIFIED_LIST_OF_LISTS_ADDRESSES[
      chainId as keyof typeof VERIFIED_LIST_OF_LISTS_ADDRESSES
    ]
  return address ? `/tcr/${chainId}/${address}/submit` : null
}

export const mediaUrl = (uri?: string | null): string | null => {
  if (!uri) return null
  return /^https?:\/\//i.test(uri) ? uri : parseIpfs(uri)
}

/* ---------- URL parameters ---------- */

/** `chain` is a comma-separated list of chain ids; unknown ids are ignored. */
export const parseChains = (value: string | null): number[] =>
  (value ?? '')
    .split(',')
    .map(Number)
    .filter((chainId) => SUPPORTED_CHAIN_IDS.includes(chainId))

export const parseTrust = (value: string | null): TrustMode =>
  value === 'unverified' ? 'unverified' : 'verified'

const isKind = (value: string): value is RegistryKind =>
  value === 'classic' || value === 'light' || value === 'permanent'

export const KIND_OPTIONS: { value: RegistryKind; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'classic', label: 'Classic' },
  { value: 'permanent', label: 'Stake' },
]

/** `kind` is a comma-separated list of registry types; none means every type. */
export const parseKinds = (value: string | null): RegistryKind[] => [
  ...new Set((value ?? '').split(',').filter(isKind)),
]

/** The `kind` list with one type added or removed. */
export const toggleKind = (
  kinds: RegistryKind[],
  kind: RegistryKind,
): RegistryKind[] =>
  kinds.includes(kind)
    ? kinds.filter((value) => value !== kind)
    : [...kinds, kind]

/**
 * Every entry a registry holds, whatever its status, so the figure matches
 * the registry page's own "Entries". Light lists report registered and absent
 * entries in `itemCount` and their entries with an open request in
 * `pendingCount`; Classic (`numberOfItems`) and Stake (submitted plus absent)
 * already count every entry in `itemCount`.
 */
export const entryCount = (registry: DashboardRegistry): number =>
  registry.kind === 'light'
    ? registry.itemCount + registry.pendingCount
    : registry.itemCount

/**
 * What a registry's `pendingCount` counts: open requests for Light and
 * Classic lists, but the entries currently listed for Stake lists (the
 * subgraph's numberOfSubmitted), which are not requests.
 */
export const pendingLabel = (kind: RegistryKind): string =>
  kind === 'permanent' ? 'Listed' : 'Open requests'

export const SORT_OPTIONS: { value: BrowseSort; label: string }[] = [
  { value: 'recent-submission', label: 'Latest activity' },
  { value: 'recent-creation', label: 'Newest lists' },
  { value: 'activity', label: 'Most active' },
  { value: 'items', label: 'Most entries' },
  { value: 'disputes', label: 'Most in court' },
  { value: 'name', label: 'Name A to Z' },
]

export const parseSort = (value: string | null): BrowseSort =>
  SORT_OPTIONS.some((option) => option.value === value)
    ? (value as BrowseSort)
    : 'recent-submission'

export const parsePage = (value: string | null): number =>
  Math.max(1, Math.floor(Number(value)) || 1)

/* ---------- Filters and sorts ---------- */

const includes = (needle: string, values: Array<string | number | undefined>) =>
  !needle ||
  values.some(
    (value) =>
      value !== undefined && String(value).toLowerCase().includes(needle),
  )

export const filterRegistries = (
  registries: DashboardRegistry[],
  filters: {
    chains: number[]
    trust: TrustMode
    kinds: RegistryKind[]
    search: string
  },
): DashboardRegistry[] => {
  const needle = filters.search.trim().toLowerCase()
  return registries.filter((registry) => {
    if (filters.chains.length > 0 && !filters.chains.includes(registry.chainId))
      return false
    if (filters.trust === 'verified' && registry.trustStatus !== 'verified')
      return false
    if (filters.trust === 'unverified' && registry.trustStatus === 'verified')
      return false
    if (filters.kinds.length > 0 && !filters.kinds.includes(registry.kind))
      return false
    return includes(needle, [
      registry.title,
      registry.description,
      registry.address,
      kindLabel(registry.kind),
      chainInfo(registry.chainId)?.name,
    ])
  })
}

export const sortRegistries = (
  registries: DashboardRegistry[],
  sort: BrowseSort,
): DashboardRegistry[] =>
  [...registries].sort((a, b) => {
    if (sort === 'activity')
      return (
        b.activeCount - a.activeCount ||
        (b.lastActivityAt || 0) - (a.lastActivityAt || 0)
      )
    if (sort === 'items') return entryCount(b) - entryCount(a)
    if (sort === 'disputes')
      return b.disputeCount - a.disputeCount || b.activeCount - a.activeCount
    if (sort === 'name') return a.title.localeCompare(b.title)
    if (sort === 'recent-creation')
      return (
        (b.createdAt || 0) - (a.createdAt || 0) ||
        (b.lastActivityAt || 0) - (a.lastActivityAt || 0) ||
        entryCount(b) - entryCount(a)
      )
    return (
      (b.lastActivityAt || 0) - (a.lastActivityAt || 0) ||
      b.activeCount - a.activeCount ||
      entryCount(b) - entryCount(a)
    )
  })

/**
 * Counts for the chain scope the app bar chose; every figure is a sum of the
 * data. Stake lists are left out of openRequests because their pendingCount
 * is the entries currently listed, not requests.
 */
export const summarize = (
  registries: DashboardRegistry[],
  chains: number[],
) => {
  const scoped =
    chains.length === 0
      ? registries
      : registries.filter((registry) => chains.includes(registry.chainId))
  return {
    verified: scoped.filter((registry) => registry.trustStatus === 'verified')
      .length,
    discovery: scoped.filter((registry) => registry.trustStatus !== 'verified')
      .length,
    entries: scoped.reduce((sum, registry) => sum + entryCount(registry), 0),
    openRequests: scoped.reduce(
      (sum, registry) =>
        registry.kind === 'permanent' ? sum : sum + registry.pendingCount,
      0,
    ),
  }
}

export const activityTone = (activity: DashboardActivity): StatusTone =>
  activity.kind === 'challenge'
    ? 'contested'
    : activity.kind === 'resolution'
      ? activity.outcome === 'registered' || activity.outcome === 'kept'
        ? 'registered'
        : activity.outcome === 'no-ruling'
          ? 'neutral'
          : 'off'
      : 'window'
