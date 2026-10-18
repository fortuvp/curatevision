import React, { useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import { joinClassNames, monoLabel } from './kit-styles'

/*
 * Switch: a 36x20 pill (28x16 small) with the handle in on-primary; the
 * track is the action color when on and the faint text role when off.
 */
const SwitchButton = styled.button<{ $checked: boolean; $size?: string }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: ${({ $size }) => ($size === 'small' ? '28px' : '36px')};
  height: ${({ $size }) => ($size === 'small' ? '16px' : '20px')};
  padding: 0;
  border: 0;
  border-radius: var(--radius-pill);
  background: ${({ $checked }) =>
    $checked ? 'var(--color-primary)' : 'var(--color-faint)'};
  vertical-align: middle;
  cursor: pointer;
  transition: background var(--motion);

  &:hover:not(:disabled) {
    background: ${({ $checked }) =>
      $checked ? 'var(--color-primary-hover)' : 'var(--color-muted)'};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const Handle = styled.span<{ $checked: boolean; $size?: string }>`
  position: absolute;
  top: 2px;
  left: ${({ $checked, $size }) => {
    if ($checked)
      return $size === 'small' ? 'calc(100% - 14px)' : 'calc(100% - 18px)'
    return '2px'
  }};
  width: ${({ $size }) => ($size === 'small' ? '12px' : '16px')};
  height: ${({ $size }) => ($size === 'small' ? '12px' : '16px')};
  border-radius: var(--radius-pill);
  background: var(--color-on-primary);
  transition: left var(--motion);
`

const InnerText = styled.span<{ $checked: boolean; $size?: string }>`
  ${monoLabel}
  letter-spacing: 0;
  color: var(--color-on-primary);
  padding: ${({ $checked, $size }) => {
    const handleSpace = $size === 'small' ? '18px' : '22px'
    return $checked ? `0 ${handleSpace} 0 8px` : `0 8px 0 ${handleSpace}`
  }};
  white-space: nowrap;
  user-select: none;
`

interface SwitchProps {
  checked?: boolean
  onChange?: (checked: boolean, e: React.MouseEvent) => void
  onClick?: (checked: boolean, e: React.MouseEvent) => void
  checkedChildren?: React.ReactNode
  unCheckedChildren?: React.ReactNode
  disabled?: boolean
  size?: 'small' | 'default'
  style?: React.CSSProperties
  className?: string
  defaultChecked?: boolean
}

const Switch: React.FC<SwitchProps> = ({
  checked: controlledChecked,
  onChange,
  onClick,
  checkedChildren,
  unCheckedChildren,
  disabled = false,
  size,
  style,
  className,
  defaultChecked = false,
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isControlled = controlledChecked !== undefined
  const checked = isControlled ? controlledChecked : internalChecked

  useEffect(() => {
    if (isControlled) setInternalChecked(controlledChecked)
  }, [isControlled, controlledChecked])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return
      const newChecked = !checked
      if (!isControlled) setInternalChecked(newChecked)

      onChange && onChange(newChecked, e)
      onClick && onClick(newChecked, e)
    },
    [checked, disabled, isControlled, onChange, onClick],
  )

  return (
    <SwitchButton
      type="button"
      role="switch"
      aria-checked={checked}
      $checked={checked}
      $size={size}
      disabled={disabled}
      onClick={handleClick}
      style={style}
      className={joinClassNames(
        'ui-switch',
        checked && 'ui-switch-checked',
        size === 'small' && 'ui-switch-small',
        className,
      )}
    >
      <InnerText className="ui-switch-inner" $checked={checked} $size={size}>
        {checked ? checkedChildren : unCheckedChildren}
      </InnerText>
      <Handle className="ui-switch-handle" $checked={checked} $size={size} />
    </SwitchButton>
  )
}

export default Switch
