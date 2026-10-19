import React, { useState, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames, kitRadius, kitTransition } from './kit-styles'

const Wrapper = styled.label<{ $disabled?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  user-select: none;
`

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
`

const markIn = keyframes`
  from { transform: scale(0.4); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`

/* 18px box, radius 6; checked = action fill with a glow, the mark springs in. */
const Indicator = styled.span<{ $checked?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border: 1px solid
    ${({ $checked }) =>
      $checked
        ? 'color-mix(in srgb, var(--color-primary) 60%, transparent)'
        : 'var(--color-border-strong)'};
  border-radius: ${kitRadius.xs};
  background: ${({ $checked }) =>
    $checked ? 'var(--color-primary-fill)' : 'var(--color-raised)'};
  box-shadow: ${({ $checked }) =>
    $checked ? '0 0 12px -3px var(--color-primary)' : 'none'};
  color: var(--color-on-primary);
  transition: ${kitTransition('background', 'border-color', 'box-shadow')};

  svg {
    animation: ${markIn} 260ms var(--ease-spring) both;
  }

  --checkbox-hover-border: ${({ $checked }) =>
    $checked
      ? 'color-mix(in srgb, var(--color-primary) 80%, transparent)'
      : 'var(--color-muted)'};

  /* Static selector: the per-state color travels in the custom property. */
  ${Wrapper}:hover & {
    border-color: var(--checkbox-hover-border);
  }

  ${HiddenInput}:focus-visible + & {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    svg {
      animation: none;
    }
  }
`

interface CheckboxProps {
  checked?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  children?: React.ReactNode
  defaultChecked?: boolean
  style?: React.CSSProperties
  className?: string
}

const Checkbox: React.FC<CheckboxProps> = ({
  checked: controlledChecked,
  onChange,
  disabled = false,
  children,
  defaultChecked = false,
  style,
  className,
}) => {
  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isControlled = controlledChecked !== undefined
  const isChecked = isControlled ? controlledChecked : internalChecked

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      const next = e.target.checked
      if (!isControlled) setInternalChecked(next)
      if (onChange) onChange(e)
    },
    [disabled, isControlled, onChange],
  )

  return (
    <Wrapper
      $disabled={disabled}
      style={style}
      className={joinClassNames(
        'ui-checkbox',
        isChecked && 'ui-checkbox-checked',
        className,
      )}
    >
      <HiddenInput
        className="ui-checkbox-input"
        type="checkbox"
        checked={isChecked}
        onChange={handleChange}
        disabled={disabled}
      />
      <Indicator className="ui-checkbox-indicator" $checked={isChecked}>
        {isChecked && <KitIcon name="check" size={12} />}
      </Indicator>
      {children && <span className="ui-checkbox-label">{children}</span>}
    </Wrapper>
  )
}

export default Checkbox
