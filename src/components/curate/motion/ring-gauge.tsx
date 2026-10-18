import React, { useEffect, useId, useState } from 'react'
import styled from 'styled-components'
import { AnimatedNumber } from './animated-number'

/*
 * Ring gauge: a gradient stroke that draws in from 12 o'clock, a soft glow
 * under it, tick marks around the track and the figure counting up inside.
 * Only real ratios go in.
 */

const Wrap = styled.figure<{ $size: number }>`
  position: relative;
  margin: 0;
  width: ${({ $size }) => $size}px;
  max-width: 100%;
  aspect-ratio: 1;
  flex: 0 0 auto;
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
`

const Arc = styled.circle<{ $length: number; $dash: number }>`
  stroke-dasharray: ${({ $length }) => $length};
  stroke-dashoffset: ${({ $length, $dash }) => $length - $dash};
  transition: stroke-dashoffset 1600ms cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Center = styled.figcaption`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  text-align: center;
  pointer-events: none;
`

const Figure = styled.span<{ $size: number }>`
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: ${({ $size }) => Math.round($size * 0.2)}px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
`

const Caption = styled.span`
  max-width: 70%;
  color: var(--color-faint);
  font-size: 12px;
  line-height: 15px;
  font-weight: 400;
`

export const RingGauge = ({
  ratio,
  size = 200,
  stroke = 12,
  from = 'var(--aurora-b)',
  to = 'var(--color-primary)',
  label,
  value,
  caption,
}: {
  /** 0..1 */
  ratio: number
  size?: number
  stroke?: number
  from?: string
  to?: string
  /** Accessible description, e.g. "Challenges won: 7 of 17" */
  label: string
  /** The figure in the middle; defaults to the percentage. */
  value?: number
  caption?: string
}) => {
  const id = useId().replace(/:/g, '')
  const r = 50 - stroke / 2 - 4
  const length = 2 * Math.PI * r
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0))
  // Start empty, then draw to the value on the next frame.
  const [drawn, setDrawn] = useState(0)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setDrawn(clamped))
    return () => cancelAnimationFrame(frame)
  }, [clamped])
  const ticks = Array.from({ length: 48 })

  return (
    <Wrap $size={size} role="img" aria-label={label}>
      <Svg viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`g-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
          <filter id={`f-${id}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>
        {ticks.map((_, index) => {
          const angle = (index / ticks.length) * 2 * Math.PI
          const inner = 50 - 1.5
          const outer = 50
          return (
            <line
              key={index}
              x1={50 + inner * Math.sin(angle)}
              y1={50 - inner * Math.cos(angle)}
              x2={50 + outer * Math.sin(angle)}
              y2={50 - outer * Math.cos(angle)}
              stroke="var(--glass-border)"
              strokeWidth="0.6"
            />
          )
        })}
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--color-raised)"
          strokeWidth={stroke}
        />
        <Arc
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#g-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          filter={`url(#f-${id})`}
          opacity="0.7"
          $length={length}
          $dash={length * drawn}
        />
        <Arc
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#g-${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          $length={length}
          $dash={length * drawn}
        />
      </Svg>
      <Center>
        <Figure $size={size}>
          {value === undefined ? (
            <AnimatedNumber
              value={clamped * 100}
              format={(n) => `${Math.round(n)}%`}
            />
          ) : (
            <AnimatedNumber value={value} />
          )}
        </Figure>
        {caption && <Caption>{caption}</Caption>}
      </Center>
    </Wrap>
  )
}

export default RingGauge
