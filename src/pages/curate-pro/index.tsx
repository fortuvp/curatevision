import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import useDocumentHead from 'hooks/use-document-head'
import { CurateIcon, type CurateIconName } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonAnchor,
  ButtonLink,
  Chip,
  Figure,
  Heading,
  Label,
  Page,
  Section,
  Small,
  Statement,
  Subheading,
  Surface,
  Table,
  TableScroller,
  Title,
} from 'components/curate/primitives'
import { Explainer } from 'components/curate/explainer'
import { ProductionStackSchematic } from './schematic'

/*
 * Curate Pro (route /pro): the assisted route to launch a production registry.
 * An editorial comparison of the three ways to run Curate (Permissionless,
 * Quickstart, Curate Pro), the creator prompt for agents, and an explainer
 * on what a production registry needs. The protocol is the same in every
 * tier; the paid ones buy speed, infrastructure and support, not access.
 */

const CREATOR_PROMPT = `You are helping me launch a production Kleros Curate registry.

Use the kleros-curate skill before taking action. Treat onchain values, MetaEvidence, policy files, deposits, challenge windows, and court parameters as live data that must be read, not guessed.

Goal:
- Turn the registry idea into clear acceptance criteria.
- Choose Light Curate, Stake Curate, or Classic based on the workflow.
- Draft or review the policy before launch.
- Prepare valid MetaEvidence and item schema.
- Decide whether we self-host, use Quickstart indexing, or buy Curate Pro support.
- Produce a launch checklist with risks, costs, dependencies, and next actions.`

const CREATE_HREF = '/factory/100'
const CONTACT_HREF = 'mailto:contact@kleros.io?subject=Curate%20Pro'
const GUIDE_HREF = '/guide'
const SKILL_HREF = '/skills/kleros-curate/SKILL.md'

const COPIED_FOR_MS = 1800

type CopyState = 'idle' | 'copied' | 'failed'

interface Capabilities {
  frontend: string
  indexing: string
  policy: string
}

interface Tier {
  name: string
  icon: CurateIconName
  path: string
  pathSummary: string
  badge: string
  featured: boolean
  price: string
  priceDetail: string
  meta: string
  features: string[]
  capabilities: Capabilities
  action: React.ReactNode
}

const CAPABILITY_ROWS: { key: keyof Capabilities; label: string }[] = [
  { key: 'frontend', label: 'Frontend' },
  { key: 'indexing', label: 'Indexing' },
  { key: 'policy', label: 'Policy' },
]

const TIERS: Tier[] = [
  {
    name: 'Permissionless',
    icon: 'factory',
    path: 'Default path',
    pathSummary: 'Deploy and operate your own registry without approval.',
    badge: 'Build yourself',
    featured: false,
    price: '$0',
    priceDetail: '/ month · self-operated',
    meta: 'Open-source, self-operated',
    features: [
      'Deploy a registry without approval from Kleros.',
      'Build and host the frontend yourself.',
      'Run local indexing or wire a third-party indexer.',
      'Own the policy, monitoring, and operations.',
    ],
    capabilities: {
      frontend: 'Build, host, and maintain your own frontend.',
      indexing: 'Run local indexing or connect a third-party indexer.',
      policy: 'Write, publish, and maintain your own policy.',
    },
    action: (
      <ButtonLink to={CREATE_HREF} $variant="primary" $block>
        <CurateIcon name="factory" size={16} />
        Create a registry
      </ButtonLink>
    ),
  },
  {
    name: 'Quickstart',
    icon: 'activity',
    path: 'Fastest path',
    pathSummary: 'Skip the indexer setup and build against a ready API.',
    badge: 'API only',
    featured: true,
    price: '$19.99',
    priceDetail: '/ month · API access',
    meta: 'Indexing without the setup drag',
    features: [
      'Deploy a registry without approval from Kleros.',
      'Build and host the frontend yourself.',
      'Use a ready API instead of running the indexer.',
      'Keep policy and product decisions in-house.',
    ],
    capabilities: {
      frontend: 'Build, host, and maintain your own frontend.',
      indexing: 'Ready API for agents and frontends.',
      policy: 'Write, publish, and maintain your own policy.',
    },
    action: (
      <ButtonAnchor href={CONTACT_HREF} $variant="secondary" $block>
        Talk to Kleros
      </ButtonAnchor>
    ),
  },
  {
    name: 'Curate Pro',
    icon: 'policy',
    path: 'Supported path',
    pathSummary:
      'Get direct help packaging the registry into a usable product.',
    badge: 'Kleros support',
    featured: false,
    price: '$199',
    priceDetail: '/ month · managed support',
    meta: 'A supported path to production',
    features: [
      'Launch with help on registry parameters.',
      'Get support for a dedicated frontend.',
      'Use a ready API with operational guidance.',
      'Get policy drafting and review support.',
    ],
    capabilities: {
      frontend: 'Support creating a dedicated frontend.',
      indexing: 'Ready API with operational support.',
      policy: 'Policy creation and review support.',
    },
    action: (
      <ButtonAnchor href={CONTACT_HREF} $variant="secondary" $block>
        Talk to Kleros
      </ButtonAnchor>
    ),
  },
]

/* ---------- Hero ---------- */

const Hero = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
`

/* ---------- Tiers ---------- */

const SectionIntro = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
`

const Tiers = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1020px) {
    grid-template-columns: 1fr;
  }
`

/* The featured tier keeps the old page's primary border; the "Recommended"
 * chip says it in words so the emphasis does not rest on color alone. */
const TierCard = styled(Surface)<{ $featured?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-color: ${({ $featured }) =>
    $featured ? 'var(--color-primary)' : 'var(--color-border)'};
`

const TierEyebrow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const TierChips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`

const TierName = styled(Subheading)`
  display: flex;
  align-items: center;
  gap: 8px;

  svg {
    color: var(--color-muted);
  }
`

const Price = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
`

const Points = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Point = styled.li`
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 8px;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);

  svg {
    margin-top: 2px;
    color: var(--color-faint);
  }
`

const TierAction = styled.div`
  margin-top: auto;
  padding-top: 4px;
`

/* One row per capability, one column per tier, so the tiers can be read
 * side by side; the scroller keeps the 640px table usable at phone width. */
const Compare = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
`

const CompareTable = styled(Table)`
  tbody th {
    height: 44px;
    padding: 12px;
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    vertical-align: top;
    white-space: nowrap;
  }

  tbody tr:last-child th {
    border-bottom: 0;
  }

  tbody td {
    padding: 12px;
    color: var(--color-muted);
    vertical-align: top;
  }
`

const Note = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 16px;
`

/* ---------- Creator prompt ---------- */

const PromptShell = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const PromptIntro = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const PromptLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 6px;
`

const TextLink = styled(Link)`
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
  }
`

const TextAnchor = styled.a`
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
  }
`

const PromptBlock = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
`

const PromptBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 8px 8px 16px;
  border-bottom: 1px solid var(--color-border);
`

const PromptCode = styled.pre`
  margin: 0;
  max-height: 480px;
  padding: 16px;
  overflow: auto;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  font-weight: 400;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`

/* Live region for the copy failure; it takes no space while empty. */
const CopyNotice = styled(Small)`
  display: block;
  padding: 0 16px 12px;

  &:empty {
    display: none;
  }
`

/* ---------- Page ---------- */

const CuratePro = () => {
  useDocumentHead(
    'Curate Pro | Kleros Curate',
    'Launch a Kleros Curate registry with permissionless contracts, Quickstart indexing, or supported policy and frontend delivery.',
  )

  const [copyState, setCopyState] = useState<CopyState>('idle')
  const copiedTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  const copyCreatorPrompt = async () => {
    window.clearTimeout(copiedTimer.current)
    const clipboard = navigator.clipboard
    if (!clipboard) {
      setCopyState('failed')
      return
    }
    try {
      await clipboard.writeText(CREATOR_PROMPT)
      setCopyState('copied')
      copiedTimer.current = window.setTimeout(
        () => setCopyState('idle'),
        COPIED_FOR_MS,
      )
    } catch {
      setCopyState('failed')
    }
  }

  const copied = copyState === 'copied'

  return (
    <Page>
      <Hero>
        <Label>Curate Pro</Label>
        <Statement>
          Launch a registry without building the whole stack.
        </Statement>
        <Body $muted $large>
          Curate is open source and permissionless. Use it yourself for free,
          add Quickstart when indexing slows you down, or work with Kleros when
          you want policy, API, and frontend support in one launch path.
        </Body>
        <Actions>
          <ButtonLink to={CREATE_HREF} $variant="primary">
            <CurateIcon name="factory" size={16} />
            Create a registry
          </ButtonLink>
          <ButtonAnchor href={CONTACT_HREF} $variant="secondary">
            Talk to Kleros
          </ButtonAnchor>
        </Actions>
      </Hero>

      <Section>
        <SectionIntro>
          <Heading>Choose the amount of stack you want to own</Heading>
          <Body $muted>
            The protocol stays permissionless in every option. The paid paths do
            not buy access to Curate; they buy speed, infrastructure, and direct
            support.
          </Body>
        </SectionIntro>

        <Tiers>
          {TIERS.map((tier) => (
            <TierCard
              key={tier.name}
              $padding="standard"
              $featured={tier.featured}
              as="article"
              aria-label={tier.name}
            >
              <TierEyebrow>
                <Label>{tier.path}</Label>
                <TierChips>
                  {tier.featured && <Chip $selected>Recommended</Chip>}
                  <Chip>{tier.badge}</Chip>
                </TierChips>
              </TierEyebrow>
              <div>
                <TierName>
                  <CurateIcon name={tier.icon} size={16} />
                  {tier.name}
                </TierName>
                <Small $muted>{tier.meta}</Small>
              </div>
              <Price>
                <Figure>{tier.price}</Figure>
                <Small $muted>{tier.priceDetail}</Small>
              </Price>
              <Body $muted>{tier.pathSummary}</Body>
              <Points>
                {tier.features.map((feature) => (
                  <Point key={feature}>
                    <CurateIcon name="check" size={14} />
                    <span>{feature}</span>
                  </Point>
                ))}
              </Points>
              <TierAction>{tier.action}</TierAction>
            </TierCard>
          ))}
        </Tiers>

        <Compare>
          <TableScroller>
            <CompareTable aria-label="Capabilities by tier">
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  {TIERS.map((tier) => (
                    <th key={tier.name} scope="col">
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_ROWS.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">
                      <Label>{row.label}</Label>
                    </th>
                    {TIERS.map((tier) => (
                      <td key={tier.name}>{tier.capabilities[row.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </CompareTable>
          </TableScroller>
        </Compare>

        <Note $padding="compact" $raised>
          <Title>Same protocol, different operating burden</Title>
          <Body $muted>
            Permissionless and Quickstart both leave product ownership with you.
            Quickstart removes indexing work. Curate Pro adds Kleros support
            where mistakes are expensive: policy, data access, and the frontend
            users will actually touch.
          </Body>
        </Note>
      </Section>

      <Section>
        <SectionIntro>
          <Heading>Creator prompt for new lists</Heading>
          <Body $muted>
            The global Curate skill is for every registry. This prompt is only
            for creators deciding how to launch and operate a new list.
          </Body>
        </SectionIntro>

        <PromptShell $padding="standard" aria-label="Creator prompt">
          <PromptIntro>
            <Label>Agent context</Label>
            <Subheading>Start a launch conversation.</Subheading>
            <Body $muted>
              Paste this after the agent loads the Curate skill. It keeps the
              conversation focused on policy, indexing, frontend, and the real
              operating choices behind a registry launch.
            </Body>
            <PromptLinks>
              <TextLink to={GUIDE_HREF}>Open the guide</TextLink>
              <TextAnchor href={SKILL_HREF}>Open local SKILL.md</TextAnchor>
            </PromptLinks>
          </PromptIntro>
          <PromptBlock>
            <PromptBar>
              <Label>Creator prompt</Label>
              <Button
                type="button"
                $variant="primary"
                $size="sm"
                onClick={copyCreatorPrompt}
              >
                <CurateIcon name={copied ? 'check' : 'copy'} size={14} />
                <span aria-live="polite">
                  {copied ? 'Copied' : 'Copy creator prompt'}
                </span>
              </Button>
            </PromptBar>
            <PromptCode
              role="region"
              tabIndex={0}
              aria-label="Creator prompt text"
            >
              {CREATOR_PROMPT}
            </PromptCode>
            <CopyNotice $muted role="status">
              {copyState === 'failed'
                ? 'Copy failed. Select the text above to copy it.'
                : null}
            </CopyNotice>
          </PromptBlock>
        </PromptShell>
      </Section>

      <Section>
        <Explainer
          id="curate-pro-production-registry"
          eyebrow="Before you launch"
          heading="What a production registry needs"
          intro="Every tier runs the same contracts. What changes is who builds and operates the pieces around them."
          steps={[
            {
              title: 'Policy and court',
              body: 'The acceptance criteria, as a PDF the list’s MetaEvidence points to, and a Kleros court with a number of jurors set in the list’s arbitrator data. Challengers cite the policy and jurors rule by it, so it says what belongs on the list, what does not, and how to check. In Light and Classic Curate disputes are raised during the challenge period; in Stake Curate an item can be challenged at any time while it is listed. More jurors make rulings sturdier and raise the arbitration cost every deposit has to cover.',
            },
            {
              title: 'Deposits',
              body: 'In Light and Classic Curate every submission, removal and challenge locks a base deposit plus the court’s arbitration cost, in the chain’s native token. An unchallenged deposit comes back in full when the request is executed; after a dispute the winner takes the pool minus the arbitration cost. Stake Curate instead locks an ERC-20 stake for as long as the item is listed, plus a native arbitration deposit.',
            },
            {
              title: 'Indexing and front end',
              body: 'Light Curate keeps only an IPFS hash on-chain, so the fields people search are indexed off-chain by a subgraph or indexer: run one yourself, connect a third-party indexer, or use the ready API that Quickstart and Curate Pro include. The front end is where people read the list, submit entries and challenge them. Build and host your own on the permissionless contracts, or get support for a dedicated one with Curate Pro.',
            },
          ]}
          schematic={<ProductionStackSchematic />}
          footer={<TextLink to={GUIDE_HREF}>Read the guide</TextLink>}
        />
      </Section>
    </Page>
  )
}

export default CuratePro
