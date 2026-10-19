import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'

type Placement = 'top' | 'bottom' | 'left' | 'right'

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
`

const tipIn = keyframes`
  from { opacity: 0; scale: 0.96; }
  to { opacity: 1; scale: 1; }
`

/*
 * Glass tip: a small blurred surface with a hairline, radius 10, no arrow.
 * It fades and grows in with the individual scale property, so it composes
 * with the inline placement transform.
 */
const TooltipBubble = styled.div`
  position: fixed;
  z-index: 1070;
  width: max-content;
  max-width: 280px;
  padding: 7px 11px;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: color-mix(in srgb, var(--color-surface) 82%, transparent);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    var(--shadow-overlay);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  color: var(--color-text);
  font-size: 12px;
  line-height: 17px;
  pointer-events: none;
  animation: ${tipIn} 160ms var(--ease-out) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

interface TooltipProps {
  title?: React.ReactNode
  placement?: Placement
  children?: React.ReactNode
  mouseEnterDelay?: number
  mouseLeaveDelay?: number
}

const getPositionStyle = (
  placement: Placement,
  rect: DOMRect,
): React.CSSProperties => {
  switch (placement) {
    case 'bottom':
      return {
        top: rect.bottom,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, 0) translateY(8px)',
      }
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left,
        transform: 'translate(-100%, -50%) translateX(-8px)',
      }
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right,
        transform: 'translate(0, -50%) translateX(8px)',
      }
    case 'top':
    default:
      return {
        top: rect.top,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%) translateY(-8px)',
      }
  }
}

const Tooltip: React.FC<TooltipProps> = ({
  title,
  placement = 'top',
  children,
  mouseEnterDelay = 0.1,
  mouseLeaveDelay = 0.1,
}) => {
  const [visible, setVisible] = useState(false)
  const [posStyle, setPosStyle] = useState<React.CSSProperties>({})
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePosition = useCallback(() => {
    if (!wrapperRef.current) return
    const rect = wrapperRef.current.getBoundingClientRect()
    setPosStyle(getPositionStyle(placement, rect))
  }, [placement])

  const handleEnter = useCallback(() => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current)
    enterTimer.current = setTimeout(() => {
      updatePosition()
      setVisible(true)
    }, mouseEnterDelay * 1000)
  }, [mouseEnterDelay, updatePosition])

  const handleLeave = useCallback(() => {
    if (enterTimer.current) clearTimeout(enterTimer.current)
    leaveTimer.current = setTimeout(() => {
      setVisible(false)
    }, mouseLeaveDelay * 1000)
  }, [mouseLeaveDelay])

  useEffect(
    () => () => {
      if (enterTimer.current) clearTimeout(enterTimer.current)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    },
    [],
  )

  if (!title) return <>{children}</>

  return (
    <Wrapper
      ref={wrapperRef}
      className="ui-tooltip-trigger"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocus={handleEnter}
      onBlur={handleLeave}
    >
      {children}
      {visible &&
        createPortal(
          <TooltipBubble role="tooltip" className="ui-tooltip" style={posStyle}>
            {title}
          </TooltipBubble>,
          document.body,
        )}
    </Wrapper>
  )
}

export default Tooltip
