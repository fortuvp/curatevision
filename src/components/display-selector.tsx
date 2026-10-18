import React, { useState } from 'react'
import styled from 'styled-components'
import { Typography } from 'components/ui'
import { ItemTypes } from '@kleros/gtcr-encoder'
import { parseIpfs } from 'utils/ipfs-parse'
import { isSafeNavigationUrl } from 'utils/url-validation'
import { useAttachment } from 'hooks/use-attachment'
import { buttonReset } from 'styles/button-reset'
import { Data, SkeletonBlock, Small } from 'components/curate/primitives'
import GTCRAddress from './gtcr-address'
import RichAddress from './rich-address'
import ETHAddress from './eth-address'
import LongText from './long-text'
import FileDisplay from './file-display'
import TruncatedLink from './truncated-link'

/*
 * Renders one entry field by its MetaEvidence type. Empty values show a
 * faint placeholder; nothing is substituted for data the entry does not have.
 */

const StyledLink = styled.a`
  color: var(--color-primary);
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
  }
`

const ImageLinkButton = styled.button`
  ${buttonReset}
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  border-radius: var(--radius);
  transition: opacity var(--motion);

  &:hover {
    opacity: 0.85;
  }
`

const ImageFrame = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  vertical-align: middle;
`

const ImagePlaceholder = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: var(--color-faint);
`

const StyledImage = styled.img`
  width: 100px;
  height: 100px;
  padding: 4px;
  border-radius: var(--radius);
  object-fit: contain;
`

const ImageIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="m21 16-5-5-8 8" />
  </svg>
)

interface ImageWithLoadingProps {
  src: string
  alt: string
  linkImage?: boolean | null
}

const ImageWithLoading = ({ src, alt, linkImage }: ImageWithLoadingProps) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const openAttachment = useAttachment()

  if (error)
    return (
      <ImageFrame>
        <ImagePlaceholder title="Image could not be loaded">
          <ImageIcon />
        </ImagePlaceholder>
      </ImageFrame>
    )

  const content = (
    <ImageFrame>
      {loading && <SkeletonBlock $width="100px" $height="100px" />}
      <StyledImage
        src={src}
        alt={alt}
        style={{ display: loading ? 'none' : 'block' }}
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false)
          setError(true)
        }}
      />
    </ImageFrame>
  )

  if (linkImage)
    return (
      <ImageLinkButton
        type="button"
        aria-label="Open image"
        onClick={() => openAttachment(src)}
      >
        {content}
      </ImageLinkButton>
    )

  return content
}

const protocolRegex = /:\/\//

interface DisplaySelectorProps {
  type: string
  value?: string | number | boolean | null
  linkImage?: boolean | null
  allowedFileTypes?: string | null
  truncateLinks?: boolean
  disabled?: boolean
}

const DisplaySelector = ({
  type,
  value = null,
  linkImage = null,
  allowedFileTypes = null,
  truncateLinks = false,
  disabled = false,
}: DisplaySelectorProps) => {
  switch (type) {
    case ItemTypes.GTCR_ADDRESS:
      return value ? (
        <GTCRAddress address={String(value)} disabled={disabled} />
      ) : (
        <Small $faint>No address</Small>
      )
    case ItemTypes.ADDRESS:
      return value ? (
        <ETHAddress address={String(value)} />
      ) : (
        <Small $faint>No address</Small>
      )
    case ItemTypes.RICH_ADDRESS:
      return value ? (
        <RichAddress crude={String(value)} />
      ) : (
        <Small $faint>No address</Small>
      )
    case ItemTypes.TEXT:
      return <Typography.Text>{value}</Typography.Text>
    case ItemTypes.NUMBER:
      return value === null || value === undefined ? (
        <Small $faint>No value</Small>
      ) : (
        <Data>{String(value)}</Data>
      )
    case ItemTypes.BOOLEAN:
      return <Data>{String(value) === 'true' ? 'Yes' : 'No'}</Data>
    case ItemTypes.LONG_TEXT:
      return <LongText value={value ? String(value) : null} />
    case ItemTypes.FILE:
      return (
        <FileDisplay
          value={value ? String(value) : null}
          allowedFileTypes={allowedFileTypes}
        />
      )
    case ItemTypes.IMAGE:
      return value ? (
        <ImageWithLoading
          src={parseIpfs(String(value))}
          alt=""
          linkImage={linkImage}
        />
      ) : (
        <Small $faint>No image</Small>
      )
    case ItemTypes.LINK: {
      if (!value) return <Small $faint>No link</Small>
      const fullUrl = protocolRegex.test(String(value))
        ? String(value)
        : `https://${value}`
      if (!isSafeNavigationUrl(fullUrl))
        return <Typography.Text>{value}</Typography.Text>
      if (truncateLinks) return <TruncatedLink url={fullUrl} />
      return (
        <StyledLink href={fullUrl} target="_blank" rel="noopener noreferrer">
          {value}
        </StyledLink>
      )
    }
    default:
      return <Small $faint>Unsupported field type: {type}</Small>
  }
}

export default React.memo(DisplaySelector)
