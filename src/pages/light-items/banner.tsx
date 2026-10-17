import { Skeleton, Button } from 'components/ui'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { Link, useNavigate } from 'react-router-dom'
import useUrlChainId from 'hooks/use-url-chain-id'
import React from 'react'
import useDocumentHead from 'hooks/use-document-head'
import { ZERO_ADDRESS, capitalizeFirstLetter } from 'utils/string'
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
  border-top: 5px solid var(--v2-blue);
  border-radius: 3px;
  box-shadow: var(--v2-shadow);
  color: var(--v2-text);
  justify-content: space-between;
  align-items: stretch;
  gap: clamp(20px, 4vw, 48px);
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
  display: inline;
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

interface TCRLogoProps {
  logoURI?: string | null
}

const TCRLogo = ({ logoURI = null }: TCRLogoProps) =>
  logoURI ? (
    <StyledImage src={parseIpfs(logoURI)} alt="item" />
  ) : (
    <LogoFallback>
      <CurateIcon name="registry" size={36} />
    </LogoFallback>
  )

interface BannerProps {
  metaEvidence?: MetaEvidence | null
  setSubmissionFormOpen: (open: boolean) => void
  connectedTCRAddr?: string | null
  tcrAddress?: string | null
}

const Banner = ({
  metaEvidence = null,
  setSubmissionFormOpen,
  connectedTCRAddr = null,
  tcrAddress = null,
}: BannerProps) => {
  const networkId = useUrlChainId()
  const navigate = useNavigate()
  const networkInfo =
    networkId && NETWORKS_INFO[networkId as keyof typeof NETWORKS_INFO]
  const openAttachment = useAttachment()
  const { metadata, fileURI } = metaEvidence || {}
  const { itemName, tcrTitle, tcrDescription, logoURI, relTcrDisabled } =
    metadata || {}

  const normalizedDescription = tcrDescription
    ? tcrDescription[tcrDescription.length - 1] === '.'
      ? tcrDescription
      : `${tcrDescription}.`
    : ''

  const fullSeoTitle = tcrTitle
    ? `${tcrTitle} - Kleros · Curate`
    : 'Kleros · Curate'
  const truncatedSeoTitle = truncateAtWord(fullSeoTitle, 60)

  const fullSeoMetaDescription = metadata
    ? `Explore the ${tcrTitle} list on Kleros Curate: ${normalizedDescription}`
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
                  <StyledTitle>{tcrTitle}</StyledTitle>
                  {networkInfo && (
                    <ChainChip $color={networkInfo.color}>
                      {networkInfo.name}
                    </ChainChip>
                  )}
                  <StatusPill $tone="live">Live registry</StatusPill>
                  {networkId && tcrAddress && (
                    <ContractExplorerUrl
                      networkId={networkId}
                      contractAddress={tcrAddress}
                    />
                  )}
                </TitleContainer>
                <StyledDescription>
                  {capitalizeFirstLetter(normalizedDescription)}
                  {connectedTCRAddr &&
                    connectedTCRAddr !== ZERO_ADDRESS &&
                    !relTcrDisabled && (
                      <>
                        {' '}
                        <StyledLink
                          to={`/tcr/${networkId}/${connectedTCRAddr}`}
                        >
                          View Badges list
                        </StyledLink>
                      </>
                    )}
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
            {`Submit ${capitalizeFirstLetter(itemName ?? '') || 'Item'}`}
          </StyledButton>
          <StyledPolicyAnchor
            as="button"
            type="button"
            id="policy-link"
            onClick={() => fileURI && openAttachment(parseIpfs(fileURI), true)}
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
