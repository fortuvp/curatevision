import React from 'react'
import styled from 'styled-components'
import EthereumLogo from 'assets/images/chains/ethereum.svg'
import GnosisLogo from 'assets/images/chains/gnosis.svg'
import { NETWORKS } from 'config/networks'

/*
 * Chain mark in a hairline ring with a top highlight. The mark itself
 * carries the chain's identity; the ring and fill are surface tokens.
 */
const Frame = styled.span<{ $size: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  box-shadow:
    inset 0 0 0 1px var(--glass-border),
    inset 0 1px 0 var(--glass-highlight);

  svg {
    width: ${({ $size }) => Math.max(12, $size - 4)}px;
    height: ${({ $size }) => Math.max(12, $size - 4)}px;
  }
`

const ChainLogo = ({
  chainId,
  size = 18,
}: {
  chainId: number
  size?: number
}) => {
  const Logo = chainId === NETWORKS.gnosis ? GnosisLogo : EthereumLogo

  return (
    <Frame $size={size} aria-hidden="true">
      <Logo />
    </Frame>
  )
}

export default ChainLogo
