import React from 'react'
import type { BigNumber } from 'ethers'
import { Status, type StatusTone } from './primitives'
import { formatDuration } from 'utils/time'
import {
  STATUS_CODE as LIGHT_STATUS,
  itemToStatusCode as lightStatusCode,
} from 'utils/item-status'
import {
  STATUS_CODE as STAKE_STATUS,
  itemToStatusCode as stakeStatusCode,
} from 'utils/permanent-item-status'

/*
 * Entry status as DESIGN.md wants it: a dot in the status role, a plain
 * label, and the time left wherever the entry appears. The deadline comes
 * from the same request data the status is derived from.
 */

export interface EntryStatusView {
  code?: number
  tone: StatusTone
  label: string
  /** Unix seconds; rendered as "2d 4h to challenge" and ticking. */
  deadline?: number
  /** Follows the countdown: "to challenge", "to fund", "left". */
  deadlineVerb?: string
  /** Shown when there is no deadline, or once it has passed. */
  detail?: string
  /** Shown once the deadline has passed instead of `detail`. */
  passedDetail?: string
}

const toNum = (value: unknown): number => {
  if (value === undefined || value === null) return 0
  if (typeof value === 'object' && 'toNumber' in (value as object))
    return (value as BigNumber).toNumber()
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Light and Classic Curate (utils/item-status.ts). */
export const lightEntryStatus = (
  item: SubgraphItem | undefined,
  timestamp: BigNumber | null | undefined,
  challengePeriodDuration: BigNumber | null | undefined,
): EntryStatusView | undefined => {
  if (!item || !timestamp || !challengePeriodDuration) return undefined
  const code = lightStatusCode(item, timestamp, challengePeriodDuration)
  if (code === undefined) return undefined
  const request = item.requests?.[0] as
    | {
        submissionTime?: string
        rounds?: { appealPeriodStart: string; appealPeriodEnd: string }[]
      }
    | undefined
  const round = request?.rounds?.[0]
  const submissionTime = toNum(request?.submissionTime)
  const windowEnd = submissionTime + challengePeriodDuration.toNumber()
  const appealStart = toNum(round?.appealPeriodStart)
  const appealEnd = toNum(round?.appealPeriodEnd)
  const appealHalf = appealStart + (appealEnd - appealStart) / 2

  switch (code) {
    case LIGHT_STATUS.REGISTERED:
      return { code, tone: 'registered', label: 'Registered' }
    case LIGHT_STATUS.SUBMITTED:
      return {
        code,
        tone: 'window',
        label: 'Submitted',
        deadline: windowEnd,
        deadlineVerb: 'to challenge',
        passedDetail: 'window closed',
      }
    case LIGHT_STATUS.REMOVAL_REQUESTED:
      return {
        code,
        tone: 'window',
        label: 'Removal requested',
        deadline: windowEnd,
        deadlineVerb: 'to challenge',
        passedDetail: 'window closed',
      }
    case LIGHT_STATUS.PENDING_SUBMISSION:
      return {
        code,
        tone: 'neutral',
        label: 'Ready to execute',
        detail: 'unchallenged submission',
      }
    case LIGHT_STATUS.PENDING_REMOVAL:
      return {
        code,
        tone: 'neutral',
        label: 'Ready to execute',
        detail: 'unchallenged removal',
      }
    case LIGHT_STATUS.CHALLENGED:
      return {
        code,
        tone: 'contested',
        label: 'Challenged',
        detail: 'jurors deciding',
      }
    case LIGHT_STATUS.CROWDFUNDING:
      return {
        code,
        tone: 'contested',
        label: 'Appeal open',
        deadline: timestamp.toNumber() < appealHalf ? appealHalf : appealEnd,
        deadlineVerb:
          timestamp.toNumber() < appealHalf
            ? 'for the loser to fund'
            : 'to fund',
        passedDetail: 'appeal closing',
      }
    case LIGHT_STATUS.CROWDFUNDING_WINNER:
      return {
        code,
        tone: 'contested',
        label: 'Appeal · winner funding',
        deadline: appealEnd,
        deadlineVerb: 'left',
        passedDetail: 'appeal closing',
      }
    case LIGHT_STATUS.WAITING_ARBITRATOR:
      return {
        code,
        tone: 'contested',
        label: 'Awaiting ruling',
        detail: 'appeal period over',
      }
    case LIGHT_STATUS.WAITING_ENFORCEMENT:
      return {
        code,
        tone: 'contested',
        label: 'Ruling final',
        detail: 'awaiting enforcement',
      }
    case LIGHT_STATUS.REJECTED:
      return { code, tone: 'off', label: 'Rejected' }
    case LIGHT_STATUS.REMOVED:
      return { code, tone: 'off', label: 'Removed' }
    default:
      return undefined
  }
}

/** Stake Curate (utils/permanent-item-status.ts). */
export const stakeEntryStatus = (
  item: SubgraphItem | undefined,
  timestamp: BigNumber | null | undefined,
  registry: SubgraphRegistry | undefined,
): EntryStatusView | undefined => {
  if (!item || !timestamp || !registry) return undefined
  const code = stakeStatusCode(item, timestamp, registry)
  if (code === undefined) return undefined
  const includedAt = toNum(item.includedAt)
  const period =
    item.status === 'Reincluded'
      ? toNum(registry.reinclusionPeriod)
      : toNum(registry.submissionPeriod)
  const withdrawingAt = toNum(item.withdrawingTimestamp)
  const withdrawing =
    withdrawingAt > 0 && code !== STAKE_STATUS.PENDING_WITHDRAWAL
      ? ` · withdrawing`
      : ''
  const round = (
    item.challenges as
      | { rounds: { appealPeriodStart: string; appealPeriodEnd: string }[] }[]
      | undefined
  )?.[0]?.rounds?.[0]
  const appealStart = toNum(round?.appealPeriodStart)
  const appealEnd = toNum(round?.appealPeriodEnd)
  const appealHalf = appealStart + (appealEnd - appealStart) / 2

  switch (code) {
    case STAKE_STATUS.ACCEPTED:
      return { code, tone: 'registered', label: `Accepted${withdrawing}` }
    case STAKE_STATUS.PENDING:
      return {
        code,
        tone: 'window',
        label: `Pending${withdrawing}`,
        deadline: includedAt + period,
        deadlineVerb: 'until accepted',
        passedDetail: 'accepted',
      }
    case STAKE_STATUS.DISPUTED:
      return {
        code,
        tone: 'contested',
        label: 'Disputed',
        detail: 'jurors deciding',
      }
    case STAKE_STATUS.CROWDFUNDING:
      return {
        code,
        tone: 'contested',
        label: 'Appeal open',
        deadline: timestamp.toNumber() < appealHalf ? appealHalf : appealEnd,
        deadlineVerb:
          timestamp.toNumber() < appealHalf
            ? 'for the loser to fund'
            : 'to fund',
        passedDetail: 'appeal closing',
      }
    case STAKE_STATUS.CROWDFUNDING_WINNER:
      return {
        code,
        tone: 'contested',
        label: 'Appeal · winner funding',
        deadline: appealEnd,
        deadlineVerb: 'left',
        passedDetail: 'appeal closing',
      }
    case STAKE_STATUS.WAITING_ARBITRATOR:
      return {
        code,
        tone: 'contested',
        label: 'Awaiting ruling',
        detail: 'appeal period over',
      }
    case STAKE_STATUS.PENDING_WITHDRAWAL:
      return {
        code,
        tone: 'neutral',
        label: 'Withdrawal ready',
        detail: 'can be executed',
      }
    case STAKE_STATUS.REJECTED:
      return { code, tone: 'off', label: 'Rejected' }
    case STAKE_STATUS.REMOVED:
      return { code, tone: 'off', label: 'Removed' }
    case STAKE_STATUS.WITHDRAWN:
      return { code, tone: 'off', label: 'Withdrawn' }
    default:
      return undefined
  }
}

export const statusDetail = (
  status: EntryStatusView,
  now: number,
): string | undefined => {
  if (status.deadline) {
    const left = status.deadline - now
    if (left > 0)
      return `${formatDuration(left)} ${status.deadlineVerb ?? 'left'}`
    return status.passedDetail ?? status.detail
  }
  return status.detail
}

export const EntryStatus = ({
  status,
  now,
}: {
  status: EntryStatusView
  now: number
}) => (
  <Status
    tone={status.tone}
    label={status.label}
    detail={statusDetail(status, now)}
    title={
      status.deadline
        ? new Date(status.deadline * 1000).toUTCString()
        : undefined
    }
  />
)

export default EntryStatus
