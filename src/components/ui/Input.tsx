import React, { useRef, useEffect, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import { ghostIconButton, joinClassNames, monoData } from './kit-styles'

/*
 * Input (DESIGN.md, Shapes): 40px, radius 6, hairline; the border and the
 * global focus ring turn to the action color on focus.
 */
const inputBaseStyles = css`
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  transition:
    border-color var(--motion),
    background var(--motion);

  &::placeholder {
    color: var(--color-faint);
  }

  &:hover:not(:disabled) {
    border-color: var(--color-border-strong);
  }

  &:focus {
    border-color: var(--color-primary);
  }

  &:disabled {
    background: var(--color-raised);
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

const sizeMap: Record<string, ReturnType<typeof css>> = {
  small: css`
    height: 32px;
    padding: 0 10px;
    font-size: var(--fs-small);
    line-height: var(--lh-small);
  `,
  default: css`
    height: 40px;
  `,
  large: css`
    height: 40px;
    font-size: var(--fs-body-lg);
    line-height: var(--lh-body-lg);
  `,
}

const StyledInput = styled.input<{ $size?: string }>`
  ${inputBaseStyles}
  ${({ $size }) => sizeMap[$size || 'default'] || sizeMap.default}
`

const InputWrapper = styled.span`
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  min-width: 0;
`

const AddonWrapper = styled.span<{
  $hasAddonBefore?: boolean
  $hasAddonAfter?: boolean
}>`
  display: inline-flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;

  & input {
    ${({ $hasAddonBefore }) =>
      $hasAddonBefore &&
      css`
        border-top-left-radius: 0;
        border-bottom-left-radius: 0;
      `}
    ${({ $hasAddonAfter }) =>
      $hasAddonAfter &&
      css`
        border-top-right-radius: 0;
        border-bottom-right-radius: 0;
      `}
  }
`

/* Addons (units, symbols) are data: mono on the raised surface. */
const Addon = styled.span<{ $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  flex: 0 0 auto;
  height: ${({ $small }) => ($small ? '32px' : '40px')};
  padding: 0 12px;
  border: 1px solid var(--color-border);
  background: var(--color-raised);
  color: var(--color-muted);
  ${monoData}
  white-space: nowrap;

  &.ui-input-addon-before {
    border-right: 0;
    border-radius: var(--radius) 0 0 var(--radius);
  }
  &.ui-input-addon-after {
    border-left: 0;
    border-radius: 0 var(--radius) var(--radius) 0;
  }
`

const PrefixIcon = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  z-index: 1;
  display: flex;
  align-items: center;
  color: var(--color-faint);
  transform: translateY(-50%);
`

const SuffixIcon = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  z-index: 1;
  display: flex;
  align-items: center;
  color: var(--color-faint);
  transform: translateY(-50%);
`

const ClearButton = styled.button<{ $hasSuffix?: boolean }>`
  ${ghostIconButton}
  position: absolute;
  right: ${({ $hasSuffix }) => ($hasSuffix ? '34px' : '8px')};
  top: 50%;
  z-index: 1;
  width: 24px;
  height: 24px;
  transform: translateY(-50%);
`

interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'prefix'
> {
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  disabled?: boolean
  addonBefore?: React.ReactNode
  addonAfter?: React.ReactNode
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  step?: number | string
  type?: string
  style?: React.CSSProperties
  className?: string
  id?: string
  allowClear?: boolean
  autoFocus?: boolean
  onPressEnter?: (e: React.KeyboardEvent) => void
  onBlur?: (e: React.FocusEvent) => void
  size?: string
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  disabled?: boolean
  rows?: number
  autoSize?: boolean
  autosize?: boolean | { minRows?: number; maxRows?: number }
  style?: React.CSSProperties
  className?: string
}

interface InputComponent extends React.ForwardRefExoticComponent<
  InputProps & React.RefAttributes<HTMLInputElement>
> {
  TextArea: React.ForwardRefExoticComponent<
    TextAreaProps & React.RefAttributes<HTMLTextAreaElement>
  >
  displayName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      value,
      onChange,
      placeholder,
      disabled,
      addonBefore,
      addonAfter,
      prefix,
      suffix,
      step,
      type = 'text',
      style,
      className,
      id,
      allowClear,
      autoFocus,
      onPressEnter,
      onBlur,
      size,
      ...rest
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const combinedRef = (ref || inputRef) as React.RefObject<HTMLInputElement>

    useEffect(() => {
      if (autoFocus && combinedRef.current) combinedRef.current.focus()
    }, [autoFocus, combinedRef])

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && onPressEnter) onPressEnter(e)
      },
      [onPressEnter],
    )

    const handleClear = useCallback(() => {
      if (onChange) {
        const event = {
          target: { value: '' },
          currentTarget: { value: '' },
        } as React.ChangeEvent<HTMLInputElement>
        onChange(event)
      }
      combinedRef.current?.focus()
    }, [onChange, combinedRef])

    const hasAddon = addonBefore || addonAfter
    const small = size === 'small'
    const paddingLeft = prefix ? '36px' : undefined
    const paddingRight =
      suffix && allowClear ? '60px' : suffix || allowClear ? '36px' : undefined

    const inputElement = (
      <StyledInput
        ref={combinedRef}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        step={step}
        id={id}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
        $size={size}
        style={
          hasAddon
            ? { paddingLeft, paddingRight }
            : { ...style, paddingLeft, paddingRight }
        }
        className={
          hasAddon ? 'ui-input' : joinClassNames('ui-input', className)
        }
        {...rest}
      />
    )

    const field = (
      <InputWrapper className="ui-input-wrapper">
        {prefix && (
          <PrefixIcon className="ui-input-prefix">{prefix}</PrefixIcon>
        )}
        {inputElement}
        {allowClear && value && (
          <ClearButton
            type="button"
            className="ui-input-clear"
            $hasSuffix={Boolean(suffix)}
            onClick={handleClear}
            aria-label="Clear"
          >
            <KitIcon name="close" size={14} />
          </ClearButton>
        )}
        {suffix && (
          <SuffixIcon className="ui-input-suffix">{suffix}</SuffixIcon>
        )}
      </InputWrapper>
    )

    if (hasAddon)
      return (
        <AddonWrapper
          $hasAddonBefore={Boolean(addonBefore)}
          $hasAddonAfter={Boolean(addonAfter)}
          style={style}
          className={joinClassNames('ui-input-group', className)}
        >
          {addonBefore && (
            <Addon
              className="ui-input-addon ui-input-addon-before"
              $small={small}
            >
              {addonBefore}
            </Addon>
          )}
          {field}
          {addonAfter && (
            <Addon
              className="ui-input-addon ui-input-addon-after"
              $small={small}
            >
              {addonAfter}
            </Addon>
          )}
        </AddonWrapper>
      )

    return field
  },
) as InputComponent

Input.displayName = 'Input'

// TextArea sub-component
const StyledTextArea = styled.textarea<{ $autoSize?: boolean }>`
  ${inputBaseStyles}
  height: auto;
  min-height: 80px;
  padding: 10px 12px;
  resize: ${({ $autoSize }) => ($autoSize ? 'none' : 'vertical')};
`

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  (
    {
      value,
      onChange,
      placeholder,
      disabled,
      rows = 4,
      autoSize,
      autosize,
      style,
      className,
      ...rest
    },
    ref,
  ) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const combinedRef = (ref ||
      textareaRef) as React.RefObject<HTMLTextAreaElement>
    const grow = autoSize ?? autosize === true
    const minRows =
      typeof autosize === 'object' && autosize ? autosize.minRows : undefined

    const adjustHeight = useCallback(() => {
      const el = combinedRef.current
      if (!el || !grow) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }, [grow, combinedRef])

    useEffect(() => {
      adjustHeight()
    }, [value, adjustHeight])

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onChange && onChange(e)
        // Schedule height adjustment after state update
        requestAnimationFrame(adjustHeight)
      },
      [onChange, adjustHeight],
    )

    return (
      <StyledTextArea
        ref={combinedRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        rows={grow ? minRows || 1 : minRows || rows}
        $autoSize={grow}
        style={style}
        className={joinClassNames('ui-input', 'ui-textarea', className)}
        {...rest}
      />
    )
  },
)

TextArea.displayName = 'Input.TextArea'

Input.TextArea = TextArea

export default Input
