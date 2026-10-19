import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { figureData, joinClassNames } from './kit-styles'

/*
 * Progress rail, v2: a 6px pill. The unfunded part is hatched, the filled
 * part carries a status role with a soft glow (window while running,
 * registered when done, off on failure) and draws in from zero on mount.
 * While a run is active a bright head marks its leading edge. A caller may
 * hand in its own strokeColor. The fill is the measure: percent complete.
 */
/* Negative insets keep the glow and the head unclipped while it draws. */
const drawIn = keyframes`
  from { clip-path: inset(-12px 100% -12px -12px); }
  to { clip-path: inset(-12px -12px -12px -12px); }
`

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
`

const Rail = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  height: 6px;
  border-radius: var(--radius-pill);
  background:
    repeating-linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-text) 9%, transparent) 0 2px,
      transparent 2px 6px
    ),
    var(--color-raised);
`

const fillColor = (status: string, strokeColor?: string): string => {
  if (strokeColor) return strokeColor
  switch (status) {
    case 'success':
      return 'var(--status-registered)'
    case 'exception':
      return 'var(--status-off)'
    default:
      return 'var(--status-window)'
  }
}

const Fill = styled.div<{
  $status: string
  $strokeColor?: string
  $percent: number
}>`
  position: relative;
  height: 100%;
  width: ${({ $percent }) => `${Math.min(Math.max($percent, 0), 100)}%`};
  border-radius: var(--radius-pill);
  background: ${({ $status, $strokeColor }) =>
    fillColor($status, $strokeColor)};
  box-shadow: 0 0 12px
    color-mix(
      in srgb,
      ${({ $status, $strokeColor }) => fillColor($status, $strokeColor)} 55%,
      transparent
    );
  transition: width var(--dur-figure) var(--ease-out);
  animation: ${drawIn} var(--dur-figure) var(--ease-out) 120ms backwards;

  ${({ $status, $percent }) =>
    $status === 'active' &&
    $percent > 0 &&
    css`
      &::after {
        content: '';
        position: absolute;
        top: 50%;
        right: -2px;
        width: 10px;
        height: 10px;
        border-radius: var(--radius-pill);
        background: var(--color-surface);
        box-shadow:
          0 0 0 2px var(--status-window),
          0 0 12px var(--status-window);
        transform: translateY(-50%);
      }
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Info = styled.span`
  flex: 0 0 auto;
  min-width: 40px;
  color: var(--color-muted);
  ${figureData}
  text-align: right;
`

interface ProgressProps {
  percent?: number
  status?: 'normal' | 'active' | 'success' | 'exception'
  showInfo?: boolean
  strokeColor?: string
  style?: React.CSSProperties
  className?: string
}

const Progress: React.FC<ProgressProps> = ({
  percent = 0,
  status = 'normal',
  showInfo = true,
  strokeColor,
  style,
  className,
}) => {
  const effectiveStatus =
    status === 'normal' && percent >= 100 ? 'success' : status
  const value = Math.round(Math.min(Math.max(percent, 0), 100))

  return (
    <Wrapper
      style={style}
      className={joinClassNames(
        'ui-progress',
        `ui-progress-${effectiveStatus}`,
        className,
      )}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <Rail className="ui-progress-rail">
        <Fill
          className="ui-progress-fill"
          $percent={percent}
          $status={effectiveStatus}
          $strokeColor={strokeColor}
        />
      </Rail>
      {showInfo && <Info className="ui-progress-info">{value}%</Info>}
    </Wrapper>
  )
}

export default Progress
