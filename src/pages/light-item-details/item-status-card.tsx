import React, { useContext, useMemo } from 'react'
import styled from 'styled-components'
import type { Address } from 'viem'
import type { BigNumber } from 'ethers'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import _gtcr from 'assets/abis/LightGeneralizedTCR.json'
import {
  itemToStatusCode,
  STATUS_CODE,
  CONTRACT_STATUS,
  SUBGRAPH_RULING,
} from 'utils/item-status'
import { LightTCRViewContext } from 'contexts/light-tcr-view-context'
import useNativeCurrency from 'hooks/native-currency'
import useUrlChainId from 'hooks/use-url-chain-id'
import useNow from 'hooks/use-now'
import { klerosAddresses } from 'config/tcr-addresses'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import { formatAbsolute, formatAgo } from 'utils/time'
import ItemActionButton from 'components/item-action-button'
import { scrollToEvidenceComposer } from 'components/request-timelines'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonAnchor,
  KeyValueList,
  Label,
  Row,
  SkeletonBlock,
  Small,
  Stack,
  Status,
  Subheading,
  Surface,
} from 'components/curate/primitives'
import { CountdownCard } from 'components/curate/countdown-card'
import { EntryStatus, lightEntryStatus } from 'components/curate/entry-status'
import { useActionGate } from 'components/curate/item-light-gate'
import { AddressLink } from 'components/curate/item-light-fields'
import { Notice } from 'components/curate/item-light-notice'
import { StickyActionBar } from 'components/curate/item-light-action-bar'
import { formatAmount, toSeconds } from 'components/curate/item-light-format'
import ItemActionModal from './item-action-modal'

/*
 * The action card (DESIGN.md: right rail on desktop, sticky bottom bar on
 * phones): the current request and its status, the countdown for the open
 * window (challenge or appeal), the deposit at stake, the dispute link, and
 * the one action with its exact amount. While jurors decide, the card asks
 * for evidence instead of showing a disabled button.
 */

const Details = styled(KeyValueList)`
  gap: 8px 16px;

  dd {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 8px;
  }
`

const ExternalLink = styled.a`
  color: var(--color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

interface RulingProps {
  currentRuling: string | null
}

export const Ruling = ({ currentRuling }: RulingProps) => {
  if (currentRuling == null)
    return <SkeletonBlock $height="18px" $width="160px" />

  switch (currentRuling) {
    case 'None':
      return <>Jurors refused to rule.</>
    case 'Accept':
      return <>Jurors ruled for the requester.</>
    case 'Reject':
      return <>Jurors ruled for the challenger.</>
    default:
      throw new Error(`Unhandled ruling ${currentRuling}`)
  }
}

interface LightRequest extends SubgraphRequest {
  deposit?: BigNumber | string
  disputeID: string
  arbitrator: string
  resolutionTime?: string | null
}

interface ItemStatusCardProps {
  item: SubgraphItem
  timestamp?: BigNumber
  request: LightRequest
  modalOpen?: boolean
  setModalOpen: (open: boolean) => void
  appealCost?: BigNumber
  dark?: boolean
}

const ItemStatusCard = ({
  item,
  timestamp,
  request,
  modalOpen,
  setModalOpen,
  appealCost,
}: ItemStatusCardProps) => {
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const {
    metaEvidence,
    challengePeriodDuration,
    tcrAddress,
    submissionDeposit,
    removalDeposit,
    submissionChallengeDeposit,
    removalChallengeDeposit,
    gtcrView,
  } = useContext(LightTCRViewContext) || {}
  const urlChainId = useUrlChainId()
  const nativeCurrency = useNativeCurrency()
  const now = useNow()
  const { arbitrator: klerosAddress, uiURL } =
    (urlChainId && klerosAddresses[urlChainId]) || {}

  const statusCode = useMemo(
    () =>
      item && timestamp && challengePeriodDuration
        ? itemToStatusCode(item, timestamp, challengePeriodDuration)
        : undefined,
    [item, timestamp, challengePeriodDuration],
  )
  const view = useMemo(
    () => lightEntryStatus(item, timestamp, challengePeriodDuration),
    [item, timestamp, challengePeriodDuration],
  )
  const executeGate = useActionGate({
    verb: 'execute the request',
    needsAuth: false,
  })

  const executeRequest = async () => {
    if (!tcrAddress || !walletClient || !publicClient) return
    try {
      const { request: req } = await simulateContract(wagmiConfig, {
        address: tcrAddress as Address,
        abi: _gtcr,
        functionName: 'executeRequest',
        args: [item.itemID],
        account,
      })

      await wrapWithToast(() => walletClient.writeContract(req), publicClient)
    } catch (err) {
      console.error('Error executing request:', err)
      errorToast(parseWagmiError(err))
    }
  }

  if (!item || !timestamp || !challengePeriodDuration || !request)
    return (
      <Surface id="item-status-card" $padding="compact" aria-busy="true">
        <Stack $gap={12}>
          <SkeletonBlock $height="18px" $width="50%" />
          <SkeletonBlock $height="96px" />
          <SkeletonBlock $height="40px" />
        </Stack>
      </Surface>
    )

  if (statusCode === undefined || !view) return null

  const { disputed, disputeID, arbitrator, resolved } = request
  const round = request.rounds?.[0]
  const currentRuling = round?.ruling ?? null
  const submissionTime = toSeconds(request.submissionTime)
  const windowEnd = submissionTime + challengePeriodDuration.toNumber()
  const appealStart = toSeconds(round?.appealPeriodStart)
  const appealEnd = toSeconds(round?.appealPeriodEnd)
  const appealHalf = appealStart + (appealEnd - appealStart) / 2
  const isRegistration = request.requestType
    ? request.requestType === CONTRACT_STATUS.REGISTRATION_REQUESTED
    : item.status === CONTRACT_STATUS.REGISTRATION_REQUESTED
  const requestLabel = isRegistration ? 'Submission' : 'Removal request'
  const { metadata, fileURI } = metaEvidence || {}
  const itemName = metadata?.itemName || 'entry'
  const requesterName = isRegistration ? 'submitter' : 'requester'
  const loserName =
    currentRuling === SUBGRAPH_RULING.ACCEPT ? 'challenger' : requesterName
  const winnerName =
    currentRuling === SUBGRAPH_RULING.ACCEPT ? requesterName : 'challenger'

  const inWindow =
    statusCode === STATUS_CODE.SUBMITTED ||
    statusCode === STATUS_CODE.REMOVAL_REQUESTED
  const isPending =
    statusCode === STATUS_CODE.PENDING_SUBMISSION ||
    statusCode === STATUS_CODE.PENDING_REMOVAL
  const appealable =
    statusCode === STATUS_CODE.CROWDFUNDING ||
    statusCode === STATUS_CODE.CROWDFUNDING_WINNER
  const hasRequestAction =
    statusCode !== STATUS_CODE.CHALLENGED &&
    statusCode !== STATUS_CODE.WAITING_ARBITRATOR &&
    statusCode !== STATUS_CODE.WAITING_ENFORCEMENT

  const challengeCost =
    statusCode === STATUS_CODE.SUBMITTED
      ? submissionChallengeDeposit
      : statusCode === STATUS_CODE.REMOVAL_REQUESTED
        ? removalChallengeDeposit
        : undefined
  const buttonAmount = inWindow
    ? challengeCost
    : statusCode === STATUS_CODE.REGISTERED
      ? removalDeposit
      : statusCode === STATUS_CODE.REJECTED ||
          statusCode === STATUS_CODE.REMOVED
        ? submissionDeposit
        : undefined
  const amountLabel = buttonAmount
    ? formatAmount(buttonAmount, nativeCurrency)
    : undefined

  const onClick = () => {
    switch (statusCode) {
      case STATUS_CODE.REJECTED:
      case STATUS_CODE.REMOVED:
      case STATUS_CODE.REGISTERED:
      case STATUS_CODE.SUBMITTED:
      case STATUS_CODE.REMOVAL_REQUESTED:
      case STATUS_CODE.CROWDFUNDING:
      case STATUS_CODE.CROWDFUNDING_WINNER: {
        setModalOpen(true)
        break
      }
      case STATUS_CODE.PENDING_SUBMISSION:
      case STATUS_CODE.PENDING_REMOVAL:
        return executeRequest()
      case STATUS_CODE.CHALLENGED:
      case STATUS_CODE.WAITING_ARBITRATOR:
        return null
      default:
        throw new Error(`Unhandled status code ${statusCode}`)
    }
  }

  const hasDispute = disputed && Number(disputeID) !== 0
  const disputeHref =
    hasDispute &&
    uiURL &&
    klerosAddress?.toLowerCase() === arbitrator?.toLowerCase()
      ? uiURL.replace(':disputeID', disputeID.toString())
      : undefined
  const disputeHost = disputeHref ? new URL(disputeHref).host : undefined
  const showRuling =
    disputed &&
    (resolved ||
      appealable ||
      statusCode === STATUS_CODE.WAITING_ARBITRATOR ||
      statusCode === STATUS_CODE.WAITING_ENFORCEMENT)

  const action = hasRequestAction ? (
    <ItemActionButton
      statusCode={statusCode}
      itemName={itemName}
      itemID={item.itemID}
      onClick={onClick}
      amount={amountLabel}
      block
      disabled={isPending && !executeGate.ready}
      blocker={executeGate.blocker}
    />
  ) : null

  const barAction =
    statusCode === STATUS_CODE.CHALLENGED ? (
      <Button
        type="button"
        $variant="primary"
        onClick={scrollToEvidenceComposer}
      >
        Add evidence
      </Button>
    ) : hasRequestAction ? (
      <ItemActionButton
        statusCode={statusCode}
        itemName={itemName}
        itemID={item.itemID}
        onClick={onClick}
        amount={amountLabel}
        disabled={isPending && !executeGate.ready}
        blocker={executeGate.blocker}
      />
    ) : null

  return (
    <>
      <Surface
        id="item-status-card"
        $padding="compact"
        role="region"
        aria-label="Current request"
      >
        <Stack $gap={14}>
          <Row $justify="space-between" $align="flex-start" $gap={12} $wrap>
            <div>
              <Label>Current request</Label>
              <Subheading>{requestLabel}</Subheading>
            </div>
            <EntryStatus status={view} now={now} />
          </Row>

          {inWindow && (
            <CountdownCard
              title="Challenge window"
              start={submissionTime}
              deadline={windowEnd}
              now={now}
              tone="window"
              verb="left to challenge"
              passedLabel="Window closed"
            />
          )}

          {isPending && (
            <Notice tone="neutral">
              The challenge window closed {formatAbsolute(windowEnd)} with no
              challenge. Anyone can execute the request; the deposit then
              returns to the {requesterName}.
            </Notice>
          )}

          {statusCode === STATUS_CODE.CHALLENGED && (
            <Surface $raised $padding="compact">
              <Stack $gap={10}>
                <Status
                  tone="contested"
                  label="Challenged"
                  detail="jurors deciding"
                />
                <Body>
                  A challenger disputes this {requestLabel.toLowerCase()}.
                  Kleros jurors decide against the listing policy; add evidence
                  to support your side before they vote.
                </Body>
                <Row $gap={8} $wrap>
                  <Button
                    type="button"
                    $variant="primary"
                    onClick={scrollToEvidenceComposer}
                  >
                    <CurateIcon name="policy" size={16} />
                    Add evidence
                  </Button>
                  {disputeHref && (
                    <ButtonAnchor
                      $variant="secondary"
                      href={disputeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Case {disputeID}
                      <CurateIcon name="external" size={14} />
                    </ButtonAnchor>
                  )}
                </Row>
              </Stack>
            </Surface>
          )}

          {appealable && currentRuling === SUBGRAPH_RULING.NONE && (
            <CountdownCard
              title="Appeal period"
              start={appealStart}
              deadline={appealEnd}
              now={now}
              tone="contested"
              verb="left to fund an appeal"
              passedLabel="Appeal period over"
              hint="Jurors refused to rule. If one side fully funds an appeal, the other must fund too or loses the dispute."
            />
          )}
          {statusCode === STATUS_CODE.CROWDFUNDING &&
            currentRuling !== SUBGRAPH_RULING.NONE && (
              <>
                <CountdownCard
                  title={`${loserName}'s half of the appeal period`}
                  start={appealStart}
                  deadline={appealHalf}
                  now={now}
                  tone="contested"
                  verb={`left for the ${loserName} to fund`}
                  passedLabel="Half passed"
                  hint={`The ${loserName} must fully fund the appeal before this deadline, or the ruling stands.`}
                />
                <CountdownCard
                  title="Appeal period"
                  start={appealStart}
                  deadline={appealEnd}
                  now={now}
                  tone="contested"
                  verb={`left for the ${winnerName} to fund`}
                  passedLabel="Appeal period over"
                />
              </>
            )}
          {statusCode === STATUS_CODE.CROWDFUNDING_WINNER && (
            <CountdownCard
              title="Appeal period"
              start={appealStart}
              deadline={appealEnd}
              now={now}
              tone="contested"
              verb={`left for the ${winnerName} to fund`}
              passedLabel="Appeal period over"
              hint={`The ${loserName} funded the appeal. If the ${winnerName} does not fund before the deadline, the ${loserName} wins the dispute.`}
            />
          )}
          {statusCode === STATUS_CODE.WAITING_ARBITRATOR && (
            <Notice tone="contested">
              The appeal period ended {formatAbsolute(appealEnd)}. The final
              ruling waits to be given and enforced.
            </Notice>
          )}
          {statusCode === STATUS_CODE.WAITING_ENFORCEMENT && (
            <Notice tone="contested">
              The {loserName} did not fund the appeal in time. The ruling is
              final and waits to be enforced.
            </Notice>
          )}

          <Details>
            {submissionTime > 0 && (
              <>
                <dt>Submitted</dt>
                <dd>
                  <span title={formatAbsolute(submissionTime)}>
                    {formatAgo(submissionTime, now)}
                  </span>
                </dd>
              </>
            )}
            <dt>Requester</dt>
            <dd>
              <AddressLink address={request.requester} />
            </dd>
            {hasDispute && (
              <>
                <dt>Challenger</dt>
                <dd>
                  <AddressLink address={request.challenger} />
                </dd>
                <dt>Dispute</dt>
                <dd>
                  {disputeHref ? (
                    <ExternalLink
                      href={disputeHref}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Case {disputeID} on {disputeHost}
                    </ExternalLink>
                  ) : (
                    <>
                      <span>#{disputeID.toString()} at</span>
                      <AddressLink address={arbitrator} />
                    </>
                  )}
                </dd>
              </>
            )}
            {inWindow && request.deposit !== undefined && (
              <>
                <dt>Deposit at stake</dt>
                <dd>{formatAmount(request.deposit, nativeCurrency)}</dd>
              </>
            )}
            {inWindow && (
              <>
                <dt>Cost to challenge</dt>
                <dd>{formatAmount(challengeCost, nativeCurrency)}</dd>
              </>
            )}
            {showRuling && (
              <>
                <dt>{appealable ? 'Current ruling' : 'Ruling'}</dt>
                <dd>
                  <Ruling currentRuling={currentRuling} />
                </dd>
              </>
            )}
            {resolved && request.resolutionTime && (
              <>
                <dt>Resolved</dt>
                <dd>{formatAbsolute(toSeconds(request.resolutionTime))}</dd>
              </>
            )}
          </Details>

          {action && (
            <Stack $gap={8}>
              {action}
              {isPending && executeGate.controls && (
                <Row $gap={8} $wrap>
                  {executeGate.controls}
                </Row>
              )}
              {isPending && executeGate.blocker && (
                <Small $muted role="status">
                  {executeGate.blocker}
                </Small>
              )}
            </Stack>
          )}
        </Stack>
      </Surface>

      <StickyActionBar
        status={<EntryStatus status={view} now={now} />}
        action={barAction}
      />

      {statusCode !== STATUS_CODE.PENDING_SUBMISSION &&
        statusCode !== STATUS_CODE.PENDING_REMOVAL &&
        statusCode !== STATUS_CODE.CHALLENGED && (
          <ItemActionModal
            statusCode={statusCode}
            itemName={itemName}
            item={item}
            fileURI={fileURI || ''}
            isOpen={!!modalOpen}
            onClose={() => setModalOpen(false)}
            submissionDeposit={submissionDeposit}
            tcrAddress={tcrAddress}
            metaEvidence={metaEvidence}
            challengePeriodDuration={challengePeriodDuration}
            gtcrView={gtcrView}
            appealCost={appealCost}
          />
        )}
    </>
  )
}

export default ItemStatusCard
