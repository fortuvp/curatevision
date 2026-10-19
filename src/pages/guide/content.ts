import type { StatusTone } from 'components/curate/primitives'

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
    body: 'Check every criterion against what you are about to submit. Ambiguous cases are decided by jurors, not by the submitter.',
  },
  {
    title: 'Fill in the fields',
    body: 'Every list defines its own fields and which of them identify an entry. Identifiers are what search finds, so write them exactly.',
  },
  {
    title: 'Review the deposit and sign',
    body: 'The app reads the base deposit and the arbitration cost from the chain and shows the exact total, what comes back and what can be lost before you sign.',
  },
  {
    title: 'Wait for the challenge period to end',
    body: 'If nobody challenges, the request can be executed and your deposit returns in full. If someone does, the entry goes to court.',
  },
]

export const CHALLENGE_STEPS: GuideStep[] = [
  {
    title: 'Check the time left',
    body: 'Challenges close when the challenge period ends. The countdown is on the entry and in every list row.',
  },
  {
    title: 'Write the justification and attach evidence',
    body: 'Name the criterion the entry fails and show it. Evidence is public and stays with the case; anyone can add more during the dispute’s evidence period.',
  },
  {
    title: 'Send the challenge deposit',
    body: 'The list’s challenge base deposit plus the arbitration cost, shown in full before you sign. If the jurors side with the requester, it is lost.',
  },
  {
    title: 'Follow the case',
    body: 'Jurors are drawn and vote, and either side can appeal. When the ruling is final the entry is kept, rejected or removed, and the winner is paid.',
  },
]

export const DISPUTE_STEPS: GuideStep[] = [
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
    body: 'Jurors answer the list’s question from the evidence, the list’s policy and then the court’s own policy. In hidden-vote courts they commit first and reveal with a justification. The option with the most votes wins.',
  },
  {
    title: 'Appeal period',
    body: 'Anyone can fund either side, within the deadlines drawn below.',
  },
  {
    title: 'Execution',
    body: 'When the appeal period ends with no funded appeal, the ruling is final. The registry applies it and distributes the deposits.',
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
        result:
          'Your deposit returns in full when the request is executed; the only cost is gas.',
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
      'In Stake Curate a successful challenger earns the entry’s whole stake, and a failed challenge adds the challenger’s stake to the entry, which makes the next challenge more expensive.',
  },
  {
    role: 'If you fund an appeal',
    rows: [
      {
        kind: 'gain',
        when: 'Both sides funded, your side wins',
        result:
          'Your contribution back, plus a share of the losing side’s funding minus the arbitration cost of the new round, in proportion to what you put in.',
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

export const LEGEND: {
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
      { tone: 'registered', label: 'Registered', meaning: 'On the list.' },
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

export const DECISIONS: { term: string; definition: string }[] = [
  {
    term: 'Policy',
    definition:
      'The document jurors rule against: the subject matter, the conditions for each ruling, the evidence expected, the edge cases and the default ruling. A PDF is strongly preferred.',
  },
  {
    term: 'Fields',
    definition:
      'The entry schema: text, long text, link, address, rich address, image, file, number or boolean. One to five fields are identifiers; image, file and long text cannot be.',
  },
  {
    term: 'Deposits',
    definition:
      'Four base deposits: submission, removal, challenging a submission and challenging a removal. Higher ones deter spam and raise the bounty for challengers; lower ones invite more submissions.',
  },
  {
    term: 'Challenge period',
    definition:
      'How long each request stays open to challenges. The Kleros documentation suggests three to seven days on mainnet; shorter lists faster and leaves less time to catch a bad entry.',
  },
  {
    term: 'Court',
    definition:
      'Which Kleros court hears disputes and how many jurors rule in the first round. Its fee per juror times that number is the arbitration cost in every deposit.',
  },
  {
    term: 'Governor',
    definition:
      'The address allowed to change the deposits, the challenge period, the arbitrator and the policy later.',
  },
]

export const AGENT_FILES: { href: string; name: string; about: string }[] = [
  {
    href: SKILL_PATH,
    name: SKILL_PATH,
    about:
      'The kleros-curate skill: reading a registry, building an entry, computing deposits, challenging, appealing and deploying.',
  },
  {
    href: '/curate-agent-context.md',
    name: '/curate-agent-context.md',
    about:
      'Short context: supported chains, the verified list-of-lists addresses, required behaviour and routes.',
  },
  {
    href: '/llms.txt',
    name: '/llms.txt',
    about:
      'The index an agent reads first: primary URLs, where the skill lives and the non-negotiables.',
  },
  {
    href: '/llms-full.txt',
    name: '/llms-full.txt',
    about: 'The full agent context in one file; the prompt above points here.',
  },
  {
    href: DOCS.skillSource,
    name: 'kleros/kleros-skills',
    about: 'Upstream source of the skill, maintained by Kleros.',
  },
]

export const GLOSSARY: { term: string; definition: string }[] = [
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
    term: 'Deposit',
    definition:
      'What a requester or a challenger locks: a base deposit set by the list plus the arbitration cost, which pays the jurors if there is a dispute. It comes back in full when unchallenged; after a dispute the winner receives both deposits minus the arbitration cost.',
  },
  {
    term: 'Court',
    definition:
      'A pool of jurors who staked PNK, with its own policy and parameters. Curate lists on Ethereum and Gnosis use Court V1; Gnosis also has a Curation court with hidden voting.',
  },
  {
    term: 'Appeal',
    definition:
      'A new round with twice as many jurors plus one, started when both sides are fully funded during the appeal period. If only one side is funded, that side wins.',
  },
  {
    term: 'Policy',
    definition:
      'The document that says what belongs on the list. Jurors decide from the evidence, this policy and then the court’s own policy, in that order.',
  },
  {
    term: 'Light Curate',
    definition:
      'The default kind of list; the app calls it Standard. Only an IPFS reference to each entry is stored on chain, which keeps costs low. Deposits are paid in the chain’s native currency.',
  },
  {
    term: 'Classic Curate',
    definition:
      'The original kind of list, which stores entry data on chain. It is deprecated: existing Classic lists keep working, but no new ones can be created.',
  },
  {
    term: 'Stake Curate',
    definition:
      'A list where the entry’s stake, in an ERC20 token, stays locked for as long as the entry is listed, so it can be challenged at any time, including during the withdrawal waiting period.',
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
