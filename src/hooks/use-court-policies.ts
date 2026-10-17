import { useQuery } from '@tanstack/react-query'
import { ethers } from 'ethers'
import { PolicyRegistryABI as _PolicyRegistry } from 'utils/abis/policy-registry'

const MAX_COURTS = 50

interface Court {
  courtID: number
  name: string
  description?: string
  feeForJuror?: string
  key: string
  value: string
  label: string
}

const ARBITRATOR_COURTS_ABI = [
  'function courts(uint256) view returns (uint96 parent, bool hiddenVotes, uint256[] children, uint256 minStake, uint256 alpha, uint256 feeForJuror, uint256 jurorsForCourt)',
]

const fetchCourtPolicies = async (
  policyAddress: string,
  library: EthersLibrary,
  arbitratorAddress?: string,
): Promise<Court[]> => {
  const policyRegistry = new ethers.Contract(
    policyAddress,
    _PolicyRegistry,
    library,
  )

  const policyPaths = await Promise.all(
    Array.from({ length: MAX_COURTS }, (_, i) =>
      policyRegistry
        .policies(i)
        .then((path: string) => ({ courtID: i, path }))
        .catch(() => ({ courtID: i, path: '' })),
    ),
  )

  const fetchedCourts = policyPaths.filter(({ path }) => path && path !== '')
  if (fetchedCourts.length === 0) return []

  const arbitrator = arbitratorAddress
    ? new ethers.Contract(arbitratorAddress, ARBITRATOR_COURTS_ABI, library)
    : null

  return Promise.all(
    fetchedCourts.map(async ({ courtID, path }) => {
      const URL = path.startsWith('/ipfs/')
        ? `${process.env.REACT_APP_IPFS_GATEWAY}${path}`
        : path
      const [policy, courtData] = await Promise.all([
        fetch(URL)
          .then((response) => response.json())
          .catch(() => null),
        arbitrator
          ?.courts(courtID)
          .then((court: { feeForJuror?: ethers.BigNumber } & unknown[]) =>
            (court.feeForJuror ?? court[5])?.toString(),
          )
          .catch(() => undefined),
      ])
      const name = policy?.name || `Court ${courtID}`
      return {
        courtID,
        name,
        description: policy?.description || policy?.summary,
        feeForJuror: courtData,
        key: String(courtID),
        value: String(courtID),
        label: name,
      }
    }),
  )
}

const useCourtPolicies = (
  policyAddress: string | undefined,
  library: EthersLibrary | null | undefined,
  arbitratorAddress?: string,
) =>
  useQuery({
    queryKey: ['courtPolicies', policyAddress, arbitratorAddress],
    queryFn: () =>
      fetchCourtPolicies(policyAddress!, library!, arbitratorAddress),
    enabled: !!policyAddress && !!library,
    staleTime: Infinity,
  })

export default useCourtPolicies
export type { Court }
