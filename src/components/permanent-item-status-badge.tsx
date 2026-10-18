import React from 'react'
import type { BigNumber } from 'ethers'
import {
  SkeletonBlock,
  Status,
  type StatusTone,
} from 'components/curate/primitives'
import { STATUS_CODE, STATUS_ROLE } from 'utils/permanent-item-status'

/*
 * Stake Curate status as DESIGN.md wants it: a dot in the status role and a
 * plain-language label. Used where only the status code is known (list
 * cards). The item page uses <EntryStatus> from stakeEntryStatus, which adds
 * the time left to the same labels.
 */

export const STAKE_STATUS_LABEL: Record<number, string> = {
  [STATUS_CODE.REJECTED]: 'Rejected',
  [STATUS_CODE.PENDING]: 'Pending',
  [STATUS_CODE.ACCEPTED]: 'Accepted',
  [STATUS_CODE.DISPUTED]: 'Disputed',
  [STATUS_CODE.CROWDFUNDING]: 'Appeal open',
  [STATUS_CODE.CROWDFUNDING_WINNER]: 'Appeal · winner funding',
  [STATUS_CODE.WAITING_ARBITRATOR]: 'Awaiting ruling',
  [STATUS_CODE.PENDING_WITHDRAWAL]: 'Withdrawal ready',
  [STATUS_CODE.REMOVED]: 'Removed',
  [STATUS_CODE.WITHDRAWN]: 'Withdrawn',
}

export const stakeStatusTone = (statusCode: number): StatusTone =>
  (STATUS_ROLE as Record<number, StatusTone>)[statusCode] ?? 'neutral'

interface ItemStatusBadgeProps {
  item?: SubgraphItem
  timestamp?: BigNumber
  statusCode?: number | null
  /** Kept for existing callers; the dot carries the role color in every theme. */
  dark?: boolean | null
  /** "2d 4h until accepted", "jurors deciding" */
  detail?: React.ReactNode
}

const ItemStatusBadge = ({ statusCode, detail }: ItemStatusBadgeProps) => {
  if (typeof statusCode !== 'number')
    return <SkeletonBlock $width="96px" $height="18px" />

  const label = STAKE_STATUS_LABEL[statusCode]
  if (!label) throw new Error(`Unhandled status code ${statusCode}`)

  return (
    <Status tone={stakeStatusTone(statusCode)} label={label} detail={detail} />
  )
}

export default ItemStatusBadge
