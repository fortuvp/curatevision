import React, { useCallback } from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import { ghostIconButton, joinClassNames } from './kit-styles'

const typeColor: Record<string, string> = {
  secondary: 'var(--color-muted)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  success: 'var(--color-success)',
}

const getTypeColor = ({ textType }: { textType?: string }): string =>
  typeColor[textType || ''] || 'var(--color-text)'

const ellipsisMixin = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

interface StyledTextProps {
  textType?: string
  $strong?: boolean
  $ellipsis?: boolean
}

const StyledText = styled.span<StyledTextProps>`
  color: ${getTypeColor};
  ${({ $strong }) =>
    $strong &&
    css`
      font-weight: 500;
    `}
  ${({ $ellipsis }) => $ellipsis && ellipsisMixin}
`

const CopyButton = styled.button`
  ${ghostIconButton}
  width: 24px;
  height: 24px;
  margin-left: 4px;
  vertical-align: middle;
  color: var(--color-faint);
`

/*
 * Titles, v2: levels 1 to 3 in the display face (Urbanist 500, tight), 4 and
 * 5 in Geist 500. Sentence case.
 */
const titleSizes: Record<number, ReturnType<typeof css>> = {
  1: css`
    font-family: var(--font-display);
    font-size: clamp(28px, 1.4vw + 18px, 40px);
    line-height: 1.1;
    letter-spacing: -0.03em;
  `,
  2: css`
    font-family: var(--font-display);
    font-size: 26px;
    line-height: 32px;
    letter-spacing: -0.025em;
  `,
  3: css`
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 26px;
    letter-spacing: -0.02em;
  `,
  4: css`
    font-size: var(--fs-body-lg);
    line-height: var(--lh-body-lg);
    letter-spacing: -0.005em;
  `,
  5: css`
    font-size: var(--fs-body);
    line-height: var(--lh-body);
  `,
}

interface StyledTitleProps {
  $level: number
}

const StyledTitle = styled.h1<StyledTitleProps>`
  margin: 0 0 8px;
  color: var(--color-text);
  font-weight: 500;
  ${({ $level }) => titleSizes[$level] || titleSizes[1]}
`

interface StyledParagraphProps {
  textType?: string
  $ellipsis?: boolean
}

const StyledParagraph = styled.p<StyledParagraphProps>`
  max-width: 68ch;
  margin: 0 0 12px;
  color: ${getTypeColor};
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  ${({ $ellipsis }) => $ellipsis && ellipsisMixin}
`

interface TextProps {
  type?: string
  copyable?: boolean
  ellipsis?: boolean
  strong?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  [key: string]: unknown
}

const Text: React.FC<TextProps> = ({
  type,
  copyable,
  ellipsis,
  strong,
  children,
  style,
  className,
  ...rest
}) => {
  const handleCopy = useCallback(() => {
    const text = typeof children === 'string' ? children : ''
    if (text && navigator.clipboard) navigator.clipboard.writeText(text)
  }, [children])

  return (
    <StyledText
      textType={type}
      $strong={strong}
      $ellipsis={ellipsis}
      style={style}
      className={joinClassNames(
        'ui-typography',
        'ui-typography-text',
        type && `ui-typography-${type}`,
        className,
      )}
      {...rest}
    >
      {children}
      {copyable && (
        <CopyButton
          type="button"
          className="ui-typography-copy"
          onClick={handleCopy}
          title="Copy"
          aria-label="Copy"
        >
          <KitIcon name="copy" size={14} />
        </CopyButton>
      )}
    </StyledText>
  )
}

interface TitleProps {
  level?: 1 | 2 | 3 | 4 | 5
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  [key: string]: unknown
}

const Title: React.FC<TitleProps> = ({
  level = 1,
  children,
  style,
  className,
  ...rest
}) => {
  const tag =
    `h${Math.min(Math.max(level, 1), 5)}` as keyof JSX.IntrinsicElements
  return (
    <StyledTitle
      as={tag}
      $level={level}
      style={style}
      className={joinClassNames(
        'ui-typography',
        'ui-typography-title',
        className,
      )}
      {...rest}
    >
      {children}
    </StyledTitle>
  )
}

interface ParagraphProps {
  type?: string
  ellipsis?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  [key: string]: unknown
}

const Paragraph: React.FC<ParagraphProps> = ({
  type,
  ellipsis,
  children,
  style,
  className,
  ...rest
}) => (
  <StyledParagraph
    textType={type}
    $ellipsis={ellipsis}
    style={style}
    className={joinClassNames(
      'ui-typography',
      'ui-typography-paragraph',
      type && `ui-typography-${type}`,
      className,
    )}
    {...rest}
  >
    {children}
  </StyledParagraph>
)

const Typography = { Text, Title, Paragraph }

export default Typography
