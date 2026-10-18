import React, { useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { parseIpfs } from 'utils/ipfs-parse'
import PolicyUpdatedBadge from 'components/policy-updated-badge'
import { getAddressPage } from 'utils/network-utils'
import {
  Body,
  Button,
  ButtonAnchor,
  ChainChip,
  Chip,
  Data,
  Figure,
  KeyValueList,
  Label,
  Small,
  Statement,
  StatusDot,
  Surface,
  truncateMiddle,
} from './primitives'
import { CurateIcon } from './icons'
import { Explainer, type ExplainerStep } from './explainer'

/*
 * Registry header (DESIGN.md): identity, what the list is, the one action
 * with its exact deposit, live counts, and the parameters a curator needs
 * (deposits with their breakdown, challenge period, court, governor), folded
 * under "Parameters". Below it, a per-list explainer that pros can hide.
 */

const Shell = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: 24px 32px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const Identity = styled.div`
  display: flex;
  gap: 16px;
  min-width: 0;
`

const Logo = styled.div<{ $image?: string | null }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 64px;
  height: 64px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: ${({ $image }) =>
    $image
      ? `url(${$image}) center / contain no-repeat`
      : 'var(--color-raised)'};
  background-color: var(--color-surface);
  color: var(--color-faint);
`

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const TitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const Title = styled(Statement).attrs({ as: 'h1' })`
  font-size: clamp(26px, 2vw + 12px, 32px);
  line-height: 1.2;
  max-width: none;
`

const ActionCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
`

const TextButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const TextLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const TextAnchor = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const Parameters = styled.div`
  grid-column: 1 / -1;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
`

const ParamsToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    color: var(--color-text);
  }

  svg {
    transition: transform var(--motion);
  }

  &[aria-expanded='true'] svg {
    transform: rotate(180deg);
  }
`

const ParamsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px 32px;
  margin-top: 16px;
`

export interface RegistryParameter {
  label: string
  value?: React.ReactNode
  hint?: string
}

export interface RegistryStat {
  label: string
  value?: React.ReactNode
}

export const RegistryHeader = ({
  title,
  description,
  logoURI,
  chainId,
  address,
  verified,
  kindLabel,
  itemName,
  primaryLabel,
  primaryAmount,
  onPrimary,
  policyURI,
  onOpenPolicy,
  badgesListTo,
  stats,
  parameters,
  explainerId,
  explainerHeading,
  explainerSteps,
  loading,
}: {
  title?: string
  description?: string
  logoURI?: string | null
  chainId?: number
  address: string
  verified: boolean
  kindLabel: string
  itemName: string
  primaryLabel: string
  primaryAmount?: React.ReactNode
  onPrimary: () => void
  policyURI?: string | null
  onOpenPolicy?: () => void
  badgesListTo?: string
  stats: RegistryStat[]
  parameters: RegistryParameter[]
  explainerId: string
  explainerHeading: string
  explainerSteps: ExplainerStep[]
  loading?: boolean
}) => {
  const [paramsOpen, setParamsOpen] = useState(false)
  const explorer = chainId
    ? getAddressPage({ networkId: chainId, address })
    : null

  return (
    <>
      <Shell $padding="standard" aria-busy={loading}>
        <Identity>
          <Logo $image={logoURI ? parseIpfs(logoURI) : null} aria-hidden>
            {!logoURI && <CurateIcon name="registry" size={26} />}
          </Logo>
          <Copy>
            <TitleRow>
              <Title>
                {title ?? (loading ? 'Loading registry…' : 'Registry')}
              </Title>
            </TitleRow>
            <TitleRow>
              {chainId && <ChainChip chainId={chainId} />}
              <Chip>{kindLabel}</Chip>
              {verified ? (
                <Chip title="Listed on the Kleros Verified list of lists">
                  <StatusDot $tone="registered" aria-hidden /> Verified
                </Chip>
              ) : (
                <Chip title="Not on the Kleros Verified list of lists">
                  Discovery
                </Chip>
              )}
              <Data $muted $weight={400} title={address}>
                {truncateMiddle(address, 8, 6)}
              </Data>
            </TitleRow>
            {description && <Body $muted>{description}</Body>}
            <Links>
              {policyURI && onOpenPolicy && (
                <TextButton type="button" onClick={onOpenPolicy}>
                  <CurateIcon name="policy" size={14} />
                  Listing policy
                  <PolicyUpdatedBadge registryAddress={address} />
                </TextButton>
              )}
              {explorer && (
                <TextAnchor
                  href={explorer}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <CurateIcon name="external" size={14} />
                  Contract
                </TextAnchor>
              )}
              {badgesListTo && (
                <TextLink to={badgesListTo}>
                  <CurateIcon name="verified" size={14} />
                  Badges list
                </TextLink>
              )}
            </Links>
          </Copy>
        </Identity>

        <ActionCol>
          <Button type="button" $variant="primary" $block onClick={onPrimary}>
            <CurateIcon name="submit" size={16} />
            {primaryLabel}
            {primaryAmount && (
              <Data style={{ color: 'inherit' }}>· {primaryAmount}</Data>
            )}
          </Button>
          <Small $muted>
            A deposit, not a fee: it comes back in full if nobody challenges
            your {itemName}.
          </Small>
          <Stats>
            {stats.map((stat) => (
              <Stat key={stat.label}>
                <Figure as="span" style={{ fontSize: 22, lineHeight: '28px' }}>
                  {stat.value ?? '—'}
                </Figure>
                <Label $tone="faint">{stat.label}</Label>
              </Stat>
            ))}
          </Stats>
        </ActionCol>

        <Parameters>
          <ParamsToggle
            type="button"
            aria-expanded={paramsOpen}
            aria-controls="registry-parameters"
            onClick={() => setParamsOpen((open) => !open)}
          >
            Parameters
            <CurateIcon name="chevron-down" size={14} />
          </ParamsToggle>
          {paramsOpen && (
            <ParamsGrid id="registry-parameters">
              {parameters.map((parameter) => (
                <KeyValueList key={parameter.label}>
                  <dt>{parameter.label}</dt>
                  <dd>
                    <Data>{parameter.value ?? '—'}</Data>
                    {parameter.hint && (
                      <div>
                        <Small $muted>{parameter.hint}</Small>
                      </div>
                    )}
                  </dd>
                </KeyValueList>
              ))}
            </ParamsGrid>
          )}
        </Parameters>
      </Shell>

      <div style={{ marginTop: 16 }}>
        <Explainer
          id={explainerId}
          eyebrow="How this list works"
          heading={explainerHeading}
          steps={explainerSteps}
          footer={
            policyURI && onOpenPolicy ? (
              <ButtonAnchor
                as="button"
                type="button"
                $variant="secondary"
                $size="sm"
                onClick={onOpenPolicy}
              >
                Read the listing policy
              </ButtonAnchor>
            ) : undefined
          }
        />
      </div>
    </>
  )
}

export default RegistryHeader
