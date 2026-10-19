import React, { useCallback } from 'react'
import styled, { css } from 'styled-components'
import { focusRing, joinClassNames, menuRow } from './kit-styles'

/* Menu rows like the app bar's menus: 40px, radius 12, selected = primary-soft. */
const MenuWrapper = styled.ul<{ $mode?: string }>`
  list-style: none;
  margin: 0;
  padding: 6px;
  min-width: 160px;
  background: transparent;
  border-radius: var(--radius-lg);

  ${({ $mode }) =>
    $mode === 'horizontal' &&
    css`
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0;
      border-bottom: 1px solid var(--glass-border);
      border-radius: 0;
    `}

  ${({ $mode }) =>
    $mode === 'inline' &&
    css`
      border-right: 1px solid var(--glass-border);
      border-radius: 0;
    `}
`

const MenuItemWrapper = styled.li<{
  $disabled?: boolean
  $selected?: boolean
  $mode?: string
}>`
  ${menuRow}
  color: ${({ $disabled, $selected }) =>
    $disabled
      ? 'var(--color-muted)'
      : $selected
        ? 'var(--color-primary)'
        : 'var(--color-text)'};
  background: ${({ $selected }) =>
    $selected ? 'var(--color-primary-soft)' : 'transparent'};
  white-space: nowrap;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  ${focusRing}

  &:hover {
    ${({ $disabled, $selected }) =>
      !$disabled &&
      css`
        background: ${$selected
          ? 'var(--color-primary-soft)'
          : 'var(--color-raised)'};
      `}
  }

  ${({ $mode, $selected }) =>
    $mode === 'horizontal' &&
    css`
      min-height: 44px;
      margin-bottom: -1px;
      padding: 0 12px;
      border-bottom: 2px solid
        ${$selected ? 'var(--color-primary)' : 'transparent'};
      border-radius: 0;
      background: transparent;

      &:hover {
        background: transparent;
        color: ${$selected ? 'var(--color-primary)' : 'var(--color-text)'};
      }
    `}
`

interface MenuItemProps {
  children?: React.ReactNode
  onClick?: (e: React.MouseEvent) => void
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
  $itemKey?: string
  $selected?: boolean
  $onMenuClick?: (info: { key: string; domEvent: React.MouseEvent }) => void
  $mode?: string
}

const MenuItem: React.FC<MenuItemProps> = ({
  children,
  onClick,
  disabled = false,
  style,
  className,
  $itemKey,
  $selected,
  $onMenuClick,
  $mode,
}) => {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      if (onClick) onClick(e)
      if ($onMenuClick && $itemKey) $onMenuClick({ key: $itemKey, domEvent: e })
    },
    [disabled, onClick, $onMenuClick, $itemKey],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLLIElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick(e as unknown as React.MouseEvent)
      }
    },
    [handleClick],
  )

  return (
    <MenuItemWrapper
      role="menuitem"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled || undefined}
      $disabled={disabled}
      $selected={$selected}
      $mode={$mode}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      style={style}
      className={joinClassNames(
        'ui-menu-item',
        $selected && 'ui-menu-item-selected',
        disabled && 'ui-menu-item-disabled',
        className,
      )}
    >
      {children}
    </MenuItemWrapper>
  )
}

MenuItem.displayName = 'Menu.Item'

interface MenuProps {
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  onClick?: (info: { key: string; domEvent: React.MouseEvent }) => void
  mode?: string
  selectedKeys?: string[]
}

interface MenuComponent extends React.FC<MenuProps> {
  Item: React.FC<MenuItemProps>
}

const Menu: MenuComponent = ({
  children,
  style,
  className,
  onClick,
  mode = 'vertical',
  selectedKeys = [],
}) => (
  <MenuWrapper
    role="menu"
    $mode={mode}
    style={style}
    className={joinClassNames('ui-menu', `ui-menu-${mode}`, className)}
  >
    {React.Children.map(children, (child) => {
      if (
        !child ||
        !React.isValidElement<MenuItemProps>(child) ||
        child.type !== MenuItem
      )
        return child
      const itemKey = child.key
      return React.cloneElement(child, {
        $itemKey: itemKey ?? undefined,
        $selected: itemKey !== null && selectedKeys.includes(itemKey),
        $onMenuClick: onClick,
        $mode: mode,
      })
    })}
  </MenuWrapper>
)

Menu.Item = MenuItem

export default Menu
