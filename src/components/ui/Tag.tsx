import React, { useState, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import {
  ghostIconButton,
  joinClassNames,
  kitTransition,
  toneColor,
  toneFor,
  type Tone,
} from './kit-styles'

/*
 * Tag, v2: a pill chip, 24px tall, sans 12/500 on raised glass with a
 * hairline. A status word in the color prop tints it in that status role with a
 * haloed dot (the words carry the meaning); any other color is used as the
 * fill, as before. CheckableTag is the filter chip: tinted blue when on.
 */
const chipStyles = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  font-family: var(--font-sans);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  letter-spacing: 0;
  white-space: nowrap;
  vertical-align: middle;
`

const ToneDot = styled.span<{ $tone: Tone }>`
  width: 6px;
  height: 6px;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  background: ${({ $tone }) => toneColor($tone)};
  box-shadow: 0 0 0 3px
    color-mix(in srgb, ${({ $tone }) => toneColor($tone)} 22%, transparent);
`

const StyledTag = styled.span<{ $color?: string; $tone?: Tone }>`
  ${chipStyles}
  background: var(--color-raised);
  color: var(--color-muted);

  ${({ $tone }) =>
    $tone &&
    css`
      padding-left: 8px;
      border-color: color-mix(in srgb, ${toneColor($tone)} 30%, transparent);
      background: color-mix(in srgb, ${toneColor($tone)} 12%, transparent);
      color: var(--color-text);
    `}

  ${({ $color, $tone }) =>
    $color &&
    !$tone &&
    css`
      border-color: transparent;
      background: ${$color};
      color: var(--color-on-primary);
    `}
`

const CloseButton = styled.button`
  ${ghostIconButton}
  width: 16px;
  height: 16px;
  margin-right: -4px;
  border: 0;
  color: inherit;
  opacity: 0.7;

  &:hover:not(:disabled) {
    border: 0;
    background: transparent;
    color: inherit;
    opacity: 1;
  }
`

const CheckableTagStyled = styled.button<{ $checked?: boolean }>`
  ${chipStyles}
  height: 28px;
  padding: 0 12px;
  border-color: ${({ $checked }) =>
    $checked
      ? 'color-mix(in srgb, var(--color-primary) 45%, transparent)'
      : 'var(--glass-border)'};
  background: ${({ $checked }) =>
    $checked ? 'var(--color-primary-soft)' : 'var(--color-raised)'};
  color: ${({ $checked }) =>
    $checked ? 'var(--color-text)' : 'var(--color-muted)'};
  cursor: pointer;
  user-select: none;
  transition: ${kitTransition(
    'background',
    'color',
    'border-color',
    'transform',
  )};

  &:hover {
    border-color: ${({ $checked }) =>
      $checked
        ? 'color-mix(in srgb, var(--color-primary) 60%, transparent)'
        : 'var(--color-border-strong)'};
    color: var(--color-text);
  }

  &:active {
    transform: scale(0.97);
  }
`

interface TagProps {
  color?: string
  closable?: boolean
  onClose?: (e: React.MouseEvent) => void
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface CheckableTagProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface TagComponent extends React.FC<TagProps> {
  CheckableTag: React.FC<CheckableTagProps>
}

const Tag: TagComponent = ({
  color,
  closable = false,
  onClose,
  children,
  style,
  className,
}) => {
  const [visible, setVisible] = useState(true)

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setVisible(false)
      if (onClose) onClose(e)
    },
    [onClose],
  )

  if (!visible) return null

  const tone = toneFor(color)

  return (
    <StyledTag
      $color={color}
      $tone={tone}
      style={style}
      className={joinClassNames('ui-tag', className)}
    >
      {tone && <ToneDot $tone={tone} aria-hidden />}
      {children}
      {closable && (
        <CloseButton
          type="button"
          className="ui-tag-close"
          onClick={handleClose}
          aria-label="Remove"
        >
          <KitIcon name="close" size={12} />
        </CloseButton>
      )}
    </StyledTag>
  )
}

const CheckableTag: React.FC<CheckableTagProps> = ({
  checked,
  onChange,
  children,
  style,
  className,
}) => {
  const handleClick = useCallback(() => {
    if (onChange) onChange(!checked)
  }, [checked, onChange])

  return (
    <CheckableTagStyled
      type="button"
      aria-pressed={Boolean(checked)}
      $checked={checked}
      onClick={handleClick}
      style={style}
      className={joinClassNames(
        'ui-tag-checkable',
        checked && 'ui-tag-checked',
        className,
      )}
    >
      {children}
    </CheckableTagStyled>
  )
}

CheckableTag.displayName = 'Tag.CheckableTag'
Tag.CheckableTag = CheckableTag

export default Tag
