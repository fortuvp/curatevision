import React from 'react'
import styled from 'styled-components'
import { Label, Surface, type StatusTone } from './primitives'
import { reveal } from './motion/reveal'
import { RingGauge } from './motion/ring-gauge'
import {
  formatAbsolute,
  formatDuration,
  formatDurationLong,
  windowProgress,
} from 'utils/time'

/*
 * Countdown card: a RingGauge read like a fuel gauge. Its scale runs from 0h
 * (left end) to the window's length (right end) and the arc is the time still
 * left, so the glowing head points at the same value the centre figure
 * spells out and the arc shortens as the window runs. Both dates sit under
 * it. Deadlines are written both ways: relative in the ring, absolute in UTC
 * under it and on hover. Under a tenth of the window left, the head pulses.
 */

const Shell = styled(Surface)`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  ${reveal}
`

const Bare = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
  min-width: 0;
  ${reveal}
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const Remaining = styled.span<{ $tone: StatusTone }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  i {
    width: 14px;
    height: 3px;
    border-radius: var(--radius-pill);
    background: var(--status-${({ $tone }) => $tone});
    box-shadow: 0 0 8px var(--status-${({ $tone }) => $tone});
  }
`

const RingRow = styled.div`
  display: flex;
  justify-content: center;
  padding: 4px 0;
`

const Passed = styled.span`
  display: block;
  max-width: 9ch;
  color: var(--color-muted);
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 20px;
  letter-spacing: -0.01em;
  text-wrap: balance;
  white-space: normal;
`

/** Tone → arc colours: tail to head; only the head glows. */
const toneArc = (tone: StatusTone): { from: string; to: string } => {
  switch (tone) {
    case 'contested':
      return {
        from: 'color-mix(in srgb, var(--status-contested) 35%, var(--color-raised))',
        to: 'var(--status-contested)',
      }
    case 'registered':
      return {
        from: 'color-mix(in srgb, var(--status-registered) 35%, var(--color-raised))',
        to: 'var(--status-registered)',
      }
    case 'off':
      return {
        from: 'color-mix(in srgb, var(--status-off) 35%, var(--color-raised))',
        to: 'var(--status-off)',
      }
    case 'neutral':
      return { from: 'var(--color-raised)', to: 'var(--color-muted)' }
    default:
      return { from: 'var(--aurora-b)', to: 'var(--color-primary)' }
  }
}

const Dates = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  margin: 0;
  padding-top: 14px;
  border-top: 1px solid var(--glass-border);

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  div + div {
    align-items: flex-end;
    text-align: right;
  }

  dd {
    margin: 0;
    color: var(--color-text);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
    font-variant-numeric: tabular-nums;
  }
`

const Hint = styled.p`
  margin: 0;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const splitDuration = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / 86400)
  const hours = Math.floor((s % 86400) / 3600)
  const minutes = Math.floor((s % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m`
  return `${s}s`
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
  size = 'md',
  bare = false,
}: {
  /** Eyebrow, e.g. "Challenge window" */
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
  /** Ring size: md (184px) for rails, lg (224px) for a hero panel. */
  size?: 'md' | 'lg'
  /** Without its own panel, for use inside another panel. */
  bare?: boolean
}) => {
  const left = deadline - now
  const passed = left <= 0
  const figure = splitDuration(left)
  // The arc is the time left: it shortens as the window runs.
  const remaining = 1 - windowProgress(start, deadline, now)
  const leftShare = Math.round(remaining * 100)
  const ringSize = size === 'lg' ? 224 : 184
  const span = Math.max(0, deadline - start)
  const { from, to } = toneArc(tone)
  const ariaLabel = `${title}: ${passed ? passedLabel : `${figure} ${verb}`}`
  const body = (
    <>
      <Head>
        <Label>{title}</Label>
        <Remaining $tone={tone}>
          <i aria-hidden />
          {passed ? 'Window over' : `${leftShare}% left`}
        </Remaining>
      </Head>
      <RingRow title={formatAbsolute(deadline)}>
        <RingGauge
          ratio={remaining}
          size={ringSize}
          from={from}
          to={to}
          label={`${title}: ${
            passed
              ? passedLabel
              : `${figure} ${verb}, ${leftShare}% of the ${formatDurationLong(span)} window`
          }`}
          value={passed ? <Passed>{passedLabel}</Passed> : figure}
          caption={passed ? undefined : verb}
          endLabels={span > 0 ? ['0h', formatDuration(span)] : undefined}
          urgent={!passed && span > 0 && left / span < 0.1}
        />
      </RingRow>
      <Dates>
        <div>
          <dt>
            <Label $tone="faint">Opened</Label>
          </dt>
          <dd title={formatAbsolute(start)}>{formatAbsolute(start)}</dd>
        </div>
        <div>
          <dt>
            <Label $tone="faint">{passed ? 'Closed' : 'Closes'}</Label>
          </dt>
          <dd title={formatAbsolute(deadline)}>{formatAbsolute(deadline)}</dd>
        </div>
      </Dates>
      {hint && <Hint>{hint}</Hint>}
      {action}
    </>
  )
  return bare ? (
    <Bare role="group" aria-label={ariaLabel}>
      {body}
    </Bare>
  ) : (
    <Shell $padding="compact" role="group" aria-label={ariaLabel}>
      {body}
    </Shell>
  )
}

export default CountdownCard
