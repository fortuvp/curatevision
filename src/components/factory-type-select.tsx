import React from 'react'
import styled from 'styled-components'
import { Select, Tooltip } from 'components/ui'
import Icon from 'components/ui/Icon'

type FactoryType = 'light' | 'permanent'

const TYPE_COPY: Record<FactoryType, { label: string; tooltip: string }> = {
  light: {
    label: 'Traditional',
    tooltip:
      'Best for one-time or periodic verification. The submitter deposit is automatically returned after the challenge period if no successful challenge is made.',
  },
  permanent: {
    label: 'Stake',
    tooltip:
      'Best for continuous monitoring. The submitter stake stays locked until withdrawn, so it remains available as a bounty for others to check the entry over time.',
  },
}

const OptionLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
`

const TypeOption = ({ type }: { type: FactoryType }) => (
  <OptionLabel>
    {TYPE_COPY[type].label}
    <Tooltip title={TYPE_COPY[type].tooltip}>
      <Icon type="question-circle-o" />
    </Tooltip>
  </OptionLabel>
)

const routeForType = (
  type: FactoryType,
  chainId: string | number | undefined,
) => {
  if (type === 'permanent') return `/factory-permanent/${chainId}`
  return `/factory/${chainId}`
}

const FactoryTypeSelect = ({
  current,
  chainId,
  navigate,
}: {
  current: FactoryType
  chainId: string | number | undefined
  navigate: (path: string) => void
}) => (
  <Select
    defaultValue={current}
    style={{ width: 180, marginLeft: 8 }}
    dropdownStyle={{ width: 240 }}
    onChange={(value) => {
      const nextType = value as FactoryType
      if (nextType !== current) navigate(routeForType(nextType, chainId))
    }}
  >
    <Select.Option value="light">
      <TypeOption type="light" />
    </Select.Option>
    <Select.Option value="permanent">
      <TypeOption type="permanent" />
    </Select.Option>
  </Select>
)

export default FactoryTypeSelect
