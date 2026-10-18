import React from 'react'
import styled from 'styled-components'
import { CurateIcon, CurateIconName } from './icons'
import {
  ChainChip,
  PanelHeader,
  PanelHint,
  PanelTitle,
  StatusPill,
  Surface,
} from './primitives'
import { NETWORKS_INFO } from 'config/networks'

export interface RegistryInfoField {
  label: string
  value?: React.ReactNode
  icon?: CurateIconName
  hint?: React.ReactNode
}

interface RegistryInfoPanelProps {
  title?: string
  chainId?: number
  address?: string | null
  verified?: boolean
  fields: RegistryInfoField[]
}

const Panel = styled(Surface)`
  margin: 18px var(--horizontal-padding) 0;
  padding: 0;
`

const Summary = styled.summary`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  min-height: 72px;
  padding: 18px 20px;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }
`

const SummaryLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const SummaryMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
`

const IconFrame = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  color: var(--curate-live);
  background: var(--color-primary-soft);
`

const Content = styled.div`
  padding: 0 20px 20px;
`

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 1100px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`

const Field = styled.div`
  min-width: 0;
  min-height: 104px;
  padding: 14px;
  border: 1px solid var(--curate-border);
  border-radius: 14px;
  background: var(--color-raised);
`

const FieldLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  color: var(--curate-faint);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`

const FieldValue = styled.div`
  margin-top: 10px;
  color: var(--curate-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
  white-space: normal;
`

const AddressValue = styled.span`
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  font-size: 12px;
  line-height: 1.55;
`

const FieldHint = styled.div`
  margin-top: 7px;
  color: var(--curate-muted);
  font-size: 12px;
  line-height: 1.45;
`

const shortAddress = (address?: string | null): string =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'

const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/

const renderFieldValue = (value: React.ReactNode) =>
  typeof value === 'string' && ADDRESS_PATTERN.test(value) ? (
    <AddressValue>{value}</AddressValue>
  ) : (
    value
  )

const RegistryInfoPanel = ({
  title = 'Registry Info',
  chainId,
  address,
  verified,
  fields,
}: RegistryInfoPanelProps) => {
  const chain =
    chainId && NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
      ? NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
      : undefined
  const visibleFields = fields.filter((field) => field.value)

  return (
    <Panel as="details">
      <Summary>
        <SummaryLeft>
          <IconFrame>
            <CurateIcon name="policy" size={20} />
          </IconFrame>
          <PanelHeader style={{ marginBottom: 0 }}>
            <div>
              <PanelTitle>{title}</PanelTitle>
              <PanelHint>
                {address ? shortAddress(address) : 'Operational parameters'}
              </PanelHint>
            </div>
          </PanelHeader>
        </SummaryLeft>
        <SummaryMeta>
          {chain && <ChainChip chainId={Number(chain.chainId)} />}
          <StatusPill tone={verified ? 'registered' : 'neutral'}>
            {verified ? 'Verified' : 'Discovery'}
          </StatusPill>
          <CurateIcon name="chevron-down" size={18} />
        </SummaryMeta>
      </Summary>
      <Content>
        <FieldGrid>
          {visibleFields.map((field) => (
            <Field key={field.label}>
              <FieldLabel>
                {field.icon && <CurateIcon name={field.icon} size={14} />}
                {field.label}
              </FieldLabel>
              <FieldValue
                title={
                  ['string', 'number'].includes(typeof field.value)
                    ? String(field.value)
                    : undefined
                }
              >
                {renderFieldValue(field.value)}
              </FieldValue>
              {field.hint && <FieldHint>{field.hint}</FieldHint>}
            </Field>
          ))}
        </FieldGrid>
      </Content>
    </Panel>
  )
}

export default RegistryInfoPanel
