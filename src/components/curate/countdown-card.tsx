import React from 'react'
import styled from 'styled-components'
import {
  Data,
  Figure,
  Label,
  Rail,
  Small,
  Surface,
  type StatusTone,
} from './primitives'
import { formatAbsolute, formatDate, windowProgress } from 'utils/time'

/*
 * Countdown card (DESIGN.md, Components): figure in mono, unit line, a 4px
 * rail between the start and the deadline, both dates in small mono, one
 * action. Deadlines are written both ways: relative, and absolute on hover.
 */

const Shell = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const Dates = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`

const splitDuration = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days > 0) return { figure: `${days}d ${hours}h`, unit: 'days and hours' }
  if (hours > 0)
    return { figure: `${hours}h ${minutes}m`, unit: 'hours and minutes' }
  if (minutes > 0) return { figure: `${minutes}m`, unit: 'minutes' }
  return { figure: `${s}s`, unit: 'seconds' }
}

export const CountdownCard = ({
  title,
  start,
  deadline,
  now,
  tone = 'window',
  verb = 'left',
  passedLabel = 'Window closed',
  action,
  hint,
}: {
  /** Mono eyebrow, e.g. "Challenge window" */
  title: string
  /** Unix seconds when the window opened */
  start: number
  /** Unix seconds when it closes */
  deadline: number
  now: number
  tone?: StatusTone
  /** Follows the figure: "left to challenge" */
  verb?: string
  passedLabel?: string
  action?: React.ReactNode
  hint?: React.ReactNode
}) => {
  const left = deadline - now
  const passed = left <= 0
  const { figure, unit } = splitDuration(left)
  return (
    <Shell
      $padding="compact"
      role="group"
      aria-label={`${title}: ${passed ? passedLabel : `${figure} ${verb}`}`}
    >
      <Label>{title}</Label>
      <div title={formatAbsolute(deadline)}>
        <Figure>{passed ? passedLabel : figure}</Figure>
        <Small $muted>
          {passed ? `closed ${formatAbsolute(deadline)}` : `${unit} ${verb}`}
        </Small>
      </div>
      <Rail $value={windowProgress(start, deadline, now)} $tone={tone} />
      <Dates>
        <Data $muted $weight={400} title={formatAbsolute(start)}>
          {formatDate(start)}
        </Data>
        <Data $muted $weight={400} title={formatAbsolute(deadline)}>
          {formatAbsolute(deadline)}
        </Data>
      </Dates>
      {hint && <Small $muted>{hint}</Small>}
      {action}
    </Shell>
  )
}

export default CountdownCard
