import React from 'react'
import styled, { css } from 'styled-components'
import { Link } from 'react-router-dom'
import { ItemTypes } from '@kleros/gtcr-encoder'
import DisplaySelector from 'components/display-selector'
import { CurateIcon } from './icons'
import { parseIpfs } from 'utils/ipfs-parse'
import useTcrMetaEvidence from 'hooks/use-tcr-meta-evidence'
import useCheckPermanentList from 'hooks/use-check-permanent-list'
import useUrlChainId from 'hooks/use-url-chain-id'
import StakeTag from 'assets/images/logo-stake-tag.svg'

type Tone = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'grey'

export type V2Field = {
  label?: string
  value?: unknown
  type?: string
  description?: string
  isIdentifier?: boolean
  allowedFileTypes?: string | string[]
}

const toneVars: Record<Tone, { fg: string; bg: string; border: string }> = {
  blue: {
    fg: 'var(--v2-blue)',
    bg: 'var(--v2-blue-soft)',
    border: 'var(--v2-blue)',
  },
  purple: {
    fg: 'var(--v2-purple)',
    bg: 'var(--v2-purple-soft)',
    border: 'var(--v2-purple)',
  },
  green: {
    fg: 'var(--v2-success)',
    bg: 'var(--v2-success-soft)',
    border: 'var(--v2-success)',
  },
  orange: {
    fg: 'var(--v2-warning)',
    bg: 'var(--v2-warning-soft)',
    border: 'var(--v2-warning)',
  },
  red: {
    fg: 'var(--v2-error)',
    bg: 'var(--v2-error-soft)',
    border: 'var(--v2-error)',
  },
  grey: {
    fg: 'var(--v2-muted)',
    bg: 'var(--v2-soft)',
    border: 'var(--v2-stroke)',
  },
}

export const v2ToneFromLabel = (label?: string | null): Tone => {
  const normalized = (label || '').toLowerCase()
  if (
    normalized.includes('registered') ||
    normalized.includes('included') ||
    normalized.includes('accepted')
  )
    return 'green'
  if (
    normalized.includes('removed') ||
    normalized.includes('rejected') ||
    normalized.includes('withdrawn')
  )
    return 'red'
  if (
    normalized.includes('dispute') ||
    normalized.includes('challenged') ||
    normalized.includes('arbitrator') ||
    normalized.includes('crowdfunding')
  )
    return 'purple'
  if (
    normalized.includes('pending') ||
    normalized.includes('submitted') ||
    normalized.includes('removal') ||
    normalized.includes('execution')
  )
    return 'orange'
  return 'blue'
}

export const V2Card = styled.div<{ $hover?: boolean }>`
  overflow: hidden;
  border: 1px solid var(--v2-stroke);
  border-radius: var(--radius-sm);
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
  color: var(--v2-text);
  transition:
    border-color 120ms ease,
    box-shadow 120ms ease,
    transform 120ms ease,
    background 120ms ease;

  ${({ $hover }) =>
    $hover &&
    css`
      cursor: pointer;

      &:hover {
        border-color: var(--v2-stroke-strong);
        box-shadow: var(--v2-shadow-hover);
        transform: translateY(-1px);
      }
    `}
`

export const V2StatusBanner = styled.div<{ $tone?: Tone; $compact?: boolean }>`
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  min-height: ${({ $compact }) => ($compact ? 'auto' : '44px')};
  padding: ${({ $compact }) => ($compact ? '0' : '0 24px')};
  border-top: ${({ $compact, $tone = 'grey' }) =>
    $compact ? '0' : `5px solid ${toneVars[$tone].border}`};
  background: ${({ $compact, $tone = 'grey' }) =>
    $compact ? 'transparent' : toneVars[$tone].bg};
  color: ${({ $tone = 'grey' }) => toneVars[$tone].fg};
  font-size: 13px;
  font-weight: 650;
  line-height: 18px;
  white-space: nowrap;

  &::before {
    content: '';
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    margin-right: 8px;
    border-radius: 50%;
    background: currentColor;
  }
`

const StatusBannerContent = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  min-width: 0;
  gap: 12px;
`

export const V2Page = styled.main`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px var(--horizontal-padding) 60px;
  color: var(--v2-text);
`

export const V2SectionHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin: 0 0 16px;

  h2 {
    margin: 0;
    color: var(--v2-text);
    font-size: 24px;
    line-height: 32px;
    font-weight: 600;
  }

  p {
    margin: 6px 0 0;
    color: var(--v2-muted);
    line-height: 22px;
  }

  @media (max-width: 720px) {
    flex-direction: column;
  }
`

const RowCard = styled(V2Card)`
  min-height: 64px;
`

const RowInner = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(216px, max-content) max-content;
  align-items: center;
  gap: clamp(16px, 2vw, 32px);
  min-height: 64px;
  padding: 0 28px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 14px;
    padding: 16px;
  }
`

const FieldCluster = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px clamp(16px, 2.4vw, 36px);
  min-width: 0;
`

const FieldWrap = styled.div<{ $image?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  color: var(--v2-text);
  font-size: 14px;
  line-height: 18px;
  word-break: break-word;

  ${({ $image }) =>
    $image &&
    css`
      flex-shrink: 0;
    `}

  a {
    color: var(--v2-blue);
  }
`

const FieldLabel = styled.span`
  color: var(--v2-muted);
  font-size: 12px;
  line-height: 16px;
`

const Thumb = styled.img<{ $large?: boolean }>`
  display: block;
  width: ${({ $large }) => ($large ? '125px' : '40px')};
  height: ${({ $large }) => ($large ? '125px' : '40px')};
  object-fit: contain;
  border-radius: ${({ $large }) => ($large ? '3px' : '24px')};
  background: var(--v2-soft);
`

const ListReference = styled.div<{ $detailed?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $detailed }) =>
    $detailed ? '64px minmax(0, 1fr)' : '40px minmax(0, 1fr)'};
  gap: 10px;
  align-items: center;
  min-width: ${({ $detailed }) => ($detailed ? '260px' : '220px')};
  max-width: 100%;
`

const ListReferenceLogo = styled.img<{ $detailed?: boolean }>`
  width: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  height: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  border-radius: 50%;
  object-fit: contain;
  background: var(--v2-soft);
`

const ListReferenceFallbackLogo = styled.div<{ $detailed?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  height: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  border-radius: 50%;
  background: var(--v2-soft);
  color: var(--v2-blue);
`

const ListReferenceText = styled.div`
  min-width: 0;
`

const ListReferenceTitle = styled.div`
  overflow: hidden;
  color: var(--v2-text);
  font-size: 14px;
  font-weight: 600;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ListReferenceAddress = styled.div`
  overflow: hidden;
  margin-top: 3px;
  color: var(--v2-muted);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const StakeCurateTag = styled(StakeTag)<{ $inline?: boolean }>`
  display: inline-flex;
  width: ${({ $inline }) => ($inline ? '107px' : '96px')};
  height: ${({ $inline }) => ($inline ? '18px' : '16px')};
  margin-top: ${({ $inline }) => ($inline ? '0' : '6px')};
  flex-shrink: 0;

  ${({ theme }) =>
    theme.name === 'dark' &&
    `
    path[fill="#EBD4FF"] {
      fill: ${theme.stakeTagBg};
    }
    path[fill="#220050"] {
      fill: ${theme.stakeTagText};
    }
  `}
`

const ListReferenceCardPreview = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
`

const ListReferenceCardLogo = styled.img`
  width: 125px;
  height: 125px;
  border-radius: 62.5px;
  object-fit: contain;
  background: var(--klerosUIComponentsLightBackground);
`

const ListReferenceCardFallbackLogo = styled(ListReferenceFallbackLogo)`
  width: 125px;
  height: 125px;
  border-radius: 62.5px;
`

const ListReferenceCardTitle = styled.div`
  width: min(100%, 210px);
  overflow: hidden;
  color: var(--klerosUIComponentsPrimaryText);
  font-size: 14px;
  line-height: 18px;
  font-weight: 400;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ListReferenceCardAddress = styled.div`
  width: min(100%, 210px);
  overflow: hidden;
  color: var(--klerosUIComponentsSecondaryText);
  font-size: 14px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RowActions = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`

const RowStatusStack = styled.div<{ $reserveBadge?: boolean }>`
  display: inline-grid;
  grid-template-columns: ${({ $reserveBadge }) =>
    $reserveBadge ? '107px max-content' : 'max-content'};
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  min-width: ${({ $reserveBadge }) => ($reserveBadge ? '207px' : '0')};

  @media (max-width: 900px) {
    justify-content: flex-start;
    min-width: 0;
  }
`

const StatusBadgeSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 107px;
  min-width: 107px;

  ${StakeCurateTag} {
    margin-top: 0;
  }

  @media (max-width: 900px) {
    justify-content: flex-start;
  }
`

const ItemGridCard = styled(V2Card)<{ $hasVisual?: boolean }>`
  min-height: ${({ $hasVisual }) => ($hasVisual ? '274px' : '176px')};
  display: flex;
  flex-direction: column;
`

const ItemGridBody = styled.div<{ $hasVisual?: boolean }>`
  display: flex;
  min-height: ${({ $hasVisual }) => ($hasVisual ? '172px' : '76px')};
  flex: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 18px 20px;
  text-align: center;
`

const ItemGridVisual = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 125px;

  ${FieldWrap} {
    justify-content: center;
  }
`

const ItemGridTitle = styled.div`
  width: 100%;
  min-height: 18px;
  color: var(--v2-text);
  font-size: 14px;
  line-height: 18px;
  font-weight: 600;

  > * {
    justify-content: center;
  }
`

const ItemGridMeta = styled.div`
  color: var(--v2-muted);
  font-size: 12px;
  line-height: 16px;
`

const ItemGridActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 46px;
  padding: 0 18px 18px;
`

const OpenLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  flex-direction: row-reverse;
  gap: 8px;
  color: var(--v2-blue);
  font-size: 14px;
  line-height: 18px;
  text-decoration: none;

  svg {
    transform: rotate(-90deg);
  }

  &:hover {
    color: var(--v2-blue-hover);
  }
`

const WarningCard = styled(V2Card)`
  min-height: 64px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-top: 5px solid var(--v2-warning);
  background: var(--v2-warning-soft);
  color: var(--v2-text);

  button {
    border: 0;
    background: transparent;
    color: var(--v2-blue);
    cursor: pointer;
    font: inherit;
  }
`

const normalizeType = (type?: string) => String(type || '').toLowerCase()

const isImageField = (field: V2Field) =>
  normalizeType(field.type) === normalizeType(ItemTypes.IMAGE) ||
  normalizeType(field.type) === 'image'

const isFileField = (field: V2Field) =>
  normalizeType(field.type) === normalizeType(ItemTypes.FILE) ||
  normalizeType(field.type) === 'file'

const isGtcrAddressField = (field: V2Field) =>
  normalizeType(field.type) === normalizeType(ItemTypes.GTCR_ADDRESS) ||
  normalizeType(field.type) === 'gtcr address'

const fieldScore = (field: V2Field) => {
  if (isImageField(field)) return 0
  if (field.isIdentifier) return 1
  if (isFileField(field)) return 2
  return 3
}

export const getV2PreviewFields = (fields: V2Field[] = []) => {
  const visible = fields
    .filter((field) => {
      const value = field.value
      return value !== undefined && value !== null && String(value) !== ''
    })
    .sort((a, b) => fieldScore(a) - fieldScore(b))

  const preferred = visible.filter(
    (field) => field.isIdentifier || isImageField(field) || isFileField(field),
  )

  return (preferred.length > 0 ? preferred : visible).slice(0, 3)
}

const getItemVisualField = (fields: V2Field[] = []) =>
  getV2PreviewFields(fields).find(
    (field) => isImageField(field) || isGtcrAddressField(field),
  )

const fieldHasValue = (field: V2Field) => {
  const value = field.value
  return value !== undefined && value !== null && String(value) !== ''
}

const isAddressLikeField = (field: V2Field) => {
  const type = normalizeType(field.type)
  return type.includes('address') || type === normalizeType(ItemTypes.ADDRESS)
}

const getItemTitleField = (fields: V2Field[] = []) => {
  const visible = fields
    .filter(fieldHasValue)
    .filter((field) => !isImageField(field) && !isGtcrAddressField(field))

  return (
    visible.find((field) => field.isIdentifier && !isAddressLikeField(field)) ||
    visible.find((field) => normalizeType(field.type) === 'text') ||
    visible.find((field) => !isAddressLikeField(field))
  )
}

const getItemFallbackTitle = (fields: V2Field[] = []) => {
  const fallback = getV2PreviewFields(fields).find(
    (field) => field.value !== undefined && field.value !== null,
  )
  if (!fallback?.value) return 'Metadata unavailable'
  return String(fallback.value)
}

export const V2FieldDisplay = ({
  field,
  detailed = false,
  showStakeBadge = true,
}: {
  field: V2Field
  detailed?: boolean
  showStakeBadge?: boolean
}) => {
  const value = field.value as string | number | boolean | null | undefined
  const image = isImageField(field)

  if (isGtcrAddressField(field) && value)
    return (
      <FieldWrap>
        <V2ListReferenceField
          address={String(value)}
          detailed={detailed}
          showStakeBadge={showStakeBadge}
        />
      </FieldWrap>
    )

  if (image && value)
    return (
      <FieldWrap $image>
        <Thumb
          $large={detailed}
          src={parseIpfs(String(value))}
          alt={field.label || 'Item image'}
        />
      </FieldWrap>
    )

  return (
    <FieldWrap>
      {detailed && field.label && <FieldLabel>{field.label}:</FieldLabel>}
      <DisplaySelector
        type={field.type || ItemTypes.TEXT}
        value={value}
        allowedFileTypes={field.allowedFileTypes as string}
        truncateLinks={!detailed}
        linkImage
      />
    </FieldWrap>
  )
}

const V2ListReferenceField = ({
  address,
  detailed,
  showStakeBadge = true,
}: {
  address: string
  detailed?: boolean
  showStakeBadge?: boolean
}) => {
  const chainId = useUrlChainId()
  const { data: metaEvidence } = useTcrMetaEvidence(
    address || undefined,
    chainId ?? undefined,
  )
  const { isPermanentList } = useCheckPermanentList(
    address || null,
    chainId ?? null,
    !!address && !!chainId,
  )
  const metadata = metaEvidence?.metadata
  const logoURI = metadata?.logoURI
  const title = metadata?.tcrTitle || metadata?.title
  const short =
    address && address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address

  return (
    <ListReference $detailed={detailed}>
      {logoURI ? (
        <ListReferenceLogo
          $detailed={detailed}
          src={parseIpfs(logoURI)}
          alt={title || 'List logo'}
        />
      ) : (
        <ListReferenceFallbackLogo $detailed={detailed}>
          <CurateIcon name="registry" size={detailed ? 24 : 18} />
        </ListReferenceFallbackLogo>
      )}
      <ListReferenceText>
        <ListReferenceTitle>{title || 'Loading list...'}</ListReferenceTitle>
        <ListReferenceAddress>{short}</ListReferenceAddress>
        {showStakeBadge && isPermanentList && (
          <StakeCurateTag aria-label="Stake Curate" />
        )}
      </ListReferenceText>
    </ListReference>
  )
}

const StakeCurateBadgeForAddress = ({
  address,
}: {
  address?: string | null
}) => {
  const chainId = useUrlChainId()
  const { isPermanentList } = useCheckPermanentList(
    address || null,
    chainId ?? null,
    !!address && !!chainId,
  )

  if (!isPermanentList) return null
  return <StakeCurateTag $inline aria-label="Stake Curate" />
}

const V2ListReferenceCard = ({
  address,
  showStakeBadge = true,
}: {
  address: string
  showStakeBadge?: boolean
}) => {
  const chainId = useUrlChainId()
  const { data: metaEvidence } = useTcrMetaEvidence(
    address || undefined,
    chainId ?? undefined,
  )
  const { isPermanentList } = useCheckPermanentList(
    address || null,
    chainId ?? null,
    !!address && !!chainId,
  )
  const metadata = metaEvidence?.metadata
  const logoURI = metadata?.logoURI
  const title = metadata?.tcrTitle || metadata?.title
  const short =
    address && address.length > 12
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : address

  return (
    <ListReferenceCardPreview>
      {logoURI ? (
        <ListReferenceCardLogo
          src={parseIpfs(logoURI)}
          alt={title || 'List logo'}
        />
      ) : (
        <ListReferenceCardFallbackLogo $detailed>
          <CurateIcon name="registry" size={32} />
        </ListReferenceCardFallbackLogo>
      )}
      <ListReferenceCardTitle>
        {title || 'Loading list...'}
      </ListReferenceCardTitle>
      <ListReferenceCardAddress>{short}</ListReferenceCardAddress>
      {showStakeBadge && isPermanentList && (
        <StakeCurateTag aria-label="Stake Curate" />
      )}
    </ListReferenceCardPreview>
  )
}

export const V2ItemRow = ({
  fields,
  statusLabel,
  to,
  openListTo,
  warning,
  onReveal,
  viewMode = 'list',
}: {
  fields?: V2Field[]
  statusLabel?: string
  to: string
  openListTo?: string | null
  warning?: string | null
  onReveal?: () => void
  viewMode?: 'list' | 'grid'
}) => {
  if (warning)
    return (
      <WarningCard>
        <span>{warning}</span>
        {onReveal && <button onClick={onReveal}>Show item</button>}
      </WarningCard>
    )

  const previewFields = getV2PreviewFields(fields)
  const tone = v2ToneFromLabel(statusLabel)
  const linkedRegistryField = fields?.find(
    (field) => isGtcrAddressField(field) && fieldHasValue(field),
  )
  const linkedRegistryAddress = linkedRegistryField?.value
    ? String(linkedRegistryField.value)
    : null

  if (viewMode === 'grid') {
    const visualField = getItemVisualField(fields)
    const titleField = getItemTitleField(fields)
    const hasLinkedRegistryVisual =
      visualField && isGtcrAddressField(visualField)
    const fallbackTitle = hasLinkedRegistryVisual
      ? undefined
      : getItemFallbackTitle(fields)

    return (
      <ItemGridCard $hover $hasVisual={!!visualField}>
        <V2StatusBanner $tone={tone}>
          <StatusBannerContent>
            <span>{statusLabel || 'Unknown'}</span>
            {linkedRegistryAddress && (
              <StakeCurateBadgeForAddress address={linkedRegistryAddress} />
            )}
          </StatusBannerContent>
        </V2StatusBanner>
        <ItemGridBody $hasVisual={!!visualField}>
          {visualField && (
            <ItemGridVisual>
              {hasLinkedRegistryVisual ? (
                <V2ListReferenceCard
                  address={String(visualField.value)}
                  showStakeBadge={false}
                />
              ) : (
                <V2FieldDisplay detailed field={visualField} />
              )}
            </ItemGridVisual>
          )}
          {!hasLinkedRegistryVisual && (
            <>
              <ItemGridTitle>
                {titleField ? (
                  <V2FieldDisplay field={titleField} showStakeBadge={false} />
                ) : (
                  fallbackTitle
                )}
              </ItemGridTitle>
              <ItemGridMeta>
                {titleField?.label || visualField?.label || 'Entry'}
              </ItemGridMeta>
            </>
          )}
        </ItemGridBody>
        <ItemGridActions>
          {openListTo && <OpenLink to={openListTo}>Open List</OpenLink>}
          <OpenLink to={to}>
            Open
            <CurateIcon name="chevron-down" size={16} />
          </OpenLink>
        </ItemGridActions>
      </ItemGridCard>
    )
  }

  return (
    <RowCard $hover>
      <RowInner>
        <FieldCluster>
          {previewFields.length > 0 ? (
            previewFields.map((field, index) => (
              <V2FieldDisplay
                field={field}
                key={`${field.label}-${index}`}
                showStakeBadge={false}
              />
            ))
          ) : (
            <FieldWrap>
              <FieldLabel>Item</FieldLabel>
              <span>Metadata unavailable</span>
            </FieldWrap>
          )}
        </FieldCluster>
        <RowStatusStack $reserveBadge={!!linkedRegistryAddress}>
          {linkedRegistryAddress && (
            <StatusBadgeSlot>
              <StakeCurateBadgeForAddress address={linkedRegistryAddress} />
            </StatusBadgeSlot>
          )}
          <V2StatusBanner $tone={tone} $compact>
            {statusLabel || 'Unknown'}
          </V2StatusBanner>
        </RowStatusStack>
        <RowActions>
          {openListTo && <OpenLink to={openListTo}>Open List</OpenLink>}
          <OpenLink to={to}>
            Open
            <CurateIcon name="chevron-down" size={16} />
          </OpenLink>
        </RowActions>
      </RowInner>
    </RowCard>
  )
}

const InfoCard = styled(V2Card)`
  margin-bottom: 32px;
`

const InfoTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: clamp(20px, 3vw, 32px);

  @media (max-width: 860px) {
    flex-direction: column;
  }
`

const InfoIdentity = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 18px;

  h1 {
    margin: 0;
    color: var(--v2-text);
    font-size: clamp(24px, 3vw, 34px);
    line-height: 1.22;
    font-weight: 600;
  }

  p {
    margin: 10px 0 0;
    color: var(--v2-muted);
    font-size: 14px;
    line-height: 22px;
  }
`

const InfoLogo = styled.img`
  width: 125px;
  height: 125px;
  object-fit: contain;
  flex: 0 0 auto;
`

const InfoMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 16px 28px;
  color: var(--v2-muted);
  font-size: 14px;

  @media (max-width: 860px) {
    justify-content: flex-start;
  }
`

const InfoDivider = styled.hr`
  height: 1px;
  margin: 0 clamp(20px, 3vw, 32px);
  border: 0;
  background: var(--v2-stroke);
`

const InfoBottom = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px clamp(20px, 3vw, 32px);
`

export const V2RegistryInfoCard = ({
  title,
  description,
  logoURI,
  statusLabel,
  meta,
  actions,
}: {
  title?: React.ReactNode
  description?: React.ReactNode
  logoURI?: string | null
  statusLabel?: string
  meta?: React.ReactNode
  actions?: React.ReactNode
}) => (
  <InfoCard>
    <V2StatusBanner $tone={v2ToneFromLabel(statusLabel)}>
      {statusLabel || 'Live registry'}
    </V2StatusBanner>
    <InfoTop>
      <InfoIdentity>
        {logoURI && <InfoLogo src={parseIpfs(logoURI)} alt="" />}
        <div>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </InfoIdentity>
      {meta && <InfoMeta>{meta}</InfoMeta>}
    </InfoTop>
    <InfoDivider />
    {actions && <InfoBottom>{actions}</InfoBottom>}
  </InfoCard>
)

const DetailFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`

const DetailFieldGroup = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px 24px;
`

export const V2DetailFields = ({ fields = [] }: { fields?: V2Field[] }) => {
  const imageAndText = fields.filter((field) => {
    const type = normalizeType(field.type)
    return isImageField(field) || type === 'text' || type === 'number'
  })
  const linked = fields.filter((field) => {
    const type = normalizeType(field.type)
    return ['address', 'rich address', 'gtcr address', 'link', 'file'].some(
      (candidate) => type.includes(candidate),
    )
  })
  const rest = fields.filter(
    (field) => !imageAndText.includes(field) && !linked.includes(field),
  )

  return (
    <DetailFields>
      {[imageAndText, linked, rest]
        .filter((group) => group.length)
        .map((group, index) => (
          <DetailFieldGroup key={index}>
            {group.map((field, fieldIndex) => (
              <V2FieldDisplay
                detailed
                field={field}
                key={`${field.label}-${fieldIndex}`}
              />
            ))}
          </DetailFieldGroup>
        ))}
    </DetailFields>
  )
}
