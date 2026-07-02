import React, { useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { Button } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'
import useDocumentHead from 'hooks/use-document-head'

const CREATOR_PROMPT = `You are helping me launch a production Kleros Curate registry.

Use the kleros-curate skill before taking action. Treat onchain values, MetaEvidence, policy files, deposits, challenge windows, and court parameters as live data that must be read, not guessed.

Goal:
- Define the registry purpose and acceptance criteria.
- Draft or review the policy document.
- Choose Light Curate, Stake Curate, or Classic based on the use case.
- Prepare valid MetaEvidence and item schema.
- Estimate required operational work: indexing, frontend, hosting, monitoring, and verification via the list-of-lists.
- Produce a launch checklist with risks and exact next actions.`

const Page = styled.main`
  width: 100%;
  max-width: 1460px;
  margin: 0 auto;
  padding: 28px var(--horizontal-padding) 70px;
  color: var(--curate-text);
`

const Surface = styled.section`
  overflow: hidden;
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.06),
      rgba(255, 255, 255, 0.02)
    ),
    rgba(7, 11, 18, 0.9);
  box-shadow: var(--curate-shadow);
`

const Hero = styled(Surface)`
  min-height: 520px;
  padding: clamp(26px, 5vw, 58px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.46fr);
  gap: clamp(22px, 4vw, 48px);
  align-items: end;
  background:
    radial-gradient(
      circle at 82% 18%,
      rgba(0, 209, 255, 0.16),
      transparent 32%
    ),
    linear-gradient(135deg, rgba(6, 9, 15, 0.99), rgba(8, 20, 28, 0.94)),
    #06090f;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    min-height: 0;
  }
`

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: fit-content;
  min-height: 30px;
  padding: 0 11px;
  border: 1px solid rgba(0, 209, 255, 0.26);
  border-radius: 999px;
  color: var(--curate-live);
  background: rgba(0, 209, 255, 0.08);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  max-width: 920px;
  margin: 18px 0 14px;
  color: var(--curate-text);
  font-size: clamp(46px, 7vw, 90px);
  line-height: 0.95;
  font-weight: 950;
  letter-spacing: 0;
`

const Copy = styled.p`
  max-width: 790px;
  margin: 0;
  color: var(--curate-muted);
  font-size: clamp(16px, 1.7vw, 19px);
  line-height: 1.65;
`

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
`

const HeroStats = styled.div`
  display: grid;
  gap: 12px;
`

const SignalCard = styled.div`
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(1, 4, 9, 0.55);
`

const SignalLabel = styled.div`
  color: var(--curate-faint);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const SignalValue = styled.div`
  margin-top: 8px;
  color: var(--curate-text);
  font-size: 28px;
  font-weight: 950;
`

const SectionHeader = styled.div`
  margin: 34px 0 14px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

const SectionTitle = styled.h2`
  margin: 0;
  color: var(--curate-text);
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 950;
`

const SectionCopy = styled.p`
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--curate-muted);
  font-size: 15px;
  line-height: 1.6;
`

const PlanGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1020px) {
    grid-template-columns: 1fr;
  }
`

const PlanCard = styled(Surface)<{ $featured?: boolean }>`
  min-height: 430px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-color: ${({ $featured }) =>
    $featured ? 'rgba(0, 209, 255, 0.34)' : 'var(--curate-border)'};
  background: ${({ $featured }) =>
      $featured
        ? 'linear-gradient(180deg, rgba(0, 209, 255, 0.11), rgba(255, 255, 255, 0.025)),'
        : 'linear-gradient(180deg, rgba(255, 255, 255, 0.055), rgba(255, 255, 255, 0.02)),'}
    rgba(7, 11, 18, 0.9);
`

const PlanTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const IconBox = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border: 1px solid currentColor;
  border-radius: 13px;
  color: var(--curate-live);
  background: rgba(0, 209, 255, 0.08);
`

const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 999px;
  color: var(--curate-muted);
  background: rgba(255, 255, 255, 0.045);
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
`

const PlanName = styled.h3`
  margin: 0;
  color: var(--curate-text);
  font-size: 22px;
  font-weight: 950;
`

const Price = styled.div`
  color: var(--curate-text);
  font-size: 38px;
  font-weight: 950;
  line-height: 1;

  span {
    color: var(--curate-muted);
    font-size: 13px;
    font-weight: 800;
  }
`

const FeatureList = styled.ul`
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  color: var(--curate-muted);
  font-size: 14px;
  line-height: 1.45;

  li {
    display: grid;
    grid-template-columns: 18px minmax(0, 1fr);
    gap: 8px;
  }
`

const Compare = styled(Surface)`
  margin-top: 14px;
  overflow-x: auto;
`

const CompareGrid = styled.div`
  min-width: 960px;
  display: grid;
  grid-template-columns: 0.9fr repeat(3, minmax(0, 1fr));
`

const CompareCell = styled.div<{ $head?: boolean; $featured?: boolean }>`
  min-height: ${({ $head }) => ($head ? '86px' : '78px')};
  padding: 15px;
  border-right: 1px solid rgba(255, 255, 255, 0.075);
  border-bottom: 1px solid rgba(255, 255, 255, 0.075);
  background: ${({ $featured }) =>
    $featured ? 'rgba(0, 209, 255, 0.065)' : 'transparent'};

  &:nth-child(4n) {
    border-right: 0;
  }
`

const CompareTitle = styled.div`
  color: var(--curate-text);
  font-size: 14px;
  font-weight: 950;
`

const CompareMeta = styled.div`
  margin-top: 6px;
  color: var(--curate-muted);
  font-size: 13px;
  line-height: 1.45;
`

const SkillPanel = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 0;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const SkillIntro = styled.div`
  padding: 22px;
`

const SkillCode = styled.pre`
  min-height: 440px;
  max-height: 620px;
  margin: 0;
  padding: 18px;
  overflow: auto;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  color: #d9f7ff;
  background: rgba(1, 4, 9, 0.78);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono',
    monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
`

const LinkLine = styled.a`
  display: inline-flex;
  margin-top: 14px;
  color: var(--curate-live);
  font-size: 13px;
  font-weight: 850;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const plans = [
  {
    icon: 'factory',
    name: 'Free permissionless',
    price: '$0',
    meta: 'Open-source, self-managed',
    badge: 'Build yourself',
    features: [
      'Create registries permissionlessly on Curate.',
      'Build, host, and maintain your own frontend.',
      'Index locally or connect a third-party indexer.',
      'Write and maintain your own policy.',
    ],
  },
  {
    icon: 'activity',
    name: 'Quickstart',
    price: '$19.99',
    meta: 'Fast indexing API',
    badge: 'API only',
    featured: true,
    features: [
      'Create registries permissionlessly on Curate.',
      'Build, host, and maintain your own frontend.',
      'Use a ready indexing API instead of local indexing.',
      'Write and maintain your own policy.',
    ],
  },
  {
    icon: 'policy',
    name: 'Curate Pro',
    price: '$199',
    meta: 'Managed launch support',
    badge: 'Kleros support',
    features: [
      'Create registries with guided parameter setup.',
      'Get support creating a dedicated frontend.',
      'Use a ready indexing API with operational support.',
      'Get policy creation and review support.',
    ],
  },
] as const

const CuratePro = () => {
  const [copied, setCopied] = useState(false)

  useDocumentHead(
    'Curate Pro | Kleros Curate',
    'Launch a Kleros Curate verification layer with permissionless contracts, Quickstart indexing, or managed Curate Pro support.',
  )

  const copyCreatorPrompt = async () => {
    await navigator.clipboard.writeText(CREATOR_PROMPT)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <Page>
      <Hero>
        <div>
          <Eyebrow>
            <CurateIcon name="spark" size={15} />
            Curate Pro
          </Eyebrow>
          <Title>Launch a verification layer people can actually use.</Title>
          <Copy>
            Curate is open source and permissionless. Teams can run everything
            themselves, start faster with an indexing API, or work with Kleros
            on policy, indexing, and frontend delivery.
          </Copy>
          <ActionRow>
            <Button
              type="primary"
              size="large"
              as={Link as any}
              to="/factory/100"
            >
              Create a registry
            </Button>
            <Button
              size="large"
              href="mailto:contact@kleros.io?subject=Curate%20Pro"
            >
              Talk to Kleros
            </Button>
          </ActionRow>
        </div>
        <HeroStats>
          <SignalCard>
            <SignalLabel>Default path</SignalLabel>
            <SignalValue>Permissionless</SignalValue>
            <Copy>Deploy and operate a registry without asking Kleros.</Copy>
          </SignalCard>
          <SignalCard>
            <SignalLabel>Fastest path</SignalLabel>
            <SignalValue>Quickstart API</SignalValue>
            <Copy>
              Use ready indexing so agents and frontends can build faster.
            </Copy>
          </SignalCard>
          <SignalCard>
            <SignalLabel>Supported path</SignalLabel>
            <SignalValue>Curate Pro</SignalValue>
            <Copy>
              Launch with direct help on policy, indexing, and frontend UX.
            </Copy>
          </SignalCard>
        </HeroStats>
      </Hero>

      <SectionHeader>
        <div>
          <SectionTitle>Choose how you want to operate</SectionTitle>
          <SectionCopy>
            The underlying protocol stays open. The difference is how much
            infrastructure and launch support you want Kleros to provide.
          </SectionCopy>
        </div>
      </SectionHeader>

      <PlanGrid>
        {plans.map((plan) => (
          <PlanCard key={plan.name} $featured={plan.featured}>
            <PlanTop>
              <IconBox>
                <CurateIcon name={plan.icon} size={20} />
              </IconBox>
              <Pill>{plan.badge}</Pill>
            </PlanTop>
            <div>
              <PlanName>{plan.name}</PlanName>
              <CompareMeta>{plan.meta}</CompareMeta>
            </div>
            <Price>
              {plan.price} <span>/ month</span>
            </Price>
            <FeatureList>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <CurateIcon name="verified" size={15} />
                  <span>{feature}</span>
                </li>
              ))}
            </FeatureList>
          </PlanCard>
        ))}
      </PlanGrid>

      <SectionHeader>
        <div>
          <SectionTitle>What changes between plans</SectionTitle>
          <SectionCopy>
            Free and Quickstart are intentionally close: both are self-managed
            product paths. Quickstart removes the indexing bottleneck. Curate
            Pro adds Kleros support around launch quality.
          </SectionCopy>
        </div>
      </SectionHeader>

      <Compare>
        <CompareGrid>
          <CompareCell $head>
            <CompareTitle>Capability</CompareTitle>
          </CompareCell>
          <CompareCell $head>
            <CompareTitle>Free permissionless</CompareTitle>
            <CompareMeta>$0, self-managed</CompareMeta>
          </CompareCell>
          <CompareCell $head $featured>
            <CompareTitle>Quickstart</CompareTitle>
            <CompareMeta>$19.99, API access</CompareMeta>
          </CompareCell>
          <CompareCell $head>
            <CompareTitle>Curate Pro</CompareTitle>
            <CompareMeta>$199, managed support</CompareMeta>
          </CompareCell>

          <CompareCell>
            <CompareTitle>Frontend</CompareTitle>
          </CompareCell>
          <CompareCell>
            <CompareMeta>
              Build, host, and maintain your own frontend.
            </CompareMeta>
          </CompareCell>
          <CompareCell $featured>
            <CompareMeta>
              Build, host, and maintain your own frontend.
            </CompareMeta>
          </CompareCell>
          <CompareCell>
            <CompareMeta>Support creating a dedicated frontend.</CompareMeta>
          </CompareCell>

          <CompareCell>
            <CompareTitle>Indexing</CompareTitle>
          </CompareCell>
          <CompareCell>
            <CompareMeta>
              Index locally or connect a third-party indexer.
            </CompareMeta>
          </CompareCell>
          <CompareCell $featured>
            <CompareMeta>
              Ready indexing API for agents and frontends.
            </CompareMeta>
          </CompareCell>
          <CompareCell>
            <CompareMeta>
              Ready indexing API with operational support.
            </CompareMeta>
          </CompareCell>

          <CompareCell>
            <CompareTitle>Policy</CompareTitle>
          </CompareCell>
          <CompareCell>
            <CompareMeta>Write and maintain your own policy.</CompareMeta>
          </CompareCell>
          <CompareCell $featured>
            <CompareMeta>Write and maintain your own policy.</CompareMeta>
          </CompareCell>
          <CompareCell>
            <CompareMeta>Policy creation and review support.</CompareMeta>
          </CompareCell>
        </CompareGrid>
      </Compare>

      <SectionHeader>
        <div>
          <SectionTitle>Creator prompt for new lists</SectionTitle>
          <SectionCopy>
            Curate skills are for every registry and every user. This Pro prompt
            is specifically for teams creating a new list and deciding whether
            to self-host, use Quickstart, or buy Curate Pro support.
          </SectionCopy>
        </div>
        <Button type="primary" onClick={copyCreatorPrompt}>
          <CurateIcon name="copy" size={16} />
          {copied ? 'Copied' : 'Copy creator prompt'}
        </Button>
      </SectionHeader>

      <SkillPanel>
        <SkillIntro>
          <Eyebrow>
            <CurateIcon name="activity" size={15} />
            Agent context
          </Eyebrow>
          <SectionTitle style={{ marginTop: 16 }}>
            Start a launch conversation.
          </SectionTitle>
          <SectionCopy>
            For the full Curate skill, use the global Guide & Skills page. For
            Pro, paste this creator prompt after loading the skill so the agent
            focuses on policy, indexing, frontend, and launch support.
          </SectionCopy>
          <LinkLine href="/guide">Open Guide & Skills</LinkLine>
          <LinkLine href="/skills/kleros-curate/SKILL.md">
            Open local SKILL.md
          </LinkLine>
        </SkillIntro>
        <SkillCode>{CREATOR_PROMPT}</SkillCode>
      </SkillPanel>
    </Page>
  )
}

export default CuratePro
