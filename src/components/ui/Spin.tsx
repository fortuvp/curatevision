import React from 'react'
import styled from 'styled-components'
import { joinClassNames, ringSpinner } from './kit-styles'

const SIZES: Record<string, number> = { small: 16, default: 24, large: 36 }

/*
 * Spin, v2: a thin arc in the action color that fades into its tail, with a
 * soft glow; a tip in faint small text below it. Content placeholders use
 * Skeleton instead.
 */
const SpinnerDot = styled.span<{ $size: number }>`
  ${ringSpinner}
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  color: var(--color-primary);
  filter: drop-shadow(
    0 0 6px color-mix(in srgb, var(--color-primary) 55%, transparent)
  );
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
  filter: ${({ $spinning }) => ($spinning ? 'blur(1px)' : 'none')};
  pointer-events: ${({ $spinning }) => ($spinning ? 'none' : 'auto')};
  transition:
    opacity var(--dur-hover) var(--ease-out),
    filter var(--dur-hover) var(--ease-out);
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
  margin-top: 10px;
  color: var(--color-faint);
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
