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
  createdAt?: number
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
      successfulChallenges: number
      lastActiveAt: number
    }
  >
  submissions: number
  removals: number
  challenges: number
  successfulChallenges: number
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

/** One UTC day of request activity (last 30 days, all chains). */
export interface DashboardDay {
  /** Unix seconds at 00:00 UTC */
  day: number
  submissions: number
  removals: number
  challenges: number
}

export interface DashboardData {
  generatedAt: number
  /** Daily requests over the last 30 days, oldest first. */
  series: DashboardDay[]
  /** True when the 30-day page budget was exhausted on some chain. */
  seriesTruncated: boolean
  registries: DashboardRegistry[]
  activities: DashboardActivity[]
  disputes: DashboardActivity[]
  users: DashboardUser[]
  metrics: DashboardMetrics
}
