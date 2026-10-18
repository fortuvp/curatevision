import React, { useMemo, useState, useEffect } from 'react'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import {
  Timeline as UITimeline,
  Card,
  Skeleton,
  Typography,
  Divider,
  Button,
  Collapse,
} from 'components/ui'
import Icon from 'components/ui/Icon'
import EvidenceFileLink from 'components/evidence-file-link'
import useUrlChainId from 'hooks/use-url-chain-id'
import ETHAddress from 'components/eth-address'
import { CONTRACT_STATUS, SUBGRAPH_RULING } from 'utils/permanent-item-status'
import { capitalizeFirstLetter } from 'utils/string'
import { getTxPage } from 'utils/network-utils'
import { parseIpfs } from 'utils/ipfs-parse'
import PermanentEvidenceModal from 'pages/permanent-item-details/modals/evidence'
import toOrdinal from 'utils/ordinal'

const StyledText = styled(Typography.Text)`
  text-transform: capitalize;
`

const StyledCard = styled(Card)`
  cursor: default;
  background: var(--v2-card) !important;
  border-color: var(--v2-stroke) !important;
  border-radius: var(--radius-sm) !important;
  box-shadow: var(--v2-shadow) !important;

  & > .ui-card-head {
    background: var(--v2-card) !important;
    border-color: var(--v2-stroke) !important;
    color: var(--v2-text) !important;
  }

  & > .ui-card-head .ui-card-head-title {
    color: var(--v2-text) !important;
  }

  & > .ui-card-head .ui-card-extra a {
    color: ${({ theme }) => theme.cardHeaderLinkColor} !important;

    &:hover {
      color: ${({ theme }) => theme.cardHeaderLinkHoverColor} !important;
    }
  }

  & > .ui-card-body {
    background: var(--v2-card) !important;
  }

  .ui-card-meta-description {
    color: ${({ theme }) => theme.textSecondary} !important;

    a {
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  ${smallScreenStyle(
    () => css`
      & > .ui-card-head > .ui-card-head-wrapper {
        flex-wrap: wrap;
      }
      & > .ui-card-head > .ui-card-head-wrapper > .ui-card-head-title {
        white-space: normal;
      }
    `,
  )}
`

const StyledEvidenceTitle = styled.div`
  white-space: pre-line;
  font-weight: 400;
  color: ${({ theme }) => theme.textPrimary};
`

const secondTimestamp = (timestamp: string | number | null | undefined) =>
  ` - ${new Date(new Date(Number(timestamp) * 1000)).toUTCString()}`

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

interface TimelineProps {
  submission: TimelineSubmission
  item: PermanentTimelineItem
  metaEvidence?: MetaEvidence
}

const Timeline = ({ submission, item, metaEvidence }: TimelineProps) => {
  const networkId = useUrlChainId()
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile>>()
  // this submission has a range associated createdAt finishedAt
  // take ALL data from the item
  // then filter out all data whose "inclusion" is not in the provided range.
  // there might be stuff to debug here once an item gets multiple submissions

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

    // purge then sort

    return logArray
      .filter(
        (log) =>
          Number(submission.createdAt) <= Number(log.timestamp) &&
          (submission.finishedAt === null ||
            Number(submission.finishedAt) >= Number(log.timestamp)),
      )
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [item, submission])

  // The Graph can fail to index the evidence fields. Load unloaded fields manually
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

  // Display loading indicator
  if (!item || !submission || !logs) return <Skeleton active />

  const metadata = metaEvidence?.metadata
  // Build nodes from request events.
  const itemName = metadata?.itemName
    ? capitalizeFirstLetter(metadata.itemName)
    : 'Item'

  const requestSubmittedNode = (
    <UITimeline.Item key={1337}>
      <span>
        <StyledText>{`${itemName} submitted`}</StyledText>
        <Typography.Text type="secondary">
          <a
            href={getTxPage({
              networkId: networkId ?? 0,
              txHash: submission.creationTx ?? '',
            })}
          >
            {secondTimestamp(submission.createdAt)}
          </a>
        </Typography.Text>
      </span>
    </UITimeline.Item>
  )

  // `logs` is already ordered by timestamp.
  const items = logs.map((event, i) => {
    const { name, transactionHash, timestamp } = event
    const txPage = getTxPage({
      networkId: networkId ?? 0,
      txHash: transactionHash ?? '',
    })

    if (event.name === 'Evidence') {
      const { party } = event
      const { title, description, fileURI } = evidenceMap?.[event.URI]
        ? evidenceMap[event.URI]
        : event
      /* eslint-disable unicorn/new-for-builtins */
      const submissionTime = (
        <span>
          <a href={txPage} target="_blank" rel="noopener noreferrer">
            Submitted{secondTimestamp(timestamp)}
          </a>{' '}
          by <ETHAddress address={party} />
        </span>
      )

      /* eslint-enable unicorn/new-for-builtins */
      return (
        <UITimeline.Item dot={<Icon type="file-text" />} key={i} color="grey">
          <StyledCard
            title={title}
            extra={fileURI && <EvidenceFileLink fileURI={fileURI} />}
          >
            <Card.Meta
              title={<StyledEvidenceTitle>{description}</StyledEvidenceTitle>}
              description={submissionTime}
            />
          </StyledCard>
        </UITimeline.Item>
      )
    } else if (name === 'AppealPossible') {
      const appealableRuling = event.appealableRuling
      if (typeof appealableRuling === 'undefined')
        return (
          <UITimeline.Item dot={<Icon type="file-text" />} key={i}>
            <Skeleton active paragraph={false} title={{ width: '200px' }} />
          </UITimeline.Item>
        )

      return (
        <UITimeline.Item key={i}>
          <span>
            {appealableRuling === SUBGRAPH_RULING.NONE
              ? 'The arbitrator refused to rule'
              : appealableRuling === SUBGRAPH_RULING.ACCEPT
                ? 'The arbitrator ruled in favor of the submitter'
                : appealableRuling === SUBGRAPH_RULING.REJECT
                  ? 'The arbitrator ruled in favor of the challenger'
                  : 'The arbitrator gave an unknown ruling'}
            <Typography.Text type="secondary">
              <a href={txPage} target="_blank" rel="noopener noreferrer">
                {secondTimestamp(timestamp)}
              </a>
            </Typography.Text>
          </span>
        </UITimeline.Item>
      )
    } else if (name === 'AppealDecision')
      return (
        <UITimeline.Item key={i}>
          Ruling appealed{' '}
          <Typography.Text type="secondary">
            <a href={txPage} target="_blank" rel="noopener noreferrer">
              {secondTimestamp(timestamp)}
            </a>
          </Typography.Text>
        </UITimeline.Item>
      )
    else if (name === 'Resolution') {
      let resultMessage, statusColor
      switch (event.disputeOutcome) {
        case 'None': {
          resultMessage = 'Item removed by non-rule'
          statusColor = 'red'
          break
        }
        case 'Accept': {
          resultMessage = 'Item accepted'
          statusColor = 'green'
          break
        }
        case 'Reject': {
          resultMessage = 'Item removed'
          statusColor = 'red'
          break
        }
        default:
          throw new Error('Unhandled ruling')
      }
      const differentAppealableRuling =
        event.lastRoundRuling !== event.disputeOutcome

      return (
        <UITimeline.Item key={i} color={statusColor}>
          {differentAppealableRuling &&
            'The winner of the last round did not fund the appeal. '}
          {resultMessage}
          <Typography.Text type="secondary">
            <a href={txPage} target="_blank" rel="noopener noreferrer">
              {secondTimestamp(timestamp)}
            </a>
          </Typography.Text>
        </UITimeline.Item>
      )
    } else if (name === 'Challenge')
      return (
        <UITimeline.Item key={i}>
          <span>
            Item challenged
            <Typography.Text type="secondary">
              <a href={txPage} target="_blank" rel="noopener noreferrer">
                {secondTimestamp(timestamp)}
              </a>
            </Typography.Text>
          </span>
        </UITimeline.Item>
      )
    else if (name === 'Withdrawal')
      return (
        <UITimeline.Item key={i} color="orange">
          <span>
            Item initiated withdrawal process
            <Typography.Text type="secondary">
              <a href={txPage} target="_blank" rel="noopener noreferrer">
                {secondTimestamp(timestamp)}
              </a>
            </Typography.Text>
          </span>
        </UITimeline.Item>
      )
    else if (name === 'WithdrawalCompleted')
      return (
        <UITimeline.Item key={i} color="gray">
          <span>
            Item withdrawn
            <Typography.Text type="secondary">
              <a href={txPage} target="_blank" rel="noopener noreferrer">
                {secondTimestamp(timestamp)}
              </a>
            </Typography.Text>
          </span>
        </UITimeline.Item>
      )
    else throw new Error(`Unhandled event ${name}`)
  })

  return <UITimeline>{[requestSubmittedNode, ...items]}</UITimeline>
}

const StyledDivider = styled(Divider)`
  text-transform: capitalize;
  flex: 1;
  min-width: 0;

  &.ui-divider {
    margin: 0;
  }
`

const StyledButton = styled(Button)`
  text-transform: capitalize;
  margin: 0;

  @media (max-width: 640px) {
    width: 100%;
  }
`

const StyledLoadingCard = styled(Card)`
  margin-top: 40px;
`

const StyledCollapse = styled(Collapse)`
  background-color: ${({ theme }) => theme.componentBackground} !important;
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: var(--radius-sm);
`

const HistoryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 16px;

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;
  }
`

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
  item: PermanentTimelineItem
  metaEvidence?: MetaEvidence
}

const RequestTimelines = ({ item, metaEvidence }: RequestTimelinesProps) => {
  const { metadata } = metaEvidence || {}
  const { itemName } = metadata || {}
  const { submissions } = item || {}

  if (!item)
    return (
      <>
        <StyledLoadingCard loading id="request-timelines" />
      </>
    )

  return (
    <div id="request-timelines">
      <HistoryHeader>
        <StyledDivider orientation="left">{`${
          capitalizeFirstLetter(itemName ?? '') || 'Item'
        } History`}</StyledDivider>
        {item.status !== CONTRACT_STATUS.ABSENT && (
          <StyledButton onClick={scrollToEvidenceComposer}>
            Submit evidence
          </StyledButton>
        )}
      </HistoryHeader>

      {submissions && (
        <StyledCollapse bordered={false} defaultActiveKey={['0']}>
          {submissions.map((submission, i) => (
            <Collapse.Panel
              header={`${toOrdinal(submissions.length - i)} submission`}
              key={i}
            >
              {/* We spread `submissions` to convert it from an array to an object. */}
              <Timeline
                item={item}
                submission={{ ...submission }}
                metaEvidence={metaEvidence}
              />
            </Collapse.Panel>
          ))}
        </StyledCollapse>
      )}
      {item.status !== CONTRACT_STATUS.ABSENT && (
        <PermanentEvidenceModal
          item={item}
          inline
          composerId={EVIDENCE_COMPOSER_ID}
        />
      )}
    </div>
  )
}

export default RequestTimelines
