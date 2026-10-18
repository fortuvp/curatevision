import React, { useState } from 'react'
import styled from 'styled-components'
import useUrlChainId from 'hooks/use-url-chain-id'
import { getAddressPage } from 'utils/network-utils'
import { CurateIcon } from './icons'
import { Data, truncateMiddle } from './primitives'

/*
 * An address as DESIGN.md wants it: middle-truncated mono with the full value
 * on hover, an explorer link and a copy action. Used by the Stake Curate item
 * page for submitters, challengers, arbitrators and evidence authors.
 */

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

const Anchor = styled.a`
  color: var(--color-text);
  text-decoration: none;

  &:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }
`

const Copy = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-faint);
  cursor: pointer;

  &:hover {
    color: var(--color-text);
    background: var(--color-raised);
  }
`

export const AddressLink = ({
  address,
  label,
}: {
  address: string
  /** Replaces the truncated address, e.g. "you". */
  label?: string
}) => {
  const chainId = useUrlChainId()
  const [copied, setCopied] = useState(false)
  const href = getAddressPage({ networkId: chainId ?? 0, address })

  const copy = () => {
    navigator.clipboard
      ?.writeText(address)
      .then(() => {
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
        return true
      })
      .catch(() => setCopied(false))
  }

  return (
    <Wrap>
      <Anchor
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={address}
      >
        <Data $weight={500}>{label ?? truncateMiddle(address)}</Data>
      </Anchor>
      <Copy
        type="button"
        onClick={copy}
        aria-label={copied ? 'Copied' : 'Copy address'}
        title={copied ? 'Copied' : 'Copy address'}
      >
        <CurateIcon name={copied ? 'check' : 'copy'} size={14} />
      </Copy>
    </Wrap>
  )
}

export default AddressLink
