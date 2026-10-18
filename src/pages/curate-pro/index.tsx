import React, { useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import { Button } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'
import useDocumentHead from 'hooks/use-document-head'

const CREATOR_PROMPT = `You are helping me launch a production Kleros Curate registry.

Use the kleros-curate skill before taking action. Treat onchain values, MetaEvidence, policy files, deposits, challenge windows, and court parameters as live data that must be read, not guessed.

Goal:
- Turn the registry idea into clear acceptance criteria.
- Choose Light Curate, Stake Curate, or Classic based on the workflow.
- Draft or review the policy before launch.
- Prepare valid MetaEvidence and item schema.
- Decide whether we self-host, use Quickstart indexing, or buy Curate Pro support.
- Produce a launch checklist with risks, costs, dependencies, and next actions.`

const Page = styled.main`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px var(--horizontal-padding) 70px;
  color: var(--v2-text);
`

const Surface = styled.section`
  overflow: hidden;
  border: 1px solid var(--v2-stroke);
  border-radius: var(--radius-sm);
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
`

const Hero = styled(Surface)`
  min-height: 0;
  padding: clamp(24px, 4vw, 42px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 0.46fr);
  gap: clamp(22px, 4vw, 48px);
  align-items: end;
  background: var(--v2-card);
  border-top: 5px solid var(--v2-purple);

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
  border: 1px solid var(--v2-stroke);
  border-radius: var(--radius-sm);
  color: var(--v2-blue);
  background: var(--v2-blue-soft);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: uppercase;
`

const Title = styled.h1`
  max-width: 920px;
  margin: 18px 0 14px;
  color: var(--v2-text);
  font-size: clamp(32px, 5vw, 56px);
  line-height: 1.08;
  font-weight: 600;
  letter-spacing: 0;
`

const Copy = styled.p`
  max-width: 790px;
  margin: 0;
  color: var(--v2-muted);
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
  border: 1px solid var(--color-border);
  border-radius: 16px;
  background: var(--color-raised);
`

const SignalLabel = styled.div`
  color: var(--curate-faint);
  font-size: 10px;
  font-weight: 600;
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
  color: var(--v2-text);
  font-size: clamp(24px, 3vw, 38px);
  font-weight: 600;
`

const SectionCopy = styled.p`
  max-width: 720px;
  margin: 8px 0 0;
  color: var(--v2-muted);
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
    $featured ? 'var(--v2-blue)' : 'var(--v2-stroke)'};
  background: ${({ $featured }) =>
    $featured ? 'var(--v2-blue-soft)' : 'var(--v2-card)'};
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
  border-radius: var(--radius-sm);
  color: var(--v2-blue);
  background: var(--v2-card);
`

const Pill = styled.div`
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--v2-stroke);
  border-radius: var(--radius-sm);
  color: var(--v2-muted);
  background: var(--v2-card);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
`

const PlanName = styled.h3`
  margin: 0;
  color: var(--v2-text);
  font-size: 22px;
  font-weight: 600;
`

const Price = styled.div`
  color: var(--v2-text);
  font-size: 38px;
  font-weight: 600;
  line-height: 1;

  span {
    color: var(--v2-muted);
    font-size: 13px;
    font-weight: 600;
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
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  background: ${({ $featured }) =>
    $featured ? 'var(--color-primary-soft)' : 'transparent'};

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
  border-left: 1px solid var(--color-border);
  color: var(--color-text);
  background: var(--color-raised);
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
  font-weight: 600;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const plans = [
  {
    icon: 'factory',
    featured: false,
    name: 'Permissionless',
    price: '$0',
    meta: 'Open-source, self-operated',
    badge: 'Build yourself',
    features: [
      'Deploy a registry without approval from Kleros.',
      'Build and host the frontend yourself.',
      'Run local indexing or wire a third-party indexer.',
      'Own the policy, monitoring, and operations.',
    ],
  },
  {
    icon: 'activity',
    name: 'Quickstart',
    price: '$19.99',
    meta: 'Indexing without the setup drag',
    badge: 'API only',
    featured: true,
    features: [
      'Deploy a registry without approval from Kleros.',
      'Build and host the frontend yourself.',
      'Use a ready API instead of running the indexer.',
      'Keep policy and product decisions in-house.',
    ],
  },
  {
    icon: 'policy',
    featured: false,
    name: 'Curate Pro',
    price: '$199',
    meta: 'A supported path to production',
    badge: 'Kleros support',
    features: [
      'Launch with help on registry parameters.',
      'Get support for a dedicated frontend.',
      'Use a ready API with operational guidance.',
      'Get policy drafting and review support.',
    ],
  },
] as const

const CuratePro = () => {
  const [copied, setCopied] = useState(false)

  useDocumentHead(
    'Curate Pro | Kleros Curate',
    'Launch a Kleros Curate registry with permissionless contracts, Quickstart indexing, or supported policy and frontend delivery.',
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
          <Title>Launch a registry without building the whole stack.</Title>
          <Copy>
            Curate is open source and permissionless. Use it yourself for free,
            add Quickstart when indexing slows you down, or work with Kleros
            when you want policy, API, and frontend support in one launch path.
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
            <Copy>Deploy and operate your own registry without approval.</Copy>
          </SignalCard>
          <SignalCard>
            <SignalLabel>Fastest path</SignalLabel>
            <SignalValue>Quickstart</SignalValue>
            <Copy>Skip the indexer setup and build against a ready API.</Copy>
          </SignalCard>
          <SignalCard>
            <SignalLabel>Supported path</SignalLabel>
            <SignalValue>Curate Pro</SignalValue>
            <Copy>
              Get direct help packaging the registry into a usable product.
            </Copy>
          </SignalCard>
        </HeroStats>
      </Hero>

      <SectionHeader>
        <div>
          <SectionTitle>
            Choose the amount of stack you want to own
          </SectionTitle>
          <SectionCopy>
            The protocol stays permissionless in every option. The paid paths do
            not buy access to Curate; they buy speed, infrastructure, and direct
            support.
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
          <SectionTitle>Same protocol, different operating burden</SectionTitle>
          <SectionCopy>
            Permissionless and Quickstart both leave product ownership with you.
            Quickstart removes indexing work. Curate Pro adds Kleros support
            where mistakes are expensive: policy, data access, and the frontend
            users will actually touch.
          </SectionCopy>
        </div>
      </SectionHeader>

      <Compare>
        <CompareGrid>
          <CompareCell $head>
            <CompareTitle>Capability</CompareTitle>
          </CompareCell>
          <CompareCell $head>
            <CompareTitle>Permissionless</CompareTitle>
            <CompareMeta>$0, self-operated</CompareMeta>
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
              Run local indexing or connect a third-party indexer.
            </CompareMeta>
          </CompareCell>
          <CompareCell $featured>
            <CompareMeta>Ready API for agents and frontends.</CompareMeta>
          </CompareCell>
          <CompareCell>
            <CompareMeta>Ready API with operational support.</CompareMeta>
          </CompareCell>

          <CompareCell>
            <CompareTitle>Policy</CompareTitle>
          </CompareCell>
          <CompareCell>
            <CompareMeta>
              Write, publish, and maintain your own policy.
            </CompareMeta>
          </CompareCell>
          <CompareCell $featured>
            <CompareMeta>
              Write, publish, and maintain your own policy.
            </CompareMeta>
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
            The global Curate skill is for every registry. This prompt is only
            for creators deciding how to launch and operate a new list.
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
            Paste this after the agent loads the Curate skill. It keeps the
            conversation focused on policy, indexing, frontend, and the real
            operating choices behind a registry launch.
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
