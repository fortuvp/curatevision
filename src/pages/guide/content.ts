import type { StatusTone } from 'components/curate/primitives'
import { STATUS_CODE as LIGHT_STATUS } from 'utils/item-status'
import { STATUS_CODE as STAKE_STATUS } from 'utils/permanent-item-status'

/*
 * The guide's words, kept apart from its layout. Every mechanism here follows
 * the public Kleros documentation (linked in SOURCES). Figures are avoided on
 * purpose: deposits, periods and multipliers are set per list and change by
 * governance, so the app reads them live before every action.
 */

export const CONTEXT_URL = 'https://curate.kleros.io/llms-full.txt'
export const SKILL_PATH = '/skills/kleros-curate/SKILL.md'
export const AGENT_PROMPT = `Read ${CONTEXT_URL} and follow it before interacting with Kleros Curate.`

export const DOCS = {
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

export interface GuideSectionLink {
  id: string
  label: string
}

export const SECTIONS: GuideSectionLink[] = [
  { id: 'lifecycle', label: 'The lifecycle' },
  { id: 'statuses', label: 'Statuses' },
  { id: 'submitting', label: 'Submitting' },
  { id: 'challenging', label: 'Challenging' },
  { id: 'disputes', label: 'Disputes and appeals' },
  { id: 'rewards', label: 'Rewards' },
  { id: 'launching', label: 'Launching a list' },
  { id: 'agents', label: 'Agents and skills' },
  { id: 'glossary', label: 'Glossary' },
  { id: 'sources', label: 'Sources' },
]

export const sectionNumber = (id: string): string =>
  String(SECTIONS.findIndex((section) => section.id === id) + 1).padStart(
    2,
    '0',
  )

export interface GuideStep {
  title: string
  body: string
}

export const SUBMIT_STEPS: GuideStep[] = [
  {
    title: 'Open the registry and read its policy',
    body: 'Check your entry against every criterion; jurors decide the unclear cases.',
  },
  {
    title: 'Fill in the fields',
    body: 'Each list sets its own fields. Identifier fields are what search finds, so write them exactly.',
  },
  {
    title: 'Review the deposit and sign',
    body: 'The exact total is shown before you sign.',
  },
  {
    title: 'Wait for the challenge period to end',
    body: 'Unchallenged, the request can be executed and your deposit returns in full; challenged, it goes to court.',
  },
]

export const CHALLENGE_STEPS: GuideStep[] = [
  {
    title: 'Check the time left',
    body: 'The countdown is on the entry and in every list row.',
  },
  {
    title: 'Write the justification and attach evidence',
    body: 'Name the criterion the entry fails and show it. Evidence is public.',
  },
  {
    title: 'Send the challenge deposit',
    body: 'Challenge base deposit plus arbitration cost, shown before you sign; lost if the jurors side with the requester.',
  },
  {
    title: 'Follow the case',
    body: 'Once the ruling is final the entry is kept, rejected or removed, and the winner is paid.',
  },
]

export const DISPUTE_STEPS: GuideStep[] = [
  {
    title: 'Evidence',
    body: 'Anyone can submit evidence; files live on IPFS, referenced on chain.',
  },
  {
    title: 'Jurors are drawn',
    body: 'At random among the court’s PNK stakers, weighted by stake.',
  },
  {
    title: 'Voting',
    body: 'Jurors rule from the evidence and the list’s policy, then the court’s. In hidden-vote courts they commit, then reveal. The majority wins.',
  },
  {
    title: 'Appeal period',
    body: 'Anyone can fund either side.',
  },
  {
    title: 'Execution',
    body: 'With no funded appeal the ruling is final; the registry applies it and pays out the deposits.',
  },
]

export const COSTS: { action: string; base: string }[] = [
  { action: 'Submit an entry', base: 'submission base deposit' },
  { action: 'Request a removal', base: 'removal base deposit' },
  {
    action: 'Challenge a submission',
    base: 'submission challenge base deposit',
  },
  { action: 'Challenge a removal', base: 'removal challenge base deposit' },
]

export type OutcomeKind = 'gain' | 'loss' | 'back'

export const OUTCOMES: {
  role: string
  rows: { kind: OutcomeKind; when: string; result: string }[]
  footnote?: string
}[] = [
  {
    role: 'If you submit',
    rows: [
      {
        kind: 'back',
        when: 'Unchallenged',
        result: 'Your deposit returns in full; you pay only gas.',
      },
      {
        kind: 'gain',
        when: 'Challenged, jurors side with you',
        result:
          'Your deposit back, plus the challenger’s minus the arbitration fees.',
      },
      {
        kind: 'loss',
        when: 'Challenged, jurors side against you',
        result:
          'Your deposit goes to the challenger, minus the arbitration cost paid to jurors.',
      },
    ],
  },
  {
    role: 'If you challenge',
    rows: [
      {
        kind: 'gain',
        when: 'Jurors side with you',
        result:
          'Your deposit back, plus the requester’s minus the arbitration fees.',
      },
      {
        kind: 'loss',
        when: 'Jurors side against you',
        result:
          'Your deposit goes to the requester, minus the arbitration cost paid to jurors.',
      },
    ],
    footnote:
      'In Stake Curate a winning challenger takes the entry’s stake; a losing one adds theirs to it.',
  },
  {
    role: 'If you fund an appeal',
    rows: [
      {
        kind: 'gain',
        when: 'Both sides funded, your side wins',
        result:
          'Your contribution back, plus your share of the losing side’s funding after the new round’s cost.',
      },
      {
        kind: 'loss',
        when: 'Both sides funded, your side loses',
        result:
          'Your contribution pays the new round’s jurors and the rest goes to the winning funders.',
      },
      {
        kind: 'back',
        when: 'The appeal never happens',
        result: 'You are refunded.',
      },
    ],
  },
]

export interface LegendItem {
  tone: StatusTone
  label: string
  detail?: string
  meaning: string
  /** The status codes this row stands for (utils/item-status and
   * utils/permanent-item-status), so a new code cannot go unexplained. */
  codes: number[]
}

const APPEAL_OPEN = 'Jurors have voted; either side can fund an appeal.'
const WINNER_FUNDING = 'The loser funded; the winner has until the period ends.'

/* Labels and details as the app writes them (components/curate/entry-status). */
export const LEGEND: { group: string; items: LegendItem[] }[] = [
  {
    group: 'Light and Classic Curate',
    items: [
      {
        tone: 'window',
        label: 'Submitted',
        detail: 'time left to challenge',
        meaning: 'A new entry inside its challenge period.',
        codes: [LIGHT_STATUS.SUBMITTED],
      },
      {
        tone: 'window',
        label: 'Removal requested',
        detail: 'time left to challenge',
        meaning: 'Still listed until the removal is executed.',
        codes: [LIGHT_STATUS.REMOVAL_REQUESTED],
      },
      {
        tone: 'neutral',
        label: 'Ready to execute',
        detail: 'unchallenged submission / removal',
        meaning: 'Nobody challenged; anyone can execute the request.',
        codes: [LIGHT_STATUS.PENDING_SUBMISSION, LIGHT_STATUS.PENDING_REMOVAL],
      },
      {
        tone: 'contested',
        label: 'Challenged',
        detail: 'jurors deciding',
        meaning: 'A dispute is open in Kleros Court.',
        codes: [LIGHT_STATUS.CHALLENGED],
      },
      {
        tone: 'contested',
        label: 'Appeal open',
        detail: 'time left to fund',
        meaning: APPEAL_OPEN,
        codes: [LIGHT_STATUS.CROWDFUNDING],
      },
      {
        tone: 'contested',
        label: 'Appeal · winner funding',
        detail: 'time left',
        meaning: WINNER_FUNDING,
        codes: [LIGHT_STATUS.CROWDFUNDING_WINNER],
      },
      {
        tone: 'contested',
        label: 'Awaiting ruling',
        detail: 'appeal period over',
        meaning: 'No new round was funded; the final ruling is pending.',
        codes: [LIGHT_STATUS.WAITING_ARBITRATOR],
      },
      {
        tone: 'contested',
        label: 'Ruling final',
        detail: 'awaiting enforcement',
        meaning: 'The loser did not fund in time; the ruling stands.',
        codes: [LIGHT_STATUS.WAITING_ENFORCEMENT],
      },
      {
        tone: 'registered',
        label: 'Registered',
        meaning: 'On the list.',
        codes: [LIGHT_STATUS.REGISTERED],
      },
      {
        tone: 'off',
        label: 'Rejected',
        meaning: 'A submission that lost its dispute.',
        codes: [LIGHT_STATUS.REJECTED],
      },
      {
        tone: 'off',
        label: 'Removed',
        meaning: 'A removal that was executed or won its dispute.',
        codes: [LIGHT_STATUS.REMOVED],
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
        codes: [STAKE_STATUS.PENDING],
      },
      {
        tone: 'registered',
        label: 'Accepted',
        meaning:
          'Listed with its stake locked; open to challenge, even while “withdrawing”.',
        codes: [STAKE_STATUS.ACCEPTED],
      },
      {
        tone: 'contested',
        label: 'Disputed',
        detail: 'jurors deciding',
        meaning: 'A challenge is in court.',
        codes: [STAKE_STATUS.DISPUTED],
      },
      {
        tone: 'contested',
        label: 'Appeal open',
        detail: 'time left to fund',
        meaning: APPEAL_OPEN,
        codes: [STAKE_STATUS.CROWDFUNDING],
      },
      {
        tone: 'contested',
        label: 'Appeal · winner funding',
        detail: 'time left',
        meaning: WINNER_FUNDING,
        codes: [STAKE_STATUS.CROWDFUNDING_WINNER],
      },
      {
        tone: 'contested',
        label: 'Awaiting ruling',
        detail: 'appeal period over / loser did not fund',
        meaning: 'No new round was funded; the final ruling is pending.',
        codes: [STAKE_STATUS.WAITING_ARBITRATOR],
      },
      {
        tone: 'neutral',
        label: 'Withdrawal ready',
        detail: 'can be executed',
        meaning: 'The waiting period is over; the stake can be withdrawn.',
        codes: [STAKE_STATUS.PENDING_WITHDRAWAL],
      },
      {
        tone: 'off',
        label: 'Rejected',
        meaning: 'A pending entry that lost its dispute.',
        codes: [STAKE_STATUS.REJECTED],
      },
      {
        tone: 'off',
        label: 'Removed',
        meaning: 'An accepted entry that lost a challenge.',
        codes: [STAKE_STATUS.REMOVED],
      },
      {
        tone: 'off',
        label: 'Withdrawn',
        meaning: 'The owner took the stake back; the entry left the list.',
        codes: [STAKE_STATUS.WITHDRAWN],
      },
    ],
  },
]

// A status code added to the app without a legend row shows up in development.
if (import.meta.env.DEV)
  [LIGHT_STATUS, STAKE_STATUS].forEach((codes, index) => {
    const covered = new Set(LEGEND[index].items.flatMap((item) => item.codes))
    const missing = Object.values(codes).filter((code) => !covered.has(code))
    if (missing.length > 0)
      console.warn(
        `Guide legend "${LEGEND[index].group}" has no row for status codes ${missing.join(', ')}`,
      )
  })

export const DECISIONS: { term: string; definition: string }[] = [
  {
    term: 'Policy',
    definition:
      'What jurors rule against: what belongs, the evidence expected, edge cases and the default ruling. A PDF is preferred.',
  },
  {
    term: 'Fields',
    definition:
      'The entry schema. One to five fields identify an entry; image, file and long text cannot.',
  },
  {
    term: 'Deposits',
    definition:
      'Submission, removal and the two challenge deposits. Higher ones deter spam and raise the bounty; lower ones invite submissions.',
  },
  {
    term: 'Challenge period',
    definition:
      'How long requests stay open to challenge; the docs suggest three to seven days on mainnet. A shorter period lists entries sooner but leaves less time to catch a bad entry.',
  },
  {
    term: 'Court',
    definition:
      'Which court hears disputes and how many jurors rule first; fee per juror times jurors is the arbitration cost.',
  },
  {
    term: 'Governor',
    definition:
      'The address that can later change deposits, the period, the arbitrator and the policy.',
  },
]

export const AGENT_FILES: { href: string; name: string; about: string }[] = [
  {
    href: SKILL_PATH,
    name: SKILL_PATH,
    about:
      'The skill: read a registry, build an entry, compute deposits, challenge, appeal, deploy.',
  },
  {
    href: '/curate-agent-context.md',
    name: '/curate-agent-context.md',
    about: 'Chains, verified list-of-lists addresses, rules and routes.',
  },
  {
    href: '/llms.txt',
    name: '/llms.txt',
    about: 'The index an agent reads first.',
  },
  {
    href: '/llms-full.txt',
    name: '/llms-full.txt',
    about: 'The full agent context in one file.',
  },
  {
    href: DOCS.skillSource,
    name: 'kleros/kleros-skills',
    about: 'Upstream source, maintained by Kleros.',
  },
]

export const GLOSSARY: {
  term: string
  definition: string
  /** Sections that say more, linked by number. */
  see?: string[]
}[] = [
  {
    term: 'Registry',
    definition:
      'A list kept by a smart contract, also called a TCR (token-curated registry). Its policy, fields and names live in its MetaEvidence, on IPFS.',
  },
  {
    term: 'Entry',
    definition:
      'One item in a registry; each list names its own: a tag, a token.',
  },
  {
    term: 'Deposit',
    definition: 'A base deposit set by the list plus the arbitration cost.',
    see: ['lifecycle', 'submitting'],
  },
  {
    term: 'Court',
    definition:
      'A pool of PNK-staking jurors with its own policy. Curate uses Court V1 on Ethereum and Gnosis; Gnosis has a hidden-vote Curation court.',
  },
  {
    term: 'Appeal',
    definition: 'A new round with more jurors.',
    see: ['disputes'],
  },
  {
    term: 'Policy',
    definition:
      'What belongs on the list; jurors apply it before the court’s own policy.',
  },
  {
    term: 'Light Curate',
    definition:
      'The default kind, called Standard here. Only an IPFS reference is stored on chain, so costs stay low.',
  },
  {
    term: 'Classic Curate',
    definition:
      'The original kind of list, which stores entry data on chain. It is being deprecated: existing Classic lists keep working, and new lists use Light Curate.',
  },
  {
    term: 'Stake Curate',
    definition:
      'Each entry’s ERC20 stake stays locked while it is listed, so it can be challenged at any time.',
  },
]

export const SOURCES: { href: string; label: string }[] = [
  { href: DOCS.curate, label: 'Curate: how it works' },
  { href: DOCS.tutorial, label: 'Curate tutorial' },
  { href: DOCS.stakeCurate, label: 'Stake Curate' },
  { href: DOCS.lightCurate, label: 'Light Curate for developers' },
  { href: DOCS.howItWorks, label: 'How Kleros Court works' },
  { href: DOCS.appeals, label: 'Appeals' },
  { href: DOCS.courts, label: 'Courts and parameters' },
  { href: DOCS.policyGuide, label: 'Policy writing guide' },
  { href: DOCS.courtApp, label: 'Kleros Court (cases)' },
]
