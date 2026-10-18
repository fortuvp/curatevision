import React, { useMemo, useState, useEffect } from 'react'
import styled from 'styled-components'
import useUrlChainId from 'hooks/use-url-chain-id'
import {
  CONTRACT_STATUS,
  REQUEST_TYPE_LABEL,
  SUBGRAPH_RULING,
  hasPendingRequest,
} from 'utils/item-status'
import { capitalizeFirstLetter } from 'utils/string'
import { getTxPage } from 'utils/network-utils'
import { parseIpfs } from 'utils/ipfs-parse'
import toOrdinal from 'utils/ordinal'
import EvidenceFileLink from 'components/evidence-file-link'
import ClassicEvidenceModal from 'pages/item-details/modals/evidence'
import LightEvidenceModal from 'pages/light-item-details/modals/evidence'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  Chip,
  Data,
  PanelHeader,
  Row,
  SkeletonBlock,
  Small,
  Stack,
  Status,
  Subheading,
  Surface,
  type StatusTone,
} from 'components/curate/primitives'
import { Timeline, TimelineEvent } from 'components/curate/item-light-timeline'
import { AddressLink } from 'components/curate/item-light-fields'
import { toSeconds } from 'components/curate/item-light-format'

/*
 * An entry's history (DESIGN.md: a vertical timeline with absolute UTC
 * dates): one panel per request, newest first, each with its submission,
 * evidence, rulings, appeals and resolution; then the inline evidence
 * composer while a request is open.
 */

/** Round fields the subgraph returns beyond the shared SubgraphRound. */
interface TimelineRound extends SubgraphRound {
  txHashAppealPossible?: string | null
  appealedAt?: string | null
  txHashAppealDecision?: string | null
}

interface TimelineEvidenceItem {
  party: string
  uri: string
  number?: string
  timestamp: string
  txHash: string
  name?: string | null
  title: string | null
  description: string | null
  fileURI: string | null
  fileTypeExtension: string | null
}

/** Request fields the subgraph returns beyond the shared SubgraphRequest. */
export interface TimelineRequest extends SubgraphRequest {
  requestType: string
  creationTx: string
  resolutionTime?: string | null
  resolutionTx?: string | null
  disputeOutcome?: string | null
  evidenceGroup: { id?: string; evidences: TimelineEvidenceItem[] }
  rounds: TimelineRound[]
}

interface AppealPossibleLog {
  name: 'AppealPossible'
  timestamp: string
  transactionHash: string
  appealableRuling: string
}

interface AppealDecisionLog {
  name: 'AppealDecision'
  timestamp: string
  transactionHash: string
}

interface EvidenceLog {
  name: 'Evidence'
  timestamp: string
  transactionHash: string
  title: string | null
  description: string | null
  URI: string
  fileURI: string | null
  fileTypeExtension: string | null
  party: string
}

interface ResolutionLog {
  name: 'Resolution'
  timestamp?: string | null
  transactionHash?: string | null
  disputeOutcome?: string | null
}

type TimelineLog =
  | AppealPossibleLog
  | AppealDecisionLog
  | EvidenceLog
  | ResolutionLog

interface EvidenceFile {
  title?: string | null
  description?: string | null
  fileURI?: string | null
  fileTypeExtension?: string | null
}

const EvidenceCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-top: 4px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
`

const EvidenceText = styled.p`
  margin: 0;
  max-width: 68ch;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  white-space: pre-line;
  overflow-wrap: anywhere;
`

const rulingSentence = (ruling: string, isRegistration: boolean): string => {
  if (ruling === SUBGRAPH_RULING.NONE) return 'Jurors refused to rule'
  if (ruling === SUBGRAPH_RULING.ACCEPT)
    return `Jurors ruled for the ${isRegistration ? 'submitter' : 'requester'}`
  if (ruling === SUBGRAPH_RULING.REJECT)
    return 'Jurors ruled for the challenger'
  return 'Jurors gave an unknown ruling'
}

interface TimelineProps {
  request: TimelineRequest
  item: SubgraphItem
  metaEvidence?: MetaEvidence
}

const RequestTimeline = ({ request, item, metaEvidence }: TimelineProps) => {
  const networkId = useUrlChainId()
  const [evidenceMap, setEvidenceMap] = useState<Record<string, EvidenceFile>>()

  const logs = useMemo(() => {
    if (!request) return null

    const appealPossibles = request.rounds
      .map((r) => ({
        name: 'AppealPossible',
        timestamp: r.appealPeriodStart,
        transactionHash: r.txHashAppealPossible,
        appealableRuling: r.ruling,
      }))
      .filter((appeal): appeal is AppealPossibleLog => !!appeal.transactionHash)

    const appealDecisions = request.rounds
      .map((r) => ({
        name: 'AppealDecision',
        timestamp: r.appealedAt,
        transactionHash: r.txHashAppealDecision,
      }))
      .filter((appeal): appeal is AppealDecisionLog => !!appeal.transactionHash)

    const evidences = request.evidenceGroup.evidences.map(
      (e): EvidenceLog => ({
        name: 'Evidence',
        timestamp: e.timestamp,
        transactionHash: e.txHash,
        title: e.title,
        description: e.description,
        URI: e.uri,
        fileURI: e.fileURI,
        fileTypeExtension: e.fileTypeExtension,
        party: e.party,
      }),
    )

    const resolution: ResolutionLog = {
      name: 'Resolution',
      timestamp: request.resolutionTime,
      transactionHash: request.resolutionTx,
      disputeOutcome: !request.disputed
        ? SUBGRAPH_RULING.ACCEPT
        : request.disputeOutcome,
    }

    const logArray: TimelineLog[] = [
      ...appealPossibles,
      ...appealDecisions,
      ...evidences,
    ]

    if (resolution.transactionHash) logArray.push(resolution)

    return logArray.sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [request])

  const requestType = request.requestType
  const isRegistration = requestType === CONTRACT_STATUS.REGISTRATION_REQUESTED

  // The indexer can miss the evidence fields. Load unindexed files manually.
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
    evidenceManualFetch().catch((err) => {
      console.error('Could not load unindexed evidence', err)
    })
  }, [logs, evidenceMap, setEvidenceMap])

  if (!item || !request || !logs) return <SkeletonBlock $height="80px" />

  const metadata = metaEvidence?.metadata
  const itemName = metadata?.itemName
    ? capitalizeFirstLetter(metadata.itemName)
    : 'Item'
  const txPage = (txHash?: string | null) =>
    txHash ? getTxPage({ networkId: networkId ?? 0, txHash }) : undefined

  return (
    <Timeline>
      <TimelineEvent
        tone="window"
        title={isRegistration ? `${itemName} submitted` : 'Removal requested'}
        timestamp={toSeconds(request.submissionTime)}
        href={txPage(request.creationTx)}
        detail={
          request.requester ? (
            <>
              by <AddressLink address={request.requester} />
            </>
          ) : undefined
        }
      />
      {logs.map((event, i) => {
        const timestamp = toSeconds(event.timestamp)
        const href = txPage(event.transactionHash)

        if (event.name === 'Evidence') {
          const { title, description, fileURI } = evidenceMap?.[event.URI]
            ? evidenceMap[event.URI]
            : event
          return (
            <TimelineEvent
              key={i}
              tone="neutral"
              title={title || 'Evidence'}
              timestamp={timestamp}
              href={href}
              detail={
                <>
                  by <AddressLink address={event.party} />
                </>
              }
            >
              {(description || fileURI) && (
                <EvidenceCard>
                  {description && <EvidenceText>{description}</EvidenceText>}
                  {fileURI && <EvidenceFileLink fileURI={fileURI} />}
                </EvidenceCard>
              )}
            </TimelineEvent>
          )
        }

        if (event.name === 'AppealPossible')
          return (
            <TimelineEvent
              key={i}
              tone="contested"
              title={
                typeof event.appealableRuling === 'undefined'
                  ? 'Ruling'
                  : rulingSentence(event.appealableRuling, isRegistration)
              }
              timestamp={timestamp}
              href={href}
              detail="Appeal period opened"
            />
          )

        if (event.name === 'AppealDecision')
          return (
            <TimelineEvent
              key={i}
              tone="contested"
              title="Ruling appealed"
              timestamp={timestamp}
              href={href}
              detail="A new round of jurors decides"
            />
          )

        if (event.name === 'Resolution') {
          let message: string
          let tone: StatusTone
          switch (event.disputeOutcome) {
            case 'None':
            case 'Reject': {
              message = isRegistration
                ? 'Submission rejected'
                : 'Removal refused'
              tone = isRegistration ? 'off' : 'registered'
              break
            }
            case 'Accept': {
              message = isRegistration
                ? 'Submission accepted'
                : `${itemName} removed`
              tone = isRegistration ? 'registered' : 'off'
              break
            }
            default:
              throw new Error('Unhandled ruling')
          }
          const differentAppealableRuling =
            request.disputed &&
            request.rounds[0].ruling !== request.disputeOutcome

          return (
            <TimelineEvent
              key={i}
              tone={tone}
              title={message}
              timestamp={timestamp}
              href={href}
              detail={
                differentAppealableRuling
                  ? 'The winner of the last round did not fund the appeal.'
                  : undefined
              }
            />
          )
        }

        return null
      })}
    </Timeline>
  )
}

const PanelToggle = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  padding: 8px 16px;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--motion);

  &:hover {
    background: var(--color-raised);
  }
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--color-muted);
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
  transition: transform var(--motion);
`

const PanelBody = styled.div`
  padding: 16px;
  border-top: 1px solid var(--color-border);
`

const requestState = (
  request: TimelineRequest,
): { label: string; tone: StatusTone } =>
  request.resolved
    ? { label: 'Resolved', tone: 'neutral' }
    : request.disputed
      ? { label: 'Disputed', tone: 'contested' }
      : { label: 'Open', tone: 'window' }

const RequestPanel = ({
  request,
  ordinal,
  open,
  onToggle,
  item,
  metaEvidence,
}: {
  request: TimelineRequest
  ordinal: number
  open: boolean
  onToggle: () => void
  item: SubgraphItem
  metaEvidence?: MetaEvidence
}) => {
  const state = requestState(request)
  const panelId = `request-${ordinal}-timeline`
  return (
    <Surface $padding="none">
      <PanelToggle
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        <Row $gap={10} $wrap>
          <Data>{toOrdinal(ordinal)} request</Data>
          <Chip>{REQUEST_TYPE_LABEL[request.requestType] ?? 'Request'}</Chip>
          <Status tone={state.tone} label={state.label} />
        </Row>
        <Chevron $open={open} aria-hidden>
          <CurateIcon name="chevron-down" size={16} />
        </Chevron>
      </PanelToggle>
      {open && (
        <PanelBody id={panelId}>
          {/* The request is spread to convert it from an array to an object. */}
          <RequestTimeline
            item={item}
            request={{ ...request }}
            metaEvidence={metaEvidence}
          />
        </PanelBody>
      )}
    </Surface>
  )
}

export const EVIDENCE_COMPOSER_ID = 'evidence-composer'

export const scrollToEvidenceComposer = () => {
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
  item: SubgraphItem
  requests?: TimelineRequest[]
  kind: 'classic' | 'light'
  metaEvidence?: MetaEvidence
}

const RequestTimelines = ({
  item,
  requests,
  kind,
  metaEvidence,
}: RequestTimelinesProps) => {
  const EvidenceComposer =
    kind === 'classic' ? ClassicEvidenceModal : LightEvidenceModal
  const [openPanels, setOpenPanels] = useState<Record<number, boolean>>({
    0: true,
  })

  const { metadata } = metaEvidence || {}
  const itemName = metadata?.itemName || 'entry'

  if (!item)
    return (
      <Surface id="request-timelines" $padding="standard" aria-busy="true">
        <SkeletonBlock $height="120px" />
      </Surface>
    )

  const pending = hasPendingRequest(item.status)

  return (
    <Stack id="request-timelines" $gap={12}>
      <PanelHeader style={{ marginBottom: 0 }}>
        <div>
          <Subheading>History</Subheading>
          <Small $muted>
            Requests, evidence and rulings for this {itemName}, newest first.
            Times are UTC.
          </Small>
        </div>
        {pending && (
          <Button
            type="button"
            $variant="secondary"
            $size="sm"
            onClick={scrollToEvidenceComposer}
          >
            <CurateIcon name="policy" size={14} />
            Add evidence
          </Button>
        )}
      </PanelHeader>
      {requests?.map((request, i) => (
        <RequestPanel
          key={i}
          request={request}
          ordinal={requests.length - i}
          open={!!openPanels[i]}
          onToggle={() =>
            setOpenPanels((state) => ({ ...state, [i]: !state[i] }))
          }
          item={item}
          metaEvidence={metaEvidence}
        />
      ))}
      {pending && (
        <EvidenceComposer
          item={item}
          inline
          composerId={EVIDENCE_COMPOSER_ID}
        />
      )}
    </Stack>
  )
}

export default RequestTimelines
