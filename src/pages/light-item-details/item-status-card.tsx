import React, { useContext, useMemo } from 'react'
import type { Address } from 'viem'
import { BigNumber } from 'ethers'
import { Descriptions, Skeleton, Card } from 'components/ui'
import _gtcr from 'assets/abis/LightGeneralizedTCR.json'
import styled from 'styled-components'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import {
  itemToStatusCode,
  STATUS_CODE,
  CONTRACT_STATUS,
  SUBGRAPH_RULING,
} from 'utils/item-status'
import ETHAddress from 'components/eth-address'
import ItemActionModal from './item-action-modal'
import ItemActionButton from 'components/item-action-button'
import { LightTCRViewContext } from 'contexts/light-tcr-view-context'
import useHumanizedCountdown from 'hooks/countdown'
import useAppealTime from 'hooks/appeal-time'
import ETHAmount from 'components/eth-amount'
import useNativeCurrency from 'hooks/native-currency'
import { klerosAddresses } from 'config/tcr-addresses'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'

export const StyledDescriptions = styled(Descriptions)`
  width: 100%;
  flex-wrap: wrap;
  justify-content: space-between;
  flex-direction: column;
  margin-right: 0;
  max-width: none;

  > div {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 12px;
    overflow: visible;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  > div > div {
    min-width: 0;
    min-height: 68px;
    padding: 14px 16px;
    border: 1px solid var(--v2-stroke);
    border-radius: 3px;
    background: var(--v2-soft);
  }

  > div > div > span:first-child {
    display: block;
    margin: 0 0 5px;
    color: var(--v2-muted);
    font-size: 12px;
    line-height: 16px;
    font-weight: 700;
  }

  > div > div > span:last-child {
    display: block;
    min-width: 0;
    color: var(--v2-text);
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    > div {
      grid-template-columns: 1fr;
    }
  }
`
const SkeletonTitleProps = { width: 60 }

const StyledSkeleton = styled(Skeleton)`
  display: inline;

  .ui-skeleton-title {
    margin: -3px 0;
  }
`

export const StyledItemStatusCard = styled(Card)`
  display: flex;
  flex-direction: column;
  margin-top: -16px;
  border: 1px solid var(--klerosUIComponentsStroke) !important;
  border-top: 0;
  border-radius: 0 0 3px 3px;
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);

  .ui-card-head {
    background: var(--v2-card);
    color: var(--v2-text);
    border-color: var(--v2-stroke);
  }

  .ui-card-head-wrapper {
    flex-wrap: wrap;
    gap: 16px 16px;
    padding: 16px 0;

    .ui-card-head-title {
      overflow: visible;
      padding: 0;
      color: var(--v2-text);
      font-size: 14px;
      line-height: 18px;
      font-weight: 700;
    }
    .ui-card-extra {
      margin-left: 0;
      padding: 0;
      color: var(--v2-text);
    }
  }

  & > .ui-card-body {
    padding: 0 32px 24px;

    @media (max-width: 760px) {
      padding: 0 16px 18px;
    }
  }
`

export const RequestActionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding: 18px 0 0;
  border-top: 1px solid var(--v2-stroke);
  background: transparent;

  > * {
    flex: 0 0 auto;
  }

  @media (max-width: 640px) {
    padding-top: 14px;

    > span,
    button,
    a {
      width: 100%;
    }
  }
`

interface RulingProps {
  currentRuling: string | null
}

export const Ruling = ({ currentRuling }: RulingProps) => {
  if (currentRuling == null)
    return (
      <StyledSkeleton active paragraph={false} title={SkeletonTitleProps} />
    )

  switch (currentRuling) {
    case 'None':
      return 'The arbitrator refused to rule.'
    case 'Accept':
      return 'The arbitrator ruled in favor of the requester.'
    case 'Reject':
      return 'The arbitrator ruled in favor of the challenger.'
    default:
      throw new Error(`Unhandled ruling ${currentRuling}`)
  }
}

interface LightRequest extends SubgraphRequest {
  deposit?: BigNumber
  disputeID: string
  arbitrator: string
}

interface ItemStatusCardProps {
  item: SubgraphItem
  timestamp?: BigNumber
  request: LightRequest
  modalOpen?: boolean
  setModalOpen: (open: boolean) => void
  appealCost?: BigNumber
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
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const {
    metaEvidence,
    challengePeriodDuration,
    tcrAddress,
    submissionDeposit,
    gtcrView,
  } = useContext(LightTCRViewContext) || {}

  // Get remaining appeal time, if any and build countdown.
  const { appealRemainingTime, appealRemainingTimeLoser } = useAppealTime(item)
  const appealCountdown = useHumanizedCountdown(appealRemainingTime)
  const appealLoserCountdown = useHumanizedCountdown(appealRemainingTimeLoser)
  const { arbitrator: klerosAddress, uiURL } = klerosAddresses[chainId] || {}

  // Get remaining challenge period, if applicable and build countdown.
  // Only pending (unresolved, undisputed) requests are challengeable —
  // resolved requests must not show a countdown even if the registry's
  // challenge period duration was increased since they resolved.
  const challengeRemainingTime = useMemo(() => {
    if (
      !item ||
      !request ||
      request.disputed ||
      request.resolved ||
      !request.submissionTime ||
      !challengePeriodDuration
    )
      return

    const deadline =
      (Number(request.submissionTime) + challengePeriodDuration.toNumber()) *
      1000
    return deadline - Date.now()
  }, [challengePeriodDuration, item, request])
  const challengeCountdown = useHumanizedCountdown(challengeRemainingTime)
  const nativeCurrency = useNativeCurrency()

  if (!item || !timestamp || !challengePeriodDuration || !request)
    return (
      <Card id="item-status-card">
        <Skeleton active title={false} paragraph={{ rows: 2 }} />
      </Card>
    )

  const currentRuling = item.requests?.[0]?.rounds?.[0]?.ruling ?? null
  const { disputed } = request
  const statusCode = itemToStatusCode(item, timestamp, challengePeriodDuration)
  if (statusCode === undefined) return null

  const bounty = request.deposit

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

  const { disputeID, arbitrator, resolved } = request
  const { metadata, fileURI } = metaEvidence || {}
  const { itemName } = metadata || {}

  const appealable =
    statusCode === STATUS_CODE.CROWDFUNDING_WINNER ||
    statusCode === STATUS_CODE.CROWDFUNDING
  const hasRequestAction =
    statusCode !== STATUS_CODE.CHALLENGED &&
    statusCode !== STATUS_CODE.WAITING_ARBITRATOR

  return (
    <>
      <StyledItemStatusCard id="item-status-card" title="Request details">
        <StyledDescriptions
          column={{ xxl: 3, xl: 3, lg: 2, md: 2, sm: 1, xs: 1 }}
        >
          {(statusCode === STATUS_CODE.SUBMITTED ||
            statusCode === STATUS_CODE.REMOVAL_REQUESTED) && (
            <>
              <Descriptions.Item label="Bounty">
                <ETHAmount
                  amount={bounty}
                  decimals={3}
                  displayUnit={` ${nativeCurrency}`}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Request Type">
                {item.status === CONTRACT_STATUS.REGISTRATION_REQUESTED
                  ? `Submission`
                  : `Removal`}
              </Descriptions.Item>
            </>
          )}
          <Descriptions.Item label="Requester">
            <ETHAddress address={request.requester} />
          </Descriptions.Item>
          {disputed && Number(disputeID) !== 0 && (
            <>
              <Descriptions.Item label="Challenger">
                <ETHAddress address={request.challenger} />
              </Descriptions.Item>
              <Descriptions.Item label="Dispute ID">
                {klerosAddress?.toLowerCase() === arbitrator?.toLowerCase() ? (
                  <a href={uiURL?.replace(':disputeID', disputeID.toString())}>
                    {disputeID.toString()}
                  </a>
                ) : (
                  disputeID.toString()
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Arbitrator">
                <ETHAddress address={arbitrator} />
              </Descriptions.Item>
            </>
          )}
          {appealable && (
            <Descriptions.Item label="Dispute Status">
              Appealable
            </Descriptions.Item>
          )}
          {disputed && (resolved || appealable) && (
            <Descriptions.Item label={appealable ? 'Current Ruling' : 'Ruling'}>
              <Ruling currentRuling={currentRuling} />
            </Descriptions.Item>
          )}
          {!disputed && (challengeRemainingTime ?? 0) > 0 && (
            <Descriptions.Item label="Challenge period ends">
              {challengeCountdown}
            </Descriptions.Item>
          )}
          {currentRuling === SUBGRAPH_RULING.NONE &&
            statusCode === STATUS_CODE.CROWDFUNDING && (
              <Descriptions.Item label="Remaining Time">
                {appealCountdown}
              </Descriptions.Item>
            )}
          {currentRuling !== SUBGRAPH_RULING.NONE && appealable && (
            <Descriptions.Item label="Winner Appeal Time">
              {appealCountdown}
            </Descriptions.Item>
          )}
          {currentRuling !== SUBGRAPH_RULING.NONE &&
            statusCode === STATUS_CODE.CROWDFUNDING && (
              <Descriptions.Item label="Loser Appeal Time">
                {appealLoserCountdown}
              </Descriptions.Item>
            )}
        </StyledDescriptions>
        {hasRequestAction && (
          <RequestActionBar>
            <ItemActionButton
              statusCode={statusCode}
              itemName={itemName}
              itemID={item && item.itemID}
              onClick={onClick}
              type="secondary"
            />
          </RequestActionBar>
        )}
      </StyledItemStatusCard>
      {statusCode !== STATUS_CODE.PENDING_SUBMISSION &&
        statusCode !== STATUS_CODE.PENDING_REMOVAL &&
        statusCode !== STATUS_CODE.CHALLENGED && (
          <ItemActionModal
            statusCode={statusCode}
            itemName={itemName || 'item'}
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
