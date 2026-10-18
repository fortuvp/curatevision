import React, { useState, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { joinClassNames } from './kit-styles'

/*
 * Slider: a 4px rail on the raised surface, the filled part in the action
 * color, a 16px pill thumb; the native range input stays on top for input.
 */
const SliderWrapper = styled.div<{ $disabled?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 24px;
  opacity: ${({ $disabled }) => ($disabled ? 0.5 : 1)};
`

const Rail = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 4px;
  overflow: hidden;
  border-radius: 2px;
  background: var(--color-raised);
  transform: translateY(-50%);
  pointer-events: none;
`

const Fill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  border-radius: 2px;
  background: var(--color-primary);
`

const StyledRange = styled.input`
  position: relative;
  z-index: 1;
  width: 100%;
  height: 24px;
  margin: 0;
  background: transparent;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;

  &:disabled {
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: none;
  }

  &::-webkit-slider-runnable-track {
    height: 4px;
    border: 0;
    background: transparent;
  }

  &::-moz-range-track {
    height: 4px;
    border: 0;
    background: transparent;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    margin-top: -6px;
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    cursor: inherit;
    transition: box-shadow var(--motion);
  }

  &::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border: 2px solid var(--color-primary);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    cursor: inherit;
    transition: box-shadow var(--motion);
  }

  &:hover:not(:disabled)::-webkit-slider-thumb,
  &:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 4px var(--color-primary-soft);
  }

  &:hover:not(:disabled)::-moz-range-thumb,
  &:focus-visible::-moz-range-thumb {
    box-shadow: 0 0 0 4px var(--color-primary-soft);
  }
`

interface SliderProps {
  min?: number
  max?: number
  value?: number
  onChange?: (value: number) => void
  step?: number
  disabled?: boolean
  id?: string
  tooltipVisible?: false
  style?: React.CSSProperties
  className?: string
  defaultValue?: number
}

const Slider: React.FC<SliderProps> = ({
  min = 0,
  max = 100,
  value: controlledValue,
  onChange,
  step = 1,
  disabled = false,
  id,
  style,
  className,
  defaultValue,
}) => {
  const [internalValue, setInternalValue] = useState(
    controlledValue === undefined
      ? defaultValue === undefined
        ? min
        : defaultValue
      : controlledValue,
  )

  const isControlled = controlledValue !== undefined
  const currentValue = isControlled ? controlledValue : internalValue

  useEffect(() => {
    if (isControlled) setInternalValue(controlledValue)
  }, [isControlled, controlledValue])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = Number(e.target.value)
      if (!isControlled) setInternalValue(newValue)

      onChange && onChange(newValue)
    },
    [isControlled, onChange],
  )

  const percent =
    max === min
      ? 0
      : Math.min(100, Math.max(0, ((currentValue - min) / (max - min)) * 100))

  return (
    <SliderWrapper
      style={style}
      className={joinClassNames(
        'ui-slider',
        disabled && 'ui-slider-disabled',
        className,
      )}
      $disabled={disabled}
    >
      <Rail className="ui-slider-rail" aria-hidden>
        <Fill className="ui-slider-fill" $percent={percent} />
      </Rail>
      <StyledRange
        className="ui-slider-input"
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
      />
    </SliderWrapper>
  )
}

export default Slider
