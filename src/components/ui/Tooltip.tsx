import React, { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { overlayPanel } from './kit-styles'

type Placement = 'top' | 'bottom' | 'left' | 'right'

const Wrapper = styled.span`
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
`

/* Small floating panel like the menus: surface, strong hairline, no arrow. */
const TooltipBubble = styled.div`
  position: fixed;
  z-index: 1070;
  width: max-content;
  max-width: 280px;
  padding: 6px 10px;
  ${overlayPanel}
  border-radius: var(--radius-sm);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  pointer-events: none;
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
        transform: 'translate(-50%, 0) translateY(6px)',
      }
    case 'left':
      return {
        top: rect.top + rect.height / 2,
        left: rect.left,
        transform: 'translate(-100%, -50%) translateX(-6px)',
      }
    case 'right':
      return {
        top: rect.top + rect.height / 2,
        left: rect.right,
        transform: 'translate(0, -50%) translateX(6px)',
      }
    case 'top':
    default:
      return {
        top: rect.top,
        left: rect.left + rect.width / 2,
        transform: 'translate(-50%, -100%) translateY(-6px)',
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
