import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames } from './kit-styles'

const Wrapper = styled.label<{ $disabled?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

/* 16px box, radius 4; checked = action fill with the mark in on-primary. */
const Indicator = styled.span<{ $checked?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1px solid
    ${({ $checked }) =>
      $checked ? 'var(--color-primary)' : 'var(--color-border-strong)'};
  border-radius: var(--radius-sm);
  background: ${({ $checked }) =>
    $checked ? 'var(--color-primary)' : 'var(--color-surface)'};
  color: var(--color-on-primary);
  transition:
    background var(--motion),
    border-color var(--motion);

  ${HiddenInput}:focus-visible + & {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
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
