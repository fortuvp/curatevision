import React, { createContext, useContext, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames } from './kit-styles'

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
  gap: 8px;
  margin-right: 8px;
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

/* 16px pill; checked = action-color ring with an 8px action dot inside. */
const RadioDot = styled.span<{ $checked?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border: 1px solid
    ${({ $checked }) =>
      $checked ? 'var(--color-primary)' : 'var(--color-border-strong)'};
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  transition: border-color var(--motion);

  &::after {
    content: '';
    display: ${({ $checked }) => ($checked ? 'block' : 'none')};
    width: 8px;
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--color-primary);
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

/* Joined 32px segments; the chosen one is outlined (or filled) in the action color. */
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
  margin-left: -1px;
  padding: 0 12px;
  border: 1px solid var(--color-border-strong);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  white-space: nowrap;
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  opacity: ${({ $disabled }) => ($disabled ? 0.55 : 1)};
  user-select: none;
  transition:
    background var(--motion),
    border-color var(--motion),
    color var(--motion);

  &:first-child {
    margin-left: 0;
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }

  &:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
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
          border-color: var(--color-primary);
          background: var(--color-primary);
          color: var(--color-on-primary);
        `
      : css`
          z-index: 1;
          border-color: var(--color-primary);
          background: var(--color-primary-soft);
          color: var(--color-primary);
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

const GroupWrapper = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
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
