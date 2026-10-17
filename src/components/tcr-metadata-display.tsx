import React from 'react'
import styled from 'styled-components'
import { parseIpfs } from 'utils/ipfs-parse'
import { useAttachment } from 'hooks/use-attachment'
import { buttonReset } from 'styles/button-reset'
import { CurateIcon } from 'components/curate/icons'

const MetadataGrid = styled.div`
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr);
  gap: 18px;
  width: 100%;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`

const LogoButton = styled.button`
  ${buttonReset}
  width: 125px;
  height: 125px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-soft);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  &:hover {
    border-color: var(--v2-blue);
  }
`

const LogoImage = styled.img`
  width: 125px;
  height: 125px;
  object-fit: contain;
  padding: 8px;
`

const LogoPlaceholder = styled.div`
  width: 125px;
  height: 125px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--v2-muted);
`

const MetadataFields = styled.div`
  display: grid;
  gap: 12px;
  min-width: 0;
`

const MetadataField = styled.div`
  display: grid;
  grid-template-columns: 140px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  min-width: 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 4px;
  }
`

const MetadataLabel = styled.span`
  color: var(--v2-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const MetadataValue = styled.div`
  color: var(--v2-text);
  font-size: 14px;
  line-height: 1.55;
  min-width: 0;
  overflow-wrap: anywhere;
`

const InlineLinkButton = styled.button`
  ${buttonReset}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.linkColor};
  font-weight: 700;

  &:hover {
    color: ${({ theme }) => theme.primaryColorHover};
  }
`

interface TCRMetadataDisplayProps {
  logoURI?: string | null
  tcrTitle?: string
  tcrDescription?: string
  fileURI?: string
}

const TCRMetadataDisplay = ({
  logoURI,
  tcrTitle,
  tcrDescription,
  fileURI,
}: TCRMetadataDisplayProps) => {
  const openAttachment = useAttachment()
  const parsedLogoURI = logoURI ? parseIpfs(logoURI) : undefined

  return (
    <MetadataGrid>
      <LogoButton
        type="button"
        onClick={() => parsedLogoURI && openAttachment(parsedLogoURI)}
        disabled={!parsedLogoURI}
        aria-label="Open registry logo"
      >
        {parsedLogoURI ? (
          <LogoImage src={parsedLogoURI} alt={tcrTitle || 'Registry logo'} />
        ) : (
          <LogoPlaceholder>
            <CurateIcon name="registry" size={34} />
          </LogoPlaceholder>
        )}
      </LogoButton>
      <MetadataFields>
        <MetadataField>
          <MetadataLabel>Title</MetadataLabel>
          <MetadataValue>{tcrTitle}</MetadataValue>
        </MetadataField>
        <MetadataField>
          <MetadataLabel>Description</MetadataLabel>
          <MetadataValue>{tcrDescription}</MetadataValue>
        </MetadataField>
        <MetadataField>
          <MetadataLabel>Primary document</MetadataLabel>
          <MetadataValue>
            <InlineLinkButton
              type="button"
              onClick={() => fileURI && openAttachment(parseIpfs(fileURI))}
            >
              <CurateIcon name="external" size={16} />
              Open policy file
            </InlineLinkButton>
          </MetadataValue>
        </MetadataField>
      </MetadataFields>
    </MetadataGrid>
  )
}

export default TCRMetadataDisplay
