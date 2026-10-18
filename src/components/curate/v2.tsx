import React from 'react'
import styled, { css } from 'styled-components'
import { ItemTypes } from '@kleros/gtcr-encoder'
import DisplaySelector from 'components/display-selector'
import { parseIpfs } from 'utils/ipfs-parse'
import useTcrMetaEvidence from 'hooks/use-tcr-meta-evidence'
import useCheckPermanentList from 'hooks/use-check-permanent-list'
import useUrlChainId from 'hooks/use-url-chain-id'
import { CurateIcon } from './icons'
import { Chip, Data, SkeletonBlock, Small, truncateMiddle } from './primitives'

/*
 * Field rendering shared by the entry list and the item pages: a field by
 * its type, images as thumbnails, and "list of lists" references as a small
 * registry card (logo, title, address, Stake Curate chip). V2Card is the
 * surface the factory shell builds on.
 */

export type V2Field = {
  label?: string
  value?: unknown
  type?: string
  description?: string
  isIdentifier?: boolean
  allowedFileTypes?: string | string[]
}

export const V2Card = styled.div<{ $hover?: boolean }>`
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  color: var(--color-text);
  transition:
    border-color var(--motion),
    box-shadow var(--motion);

  ${({ $hover }) =>
    $hover &&
    css`
      cursor: pointer;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-card-hover);
      }
    `}
`

const FieldWrap = styled.div<{ $image?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;
  flex-shrink: ${({ $image }) => ($image ? 0 : 1)};
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  overflow-wrap: anywhere;

  a {
    color: var(--color-primary);
  }
`

const Thumb = styled.img<{ $large?: boolean }>`
  display: block;
  width: ${({ $large }) => ($large ? '125px' : '40px')};
  height: ${({ $large }) => ($large ? '125px' : '40px')};
  border: 1px solid var(--color-border);
  border-radius: ${({ $large }) =>
    $large ? 'var(--radius)' : 'var(--radius-sm)'};
  background: var(--color-raised);
  object-fit: contain;
`

const ListReference = styled.div<{ $detailed?: boolean }>`
  display: inline-grid;
  grid-template-columns: ${({ $detailed }) =>
      $detailed ? '64px' : '40px'} minmax(0, 1fr);
  gap: 10px;
  align-items: center;
  min-width: 0;
  max-width: 100%;
`

const ListReferenceLogo = styled.img<{ $detailed?: boolean }>`
  width: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  height: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  object-fit: contain;
`

const ListReferenceFallbackLogo = styled.span<{ $detailed?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  height: ${({ $detailed }) => ($detailed ? '64px' : '40px')};
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: var(--color-faint);
`

const ListReferenceText = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-width: 0;
`

const ListReferenceTitle = styled.span`
  max-width: 100%;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const normalizeType = (type?: string) => String(type || '').toLowerCase()

const isImageField = (field: V2Field) =>
  normalizeType(field.type) === normalizeType(ItemTypes.IMAGE)

const isGtcrAddressField = (field: V2Field) =>
  normalizeType(field.type) === normalizeType(ItemTypes.GTCR_ADDRESS)

/** A registry referenced from a "list of lists" entry: logo, title, address. */
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
  const { data: metaEvidence, isLoading } = useTcrMetaEvidence(
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

  return (
    <ListReference $detailed={detailed}>
      {logoURI ? (
        <ListReferenceLogo
          $detailed={detailed}
          src={parseIpfs(logoURI)}
          alt=""
        />
      ) : (
        <ListReferenceFallbackLogo $detailed={detailed} aria-hidden="true">
          <CurateIcon name="registry" size={detailed ? 24 : 18} />
        </ListReferenceFallbackLogo>
      )}
      <ListReferenceText>
        {title ? (
          <ListReferenceTitle title={title}>{title}</ListReferenceTitle>
        ) : (
          isLoading && <SkeletonBlock $width="120px" $height="14px" />
        )}
        <Data $muted $weight={400} title={address}>
          {truncateMiddle(address, 6, 4)}
        </Data>
        {showStakeBadge && isPermanentList && <Chip>Stake Curate</Chip>}
      </ListReferenceText>
    </ListReference>
  )
}

/** One field rendered by type; `detailed` adds the label and the large image. */
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

  if (isImageField(field) && value)
    return (
      <FieldWrap $image>
        <Thumb
          $large={detailed}
          src={parseIpfs(String(value))}
          alt={field.label || 'Entry image'}
        />
      </FieldWrap>
    )

  return (
    <FieldWrap>
      {detailed && field.label && <Small $muted>{field.label}:</Small>}
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
