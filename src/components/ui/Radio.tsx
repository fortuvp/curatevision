import React, { createContext, useContext, useCallback } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { joinClassNames, kitTransition } from './kit-styles'

type RadioValue = string | number | boolean | undefined

interface RadioGroupContextValue {
  value: RadioValue
  onChange: (val: RadioValue) => void
  disabled: boolean
  buttonStyle: string
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

// --- Radio (circle-style) ---

const RadioWrapper = styled.label<{ $disabled?: boolean }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-right: 12px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  user-select: none;
`

const HiddenRadioInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  opacity: 0;
  pointer-events: none;
`

const dotIn = keyframes`
  from { transform: scale(0.2); }
  to { transform: scale(1); }
`

/* 18px ring; checked = action-color ring with a glowing dot that springs in. */
const RadioDot = styled.span<{ $checked?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  border: 1px solid
    ${({ $checked }) =>
      $checked
        ? 'color-mix(in srgb, var(--color-primary) 70%, transparent)'
        : 'var(--color-border-strong)'};
  border-radius: var(--radius-pill);
  background: ${({ $checked }) =>
    $checked ? 'var(--color-primary-soft)' : 'var(--color-raised)'};
  transition: ${kitTransition('border-color', 'background')};

  &::after {
    content: '';
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
    width: 8px;
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--color-primary);
    box-shadow: 0 0 8px var(--color-primary);
    animation: ${dotIn} 280ms var(--ease-spring) both;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
    }
  }

  ${HiddenRadioInput}:focus-visible + & {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`

interface RadioProps {
  checked?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
  value?: RadioValue
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface RadioButtonProps {
  value?: RadioValue
  disabled?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface RadioGroupProps {
  value?: RadioValue
  onChange?: (e: { target: { value: RadioValue } }) => void
  disabled?: boolean
  children?: React.ReactNode
  buttonStyle?: string
  style?: React.CSSProperties
  className?: string
}

interface RadioComponent extends React.FC<RadioProps> {
  Group: React.FC<RadioGroupProps>
  Button: React.FC<RadioButtonProps>
}

const Radio: RadioComponent = ({
  checked,
  onChange,
  disabled = false,
  value,
  children,
  style,
  className,
}) => {
  const group = useContext(RadioGroupContext)
  const isDisabled = disabled || Boolean(group && group.disabled)
  const isChecked = group ? group.value === value : checked

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isDisabled) return
      if (group) group.onChange(value)
      else if (onChange) onChange(e)
    },
    [isDisabled, group, value, onChange],
  )

  return (
    <RadioWrapper
      $disabled={isDisabled}
      style={style}
      className={joinClassNames(
        'ui-radio',
        isChecked && 'ui-radio-checked',
        className,
      )}
    >
      <HiddenRadioInput
        type="radio"
        checked={Boolean(isChecked)}
        onChange={handleChange}
        disabled={isDisabled}
      />
      <RadioDot $checked={isChecked} />
      {children && <span>{children}</span>}
    </RadioWrapper>
  )
}

// --- Radio.Button ---

/*
 * Segments of a pill track (the segmented control); the chosen one lifts
 * onto a raised pill, or the action fill when the group is solid.
 */
const RadioButtonStyled = styled.label<{
  $checked?: boolean
  $disabled?: boolean
  $buttonStyle?: string
}>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  white-space: nowrap;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
  user-select: none;
  transition: ${kitTransition('background', 'color', 'box-shadow')};

  /* The chosen pill: a lifted tint in dark themes, white in light. */
  --segment-on: color-mix(in srgb, var(--color-text) 10%, transparent);

  body[data-theme='light'] & {
    --segment-on: var(--color-surface);
  }

  &:hover {
    color: var(--color-text);
  }

  &:focus-within {
    z-index: 2;
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  ${({ $checked, $buttonStyle }) =>
    $checked &&
    ($buttonStyle === 'solid'
      ? css`
          z-index: 1;
          background: var(--color-primary-fill);
          color: var(--color-on-primary);
          box-shadow: 0 6px 18px -8px var(--color-primary);

          &:hover {
            color: var(--color-on-primary);
          }
        `
      : css`
          z-index: 1;
          background: var(--segment-on);
          color: var(--color-text);
          box-shadow:
            inset 0 1px 0 var(--glass-highlight),
            0 1px 2px color-mix(in srgb, var(--stage) 50%, transparent);
        `)}
`

const RadioButton: React.FC<RadioButtonProps> = ({
  value,
  disabled = false,
  children,
  style,
  className,
}) => {
  const group = useContext(RadioGroupContext)
  const isDisabled = disabled || Boolean(group && group.disabled)
  const isChecked = group ? group.value === value : false

  const handleChange = useCallback(() => {
    if (isDisabled) return
    if (group) group.onChange(value)
  }, [isDisabled, group, value])

  return (
    <RadioButtonStyled
      $checked={isChecked}
      $disabled={isDisabled}
      $buttonStyle={group ? group.buttonStyle : 'outline'}
      style={style}
      className={joinClassNames(
        'ui-radio-button',
        isChecked && 'ui-radio-button-checked',
        className,
      )}
    >
      <HiddenRadioInput
        type="radio"
        checked={isChecked}
        onChange={handleChange}
        disabled={isDisabled}
      />
      {children}
    </RadioButtonStyled>
  )
}

// --- Radio.Group ---

/* A group of Radio.Button segments sits in a recessed pill track. */
const GroupWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;

  &:has(> .ui-radio-button) {
    padding: 3px;
    border-radius: var(--radius-pill);
    background: var(--color-raised);
    box-shadow: inset 0 0 0 1px var(--glass-border);
  }
`

const RadioGroup: React.FC<RadioGroupProps> = ({
  value,
  onChange,
  disabled = false,
  children,
  buttonStyle = 'outline',
  style,
  className,
}) => {
  const handleChange = useCallback(
    (val: RadioValue) => {
      if (onChange) onChange({ target: { value: val } })
    },
    [onChange],
  )

  return (
    <RadioGroupContext.Provider
      value={{ value, onChange: handleChange, disabled, buttonStyle }}
    >
      <GroupWrapper
        role="radiogroup"
        style={style}
        className={joinClassNames('ui-radio-group', className)}
      >
        {children}
      </GroupWrapper>
    </RadioGroupContext.Provider>
  )
}

Radio.Group = RadioGroup
Radio.Button = RadioButton
Radio.Group.displayName = 'Radio.Group'
Radio.Button.displayName = 'Radio.Button'

export default Radio
