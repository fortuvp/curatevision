import { useQuery, useQueryClient } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { subgraphUrl } from 'config/tcr-addresses'
import { getListOfListsAddresses } from 'config/list-of-lists'
import type { DashboardData } from 'pages/dashboard/types'

/*
 * One rule for "Verified", shared by the registry pages, Browse and the
 * dashboard: a registry is Verified when it is one of the chain's Kleros
 * lists of lists, or a Registered entry of one (Classic Item or Light LItem).
 * Anything else is Discovery. The registry pages read the whole set for
 * their chain with one small query (the two "verified" parts of the
 * dashboard query, a few dozen rows), cached per chain, so moving between
 * registries costs nothing; they never run the full dashboard query.
 */

/** The lists of lists whose Registered entries are Verified, lowercase. */
export const verifiedSources = (chainId: number): string[] =>
  getListOfListsAddresses(chainId)

const ADDRESS = /^0x[a-fA-F0-9]{40}$/

/**
 * The registry address an entry of a list of lists points to: the first
 * address-shaped field of a Light entry, else the address in a Classic
 * entry's RLP data (0xd594 + 20 bytes), else the first address in the data.
 * Lowercase, or null.
 */
export const extractRegistryAddress = (
  value?: string | null,
  props?: ({ value?: unknown } | null | undefined)[] | null,
): string | null => {
  const propAddress = props
    ?.map((prop) => prop?.value)
    .find(
      (candidate): candidate is string =>
        typeof candidate === 'string' && ADDRESS.test(candidate),
    )
  if (propAddress) return propAddress.toLowerCase()

  if (!value) return null
  const encodedAddress = value.match(/0xd594([a-fA-F0-9]{40})/)
  if (encodedAddress) return `0x${encodedAddress[1]}`.toLowerCase()

  const rawAddress = value.match(/0x[a-fA-F0-9]{40}/)
  return rawAddress ? rawAddress[0].toLowerCase() : null
}

/** The `verifiedClassic` and `verifiedLight` parts of the dashboard query. */
const VERIFIED_REGISTRIES_QUERY = gql`
  query VerifiedRegistries($chainId: Int!, $verifiedSources: [String!]!) {
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
      }
    }
  }
`

interface VerifiedEntry {
  data?: string | null
  props?: { value?: unknown }[] | null
}

interface VerifiedRegistriesResult {
  verifiedClassic?: VerifiedEntry[] | null
  verifiedLight?: VerifiedEntry[] | null
}

/** The registries a list of lists vouches for, plus the lists themselves. */
export const verifiedSetFrom = (
  chainId: number,
  entries: VerifiedEntry[],
): Set<string> => {
  const verified = new Set(verifiedSources(chainId))
  for (const entry of entries) {
    const address = extractRegistryAddress(entry.data, entry.props)
    if (address) verified.add(address)
  }
  return verified
}

/** Throws when the indexer fails, so the page shows no trust chip. */
const fetchVerifiedRegistries = async (chainId: number): Promise<string[]> => {
  const url = subgraphUrl[chainId]
  if (!url) throw new Error(`No indexer for chain ${chainId}`)
  const result = await request<VerifiedRegistriesResult>(
    url,
    VERIFIED_REGISTRIES_QUERY,
    { chainId, verifiedSources: verifiedSources(chainId) },
  )
  return [
    ...verifiedSetFrom(chainId, [
      ...(result.verifiedClassic ?? []),
      ...(result.verifiedLight ?? []),
    ]),
  ]
}

export interface RegistryTrust {
  /** True or false once known; undefined while loading or after a failure. */
  verified?: boolean
  /** The registry is itself one of the chain's lists of lists. */
  listOfLists: boolean
}

/**
 * Whether one registry is Verified. A list of lists answers at once; any
 * other registry waits for its chain's set. The dashboard's own result,
 * when it is already cached, can only confirm Verified early: its registry
 * list is partial, so it never decides Discovery.
 */
export const useRegistryVerified = (
  chainId: number | null | undefined,
  address: string | null | undefined,
): RegistryTrust => {
  const queryClient = useQueryClient()
  const target = address?.toLowerCase()
  const listOfLists =
    !!chainId && !!target && verifiedSources(chainId).includes(target)
  const query = useQuery({
    queryKey: ['verifiedRegistries', chainId],
    queryFn: () => fetchVerifiedRegistries(chainId as number),
    enabled: !!chainId && !!target && !listOfLists,
    staleTime: 10 * 60_000,
    retry: 1,
  })

  if (!chainId || !target) return { listOfLists: false }
  if (listOfLists) return { verified: true, listOfLists }
  if (query.data) return { verified: query.data.includes(target), listOfLists }

  const dashboard = queryClient.getQueryData<DashboardData>(['curateDashboard'])
  const vouched = dashboard?.registries?.some(
    (registry) =>
      registry.chainId === chainId &&
      registry.address.toLowerCase() === target &&
      registry.trustStatus === 'verified',
  )
  return { verified: vouched ? true : undefined, listOfLists }
}
