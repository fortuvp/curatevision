import React from 'react'
import styled from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames } from './kit-styles'

const SIZES: Record<string, number> = {
  small: 24,
  default: 32,
  large: 40,
}

const resolveSize = (size: number | string): number => {
  if (typeof size === 'number') return size
  return SIZES[size] || SIZES.default
}

/* Raised glass with a hairline and top highlight; round unless square is asked for. */
const AvatarWrapper = styled.span<{ $size: number; $shape: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border: 1px solid var(--glass-border);
  border-radius: ${({ $shape }) =>
    $shape === 'square' ? 'var(--radius)' : 'var(--radius-pill)'};
  background: var(--color-raised);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
  color: var(--color-muted);
  font-family: var(--font-sans);
  font-size: ${({ $size }) => Math.round($size * 0.4)}px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  vertical-align: middle;

  svg {
    display: block;
  }
`

const AvatarImg = styled.img`
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
`

interface AvatarProps {
  shape?: 'circle' | 'square'
  size?: 'small' | 'default' | 'large' | number
  icon?: React.ReactNode
  src?: string
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
}

const Avatar: React.FC<AvatarProps> = ({
  shape = 'circle',
  size = 'default',
  icon,
  src,
  style,
  className,
  children,
}) => {
  const px = resolveSize(size)
  const iconSize = Math.round(px * 0.5)

  let content: React.ReactNode = children
  if (src) content = <AvatarImg src={src} alt="" />
  else if (typeof icon === 'string')
    content = <KitIcon name="file" size={iconSize} />
  else if (icon) content = icon

  return (
    <AvatarWrapper
      $size={px}
      $shape={shape}
      style={style}
      className={joinClassNames('ui-avatar', className)}
    >
      {content}
    </AvatarWrapper>
  )
}

export default Avatar
