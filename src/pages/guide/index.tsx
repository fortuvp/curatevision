import React, { useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import useDocumentHead from 'hooks/use-document-head'
import { NETWORKS } from 'config/networks'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonLink,
  Data,
  KeyValueList,
  Label,
  Page,
  PanelHeader,
  PanelTitle,
  Small,
  Stack,
  Statement,
  Status,
  type StatusTone,
  Surface,
  Table,
  TableScroller,
  Title,
} from 'components/curate/primitives'
import { LifecycleSchematic } from 'components/curate/explainer'
import { TableOfContents, type GuideSectionLink } from './table-of-contents'

/*
 * Guide (route /guide): an editorial page that explains Curate end to end.
 * Serif statements open each section, the lifecycle schematic is shared with
 * the dashboard, and a sticky table of contents follows the reader. Every
 * mechanism described here follows the public Kleros documentation; figures
 * are avoided because deposits, periods and multipliers are set per list and
 * can change by governance.
 */

const CONTEXT_URL = 'https://curate.kleros.io/llms-full.txt'
const SKILL_PATH = '/skills/kleros-curate/SKILL.md'
const AGENT_PROMPT = `Read ${CONTEXT_URL} and follow it before interacting with Kleros Curate.`
const COPIED_FOR_MS = 1600

const DOCS = {
  curate: 'https://docs.kleros.io/products/curate',
  stakeCurate: 'https://docs.kleros.io/products/stake-curate',
  tutorial: 'https://docs.kleros.io/tutorials/curate-tutorial',
  lightCurate: 'https://docs.kleros.io/developers/products/curate/light-curate',
  appeals: 'https://docs.kleros.io/court/appeals',
  howItWorks: 'https://docs.kleros.io/court/how-it-works',
  courts: 'https://docs.kleros.io/court/court-hierarchy',
  policyGuide: 'https://docs.kleros.io/legacy/integrate/policy-guide',
  courtApp: 'https://court.kleros.io',
  skillSource:
    'https://github.com/kleros/kleros-skills/tree/master/kleros-curate',
}

const SECTIONS: GuideSectionLink[] = [
  { id: 'lifecycle', label: 'The lifecycle' },
  { id: 'submitting', label: 'Submitting' },
  { id: 'challenging', label: 'Challenging' },
  { id: 'disputes', label: 'Disputes and appeals' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'launching', label: 'Launching a list' },
  { id: 'agents', label: 'Agents and skills' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'sources', label: 'Sources' },
]

/* ---------- Layout ---------- */

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(300px, 0.9fr);
  gap: 32px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 8px;
`

const Layout = styled.div`
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 48px;
  align-items: start;
  margin-top: 48px;

  @media (max-width: 1023px) {
    grid-template-columns: 1fr;
    gap: 24px;
    margin-top: 32px;
  }
`

const Article = styled.div`
  display: flex;
  flex-direction: column;
  gap: 56px;
  min-width: 0;

  @media (max-width: 720px) {
    gap: 44px;
  }
`

const SectionShell = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  scroll-margin-top: calc(var(--app-bar-height) + 24px);
`

/** Serif statement that opens each section (editorial moment, DESIGN.md). */
const SectionStatement = styled.h2`
  margin: 0;
  max-width: 30ch;
  color: var(--color-text);
  font-family: var(--font-serif);
  font-size: clamp(24px, 1vw + 18px, 28px);
  line-height: 1.25;
  font-weight: 400;
  letter-spacing: -0.01em;
  text-wrap: balance;
`

const Prose = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 72ch;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
`

const Step = styled.li`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  counter-increment: step;

  &::before {
    content: counter(step);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-pill);
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-data);
    font-weight: 500;
  }
`

const StepTitle = styled.div`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
`

const StepBody = styled.div`
  max-width: 68ch;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
`

const Callout = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 72ch;
  box-shadow: none;
`

const LegendGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0 24px;
`

const LegendItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);
`

/** The legend rows may wrap on phones; the primitive is nowrap by default. */
const LegendStatus = styled(Status)`
  flex-wrap: wrap;
  white-space: normal;
`

const Schematic = styled.div`
  max-width: 520px;
  margin: 0 auto;
  color: var(--color-muted);

  svg {
    display: block;
    width: 100%;
    height: auto;
  }
`

/** Two columns only: let it fit the phone width and wrap instead of scrolling. */
const DepositTable = styled(Table)`
  min-width: 0;

  tbody td {
    height: auto;
    padding-top: 12px;
    padding-bottom: 12px;
  }
`

const Outcomes = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
`

const Prompt = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  max-width: 72ch;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const PromptText = styled(Data)`
  display: block;
  white-space: normal;
  overflow-wrap: anywhere;
  font-weight: 400;
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 72ch;
`

const FileRow = styled.a`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  color: inherit;
  text-decoration: none;
  transition: background var(--motion);

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: var(--color-raised);
  }

  &:hover ${Data} {
    color: var(--color-primary);
  }
`

const FileCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  ${Data} {
    overflow-wrap: anywhere;
  }
`

const GlossaryList = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px 32px;
  margin: 0;

  dt {
    margin-bottom: 4px;
    color: var(--color-text);
    font-size: var(--fs-body-lg);
    line-height: var(--lh-body-lg);
    font-weight: 600;
  }

  dd {
    margin: 0;
    color: var(--color-muted);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
  }
`

const SourceList = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 8px 24px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const SourceLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  text-decoration: none;

  &:hover {
    color: var(--color-primary);
  }

  svg {
    color: var(--color-faint);
  }
`

/* ---------- Pieces ---------- */

const GuideSection = ({
  id,
  eyebrow,
  statement,
  children,
}: {
  id: string
  eyebrow: string
  statement: string
  children: React.ReactNode
}) => (
  <SectionShell id={id} aria-labelledby={`${id}-title`}>
    <Stack $gap={8}>
      <Label>{eyebrow}</Label>
      <SectionStatement id={`${id}-title`}>{statement}</SectionStatement>
    </Stack>
    {children}
  </SectionShell>
)

const StepList = ({
  steps,
}: {
  steps: { title: string; body: React.ReactNode }[]
}) => (
  <Steps>
    {steps.map((step) => (
      <Step key={step.title}>
        <div>
          <StepTitle>{step.title}</StepTitle>
          <StepBody>{step.body}</StepBody>
        </div>
      </Step>
    ))}
  </Steps>
)

const Note = ({
  label = 'Keep in mind',
  children,
}: {
  label?: string
  children: React.ReactNode
}) => (
  <Callout $raised $padding="compact" role="note">
    <Label $tone="text">{label}</Label>
    <Body>{children}</Body>
  </Callout>
)

const External = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <SourceLink href={href} target="_blank" rel="noreferrer">
    {children}
    <CurateIcon name="external" size={14} />
  </SourceLink>
)

const LEGEND: {
  group: string
  items: { tone: StatusTone; label: string; detail?: string; meaning: string }[]
}[] = [
  {
    group: 'Light and Classic Curate',
    items: [
      {
        tone: 'window',
        label: 'Submitted',
        detail: 'time left to challenge',
        meaning: 'A new entry inside its challenge period.',
      },
      {
        tone: 'window',
        label: 'Removal requested',
        detail: 'time left to challenge',
        meaning:
          'Someone asked to remove a listed entry; it stays listed until the request is executed.',
      },
      {
        tone: 'neutral',
        label: 'Ready to execute',
        detail: 'unchallenged',
        meaning:
          'The period ended without a challenge; anyone can execute the request.',
      },
      {
        tone: 'contested',
        label: 'Challenged',
        detail: 'jurors deciding',
        meaning: 'A dispute is open in Kleros Court.',
      },
      {
        tone: 'contested',
        label: 'Appeal open',
        detail: 'time left to fund',
        meaning: 'Jurors have voted; either side can fund an appeal.',
      },
      {
        tone: 'contested',
        label: 'Awaiting ruling',
        detail: 'appeal period over',
        meaning: 'No new round was funded; the final ruling is pending.',
      },
      {
        tone: 'registered',
        label: 'Registered',
        meaning: 'On the list.',
      },
      {
        tone: 'off',
        label: 'Rejected',
        meaning: 'A submission that lost its dispute.',
      },
      {
        tone: 'off',
        label: 'Removed',
        meaning: 'A removal that was executed or won its dispute.',
      },
    ],
  },
  {
    group: 'Stake Curate',
    items: [
      {
        tone: 'window',
        label: 'Pending',
        detail: 'until accepted',
        meaning: 'A new entry inside its submission period.',
      },
      {
        tone: 'registered',
        label: 'Accepted',
        meaning: 'Listed, with its stake locked; it can still be challenged.',
      },
      {
        tone: 'contested',
        label: 'Disputed',
        detail: 'jurors deciding',
        meaning: 'A challenge is in court.',
      },
      {
        tone: 'neutral',
        label: 'Withdrawal ready',
        meaning: 'The waiting period is over; the stake can be withdrawn.',
      },
      {
        tone: 'off',
        label: 'Withdrawn',
        meaning: 'The owner took the stake back; the entry left the list.',
      },
    ],
  },
]

const GLOSSARY: { term: string; definition: string }[] = [
  {
    term: 'Registry',
    definition:
      'A list kept by a smart contract; also called a list or a TCR (token-curated registry). Its policy, fields and names live in a document called MetaEvidence, stored on IPFS and referenced on chain.',
  },
  {
    term: 'Entry',
    definition:
      'One item in a registry, described by the list’s fields. The app names entries after the list’s own item name: a tag, a token, a vault.',
  },
  {
    term: 'Challenge period',
    definition:
      'The time a request stays open to challenges after it is made. Each list sets its own; when it ends without a challenge, the request can be executed.',
  },
  {
    term: 'Deposit',
    definition:
      'What a requester or a challenger locks: a base deposit set by the list plus the arbitration cost. It comes back in full when unchallenged; after a dispute the winner receives both deposits minus the arbitration fees.',
  },
  {
    term: 'Arbitration cost',
    definition:
      'What the court charges to decide a dispute: its fee per juror times the number of jurors the list asks for. It is part of every deposit and changes by governance.',
  },
  {
    term: 'Court',
    definition:
      'A Kleros court is a pool of jurors who staked PNK, with its own policy and parameters. Each list picks the court that hears its disputes; Curate lists on Ethereum and Gnosis use Court V1, and Gnosis has a Curation court with hidden voting.',
  },
  {
    term: 'Appeal',
    definition:
      'A new round with more jurors, started when a side is fully funded during the appeal period. If only one side funds, that side wins; if both do, the next round has twice as many jurors plus one.',
  },
  {
    term: 'Policy',
    definition:
      'The document that says what belongs on the list. Jurors decide from the evidence, this policy and then the court’s own policy, in that order.',
  },
  {
    term: 'Light Curate',
    definition:
      'The default kind of list; the app calls it Standard. Only an IPFS reference to each entry is stored on chain and the fields are indexed off chain, which keeps costs low. Deposits are paid in the chain’s native currency.',
  },
  {
    term: 'Classic Curate',
    definition:
      'The original kind of list, which stores entry data on chain. It is deprecated: existing Classic lists keep working, but no new ones can be created.',
  },
  {
    term: 'Stake Curate',
    definition:
      'A list where the entry’s stake, in an ERC20 token, stays locked for as long as the entry is listed, so it can be challenged at any time. Withdrawing takes a waiting period during which the entry can still be challenged.',
  },
]

/* ---------- Page ---------- */

const Guide = () => {
  useDocumentHead(
    'Guide | Kleros Curate',
    'How Kleros Curate works: submitting, challenging, disputes and appeals, rewards, launching a list, agent skills and a glossary.',
  )
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>(
    'idle',
  )
  const launchHref = `/launch/${NETWORKS.gnosis}`

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    window.setTimeout(() => setCopyState('idle'), COPIED_FOR_MS)
  }

  return (
    <Page>
      <Hero>
        <HeroCopy>
          <Label>Guide</Label>
          <Statement>
            Add to a list, challenge what does not belong, and let jurors settle
            the rest.
          </Statement>
          <Body $muted $large>
            Kleros Curate keeps community-run lists on chain. Every entry is
            backed by a deposit, anyone can challenge it during a challenge
            period, and when there is a dispute a Kleros court rules against the
            list’s policy. This guide explains each step, what it costs and what
            comes back.
          </Body>
          <Actions>
            <ButtonLink to="/browse" $variant="secondary">
              <CurateIcon name="registry" size={16} />
              Browse registries
            </ButtonLink>
            <ButtonLink to={launchHref} $variant="secondary">
              <CurateIcon name="factory" size={16} />
              Launch a list
            </ButtonLink>
          </Actions>
        </HeroCopy>

        <Surface $padding="standard" aria-label="In short">
          <PanelHeader>
            <PanelTitle>In short</PanelTitle>
          </PanelHeader>
          <KeyValueList>
            <dt>Deposit</dt>
            <dd>
              A base deposit set by the list plus the court’s arbitration cost,
              sent in one transaction. It comes back in full if nobody
              challenges.
            </dd>
            <dt>Window</dt>
            <dd>
              A challenge period set by the list. The time left is shown
              wherever an entry appears.
            </dd>
            <dt>Dispute</dt>
            <dd>
              Kleros jurors rule against the list’s policy. The winner receives
              both deposits minus the arbitration fees.
            </dd>
            <dt>Chains</dt>
            <dd>
              Ethereum, Gnosis and the Sepolia testnet. Deposits are paid in the
              chain’s native currency: ETH or xDAI.
            </dd>
          </KeyValueList>
        </Surface>
      </Hero>

      <Layout>
        <TableOfContents sections={SECTIONS} />

        <Article>
          <GuideSection
            id="lifecycle"
            eyebrow="The lifecycle"
            statement="One deposit, one window, and a court only if someone objects."
          >
            <Prose>
              <Body>
                A request, adding an entry or removing one, opens a challenge
                period set by the list. If the period ends without a challenge,
                anyone can execute the request and the deposit comes back in
                full. If someone challenges, a dispute is created in Kleros
                Court: jurors read the list’s policy and the evidence, vote, and
                the winner receives both deposits minus the arbitration fees.
              </Body>
            </Prose>
            <Surface $padding="standard">
              <Schematic>
                <LifecycleSchematic />
              </Schematic>
            </Surface>
            <Surface $padding="compact" aria-label="Statuses in this app">
              <PanelHeader>
                <div>
                  <PanelTitle>Statuses in this app</PanelTitle>
                  <Small $muted>
                    A dot plus a label, with the time left where it applies.
                  </Small>
                </div>
              </PanelHeader>
              <Stack $gap={16}>
                {LEGEND.map((group) => (
                  <Stack key={group.group} $gap={4}>
                    <Label $tone="faint">{group.group}</Label>
                    <LegendGrid>
                      {group.items.map((item) => (
                        <LegendItem key={item.label}>
                          <LegendStatus
                            tone={item.tone}
                            label={item.label}
                            detail={item.detail}
                          />
                          <Small $muted>{item.meaning}</Small>
                        </LegendItem>
                      ))}
                    </LegendGrid>
                  </Stack>
                ))}
              </Stack>
            </Surface>
          </GuideSection>

          <GuideSection
            id="submitting"
            eyebrow="01 · Submitting"
            statement="Read the policy first. The deposit is your pledge that the entry complies."
          >
            <Prose>
              <Body>
                Each list has a policy, its listing criteria, and a set of
                fields. Jurors rule against the policy if your entry is
                challenged, so it is the first thing to read, before the fields
                and before the deposit.
              </Body>
            </Prose>
            <StepList
              steps={[
                {
                  title: 'Open the registry and read its policy',
                  body: 'The policy is linked from the registry page. Check every criterion against what you are about to submit; ambiguous cases are decided by jurors, not by the submitter.',
                },
                {
                  title: 'Fill in the fields',
                  body: 'Every list defines its own fields and which of them identify an entry. Identifiers are what search finds, so write them exactly.',
                },
                {
                  title: 'Review the deposit and sign',
                  body: 'You send the submission base deposit plus the arbitration cost in one transaction, in the chain’s native currency. The app reads both from the chain and shows the exact total, what comes back and what can be lost, before you sign.',
                },
                {
                  title: 'Wait for the challenge period to end',
                  body: 'The time left is shown wherever the entry appears. If nobody challenges, the request can be executed and your deposit returns in full. If someone does, the entry goes to court.',
                },
              ]}
            />
            <TableScroller>
              <DepositTable aria-label="What each action costs">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>You send</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Submit an entry</td>
                    <td>
                      <Data $weight={400}>
                        submission base deposit + arbitration cost
                      </Data>
                    </td>
                  </tr>
                  <tr>
                    <td>Request a removal</td>
                    <td>
                      <Data $weight={400}>
                        removal base deposit + arbitration cost
                      </Data>
                    </td>
                  </tr>
                  <tr>
                    <td>Challenge a submission</td>
                    <td>
                      <Data $weight={400}>
                        submission challenge base deposit + arbitration cost
                      </Data>
                    </td>
                  </tr>
                  <tr>
                    <td>Challenge a removal</td>
                    <td>
                      <Data $weight={400}>
                        removal challenge base deposit + arbitration cost
                      </Data>
                    </td>
                  </tr>
                </tbody>
              </DepositTable>
            </TableScroller>
            <Body $muted>
              Base deposits and the challenge period are set by each list’s
              governor. The arbitration cost is set by the court: its fee per
              juror times the number of jurors the list asks for. All of them
              can change by governance, so the app reads the live values before
              every transaction.
            </Body>
            <Note>
              A deposit is not a fee. Unchallenged, it comes back in full.
              Challenged and lost, it goes to the challenger minus the
              arbitration fees. Removing an entry works the same way with the
              removal deposit, and some lists require a justification for
              removal requests.
            </Note>
          </GuideSection>

          <GuideSection
            id="challenging"
            eyebrow="02 · Challenging"
            statement="Find an entry that breaks the policy, show why, and put a deposit behind it."
          >
            <Prose>
              <Body>
                Any request inside its challenge period can be challenged by
                anyone, new entries and removal requests alike. A challenge must
                describe how the entry violates the list’s policy. Jurors decide
                on the policy and the evidence, so the justification is the
                case.
              </Body>
            </Prose>
            <StepList
              steps={[
                {
                  title: 'Check the time left',
                  body: 'Challenges are only possible while the challenge period runs. The countdown is on the entry and in every list row.',
                },
                {
                  title: 'Write the justification and attach evidence',
                  body: 'Name the criterion the entry fails and show it. Evidence is public and stays with the case; both sides, and anyone else, can add more during the dispute’s evidence period.',
                },
                {
                  title: 'Send the challenge deposit',
                  body: 'A challenge costs the list’s challenge base deposit plus the arbitration cost, shown in full before you sign. If the jurors side with the requester, this deposit is lost.',
                },
                {
                  title: 'Follow the case',
                  body: 'The dispute opens in Kleros Court. Jurors are drawn and vote, and either side can appeal. When the ruling is final the entry is kept, rejected or removed, and the winner is paid.',
                },
              ]}
            />
            <Note>
              In Stake Curate the stake stays locked for as long as the entry is
              listed, so an entry can be challenged at any time, including while
              its owner is withdrawing it.
            </Note>
          </GuideSection>

          <GuideSection
            id="disputes"
            eyebrow="03 · Disputes and appeals"
            statement="Jurors vote on the policy. Anyone who thinks they got it wrong can pay for another round."
          >
            <Prose>
              <Body>
                A challenge creates a dispute in the Kleros court the list chose
                when it was created. Lists on Ethereum and Gnosis use Court V1.
                Since mid-2026 Gnosis also has a dedicated Curation court with
                hidden voting: jurors commit a sealed vote and reveal it later,
                so nobody sees the other votes before deciding.
              </Body>
            </Prose>
            <StepList
              steps={[
                {
                  title: 'Evidence',
                  body: 'Both parties, and anyone else, can submit evidence. Files live on IPFS and their references are recorded on chain.',
                },
                {
                  title: 'Jurors are drawn',
                  body: 'At random among the people who staked PNK in the court, weighted by stake. Part of each juror’s stake is locked while they rule.',
                },
                {
                  title: 'Voting',
                  body: 'Jurors answer the list’s question, for a submission whether the entry complies with the required criteria, using the evidence, the list’s policy and then the court’s own policy. In hidden-vote courts they commit first and reveal with a justification. The option with the most votes wins.',
                },
                {
                  title: 'Appeal period',
                  body: 'Anyone can fund an appeal. The losing side must be fully funded in the first half of the period; the winning side has the whole period. If only one side is fully funded, that side wins. If both are, a new round starts with twice as many jurors plus one.',
                },
                {
                  title: 'Execution',
                  body: 'When the appeal period ends with no funded appeal, the ruling is final. The registry applies it: the entry is registered, kept, rejected or removed, and the deposits are distributed.',
                },
              ]}
            />
            <Prose>
              <Body>
                Funding an appeal costs the next round’s arbitration cost plus a
                stake set by the list: one multiplier for the side the current
                ruling favours, another for the side it went against, and a
                shared one while there is no ruling yet. Several people can fund
                the same side together. The multipliers are list parameters and
                can change by governance.
              </Body>
            </Prose>
            <Note>
              An appeal funded on one side only hands that side the win, so the
              final ruling can differ from what the jurors voted. The app shows
              an open appeal with the time left for each side.
            </Note>
          </GuideSection>

          <GuideSection
            id="rewards"
            eyebrow="04 · Rewards"
            statement="Curators are paid from deposits: the winner takes the loser’s, and appeal funders share the other side’s funding."
          >
            <Prose>
              <Body>
                There is no reward pool. Everything a curator earns comes from
                the deposit of the party who was wrong.
              </Body>
            </Prose>
            <Outcomes>
              <Surface $padding="compact">
                <Stack $gap={6}>
                  <Title>If you submit</Title>
                  <Body $muted>
                    Unchallenged, your deposit returns in full when the request
                    is executed; the only cost is gas. Challenged and right, you
                    get your deposit back and receive the challenger’s minus the
                    arbitration fees. Challenged and wrong, your deposit goes to
                    the challenger.
                  </Body>
                </Stack>
              </Surface>
              <Surface $padding="compact">
                <Stack $gap={6}>
                  <Title>If you challenge</Title>
                  <Body $muted>
                    If the jurors agree with you, you receive the requester’s
                    deposit minus the arbitration fees, on top of your own
                    deposit back. If they do not, your deposit goes to the
                    requester. In Stake Curate a successful challenger earns the
                    entry’s whole stake, and a failed challenge adds the
                    challenger’s stake to the entry, which makes the next
                    challenge more expensive.
                  </Body>
                </Stack>
              </Surface>
              <Surface $padding="compact">
                <Stack $gap={6}>
                  <Title>If you fund an appeal</Title>
                  <Body $muted>
                    If both sides were fully funded and the side you backed
                    wins, your contribution comes back with a share of the
                    losing side’s funding, in proportion to what you put in. If
                    your side loses, it goes to the winning funders. If the
                    appeal never happens, you are refunded.
                  </Body>
                </Stack>
              </Surface>
            </Outcomes>
            <Body $muted>
              In Light and Classic Curate, winnings and appeal contributions are
              withdrawn from the registry once the ruling is final; open the
              entry to claim them. Jurors are paid from the arbitration fees,
              which is why every deposit includes them.
            </Body>
          </GuideSection>

          <GuideSection
            id="launching"
            eyebrow="05 · Launching a list"
            statement="A list is a policy, a schema and a few economic parameters, deployed as a contract you govern."
          >
            <Prose>
              <Body>
                Anyone can deploy a list. New lists are created on Light Curate,
                which the app calls Standard, or on Stake Curate. Classic Curate
                is deprecated: existing Classic lists keep working, but no new
                ones can be created.
              </Body>
            </Prose>
            <Surface $padding="standard" aria-label="What you decide">
              <PanelHeader>
                <PanelTitle>What you decide</PanelTitle>
              </PanelHeader>
              <KeyValueList>
                <dt>Policy</dt>
                <dd>
                  The document jurors rule against. Name the subject matter, the
                  conditions for each ruling option, the evidence expected, the
                  edge cases and the default ruling. A PDF is strongly
                  preferred.
                </dd>
                <dt>Fields</dt>
                <dd>
                  The entry schema: text, long text, link, address, rich
                  address, image, file, number or boolean. One to five fields
                  are identifiers; image, file and long text cannot be.
                </dd>
                <dt>Deposits</dt>
                <dd>
                  Four base deposits: submission, removal, challenging a
                  submission and challenging a removal. Higher deposits deter
                  spam and raise the bounty for challengers; lower ones invite
                  more submissions.
                </dd>
                <dt>Period</dt>
                <dd>
                  How long each request stays open to challenges. The Kleros
                  documentation suggests three to seven days on mainnet; a
                  shorter period lists faster and leaves less time to catch a
                  bad entry. The governor can change it later.
                </dd>
                <dt>Court</dt>
                <dd>
                  Which Kleros court hears disputes and how many jurors rule in
                  the first round. The court’s fee per juror times that number
                  is the arbitration cost every deposit includes.
                </dd>
                <dt>Governor</dt>
                <dd>
                  The address allowed to change deposits, the challenge period,
                  the arbitrator and the policy later.
                </dd>
              </KeyValueList>
            </Surface>
            <Body $muted>
              A Stake Curate list also sets the stake token and minimum stake,
              the challenger’s stake as a share of the entry’s, the withdrawal
              waiting period and the number of jurors.
            </Body>
            <Note>
              Deploying a list does not put it on the Curate home page. Submit
              it to the Kleros Verified list of lists, a Light Curate list with
              its own deposit and challenge period, and it appears once that
              request is executed.
            </Note>
            <Actions>
              <ButtonLink to={launchHref} $variant="primary">
                <CurateIcon name="factory" size={16} />
                Launch a list
              </ButtonLink>
            </Actions>
          </GuideSection>

          <GuideSection
            id="agents"
            eyebrow="06 · Agents and skills"
            statement="Agents get the same rules as people, in files they can read."
          >
            <Prose>
              <Body>
                If an agent drives Curate for you, give it the Curate skill and
                the agent context below. They tell it to read deposits,
                challenge periods, schemas and policies live from the chain and
                never to guess them, to copy a list’s schema verbatim, and to
                treat the policy as authoritative: the same rules a careful
                person follows.
              </Body>
            </Prose>
            <Prompt>
              <PromptText>{AGENT_PROMPT}</PromptText>
              <Button
                type="button"
                $variant="secondary"
                $size="sm"
                onClick={copyPrompt}
              >
                <CurateIcon name="copy" size={14} />
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
            </Prompt>
            <Surface $padding="none">
              <FileList>
                <FileRow href={SKILL_PATH} target="_blank" rel="noreferrer">
                  <FileCopy>
                    <Data>{SKILL_PATH}</Data>
                    <Small $muted>
                      The kleros-curate skill: reading a registry, building an
                      entry, computing deposits, challenging, appealing and
                      deploying.
                    </Small>
                  </FileCopy>
                  <CurateIcon name="external" size={16} />
                </FileRow>
                <FileRow
                  href="/curate-agent-context.md"
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileCopy>
                    <Data>/curate-agent-context.md</Data>
                    <Small $muted>
                      Short context: supported chains, the verified
                      list-of-lists addresses, required behaviour and routes.
                    </Small>
                  </FileCopy>
                  <CurateIcon name="external" size={16} />
                </FileRow>
                <FileRow href="/llms.txt" target="_blank" rel="noreferrer">
                  <FileCopy>
                    <Data>/llms.txt</Data>
                    <Small $muted>
                      The index an agent reads first: primary URLs, where the
                      skill lives and the non-negotiables.
                    </Small>
                  </FileCopy>
                  <CurateIcon name="external" size={16} />
                </FileRow>
                <FileRow href="/llms-full.txt" target="_blank" rel="noreferrer">
                  <FileCopy>
                    <Data>/llms-full.txt</Data>
                    <Small $muted>
                      The full agent context in one file; the prompt above
                      points here.
                    </Small>
                  </FileCopy>
                  <CurateIcon name="external" size={16} />
                </FileRow>
                <FileRow
                  href={DOCS.skillSource}
                  target="_blank"
                  rel="noreferrer"
                >
                  <FileCopy>
                    <Data>kleros/kleros-skills</Data>
                    <Small $muted>
                      Upstream source of the skill, maintained by Kleros.
                    </Small>
                  </FileCopy>
                  <CurateIcon name="external" size={16} />
                </FileRow>
              </FileList>
            </Surface>
          </GuideSection>

          <GuideSection
            id="glossary"
            eyebrow="Glossary"
            statement="The words used across the app."
          >
            <GlossaryList>
              {GLOSSARY.map((entry) => (
                <div key={entry.term}>
                  <dt>{entry.term}</dt>
                  <dd>{entry.definition}</dd>
                </div>
              ))}
            </GlossaryList>
          </GuideSection>

          <GuideSection
            id="sources"
            eyebrow="Sources"
            statement="Everything here follows the public Kleros documentation."
          >
            <Prose>
              <Body $muted>
                Deposits, periods, courts and multipliers are set per list and
                by governance, so this page describes mechanisms rather than
                numbers. The app reads the live values before every action.
              </Body>
            </Prose>
            <SourceList>
              <li>
                <External href={DOCS.curate}>Curate: how it works</External>
              </li>
              <li>
                <External href={DOCS.tutorial}>Curate tutorial</External>
              </li>
              <li>
                <External href={DOCS.stakeCurate}>Stake Curate</External>
              </li>
              <li>
                <External href={DOCS.lightCurate}>
                  Light Curate for developers
                </External>
              </li>
              <li>
                <External href={DOCS.howItWorks}>
                  How Kleros Court works
                </External>
              </li>
              <li>
                <External href={DOCS.appeals}>Appeals</External>
              </li>
              <li>
                <External href={DOCS.courts}>Courts and parameters</External>
              </li>
              <li>
                <External href={DOCS.policyGuide}>
                  Policy writing guide
                </External>
              </li>
              <li>
                <External href={DOCS.courtApp}>Kleros Court (cases)</External>
              </li>
            </SourceList>
            <Actions>
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
            <Small $faint>
              Looking for a specific entry or address? Use{' '}
              <Link to="/browse">Browse</Link> or open an address profile from
              any list.
            </Small>
          </GuideSection>
        </Article>
      </Layout>
    </Page>
  )
}

export default Guide
