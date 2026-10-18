import React from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, skeletonBlock } from './kit-styles'

/* Loading placeholders on the raised surface, swept by the surface color. */
const staticBlock = css`
  &::after {
    animation: none;
  }
`

const SkeletonWrapper = styled.div`
  display: flex;
  gap: 16px;
  width: 100%;
  padding: 12px 0;
`

const AvatarPlaceholder = styled.div<{ $active: boolean }>`
  ${skeletonBlock}
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  ${({ $active }) => !$active && staticBlock}
`

const ContentArea = styled.div`
  flex: 1;
  min-width: 0;
`

const TitleBar = styled.div<{ $active: boolean; $width?: string }>`
  ${skeletonBlock}
  height: 16px;
  width: ${({ $width }) => $width || '38%'};
  margin-bottom: 12px;
  ${({ $active }) => !$active && staticBlock}

  &:last-child {
    margin-bottom: 0;
  }
`

const ParagraphLine = styled.div<{ $active: boolean }>`
  ${skeletonBlock}
  height: 14px;
  margin-bottom: 10px;
  ${({ $active }) => !$active && staticBlock}

  &:last-child {
    width: 61%;
    margin-bottom: 0;
  }
`

interface SkeletonProps {
  active?: boolean
  paragraph?: boolean | { rows?: number }
  title?: boolean | { width?: string | number }
  loading?: boolean
  avatar?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const Skeleton: React.FC<SkeletonProps> = ({
  active = true,
  paragraph = true,
  title = true,
  loading = true,
  avatar = false,
  children,
  style,
  className,
}) => {
  if (!loading && children) return <>{children}</>
  if (!loading) return null

  const rawTitleWidth =
    title && typeof title === 'object' ? title.width : undefined
  const titleWidth =
    typeof rawTitleWidth === 'number'
      ? Number.isNaN(rawTitleWidth)
        ? undefined
        : `${rawTitleWidth}px`
      : rawTitleWidth

  const paraRows =
    paragraph === false
      ? 0
      : paragraph && typeof paragraph === 'object' && paragraph.rows
        ? paragraph.rows
        : 3

  return (
    <SkeletonWrapper
      style={style}
      className={joinClassNames(
        'ui-skeleton',
        active && 'ui-skeleton-active',
        className,
      )}
      aria-busy="true"
    >
      {avatar && (
        <AvatarPlaceholder className="ui-skeleton-avatar" $active={active} />
      )}
      <ContentArea className="ui-skeleton-content">
        {title !== false && (
          <TitleBar
            className="ui-skeleton-title"
            $active={active}
            $width={titleWidth}
          />
        )}
        {Array.from({ length: paraRows }, (_, i) => (
          <ParagraphLine
            className="ui-skeleton-paragraph"
            key={i}
            $active={active}
          />
        ))}
      </ContentArea>
    </SkeletonWrapper>
  )
}

export default Skeleton
