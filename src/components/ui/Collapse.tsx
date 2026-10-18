import React, { useState, useCallback, useRef, useEffect, useId } from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames } from './kit-styles'

const CollapseWrapper = styled.div<{ $bordered?: boolean }>`
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--color-surface);
  ${({ $bordered }) =>
    $bordered &&
    css`
      border: 1px solid var(--color-border);
    `}
`

const PanelWrapper = styled.div<{ $bordered?: boolean }>`
  ${({ $bordered }) =>
    $bordered &&
    css`
      &:not(:last-child) {
        border-bottom: 1px solid var(--color-border);
      }
    `}
`

/* 44px header row; the chevron turns when the panel is open. */
const PanelHeader = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 10px 16px;
  border: 0;
  background: transparent;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background var(--motion);

  &:hover:not(:disabled) {
    background: var(--color-raised);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const ArrowIcon = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--color-muted);
  transition: transform var(--motion);
  transform: rotate(${({ $active }) => ($active ? '0deg' : '-90deg')});
`

const HeaderText = styled.span`
  flex: 1;
  min-width: 0;
`

const PanelContentOuter = styled.div`
  overflow: hidden;
  transition: height 0.3s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const PanelContentInner = styled.div`
  padding: 16px;
  border-top: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
`

interface PanelProps {
  header?: React.ReactNode
  children?: React.ReactNode
  showArrow?: boolean
  disabled?: boolean
  $panelKey?: string
  $active?: boolean
  $onToggle?: (key: string) => void
}

const Panel: React.FC<PanelProps> = ({
  header,
  children,
  showArrow = true,
  disabled = false,
  $panelKey,
  $active,
  $onToggle,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const contentId = useId()
  const [height, setHeight] = useState($active ? 'auto' : '0px')
  const [overflow, setOverflow] = useState($active ? 'visible' : 'hidden')

  useEffect(() => {
    const el = contentRef.current
    if (!el) return undefined
    if ($active) {
      setOverflow('hidden')
      setHeight(`${el.scrollHeight}px`)
      const timer = setTimeout(() => {
        setHeight('auto')
        setOverflow('visible')
      }, 300)
      return () => clearTimeout(timer)
    }
    // Set an explicit height first so the transition can animate from it
    setHeight(`${el.scrollHeight}px`)
    setOverflow('hidden')
    // eslint-disable-next-line no-unused-expressions
    el.offsetHeight
    requestAnimationFrame(() => {
      setHeight('0px')
    })
    return undefined
  }, [$active])

  const handleClick = useCallback(() => {
    if (disabled) return
    if ($onToggle && $panelKey) $onToggle($panelKey)
  }, [disabled, $onToggle, $panelKey])

  return (
    <PanelWrapper
      className={joinClassNames(
        'ui-collapse-panel',
        $active && 'ui-collapse-panel-active',
      )}
      $bordered
    >
      <PanelHeader
        type="button"
        className="ui-collapse-header"
        disabled={disabled}
        aria-expanded={Boolean($active)}
        aria-controls={contentId}
        onClick={handleClick}
      >
        {showArrow && (
          <ArrowIcon $active={$active} aria-hidden>
            <KitIcon name="chevron-down" size={14} />
          </ArrowIcon>
        )}
        <HeaderText>{header}</HeaderText>
      </PanelHeader>
      <PanelContentOuter
        id={contentId}
        ref={contentRef}
        style={{ height, overflow }}
        aria-hidden={!$active}
      >
        <PanelContentInner className="ui-collapse-content">
          {children}
        </PanelContentInner>
      </PanelContentOuter>
    </PanelWrapper>
  )
}

Panel.displayName = 'Collapse.Panel'

interface CollapseProps {
  bordered?: boolean
  defaultActiveKey?: string | string[]
  activeKey?: string | string[]
  onChange?: (key: string | string[]) => void
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  accordion?: boolean
}

interface CollapseComponent extends React.FC<CollapseProps> {
  Panel: React.FC<PanelProps>
}

const normalizeKeys = (keys: string | string[] | undefined): string[] => {
  if (keys === undefined || keys === null) return []
  if (Array.isArray(keys)) return keys.map(String)
  return [String(keys)]
}

const Collapse: CollapseComponent = ({
  bordered = true,
  defaultActiveKey,
  activeKey: controlledActiveKey,
  onChange,
  children,
  style,
  className,
  accordion = false,
}) => {
  const [internalActiveKeys, setInternalActiveKeys] = useState<string[]>(() =>
    normalizeKeys(defaultActiveKey),
  )

  const isControlled = controlledActiveKey !== undefined
  const activeKeys = isControlled
    ? normalizeKeys(controlledActiveKey)
    : internalActiveKeys

  const handleToggle = useCallback(
    (panelKey: string) => {
      const key = String(panelKey)
      let nextKeys: string[]

      if (accordion) nextKeys = activeKeys.includes(key) ? [] : [key]
      else
        nextKeys = activeKeys.includes(key)
          ? activeKeys.filter((k) => k !== key)
          : [...activeKeys, key]

      if (!isControlled) setInternalActiveKeys(nextKeys)
      if (onChange) onChange(accordion ? nextKeys[0] || '' : nextKeys)
    },
    [accordion, activeKeys, isControlled, onChange],
  )

  const items = React.Children.toArray(children)

  return (
    <CollapseWrapper
      $bordered={bordered}
      style={style}
      className={joinClassNames('ui-collapse', className)}
    >
      {items.map((child) => {
        const element = child as React.ReactElement
        const panelKey =
          element.key == null
            ? undefined
            : String(element.key).replace(/^\.\$/, '')
        const isActive = panelKey ? activeKeys.includes(panelKey) : false

        return React.cloneElement(element, {
          $panelKey: panelKey,
          $active: isActive,
          $onToggle: handleToggle,
        })
      })}
    </CollapseWrapper>
  )
}

Collapse.Panel = Panel

export default Collapse
