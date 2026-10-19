import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import useDocumentHead from 'hooks/use-document-head'
import { NETWORKS } from 'config/networks'
import useDisplayedChainId from './use-displayed-chain-id'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  ButtonLink,
  ChainChip,
  Label,
  Page,
  Small,
  Surface,
} from 'components/curate/primitives'
import { reveal } from 'components/curate/motion/reveal'
import { TableOfContents } from './table-of-contents'
import { LifecycleSchematic } from './lifecycle-schematic'
import { AppealWindow } from './appeal-window'
import {
  DESKTOP_QUERY,
  useInView,
  useMediaQuery,
  useReducedMotion,
} from './hooks'
import {
  AGENT_FILES,
  AGENT_PROMPT,
  CHALLENGE_STEPS,
  COSTS,
  DECISIONS,
  DISPUTE_STEPS,
  GLOSSARY,
  LEGEND,
  OUTCOMES,
  SECTIONS,
  SOURCES,
  SUBMIT_STEPS,
  sectionNumber,
} from './content'
import {
  Aside,
  Costs,
  DefinitionGrid,
  Eyebrow,
  External,
  FileRow,
  FileRows,
  GuideSection,
  OutcomeTable,
  Prose,
  SourceGrid,
  StatusLegend,
  Steps,
  VisuallyHidden,
} from './parts'

/*
 * Guide (route /guide): the one page where text is the product. A sticky
 * table of contents follows the reader; the lifecycle is the featured drawing
 * and draws itself in; sections open with display headings and read at a 68ch
 * measure. Every mechanism follows the public Kleros documentation, and no
 * figures are given because each list and court sets its own.
 */

const COPIED_FOR_MS = 1600

/* ---------- Layout ---------- */

const Layout = styled.div`
  display: grid;
  grid-template-columns: 196px minmax(0, 1fr);
  column-gap: clamp(40px, 4.4vw, 80px);
  align-items: stretch;

  @media (max-width: 1023px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const RailColumn = styled.div`
  min-width: 0;
  padding-top: 8px;
  ${reveal}
`

const Doc = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 980px;
`

/* ---------- Hero ---------- */

const Hero = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 20px;
  padding-top: 8px;

  > * {
    ${reveal}
  }
`

const GuidePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 14px 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  color: var(--color-muted);
  font-size: 13px;
  font-weight: 500;

  b {
    color: var(--color-primary);
    font-weight: 500;
  }

  svg {
    color: var(--color-primary);
  }
`

const Title = styled.h1`
  margin: 0;
  max-width: 17ch;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(38px, 2.8vw + 18px, 60px);
  line-height: 1.02;
  font-weight: 500;
  letter-spacing: -0.035em;
  text-wrap: balance;

  em {
    font-style: normal;
    color: var(--color-primary);
  }
`

const Lede = styled.p`
  margin: 0;
  max-width: 52ch;
  color: var(--color-muted);
  font-size: 18px;
  line-height: 28px;

  @media (max-width: 720px) {
    font-size: 16px;
    line-height: 26px;
  }
`

/* ---------- Featured lifecycle ---------- */

const LifecyclePanel = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-top: 56px;
  padding: 26px 28px 24px;
  scroll-margin-top: calc(var(--app-bar-height) + 32px);
  ${reveal}

  @media (max-width: 1023px) {
    margin-top: 24px;
    scroll-margin-top: calc(var(--app-bar-height) + 72px);
  }

  @media (max-width: 720px) {
    padding: 20px 16px;
  }
`

const PanelTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
`

const PanelHeading = styled.h2`
  margin: 12px 0 0;
  max-width: 30ch;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(20px, 0.6vw + 16px, 24px);
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: -0.02em;
  text-wrap: balance;
`

const Facts = styled.dl`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px 28px;
  margin: 0;
  padding-top: 22px;
  border-top: 1px solid var(--glass-border);

  > div {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  dt {
    margin: 0;
  }

  dd {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
  }

  dd > b {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    color: var(--color-text);
    font-size: 15px;
    line-height: 22px;
    font-weight: 500;
    letter-spacing: -0.005em;
  }

  dd > span {
    color: var(--color-muted);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
  }

  @media (max-width: 1180px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`

/* ---------- Agents ---------- */

const PromptCard = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px 20px;
  align-items: center;
  max-width: 760px;
  padding: 16px 18px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  box-shadow: inset 0 1px 0 var(--glass-highlight);

  code {
    display: block;
    margin-top: 6px;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: 13px;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`

const ReplayIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    aria-hidden
  >
    <path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9" />
    <path d="M2.5 2.5v3h3" />
  </svg>
)

/* ---------- Page ---------- */

const Guide = () => {
  useDocumentHead(
    'Guide | Kleros Curate',
    'How Kleros Curate works: submitting, challenging, disputes and appeals, rewards, launching a list, agent skills and a glossary.',
  )
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const reduced = useReducedMotion()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const [run, setRun] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const panelInView = useInView(panelRef, 0.25)
  const launchHref = `/launch/${useDisplayedChainId()}`

  // A deep link (/guide#glossary) lands after the lazy route renders.
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (!id || !SECTIONS.some((section) => section.id === id)) return
    const frame = requestAnimationFrame(() =>
      document.querySelector(`#${id}`)?.scrollIntoView({ block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [])

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    window.setTimeout(() => setCopyState('idle'), COPIED_FOR_MS)
  }

  const toc = (variant: 'rail' | 'strip') => (
    <TableOfContents
      sections={SECTIONS}
      numberOf={sectionNumber}
      variant={variant}
    />
  )

  return (
    <Page>
      <Layout>
        {desktop && (
          <RailColumn style={{ ['--i' as string]: 3 }}>
            {toc('rail')}
          </RailColumn>
        )}

        <Doc>
          <Hero>
            <GuidePill style={{ ['--i' as string]: 0 }}>
              <CurateIcon name="policy" size={14} />
              <b>Guide</b>
              {SECTIONS.length} sections · follows the public Kleros docs
            </GuidePill>
            <Title style={{ ['--i' as string]: 1 }}>
              Add to a list, challenge what does not belong,{' '}
              <em>let jurors settle the rest.</em>
            </Title>
            <Lede style={{ ['--i' as string]: 2 }}>
              How Kleros Curate works: each step, what it costs and what comes
              back.
            </Lede>
          </Hero>

          {!desktop && toc('strip')}

          <LifecyclePanel
            ref={panelRef}
            as="section"
            id="lifecycle"
            aria-labelledby="lifecycle-title"
            $featured
            $padding="none"
            style={{ ['--i' as string]: 4 }}
          >
            <PanelTop>
              <div>
                <Eyebrow id="lifecycle" />
                <PanelHeading id="lifecycle-title">
                  A court only if someone objects.
                </PanelHeading>
              </div>
              {!reduced && (
                <Button
                  type="button"
                  $variant="ghost"
                  $size="sm"
                  onClick={() => setRun((value) => value + 1)}
                  aria-label="Replay the lifecycle drawing"
                >
                  <ReplayIcon />
                  Replay
                </Button>
              )}
            </PanelTop>
            <LifecycleSchematic
              play={panelInView}
              run={run}
              caption={
                <>
                  <Label $tone="faint">One request</Label>
                  <span>In a Light or Classic list.</span>
                </>
              }
            />
            <Facts aria-label="In short">
              <div>
                <dt>
                  <Label $tone="faint">Deposit</Label>
                </dt>
                <dd>
                  <b>Base + arbitration cost</b>
                  <span>
                    Sent in one transaction; back in full if nobody challenges.
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  <Label $tone="faint">Challenge period</Label>
                </dt>
                <dd>
                  <b>Set by each list</b>
                  <span>The time left shows wherever an entry appears.</span>
                </dd>
              </div>
              <div>
                <dt>
                  <Label $tone="faint">Dispute</Label>
                </dt>
                <dd>
                  <b>Kleros jurors rule</b>
                  <span>
                    On the list’s policy; the winner receives both deposits
                    minus the fees.
                  </span>
                </dd>
              </div>
              <div>
                <dt>
                  <Label $tone="faint">Chains</Label>
                </dt>
                <dd>
                  <b>
                    <ChainChip chainId={NETWORKS.ethereum} size="sm" />
                    <ChainChip chainId={NETWORKS.gnosis} size="sm" />
                  </b>
                  <span>
                    Plus the Sepolia testnet. Paid in the chain’s currency: ETH
                    or xDAI.
                  </span>
                </dd>
              </div>
            </Facts>
          </LifecyclePanel>

          <GuideSection id="statuses" heading="One dot, one label">
            <StatusLegend groups={LEGEND} />
          </GuideSection>

          <GuideSection id="submitting" heading="Read the policy, then deposit">
            <Steps steps={SUBMIT_STEPS} />
            <Costs label="What you send, per action" rows={COSTS} />
            <Aside>
              Some lists also require a justification for removal requests.
            </Aside>
          </GuideSection>

          <GuideSection id="challenging" heading="Show why, then pay a deposit">
            <Prose>
              Anyone can challenge a request, new entries and removal requests
              alike, while its challenge period runs.
            </Prose>
            <Steps steps={CHALLENGE_STEPS} />
          </GuideSection>

          <GuideSection id="disputes" heading="Jurors rule, anyone can appeal">
            <Prose>
              A challenge opens a dispute in the Kleros court the list chose
              when it was created.
            </Prose>
            <Steps steps={DISPUTE_STEPS} />
            <AppealWindow />
            <Prose $quiet>
              Funding costs the next round’s arbitration cost plus a stake the
              list sets for each side; several people can fund one side.
            </Prose>
          </GuideSection>

          <GuideSection id="rewards" heading="The wrong side pays">
            <Prose>There is no reward pool.</Prose>
            <OutcomeTable
              title="What happens to what you put in"
              roles={OUTCOMES}
            />
            <Prose $quiet>
              In Light and Classic Curate, claim winnings and appeal returns on
              the entry once the ruling is final.
            </Prose>
          </GuideSection>

          <GuideSection id="launching" heading="Policy, schema, parameters">
            <Prose>
              Anyone can deploy a list on Light Curate, which the app calls
              Standard, or on Stake Curate. Classic Curate is being deprecated.
            </Prose>
            <DefinitionGrid label="What you decide" items={DECISIONS} />
            <Prose $quiet>
              Stake Curate also sets the stake token and minimum, the
              challenger’s share, the withdrawal wait and the juror count.
            </Prose>
            <Aside>
              To reach the home page, submit the new list to the Kleros Verified
              list of lists; it appears once that request is executed.
            </Aside>
            <Actions>
              <ButtonLink to={launchHref} $variant="primary">
                <CurateIcon name="factory" size={16} />
                Launch a list
              </ButtonLink>
            </Actions>
          </GuideSection>

          <GuideSection id="agents" heading="Same rules for agents">
            <Prose>Give your agent the skill and context below.</Prose>
            <PromptCard>
              <div>
                <Label $tone="faint">Prompt for your agent</Label>
                <code>{AGENT_PROMPT}</code>
              </div>
              <Button
                type="button"
                $variant="secondary"
                $size="sm"
                onClick={copyPrompt}
              >
                <CurateIcon
                  name={copyState === 'copied' ? 'check' : 'copy'}
                  size={14}
                />
                {copyState === 'copied'
                  ? 'Copied'
                  : copyState === 'failed'
                    ? 'Select and copy'
                    : 'Copy prompt'}
              </Button>
              <VisuallyHidden role="status">
                {copyState === 'copied'
                  ? 'Prompt copied'
                  : copyState === 'failed'
                    ? 'Copying failed; select the prompt and copy it'
                    : ''}
              </VisuallyHidden>
            </PromptCard>
            <FileRows>
              {AGENT_FILES.map((file) => (
                <FileRow
                  key={file.href}
                  href={file.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span style={{ minWidth: 0 }}>
                    <strong>{file.name}</strong>
                    <Small $muted>{file.about}</Small>
                  </span>
                  <CurateIcon name="external" size={16} />
                </FileRow>
              ))}
            </FileRows>
          </GuideSection>

          <GuideSection id="glossary" heading="Words used here">
            <DefinitionGrid items={GLOSSARY} />
          </GuideSection>

          <GuideSection id="sources" heading="Straight from the Kleros docs">
            <Prose>
              Mechanisms, not numbers: the app reads live values before every
              action.
            </Prose>
            <SourceGrid>
              {SOURCES.map((source) => (
                <li key={source.href}>
                  <External href={source.href}>{source.label}</External>
                </li>
              ))}
            </SourceGrid>
            <Actions style={{ marginTop: 8 }}>
              <ButtonLink to="/browse" $variant="primary">
                <CurateIcon name="registry" size={16} />
                Browse registries
              </ButtonLink>
              <ButtonLink to={launchHref} $variant="secondary">
                Launch a list
              </ButtonLink>
              <ButtonLink to="/" $variant="ghost">
                Dashboard
              </ButtonLink>
            </Actions>
          </GuideSection>
        </Doc>
      </Layout>
    </Page>
  )
}

export default Guide
