import React, { useContext, useState } from 'react'
import styled from 'styled-components'
import { Dropdown } from 'components/ui'
import {
  ThemeContext,
  type ThemeMode,
  THEME_MODES,
} from 'contexts/theme-context'
import { CurateIcon, type CurateIconName } from 'components/curate/icons'
import { BarIconButton } from './app-bar-controls'

const MODE_ICON: Record<ThemeMode, CurateIconName> = {
  system: 'monitor',
  light: 'sun',
  dark: 'moon',
  kleros: 'layers',
}

const Menu = styled.div`
  min-width: 220px;
  padding: 6px;
`

const MenuTitle = styled.div`
  padding: 6px 10px 4px;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
`

const MenuItem = styled.button<{ $active?: boolean }>`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) 16px;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 40px;
  padding: 4px 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: ${({ $active }) =>
    $active ? 'var(--color-primary-soft)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--color-primary)' : 'var(--color-text)'};
  text-align: left;
  cursor: pointer;
  transition: background var(--motion);

  &:hover {
    background: ${({ $active }) =>
      $active ? 'var(--color-primary-soft)' : 'var(--color-raised)'};
  }
`

const ItemLabel = styled.span`
  display: block;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
`

const ItemHint = styled.span`
  display: block;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

/**
 * App-bar theme switcher: System, Light, Dark, Kleros (DESIGN.md, Layout).
 * The trigger shows the icon of the chosen mode; the menu marks it with a check.
 */
const ThemeMenu = () => {
  const themeContext = useContext(ThemeContext)
  const [open, setOpen] = useState(false)
  if (!themeContext) return null
  const { mode, setMode } = themeContext

  return (
    <Dropdown
      trigger={['click']}
      visible={open}
      onVisibleChange={setOpen}
      placement="bottomRight"
      overlay={
        <Menu role="menu" aria-label="Theme">
          <MenuTitle>Theme</MenuTitle>
          {THEME_MODES.map((option) => (
            <MenuItem
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-label={`${option.label}: ${option.hint}`}
              aria-checked={option.value === mode}
              $active={option.value === mode}
              onClick={(event) => {
                event.stopPropagation()
                setMode(option.value)
                setOpen(false)
              }}
            >
              <CurateIcon name={MODE_ICON[option.value]} size={18} />
              <span>
                <ItemLabel>{option.label}</ItemLabel>
                <ItemHint>{option.hint}</ItemHint>
              </span>
              {option.value === mode && <CurateIcon name="check" size={16} />}
            </MenuItem>
          ))}
        </Menu>
      }
    >
      <BarIconButton
        type="button"
        aria-label="Theme"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Theme"
      >
        <CurateIcon name={MODE_ICON[mode]} size={19} />
      </BarIconButton>
    </Dropdown>
  )
}

export default ThemeMenu
