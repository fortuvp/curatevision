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
  actor?: string
  secondaryActor?: string
  kind: 'submission' | 'removal' | 'challenge' | 'resolution'
  status: string
  timestamp: number
  href: string
}

export interface DashboardUser {
  address: string
  chainId: number
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

export interface DashboardData {
  generatedAt: number
  registries: DashboardRegistry[]
  activities: DashboardActivity[]
  disputes: DashboardActivity[]
  users: DashboardUser[]
  metrics: DashboardMetrics
}
