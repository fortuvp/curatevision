import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { joinClassNames, monoData } from './kit-styles'

/*
 * Progress rail (DESIGN.md, Shapes): 4px tall, radius 2, raised track; the
 * fill carries a status role (window while running, registered when done,
 * off on failure). A caller may hand in its own strokeColor.
 */
const sheen = keyframes`
  0% { transform: translateX(-100%); opacity: 0.35; }
  70% { transform: translateX(100%); opacity: 0; }
  100% { transform: translateX(100%); opacity: 0; }
`

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
`

const Rail = styled.div`
  position: relative;
  flex: 1;
  min-width: 0;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--color-raised);
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
  border-radius: 2px;
  background: ${({ $status, $strokeColor }) =>
    fillColor($status, $strokeColor)};
  transition: width 300ms ease;

  ${({ $status }) =>
    $status === 'active' &&
    css`
      &::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: var(--color-on-primary);
        opacity: 0;
        animation: ${sheen} 2.4s ease infinite;
      }

      @media (prefers-reduced-motion: reduce) {
        &::after {
          animation: none;
        }
      }
    `}
`

const Info = styled.span`
  flex: 0 0 auto;
  min-width: 40px;
  color: var(--color-muted);
  ${monoData}
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
