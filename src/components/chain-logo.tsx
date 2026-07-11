import React from 'react'
import styled from 'styled-components'
import EthereumLogo from 'assets/images/chains/ethereum.svg'
import GnosisLogo from 'assets/images/chains/gnosis.svg'
import { NETWORKS } from 'config/networks'

const Frame = styled.span<{ $size: number; $chainId: number }>`
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid
    ${({ $chainId }) =>
      $chainId === NETWORKS.gnosis
        ? 'rgba(62, 105, 87, 0.55)'
        : $chainId === NETWORKS.sepolia
          ? 'rgba(155, 89, 182, 0.55)'
          : 'rgba(116, 160, 243, 0.55)'};
  border-radius: 50%;
  background: ${({ $chainId }) =>
    $chainId === NETWORKS.gnosis
      ? 'rgba(62, 105, 87, 0.12)'
      : $chainId === NETWORKS.sepolia
        ? 'rgba(155, 89, 182, 0.12)'
        : 'rgba(116, 160, 243, 0.12)'};

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
    <Frame $chainId={chainId} $size={size} aria-hidden="true">
      <Logo />
    </Frame>
  )
}

export default ChainLogo
