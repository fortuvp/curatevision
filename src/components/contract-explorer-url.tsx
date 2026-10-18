import React from 'react'
import styled from 'styled-components'
import { getAddressPage } from 'utils/network-utils'
import { CurateIcon } from 'components/curate/icons'

const StyledLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--curate-border);
  border-radius: 10px;
  color: var(--curate-muted);
  background: var(--color-raised);
  text-decoration: none;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background 160ms ease;

  &:hover {
    color: var(--curate-text);
    border-color: var(--curate-border-strong);
    background: var(--color-raised);
  }
`

const ContractExplorerUrl: React.FC<{
  networkId: number
  contractAddress: string
}> = ({ networkId, contractAddress }) => {
  const addressPage = getAddressPage({ networkId, address: contractAddress })
  // Blockscout uses a query param for the contract tab, Etherscan-style
  // explorers use a hash anchor.
  const url = addressPage.includes('blockscout')
    ? `${addressPage}?tab=contract`
    : `${addressPage}#code`

  return (
    <StyledLink
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Open contract explorer"
    >
      <CurateIcon name="external" size={16} />
    </StyledLink>
  )
}
export default ContractExplorerUrl
