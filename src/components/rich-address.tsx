import React from 'react'
import styled from 'styled-components'
import { Tooltip } from 'components/ui'
import Icon from 'components/ui/Icon'
import { parseRichAddress } from '../utils/rich-address'
import { shortenAddress } from '../utils/string'

const Unknown = styled.span`
  color: var(--color-danger);
  overflow-wrap: anywhere;
`

const Anchor = styled.a<{ $invalid?: boolean }>`
  color: ${({ $invalid }) =>
    $invalid ? 'var(--color-warning)' : 'var(--color-primary)'};
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  font-weight: 500;
  text-decoration: underline;
`

const RichAddress: React.FC<{ crude: string }> = ({ crude }) => {
  const richAddress = parseRichAddress(crude)
  if (richAddress === null) return <Unknown>Unknown address “{crude}”</Unknown>

  const { address, reference, link, passedTest } = richAddress
  const labelText = `${reference.label}: `
  if (!passedTest)
    return (
      <Tooltip title="This address is not valid">
        <Icon type="warning" style={{ color: 'inherit' }} />
        &nbsp;
        <Anchor $invalid href={link} rel="noreferrer" target="_blank">
          {labelText}
          {shortenAddress(address)}
        </Anchor>
      </Tooltip>
    )

  return (
    <Anchor href={link} rel="noreferrer" target="_blank">
      {labelText}
      {shortenAddress(address)}
    </Anchor>
  )
}

export default RichAddress
