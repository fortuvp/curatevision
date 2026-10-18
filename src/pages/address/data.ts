import { gql, request } from 'graphql-request'
import { readContract } from '@wagmi/core'
import { erc20Abi, type Abi } from 'viem'
import classicAbi from 'assets/abis/GeneralizedTCR.json'
import lightAbi from 'assets/abis/LightGeneralizedTCR.json'
import permanentAbi from 'assets/abis/PermanentGTCR.json'
import { NETWORKS, NETWORKS_INFO } from 'config/networks'
import { subgraphUrl, subgraphUrlPermanent } from 'config/tcr-addresses'
import { wagmiConfig } from 'config/wagmi'
import {
  buildActivityHref,
  fetchDashboardData,
  normalizeAddress,
  shortAddress,
  ZERO_ADDRESS,
} from 'pages/dashboard/data'
import {
  DashboardActivity,
  DashboardRegistry,
  RegistryKind,
} from 'pages/dashboard/types'

const PROFILE_QUERY_TIMEOUT_MS = 10_000
/** Requests read per chain and registry type; the figures count these. */
export const PROFILE_LIMIT = 420
/** Most recent actions and disputes kept for the lists. */
export const ACTIVITY_LIMIT = 120
export const DISPUTE_LIMIT = 80
const GOVERNANCE_SCAN_LIMIT = 240
export const SUPPORTED_CHAIN_IDS = [
  NETWORKS.ethereum,
  NETWORKS.gnosis,
  NETWORKS.sepolia,
]

const ENVIO_PROFILE_QUERY = gql`
  query EnvioProfile($chainId: Int!, $address: String!, $limit: Int!) {
    lightRequests: LRequest(
      limit: $limit
      where: {
        chainId: { _eq: $chainId }
        _or: [
          { requester: { _eq: $address } }
          { challenger: { _eq: $address } }
        ]
      }
      order_by: [{ submissionTime: desc }]
    ) {
      id
      chainId
      registry_id
      requestType
      requester
      challenger
      deposit
      disputeID
      disputed
      resolved
      disputeOutcome
      submissionTime
      challengeTime
      resolutionTime
      registry {
        title
      }
    }
    classicRequests: Request(
      limit: $limit
      where: {
        chainId: { _eq: $chainId }
        _or: [
          { requester: { _eq: $address } }
          { challenger: { _eq: $address } }
        ]
      }
      order_by: [{ submissionTime: desc }]
    ) {
      id
      chainId
      registry_id
      requestType
      requester
      challenger
      deposit
      disputeID
      disputed
      resolved
      disputeOutcome
      submissionTime
      resolutionTime
    }
  }
`

const PERMANENT_PROFILE_QUERY = gql`
  query PermanentProfile($address: String!, $first: Int!) {
    submissions(
      first: $first
      where: { submitter: $address }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      createdAt
      submitter
      item {
        itemID
        registry {
          id
        }
      }
    }
    challenges(
      first: $first
      where: { challenger: $address }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      createdAt
      challenger
      disputeID
      disputeOutcome
      resolutionTime
      challengerStake
      item {
        itemID
        registry {
          id
        }
      }
    }
  }
`

export interface AddressBadge {
  id: 'librarian' | 'sheriff' | 'maintainer'
  label: string
  description: string
  earned: boolean
  progress: number
  goal: number
}

export interface AddressStats {
  submissions: number
  removals: number
  challenges: number
  successfulChallenges: number
  disputes: number
  itemsChallenged: number
  governedLists: number
  activity: number
}

export interface GovernanceParams {
  governor?: string
  arbitrator?: string
  arbitratorExtraData?: string
  relayerContract?: string
  connectedTCR?: string
  metaEvidenceUpdates?: string
  metaEvidenceURI?: string
  submissionBaseDeposit?: string
  submissionChallengeBaseDeposit?: string
  removalBaseDeposit?: string
  removalChallengeBaseDeposit?: string
  challengePeriodDuration?: string
  submissionMinDeposit?: string
  submissionPeriod?: string
  reinclusionPeriod?: string
  withdrawingPeriod?: string
  challengeStakeMultiplier?: string
  winnerStakeMultiplier?: string
  loserStakeMultiplier?: string
  sharedStakeMultiplier?: string
  tokenSymbol?: string
}

export interface GovernedRegistry extends DashboardRegistry {
  governor?: string
  params?: GovernanceParams
}

/**
 * An action together with the request state the indexers carry for it. The
 * profile derives the status dot from these fields, never from the action
 * kind alone, so the dot only claims what the data knows.
 */
export interface ProfileActivity extends DashboardActivity {
  /** The request was challenged and sent to court. */
  disputed?: boolean
  /** The request executed or the court ruled; false while it is pending. */
  resolved?: boolean
  /** Ruling once resolved: Accept favors the requester, Reject the challenger, None is no ruling. */
  disputeOutcome?: string
}

export interface AddressProfileData {
  address: string
  generatedAt: number
  stats: AddressStats
  badges: AddressBadge[]
  activities: ProfileActivity[]
  disputes: ProfileActivity[]
  governedRegistries: GovernedRegistry[]
  chainBreakdown: Record<number, AddressStats>
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const emptyStats = (): AddressStats => ({
  submissions: 0,
  removals: 0,
  challenges: 0,
  successfulChallenges: 0,
  disputes: 0,
  itemsChallenged: 0,
  governedLists: 0,
  activity: 0,
})

const addStats = (target: AddressStats, source: Partial<AddressStats>) => {
  target.submissions += source.submissions ?? 0
  target.removals += source.removals ?? 0
  target.challenges += source.challenges ?? 0
  target.successfulChallenges += source.successfulChallenges ?? 0
  target.disputes += source.disputes ?? 0
  target.itemsChallenged += source.itemsChallenged ?? 0
  target.governedLists += source.governedLists ?? 0
  target.activity += source.activity ?? 0
}

const registryTitle = (
  address: string,
  title?: string | null,
  kind?: RegistryKind,
) => {
  if (title && title.trim() && title.trim() !== '-') return title.trim()
  if (kind === 'permanent') return `Permanent registry ${shortAddress(address)}`
  return `Registry ${shortAddress(address)}`
}

const safeRequest = async <T>(
  url: string | undefined,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | null> => {
  if (!url) return null
  try {
    return await Promise.race([
      request<T>(url, query, variables),
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), PROFILE_QUERY_TIMEOUT_MS),
      ),
    ])
  } catch (err) {
    console.warn('Address profile query failed', err)
    return null
  }
}

const requestToActivity = (
  requestEntity: any,
  kind: RegistryKind,
  address: string,
): { activity: ProfileActivity; stats: Partial<AddressStats> } => {
  const chainId = toNumber(requestEntity.chainId)
  const registryAddress = normalizeAddress(requestEntity.registry_id)
  const itemID = requestEntity.id?.split('@')?.[0]
  const requester = normalizeAddress(requestEntity.requester)
  const challenger = normalizeAddress(requestEntity.challenger)
  const isRequester = requester === address
  const isChallenger = challenger === address && challenger !== ZERO_ADDRESS
  const isRemoval = requestEntity.requestType === 'ClearingRequested'
  const timestamp =
    (isChallenger && toNumber(requestEntity.challengeTime)) ||
    toNumber(requestEntity.submissionTime) ||
    toNumber(requestEntity.resolutionTime)
  const disputed = Boolean(requestEntity.disputed)

  const stats: Partial<AddressStats> = { activity: 1 }
  if (isRequester && isRemoval) stats.removals = 1
  if (isRequester && !isRemoval) stats.submissions = 1
  if (isChallenger) {
    stats.challenges = 1
    stats.itemsChallenged = 1
  }
  if (disputed) stats.disputes = 1
  if (isChallenger && requestEntity.disputeOutcome === 'Reject')
    stats.successfulChallenges = 1

  return {
    activity: {
      id: `profile-${kind}-${requestEntity.id}`,
      chainId,
      registryAddress,
      registryTitle: registryTitle(
        registryAddress,
        requestEntity.registry?.title,
        kind,
      ),
      itemID,
      actor: requester,
      secondaryActor: challenger,
      kind: isChallenger ? 'challenge' : isRemoval ? 'removal' : 'submission',
      status: isChallenger
        ? `Challenged dispute #${requestEntity.disputeID || 'pending'}`
        : isRemoval
          ? 'Requested removal'
          : 'Submitted entry',
      timestamp,
      href: buildActivityHref(chainId, registryAddress, itemID),
      disputed,
      resolved: Boolean(requestEntity.resolved),
      disputeOutcome: requestEntity.disputeOutcome ?? undefined,
    },
    stats,
  }
}

const permanentSubmissionToActivity = (
  submission: any,
  chainId: number,
): ProfileActivity => {
  const registryAddress = normalizeAddress(submission.item?.registry?.id)
  return {
    id: `profile-permanent-submission-${chainId}-${submission.id}`,
    chainId,
    registryAddress,
    registryTitle: registryTitle(registryAddress, null, 'permanent'),
    itemID: submission.item?.itemID,
    actor: normalizeAddress(submission.submitter),
    kind: 'submission',
    status: 'Submitted permanent entry',
    timestamp: toNumber(submission.createdAt),
    href: buildActivityHref(chainId, registryAddress, submission.item?.itemID),
  }
}

const permanentChallengeToActivity = (
  challenge: any,
  chainId: number,
): ProfileActivity => {
  const registryAddress = normalizeAddress(challenge.item?.registry?.id)
  // The permanent subgraph sets disputeOutcome (and resolutionTime) only
  // once the court has ruled; before that the dispute is open.
  const resolved =
    Boolean(challenge.disputeOutcome) || toNumber(challenge.resolutionTime) > 0
  return {
    id: `profile-permanent-challenge-${chainId}-${challenge.id}`,
    chainId,
    registryAddress,
    registryTitle: registryTitle(registryAddress, null, 'permanent'),
    itemID: challenge.item?.itemID,
    actor: normalizeAddress(challenge.challenger),
    kind: 'challenge',
    status: `Challenged dispute #${challenge.disputeID || 'pending'}`,
    timestamp: toNumber(challenge.createdAt),
    href: buildActivityHref(chainId, registryAddress, challenge.item?.itemID),
    disputed: true,
    resolved,
    disputeOutcome: challenge.disputeOutcome ?? undefined,
  }
}

export const abiForKind = (kind: RegistryKind): Abi => {
  if (kind === 'light') return lightAbi as Abi
  if (kind === 'permanent') return permanentAbi as Abi
  return classicAbi as Abi
}

const readParam = async (
  registry: DashboardRegistry,
  functionName: string,
): Promise<string | undefined> => {
  try {
    const value = await readContract(wagmiConfig, {
      chainId: registry.chainId,
      address: registry.address as `0x${string}`,
      abi: abiForKind(registry.kind),
      functionName,
    } as any)
    if (typeof value === 'string') return value
    if (typeof value === 'bigint') return value.toString()
    if (value && typeof value === 'object' && 'toString' in value)
      return String(value)
    return value === undefined || value === null ? undefined : String(value)
  } catch (err) {
    console.warn('Governance read failed', registry.address, functionName, err)
    return undefined
  }
}

const readTokenSymbol = async (
  registry: DashboardRegistry,
): Promise<string | undefined> => {
  if (!registry.token) return undefined
  try {
    const symbol = await readContract(wagmiConfig, {
      chainId: registry.chainId,
      address: registry.token as `0x${string}`,
      abi: erc20Abi,
      functionName: 'symbol',
    })
    return typeof symbol === 'string' && symbol ? symbol : undefined
  } catch (err) {
    console.warn('Token symbol read failed', registry.token, err)
    return undefined
  }
}

const readGovernanceParams = async (
  registry: DashboardRegistry,
): Promise<GovernanceParams> => {
  const common = ['governor', 'arbitrator', 'arbitratorExtraData'] as const
  const classicAndLight = [
    'challengePeriodDuration',
    'submissionBaseDeposit',
    'submissionChallengeBaseDeposit',
    'removalBaseDeposit',
    'removalChallengeBaseDeposit',
    'winnerStakeMultiplier',
    'loserStakeMultiplier',
    'sharedStakeMultiplier',
    'relayerContract',
    'metaEvidenceUpdates',
  ] as const
  const permanent = [
    'submissionMinDeposit',
    'submissionPeriod',
    'reinclusionPeriod',
    'withdrawingPeriod',
    'challengeStakeMultiplier',
    'winnerStakeMultiplier',
    'loserStakeMultiplier',
    'sharedStakeMultiplier',
  ] as const

  const names =
    registry.kind === 'permanent'
      ? [...common, ...permanent]
      : [...common, ...classicAndLight]
  const entries = await Promise.all(
    names.map(async (name) => [name, await readParam(registry, name)] as const),
  )
  const params = Object.fromEntries(
    entries.filter(([, value]) => value !== undefined),
  ) as GovernanceParams

  if (
    registry.kind === 'permanent' &&
    !params.arbitratorExtraData &&
    registry.arbitratorExtraData
  )
    params.arbitratorExtraData = registry.arbitratorExtraData

  if (registry.kind === 'permanent') {
    if (registry.metaEvidenceURI)
      params.metaEvidenceURI = registry.metaEvidenceURI
    params.tokenSymbol = await readTokenSymbol(registry)
  }

  return params
}

const fetchGovernedRegistries = async (
  address: string,
): Promise<GovernedRegistry[]> => {
  const dashboard = await fetchDashboardData()
  const candidates = dashboard.registries.slice(0, GOVERNANCE_SCAN_LIMIT)
  const governed = await Promise.all(
    candidates.map(async (registry) => {
      const governor = normalizeAddress(await readParam(registry, 'governor'))
      if (!governor || governor !== address) return null
      const params = await readGovernanceParams(registry)
      return { ...registry, governor, params } satisfies GovernedRegistry
    }),
  )
  return governed.filter(Boolean) as GovernedRegistry[]
}

const buildBadges = (stats: AddressStats): AddressBadge[] => [
  {
    id: 'librarian',
    label: 'Librarian',
    description: '100+ submissions',
    earned: stats.submissions >= 100,
    progress: Math.min(stats.submissions, 100),
    goal: 100,
  },
  {
    id: 'sheriff',
    label: 'Sheriff',
    description: '100+ challenges',
    earned: stats.challenges >= 100,
    progress: Math.min(stats.challenges, 100),
    goal: 100,
  },
  {
    id: 'maintainer',
    label: 'Maintainer',
    description: '20+ removals',
    earned: stats.removals >= 20,
    progress: Math.min(stats.removals, 20),
    goal: 20,
  },
]

export const fetchAddressProfileData = async (
  rawAddress: string,
): Promise<AddressProfileData> => {
  const address = normalizeAddress(rawAddress)
  const totals = emptyStats()
  const chainBreakdown: Record<number, AddressStats> = {}
  const activities: ProfileActivity[] = []
  const disputes: ProfileActivity[] = []

  const envioResults = await Promise.all(
    SUPPORTED_CHAIN_IDS.map(async (chainId) => {
      const payload = await safeRequest<any>(
        subgraphUrl[chainId],
        ENVIO_PROFILE_QUERY,
        { chainId, address, limit: PROFILE_LIMIT },
      )
      return { chainId, payload }
    }),
  )

  const permanentResults = await Promise.all(
    SUPPORTED_CHAIN_IDS.map(async (chainId) => {
      const payload = await safeRequest<any>(
        subgraphUrlPermanent[chainId],
        PERMANENT_PROFILE_QUERY,
        { address, first: PROFILE_LIMIT },
      )
      return { chainId, payload }
    }),
  )

  for (const { chainId, payload } of envioResults) {
    if (!chainBreakdown[chainId]) chainBreakdown[chainId] = emptyStats()
    for (const [requestEntity, kind] of [
      ...(payload?.lightRequests ?? []).map(
        (item: any) => [item, 'light'] as const,
      ),
      ...(payload?.classicRequests ?? []).map(
        (item: any) => [item, 'classic'] as const,
      ),
    ]) {
      const { activity, stats } = requestToActivity(
        requestEntity,
        kind,
        address,
      )
      activities.push(activity)
      if (requestEntity.disputed) disputes.push(activity)
      addStats(totals, stats)
      addStats(chainBreakdown[chainId], stats)
    }
  }

  for (const { chainId, payload } of permanentResults) {
    if (!chainBreakdown[chainId]) chainBreakdown[chainId] = emptyStats()
    for (const submission of payload?.submissions ?? []) {
      const activity = permanentSubmissionToActivity(submission, chainId)
      activities.push(activity)
      addStats(totals, { submissions: 1, activity: 1 })
      addStats(chainBreakdown[chainId], { submissions: 1, activity: 1 })
    }
    for (const challenge of payload?.challenges ?? []) {
      const activity = permanentChallengeToActivity(challenge, chainId)
      activities.push(activity)
      disputes.push(activity)
      const stats = {
        challenges: 1,
        disputes: 1,
        itemsChallenged: 1,
        successfulChallenges: challenge.disputeOutcome === 'Reject' ? 1 : 0,
        activity: 1,
      }
      addStats(totals, stats)
      addStats(chainBreakdown[chainId], stats)
    }
  }

  const governedRegistries = await fetchGovernedRegistries(address)
  totals.governedLists = governedRegistries.length
  for (const registry of governedRegistries) {
    if (!chainBreakdown[registry.chainId])
      chainBreakdown[registry.chainId] = emptyStats()
    chainBreakdown[registry.chainId].governedLists += 1
  }

  activities.sort((a, b) => b.timestamp - a.timestamp)
  disputes.sort((a, b) => b.timestamp - a.timestamp)

  return {
    address,
    generatedAt: Date.now(),
    stats: totals,
    badges: buildBadges(totals),
    activities: activities.slice(0, ACTIVITY_LIMIT),
    disputes: disputes.slice(0, DISPUTE_LIMIT),
    governedRegistries,
    chainBreakdown,
  }
}

export const chainName = (chainId: number): string =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]?.name ||
  `Chain ${chainId}`
