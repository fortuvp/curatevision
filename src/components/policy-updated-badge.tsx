import React, { useMemo } from 'react'
import styled, { keyframes } from 'styled-components'
import useUrlChainId from 'hooks/use-url-chain-id'
import { usePolicyHistory } from 'hooks/use-policy-history'
import {
  formatUpdatedAgo,
  POLICY_RECENT_THRESHOLD_DAYS,
} from 'utils/format-updated-ago'

const Suffix = styled.span<{ $recent: boolean }>`
  margin-left: 6px;
  color: ${({ $recent }) =>
    $recent ? 'var(--color-warning)' : 'var(--color-faint)'};
  font-weight: ${({ $recent }) => ($recent ? 500 : 400)};
`

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`

const LoadingSuffix = styled.span`
  margin-left: 6px;
  color: var(--color-faint);
  animation: ${pulse} 1.4s ease-in-out infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

interface PolicyUpdatedBadgeProps {
  registryAddress?: string | null
}

/**
 * "(updated N days ago)" annotation rendered next to the policy link.
 * Uses the `'latest'` mode so it only scans backwards until the first hit,
 * warmed by the `'full'` cache whenever the user has already opened the
 * policy history.
 */
const PolicyUpdatedBadge: React.FC<PolicyUpdatedBadgeProps> = ({
  registryAddress,
}) => {
  const chainId = useUrlChainId()
  const {
    data: historyData,
    isLoading,
    isFetching,
  } = usePolicyHistory(
    registryAddress ?? undefined,
    chainId ?? undefined,
    'latest',
  )

  const updatedInfo = useMemo(() => {
    const current = historyData?.[0]
    if (!current) return null
    return formatUpdatedAgo(current.startDate)
  }, [historyData])

  if (!registryAddress) return null

  if (updatedInfo)
    return (
      <Suffix $recent={updatedInfo.days < POLICY_RECENT_THRESHOLD_DAYS}>
        ({updatedInfo.text})
      </Suffix>
    )

  if (isLoading || isFetching)
    return <LoadingSuffix>(checking for updates…)</LoadingSuffix>

  return null
}

export default PolicyUpdatedBadge
