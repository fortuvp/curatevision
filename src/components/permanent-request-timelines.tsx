import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import useNow from 'hooks/use-now'
import useUrlChainId from 'hooks/use-url-chain-id'
import EvidenceFileLink from 'components/evidence-file-link'
import { AddressLink } from 'components/curate/item-stake-address'
import { CONTRACT_STATUS, SUBGRAPH_RULING } from 'utils/permanent-item-status'
import { capitalizeFirstLetter } from 'utils/string'
import { getTxPage } from 'utils/network-utils'
import { parseIpfs } from 'utils/ipfs-parse'
import { formatAbsolute, formatAgo, formatDate } from 'utils/time'
import PermanentEvidenceModal from 'pages/permanent-item-details/modals/evidence'
import toOrdinal from 'utils/ordinal'
import {
  Body,
  Button,
  Data,
  Label,
  PanelHeader,
  PanelTitle,
  SkeletonBlock,
  Small,
  Stack,
  StatusDot,
  Surface,
  Title,
  type StatusTone,
} from 'components/curate/primitives'

/*
 * History of a Stake Curate item: one timeline per submission, newest first,
 * with every event the subgraph recorded (submission, challenge, rulings,
 * appeals, evidence, withdrawal) in order, each written both ways in time
 * and linked to its transaction. Evidence is part of the same thread, and
 * the composer to add more sits right below.
 */

/**
 * Round fields beyond the shared SubgraphRound. The permanent item query does
 * not currently select the appeal transaction hashes, so they stay optional.
 */
interface TimelineRound extends SubgraphRound {
  txHashAppealPossible?: string | null
  appealedAt?: string | null
  txHashAppealDecision?: string | null
}

/** Challenge fields the permanent item query selects. */
interface TimelineChallenge extends SubgraphChallenge {
  createdAt?: string | null
  creationTx?: string | null
  resolutionTime?: string | null
  resolutionTx?: string | null
  disputeOutcome?: string | null
  rounds: TimelineRound[]
}

/** Evidence as selected by the permanent item query. */
interface TimelineEvidence {
  party: string
  URI: string
  number?: string
  timestamp: string
  txHash: string
  metadata?: {
    name?: string | null
    title?: string | null
    description?: string | null
    fileURI?: string | null
    fileTypeExtension?: string | null
  } | null
}

/** A submission row of a permanent item. */
interface TimelineSubmission extends SubgraphItem {
  createdAt?: string | null
  creationTx?: string | null
  finishedAt?: string | null
  finishedTx?: string | null
  withdrawingTx?: string | null
}

/** A permanent item with the nested rows the timeline reads. */
interface PermanentTimelineItem extends SubgraphItem {
  challenges?: TimelineChallenge[]
  evidences?: TimelineEvidence[]
  submissions?: TimelineSubmission[]
}

interface TimelineLogBase {
  timestamp?: string | null
  transactionHash?: string | null
}

interface AppealPossibleLog extends TimelineLogBase {
  name: 'AppealPossible'
  appealableRuling: string
}

interface AppealDecisionLog extends TimelineLogBase {
  name: 'AppealDecision'
}

interface EvidenceLog extends TimelineLogBase {
  name: 'Evidence'
  title?: string | null
  description?: string | null
  URI: string
  fileURI?: string | null
  fileTypeExtension?: string | null
  party: string
}

interface ResolutionLog extends TimelineLogBase {
  name: 'Resolution'
  disputeOutcome?: string | null
  lastRoundRuling?: string | null
}

interface ChallengeLog extends TimelineLogBase {
  name: 'Challenge'
}

interface WithdrawalLog extends TimelineLogBase {
  name: 'Withdrawal'
}

interface WithdrawalCompletedLog extends TimelineLogBase {
  name: 'WithdrawalCompleted'
}

type TimelineLog =
  | AppealPossibleLog
  | AppealDecisionLog
  | EvidenceLog
  | ResolutionLog
  | ChallengeLog
  | WithdrawalLog
  | WithdrawalCompletedLog

interface EvidenceFile {
  title?: string | null
  description?: string | null
  fileURI?: string | null
  fileTypeExtension?: string | null
}

/* ---------- Timeline chrome ---------- */

const Events = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Event = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 16px;

  &::before {
    content: '';
    position: absolute;
    top: 16px;
    bottom: 0;
    left: 3px;
    width: 2px;
    background: var(--color-border);
  }

  &:last-child {
    padding-bottom: 0;
  }

  &:last-child::before {
    display: none;
  }
`

const Dot = styled(StatusDot)`
  margin-top: 6px;
`

const EventCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const When = styled.a`
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-variant-numeric: tabular-nums;
  text-decoration: none;

  &:hover {
    color: var(--color-text);
    text-decoration: underline;
  }
`

const EvidenceText = styled(Body)`
  white-space: pre-line;
`

const EvidenceFoot = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
`

const Group = styled.details`
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);

  summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    cursor: pointer;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  &[open] summary {
    border-bottom: 1px solid var(--color-border);
  }
`

const GroupBody = styled.div`
  padding: 16px;
`

const EventTime = ({
  timestamp,
  transactionHash,
  now,
}: {
  timestamp?: string | null
  transactionHash?: string | null
  now: number
}) => {
  const networkId = useUrlChainId()
  const seconds = Number(timestamp ?? 0)
  if (!seconds) return null
  const text = `${formatAgo(seconds, now)} · ${formatAbsolute(seconds)}`
  if (!transactionHash)
    return (
      <Small $muted title={formatAbsolute(seconds)}>
        {text}
      </Small>
    )
  return (
    <When
      href={getTxPage({ networkId: networkId ?? 0, txHash: transactionHash })}
      target="_blank"
      rel="noopener noreferrer"
      title={`${formatAbsolute(seconds)} · open the transaction`}
    >
      {text}
    </When>
  )
}

const rulingLine = (ruling: string | null | undefined): string => {
  switch (ruling) {
    case SUBGRAPH_RULING.NONE:
      return 'The arbitrator refused to rule'
    case SUBGRAPH_RULING.ACCEPT:
      return 'The arbitrator ruled for the submitter'
    case SUBGRAPH_RULING.REJECT:
      return 'The arbitrator ruled for the challenger'
    default:
      return 'The arbitrator gave an unknown ruling'
  }
}

interface TimelineProps {
  submission: TimelineSubmission
  item: PermanentTimelineItem
  metaEvidence?: MetaEvidence
  now: number
}

const Timeline = ({ submission, item, metaEvidence, now }: TimelineProps) => {
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile>>()
  // This submission has a range (createdAt, finishedAt). Take every event of
  // the item, keep the ones inside the range, then sort them.

  const logs = useMemo(() => {
    if (!submission) return null

    const challengeRows = item.challenges ?? []
    const allRounds = challengeRows.flatMap((c) => c.rounds)

    const appealPossibles = allRounds
      .map(
        (r): AppealPossibleLog => ({
          name: 'AppealPossible',
          timestamp: r.appealPeriodStart,
          transactionHash: r.txHashAppealPossible,
          appealableRuling: r.ruling,
        }),
      )
      .filter((appeal) => !!appeal.transactionHash)

    const appealDecisions = allRounds
      .map(
        (r): AppealDecisionLog => ({
          name: 'AppealDecision',
          timestamp: r.appealedAt,
          transactionHash: r.txHashAppealDecision,
        }),
      )
      .filter((appeal) => !!appeal.transactionHash)

    const evidences = (item.evidences ?? []).map(
      (e): EvidenceLog => ({
        name: 'Evidence',
        timestamp: e.timestamp,
        transactionHash: e.txHash,
        title: e.metadata?.title,
        description: e.metadata?.description,
        URI: e.URI,
        fileURI: e.metadata?.fileURI,
        fileTypeExtension: e.metadata?.fileTypeExtension,
        party: e.party,
      }),
    )

    const resolutions = challengeRows.map(
      (e): ResolutionLog => ({
        name: 'Resolution',
        timestamp: e.resolutionTime,
        transactionHash: e.resolutionTx,
        disputeOutcome: e.disputeOutcome,
        lastRoundRuling: e.rounds[0]?.ruling,
      }),
    )

    const challenges = challengeRows.map(
      (e): ChallengeLog => ({
        name: 'Challenge',
        timestamp: e.createdAt,
        transactionHash: e.creationTx,
      }),
    )

    const logArray: TimelineLog[] = [
      ...appealPossibles,
      ...appealDecisions,
      ...evidences,
      ...resolutions,
      ...challenges,
    ]

    const withdrawal: WithdrawalLog | null =
      Number(submission.withdrawingTimestamp) !== 0
        ? {
            name: 'Withdrawal',
            timestamp: submission.withdrawingTimestamp,
            transactionHash: submission.withdrawingTx,
          }
        : null

    if (withdrawal) logArray.push(withdrawal)

    // The only paths to Absent are withdrawItem() and rule(). Dispute removals are
    // already rendered as Resolution nodes (whose tx equals the ruling tx), so a
    // finishedTx that is NOT any resolution tx can only be a completed voluntary
    // withdrawal (the withdrawItem() execution).
    const resolutionTxs = new Set(
      challengeRows.map((c) => c.resolutionTx).filter((tx) => !!tx),
    )

    const withdrawalCompleted: WithdrawalCompletedLog | null =
      submission.finishedTx && !resolutionTxs.has(submission.finishedTx)
        ? {
            name: 'WithdrawalCompleted',
            timestamp: submission.finishedAt,
            transactionHash: submission.finishedTx,
          }
        : null

    if (withdrawalCompleted) logArray.push(withdrawalCompleted)

    return logArray
      .filter(
        (log) =>
          Number(submission.createdAt) <= Number(log.timestamp) &&
          (submission.finishedAt === null ||
            Number(submission.finishedAt) >= Number(log.timestamp)),
      )
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [item, submission])

  // The Graph can fail to index the evidence fields. Load unloaded fields manually.
  useEffect(() => {
    if (!logs || evidenceMap) return
    const evidenceManualFetch = async () => {
      const unindexedEvidenceURIs = logs
        .filter((e): e is EvidenceLog => e.name === 'Evidence')
        .filter(
          (e) =>
            e.title === null &&
            e.description === null &&
            e.fileURI === null &&
            e.fileTypeExtension === null,
        )
        .map((e) => e.URI)

      const evidenceJSONs = await Promise.all(
        unindexedEvidenceURIs.map(async (uri) => {
          const file = await (await fetch(parseIpfs(uri))).json()
          return file
        }),
      )
      const evidenceMapProcess: Record<string, EvidenceFile> = {}
      unindexedEvidenceURIs.forEach((uri, index) => {
        evidenceMapProcess[uri] = evidenceJSONs[index]
      })
      setEvidenceMap(evidenceMapProcess)
    }
    evidenceManualFetch()
  }, [logs, evidenceMap, setEvidenceMap])

  if (!item || !submission || !logs)
    return (
      <Stack $gap={10} aria-busy="true">
        <SkeletonBlock $height="18px" $width="50%" />
        <SkeletonBlock $height="18px" $width="70%" />
      </Stack>
    )

  const metadata = metaEvidence?.metadata
  const itemName = metadata?.itemName
    ? capitalizeFirstLetter(metadata.itemName)
    : 'Item'

  const plain = (
    key: React.Key,
    tone: StatusTone,
    text: React.ReactNode,
    timestamp?: string | null,
    transactionHash?: string | null,
  ) => (
    <Event key={key}>
      <Dot $tone={tone} aria-hidden />
      <EventCopy>
        <Body>{text}</Body>
        <EventTime
          timestamp={timestamp}
          transactionHash={transactionHash}
          now={now}
        />
      </EventCopy>
    </Event>
  )

  const submittedNode = plain(
    'submitted',
    'window',
    `${itemName} submitted`,
    submission.createdAt,
    submission.creationTx,
  )

  // `logs` is already ordered by timestamp.
  const items = logs.map((event, i) => {
    const { name, transactionHash, timestamp } = event

    if (event.name === 'Evidence') {
      const { party } = event
      const { title, description, fileURI } = evidenceMap?.[event.URI]
        ? evidenceMap[event.URI]
        : event
      return (
        <Event key={i}>
          <Dot $tone="neutral" aria-hidden />
          <Surface $padding="compact">
            <Stack $gap={8}>
              <Label>Evidence</Label>
              {title && <Title as="h4">{title}</Title>}
              {description && <EvidenceText>{description}</EvidenceText>}
              <EvidenceFoot>
                <Small $muted>
                  by <AddressLink address={party} />
                </Small>
                {fileURI && <EvidenceFileLink fileURI={fileURI} />}
              </EvidenceFoot>
              <EventTime
                timestamp={timestamp}
                transactionHash={transactionHash}
                now={now}
              />
            </Stack>
          </Surface>
        </Event>
      )
    } else if (name === 'AppealPossible')
      return plain(
        i,
        'contested',
        rulingLine(event.appealableRuling),
        timestamp,
        transactionHash,
      )
    else if (name === 'AppealDecision')
      return plain(
        i,
        'contested',
        'Ruling appealed',
        timestamp,
        transactionHash,
      )
    else if (name === 'Resolution') {
      let resultMessage: string
      let tone: StatusTone
      switch (event.disputeOutcome) {
        case 'None': {
          resultMessage = `${itemName} withdrawn: the arbitrator refused to rule`
          tone = 'off'
          break
        }
        case 'Accept': {
          resultMessage = `${itemName} kept: the jurors ruled for the submitter`
          tone = 'registered'
          break
        }
        case 'Reject': {
          resultMessage = `${itemName} removed: the jurors ruled for the challenger`
          tone = 'off'
          break
        }
        default:
          throw new Error('Unhandled ruling')
      }
      const differentAppealableRuling =
        event.lastRoundRuling !== event.disputeOutcome

      return plain(
        i,
        tone,
        <>
          {differentAppealableRuling &&
            'The winner of the last round did not fund the appeal. '}
          {resultMessage}
        </>,
        timestamp,
        transactionHash,
      )
    } else if (name === 'Challenge')
      return plain(
        i,
        'contested',
        `${itemName} challenged`,
        timestamp,
        transactionHash,
      )
    else if (name === 'Withdrawal')
      return plain(
        i,
        'neutral',
        'Withdrawal started by the submitter',
        timestamp,
        transactionHash,
      )
    else if (name === 'WithdrawalCompleted')
      return plain(
        i,
        'off',
        `${itemName} withdrawn`,
        timestamp,
        transactionHash,
      )
    else throw new Error(`Unhandled event ${name}`)
  })

  return <Events>{[submittedNode, ...items]}</Events>
}

const EVIDENCE_COMPOSER_ID = 'evidence-composer'

const scrollToEvidenceComposer = () => {
  const composer = document.querySelector(`#${EVIDENCE_COMPOSER_ID}`)
  composer?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.setTimeout(() => {
    const input = composer?.querySelector('textarea, input') as
      | HTMLElement
      | undefined
    input?.focus()
  }, 260)
}

interface RequestTimelinesProps {
  item?: PermanentTimelineItem
  metaEvidence?: MetaEvidence
}

const RequestTimelines = ({ item, metaEvidence }: RequestTimelinesProps) => {
  const now = useNow(60_000)
  const { metadata } = metaEvidence || {}
  const { itemName } = metadata || {}
  const { submissions } = item || {}
  const name = capitalizeFirstLetter(itemName ?? '') || 'Item'

  if (!item)
    return (
      <Surface
        $padding="standard"
        id="request-timelines"
        aria-busy="true"
        aria-label="Loading history"
      >
        <Stack $gap={10}>
          <SkeletonBlock $height="20px" $width="30%" />
          <SkeletonBlock $height="18px" $width="60%" />
          <SkeletonBlock $height="18px" $width="45%" />
        </Stack>
      </Surface>
    )

  const active = item.status !== CONTRACT_STATUS.ABSENT

  return (
    <Stack $gap={16} id="request-timelines" as="section" aria-label="History">
      <Surface $padding="standard">
        <PanelHeader>
          <PanelTitle>{name} history</PanelTitle>
          {active && (
            <Button
              type="button"
              $variant="secondary"
              $size="sm"
              onClick={scrollToEvidenceComposer}
            >
              Add evidence
            </Button>
          )}
        </PanelHeader>
        {submissions && submissions.length === 1 && (
          <Timeline
            item={item}
            submission={{ ...submissions[0] }}
            metaEvidence={metaEvidence}
            now={now}
          />
        )}
        {submissions && submissions.length > 1 && (
          <Stack $gap={12}>
            {submissions.map((submission, i) => (
              <Group key={submission.id ?? i} open={i === 0}>
                <summary>
                  <Label $tone="text">
                    {toOrdinal(submissions.length - i)} submission
                  </Label>
                  <Data $muted $weight={400}>
                    {formatDate(Number(submission.createdAt ?? 0))}
                    {submission.finishedAt
                      ? ` – ${formatDate(Number(submission.finishedAt))}`
                      : ' – now'}
                  </Data>
                </summary>
                <GroupBody>
                  {/* Spread `submission` to convert it from an array row to an object. */}
                  <Timeline
                    item={item}
                    submission={{ ...submission }}
                    metaEvidence={metaEvidence}
                    now={now}
                  />
                </GroupBody>
              </Group>
            ))}
          </Stack>
        )}
      </Surface>
      {active && (
        <PermanentEvidenceModal
          item={item}
          inline
          composerId={EVIDENCE_COMPOSER_ID}
        />
      )}
    </Stack>
  )
}

export default RequestTimelines
