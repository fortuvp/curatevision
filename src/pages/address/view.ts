import type { EntryStatusView } from 'components/curate/entry-status'
import { ZERO_ADDRESS } from 'pages/dashboard/data'
import type { RegistryKind } from 'pages/dashboard/types'
import type { AddressStats, ProfileActivity } from './data'

/*
 * Pure helpers for the curator profile: which actions a filter shows, the
 * status each action is rendered with, the window the data covers and the
 * chains the address is active on. Everything derives from the data layer.
 */

export const PAGE_SIZE = 20

export type ActivityFilter =
  | 'all'
  | 'submission'
  | 'removal'
  | 'challenge'
  | 'disputed'

export const FILTERS: { value: ActivityFilter; label: string }[] = [
  { value: 'all', label: 'All actions' },
  { value: 'submission', label: 'Submissions' },
  { value: 'removal', label: 'Removals' },
  { value: 'challenge', label: 'Challenges' },
  { value: 'disputed', label: 'Disputed' },
]

export const parseFilter = (value: string | null): ActivityFilter =>
  FILTERS.some((filter) => filter.value === value)
    ? (value as ActivityFilter)
    : 'all'

/** The actions a filter shows. "Disputed" is the data layer's own list. */
export const filterActivities = (
  activities: ProfileActivity[],
  disputes: ProfileActivity[],
  filter: ActivityFilter,
): ProfileActivity[] => {
  if (filter === 'all') return activities
  if (filter === 'disputed') return disputes
  return activities.filter((activity) => activity.kind === filter)
}

export const filterCount = (
  activities: ProfileActivity[],
  disputes: ProfileActivity[],
  filter: ActivityFilter,
): number => filterActivities(activities, disputes, filter).length

/**
 * What the request behind an action is up to, from the state the data layer
 * carries: nothing when it says nothing, "pending" while the request is
 * unresolved, "in court" while its dispute is open, then the ruling seen
 * from this address's side (Accept favors the requester, Reject the
 * challenger, None is no ruling).
 */
const activityDetail = (activity: ProfileActivity): string | undefined => {
  if (activity.disputed) {
    if (activity.resolved === false) return 'in court'
    if (activity.resolved !== true) return undefined
    const outcome = activity.disputeOutcome
    if (outcome === 'None') return 'no ruling'
    if (outcome !== 'Accept' && outcome !== 'Reject') return 'dispute resolved'
    const requesterWon = outcome === 'Accept'
    const won = activity.kind === 'challenge' ? !requesterWon : requesterWon
    return won ? 'dispute won' : 'dispute lost'
  }
  if (activity.resolved === false) return 'pending'
  return undefined
}

/**
 * Dot and label for an action. Actions are events, not entry states, so the
 * dot stays grey; it turns amber only while the request's dispute is still
 * open. The label is the data layer's own wording ("Submitted entry",
 * "Challenged dispute #12").
 */
export const activityStatus = (activity: ProfileActivity): EntryStatusView => ({
  tone:
    activity.disputed && activity.resolved === false ? 'contested' : 'neutral',
  label: activity.status,
  detail: activityDetail(activity),
})

/** The counterparty of an action, if the data names one. */
export const otherParty = (
  activity: ProfileActivity,
  address: string,
): string | undefined =>
  [activity.actor, activity.secondaryActor].find(
    (party) => party && party !== address && party !== ZERO_ADDRESS,
  )

export const registryHref = (activity: ProfileActivity): string =>
  `/tcr/${activity.chainId}/${activity.registryAddress}`

/** Oldest and newest timestamps among the listed actions. */
export const coverage = (
  activities: ProfileActivity[],
): { oldest: number; newest: number } | undefined => {
  let oldest = Number.POSITIVE_INFINITY
  let newest = 0
  for (const activity of activities) {
    if (activity.timestamp <= 0) continue
    oldest = Math.min(oldest, activity.timestamp)
    newest = Math.max(newest, activity.timestamp)
  }
  return newest > 0 ? { oldest, newest } : undefined
}

export interface ChainActivity {
  chainId: number
  stats: AddressStats
}

/** Chains where the address acted or governs a list, busiest first. */
export const activeChains = (
  breakdown: Record<number, AddressStats> | undefined,
): ChainActivity[] =>
  Object.entries(breakdown ?? {})
    .map(([chainId, stats]) => ({ chainId: Number(chainId), stats }))
    .filter(({ stats }) => stats.activity > 0 || stats.governedLists > 0)
    .sort((a, b) => b.stats.activity - a.stats.activity)

export const kindLabel = (kind: RegistryKind): string => {
  if (kind === 'light') return 'Light'
  if (kind === 'permanent') return 'Stake'
  return 'Classic'
}

const integer = new Intl.NumberFormat('en-US')
export const formatInt = (value: number): string =>
  integer.format(Math.round(value))
