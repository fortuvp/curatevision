import React, { useState, useRef, useEffect, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, overlayPanel } from './kit-styles'

type PopoverPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'

const Wrapper = styled.span`
  position: relative;
  display: inline-flex;
`

const getPlacementStyles = (placement: PopoverPlacement) => {
  switch (placement) {
    case 'bottom':
      return css`
        top: 100%;
        left: 50%;
        margin-top: 6px;
        transform: translateX(-50%);
      `
    case 'bottomLeft':
      return css`
        top: 100%;
        left: 0;
        margin-top: 6px;
      `
    case 'bottomRight':
      return css`
        top: 100%;
        right: 0;
        margin-top: 6px;
      `
    case 'topLeft':
      return css`
        bottom: 100%;
        left: 0;
        margin-bottom: 6px;
      `
    case 'topRight':
      return css`
        bottom: 100%;
        right: 0;
        margin-bottom: 6px;
      `
    case 'left':
      return css`
        top: 50%;
        right: 100%;
        margin-right: 6px;
        transform: translateY(-50%);
      `
    case 'right':
      return css`
        top: 50%;
        left: 100%;
        margin-left: 6px;
        transform: translateY(-50%);
      `
    case 'top':
    default:
      return css`
        bottom: 100%;
        left: 50%;
        margin-bottom: 6px;
        transform: translateX(-50%);
      `
  }
}

/* Floating panel like the app bar's menus; no arrow. */
const PopoverContent = styled.div<{ $placement: PopoverPlacement }>`
  position: absolute;
  z-index: 1060;
  min-width: 200px;
  max-width: 360px;
  ${overlayPanel}
  ${({ $placement }) => getPlacementStyles($placement)}
`

const PopoverTitle = styled.div`
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
`

const PopoverInner = styled.div`
  padding: 12px 14px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
`

interface PopoverProps {
  placement?: PopoverPlacement
  title?: React.ReactNode
  content?: React.ReactNode
  trigger?: 'hover' | 'click'
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
  arrowPointAtCenter?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const Popover: React.FC<PopoverProps> = ({
  placement = 'top',
  title,
  content,
  trigger = 'hover',
  visible: controlledVisible,
  onVisibleChange,
  children,
  style,
  className,
}) => {
  const [internalVisible, setInternalVisible] = useState(false)
  const isControlled = controlledVisible !== undefined
  const visible = isControlled ? controlledVisible : internalVisible
  const wrapperRef = useRef<HTMLSpanElement>(null)
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setVisible = useCallback(
    (val: boolean) => {
      if (!isControlled) setInternalVisible(val)

      onVisibleChange && onVisibleChange(val)
    },
    [isControlled, onVisibleChange],
  )

  // Click outside and Escape close a click popover
  useEffect(() => {
    if (!visible || trigger !== 'click') return undefined
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setVisible(false)
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setVisible(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [visible, trigger, setVisible])

  useEffect(
    () => () => {
      if (enterTimer.current) clearTimeout(enterTimer.current)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
    },
    [],
  )

  const handleClick = useCallback(() => {
    if (trigger === 'click') setVisible(!visible)
  }, [trigger, visible, setVisible])

  const handleMouseEnter = useCallback(() => {
    if (trigger === 'hover') {
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
      enterTimer.current = setTimeout(() => setVisible(true), 100)
    }
  }, [trigger, setVisible])

  const handleMouseLeave = useCallback(() => {
    if (trigger === 'hover') {
      if (enterTimer.current) clearTimeout(enterTimer.current)
      leaveTimer.current = setTimeout(() => setVisible(false), 100)
    }
  }, [trigger, setVisible])

  return (
    <Wrapper
      ref={wrapperRef}
      className="ui-popover"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <PopoverContent
          $placement={placement}
          style={style}
          className={joinClassNames('ui-popover-content', className)}
        >
          {title && (
            <PopoverTitle className="ui-popover-title">{title}</PopoverTitle>
          )}
          {content && (
            <PopoverInner className="ui-popover-inner">{content}</PopoverInner>
          )}
        </PopoverContent>
      )}
    </Wrapper>
  )
}

export default Popover
