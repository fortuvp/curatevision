import React from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, kitLabel } from './kit-styles'

/* Hairline rule; an optional small label sits on it (left, center or right). */
const DividerWrapper = styled.div<{
  $hasChildren: boolean
  $orientation: string
}>`
  display: flex;
  align-items: center;
  margin: 24px 0;
  color: var(--color-faint);
  ${kitLabel}
  white-space: nowrap;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--glass-border);
  }

  ${({ $hasChildren }) =>
    !$hasChildren &&
    css`
      &::after {
        display: none;
      }
    `}

  ${({ $hasChildren, $orientation }) =>
    $hasChildren &&
    css`
      &::before {
        flex: ${$orientation === 'left' ? '0 0 16px' : '1'};
      }
      &::after {
        flex: ${$orientation === 'right' ? '0 0 16px' : '1'};
      }
    `}
`

const LabelText = styled.span`
  padding: 0 12px;
`

interface DividerProps {
  orientation?: 'left' | 'center' | 'right'
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const Divider: React.FC<DividerProps> = ({
  orientation = 'center',
  children,
  style,
  className,
}) => (
  <DividerWrapper
    $hasChildren={Boolean(children)}
    $orientation={orientation}
    style={style}
    className={joinClassNames(
      'ui-divider',
      Boolean(children) && 'ui-divider-with-text',
      `ui-divider-${orientation}`,
      className,
    )}
    role="separator"
  >
    {children && <LabelText className="ui-divider-text">{children}</LabelText>}
  </DividerWrapper>
)

export default Divider
