import React from 'react'
import styled, { keyframes } from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames, kitRadius } from './kit-styles'

/*
 * Empty state, v2 (SPEC 7.2): three small item tiles fanned at -10, 0 and
 * +10 degrees on a soft blue halo, drifting a few degrees on a slow loop
 * (still under reduced motion), then one line of text and an optional
 * action. No grid, no icon-in-a-box.
 */
const Wrapper = styled.div`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 36px 24px;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  text-align: center;
`

const ImageWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
  color: var(--color-faint);

  &::before {
    content: '';
    position: absolute;
    inset: -30px -40px;
    z-index: -1;
    border-radius: var(--radius-pill);
    background: radial-gradient(
      closest-side,
      color-mix(in srgb, var(--color-primary) 18%, transparent),
      transparent
    );
    pointer-events: none;
  }
`

/* Each tile rocks ±3° around its own fan angle (--a). */
const drift = keyframes`
  from { transform: rotate(calc(var(--a) - 3deg)); }
  to { transform: rotate(calc(var(--a) + 3deg)); }
`

const Fan = styled.span`
  position: relative;
  display: block;
  width: 88px;
  height: 56px;
`

/*
 * One tile: a raised card with a thumbnail square and two text lines. The
 * centre tile sits in front and catches the light.
 */
const Tile = styled.span<{ $angle: number; $front?: boolean }>`
  --a: ${({ $angle }) => $angle}deg;
  position: absolute;
  top: 6px;
  left: 50%;
  z-index: ${({ $front }) => ($front ? 1 : 0)};
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 36px;
  height: 46px;
  margin-left: -18px;
  padding: 6px;
  border: 1px solid
    ${({ $front }) =>
      $front
        ? 'color-mix(in srgb, var(--color-primary) 40%, var(--glass-border))'
        : 'var(--glass-border)'};
  border-radius: var(--radius-sm);
  background: ${({ $front }) =>
    $front
      ? 'linear-gradient(var(--color-raised), var(--color-raised)), var(--color-surface)'
      : 'var(--color-surface)'};
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    0 10px 24px -14px
      ${({ $front }) => ($front ? 'var(--color-primary)' : 'var(--stage)')};
  transform: rotate(var(--a));
  transform-origin: 50% 120%;
  translate: ${({ $angle }) => `${$angle * 2.2}px 0`};

  @media (prefers-reduced-motion: no-preference) {
    animation: ${drift} 6s var(--ease-in-out) infinite alternate;
    animation-delay: ${({ $angle }) => `${$angle * 60}ms`};
  }

  /* Thumbnail square */
  &::before {
    content: '';
    display: block;
    width: 12px;
    height: 12px;
    border-radius: calc(${kitRadius.xs} / 2);
    background: ${({ $front }) =>
      $front
        ? 'color-mix(in srgb, var(--color-primary) 45%, transparent)'
        : 'var(--color-raised)'};
  }

  /* Two text lines */
  &::after {
    content: '';
    display: block;
    width: 100%;
    height: 3px;
    border-radius: var(--radius-pill);
    background: var(--color-raised);
    box-shadow: 0 6px 0 var(--color-raised);
  }
`

const FannedTiles = () => (
  <Fan aria-hidden="true">
    <Tile $angle={-10} />
    <Tile $angle={10} />
    <Tile $angle={0} $front />
  </Fan>
)

const DescriptionText = styled.div`
  max-width: 40ch;
  color: var(--color-muted);
`

const Extra = styled.div`
  margin-top: 12px;
`

interface EmptyProps {
  description?: React.ReactNode | false
  image?: React.ReactNode | string
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface EmptyComponent extends React.FC<EmptyProps> {
  PRESENTED_IMAGE_SIMPLE: string
}

const Empty: EmptyComponent = ({
  description = 'No data',
  image,
  children,
  style,
  className,
}) => {
  const isSimple = image === Empty.PRESENTED_IMAGE_SIMPLE
  const customImage = image && !isSimple && typeof image !== 'string'

  return (
    <Wrapper
      style={style}
      className={joinClassNames(
        'ui-empty',
        isSimple && 'ui-empty-simple',
        className,
      )}
    >
      <ImageWrapper className="ui-empty-image">
        {customImage ? (
          image
        ) : isSimple ? (
          <KitIcon name="inbox" size={20} />
        ) : (
          <FannedTiles />
        )}
      </ImageWrapper>
      {description !== false && (
        <DescriptionText className="ui-empty-description">
          {description}
        </DescriptionText>
      )}
      {children && <Extra className="ui-empty-footer">{children}</Extra>}
    </Wrapper>
  )
}

Empty.PRESENTED_IMAGE_SIMPLE = 'simple'

export default Empty
