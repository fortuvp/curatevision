import React, { useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import { joinClassNames } from './kit-styles'

/*
 * Switch, v2: a 40x24 pill (32x18 small). Off is a recessed raised track,
 * on is the action fill with a soft glow. The thumb springs across with a
 * slight overshoot and stretches while pressed.
 */
const SIZES = {
  default: { width: 40, height: 24, thumb: 18 },
  small: { width: 32, height: 18, thumb: 14 },
}

const dims = (size?: string) => (size === 'small' ? SIZES.small : SIZES.default)

const Handle = styled.span<{ $checked: boolean; $size?: string }>`
  position: absolute;
  top: 50%;
  /* left, not a fixed translate: labelled switches are wider than the track. */
  left: ${({ $checked, $size }) =>
    $checked ? `calc(100% - ${dims($size).thumb + 3}px)` : '3px'};
  width: ${({ $size }) => dims($size).thumb}px;
  height: ${({ $size }) => dims($size).thumb}px;
  border-radius: var(--radius-pill);
  background: ${({ $checked }) =>
    $checked ? 'var(--color-on-primary)' : 'var(--switch-thumb-off)'};
  box-shadow:
    0 1px 2px color-mix(in srgb, var(--stage) 50%, transparent),
    inset 0 1px 0 var(--glass-highlight);
  transform: translateY(-50%);
  transition:
    left var(--dur-control) var(--ease-spring),
    width var(--dur-hover) var(--ease-out),
    margin var(--dur-hover) var(--ease-out),
    background var(--dur-hover) var(--ease-out);

  @media (prefers-reduced-motion: reduce) {
    transition: background var(--dur-hover) linear;
  }
`

const SwitchButton = styled.button<{ $checked: boolean; $size?: string }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  min-width: ${({ $size }) => dims($size).width}px;
  height: ${({ $size }) => dims($size).height}px;
  padding: 0;
  border: 1px solid
    ${({ $checked }) =>
      $checked
        ? 'color-mix(in srgb, var(--color-primary) 50%, transparent)'
        : 'var(--glass-border)'};
  border-radius: var(--radius-pill);
  /* Off colors per theme; light gets a grey track and a white thumb. */
  --switch-track-off: var(--color-raised);
  --switch-thumb-off: var(--color-muted);
  background: ${({ $checked }) =>
    $checked ? 'var(--color-primary-fill)' : 'var(--switch-track-off)'};
  box-shadow: ${({ $checked }) =>
    $checked
      ? '0 0 16px -4px var(--color-primary), inset 0 1px 0 var(--glass-highlight)'
      : 'inset 0 1px 2px color-mix(in srgb, var(--stage) 40%, transparent)'};
  vertical-align: middle;
  cursor: pointer;
  transition:
    background var(--dur-control) var(--ease-out),
    border-color var(--dur-control) var(--ease-out),
    box-shadow var(--dur-control) var(--ease-out);

  /* Static selector (no props): styled-components scopes it to every switch. */
  body[data-theme='light'] & {
    --switch-track-off: var(--color-border-strong);
    --switch-thumb-off: var(--color-surface);
  }

  &:hover:not(:disabled) {
    border-color: ${({ $checked }) =>
      $checked
        ? 'color-mix(in srgb, var(--color-primary) 70%, transparent)'
        : 'var(--color-border-strong)'};
  }

  /* Press: the thumb stretches toward where it is going. */
  &:active:not(:disabled) ${Handle} {
    width: ${({ $size }) => dims($size).thumb + 4}px;
    margin-left: ${({ $checked }) => ($checked ? '-4px' : '0')};
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

const InnerText = styled.span<{ $checked: boolean; $size?: string }>`
  font-family: var(--font-sans);
  font-size: 11px;
  line-height: 1;
  font-weight: 500;
  color: ${({ $checked }) =>
    $checked ? 'var(--color-on-primary)' : 'var(--color-muted)'};
  padding: ${({ $checked, $size }) => {
    const handleSpace = `${dims($size).thumb + 8}px`
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
