import React, { useState, useRef, useCallback, useEffect } from 'react'
import styled, { css } from 'styled-components'
import { overlayPanel } from './kit-styles'

/*
 * Dropdown: the trigger plus a floating panel styled like the app bar's
 * menus (surface, strong hairline, radius 6, overlay shadow). The panel is
 * always the wrapper's last child div, which callers rely on for placement.
 */
const Wrapper = styled.div`
  display: inline-block;
  position: relative;
`

const placementStyles: Record<string, ReturnType<typeof css>> = {
  bottomLeft: css`
    top: 100%;
    left: 0;
    margin-top: 6px;
  `,
  bottomRight: css`
    top: 100%;
    right: 0;
    margin-top: 6px;
  `,
  bottomCenter: css`
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-top: 6px;
  `,
  topLeft: css`
    bottom: 100%;
    left: 0;
    margin-bottom: 6px;
  `,
  topRight: css`
    bottom: 100%;
    right: 0;
    margin-bottom: 6px;
  `,
  topCenter: css`
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 6px;
  `,
}

const Overlay = styled.div<{ $visible?: boolean; $placement?: string }>`
  position: absolute;
  z-index: 1050;
  min-width: 160px;
  ${overlayPanel}
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  transition:
    opacity var(--motion),
    visibility var(--motion);
  ${({ $placement }) =>
    placementStyles[$placement || 'bottomLeft'] || placementStyles.bottomLeft}
`

interface DropdownProps {
  overlay?: React.ReactNode
  trigger?: string[]
  visible?: boolean
  onVisibleChange?: (visible: boolean) => void
  placement?: string
  children?: React.ReactNode
  disabled?: boolean
}

const Dropdown: React.FC<DropdownProps> = ({
  overlay,
  trigger = ['hover'],
  visible: controlledVisible,
  onVisibleChange,
  placement = 'bottomLeft',
  children,
  disabled = false,
}) => {
  const [internalVisible, setInternalVisible] = useState(false)
  const isControlled = controlledVisible !== undefined
  const isVisible = isControlled ? controlledVisible : internalVisible
  const wrapperRef = useRef<HTMLDivElement>(null)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setVisible = useCallback(
    (val: boolean) => {
      if (disabled) return
      if (!isControlled) setInternalVisible(val)
      if (onVisibleChange) onVisibleChange(val)
    },
    [disabled, isControlled, onVisibleChange],
  )

  const handleClick = useCallback(() => {
    if (trigger.includes('click')) setVisible(!isVisible)
  }, [trigger, isVisible, setVisible])

  const handleMouseEnter = useCallback(() => {
    if (trigger.includes('hover')) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
        hoverTimeoutRef.current = null
      }
      setVisible(true)
    }
  }, [trigger, setVisible])

  const handleMouseLeave = useCallback(() => {
    if (trigger.includes('hover'))
      hoverTimeoutRef.current = setTimeout(() => {
        setVisible(false)
      }, 100)
  }, [trigger, setVisible])

  // Close on outside click and on Escape
  useEffect(() => {
    if (!isVisible) return undefined

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
  }, [isVisible, setVisible])

  // Cleanup timeout on unmount
  useEffect(
    () => () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current)
    },
    [],
  )

  return (
    <Wrapper
      ref={wrapperRef}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="ui-dropdown"
    >
      {children}
      <Overlay
        className="ui-dropdown-overlay"
        $visible={isVisible}
        $placement={placement}
        aria-hidden={!isVisible}
      >
        {overlay}
      </Overlay>
    </Wrapper>
  )
}

export default Dropdown
