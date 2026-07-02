import { gql, request } from 'graphql-request'
import { NETWORKS, NETWORKS_INFO } from 'config/networks'
import { subgraphUrl, subgraphUrlPermanent } from 'config/tcr-addresses'
import { getListOfListsAddresses } from 'config/list-of-lists'
import { parseIpfs } from 'utils/ipfs-parse'
import {
  DashboardActivity,
  DashboardData,
  DashboardMetrics,
  DashboardRegistry,
  DashboardUser,
  RegistryKind,
  TrustStatus,
} from './types'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const DAYS_30 = 30 * 24 * 60 * 60
const DASHBOARD_QUERY_TIMEOUT_MS = 10_000
const METADATA_TIMEOUT_MS = 2_000
const SUPPORTED_CHAIN_IDS = [
  NETWORKS.ethereum,
  NETWORKS.gnosis,
  NETWORKS.sepolia,
]

const ENVIO_DASHBOARD_QUERY = gql`
  query EnvioDashboard(
    $chainId: Int!
    $since: numeric!
    $verifiedSources: [String!]!
  ) {
    lregistries: LRegistry(
      limit: 160
      where: { chainId: { _eq: $chainId } }
      order_by: [{ numberOfRegistered: desc }]
    ) {
      id
      chainId
      title
      description
      numberOfAbsent
      numberOfRegistered
      numberOfRegistrationRequested
      numberOfClearingRequested
      numberOfChallengedRegistrations
      numberOfChallengedClearing
      registrationMetaEvidence {
        uri
      }
    }
    registries: Registry(
      limit: 160
      where: { chainId: { _eq: $chainId } }
      order_by: [{ numberOfItems: desc }]
    ) {
      id
      chainId
      numberOfItems
      registrationMetaEvidence {
        uri
      }
    }
    latestLightItems: LItem(
      limit: 36
      where: { chainId: { _eq: $chainId } }
      order_by: [{ latestRequestSubmissionTime: desc }]
    ) {
      id
      itemID
      chainId
      registry_id
      status
      latestRequestSubmissionTime
      latestRequester
      latestChallenger
      registry {
        title
      }
      requests(limit: 1, order_by: { submissionTime: desc }) {
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
    latestClassicItems: Item(
      limit: 36
      where: { chainId: { _eq: $chainId } }
      order_by: [{ latestRequestSubmissionTime: desc }]
    ) {
      id
      itemID
      chainId
      registry_id
      status
      latestRequestSubmissionTime
      latestRequester
      latestChallenger
      requests(limit: 1, order_by: { submissionTime: desc }) {
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
    lightRequests: LRequest(
      limit: 360
      where: { chainId: { _eq: $chainId }, submissionTime: { _gte: $since } }
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
        numberOfRegistered
        numberOfRegistrationRequested
        numberOfClearingRequested
        numberOfChallengedRegistrations
        numberOfChallengedClearing
      }
    }
    classicRequests: Request(
      limit: 360
      where: { chainId: { _eq: $chainId }, submissionTime: { _gte: $since } }
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
      registry {
        numberOfItems
      }
    }
    lightDisputes: LRequest(
      limit: 80
      where: { chainId: { _eq: $chainId }, disputed: { _eq: true } }
      order_by: [{ challengeTime: desc }]
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
    classicDisputes: Request(
      limit: 80
      where: { chainId: { _eq: $chainId }, disputed: { _eq: true } }
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
    resolvedLightBounties: LRequest(
      limit: 240
      where: {
        chainId: { _eq: $chainId }
        disputed: { _eq: true }
        resolved: { _eq: true }
        disputeOutcome: { _eq: "Reject" }
      }
      order_by: [{ resolutionTime: desc }]
    ) {
      id
      chainId
      challenger
      deposit
      resolutionTime
    }
    resolvedClassicBounties: Request(
      limit: 240
      where: {
        chainId: { _eq: $chainId }
        disputed: { _eq: true }
        resolved: { _eq: true }
        disputeOutcome: { _eq: "Reject" }
      }
      order_by: [{ resolutionTime: desc }]
    ) {
      id
      chainId
      challenger
      deposit
      resolutionTime
    }
    verifiedClassic: Item(
      limit: 500
      where: {
        chainId: { _eq: $chainId }
        registry_id: { _in: $verifiedSources }
        status: { _eq: "Registered" }
      }
    ) {
      id
      data
      registry_id
    }
    verifiedLight: LItem(
      limit: 500
      where: {
        chainId: { _eq: $chainId }
        registry_id: { _in: $verifiedSources }
        status: { _eq: "Registered" }
      }
    ) {
      id
      data
      registry_id
      props(order_by: { label: asc }) {
        value
        itemType
        label
        isIdentifier
      }
    }
  }
`

const PERMANENT_DASHBOARD_QUERY = gql`
  query PermanentDashboard {
    registries(first: 120, orderBy: createdAt, orderDirection: desc) {
      id
      createdAt
      numberOfSubmitted
      numberOfAbsent
      numberOfDisputed
      submissionMinDeposit
      submissionPeriod
      arbitrationSettings(first: 1, orderBy: timestamp, orderDirection: desc) {
        metadata {
          title
          description
          logoURI
        }
      }
    }
    submissions(first: 90, orderBy: createdAt, orderDirection: desc) {
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
    challenges(first: 90, orderBy: createdAt, orderDirection: desc) {
      id
      createdAt
      challenger
      disputeID
      disputeOutcome
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

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeAddress = (address: string | undefined | null): string =>
  (address || '').toLowerCase()

const shortAddress = (address: string): string =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'

const addBigIntStrings = (a: string, b?: string | null): string =>
  (BigInt(a || '0') + BigInt(b || '0')).toString()

export const formatCompact = (value: number): string =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)

export const formatAgo = (timestamp?: number): string => {
  if (!timestamp) return 'No recent activity'
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - timestamp)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export const formatWei = (value?: string | null, chainId?: number): string => {
  if (!value || value === '0') return '0'
  const symbol =
    chainId && NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
      ? NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO].nativeCurrency
          .symbol
      : 'ETH'
  const wei = BigInt(value)
  const whole = wei / 10n ** 18n
  const fractional = (wei % 10n ** 18n) / 10n ** 15n
  const numeric = Number(whole) + Number(fractional) / 1000
  const formatted =
    numeric >= 1000
      ? formatCompact(numeric)
      : new Intl.NumberFormat('en-US', {
          maximumFractionDigits: numeric >= 10 ? 1 : 3,
        }).format(numeric)
  return `${formatted} ${symbol}`
}

const extractRegistryAddress = (
  value?: string,
  props?: any[],
): string | null => {
  const propAddress = props
    ?.map((prop) => prop?.value)
    .find((candidate) => /^0x[a-fA-F0-9]{40}$/.test(candidate || ''))

  if (propAddress) return normalizeAddress(propAddress)

  if (!value) return null
  const encodedAddress = value.match(/0xd594([a-fA-F0-9]{40})/)
  if (encodedAddress) return `0x${encodedAddress[1]}`.toLowerCase()

  const rawAddress = value.match(/0x[a-fA-F0-9]{40}/)
  return rawAddress ? rawAddress[0].toLowerCase() : null
}

const registryTitle = (
  address: string,
  title?: string | null,
  kind?: RegistryKind,
): string => {
  if (title && title.trim() && title.trim() !== '-') return title.trim()
  if (kind === 'permanent') return `Permanent registry ${shortAddress(address)}`
  return `Registry ${shortAddress(address)}`
}

const isFallbackRegistryTitle = (registry: DashboardRegistry): boolean =>
  registry.title === registryTitle(registry.address, null, registry.kind)

const readMetaEvidence = async (
  uri?: string,
): Promise<Pick<
  DashboardRegistry,
  'title' | 'description' | 'logoURI'
> | null> => {
  if (!uri) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS)

  try {
    const response = await fetch(parseIpfs(uri), {
      signal: controller.signal,
    })
    if (!response.ok) return null

    const file = await response.json()
    const evidence = file?.data ?? file
    const metadata = evidence?.metadata ?? file?.metadata ?? {}
    const rawTitle =
      metadata.tcrTitle ||
      metadata.title ||
      evidence.tcrTitle ||
      evidence.registryTitle
    const rawDescription =
      metadata.tcrDescription ||
      metadata.description ||
      evidence.tcrDescription ||
      evidence.description
    const rawLogo = metadata.logoURI || metadata.logo || evidence.logoURI

    return {
      title: typeof rawTitle === 'string' ? rawTitle.trim() : undefined,
      description:
        typeof rawDescription === 'string' ? rawDescription.trim() : undefined,
      logoURI: typeof rawLogo === 'string' ? rawLogo.trim() : undefined,
    }
  } catch (err) {
    console.warn('Dashboard metadata fetch failed', err)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

const enrichRegistryMetadata = async (
  registries: DashboardRegistry[],
): Promise<DashboardRegistry[]> => {
  const candidates = registries
    .filter(
      (registry) =>
        registry.metadataURI &&
        (isFallbackRegistryTitle(registry) ||
          !registry.description ||
          !registry.logoURI),
    )
    .slice(0, 48)

  const candidateIds = new Set(candidates.map((registry) => registry.id))
  const cache = new Map<
    string,
    Promise<Pick<DashboardRegistry, 'title' | 'description' | 'logoURI'> | null>
  >()

  return Promise.all(
    registries.map(async (registry) => {
      if (!registry.metadataURI || !candidateIds.has(registry.id))
        return registry

      const request =
        cache.get(registry.metadataURI) ??
        readMetaEvidence(registry.metadataURI)
      cache.set(registry.metadataURI, request)
      const metadata = await request
      if (!metadata) return registry

      return {
        ...registry,
        title:
          metadata.title && metadata.title !== '-'
            ? metadata.title
            : registry.title,
        description: metadata.description || registry.description,
        logoURI: metadata.logoURI || registry.logoURI,
      }
    }),
  )
}

const buildActivityHref = (
  chainId: number,
  registryAddress: string,
  itemID?: string,
) =>
  itemID
    ? `/tcr/${chainId}/${registryAddress}/${itemID}`
    : `/tcr/${chainId}/${registryAddress}`

const requestToActivity = (
  requestEntity: any,
  kindHint: RegistryKind,
): DashboardActivity => {
  const chainId = toNumber(requestEntity.chainId)
  const registryAddress = normalizeAddress(requestEntity.registry_id)
  const itemID = requestEntity.id?.split('@')?.[0]
  const isRemoval = requestEntity.requestType === 'ClearingRequested'
  const isChallenge =
    requestEntity.disputed &&
    normalizeAddress(requestEntity.challenger) !== ZERO_ADDRESS
  const timestamp =
    toNumber(requestEntity.challengeTime) ||
    toNumber(requestEntity.submissionTime) ||
    toNumber(requestEntity.resolutionTime)

  return {
    id: `${kindHint}-${requestEntity.id}`,
    chainId,
    registryAddress,
    registryTitle: registryTitle(
      registryAddress,
      requestEntity.registry?.title,
      kindHint,
    ),
    itemID,
    actor: normalizeAddress(requestEntity.requester),
    secondaryActor: normalizeAddress(requestEntity.challenger),
    kind: isChallenge ? 'challenge' : isRemoval ? 'removal' : 'submission',
    status: isChallenge
      ? `Dispute #${requestEntity.disputeID || 'pending'}`
      : isRemoval
        ? 'Removal requested'
        : 'Registration requested',
    timestamp,
    href: buildActivityHref(chainId, registryAddress, itemID),
  }
}

const itemToActivity = (
  item: any,
  kindHint: RegistryKind,
): DashboardActivity => {
  const requestEntity = item.requests?.[0] ?? {}
  const chainId = toNumber(item.chainId)
  const registryAddress = normalizeAddress(item.registry_id)
  const isRemoval = requestEntity.requestType === 'ClearingRequested'
  const timestamp =
    toNumber(item.latestRequestSubmissionTime) ||
    toNumber(requestEntity.submissionTime)

  return {
    id: `${kindHint}-item-${item.id}`,
    chainId,
    registryAddress,
    registryTitle: registryTitle(
      registryAddress,
      item.registry?.title,
      kindHint,
    ),
    itemID: item.itemID,
    actor: normalizeAddress(requestEntity.requester || item.latestRequester),
    secondaryActor: normalizeAddress(
      requestEntity.challenger || item.latestChallenger,
    ),
    kind: requestEntity.disputed
      ? 'challenge'
      : isRemoval
        ? 'removal'
        : 'submission',
    status: requestEntity.disputed
      ? `Dispute #${requestEntity.disputeID || 'pending'}`
      : isRemoval
        ? 'Removal requested'
        : 'Registration requested',
    timestamp,
    href: buildActivityHref(chainId, registryAddress, item.itemID),
  }
}

const permanentSubmissionToActivity = (
  submission: any,
  chainId: number,
  registryMap: Map<string, DashboardRegistry>,
): DashboardActivity => {
  const registryAddress = normalizeAddress(submission.item?.registry?.id)
  const registry = registryMap.get(registryAddress)
  return {
    id: `permanent-submission-${chainId}-${submission.id}`,
    chainId,
    registryAddress,
    registryTitle:
      registry?.title || registryTitle(registryAddress, null, 'permanent'),
    itemID: submission.item?.itemID,
    actor: normalizeAddress(submission.submitter),
    kind: 'submission',
    status: 'Permanent submission',
    timestamp: toNumber(submission.createdAt),
    href: buildActivityHref(chainId, registryAddress, submission.item?.itemID),
  }
}

const permanentChallengeToActivity = (
  challenge: any,
  chainId: number,
  registryMap: Map<string, DashboardRegistry>,
): DashboardActivity => {
  const registryAddress = normalizeAddress(challenge.item?.registry?.id)
  const registry = registryMap.get(registryAddress)
  return {
    id: `permanent-challenge-${chainId}-${challenge.id}`,
    chainId,
    registryAddress,
    registryTitle:
      registry?.title || registryTitle(registryAddress, null, 'permanent'),
    itemID: challenge.item?.itemID,
    actor: normalizeAddress(challenge.challenger),
    kind: 'challenge',
    status: `Dispute #${challenge.disputeID || 'pending'}`,
    timestamp: toNumber(challenge.createdAt),
    href: buildActivityHref(chainId, registryAddress, challenge.item?.itemID),
  }
}

const accumulateUser = (
  users: Map<string, DashboardUser>,
  chainId: number,
  address: string | undefined | null,
  field: 'submissions' | 'removals' | 'challenges' | 'successfulChallenges',
  timestamp: number,
) => {
  const normalized = normalizeAddress(address)
  if (!normalized || normalized === ZERO_ADDRESS) return

  const existing =
    users.get(normalized) ??
    ({
      address: normalized,
      chainId,
      submissions: 0,
      removals: 0,
      challenges: 0,
      successfulChallenges: 0,
      activity: 0,
      lastActiveAt: 0,
    } satisfies DashboardUser)

  existing[field] += 1
  existing.activity += 1
  existing.lastActiveAt = Math.max(existing.lastActiveAt, timestamp)
  users.set(normalized, existing)
}

const normalizeEnvio = (
  payload: any,
  chainId: number,
): {
  registries: DashboardRegistry[]
  activities: DashboardActivity[]
  disputes: DashboardActivity[]
  users: Map<string, DashboardUser>
  bountyWei: string
} => {
  const verifiedAddresses = new Set<string>()
  for (const address of getListOfListsAddresses(chainId))
    verifiedAddresses.add(normalizeAddress(address))

  for (const item of [
    ...(payload.verifiedClassic ?? []),
    ...(payload.verifiedLight ?? []),
  ]) {
    const address = extractRegistryAddress(item.data, item.props)
    if (address) verifiedAddresses.add(address)
  }

  const registries: DashboardRegistry[] = []
  for (const registry of payload.lregistries ?? []) {
    const address = normalizeAddress(registry.id)
    const pending =
      toNumber(registry.numberOfRegistrationRequested) +
      toNumber(registry.numberOfClearingRequested) +
      toNumber(registry.numberOfChallengedRegistrations) +
      toNumber(registry.numberOfChallengedClearing)

    registries.push({
      id: `light-${chainId}-${address}`,
      address,
      chainId,
      kind: 'light',
      title: registryTitle(address, registry.title, 'light'),
      description: registry.description,
      metadataURI: registry.registrationMetaEvidence?.uri,
      itemCount:
        toNumber(registry.numberOfRegistered) +
        toNumber(registry.numberOfAbsent),
      activeCount: pending,
      pendingCount: pending,
      disputeCount:
        toNumber(registry.numberOfChallengedRegistrations) +
        toNumber(registry.numberOfChallengedClearing),
      lastActivityAt: 0,
      trustStatus: verifiedAddresses.has(address) ? 'verified' : 'unverified',
    })
  }

  for (const registry of payload.registries ?? []) {
    const address = normalizeAddress(registry.id)
    registries.push({
      id: `classic-${chainId}-${address}`,
      address,
      chainId,
      kind: 'classic',
      title: registryTitle(address, null, 'classic'),
      metadataURI: registry.registrationMetaEvidence?.uri,
      itemCount: toNumber(registry.numberOfItems),
      activeCount: 0,
      pendingCount: 0,
      disputeCount: 0,
      lastActivityAt: 0,
      trustStatus: verifiedAddresses.has(address) ? 'verified' : 'unverified',
    })
  }

  const registryByAddress = new Map(registries.map((r) => [r.address, r]))
  const users = new Map<string, DashboardUser>()
  const activityRequests = [
    ...(payload.lightRequests ?? []).map((item) => [item, 'light'] as const),
    ...(payload.classicRequests ?? []).map(
      (item) => [item, 'classic'] as const,
    ),
  ]

  for (const [requestEntity] of activityRequests) {
    const registry = registryByAddress.get(
      normalizeAddress(requestEntity.registry_id),
    )
    const timestamp = toNumber(requestEntity.submissionTime)
    if (registry) {
      registry.activeCount += 1
      registry.lastActivityAt = Math.max(
        registry.lastActivityAt || 0,
        timestamp,
      )
      if (requestEntity.disputed) registry.disputeCount += 1
    }

    const field =
      requestEntity.requestType === 'ClearingRequested'
        ? 'removals'
        : 'submissions'
    accumulateUser(users, chainId, requestEntity.requester, field, timestamp)
    if (requestEntity.disputed)
      accumulateUser(
        users,
        chainId,
        requestEntity.challenger,
        'challenges',
        toNumber(requestEntity.challengeTime) || timestamp,
      )
  }

  let bountyWei = '0'
  for (const bounty of [
    ...(payload.resolvedLightBounties ?? []),
    ...(payload.resolvedClassicBounties ?? []),
  ]) {
    bountyWei = addBigIntStrings(bountyWei, bounty.deposit)
    accumulateUser(
      users,
      chainId,
      bounty.challenger,
      'successfulChallenges',
      toNumber(bounty.resolutionTime),
    )
  }

  const activities = [
    ...(payload.latestLightItems ?? []).map((item) =>
      itemToActivity(item, 'light'),
    ),
    ...(payload.latestClassicItems ?? []).map((item) =>
      itemToActivity(item, 'classic'),
    ),
  ]

  const disputes = [
    ...(payload.lightDisputes ?? []).map((item) =>
      requestToActivity(item, 'light'),
    ),
    ...(payload.classicDisputes ?? []).map((item) =>
      requestToActivity(item, 'classic'),
    ),
  ]

  return { registries, activities, disputes, users, bountyWei }
}

const normalizePermanent = (
  payload: any,
  chainId: number,
  since: number,
): {
  registries: DashboardRegistry[]
  activities: DashboardActivity[]
  disputes: DashboardActivity[]
  users: Map<string, DashboardUser>
  bountyWei: string
} => {
  const registries: DashboardRegistry[] = (payload.registries ?? []).map(
    (registry) => {
      const address = normalizeAddress(registry.id)
      const metadata = registry.arbitrationSettings?.[0]?.metadata
      return {
        id: `permanent-${chainId}-${address}`,
        address,
        chainId,
        kind: 'permanent' as RegistryKind,
        title: registryTitle(address, metadata?.title, 'permanent'),
        description: metadata?.description,
        logoURI: metadata?.logoURI,
        itemCount:
          toNumber(registry.numberOfSubmitted) +
          toNumber(registry.numberOfAbsent),
        activeCount: 0,
        pendingCount: toNumber(registry.numberOfSubmitted),
        disputeCount: toNumber(registry.numberOfDisputed),
        bountyWei: registry.submissionMinDeposit,
        createdAt: toNumber(registry.createdAt),
        lastActivityAt: toNumber(registry.createdAt),
        trustStatus: 'unverified' as TrustStatus,
      }
    },
  )

  const registryMap = new Map(registries.map((r) => [r.address, r]))
  const users = new Map<string, DashboardUser>()

  const activities = (payload.submissions ?? []).map((submission) => {
    const timestamp = toNumber(submission.createdAt)
    accumulateUser(
      users,
      chainId,
      submission.submitter,
      'submissions',
      timestamp,
    )
    const registry = registryMap.get(
      normalizeAddress(submission.item?.registry?.id),
    )
    if (registry)
      registry.lastActivityAt = Math.max(
        registry.lastActivityAt || 0,
        timestamp,
      )
    if (registry && timestamp >= since) registry.activeCount += 1
    return permanentSubmissionToActivity(submission, chainId, registryMap)
  })

  const disputes = (payload.challenges ?? []).map((challenge) => {
    const timestamp = toNumber(challenge.createdAt)
    accumulateUser(
      users,
      chainId,
      challenge.challenger,
      'challenges',
      timestamp,
    )
    const registry = registryMap.get(
      normalizeAddress(challenge.item?.registry?.id),
    )
    if (registry) {
      registry.disputeCount += 1
      registry.lastActivityAt = Math.max(
        registry.lastActivityAt || 0,
        timestamp,
      )
      if (timestamp >= since) registry.activeCount += 1
    }
    return permanentChallengeToActivity(challenge, chainId, registryMap)
  })

  const bountyWei = (payload.challenges ?? [])
    .filter((challenge) => challenge.disputeOutcome === 'Reject')
    .reduce(
      (sum, challenge) => addBigIntStrings(sum, challenge.challengerStake),
      '0',
    )

  return { registries, activities, disputes, users, bountyWei }
}

const mergeUsers = (maps: Map<string, DashboardUser>[]): DashboardUser[] => {
  const merged = new Map<string, DashboardUser>()

  for (const map of maps)
    for (const [address, user] of map) {
      const existing = merged.get(address)
      if (!existing) {
        merged.set(address, { ...user })
        continue
      }
      existing.submissions += user.submissions
      existing.removals += user.removals
      existing.challenges += user.challenges
      existing.successfulChallenges += user.successfulChallenges
      existing.activity += user.activity
      existing.lastActiveAt = Math.max(existing.lastActiveAt, user.lastActiveAt)
    }

  return [...merged.values()].sort(
    (a, b) => b.activity - a.activity || b.lastActiveAt - a.lastActiveAt,
  )
}

const dedupeRegistries = (
  registries: DashboardRegistry[],
): DashboardRegistry[] => {
  const byKey = new Map<string, DashboardRegistry>()
  for (const registry of registries) {
    const key = `${registry.chainId}:${registry.address}`
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, registry)
      continue
    }

    if (existing.kind !== 'permanent' && registry.kind === 'permanent') continue
    byKey.set(key, {
      ...existing,
      ...registry,
      trustStatus:
        existing.trustStatus === 'verified' ||
        registry.trustStatus === 'verified'
          ? 'verified'
          : registry.trustStatus,
      itemCount: Math.max(existing.itemCount, registry.itemCount),
      activeCount: existing.activeCount + registry.activeCount,
      disputeCount: existing.disputeCount + registry.disputeCount,
      lastActivityAt: Math.max(
        existing.lastActivityAt || 0,
        registry.lastActivityAt || 0,
      ),
    })
  }
  return [...byKey.values()]
}

const buildMetrics = (
  registries: DashboardRegistry[],
  users: DashboardUser[],
  bountyByChain: Record<number, string>,
): DashboardMetrics => ({
  registries: registries.length,
  verifiedRegistries: registries.filter((r) => r.trustStatus === 'verified')
    .length,
  curatedItems: registries.reduce(
    (sum, registry) => sum + registry.itemCount,
    0,
  ),
  activeVerification: registries.reduce(
    (sum, registry) => sum + registry.pendingCount,
    0,
  ),
  disputes: registries.reduce(
    (sum, registry) => sum + registry.disputeCount,
    0,
  ),
  curators: users.length,
  bountyByChain,
})

const safeRequest = async <T>(
  url: string | undefined,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T | null> => {
  if (!url) return null
  try {
    return await Promise.race([
      request<T>(url, query, variables),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), DASHBOARD_QUERY_TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    console.warn('Dashboard query failed', err)
    return null
  }
}

export const fetchDashboardData = async (): Promise<DashboardData> => {
  const since = Math.floor(Date.now() / 1000) - DAYS_30
  const envioResults = await Promise.all(
    SUPPORTED_CHAIN_IDS.map(async (chainId) => {
      const payload = await safeRequest<any>(
        subgraphUrl[chainId],
        ENVIO_DASHBOARD_QUERY,
        {
          chainId,
          since,
          verifiedSources: getListOfListsAddresses(chainId),
        },
      )
      return payload ? normalizeEnvio(payload, chainId) : null
    }),
  )

  const permanentResults = await Promise.all(
    SUPPORTED_CHAIN_IDS.map(async (chainId) => {
      const payload = await safeRequest<any>(
        subgraphUrlPermanent[chainId],
        PERMANENT_DASHBOARD_QUERY,
      )
      return payload ? normalizePermanent(payload, chainId, since) : null
    }),
  )

  const allResults = [...envioResults, ...permanentResults].filter(
    Boolean,
  ) as ReturnType<typeof normalizeEnvio>[]

  const registries = (
    await enrichRegistryMetadata(
      dedupeRegistries(allResults.flatMap((result) => result.registries)),
    )
  ).sort(
    (a, b) =>
      Number(b.trustStatus === 'verified') -
        Number(a.trustStatus === 'verified') ||
      b.activeCount - a.activeCount ||
      b.itemCount - a.itemCount ||
      (b.lastActivityAt || 0) - (a.lastActivityAt || 0),
  )

  const activities = allResults
    .flatMap((result) => result.activities)
    .filter((activity) => activity.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 80)

  const disputes = allResults
    .flatMap((result) => result.disputes)
    .filter((activity) => activity.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 40)

  const users = mergeUsers(allResults.map((result) => result.users)).slice(
    0,
    50,
  )

  const bountyByChain: Record<number, string> = {}
  let resultIndex = 0
  for (const chainId of SUPPORTED_CHAIN_IDS) {
    const envio = envioResults[resultIndex]
    const permanent = permanentResults[resultIndex]
    bountyByChain[chainId] = addBigIntStrings(
      envio?.bountyWei ?? '0',
      permanent?.bountyWei ?? '0',
    )
    resultIndex += 1
  }

  return {
    generatedAt: Date.now(),
    registries,
    activities,
    disputes,
    users,
    metrics: buildMetrics(registries, users, bountyByChain),
  }
}
