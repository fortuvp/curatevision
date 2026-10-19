import React, { useEffect, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'

/*
 * Verified lists against every list, as a dial with one tick per list: the
 * verified ones light up in green from twelve o'clock, every other list
 * stays a quiet tick, so the lit run reads as its share of the whole. The
 * centre holds the whole (every list) with the verified count under it.
 * Past TICK_LIMIT lists the ticks would merge, so the ring draws two
 * proportional arcs instead.
 */

export const TICK_LIMIT = 360

const BOX = 240
const C = BOX / 2

const lit = keyframes`
  from { opacity: 0.12; }
  to { opacity: 1; }
`

const sweep = keyframes`
  from { stroke-dashoffset: var(--len); }
  to { stroke-dashoffset: 0; }
`

const Wrap = styled.figure<{ $size: number }>`
  position: relative;
  flex: 0 0 auto;
  width: ${({ $size }) => $size}px;
  max-width: 100%;
  aspect-ratio: 1;
  margin: 0;

  svg {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .on {
    opacity: 0.12;
  }

  .halo {
    opacity: 0;
  }

  &[data-on] .on {
    animation: ${lit} 520ms cubic-bezier(0.16, 1, 0.3, 1) both;
    animation-delay: calc(var(--k, 0) * 1ms);
  }

  &[data-on] .halo {
    opacity: 1;
    stroke-dasharray: var(--len);
    animation: ${sweep} 1200ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  @media (prefers-reduced-motion: reduce) {
    .on,
    .halo,
    &[data-on] .on,
    &[data-on] .halo {
      opacity: 1;
      animation: none;
    }
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

const Count = styled.span<{ $px: number }>`
  color: var(--color-text);
  font-family: var(--font-figure);
  font-size: ${({ $px }) => $px}px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const Caption = styled.span`
  color: var(--color-muted);
  font-size: 12px;
  line-height: 15px;
`

/* The verified count, keyed by the lit run's green. */
const Lit = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  color: var(--color-text);
  font-family: var(--font-figure);
  font-size: 12px;
  line-height: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  i {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--status-registered);
    box-shadow: 0 0 8px var(--status-registered);
  }
`

const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const
}

const arcPath = (r: number, from: number, to: number) => {
  const [x0, y0] = polar(r, from)
  const [x1, y1] = polar(r, to)
  return `M${x0} ${y0}A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x1} ${y1}`
}

export const VerifiedRing = ({
  verified,
  total,
  size = 168,
  label,
}: {
  verified: number
  total: number
  size?: number
  /** Accessible description of the comparison. */
  label: string
}) => {
  const wrap = useRef<HTMLElement>(null)
  const [on, setOn] = useState(false)

  // Light up once in view (the gauges sit below the fold).
  useEffect(() => {
    const node = wrap.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setOn(true)
      return
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setOn(true)
        io.disconnect()
      }
    })
    io.observe(node)
    return () => io.disconnect()
  }, [])

  const share = total > 0 ? verified / total : 0
  const perList = total > 0 && total <= TICK_LIMIT
  const step = perList ? 360 / total : 0
  // The verified run, as an arc under exactly its ticks (a soft green halo).
  const runStart = -step * 0.5
  const runEnd = Math.min(runStart + 359.9, share * 360 - step * 0.5)
  const figure = total.toLocaleString('en-US')
  const px = Math.round(size * (figure.length > 3 ? 0.17 : 0.21))

  return (
    <Wrap
      ref={wrap}
      $size={size}
      role="img"
      aria-label={label}
      data-on={on ? '' : undefined}
    >
      <svg viewBox={`0 0 ${BOX} ${BOX}`} aria-hidden>
        <circle
          cx={C}
          cy={C}
          r={72}
          fill="none"
          stroke="var(--glass-border)"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        {verified > 0 && runEnd > runStart && (
          <path
            className="halo"
            d={arcPath(96, runStart, runEnd)}
            fill="none"
            stroke="var(--status-registered)"
            strokeOpacity="0.16"
            strokeWidth="30"
            strokeLinecap="butt"
            pathLength={1000}
            style={{ ['--len' as string]: '1000' }}
          />
        )}
        {perList ? (
          Array.from({ length: total }, (_, index) => {
            const deg = index * step
            const isVerified = index < verified
            const [x1, y1] = polar(isVerified ? 84 : 90, deg)
            const [x2, y2] = polar(isVerified ? 108 : 102, deg)
            return (
              <line
                key={index}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                className={isVerified ? 'on' : undefined}
                stroke={
                  isVerified ? 'var(--status-registered)' : 'var(--color-faint)'
                }
                strokeOpacity={isVerified ? 1 : 0.62}
                strokeWidth={isVerified ? 2.4 : 1.2}
                strokeLinecap="round"
                style={
                  isVerified
                    ? {
                        ['--k' as string]: Math.round(
                          (index * 600) / Math.max(1, verified),
                        ),
                      }
                    : undefined
                }
              />
            )
          })
        ) : total > 0 ? (
          <>
            <circle
              cx={C}
              cy={C}
              r={96}
              fill="none"
              stroke="var(--color-faint)"
              strokeOpacity="0.5"
              strokeWidth="12"
            />
            {verified > 0 && (
              <path
                className="on"
                d={arcPath(96, 0, Math.max(2.5, Math.min(359.9, share * 360)))}
                fill="none"
                stroke="var(--status-registered)"
                strokeWidth="18"
                strokeLinecap="round"
              />
            )}
          </>
        ) : (
          <circle
            cx={C}
            cy={C}
            r={96}
            fill="none"
            stroke="var(--color-raised)"
            strokeWidth="12"
          />
        )}
      </svg>
      <Center>
        <Count $px={px}>{total > 0 ? figure : '—'}</Count>
        <Caption>
          {total === 1 ? 'list' : total > 0 ? 'lists' : 'No lists'}
        </Caption>
        {total > 0 && (
          <Lit>
            <i aria-hidden />
            {verified.toLocaleString('en-US')} verified
          </Lit>
        )}
      </Center>
    </Wrap>
  )
}

export default VerifiedRing
