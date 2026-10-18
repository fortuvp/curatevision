import React from 'react'
import styled, { keyframes } from 'styled-components'

/*
 * Ring chart for the dashboard hero: one arc per segment with small gaps,
 * rounded caps and a soft glow, the total set large and light in the middle.
 * Only real counts go in; the arcs are proportional to them.
 */

const Wrap = styled.figure<{ $size?: number }>`
  position: relative;
  margin: 0;
  width: ${({ $size }) => ($size ? `${$size}px` : '100%')};
  max-width: ${({ $size }) => ($size ? `${$size}px` : '340px')};
  flex: 0 0 auto;
  aspect-ratio: 1;
`

const sweep = keyframes`
  from { stroke-dashoffset: var(--len); }
  to { stroke-dashoffset: 0; }
`

const ArcPath = styled.path`
  stroke-dasharray: var(--len);
  animation: ${sweep} 1600ms cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--delay, 0ms);

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
`

const Center = styled.figcaption`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  text-align: center;
  pointer-events: none;
`

const Total = styled.span`
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 28px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
`

const Caption = styled.span`
  color: var(--color-faint);
  font-size: 11px;
  line-height: 14px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

export interface OrbitSegment {
  key: string
  label: string
  value: number
  color: string
}

const polar = (cx: number, cy: number, r: number, angle: number) => {
  const rad = ((angle - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

const arcPath = (
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
) => {
  const a = polar(cx, cy, r, end)
  const b = polar(cx, cy, r, start)
  const large = end - start > 180 ? 1 : 0
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 0 ${b.x} ${b.y}`
}

export const OrbitChart = ({
  segments,
  total,
  caption,
  ariaLabel,
  size,
}: {
  segments: OrbitSegment[]
  total: string
  caption: string
  ariaLabel: string
  size?: number
}) => {
  const box = 320
  const c = box / 2
  const r = 132
  const sum = segments.reduce((acc, seg) => acc + seg.value, 0)
  const visible = segments.filter((seg) => seg.value > 0)
  const gap = visible.length > 1 ? 4 : 0
  let cursor = 0
  const arcs = visible.map((seg) => {
    const sweep = sum ? (seg.value / sum) * 360 : 0
    const start = cursor + gap / 2
    // keep tiny shares visible as a short arc
    const end = cursor + Math.max(sweep, 2.5) - gap / 2
    cursor += sweep
    return { ...seg, start, end }
  })

  return (
    <Wrap $size={size} role="img" aria-label={ariaLabel}>
      <Svg viewBox={`0 0 ${box} ${box}`}>
        <defs>
          <filter id="orbit-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle
          cx={c}
          cy={c}
          r={r}
          fill="none"
          stroke="var(--color-raised)"
          strokeWidth="18"
        />
        <circle
          cx={c}
          cy={c}
          r={r - 26}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        <circle
          cx={c}
          cy={c}
          r={r + 22}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth="1"
        />
        {arcs.map((arc, index) => (
          <ArcPath
            key={arc.key}
            d={arcPath(c, c, r, arc.start, arc.end)}
            fill="none"
            stroke={arc.color}
            strokeWidth="18"
            strokeLinecap="round"
            filter="url(#orbit-glow)"
            pathLength={1000}
            style={{
              ['--len' as string]: '1000',
              ['--delay' as string]: `${index * 180}ms`,
            }}
          />
        ))}
      </Svg>
      <Center>
        <Total>{total}</Total>
        <Caption>{caption}</Caption>
      </Center>
    </Wrap>
  )
}

export default OrbitChart
