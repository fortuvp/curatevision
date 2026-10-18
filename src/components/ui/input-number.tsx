import React, { useState, useCallback, useRef, useEffect } from 'react'
import styled from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames, monoData } from './kit-styles'

/* Numeric field: 40px, radius 6, mono figures, stepper column on the right. */
const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: stretch;
  width: 96px;
  height: 40px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  transition: border-color var(--motion);

  &:hover:not(.disabled) {
    border-color: var(--color-border-strong);
  }

  &:focus-within:not(.disabled) {
    border-color: var(--color-primary);
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &.disabled {
    background: var(--color-raised);
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const StyledInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  ${monoData}
  text-align: left;
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &:focus-visible {
    outline: none;
  }

  &:disabled {
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

const HandlerWrap = styled.div`
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  width: 24px;
  border-left: 1px solid var(--color-border);
`

const HandlerButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  user-select: none;
  transition:
    color var(--motion),
    background var(--motion);

  &:hover:not(:disabled) {
    color: var(--color-text);
    background: var(--color-raised);
  }

  &:first-child {
    border-bottom: 1px solid var(--color-border);
  }

  &:disabled,
  &.handler-disabled {
    color: var(--color-faint);
    cursor: not-allowed;
  }
`

interface InputNumberProps {
  value?: number | string
  min?: number
  max?: number
  defaultValue?: number
  onChange?: (value: number | undefined) => void
  disabled?: boolean
  step?: number
  style?: React.CSSProperties
  className?: string
  parser?: (value: string) => string
  formatter?: (value: number | string) => string
  precision?: number
}

const InputNumber: React.FC<InputNumberProps> = ({
  value: controlledValue,
  min,
  max,
  defaultValue,
  onChange,
  disabled = false,
  step = 1,
  style,
  className,
  parser,
  formatter,
  precision,
}) => {
  const [internalValue, setInternalValue] = useState<number | string>(() => {
    const init = controlledValue === undefined ? defaultValue : controlledValue
    return init === undefined ? '' : init
  })
  const isControlled = controlledValue !== undefined
  const value = isControlled ? controlledValue : internalValue
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isControlled && controlledValue !== internalValue)
      setInternalValue(controlledValue as number | string)

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controlledValue])

  const clamp = useCallback(
    (val: number) => {
      let n = val
      if (min !== undefined && n < min) n = min
      if (max !== undefined && n > max) n = max
      if (precision !== undefined) n = Number.parseFloat(n.toFixed(precision))
      return n
    },
    [min, max, precision],
  )

  const applyValue = useCallback(
    (raw: string | number | null | undefined) => {
      if (raw === '' || raw === null || raw === undefined) {
        if (!isControlled) setInternalValue('')
        if (onChange) onChange(undefined)
        return
      }
      const num = typeof raw === 'string' ? Number.parseFloat(raw) : raw
      if (Number.isNaN(num)) return
      const clamped = clamp(num)
      if (!isControlled) setInternalValue(clamped)
      if (onChange) onChange(clamped)
    },
    [isControlled, clamp, onChange],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw: string = e.target.value
      if (parser) raw = parser(raw)
      if (raw === '' || raw === '-') {
        if (!isControlled) setInternalValue(raw)
        return
      }
      applyValue(raw)
    },
    [parser, isControlled, applyValue],
  )

  const handleBlur = useCallback(() => {
    if (value === '' || value === '-')
      applyValue(
        defaultValue === undefined
          ? min === undefined
            ? ''
            : min
          : defaultValue,
      )
  }, [value, defaultValue, min, applyValue])

  const increment = useCallback(() => {
    if (disabled) return
    const current = value === '' || value === undefined ? 0 : Number(value)
    applyValue(current + step)
  }, [disabled, value, step, applyValue])

  const decrement = useCallback(() => {
    if (disabled) return
    const current = value === '' || value === undefined ? 0 : Number(value)
    applyValue(current - step)
  }, [disabled, value, step, applyValue])

  const displayValue =
    formatter && value !== '' && value !== undefined ? formatter(value) : value

  const atMax = max !== undefined && Number(value) >= max
  const atMin = min !== undefined && Number(value) <= min

  return (
    <Wrapper
      style={style}
      className={joinClassNames(
        'ui-input-number',
        disabled && 'disabled',
        className,
      )}
    >
      <StyledInput
        ref={inputRef}
        className="ui-input-number-input"
        type="text"
        inputMode="decimal"
        value={displayValue === undefined ? '' : displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
      />
      <HandlerWrap className="ui-input-number-handlers">
        <HandlerButton
          type="button"
          className={joinClassNames(
            'ui-input-number-handler',
            (atMax || disabled) && 'handler-disabled',
          )}
          disabled={atMax || disabled}
          onClick={increment}
          aria-label="Increase value"
        >
          <KitIcon name="chevron-up" size={12} />
        </HandlerButton>
        <HandlerButton
          type="button"
          className={joinClassNames(
            'ui-input-number-handler',
            (atMin || disabled) && 'handler-disabled',
          )}
          disabled={atMin || disabled}
          onClick={decrement}
          aria-label="Decrease value"
        >
          <KitIcon name="chevron-down" size={12} />
        </HandlerButton>
      </HandlerWrap>
    </Wrapper>
  )
}

export default InputNumber
