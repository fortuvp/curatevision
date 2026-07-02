import { Skeleton, Button } from 'components/ui'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { Link } from 'react-router-dom'
import useUrlChainId from 'hooks/use-url-chain-id'
import React from 'react'
import useDocumentHead from 'hooks/use-document-head'
import { ZERO_ADDRESS, capitalizeFirstLetter } from 'utils/string'
import ContractExplorerUrl from 'components/contract-explorer-url'
import { defaultTcrAddresses } from 'config/tcr-addresses'
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
  padding: clamp(22px, 3vw, 34px);
  background:
    linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.075),
      rgba(255, 255, 255, 0.025)
    ),
    var(--curate-surface);
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  box-shadow: var(--curate-shadow);
  color: var(--curate-text);
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

  &::before {
    content: '';
    position: absolute;
    inset: -40% -10% auto auto;
    width: 440px;
    height: 440px;
    background:
      radial-gradient(circle, rgba(76, 201, 240, 0.12), transparent 55%),
      radial-gradient(
        circle at 38% 40%,
        rgba(124, 92, 255, 0.16),
        transparent 48%
      );
    pointer-events: none;
  }

  ${smallScreenStyle(
    () => css`
      grid-template-columns: 1fr;
    `,
  )}
`

export const StyledButton = styled(Button)`
  text-transform: capitalize;
  font-weight: 850;
`

export const TCRInfoColumn = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  max-width: 940px;

  ${smallScreenStyle(
    () => css`
      max-width: 100%;
    `,
  )}
`

export const StyledImage = styled.img`
  object-fit: contain;
  height: 64px;
  width: 64px;
  padding: 8px;
  border: 1px solid var(--curate-border);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.06);
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
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.05;
  font-weight: 850;
  color: var(--curate-text);
`

export const StyledDescription = styled.span`
  display: inline;
  margin-top: 12px;
  max-width: 900px;
  font-size: 15px;
  line-height: 1.65;
  color: var(--curate-muted);
`

export const StyledPolicyAnchor = styled.a`
  ${buttonReset}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid var(--curate-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  margin-top: 12px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  color: var(--curate-live);

  &:hover {
    color: var(--curate-text);
    border-color: var(--curate-border-strong);
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
  color: var(--curate-live);
  text-decoration: none;

  &:hover {
    color: var(--curate-text);
  }
`

interface TCRLogoProps {
  logoURI?: string | null
}

const TCRLogo = ({ logoURI = null }: TCRLogoProps) =>
  logoURI && <StyledImage src={parseIpfs(logoURI)} alt="item" />

interface BannerProps {
  metaEvidence?: MetaEvidence
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
  const defaultTCRAddress = defaultTcrAddresses[networkId]
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
              <TitleContainer>
                <StyledTitle>{tcrTitle}</StyledTitle>
                {defaultTCRAddress && tcrAddress !== defaultTCRAddress && (
                  <TCRLogo logoURI={logoURI} />
                )}
                {networkInfo && (
                  <ChainChip $color={networkInfo.color}>
                    {networkInfo.name}
                  </ChainChip>
                )}
                <StatusPill $tone="live">Live registry</StatusPill>
                <ContractExplorerUrl
                  networkId={networkId}
                  contractAddress={tcrAddress}
                />
              </TitleContainer>
              <StyledDescription>
                {capitalizeFirstLetter(normalizedDescription)}
                {connectedTCRAddr &&
                  connectedTCRAddr !== ZERO_ADDRESS &&
                  !relTcrDisabled && (
                    <>
                      {' '}
                      <StyledLink to={`/tcr/${networkId}/${connectedTCRAddr}`}>
                        View Badges list
                      </StyledLink>
                    </>
                  )}
              </StyledDescription>
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
            onClick={() => setSubmissionFormOpen(true)}
            id="submit-item-button"
          >
            <CurateIcon name="submit" size={18} />
            {`Submit ${capitalizeFirstLetter(itemName) || 'Item'}`}
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
