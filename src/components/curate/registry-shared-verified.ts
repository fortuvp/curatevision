import { useMemo } from 'react'
import { useQueries, useQuery, type QueryClient } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'
import { subgraphUrl } from 'config/tcr-addresses'
import {
  FALLBACK_LIST_OF_LISTS_ADDRESSES,
  VERIFIED_LIST_OF_LISTS_ADDRESSES,
} from 'config/list-of-lists'
import type { TrustStatus } from 'pages/dashboard/types'

/*
 * One rule for "Kleros Verified", shared by the registry pages, Browse and
 * the profile: a registry is Kleros Verified when it is the chain's Kleros
 * list of lists, or a Registered entry of it; it carries the approval seal
 * (verified-badge.tsx). Every other list is a Community list.
 *
 * The list of lists is the Light registry behind the Kleros Verified lists
 * on the Curate homepage (VERIFIED_LIST_OF_LISTS_ADDRESSES): it moved from
 * Classic to Light Curate in August 2026, with new addresses (Kleros docs:
 * the Curate tutorial and the Light Curate developer notes). The Classic
 * lists of lists it replaced (FALLBACK_LIST_OF_LISTS_ADDRESSES) still run,
 * but they no longer grant the badge: a list registered only there is a
 * Community list, and their own pages point to the current one.
 *
 * A chain's set is one small query (its list of lists' Registered entries,
 * a few dozen rows, paged), cached per chain for ten minutes and shared by
 * every page that asks.
 */

type ListOfListsChain = keyof typeof VERIFIED_LIST_OF_LISTS_ADDRESSES

/** The chain's Kleros list of lists, lowercase, or null. */
export const listOfListsFor = (chainId: number): string | null =>
  VERIFIED_LIST_OF_LISTS_ADDRESSES[
    chainId as ListOfListsChain
  ]?.toLowerCase() ?? null

/** The lists of lists whose Registered entries are verified: the current one. */
export const verifiedSources = (chainId: number): string[] => {
  const address = listOfListsFor(chainId)
  return address ? [address] : []
}

/**
 * The current list of lists when `address` is one of the Classic lists of
 * lists it replaced on that chain, else null.
 */
export const replacedListOfLists = (
  chainId: number | null | undefined,
  address: string | null | undefined,
): string | null => {
  if (!chainId || !address) return null
  const retired: readonly string[] =
    FALLBACK_LIST_OF_LISTS_ADDRESSES[
      chainId as keyof typeof FALLBACK_LIST_OF_LISTS_ADDRESSES
    ] ?? []
  return retired.includes(address.toLowerCase())
    ? listOfListsFor(chainId)
    : null
}

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

const PAGE = 500

/** A list of lists' Registered entries (Classic Item or Light LItem), a page. */
const VERIFIED_REGISTRIES_QUERY = gql`
  query VerifiedRegistries(
    $chainId: Int!
    $verifiedSources: [String!]!
    $offset: Int!
  ) {
    verifiedClassic: Item(
      limit: ${PAGE}
      offset: $offset
      order_by: [{ id: asc }]
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
      limit: ${PAGE}
      offset: $offset
      order_by: [{ id: asc }]
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

/** The registries the list of lists vouches for, plus the list itself. */
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

/**
 * Every Kleros Verified registry on a chain, lowercase. Throws when the
 * indexer fails, so no page shows a trust mark it cannot back.
 */
export const fetchVerifiedRegistries = async (
  chainId: number,
): Promise<string[]> => {
  const sources = verifiedSources(chainId)
  if (sources.length === 0) return []
  const url = subgraphUrl[chainId]
  if (!url) throw new Error(`No indexer for chain ${chainId}`)
  const entries: VerifiedEntry[] = []
  for (let offset = 0; ; offset += PAGE) {
    const result = await request<VerifiedRegistriesResult>(
      url,
      VERIFIED_REGISTRIES_QUERY,
      { chainId, verifiedSources: sources, offset },
    )
    const classic = result.verifiedClassic ?? []
    const light = result.verifiedLight ?? []
    entries.push(...classic, ...light)
    if (classic.length < PAGE && light.length < PAGE) break
  }
  return [...verifiedSetFrom(chainId, entries)]
}

/** The shared query for one chain's set (registry pages, Browse, profile). */
export const verifiedRegistriesQuery = (chainId: number) => ({
  queryKey: ['verifiedRegistries', chainId] as const,
  queryFn: () => fetchVerifiedRegistries(chainId),
  staleTime: 10 * 60_000,
  retry: 1,
})

/** chainId → that chain's Kleros Verified registries (lowercase). */
export type VerifiedSets = ReadonlyMap<number, ReadonlySet<string>>

/**
 * The registries with their trust stamped by this rule: "verified",
 * "unverified" (Community), or "unknown" where their chain's set is not in
 * (loading or failed), so nothing is called Community without data.
 */
export const withVerified = <
  T extends { chainId: number; address: string; trustStatus: TrustStatus },
>(
  registries: T[],
  sets: VerifiedSets,
): T[] =>
  registries.map((registry) => {
    const set = sets.get(registry.chainId)
    const trustStatus: TrustStatus = !set
      ? 'unknown'
      : set.has(registry.address.toLowerCase())
        ? 'verified'
        : 'unverified'
    return registry.trustStatus === trustStatus
      ? registry
      : { ...registry, trustStatus }
  })

/**
 * The sets for several chains, read outside React. A chain whose read fails
 * is left out (its lists read as "unknown"). Pass a query client to share
 * the pages' cache.
 */
export const readVerifiedSets = async (
  chainIds: number[],
  queryClient?: QueryClient,
): Promise<VerifiedSets> => {
  const reads = await Promise.all(
    [...new Set(chainIds)].map(async (chainId) => {
      try {
        const addresses = queryClient
          ? await queryClient.fetchQuery(verifiedRegistriesQuery(chainId))
          : await fetchVerifiedRegistries(chainId)
        return [chainId, new Set(addresses)] as const
      } catch {
        return null
      }
    }),
  )
  return new Map(reads.filter((read) => read !== null))
}

/**
 * The sets for several chains in React: `pending` until every chain has
 * answered or failed, `failed` lists the chains that did not answer.
 */
export const useVerifiedSets = (
  chainIds: number[],
): { sets: VerifiedSets; pending: boolean; failed: number[] } => {
  const results = useQueries({
    queries: chainIds.map((chainId) => verifiedRegistriesQuery(chainId)),
  })
  const stamp = results
    .map((result, index) => `${chainIds[index]}:${result.dataUpdatedAt}`)
    .join(',')
  const sets = useMemo(
    () =>
      new Map(
        results.flatMap((result, index) =>
          result.data ? [[chainIds[index], new Set(result.data)] as const] : [],
        ),
      ),
    // The data changes only when a chain's dataUpdatedAt does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stamp],
  )
  return {
    sets,
    pending: results.some((result) => result.isPending),
    failed: chainIds.filter(
      (_, index) => results[index].isError && !results[index].data,
    ),
  }
}

export interface RegistryTrust {
  /**
   * True (Kleros Verified) or false (Community) once known; undefined while
   * loading or after a failure.
   */
  verified?: boolean
  /** The registry is the chain's list of lists. */
  listOfLists: boolean
  /**
   * The chain's Kleros Verified registries, once read: a list of lists marks
   * its own Registered entries with the seal.
   */
  verifiedSet?: ReadonlySet<string>
}

/** Whether one registry is Kleros Verified, by the shared rule. */
export const useRegistryVerified = (
  chainId: number | null | undefined,
  address: string | null | undefined,
): RegistryTrust => {
  const target = address?.toLowerCase()
  const listOfLists =
    !!chainId && !!target && listOfListsFor(chainId) === target
  const query = useQuery({
    ...verifiedRegistriesQuery(chainId ?? 0),
    enabled: !!chainId && !!target,
  })
  const verifiedSet = useMemo(
    () => (query.data ? new Set(query.data) : undefined),
    [query.data],
  )

  if (!chainId || !target) return { listOfLists: false }
  if (listOfLists) return { verified: true, listOfLists, verifiedSet }
  if (verifiedSet)
    return { verified: verifiedSet.has(target), listOfLists, verifiedSet }
  return { listOfLists }
}
