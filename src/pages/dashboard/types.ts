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
  /**
   * The request's base deposit in wei (Light and Classic): what a winning
   * challenger takes, on top of getting their own deposit back.
   */
  deposit?: string
  status: string
  timestamp: number
  href: string
}

/** An unresolved request nobody has challenged (Light and Classic). */
export interface UnchallengedRow {
  id: string
  /** List address, lowercase. */
  registry: string
  /** Unix seconds. */
  submittedAt: number
  /** Base deposit in wei. */
  deposit: string
  kind: 'light' | 'classic'
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
  /** Per chain: every unresolved request with no challenge (up to the count's cap). */
  unchallengedRows: Record<number, UnchallengedRow[]>
  /**
   * Per chain, each list's challenge period in seconds, read on chain (the
   * indexers do not store it), by lowercase list address. A chain is absent
   * when its periods were not read (the landing page skips them) or the
   * read ran out of time; a list is absent when its period did not load.
   */
  challengePeriods: Record<number, Record<string, number>>
  /**
   * Per chain, the cards of the requests whose challenge window closes
   * soonest (still open when the data loaded), closing order. Present only
   * when every period on the chain loaded and the cards were read.
   */
  closingSoon: Record<number, DashboardActivity[]>
  /** Every ruling in the window, newest first. */
  decided: DashboardActivity[]
  /** Per chain: true when the rulings query hit its row limit. */
  decidedCapped: Record<number, boolean>
  /** Every dispute open right now (disputed and not yet resolved). */
  openDisputes: DashboardActivity[]
  users: DashboardUser[]
  metrics: DashboardMetrics
}
