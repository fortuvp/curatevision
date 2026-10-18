import React, { useState, useCallback } from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import { ghostIconButton, joinClassNames, monoLabel } from './kit-styles'

/* Tag = chip (DESIGN.md): 24px, radius 4, raised surface, mono label. */
const chipStyles = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-sm);
  ${monoLabel}
  white-space: nowrap;
  vertical-align: middle;
`

const StyledTag = styled.span<{ $color?: string }>`
  ${chipStyles}
  background: ${({ $color }) => $color || 'var(--color-raised)'};
  color: ${({ $color }) =>
    $color ? 'var(--color-on-primary)' : 'var(--color-muted)'};
`

const CloseButton = styled.button`
  ${ghostIconButton}
  width: 16px;
  height: 16px;
  margin-right: -4px;
  color: inherit;
  opacity: 0.7;

  &:hover:not(:disabled) {
    background: transparent;
    color: inherit;
    opacity: 1;
  }
`

const CheckableTagStyled = styled.button<{ $checked?: boolean }>`
  ${chipStyles}
  background: ${({ $checked }) =>
    $checked ? 'var(--color-primary-soft)' : 'var(--color-raised)'};
  color: ${({ $checked }) =>
    $checked ? 'var(--color-primary)' : 'var(--color-muted)'};
  cursor: pointer;
  user-select: none;
  transition:
    background var(--motion),
    color var(--motion);

  &:hover {
    color: ${({ $checked }) =>
      $checked ? 'var(--color-primary)' : 'var(--color-text)'};
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

  return (
    <StyledTag
      $color={color}
      style={style}
      className={joinClassNames('ui-tag', className)}
    >
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
