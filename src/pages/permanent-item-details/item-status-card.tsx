import React, { useCallback, useRef, useState } from 'react'
import styled from 'styled-components'
import type { Address } from 'viem'
import { BigNumber } from 'ethers'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import _gtcr from 'assets/abis/PermanentGTCR.json'
import useNow from 'hooks/use-now'
import useTokenSymbol from 'hooks/token-symbol'
import useNativeCurrency from 'hooks/native-currency'
import useUrlChainId from 'hooks/use-url-chain-id'
import { klerosAddresses } from 'config/tcr-addresses'
import { getAddressPage } from 'utils/network-utils'
import { formatAbsolute, formatDurationLong } from 'utils/time'
import {
  CONTRACT_STATUS,
  STATUS_CODE,
  SUBGRAPH_RULING,
  itemToStatusCode,
} from 'utils/permanent-item-status'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonAnchor,
  Data,
  Figure,
  Hairline,
  Label,
  SkeletonBlock,
  Small,
  Stack,
  Surface,
} from 'components/curate/primitives'
import { CountdownCard } from 'components/curate/countdown-card'
import ItemActionButton, {
  isPassiveStatus,
} from 'components/permanent-item-action-button'
import ItemActionModal from './item-action-modal'
import WithdrawModal from './modals/withdraw'
import AppealFundingCard from './crowdfunding-card'
import {
  Stepper,
  withdrawalSteps,
  type WithdrawalStage,
} from './withdrawal-stepper'
import {
  GateHelper,
  applyMultiplier,
  multiplierPercent,
  nativeText,
  tokenText,
  useActionGate,
} from './modals/shell'

/*
 * The right rail of the Stake Curate item page: the window that is open
 * right now as a countdown, the withdrawal as a three-step stepper, the
 * stake at risk and the arbitration deposit, the one action with its exact
 * amounts, and the court link. On phones the action repeats in a sticky bar.
 */

/** Challenge fields the item query selects. */
export interface StakeChallenge extends SubgraphChallenge {
  disputeID: string
  challenger: string
  challengerStake?: string
  disputeOutcome?: string | null
  createdAt?: string | null
  creationTx?: string | null
  resolutionTime?: string | null
  resolutionTx?: string | null
  arbitrationSetting: { arbitratorExtraData: string }
}

/** A registry row where the fields the rail needs are known to be present. */
export interface StakeRegistry extends SubgraphRegistry {
  id: Address
  token: Address
  arbitrator: { id: Address }
}

/** A Stake Curate item as the item query returns it. */
export interface StakeItem extends SubgraphItem {
  itemID: string
  submitter: string
  stake: string
  includedAt: string
  arbitrationDeposit?: string
  withdrawingTimestamp: string
  challenges: StakeChallenge[]
  registry?: StakeRegistry
  columns?: Column[]
}

const toNum = (value: unknown): number => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

const RailStack = styled(Stack)`
  position: sticky;
  top: calc(var(--app-bar-height) + 16px);

  @media (max-width: 1100px) {
    position: static;
  }
`

const ActionStack = styled(Stack)`
  @media (max-width: 720px) {
    display: none;
  }
`

/*
 * The phone action bar is fixed to the bottom of the screen: as a grid item
 * a sticky element is boxed into its own grid area and never moves. A spacer
 * in flow, sized to the measured bar, keeps the last content above it.
 */
const MobileBar = styled.div`
  display: none;

  @media (max-width: 720px) {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px var(--horizontal-padding) 16px;
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
`

const MobileSpacer = styled.div<{ $height: number }>`
  display: none;

  @media (max-width: 720px) {
    display: block;
    height: ${({ $height }) => $height}px;
  }
`

/** Measures the fixed bar so the spacer always matches it, whatever it holds. */
const useMeasuredHeight = (): [
  number,
  (node: HTMLDivElement | null) => void,
] => {
  const [height, setHeight] = useState(0)
  const observer = useRef<ResizeObserver | null>(null)
  const ref = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect()
    observer.current = null
    if (!node) return
    const measure = () => setHeight(node.getBoundingClientRect().height)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    observer.current = new ResizeObserver(measure)
    observer.current.observe(node)
  }, [])
  return [height, ref]
}

const LinkRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const rulingSentence = (ruling: string | null | undefined): string => {
  switch (ruling) {
    case SUBGRAPH_RULING.NONE:
      return 'The arbitrator refused to rule.'
    case SUBGRAPH_RULING.ACCEPT:
      return 'The arbitrator ruled for the submitter.'
    case SUBGRAPH_RULING.REJECT:
      return 'The arbitrator ruled for the challenger.'
    default:
      return 'No ruling yet.'
  }
}

interface ItemStatusCardProps {
  item?: StakeItem
  registry?: StakeRegistry
  timestamp?: BigNumber
  metaEvidence?: MetaEvidence
  modalOpen: boolean
  setModalOpen: (open: boolean) => void
  appealCost?: BigNumber
  arbitrationCost?: BigNumber
}

const ItemStatusCard = ({
  item,
  registry,
  timestamp,
  metaEvidence,
  modalOpen,
  setModalOpen,
  appealCost,
  arbitrationCost,
}: ItemStatusCardProps) => {
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const now = useNow()
  const chainId = useUrlChainId()
  const nativeCurrency = useNativeCurrency()
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [barHeight, barRef] = useMeasuredHeight()
  const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenSymbol(
    registry?.token,
  )
  const executeGate = useActionGate('execute the withdrawal')

  const statusCode =
    item && timestamp && registry
      ? itemToStatusCode(item, timestamp, registry)
      : undefined

  if (!item || !timestamp || !registry || statusCode === undefined)
    return (
      <RailStack $gap={16} aria-busy="true" aria-label="Loading status">
        <SkeletonBlock $height="132px" />
        <SkeletonBlock $height="96px" />
        <SkeletonBlock $height="56px" />
      </RailStack>
    )

  const itemName = metaEvidence?.metadata?.itemName || 'item'
  const offList =
    statusCode === STATUS_CODE.REJECTED ||
    statusCode === STATUS_CODE.REMOVED ||
    statusCode === STATUS_CODE.WITHDRAWN
  const includedAt = toNum(item.includedAt)
  const reincluded = item.status === CONTRACT_STATUS.REINCLUDED
  const period = toNum(
    reincluded ? registry.reinclusionPeriod : registry.submissionPeriod,
  )
  const acceptedAt = includedAt + period
  const withdrawingAt = toNum(item.withdrawingTimestamp)
  const withdrawingPeriod = toNum(registry.withdrawingPeriod)
  const withdrawReadyAt = withdrawingAt + withdrawingPeriod
  const isWithdrawing = !offList && withdrawingAt > 0
  const isWithdrawable = !offList && withdrawingAt === 0
  const isSubmitter =
    !!account &&
    !!item.submitter &&
    account.toLowerCase() === item.submitter.toLowerCase()

  const challenge = item.challenges?.[0]
  const round = challenge?.rounds?.[0]
  const disputeID = challenge?.disputeID
  const appealStart = toNum(round?.appealPeriodStart)
  const appealEnd = toNum(round?.appealPeriodEnd)
  const appealHalf = appealStart + (appealEnd - appealStart) / 2
  const appealable =
    statusCode === STATUS_CODE.CROWDFUNDING ||
    statusCode === STATUS_CODE.CROWDFUNDING_WINNER
  // With no ruling there is no loser: the contract lets either side fund
  // with the shared multiplier until the period ends, with no half cutoff.
  const refusedToRule = round?.ruling === SUBGRAPH_RULING.NONE
  const loserPhase = !refusedToRule && now < appealHalf
  const underDispute =
    statusCode === STATUS_CODE.DISPUTED ||
    statusCode === STATUS_CODE.WAITING_ARBITRATOR ||
    appealable

  const arbitrator = registry.arbitrator.id
  const kleros = chainId ? klerosAddresses[chainId] : undefined
  const courtHref =
    disputeID && kleros?.arbitrator.toLowerCase() === arbitrator.toLowerCase()
      ? kleros.uiURL.replace(':disputeID', disputeID.toString())
      : disputeID
        ? getAddressPage({ networkId: chainId ?? 0, address: arbitrator })
        : undefined

  const stakeText = tokenText(item.stake, tokenDecimals, tokenSymbol)
  const minStakeText = tokenText(
    registry.submissionMinDeposit ?? 0,
    tokenDecimals,
    tokenSymbol,
  )
  const depositText = item.arbitrationDeposit
    ? nativeText(item.arbitrationDeposit, nativeCurrency)
    : undefined
  const challengerStake = applyMultiplier(
    item.stake,
    registry.challengeStakeMultiplier,
  )
  const challengerText = tokenText(challengerStake, tokenDecimals, tokenSymbol)
  const costText = arbitrationCost
    ? nativeText(arbitrationCost, nativeCurrency)
    : undefined

  const executeWithdrawal = async () => {
    if (!walletClient || !publicClient) return
    setExecuting(true)
    try {
      const { request } = await simulateContract(wagmiConfig, {
        address: registry.id,
        abi: _gtcr,
        functionName: 'withdrawItem',
        args: [item.itemID],
        account,
      })

      await wrapWithToast(
        () => walletClient.writeContract(request),
        publicClient,
      )
    } catch (err) {
      console.error('Error executing withdrawal:', err)
      errorToast(parseWagmiError(err))
    }
    setExecuting(false)
  }

  const onAction = () => {
    switch (statusCode) {
      case STATUS_CODE.REJECTED:
      case STATUS_CODE.REMOVED:
      case STATUS_CODE.WITHDRAWN:
      case STATUS_CODE.PENDING:
      case STATUS_CODE.ACCEPTED:
      case STATUS_CODE.CROWDFUNDING:
      case STATUS_CODE.CROWDFUNDING_WINNER:
        setModalOpen(true)
        return
      case STATUS_CODE.PENDING_WITHDRAWAL:
        executeWithdrawal()
        return
      case STATUS_CODE.DISPUTED:
      case STATUS_CODE.WAITING_ARBITRATOR:
        return
      default:
        throw new Error(`Unhandled status code ${statusCode}`)
    }
  }

  const amounts =
    statusCode === STATUS_CODE.PENDING || statusCode === STATUS_CODE.ACCEPTED
      ? costText
        ? `${challengerText} + ${costText}`
        : challengerText
      : offList
        ? costText
          ? `${minStakeText} + ${costText}`
          : minStakeText
        : undefined
  const directAction = statusCode === STATUS_CODE.PENDING_WITHDRAWAL
  const actionBlocker =
    directAction && !executeGate.ready ? executeGate.blocker : undefined

  const withdrawalStage: WithdrawalStage =
    statusCode === STATUS_CODE.WITHDRAWN
      ? 'withdrawn'
      : statusCode === STATUS_CODE.PENDING_WITHDRAWAL
        ? 'ready'
        : isWithdrawing
          ? 'withdrawing'
          : 'listed'
  const withdrawingWindow = withdrawingPeriod
    ? formatDurationLong(withdrawingPeriod)
    : undefined
  const stepper = (
    <Stepper
      label="Withdrawal steps"
      steps={withdrawalSteps(withdrawalStage, {
        withdraw:
          withdrawalStage === 'listed'
            ? isSubmitter
              ? 'Only you, the submitter, can start it.'
              : 'Only the submitter can start it.'
            : `Started ${formatAbsolute(withdrawingAt)}`,
        withdrawing:
          withdrawalStage === 'withdrawing'
            ? underDispute
              ? `Paused by the dispute: if the jurors keep the ${itemName} it is withdrawn at once; if they remove it the withdrawal is void.`
              : `Still challengeable until ${formatAbsolute(withdrawReadyAt)}`
            : withdrawingWindow
              ? `${withdrawingWindow}, during which the ${itemName} can still be challenged.`
              : undefined,
        execute:
          withdrawalStage === 'withdrawn'
            ? 'Stake and deposit returned to the submitter.'
            : depositText
              ? `Anyone can execute it. ${stakeText} + ${depositText} return to the submitter.`
              : `Anyone can execute it. ${stakeText} returns to the submitter.`,
      })}
    />
  )

  const actionButton = (id?: string) => (
    <ItemActionButton
      id={id}
      statusCode={statusCode}
      itemName={itemName}
      itemID={item.itemID}
      onClick={onAction}
      type="primary"
      amounts={amounts}
      disabled={Boolean(actionBlocker)}
      blocker={actionBlocker}
      loading={executing}
      block
    />
  )
  const withdrawButton =
    isWithdrawable && isSubmitter ? (
      <Button
        type="button"
        $variant="secondary"
        $block
        onClick={() => setWithdrawModalOpen(true)}
      >
        Withdraw {itemName}
      </Button>
    ) : null

  return (
    <>
      <RailStack $gap={16} aria-label="Status and actions">
        {statusCode === STATUS_CODE.PENDING && (
          <CountdownCard
            title={reincluded ? 'Reinclusion period' : 'Submission period'}
            start={includedAt}
            deadline={acceptedAt}
            now={now}
            tone="window"
            verb="until accepted"
            passedLabel="Accepted"
            hint={`Anyone can challenge during this period. The ${itemName} is accepted when it ends, and stays challengeable while listed.`}
          />
        )}

        {statusCode === STATUS_CODE.ACCEPTED && (
          <Surface $padding="compact" role="group" aria-label="Accepted">
            <Stack $gap={6}>
              <Label>Accepted</Label>
              <Data title={formatAbsolute(acceptedAt)}>
                since {formatAbsolute(acceptedAt)}
              </Data>
              <Small $muted>
                Listed. It can be challenged at any time while its stake is
                locked.
              </Small>
            </Stack>
          </Surface>
        )}

        {statusCode === STATUS_CODE.DISPUTED && (
          <Surface $padding="compact" role="group" aria-label="Disputed">
            <Stack $gap={6}>
              <Label>Disputed</Label>
              <Data>Jurors deciding</Data>
              <Small $muted>
                Dispute #{disputeID}. Both sides can add evidence below while
                the case runs.
              </Small>
            </Stack>
          </Surface>
        )}

        {appealable && (
          <CountdownCard
            title="Appeal period"
            start={appealStart}
            deadline={loserPhase ? appealHalf : appealEnd}
            now={now}
            tone="contested"
            verb={loserPhase ? 'for the loser to fund' : 'to fund'}
            passedLabel="Appeal closing"
            hint={
              refusedToRule ? (
                <>
                  {rulingSentence(round?.ruling)} Either side can fund until{' '}
                  {formatAbsolute(appealEnd)}.
                </>
              ) : (
                <>
                  {rulingSentence(round?.ruling)} The loser&apos;s half ends{' '}
                  {formatAbsolute(appealHalf)}; the period ends{' '}
                  {formatAbsolute(appealEnd)}.
                </>
              )
            }
          />
        )}
        {appealable && (
          <AppealFundingCard
            item={item}
            registry={registry}
            timestamp={timestamp}
            appealCost={appealCost}
          />
        )}

        {statusCode === STATUS_CODE.WAITING_ARBITRATOR && (
          <Surface $padding="compact" role="group" aria-label="Awaiting ruling">
            <Stack $gap={6}>
              <Label>Awaiting ruling</Label>
              {now < appealEnd ? (
                refusedToRule ? (
                  <>
                    <Data>Appeal period closing</Data>
                    <Small $muted>
                      {rulingSentence(round?.ruling)} The period ends{' '}
                      {formatAbsolute(appealEnd)}; the ruling is enforced on
                      the {itemName} once the arbitrator executes it.
                    </Small>
                  </>
                ) : (
                  <>
                    <Data>Loser did not fund the appeal</Data>
                    <Small $muted>
                      {rulingSentence(round?.ruling)} The ruling stands and is
                      enforced once the period ends{' '}
                      {formatAbsolute(appealEnd)}.
                    </Small>
                  </>
                )
              ) : (
                <>
                  <Data>Appeal period over</Data>
                  <Small $muted>
                    {rulingSentence(round?.ruling)} The ruling is enforced on
                    the {itemName} once the arbitrator executes it.
                  </Small>
                </>
              )}
            </Stack>
          </Surface>
        )}

        {offList && (
          <Surface $padding="compact" role="group" aria-label="Off the list">
            <Stack $gap={6}>
              <Label>
                {statusCode === STATUS_CODE.WITHDRAWN
                  ? 'Withdrawn'
                  : statusCode === STATUS_CODE.REMOVED
                    ? 'Removed'
                    : 'Rejected'}
              </Label>
              <Small $muted>
                {statusCode === STATUS_CODE.WITHDRAWN
                  ? `Withdrawn by the submitter. It can be resubmitted with a new stake of at least ${minStakeText}.`
                  : `Off the list after a ruling. It can be resubmitted with a new stake of at least ${minStakeText}.`}
              </Small>
            </Stack>
          </Surface>
        )}

        {withdrawalStage === 'withdrawing' &&
        (statusCode === STATUS_CODE.PENDING ||
          statusCode === STATUS_CODE.ACCEPTED) ? (
          <CountdownCard
            title="Withdrawal period"
            start={withdrawingAt}
            deadline={withdrawReadyAt}
            now={now}
            tone="neutral"
            verb="until it can be executed"
            passedLabel="Ready to execute"
            action={stepper}
          />
        ) : (
          !offList && (
            <Surface $padding="compact" role="group" aria-label="Withdrawal">
              <Stack $gap={12}>
                <Label>Withdrawal</Label>
                {stepper}
              </Stack>
            </Surface>
          )
        )}

        <Surface $padding="compact" role="group" aria-label="Stake">
          <Stack $gap={8}>
            <Label>{offList ? 'Stake to resubmit' : 'Stake at risk'}</Label>
            <Figure>{offList ? minStakeText : stakeText}</Figure>
            {!offList && depositText && (
              <Small $muted>Arbitration deposit {depositText}</Small>
            )}
            {offList && costText && (
              <Small $muted>Arbitration deposit {costText}</Small>
            )}
            <Hairline />
            <Small $muted>
              {offList
                ? `A challenger must stake ${multiplierPercent(registry.challengeStakeMultiplier)} of the stake${costText ? ` and pay the arbitration cost of ${costText}` : ''}.`
                : `A challenger must stake ${challengerText} (${multiplierPercent(registry.challengeStakeMultiplier)} of the stake)${costText ? ` and pay the arbitration cost of ${costText}` : ''}.`}
            </Small>
          </Stack>
        </Surface>

        <ActionStack $gap={8}>
          {actionButton()}
          {withdrawButton}
          {directAction && <GateHelper gate={executeGate} />}
          {isPassiveStatus(statusCode) && (
            <Body $muted>
              Nothing to sign right now. You can still add evidence below.
            </Body>
          )}
          <LinkRow>
            {courtHref && (
              <ButtonAnchor
                href={courtHref}
                target="_blank"
                rel="noopener noreferrer"
                $variant="secondary"
                $size="sm"
              >
                <CurateIcon name="court" size={14} />
                {disputeID ? `Dispute #${disputeID}` : 'Court'}
                <CurateIcon name="external" size={12} />
              </ButtonAnchor>
            )}
          </LinkRow>
        </ActionStack>
      </RailStack>

      <MobileSpacer
        aria-hidden
        $height={barHeight > 0 ? barHeight + 8 : withdrawButton ? 128 : 104}
      />
      <MobileBar ref={barRef}>
        {actionButton('item-action-button-mobile')}
        {withdrawButton}
        {directAction &&
          !executeGate.ready &&
          (executeGate.helper ? (
            <GateHelper gate={executeGate} />
          ) : (
            <Small $muted role="status">
              {actionBlocker}
            </Small>
          ))}
      </MobileBar>

      {!isPassiveStatus(statusCode) && (
        <ItemActionModal
          statusCode={statusCode}
          itemName={itemName}
          item={item}
          metaEvidence={metaEvidence}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          appealCost={appealCost}
          arbitrationCost={arbitrationCost}
        />
      )}
      <WithdrawModal
        isOpen={withdrawModalOpen}
        onCancel={() => setWithdrawModalOpen(false)}
        item={item}
        registry={registry}
        itemName={itemName}
      />
    </>
  )
}

export default ItemStatusCard
