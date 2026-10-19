import React, { useState, useEffect, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, motionOk } from './kit-styles'

/*
 * Slider, v2: a 6px pill rail; the chosen part is the action fill with a
 * soft glow, the thumb is an 18px knob with a blue ring that grows on hover
 * and springs on press. The native range input stays on top for input, so
 * keyboard and screen readers work as before. The fill is the measure: the
 * chosen value within min..max.
 */
const SliderWrapper = styled.div<{ $disabled?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 28px;
  opacity: ${({ $disabled }) => ($disabled ? 0.45 : 1)};
`

const Rail = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  box-shadow: inset 0 0 0 1px var(--glass-border);
  transform: translateY(-50%);
  pointer-events: none;
`

const Fill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  border-radius: var(--radius-pill);
  background: var(--color-primary-fill);
  box-shadow: 0 0 12px color-mix(in srgb, var(--color-primary) 55%, transparent);
`

const thumb = css`
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  box-shadow:
    0 0 0 0 var(--color-primary-soft),
    0 2px 8px color-mix(in srgb, var(--stage) 50%, transparent);
  cursor: inherit;
  transition:
    box-shadow var(--dur-hover) var(--ease-out),
    transform var(--dur-control) var(--ease-spring);
`

const thumbHover = css`
  box-shadow:
    0 0 0 6px var(--color-primary-soft),
    0 2px 8px color-mix(in srgb, var(--stage) 50%, transparent);
`

const StyledRange = styled.input`
  position: relative;
  z-index: 1;
  width: 100%;
  height: 28px;
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
    height: 6px;
    border: 0;
    background: transparent;
  }

  &::-moz-range-track {
    height: 6px;
    border: 0;
    background: transparent;
  }

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -6px;
    ${thumb}
  }

  &::-moz-range-thumb {
    box-sizing: border-box;
    ${thumb}
  }

  &:hover:not(:disabled)::-webkit-slider-thumb,
  &:focus-visible::-webkit-slider-thumb {
    ${thumbHover}
  }

  &:hover:not(:disabled)::-moz-range-thumb,
  &:focus-visible::-moz-range-thumb {
    ${thumbHover}
  }

  ${motionOk(css`
    &:active:not(:disabled)::-webkit-slider-thumb {
      transform: scale(1.15);
    }

    &:active:not(:disabled)::-moz-range-thumb {
      transform: scale(1.15);
    }
  `)}
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
