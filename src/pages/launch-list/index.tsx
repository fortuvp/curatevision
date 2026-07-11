import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Button } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'
import { NETWORKS } from 'config/networks'
import useDocumentHead from 'hooks/use-document-head'

const EXAMPLES = [
  'registry of AI skills',
  'directory of virus-free apps',
  'list of audited smart contracts',
  'No-Cheat Registry for esports',
  'list of grant requesters',
  'trusted token list',
]

const SUPPORTED_CHAINS = [NETWORKS.ethereum, NETWORKS.gnosis, NETWORKS.sepolia]

const rotateIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

const Page = styled.main`
  width: 100%;
  max-width: 1240px;
  margin: 0 auto;
  padding: 38px var(--horizontal-padding) 56px;
  color: var(--v2-text);

  @media (max-width: 720px) {
    padding-top: 24px;
  }
`

const Hero = styled.section`
  min-height: 330px;
  display: flex;
  align-items: center;
  padding: clamp(30px, 5vw, 60px) 0;
  border-top: 1px solid var(--v2-stroke);
  border-bottom: 1px solid var(--v2-stroke);

  > div {
    max-width: 820px;
  }

  @media (max-width: 860px) {
    min-height: 0;
  }
`

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--v2-blue);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
`

const Title = styled.h1`
  max-width: 760px;
  margin: 14px 0 16px;
  color: var(--v2-text);
  font-size: clamp(38px, 6vw, 64px);
  font-weight: 650;
  line-height: 1.02;
`

const Lead = styled.p`
  max-width: 720px;
  margin: 0;
  color: var(--v2-muted);
  font-size: clamp(16px, 2vw, 19px);
  line-height: 1.6;
`

const ValueLine = styled.p`
  margin: 18px 0 0;
  color: var(--v2-text);
  font-size: 15px;
  font-weight: 700;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 26px;

  @media (max-width: 540px) {
    > span {
      width: 100%;
    }

    .gtcr-v2-button {
      width: 100%;
    }
  }
`

const ExampleSection = styled.section`
  min-height: 166px;
  display: grid;
  grid-template-columns: minmax(160px, 0.42fr) minmax(0, 1.58fr);
  gap: 28px;
  align-items: center;
  padding: 30px 0;
  border-bottom: 1px solid var(--v2-stroke);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`

const SectionLabel = styled.div`
  color: var(--v2-text);
  font-size: 14px;
  font-weight: 900;
`

const ExampleSentence = styled.div`
  min-width: 0;
  color: var(--v2-text);
  font-size: clamp(23px, 4vw, 38px);
  font-weight: 600;
  line-height: 1.2;

  span {
    display: inline-block;
    color: var(--v2-blue);
    animation: ${rotateIn} 360ms ease both;
  }
`

const ExampleTagline = styled.div`
  margin-top: 10px;
  color: var(--v2-muted);
  font-size: 14px;
`

const ValueSection = styled.section`
  padding: 34px 0 30px;
  border-bottom: 1px solid var(--v2-stroke);
`

const SectionTitle = styled.h2`
  margin: 0;
  color: var(--v2-text);
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 600;
`

const BenefitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 22px;
  border-top: 1px solid var(--v2-stroke);
  border-left: 1px solid var(--v2-stroke);

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const Benefit = styled.div`
  min-height: 118px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  padding: 22px;
  border-right: 1px solid var(--v2-stroke);
  border-bottom: 1px solid var(--v2-stroke);
  color: var(--v2-muted);
  font-size: 14px;
  line-height: 1.55;

  @media (max-width: 720px) {
    min-height: 0;
  }
`

const BenefitNumber = styled.span`
  color: var(--v2-blue);
  font-size: 13px;
  font-weight: 850;
  line-height: 24px;
`

const BenefitCopy = styled.div`
  strong {
    display: block;
    color: var(--v2-text);
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 7px 0 0;
    color: var(--v2-muted);
  }
`

const Ownership = styled.section`
  padding: 34px 0;
  border-bottom: 1px solid var(--v2-stroke);

  p {
    max-width: 720px;
    margin: 8px 0 0;
    color: var(--v2-muted);
    font-size: 15px;
    line-height: 1.6;
  }
`

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 24px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`

const OptionCard = styled.article<{ $custom?: boolean }>`
  min-width: 0;
  min-height: 178px;
  padding: clamp(22px, 3vw, 30px);
  border: 1px solid
    ${({ $custom }) => ($custom ? 'var(--v2-purple)' : 'var(--v2-blue)')};
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
`

const OptionEyebrow = styled.div<{ $custom?: boolean }>`
  color: ${({ $custom }) => ($custom ? 'var(--v2-purple)' : 'var(--v2-blue)')};
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
`

const OptionTitle = styled.h3`
  margin: 10px 0 8px;
  color: var(--v2-text);
  font-size: 22px;
  font-weight: 650;
  line-height: 1.25;
`

const OptionDescription = styled.p`
  max-width: 480px !important;
  margin: 0 !important;
  font-size: 13px !important;
  line-height: 1.55 !important;
`

const SharedInfrastructure = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  border: 1px solid var(--v2-stroke);
  border-top: 0;
  color: var(--v2-muted);
  background: var(--v2-soft);
  font-size: 12px;
  font-weight: 700;

  svg {
    color: var(--v2-blue);
  }
`

const FinalCta = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 34px 0 0;

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

const LaunchListPage = () => {
  const navigate = useNavigate()
  const { chainId: chainParam } = useParams()
  const parsedChainId = Number(chainParam)
  const chainId = SUPPORTED_CHAINS.includes(parsedChainId)
    ? parsedChainId
    : NETWORKS.gnosis
  const [exampleIndex, setExampleIndex] = useState(0)

  useDocumentHead(
    'Verify at Scale | Kleros Curate',
    'Launch an open list and keep verification running around the clock with Kleros Curate.',
  )

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(
      () => setExampleIndex((current) => (current + 1) % EXAMPLES.length),
      2400,
    )
    return () => window.clearInterval(timer)
  }, [])

  const openBuilder = () => navigate(`/factory/${chainId}`)

  return (
    <Page>
      <Hero>
        <div>
          <Eyebrow>
            <CurateIcon name="verified" size={17} />
            Launch a list
          </Eyebrow>
          <Title>Verify at Scale</Title>
          <Lead>
            Filter incoming requests, clean an existing dataset, or build a
            trusted database from scratch. Define the rules, then keep
            verification running 24/7.
          </Lead>
          <ValueLine>
            Scale faster than your competitors. Go live quick.
          </ValueLine>
          <Actions>
            <Button type="primary" size="large" onClick={openBuilder}>
              Create your list
            </Button>
            <Button
              size="large"
              href="mailto:contact@kleros.io?subject=Launch%20a%20Curate%20list"
            >
              Need help? Talk to our team
            </Button>
          </Actions>
        </div>
      </Hero>

      <ExampleSection>
        <SectionLabel>Verify anything</SectionLabel>
        <div>
          <ExampleSentence>
            Build a verified{' '}
            <span key={EXAMPLES[exampleIndex]}>{EXAMPLES[exampleIndex]}</span>
          </ExampleSentence>
          <ExampleTagline>Your list. Your rules.</ExampleTagline>
        </div>
      </ExampleSection>

      <Ownership>
        <SectionTitle>Use Curate your way.</SectionTitle>
        <p>
          Launch your list with the Curate interface, or build a custom frontend
          using Kleros&apos; open tools.
        </p>
        <OptionGrid>
          <OptionCard>
            <OptionEyebrow>Ready to use</OptionEyebrow>
            <OptionTitle>Use the Curate interface</OptionTitle>
            <OptionDescription>
              Create and manage your list using the existing Curate experience.
            </OptionDescription>
          </OptionCard>
          <OptionCard $custom>
            <OptionEyebrow $custom>Fully custom</OptionEyebrow>
            <OptionTitle>Use your own brand</OptionTitle>
            <OptionDescription>
              Personalized experience. Build a dedicated frontend from scratch
              or integrate into your existing product.
            </OptionDescription>
          </OptionCard>
        </OptionGrid>
        <SharedInfrastructure>
          <CurateIcon name="verified" size={16} />
          Both paths use the same Curate verification infrastructure.
        </SharedInfrastructure>
      </Ownership>

      <ValueSection>
        <SectionTitle>Why build with Curate?</SectionTitle>
        <BenefitGrid>
          <Benefit>
            <BenefitNumber>01</BenefitNumber>
            <BenefitCopy>
              <strong>Cut review costs</strong>
              <p>
                Review submissions through open challenges instead of checking
                every entry manually.
              </p>
            </BenefitCopy>
          </Benefit>
          <Benefit>
            <BenefitNumber>02</BenefitNumber>
            <BenefitCopy>
              <strong>Keep verification running</strong>
              <p>Keep review active 24/7, even when your team is offline.</p>
            </BenefitCopy>
          </Benefit>
          <Benefit>
            <BenefitNumber>03</BenefitNumber>
            <BenefitCopy>
              <strong>Scale without a moderation team</strong>
              <p>Launch and grow without hiring a large review operation.</p>
            </BenefitCopy>
          </Benefit>
          <Benefit>
            <BenefitNumber>04</BenefitNumber>
            <BenefitCopy>
              <strong>Define the rules</strong>
              <p>Control what belongs.</p>
            </BenefitCopy>
          </Benefit>
        </BenefitGrid>
      </ValueSection>

      <FinalCta>
        <SectionTitle>Ready to verify at scale?</SectionTitle>
        <Actions>
          <Button type="primary" size="large" onClick={openBuilder}>
            Start creating
          </Button>
          <Button
            size="large"
            href="mailto:contact@kleros.io?subject=Launch%20a%20Curate%20list"
          >
            Need help? Talk to our team
          </Button>
        </Actions>
      </FinalCta>
    </Page>
  )
}

export default LaunchListPage
