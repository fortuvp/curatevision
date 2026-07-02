import { NETWORKS } from './networks'

export const VERIFIED_LIST_OF_LISTS_ADDRESSES = {
  [NETWORKS.ethereum]: '0xba0304273a54dfec1fc7f4bccbf4b15519aecf15',
  [NETWORKS.gnosis]: '0xe456c79446c4de1a0ba4d06f294db42ba2fd4f7f',
  [NETWORKS.sepolia]: '0xd965ce430afe0423ff19a5eb08f7c5722efabcaf',
} as const

/**
 * Older Curate deployments still receive traffic through these list-of-lists
 * addresses. They are queried as fallback verification sources so the local
 * dashboard remains useful while product confirms the canonical Gnosis source.
 */
export const FALLBACK_LIST_OF_LISTS_ADDRESSES = {
  [NETWORKS.gnosis]: ['0x2442d40b0aecad0298c2724a97f2f1bbdf2c2615'],
} as const

export const getListOfListsAddresses = (chainId: number): string[] => {
  const canonical = VERIFIED_LIST_OF_LISTS_ADDRESSES[chainId]
  const fallbacks =
    FALLBACK_LIST_OF_LISTS_ADDRESSES[
      chainId as keyof typeof FALLBACK_LIST_OF_LISTS_ADDRESSES
    ] ?? []

  return [...new Set([canonical, ...fallbacks].filter(Boolean))].map((addr) =>
    addr.toLowerCase(),
  )
}
