import { Skeleton, Button } from 'components/ui'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { Link, useNavigate } from 'react-router-dom'
import useUrlChainId from 'hooks/use-url-chain-id'
import React from 'react'
import useDocumentHead from 'hooks/use-document-head'
import { capitalizeFirstLetter } from 'utils/string'
import ContractExplorerUrl from 'components/contract-explorer-url'
import { parseIpfs } from 'utils/ipfs-parse'
import { truncateAtWord } from 'utils/truncate-at-word'
import { useAttachment } from 'hooks/use-attachment'
import { buttonReset } from 'styles/button-reset'
import PolicyUpdatedBadge from 'components/policy-updated-badge'
import { CurateIcon } from 'components/curate/icons'
import { ChainChip, StatusPill } from 'components/curate/primitives'
import { NETWORKS_INFO } from 'config/networks'

export const StyledBanner = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  padding: clamp(20px, 3vw, 32px);
  background: var(--v2-card);
  border: 1px solid var(--v2-stroke);
  border-top: 5px solid var(--v2-purple);
  border-radius: 3px;
  box-shadow: var(--v2-shadow);
  color: var(--v2-text);
  justify-content: space-between;
  align-items: stretch;
  gap: clamp(18px, 4vw, 44px);
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease,
    color 0.3s ease;
  width: calc(100% - var(--horizontal-padding) * 2);
  max-width: 1440px;
  position: relative;
  margin: 24px auto 0;
  overflow: hidden;

  ${smallScreenStyle(
    () => css`
      grid-template-columns: 1fr;
    `,
  )}
`

export const StyledButton = styled(Button)`
  text-transform: capitalize;
  font-weight: 600;
`

export const TCRInfoColumn = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 125px minmax(0, 1fr);
  gap: 18px;
  max-width: 940px;

  ${smallScreenStyle(
    () => css`
      grid-template-columns: 1fr;
      max-width: 100%;
    `,
  )}
`

export const StyledImage = styled.img`
  object-fit: contain;
  height: 125px;
  width: 125px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: transparent;
`

export const LogoFallback = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 125px;
  width: 125px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-soft);
  color: var(--v2-blue);

  svg {
    width: 36px;
    height: 36px;
  }
`

export const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
`

export const StyledTitle = styled.h1`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin: 0;
  font-size: clamp(24px, 3vw, 34px);
  line-height: 1.22;
  font-weight: 600;
  color: var(--v2-text);
`

export const StyledDescription = styled.span`
  display: block;
  margin-top: 12px;
  max-width: 900px;
  font-size: 15px;
  line-height: 1.65;
  color: var(--v2-muted);
`

export const StyledPolicyAnchor = styled.a`
  ${buttonReset}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--v2-stroke);
  border-radius: 7px;
  background: var(--v2-card);
  margin-top: 12px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--v2-blue);

  &:hover {
    color: var(--v2-blue-hover);
    border-color: var(--v2-blue);
  }
`

export const ActionCol = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  align-items: flex-end;

  ${smallScreenStyle(
    () => css`
      align-items: flex-start;
    `,
  )}
`

export const StyledLink = styled(Link)`
  color: var(--v2-blue);
  text-decoration: none;

  &:hover {
    color: var(--v2-blue-hover);
  }
`

const StyledTermsLink = styled.a`
  color: var(--v2-blue);
  text-decoration: underline;
`

interface TCRLogoProps {
  logoURI?: string
}

const TCRLogo = ({ logoURI }: TCRLogoProps) =>
  logoURI ? (
    <StyledImage src={parseIpfs(logoURI)} alt="item" />
  ) : (
    <LogoFallback>
      <CurateIcon name="registry" size={36} />
    </LogoFallback>
  )

// Registry-specific terms and conditions URLs
const TERMS_AND_CONDITIONS_URLS = {
  '0x7305c57b731876f452da8574a77d05957820e588':
    'https://cdn.kleros.link/ipfs/QmcZ53agYqpPhYijRFzduC3EC64coFGZkhbRN1sPDyW7di',
}

// Render description with "see terms and conditions" as a clickable link
interface DescriptionWithTermsLinkProps {
  description?: string | null
  tcrAddress?: string | null
}

const DescriptionWithTermsLink = ({
  description,
  tcrAddress,
}: DescriptionWithTermsLinkProps) => {
  if (!description) return null

  const termsUrl = TERMS_AND_CONDITIONS_URLS[tcrAddress?.toLowerCase()]

  // If no terms URL configured for this registry, return plain description
  if (!termsUrl) return <span>{description}</span>

  // Match various forms of "see terms and conditions" text
  const termsPattern = /(see\s+(the\s+)?terms?\s*(and|&)?\s*conditions?)/gi
  const parts = description.split(termsPattern)

  if (parts.length === 1)
    // No match found, return plain description
    return <span>{description}</span>

  // Rebuild the description with the link
  const result = []
  let match

  const regex = new RegExp(termsPattern.source, 'gi')
  let lastIndex = 0

  while ((match = regex.exec(description)) !== null) {
    // Add text before the match
    if (match.index > lastIndex)
      result.push(
        <span key={`text-${match.index}`}>
          {description.substring(lastIndex, match.index)}
        </span>,
      )

    // Add the match as a link (inline)
    result.push(
      <StyledTermsLink
        key={match.index}
        href={termsUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {match[0]}
      </StyledTermsLink>,
    )

    lastIndex = regex.lastIndex
  }

  // Add remaining text after last match
  if (lastIndex < description.length)
    result.push(
      <span key={`text-end`}>{description.substring(lastIndex)}</span>,
    )

  return <span>{result}</span>
}

interface BannerProps {
  metadata?: MetaEvidence
  setSubmissionFormOpen: (open: boolean) => void
  tcrAddress?: string | null
}

const Banner = ({
  metadata,
  setSubmissionFormOpen,
  tcrAddress,
}: BannerProps) => {
  const networkId = useUrlChainId()
  const navigate = useNavigate()
  const networkInfo =
    networkId && NETWORKS_INFO[networkId as keyof typeof NETWORKS_INFO]
  const openAttachment = useAttachment()
  const { itemName, title, description, logoURI, policyURI } = metadata || {}

  const normalizedDescription = description
    ? description[description.length - 1] === '.'
      ? description
      : `${description}.`
    : ''

  const fullSeoTitle = title ? `${title} - Kleros · Curate` : 'Kleros · Curate'
  const truncatedSeoTitle = truncateAtWord(fullSeoTitle, 60)

  const fullSeoMetaDescription = metadata
    ? `Explore the ${title} list on Kleros Curate: ${normalizedDescription}`
    : 'Explore curated lists on Kleros Curate.'
  const truncatedSeoMetaDescription = truncateAtWord(
    fullSeoMetaDescription,
    160,
  )

  useDocumentHead(truncatedSeoTitle, truncatedSeoMetaDescription)

  return (
    <>
      <StyledBanner>
        <TCRInfoColumn id="tcr-info-column">
          {metadata ? (
            <>
              <TCRLogo logoURI={logoURI} />
              <div>
                <TitleContainer>
                  <StyledTitle>{title}</StyledTitle>
                  {networkInfo && (
                    <ChainChip $color={networkInfo.color}>
                      {networkInfo.name}
                    </ChainChip>
                  )}
                  <StatusPill $tone="live">Permanent</StatusPill>
                  <ContractExplorerUrl
                    networkId={networkId}
                    contractAddress={tcrAddress}
                  />
                </TitleContainer>
                <StyledDescription>
                  <DescriptionWithTermsLink
                    description={capitalizeFirstLetter(normalizedDescription)}
                    tcrAddress={tcrAddress}
                  />
                </StyledDescription>
              </div>
            </>
          ) : (
            <>
              <Skeleton active paragraph={false} title={{ width: '300px' }} />
              <Skeleton active paragraph={{ rows: 1 }} title={false} />
            </>
          )}
        </TCRInfoColumn>
        <ActionCol>
          <StyledButton
            type="primary"
            size="large"
            onClick={() => {
              if (networkId && tcrAddress)
                navigate(`/tcr/${networkId}/${tcrAddress}/submit`)
              else setSubmissionFormOpen(true)
            }}
            id="submit-item-button"
          >
            <CurateIcon name="submit" size={18} />
            {`Submit ${capitalizeFirstLetter(itemName) || 'Item'}`}
          </StyledButton>
          <StyledPolicyAnchor
            as="button"
            type="button"
            id="policy-link"
            onClick={() =>
              policyURI && openAttachment(parseIpfs(policyURI), true)
            }
          >
            <CurateIcon name="policy" size={16} />
            View Submission Policy
            <PolicyUpdatedBadge registryAddress={tcrAddress} />
          </StyledPolicyAnchor>
        </ActionCol>
      </StyledBanner>
    </>
  )
}

export default Banner
