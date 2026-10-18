import React from 'react'
import styled from 'styled-components'
import { joinClassNames, ringSpinner } from './kit-styles'

const SIZES: Record<string, number> = { small: 14, default: 20, large: 32 }

/* Ring spinner in the action color; a tip in muted small text below it. */
const SpinnerDot = styled.span<{ $size: number }>`
  ${ringSpinner}
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-width: ${({ $size }) => ($size > 20 ? 3 : 2)}px;
  color: var(--color-primary);
`

const SpinnerContainer = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const Wrapper = styled.div`
  position: relative;
`

const ContentOverlay = styled.div<{ $spinning: boolean }>`
  opacity: ${({ $spinning }) => ($spinning ? 0.4 : 1)};
  pointer-events: ${({ $spinning }) => ($spinning ? 'none' : 'auto')};
  transition: opacity var(--motion);
`

const OverlaySpinner = styled.div`
  position: absolute;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
`

const TipText = styled.div`
  margin-top: 8px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-align: center;
`

const SpinnerCenter = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`

interface SpinProps {
  spinning?: boolean
  size?: 'small' | 'default' | 'large'
  tip?: React.ReactNode
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const Spin: React.FC<SpinProps> = ({
  spinning = true,
  size = 'default',
  tip,
  children,
  style,
  className,
}) => {
  const dotSize = SIZES[size] || SIZES.default

  const spinner = (
    <SpinnerCenter
      className="ui-spin-dot-wrapper"
      role="status"
      aria-live="polite"
      aria-label={typeof tip === 'string' ? tip : 'Loading'}
    >
      <SpinnerDot className="ui-spin-dot" $size={dotSize} aria-hidden />
      {tip && <TipText className="ui-spin-tip">{tip}</TipText>}
    </SpinnerCenter>
  )

  if (!children)
    return (
      <SpinnerContainer
        style={style}
        className={joinClassNames('ui-spin', `ui-spin-${size}`, className)}
      >
        {spinning && spinner}
      </SpinnerContainer>
    )

  return (
    <Wrapper
      style={style}
      className={joinClassNames(
        'ui-spin-container',
        spinning && 'ui-spin-spinning',
        className,
      )}
    >
      {spinning && (
        <OverlaySpinner className="ui-spin-overlay">{spinner}</OverlaySpinner>
      )}
      <ContentOverlay className="ui-spin-blur" $spinning={spinning}>
        {children}
      </ContentOverlay>
    </Wrapper>
  )
}

export default Spin
