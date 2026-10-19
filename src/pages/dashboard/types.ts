export type RegistryKind = 'classic' | 'light' | 'permanent'
export type TrustStatus = 'verified' | 'unverified' | 'unknown'

export interface DashboardRegistry {
  id: string
  address: string
  chainId: number
  kind: RegistryKind
  title: string
  description?: string
  logoURI?: string
  metadataURI?: string
  itemCount: number
  activeCount: number
  pendingCount: number
  disputeCount: number
  bountyWei?: string
  token?: string
  arbitratorExtraData?: string
  metaEvidenceURI?: string
  /** Unix seconds. Exact when read from the factory event, see createdAtExact. */
  createdAt?: number
  /** True when createdAt is the list's creation block, false when it is only its first request. */
  createdAtExact?: boolean
  lastActivityAt?: number
  trustStatus: TrustStatus
}

export interface DashboardActivity {
  id: string
  chainId: number
  registryAddress: string
  registryTitle: string
  itemID?: string
  previewProps?: { label: string; value: string }[]
  actor?: string
  secondaryActor?: string
  kind: 'submission' | 'removal' | 'challenge' | 'resolution'
  /** Which request the activity belongs to; drives the outcome wording. */
  requestType?: 'submission' | 'removal'
  /** Court outcome once a dispute is resolved (kind 'resolution'). */
  outcome?: 'kept' | 'registered' | 'removed' | 'rejected' | 'no-ruling'
  disputeID?: string
  status: string
  timestamp: number
  href: string
}

export interface DashboardUser {
  address: string
  chainId: number
  chains: Record<
    number,
    {
      activity: number
      submissions: number
      removals: number
      challenges: number
      /** Challenges the court has ruled on (or refused to). */
      decidedChallenges: number
      successfulChallenges: number
      lastActiveAt: number
    }
  >
  submissions: number
  removals: number
  challenges: number
  decidedChallenges: number
  successfulChallenges: number
  /** Requests plus challenges (a won challenge is not counted again). */
  activity: number
  lastActiveAt: number
}

export interface DashboardMetrics {
  registries: number
  verifiedRegistries: number
  curatedItems: number
  activeVerification: number
  disputes: number
  curators: number
  bountyByChain: Record<number, string>
}

/** One UTC day of request activity (the 30-day window, all chains). */
export interface DashboardDay {
  /** Unix seconds at 00:00 UTC */
  day: number
  submissions: number
  removals: number
  challenges: number
}

export interface DashboardData {
  generatedAt: number
  /** Chains where a query failed or timed out: their figures are partial. */
  failedChains: number[]
  /** Start of the 30-day window (unix seconds, 00:00 UTC of the first day). */
  since: number
  /** Daily requests over the window, oldest first; the last day is today so far. */
  series: DashboardDay[]
  /** The same series per chain id. */
  seriesByChain: Record<number, DashboardDay[]>
  /** True when the 30-day page budget was exhausted on some chain. */
  seriesTruncated: boolean
  registries: DashboardRegistry[]
  /** Latest requests per chain (and Stake submissions), newest first, whatever their state. */
  activities: DashboardActivity[]
  /** Unresolved requests nobody has challenged, newest first (cards only: capped per chain). */
  unchallenged: DashboardActivity[]
  /** Per chain: unresolved requests with no challenge, and whether the count hit the query cap. */
  unchallengedCount: Record<number, { count: number; capped: boolean }>
  /** Every ruling in the window, newest first. */
  decided: DashboardActivity[]
  /** Per chain: true when the rulings query hit its row limit. */
  decidedCapped: Record<number, boolean>
  /** Every dispute open right now (disputed and not yet resolved). */
  openDisputes: DashboardActivity[]
  users: DashboardUser[]
  metrics: DashboardMetrics
}
