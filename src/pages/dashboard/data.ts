import { gql, request } from 'graphql-request'
import { NETWORKS } from 'config/networks'
import { subgraphUrl, subgraphUrlPermanent } from 'config/tcr-addresses'
import { getListOfListsAddresses } from 'config/list-of-lists'
import { parseIpfs } from 'utils/ipfs-parse'
import {
  applyCreationTimes,
  fetchRegistryCreationTimes,
  readCachedCreationTimes,
} from 'utils/registry-creation'
import { getNativeCurrency } from 'config/chains'
import {
  DashboardActivity,
  DashboardData,
  DashboardDay,
  DashboardMetrics,
  DashboardRegistry,
  DashboardUser,
  RegistryKind,
  TrustStatus,
} from './types'
import { entryCount } from './view'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const DAY = 24 * 60 * 60
const DASHBOARD_QUERY_TIMEOUT_MS = 10_000
const METADATA_TIMEOUT_MS = 2_000
const LEADERBOARD_PAGE_SIZE = 1000
const LEADERBOARD_MAX_PAGES = 5
/** Registries read per page; a full page means there may be more. */
const REGISTRY_PAGE_SIZE = 160
const REGISTRY_MAX_PAGES = 10
/** Open requests read per chain to count them; a full read caps the count. */
const OPEN_REQUEST_LIMIT = 1000
/** Unchallenged requests read per chain for the cards (the count is separate). */
const UNCHALLENGED_CARD_LIMIT = 40
/** Rulings read per chain over the 30-day window. */
const DECIDED_LIMIT = 200
/** Latest requests read per chain and kind for the activity feeds. */
const LATEST_LIMIT = 20
const SUPPORTED_CHAIN_IDS = [
  NETWORKS.ethereum,
  NETWORKS.gnosis,
  NETWORKS.sepolia,
]

/**
 * Start of the 30-day window every dashboard figure shares: the chart's
 * first UTC day, so the series, the curators, the challenges and the rulings
 * cover the same 29 full days plus today so far.
 */
export const windowStart = (nowSeconds: number): number =>
  Math.floor(nowSeconds / DAY) * DAY - 29 * DAY

const LREGISTRY_FIELDS = `
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
  requests(limit: 1, order_by: [{ submissionTime: asc }]) {
    submissionTime
  }
`

const REGISTRY_FIELDS = `
  id
  chainId
  numberOfItems
  registrationMetaEvidence {
    uri
  }
  requests(limit: 1, order_by: [{ submissionTime: asc }]) {
    submissionTime
  }
`

const REQUEST_FIELDS = `
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
`

/** Light entries carry their fields; the first identifier names the card. */
const LIGHT_ITEM_PREVIEW = `
  item {
    itemID
    props(order_by: { label: asc }) {
      label
      value
      isIdentifier
    }
  }
`

const CLASSIC_ITEM = `
  item {
    itemID
  }
`

const ENVIO_DASHBOARD_QUERY = gql`
  query EnvioDashboard(
    $chainId: Int!
    $since: numeric!
    $verifiedSources: [String!]!
  ) {
    lregistries: LRegistry(
      limit: ${REGISTRY_PAGE_SIZE}
      where: { chainId: { _eq: $chainId } }
      order_by: [{ numberOfRegistered: desc }, { id: asc }]
    ) {
      ${LREGISTRY_FIELDS}
    }
    registries: Registry(
      limit: ${REGISTRY_PAGE_SIZE}
      where: { chainId: { _eq: $chainId } }
      order_by: [{ numberOfItems: desc }, { id: asc }]
    ) {
      ${REGISTRY_FIELDS}
    }
    lightRequests: LRequest(
      limit: 360
      where: { chainId: { _eq: $chainId }, submissionTime: { _gte: $since } }
      order_by: [{ submissionTime: desc }]
    ) {
      id
      registry_id
      disputed
      submissionTime
    }
    classicRequests: Request(
      limit: 360
      where: { chainId: { _eq: $chainId }, submissionTime: { _gte: $since } }
      order_by: [{ submissionTime: desc }]
    ) {
      id
      registry_id
      disputed
      submissionTime
    }
    latestLight: LRequest(
      limit: ${LATEST_LIMIT}
      where: { chainId: { _eq: $chainId } }
      order_by: [{ submissionTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      challengeTime
      registry {
        title
      }
      ${LIGHT_ITEM_PREVIEW}
    }
    latestClassic: Request(
      limit: ${LATEST_LIMIT}
      where: { chainId: { _eq: $chainId } }
      order_by: [{ submissionTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      ${CLASSIC_ITEM}
    }
    unchallengedLight: LRequest(
      limit: ${UNCHALLENGED_CARD_LIMIT}
      where: {
        chainId: { _eq: $chainId }
        resolved: { _eq: false }
        disputed: { _eq: false }
      }
      order_by: [{ submissionTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      registry {
        title
      }
      ${LIGHT_ITEM_PREVIEW}
    }
    unchallengedClassic: Request(
      limit: ${UNCHALLENGED_CARD_LIMIT}
      where: {
        chainId: { _eq: $chainId }
        resolved: { _eq: false }
        disputed: { _eq: false }
      }
      order_by: [{ submissionTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      ${CLASSIC_ITEM}
    }
    decidedLight: LRequest(
      limit: ${DECIDED_LIMIT}
      where: {
        chainId: { _eq: $chainId }
        disputed: { _eq: true }
        resolved: { _eq: true }
        resolutionTime: { _gte: $since }
      }
      order_by: [{ resolutionTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      challengeTime
      registry {
        title
      }
      ${LIGHT_ITEM_PREVIEW}
    }
    decidedClassic: Request(
      limit: ${DECIDED_LIMIT}
      where: {
        chainId: { _eq: $chainId }
        disputed: { _eq: true }
        resolved: { _eq: true }
        resolutionTime: { _gte: $since }
      }
      order_by: [{ resolutionTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      ${CLASSIC_ITEM}
    }
    openLightRequests: LRequest(
      limit: ${OPEN_REQUEST_LIMIT}
      where: { chainId: { _eq: $chainId }, resolved: { _eq: false } }
    ) {
      id
      registry_id
      disputed
    }
    openClassicRequests: Request(
      limit: ${OPEN_REQUEST_LIMIT}
      where: { chainId: { _eq: $chainId }, resolved: { _eq: false } }
    ) {
      id
      registry_id
      disputed
    }
    openLightDisputes: LRequest(
      limit: 400
      where: {
        chainId: { _eq: $chainId }
        disputed: { _eq: true }
        resolved: { _eq: false }
      }
      order_by: [{ challengeTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      challengeTime
      registry {
        title
      }
      ${LIGHT_ITEM_PREVIEW}
    }
    openClassicDisputes: Request(
      limit: 400
      where: {
        chainId: { _eq: $chainId }
        disputed: { _eq: true }
        resolved: { _eq: false }
      }
      order_by: [{ submissionTime: desc }]
    ) {
      ${REQUEST_FIELDS}
      ${CLASSIC_ITEM}
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
      deposit
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
      deposit
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

/** Further pages of registries, read only when the first page was full. */
const ENVIO_LREGISTRY_PAGE_QUERY = gql`
  query EnvioLRegistryPage($chainId: Int!, $offset: Int!) {
    lregistries: LRegistry(
      limit: ${REGISTRY_PAGE_SIZE}
      offset: $offset
      where: { chainId: { _eq: $chainId } }
      order_by: [{ numberOfRegistered: desc }, { id: asc }]
    ) {
      ${LREGISTRY_FIELDS}
    }
  }
`

const ENVIO_REGISTRY_PAGE_QUERY = gql`
  query EnvioRegistryPage($chainId: Int!, $offset: Int!) {
    registries: Registry(
      limit: ${REGISTRY_PAGE_SIZE}
      offset: $offset
      where: { chainId: { _eq: $chainId } }
      order_by: [{ numberOfItems: desc }, { id: asc }]
    ) {
      ${REGISTRY_FIELDS}
    }
  }
`

const PERMANENT_DASHBOARD_QUERY = gql`
  query PermanentDashboard($since: BigInt!) {
    registries(first: 1000, orderBy: createdAt, orderDirection: desc) {
      id
      token
      createdAt
      numberOfSubmitted
      numberOfAbsent
      numberOfDisputed
      submissionMinDeposit
      submissionPeriod
      arbitrationSettings(first: 1, orderBy: timestamp, orderDirection: desc) {
        arbitratorExtraData
        metaEvidenceURI
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
        metadata {
          props {
            label
            value
            isIdentifier
          }
        }
        registry {
          id
        }
      }
    }
    challenges(first: 90, orderBy: createdAt, orderDirection: desc) {
      id
      createdAt
      resolutionTime
      challenger
      disputeID
      disputeOutcome
      challengerStake
      item {
        itemID
        metadata {
          props {
            label
            value
            isIdentifier
          }
        }
        registry {
          id
        }
      }
    }
    decidedChallenges: challenges(
      first: 200
      where: { resolutionTime_gte: $since }
      orderBy: resolutionTime
      orderDirection: desc
    ) {
      id
      createdAt
      resolutionTime
      challenger
      disputeID
      disputeOutcome
      item {
        itemID
        metadata {
          props {
            label
            value
            isIdentifier
          }
        }
        registry {
          id
        }
      }
    }
    openChallenges: challenges(
      first: 400
      where: { resolutionTime: null }
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      createdAt
      challenger
      disputeID
      disputeOutcome
      challengerStake
      item {
        itemID
        metadata {
          props {
            label
            value
            isIdentifier
          }
        }
        registry {
          id
        }
      }
    }
  }
`

const ENVIO_CURATOR_PAGE_QUERY = gql`
  query EnvioCuratorPage(
    $chainId: Int!
    $since: numeric!
    $limit: Int!
    $offset: Int!
  ) {
    lightRequests: LRequest(
      limit: $limit
      offset: $offset
      where: { chainId: { _eq: $chainId }, submissionTime: { _gte: $since } }
      order_by: [{ submissionTime: desc }]
    ) {
      id
      chainId
      requestType
      requester
      challenger
      disputed
      resolved
      disputeOutcome
      submissionTime
      challengeTime
      resolutionTime
    }
    classicRequests: Request(
      limit: $limit
      offset: $offset
      where: { chainId: { _eq: $chainId }, submissionTime: { _gte: $since } }
      order_by: [{ submissionTime: desc }]
    ) {
      id
      chainId
      requestType
      requester
      challenger
      disputed
      resolved
      disputeOutcome
      submissionTime
      resolutionTime
    }
  }
`

const PERMANENT_CURATOR_PAGE_QUERY = gql`
  query PermanentCuratorPage($first: Int!, $skip: Int!) {
    submissions(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      createdAt
      submitter
    }
    challenges(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      createdAt
      challenger
      disputeOutcome
      resolutionTime
    }
  }
`

/** A classic/light request row as the dashboard queries select it. */
interface DashboardRequestRow {
  id?: string
  registry_id?: string
  submissionTime?: string | number
  requestType?: string
  requester?: string
  challenger?: string
  challengeTime?: string | number
  disputed?: boolean
  item?: { itemID?: string; props?: unknown[] }
  [key: string]: unknown
}

/** A permanent registry row, which the dashboard reads deposits off. */
interface PermanentRegistryRow extends SubgraphRegistry {
  submissionMinDeposit?: string
  createdAt?: string | number
}

/** A permanent submission row. */
interface PermanentSubmissionRow {
  createdAt?: string | number
  submitter?: string
  item?: { registry?: { id?: string } }
  [key: string]: unknown
}

/** A permanent challenge row. */
interface PermanentChallengeRow {
  createdAt?: string | number
  resolutionTime?: string | number | null
  challenger?: string
  challengerStake?: string
  disputeOutcome?: string
  item?: { registry?: { id?: string } }
  [key: string]: unknown
}

const toNumber = (value: unknown): number => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export const normalizeAddress = (address: string | undefined | null): string =>
  (address || '').toLowerCase()

export const shortAddress = (address: string): string =>
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
  const symbol = chainId ? getNativeCurrency(chainId).symbol : 'ETH'
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
): Promise<Partial<
  Pick<DashboardRegistry, 'title' | 'description' | 'logoURI'>
> | null> => {
  if (!uri) return null
  // Placeholder URIs (e.g. "/ipfs/dev-…/…json" on test registries) are not
  // content addresses; the gateway answers 400, so do not ask.
  const cid = uri
    .replace(/^ipfs:\/\//, '')
    .replace(/^\/ipfs\//, '')
    .split('/')[0]
  if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/.test(cid)) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS)

  try {
    const response = await fetch(parseIpfs(uri), {
      signal: controller.signal,
    })
    if (!response.ok) return null

    // Some registries point their MetaEvidence at a non-JSON object (e.g. a
    // dag-cbor node); treat those as "no metadata" instead of throwing.
    let file: any
    try {
      file = await response.json()
    } catch {
      return null
    }
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
    .sort(
      (a, b) =>
        Number(b.trustStatus === 'verified') -
          Number(a.trustStatus === 'verified') ||
        (b.lastActivityAt || 0) - (a.lastActivityAt || 0) ||
        b.itemCount - a.itemCount,
    )
    // Always resolve every verified registry first, then fill the discovery
    // view with a bounded set of the most relevant unverified metadata.
    .slice(0, 120)

  const candidateIds = new Set(candidates.map((registry) => registry.id))
  const cache = new Map<
    string,
    Promise<Partial<
      Pick<DashboardRegistry, 'title' | 'description' | 'logoURI'>
    > | null>
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
export const buildActivityHref = (
  chainId: number,
  registryAddress: string,
  itemID?: string,
) =>
  itemID
    ? `/tcr/${chainId}/${registryAddress}/${itemID}`
    : `/tcr/${chainId}/${registryAddress}`

const cleanPreviewValue = (value: unknown): string => {
  const text = String(value ?? '').trim()
  if (!text) return ''
  if (text.startsWith('/ipfs/') || text.startsWith('ipfs://'))
    return 'IPFS file'
  if (text.length > 92) return `${text.slice(0, 89)}...`
  return text
}

const previewProps = (props?: any[]): { label: string; value: string }[] =>
  (props ?? [])
    .filter((prop) => prop?.isIdentifier || prop?.label || prop?.value)
    .map((prop) => ({
      label: String(prop?.label || 'Field'),
      value: cleanPreviewValue(prop?.value),
    }))
    .filter((prop) => prop.value)
    .slice(0, 2)

/**
 * Court outcome of a resolved dispute. Ruling Accept favors the requester,
 * Reject the challenger, None means the court refused to rule (the request
 * fails: a submission stays off the list, a removal keeps the item).
 */
const disputeOutcomeOf = (
  requestEntity: any,
): DashboardActivity['outcome'] | undefined => {
  if (!requestEntity?.disputed || !requestEntity?.resolved) return undefined
  const isRemoval = requestEntity.requestType === 'ClearingRequested'
  const ruling = String(requestEntity.disputeOutcome ?? 'None')
  if (ruling === 'Accept') return isRemoval ? 'removed' : 'registered'
  if (ruling === 'Reject') return isRemoval ? 'kept' : 'rejected'
  return 'no-ruling'
}

const outcomeLabel = (outcome: NonNullable<DashboardActivity['outcome']>) =>
  outcome === 'registered'
    ? 'Registered by ruling'
    : outcome === 'rejected'
      ? 'Rejected by ruling'
      : outcome === 'removed'
        ? 'Removed by ruling'
        : outcome === 'kept'
          ? 'Kept by ruling'
          : 'Court refused to rule'

const requestToActivity = (
  requestEntity: any,
  kindHint: RegistryKind,
): DashboardActivity => {
  const chainId = toNumber(requestEntity.chainId)
  const registryAddress = normalizeAddress(requestEntity.registry_id)
  const itemID: string | undefined =
    requestEntity.item?.itemID ?? requestEntity.id?.split('@')?.[0]
  const isRemoval = requestEntity.requestType === 'ClearingRequested'
  const isChallenge =
    requestEntity.disputed &&
    normalizeAddress(requestEntity.challenger) !== ZERO_ADDRESS
  const outcome = isChallenge ? disputeOutcomeOf(requestEntity) : undefined
  const timestamp = outcome
    ? toNumber(requestEntity.resolutionTime) ||
      toNumber(requestEntity.challengeTime)
    : toNumber(requestEntity.challengeTime) ||
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
    previewProps: previewProps(requestEntity.item?.props),
    actor: normalizeAddress(requestEntity.requester),
    secondaryActor: normalizeAddress(requestEntity.challenger),
    kind: outcome
      ? 'resolution'
      : isChallenge
        ? 'challenge'
        : isRemoval
          ? 'removal'
          : 'submission',
    requestType: isRemoval ? 'removal' : 'submission',
    outcome,
    disputeID: requestEntity.disputeID
      ? String(requestEntity.disputeID)
      : undefined,
    status: outcome
      ? outcomeLabel(outcome)
      : isChallenge
        ? `Dispute #${requestEntity.disputeID || 'pending'}`
        : isRemoval
          ? 'Removal requested'
          : 'Registration requested',
    timestamp,
    href: buildActivityHref(chainId, registryAddress, itemID),
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
    previewProps: previewProps(submission.item?.metadata?.props),
    actor: normalizeAddress(submission.submitter),
    kind: 'submission',
    status: 'Stake submission',
    timestamp: toNumber(submission.createdAt),
    href: buildActivityHref(chainId, registryAddress, submission.item?.itemID),
  }
}

/**
 * A Stake Curate challenge. Once resolved it is a ruling on a listed entry:
 * Accept keeps it, Reject removes it, None (no ruling) withdraws it.
 */
const permanentChallengeToActivity = (
  challenge: any,
  chainId: number,
  registryMap: Map<string, DashboardRegistry>,
): DashboardActivity => {
  const registryAddress = normalizeAddress(challenge.item?.registry?.id)
  const registry = registryMap.get(registryAddress)
  const resolvedAt = toNumber(challenge.resolutionTime)
  const outcome: DashboardActivity['outcome'] = !resolvedAt
    ? undefined
    : challenge.disputeOutcome === 'Accept'
      ? 'kept'
      : challenge.disputeOutcome === 'Reject'
        ? 'removed'
        : 'no-ruling'
  return {
    id: `permanent-challenge-${chainId}-${challenge.id}`,
    chainId,
    registryAddress,
    registryTitle:
      registry?.title || registryTitle(registryAddress, null, 'permanent'),
    itemID: challenge.item?.itemID,
    previewProps: previewProps(challenge.item?.metadata?.props),
    actor: normalizeAddress(challenge.challenger),
    kind: outcome ? 'resolution' : 'challenge',
    outcome,
    disputeID: challenge.disputeID ? String(challenge.disputeID) : undefined,
    status: outcome
      ? outcomeLabel(outcome)
      : `Dispute #${challenge.disputeID || 'pending'}`,
    timestamp: resolvedAt || toNumber(challenge.createdAt),
    href: buildActivityHref(chainId, registryAddress, challenge.item?.itemID),
  }
}

type UserField =
  | 'submissions'
  | 'removals'
  | 'challenges'
  | 'decidedChallenges'
  | 'successfulChallenges'

const emptyChainStats = (): DashboardUser['chains'][number] => ({
  activity: 0,
  submissions: 0,
  removals: 0,
  challenges: 0,
  decidedChallenges: 0,
  successfulChallenges: 0,
  lastActiveAt: 0,
})

/**
 * Counts one action for a curator. `activity` is requests plus challenges:
 * a challenge counts once, whether it is later decided or won.
 */
const accumulateUser = (
  users: Map<string, DashboardUser>,
  chainId: number,
  address: string | undefined | null,
  field: UserField,
  timestamp: number,
) => {
  const normalized = normalizeAddress(address)
  if (!normalized || normalized === ZERO_ADDRESS) return

  const existing =
    users.get(normalized) ??
    ({
      address: normalized,
      chainId,
      chains: {},
      submissions: 0,
      removals: 0,
      challenges: 0,
      decidedChallenges: 0,
      successfulChallenges: 0,
      activity: 0,
      lastActiveAt: 0,
    } satisfies DashboardUser)

  const counts =
    field === 'submissions' || field === 'removals' || field === 'challenges'
  existing[field] += 1
  if (counts) existing.activity += 1
  existing.lastActiveAt = Math.max(existing.lastActiveAt, timestamp)

  const chainStats = existing.chains[chainId] ?? emptyChainStats()
  chainStats[field] += 1
  if (counts) chainStats.activity += 1
  chainStats.lastActiveAt = Math.max(chainStats.lastActiveAt, timestamp)
  existing.chains[chainId] = chainStats

  if (
    chainStats.activity > (existing.chains[existing.chainId]?.activity ?? 0) ||
    timestamp > existing.lastActiveAt
  )
    existing.chainId = chainId

  users.set(normalized, existing)
}

interface NormalizedChain {
  registries: DashboardRegistry[]
  /** Latest requests (and Stake submissions), whatever their state. */
  activities: DashboardActivity[]
  unchallenged: DashboardActivity[]
  /** Unresolved requests with no challenge on this chain. */
  unchallengedCount: number
  unchallengedCapped: boolean
  decided: DashboardActivity[]
  decidedCapped: boolean
  openDisputes: DashboardActivity[]
  bountyWei: string
  verifiedRegistryAddresses: string[]
}

const normalizeEnvio = (payload: any, chainId: number): NormalizedChain => {
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
      // Entries settled on or off the list; the ones with an open request
      // are pendingCount, and entryCount (view.ts) adds the two.
      itemCount:
        toNumber(registry.numberOfRegistered) +
        toNumber(registry.numberOfAbsent),
      activeCount: pending,
      pendingCount: pending,
      disputeCount:
        toNumber(registry.numberOfChallengedRegistrations) +
        toNumber(registry.numberOfChallengedClearing),
      // Envio does not expose registry deployment time. The first request is
      // the closest indexed creation signal available for legacy registries.
      createdAt: toNumber(registry.requests?.[0]?.submissionTime),
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
      // Envio does not expose registry deployment time. The first request is
      // the closest indexed creation signal available for legacy registries.
      createdAt: toNumber(registry.requests?.[0]?.submissionTime),
      lastActivityAt: 0,
      trustStatus: verifiedAddresses.has(address) ? 'verified' : 'unverified',
    })
  }

  const registryByAddress = new Map(registries.map((r) => [r.address, r]))
  for (const requestEntity of [
    ...(payload.lightRequests ?? []),
    ...(payload.classicRequests ?? []),
  ] as DashboardRequestRow[]) {
    const registry = registryByAddress.get(
      normalizeAddress(requestEntity.registry_id),
    )
    if (!registry) continue
    registry.activeCount += 1
    registry.lastActivityAt = Math.max(
      registry.lastActivityAt || 0,
      toNumber(requestEntity.submissionTime),
    )
    if (requestEntity.disputed) registry.disputeCount += 1
  }

  let bountyWei = '0'
  for (const bounty of [
    ...(payload.resolvedLightBounties ?? []),
    ...(payload.resolvedClassicBounties ?? []),
  ])
    bountyWei = addBigIntStrings(bountyWei, bounty.deposit)

  const toActivities = (light: string, classic: string) => [
    ...(payload[light] ?? []).map((row: DashboardRequestRow) =>
      requestToActivity(row, 'light'),
    ),
    ...(payload[classic] ?? []).map((row: DashboardRequestRow) =>
      requestToActivity(row, 'classic'),
    ),
  ]

  const openRequestRows = [
    ...(payload.openLightRequests ?? []),
    ...(payload.openClassicRequests ?? []),
  ] as DashboardRequestRow[]
  const openRequestsByRegistry = new Map<string, number>()
  for (const row of openRequestRows) {
    const address = normalizeAddress(row.registry_id)
    openRequestsByRegistry.set(
      address,
      (openRequestsByRegistry.get(address) ?? 0) + 1,
    )
  }
  const openRequestsCapped =
    (payload.openLightRequests ?? []).length >= OPEN_REQUEST_LIMIT ||
    (payload.openClassicRequests ?? []).length >= OPEN_REQUEST_LIMIT

  // Requests open per list = its unresolved requests right now (the
  // per-list status counters drift on some deployments).
  if (!openRequestsCapped)
    for (const registry of registries) {
      const open = openRequestsByRegistry.get(registry.address) ?? 0
      registry.pendingCount = open
      registry.activeCount = open
    }

  const decided = toActivities('decidedLight', 'decidedClassic')
  return {
    registries,
    activities: toActivities('latestLight', 'latestClassic'),
    unchallenged: toActivities('unchallengedLight', 'unchallengedClassic'),
    unchallengedCount: openRequestRows.filter((row) => !row.disputed).length,
    unchallengedCapped: openRequestsCapped,
    decided,
    decidedCapped:
      (payload.decidedLight ?? []).length >= DECIDED_LIMIT ||
      (payload.decidedClassic ?? []).length >= DECIDED_LIMIT,
    openDisputes: toActivities('openLightDisputes', 'openClassicDisputes'),
    bountyWei,
    verifiedRegistryAddresses: [...verifiedAddresses],
  }
}

const normalizePermanent = (
  payload: any,
  chainId: number,
  since: number,
  verifiedRegistryAddresses: Set<string>,
): NormalizedChain => {
  const registries: DashboardRegistry[] = (payload.registries ?? []).map(
    (registry: PermanentRegistryRow) => {
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
        // The Stake Curate subgraph's per-status counters drift (some go
        // negative), but each status change moves one entry between them,
        // so their raw sum is the true total, and submitted + disputed the
        // entries still listed (checked against lists counted entry by
        // entry). "In court" comes from the open challenges further down.
        itemCount: Math.max(
          0,
          toNumber(registry.numberOfSubmitted) +
            toNumber(registry.numberOfAbsent) +
            toNumber(registry.numberOfDisputed),
        ),
        activeCount: 0,
        pendingCount: Math.max(
          0,
          toNumber(registry.numberOfSubmitted) +
            toNumber(registry.numberOfDisputed),
        ),
        disputeCount: Math.max(0, toNumber(registry.numberOfDisputed)),
        bountyWei: registry.submissionMinDeposit,
        token: registry.token,
        arbitratorExtraData:
          registry.arbitrationSettings?.[0]?.arbitratorExtraData,
        metaEvidenceURI: registry.arbitrationSettings?.[0]?.metaEvidenceURI,
        createdAt: toNumber(registry.createdAt),
        lastActivityAt: toNumber(registry.createdAt),
        trustStatus: verifiedRegistryAddresses.has(address)
          ? ('verified' as TrustStatus)
          : ('unverified' as TrustStatus),
      }
    },
  )

  const registryMap = new Map(registries.map((r) => [r.address, r]))
  const touch = (registryId: string | undefined, timestamp: number) => {
    const registry = registryMap.get(normalizeAddress(registryId))
    if (!registry) return undefined
    registry.lastActivityAt = Math.max(registry.lastActivityAt || 0, timestamp)
    if (timestamp >= since) registry.activeCount += 1
    return registry
  }

  for (const submission of (payload.submissions ??
    []) as PermanentSubmissionRow[])
    touch(submission.item?.registry?.id, toNumber(submission.createdAt))

  for (const challenge of (payload.challenges ??
    []) as PermanentChallengeRow[]) {
    const registry = touch(
      challenge.item?.registry?.id,
      toNumber(challenge.createdAt),
    )
    if (registry) registry.disputeCount += 1
  }

  const bountyWei = (payload.challenges ?? [])
    .filter(
      (challenge: PermanentChallengeRow) =>
        challenge.disputeOutcome === 'Reject',
    )
    .reduce(
      (sum: string, challenge: PermanentChallengeRow) =>
        addBigIntStrings(sum, challenge.challengerStake),
      '0',
    )

  const toActivity = (challenge: PermanentChallengeRow) =>
    permanentChallengeToActivity(challenge, chainId, registryMap)

  return {
    registries,
    activities: (payload.submissions ?? [])
      .slice(0, LATEST_LIMIT)
      .map((submission: PermanentSubmissionRow) =>
        permanentSubmissionToActivity(submission, chainId, registryMap),
      ),
    unchallenged: [],
    unchallengedCount: 0,
    unchallengedCapped: false,
    decided: (payload.decidedChallenges ?? []).map(toActivity),
    decidedCapped: (payload.decidedChallenges ?? []).length >= DECIDED_LIMIT,
    openDisputes: (payload.openChallenges ?? []).map(toActivity),
    bountyWei,
    verifiedRegistryAddresses: [...verifiedRegistryAddresses],
  }
}

const mergeUsers = (maps: Map<string, DashboardUser>[]): DashboardUser[] => {
  const merged = new Map<string, DashboardUser>()

  for (const map of maps)
    for (const [address, user] of map) {
      const existing = merged.get(address)
      if (!existing) {
        merged.set(address, {
          ...user,
          chains: Object.fromEntries(
            Object.entries(user.chains).map(([id, stats]) => [
              id,
              { ...stats },
            ]),
          ),
        })
        continue
      }
      existing.submissions += user.submissions
      existing.removals += user.removals
      existing.challenges += user.challenges
      existing.decidedChallenges += user.decidedChallenges
      existing.successfulChallenges += user.successfulChallenges
      existing.activity += user.activity
      existing.lastActiveAt = Math.max(existing.lastActiveAt, user.lastActiveAt)
      for (const [chainIdKey, chainStats] of Object.entries(user.chains)) {
        const chainId = Number(chainIdKey)
        const existingChain = existing.chains[chainId] ?? emptyChainStats()
        existingChain.submissions += chainStats.submissions
        existingChain.removals += chainStats.removals
        existingChain.challenges += chainStats.challenges
        existingChain.decidedChallenges += chainStats.decidedChallenges
        existingChain.successfulChallenges += chainStats.successfulChallenges
        existingChain.activity += chainStats.activity
        existingChain.lastActiveAt = Math.max(
          existingChain.lastActiveAt,
          chainStats.lastActiveAt,
        )
        existing.chains[chainId] = existingChain
      }
      existing.chainId = Number(
        Object.entries(existing.chains).sort(
          ([, a], [, b]) =>
            b.activity - a.activity || b.lastActiveAt - a.lastActiveAt,
        )[0]?.[0] ?? existing.chainId,
      )
    }

  return [...merged.values()].sort(
    (a, b) => b.activity - a.activity || b.lastActiveAt - a.lastActiveAt,
  )
}

const normalizeEnvioLeaderboardPage = (
  payload: any,
  chainId: number,
): Map<string, DashboardUser> => {
  const users = new Map<string, DashboardUser>()

  for (const requestEntity of [
    ...(payload.lightRequests ?? []),
    ...(payload.classicRequests ?? []),
  ]) {
    const timestamp = toNumber(requestEntity.submissionTime)
    const field =
      requestEntity.requestType === 'ClearingRequested'
        ? 'removals'
        : 'submissions'
    accumulateUser(users, chainId, requestEntity.requester, field, timestamp)

    if (!requestEntity.disputed) continue
    const challengedAt = toNumber(requestEntity.challengeTime) || timestamp
    accumulateUser(
      users,
      chainId,
      requestEntity.challenger,
      'challenges',
      challengedAt,
    )
    if (!requestEntity.resolved) continue
    // Decided: the court ruled (or refused to). Reject is a ruling for the
    // challenger, whichever request (submission or removal) was challenged.
    accumulateUser(
      users,
      chainId,
      requestEntity.challenger,
      'decidedChallenges',
      challengedAt,
    )
    if (requestEntity.disputeOutcome === 'Reject')
      accumulateUser(
        users,
        chainId,
        requestEntity.challenger,
        'successfulChallenges',
        challengedAt,
      )
  }

  return users
}

const normalizePermanentLeaderboardPage = (
  payload: any,
  chainId: number,
  since: number,
): Map<string, DashboardUser> => {
  const users = new Map<string, DashboardUser>()

  for (const submission of payload.submissions ?? []) {
    const timestamp = toNumber(submission.createdAt)
    if (timestamp < since) continue
    accumulateUser(
      users,
      chainId,
      submission.submitter,
      'submissions',
      timestamp,
    )
  }

  for (const challenge of payload.challenges ?? []) {
    const timestamp = toNumber(challenge.createdAt)
    if (timestamp < since) continue
    accumulateUser(
      users,
      chainId,
      challenge.challenger,
      'challenges',
      timestamp,
    )
    if (!toNumber(challenge.resolutionTime)) continue
    accumulateUser(
      users,
      chainId,
      challenge.challenger,
      'decidedChallenges',
      timestamp,
    )
    if (challenge.disputeOutcome === 'Reject')
      accumulateUser(
        users,
        chainId,
        challenge.challenger,
        'successfulChallenges',
        timestamp,
      )
  }

  return users
}

interface ActivityEvent {
  at: number
  chainId: number
  kind: 'submissions' | 'removals' | 'challenges'
}

const envioPageEvents = (payload: any, chainId: number): ActivityEvent[] => {
  const events: ActivityEvent[] = []
  for (const requestEntity of [
    ...(payload.lightRequests ?? []),
    ...(payload.classicRequests ?? []),
  ]) {
    const at = toNumber(requestEntity.submissionTime)
    if (at)
      events.push({
        at,
        chainId,
        kind:
          requestEntity.requestType === 'ClearingRequested'
            ? 'removals'
            : 'submissions',
      })
    if (requestEntity.disputed) {
      const challengedAt = toNumber(requestEntity.challengeTime) || at
      if (challengedAt)
        events.push({ at: challengedAt, chainId, kind: 'challenges' })
    }
  }
  return events
}

const permanentPageEvents = (
  payload: any,
  since: number,
  chainId: number,
): ActivityEvent[] => [
  ...(payload.submissions ?? [])
    .map((submission: any) => toNumber(submission.createdAt))
    .filter((at: number) => at >= since)
    .map((at: number) => ({ at, chainId, kind: 'submissions' as const })),
  ...(payload.challenges ?? [])
    .map((challenge: any) => toNumber(challenge.createdAt))
    .filter((at: number) => at >= since)
    .map((at: number) => ({ at, chainId, kind: 'challenges' as const })),
]

/** Buckets events into the window's 30 UTC days, oldest first. */
const buildSeries = (
  events: ActivityEvent[],
  since: number,
): DashboardDay[] => {
  const days: DashboardDay[] = Array.from({ length: 30 }, (_, index) => ({
    day: since + index * DAY,
    submissions: 0,
    removals: 0,
    challenges: 0,
  }))
  for (const event of events) {
    const index = Math.floor((event.at - since) / DAY)
    if (index >= 0 && index < days.length) days[index][event.kind] += 1
  }
  return days
}

const pageRows = (payload: any, keys: string[]) =>
  Math.max(0, ...keys.map((key) => (payload?.[key] ?? []).length))

const fetchCuratorLeaderboard = async (
  since: number,
  chains: number[],
  failed: Set<number>,
): Promise<{
  users: DashboardUser[]
  series: DashboardDay[]
  seriesByChain: Record<number, DashboardDay[]>
  seriesTruncated: boolean
}> => {
  const lastPage = LEADERBOARD_MAX_PAGES - 1
  const noteFailure = (chainId: number) => {
    failed.add(chainId)
    return null
  }
  const pages = await Promise.all(
    chains.flatMap((chainId) =>
      Array.from({ length: LEADERBOARD_MAX_PAGES }).flatMap((_, page) => [
        safeRequest<any>(subgraphUrl[chainId], ENVIO_CURATOR_PAGE_QUERY, {
          chainId,
          since,
          limit: LEADERBOARD_PAGE_SIZE,
          offset: page * LEADERBOARD_PAGE_SIZE,
        }).then((payload) =>
          payload
            ? {
                users: normalizeEnvioLeaderboardPage(payload, chainId),
                events: envioPageEvents(payload, chainId),
                full:
                  page === lastPage &&
                  pageRows(payload, ['lightRequests', 'classicRequests']) >=
                    LEADERBOARD_PAGE_SIZE,
              }
            : noteFailure(chainId),
        ),
        safeRequest<any>(
          subgraphUrlPermanent[chainId],
          PERMANENT_CURATOR_PAGE_QUERY,
          {
            first: LEADERBOARD_PAGE_SIZE,
            skip: page * LEADERBOARD_PAGE_SIZE,
          },
        ).then((payload) =>
          payload
            ? {
                users: normalizePermanentLeaderboardPage(
                  payload,
                  chainId,
                  since,
                ),
                events: permanentPageEvents(payload, since, chainId),
                full: false,
              }
            : noteFailure(chainId),
        ),
      ]),
    ),
  )

  const valid = pages.filter(Boolean) as {
    users: Map<string, DashboardUser>
    events: ActivityEvent[]
    full: boolean
  }[]
  const events = valid.flatMap((page) => page.events)
  return {
    // Every curator, not a top slice: the page's totals (curators,
    // challenges, decided, won) are summed from this list.
    users: mergeUsers(valid.map((page) => page.users)),
    series: buildSeries(events, since),
    seriesByChain: Object.fromEntries(
      chains.map((chainId) => [
        chainId,
        buildSeries(
          events.filter((event) => event.chainId === chainId),
          since,
        ),
      ]),
    ),
    seriesTruncated: valid.some((page) => page.full),
  }
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
    (sum, registry) => sum + entryCount(registry),
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

/**
 * The first page of each registry kind comes with the dashboard query; when
 * it is full, read on until a short page, so no list drops out of the totals.
 */
const readRemainingRegistries = async (
  payload: any,
  chainId: number,
  onFail: () => void = () => undefined,
) => {
  const pages: [string, string][] = [
    ['lregistries', ENVIO_LREGISTRY_PAGE_QUERY],
    ['registries', ENVIO_REGISTRY_PAGE_QUERY],
  ]
  await Promise.all(
    pages.map(async ([key, query]) => {
      const rows: unknown[] = payload[key] ?? []
      let last = rows.length
      for (
        let page = 1;
        last >= REGISTRY_PAGE_SIZE && page < REGISTRY_MAX_PAGES;
        page += 1
      ) {
        const next = await safeRequest<any>(subgraphUrl[chainId], query, {
          chainId,
          offset: page * REGISTRY_PAGE_SIZE,
        })
        if (!next) onFail()
        const more: unknown[] = next?.[key] ?? []
        rows.push(...more)
        last = next ? more.length : 0
      }
      payload[key] = rows
    }),
  )
  return payload
}

/** The app's load: every chain, list metadata, creation-time refresh. */
export const fetchDashboardData = (): Promise<DashboardData> =>
  loadDashboardData({ refreshCreationTimes: true })

export const loadDashboardData = async ({
  refreshCreationTimes,
  chains = SUPPORTED_CHAIN_IDS,
  enrichMetadata = true,
}: {
  /** Scan chain logs in the background for list creation times. */
  refreshCreationTimes: boolean
  /** The chains to read (the landing page reads the mainnets only). */
  chains?: number[]
  /** Read missing list metadata from IPFS (titles, logos). */
  enrichMetadata?: boolean
}): Promise<DashboardData> => {
  const since = windowStart(Math.floor(Date.now() / 1000))
  // Chains where any query failed or timed out: their figures are partial.
  const failed = new Set<number>()
  // Creation blocks come from chain logs (cached once read). Use what is
  // cached now and refresh in the background; never block the page on it.
  const cachedCreation = readCachedCreationTimes(chains)
  if (refreshCreationTimes)
    void fetchRegistryCreationTimes(chains).catch(() => undefined)
  const envioResults = await Promise.all(
    chains.map(async (chainId) => {
      const payload = await safeRequest<any>(
        subgraphUrl[chainId],
        ENVIO_DASHBOARD_QUERY,
        {
          chainId,
          since,
          verifiedSources: getListOfListsAddresses(chainId),
        },
      )
      if (!payload) failed.add(chainId)
      return payload
        ? normalizeEnvio(
            await readRemainingRegistries(payload, chainId, () =>
              failed.add(chainId),
            ),
            chainId,
          )
        : null
    }),
  )

  const permanentResults = await Promise.all(
    chains.map(async (chainId, index) => {
      const payload = await safeRequest<any>(
        subgraphUrlPermanent[chainId],
        PERMANENT_DASHBOARD_QUERY,
        { since: String(since) },
      )
      const verifiedRegistryAddresses = new Set(
        envioResults[index]?.verifiedRegistryAddresses ??
          getListOfListsAddresses(chainId),
      )
      if (!payload) failed.add(chainId)
      return payload
        ? normalizePermanent(payload, chainId, since, verifiedRegistryAddresses)
        : null
    }),
  )

  const allResults = [...envioResults, ...permanentResults].filter(
    Boolean,
  ) as NormalizedChain[]

  const merged = dedupeRegistries(
    allResults.flatMap((result) => result.registries),
  )
  const registries = applyCreationTimes(
    enrichMetadata ? await enrichRegistryMetadata(merged) : merged,
    cachedCreation,
  ).sort(
    (a, b) =>
      Number(b.trustStatus === 'verified') -
        Number(a.trustStatus === 'verified') ||
      b.activeCount - a.activeCount ||
      b.itemCount - a.itemCount ||
      (b.lastActivityAt || 0) - (a.lastActivityAt || 0),
  )

  const newestFirst = (rows: DashboardActivity[]) =>
    rows
      .filter((activity) => activity.timestamp > 0)
      .sort((a, b) => b.timestamp - a.timestamp)

  const openDisputes = newestFirst(
    allResults.flatMap((result) => result.openDisputes),
  )
  // "In court" per list = its disputes that are open right now (the per-list
  // counters drift on some deployments and were double counted before).
  const openByRegistry = new Map<string, number>()
  for (const activity of openDisputes) {
    const key = `${activity.chainId}:${activity.registryAddress}`
    openByRegistry.set(key, (openByRegistry.get(key) ?? 0) + 1)
  }
  for (const registry of registries)
    registry.disputeCount =
      openByRegistry.get(`${registry.chainId}:${registry.address}`) ?? 0

  const unchallengedCount: DashboardData['unchallengedCount'] = {}
  const decidedCapped: DashboardData['decidedCapped'] = {}
  const bountyByChain: Record<number, string> = {}
  chains.forEach((chainId, index) => {
    const envio = envioResults[index]
    const permanent = permanentResults[index]
    unchallengedCount[chainId] = {
      count: envio?.unchallengedCount ?? 0,
      capped: !!envio?.unchallengedCapped,
    }
    decidedCapped[chainId] =
      !!envio?.decidedCapped || !!permanent?.decidedCapped
    bountyByChain[chainId] = addBigIntStrings(
      envio?.bountyWei ?? '0',
      permanent?.bountyWei ?? '0',
    )
  })

  const { users, series, seriesByChain, seriesTruncated } =
    await fetchCuratorLeaderboard(since, chains, failed)

  return {
    generatedAt: Date.now(),
    since,
    series,
    seriesByChain,
    seriesTruncated,
    registries,
    activities: newestFirst(allResults.flatMap((result) => result.activities)),
    unchallenged: newestFirst(
      allResults.flatMap((result) => result.unchallenged),
    ),
    unchallengedCount,
    decided: newestFirst(allResults.flatMap((result) => result.decided)),
    decidedCapped,
    openDisputes,
    users,
    metrics: buildMetrics(registries, users, bountyByChain),
    failedChains: [...failed],
  }
}
