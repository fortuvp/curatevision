import React, { useEffect, useId, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'

/*
 * The address's actions over time, drawn like the home page's activity wave:
 * submissions and removal requests as a glowing area above the baseline,
 * challenges as amber bars mirrored below it. Each half has its own scale,
 * read off a small axis at the right edge (top value, 0 at the baseline,
 * bottom value), each value beside a short tick at its height; no gridlines.
 * A scanner reveal sweeps in once the chart is in view and the head at the
 * newest bucket arrives with the line; it pings only when that bucket holds
 * actions. Hover snaps a crosshair to a bucket and reads both counts.
 * Reduced motion shows the final state.
 */

const scan = keyframes`
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
`

const ping = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  70%, 100% { transform: scale(4.2); opacity: 0; }
`

const arrive = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const Wrap = styled.div`
  position: relative;
  width: 100%;
  touch-action: pan-y;
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  overflow: visible;

  .reveal {
    clip-path: inset(0 100% 0 0);
  }

  &[data-in='true'] .reveal {
    animation: ${scan} 1400ms cubic-bezier(0.65, 0, 0.35, 1) both;
  }

  /* The head waits for the scan to reach the right edge. */
  .head {
    opacity: 0;
  }

  &[data-in='true'] .head {
    animation: ${arrive} 320ms ease-out 1280ms both;
  }

  .ping {
    transform-box: fill-box;
    transform-origin: center;
    animation: ${ping} 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;
  }

  text {
    font-family: var(--font-figure);
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    fill: var(--color-faint);
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal,
    &[data-in='true'] .reveal {
      clip-path: none;
      animation: none;
    }

    .head,
    &[data-in='true'] .head {
      opacity: 1;
      animation: none;
    }

    .ping {
      animation: none;
      opacity: 0;
    }
  }
`

const Tip = styled.div`
  position: absolute;
  top: 0;
  min-width: 168px;
  padding: 10px 12px;
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  background: var(--color-surface);
  box-shadow: var(--shadow-overlay);
  pointer-events: none;
  transform: translateX(-50%);
  transition: left 160ms cubic-bezier(0.16, 1, 0.3, 1);
  font-size: 12px;

  b {
    display: block;
    margin-bottom: 8px;
    color: var(--color-faint);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 400;
  }

  div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: var(--color-muted);
  }

  div + div {
    margin-top: 4px;
  }

  i {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 8px;
    border-radius: var(--radius-pill);
  }

  span:last-child {
    color: var(--color-text);
    font-size: 13px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
`

const Axis = styled.div`
  position: relative;
  height: 16px;
  margin-top: 4px;
  color: var(--color-faint);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;

  span {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
  }

  span:first-child {
    transform: none;
  }

  span:last-child {
    transform: translateX(-100%);
  }
`

/** Monotone cubic (Fritsch–Carlson): never overshoots, never dips below zero. */
const monotonePath = (pts: [number, number][]) => {
  const n = pts.length
  if (n < 2) return ''
  const dx: number[] = []
  const m: number[] = []
  const t: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0]
    m[i] = dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i]
  }
  t[0] = m[0]
  t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      t[i] = 0
      continue
    }
    const w1 = 2 * dx[i] + dx[i - 1]
    const w2 = dx[i] + 2 * dx[i - 1]
    t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i])
  }
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${
      pts[i + 1][1] - t[i + 1] * h
    } ${pts[i + 1][0]},${pts[i + 1][1]}`
  }
  return d
}

/** A round top for the scale: 5, 10, 20, 30, 50, 100… */
const niceMax = (max: number) => {
  if (max <= 5) return 5
  const pow = 10 ** Math.floor(Math.log10(max))
  const unit = [1, 2, 3, 5, 10].find((step) => step * pow >= max) ?? 10
  return unit * pow
}

/** Room at the right edge for the scale values. */
const GUTTER = 40

export const ActivityChart = ({
  labels,
  axisLabels = labels,
  requests,
  challenges,
  height = 220,
  ariaLabel,
}: {
  /** One label per bucket, oldest first (tooltip). */
  labels: string[]
  /** Shorter labels for the axis; defaults to `labels`. */
  axisLabels?: string[]
  /** Submissions and removal requests per bucket. */
  requests: number[]
  /** Challenges per bucket. */
  challenges: number[]
  height?: number
  ariaLabel: string
}) => {
  const id = useId().replace(/:/g, '')
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<number | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    setWidth(Math.round(node.getBoundingClientRect().width))
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width)),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.35 },
    )
    io.observe(node)
    return () => io.disconnect()
  }, [])

  const count = labels.length
  const w = Math.max(width, 240)
  // The plot ends before the gutter that holds the scale values.
  const plotW = w - GUTTER
  const mid = Math.round(height * 0.7)
  const top = 18
  const bottom = height - 4
  const upMax = niceMax(Math.max(1, ...requests))
  const downMax = niceMax(Math.max(1, ...challenges))
  const x = (i: number) => (count <= 1 ? plotW / 2 : (i / (count - 1)) * plotW)
  const yUp = (v: number) => mid - (v / upMax) * (mid - top)
  const yDown = (v: number) => mid + 4 + (v / downMax) * (bottom - mid - 4)
  const pts = requests.map((v, i) => [x(i), yUp(v)] as [number, number])
  const line = monotonePath(pts)
  const area = line ? `${line}L${plotW},${mid}L0,${mid}Z` : ''
  const barW = Math.max(3, Math.min(12, (plotW / Math.max(1, count)) * 0.46))
  const head = pts[pts.length - 1]
  // Live only when the newest bucket (the one holding now) has actions.
  const live = (requests[count - 1] ?? 0) + (challenges[count - 1] ?? 0) > 0
  const scale = [
    { value: upMax, y: top },
    { value: 0, y: mid },
    { value: downMax, y: bottom },
  ]

  const onMove = (event: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box || count < 2) return
    const ratio = (event.clientX - box.left) / Math.max(1, box.width - GUTTER)
    setHover(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))))
  }

  const step = Math.max(1, Math.ceil(count / (plotW < 520 ? 3 : 6)))
  const ticks = axisLabels
    .map((label, index) => ({ label, index }))
    .filter(
      ({ index }) =>
        index === 0 ||
        index === count - 1 ||
        (index % step === 0 && count - 1 - index >= step / 2),
    )

  return (
    <Wrap
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      role="img"
      aria-label={ariaLabel}
    >
      {width > 0 && (
        <Svg
          viewBox={`0 0 ${w} ${height + 4}`}
          style={{ height: height + 4 }}
          data-in={inView}
          aria-hidden
        >
          <defs>
            <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="0.3"
              />
              <stop
                offset="70%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="0.06"
              />
              <stop
                offset="100%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="0"
              />
            </linearGradient>
            <linearGradient
              id={`line-${id}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2={plotW}
              y2="0"
            >
              <stop
                offset="0%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="0.2"
              />
              <stop
                offset="30%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="0.65"
              />
              <stop
                offset="100%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="1"
              />
            </linearGradient>
            <linearGradient id={`bar-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                style={{ stopColor: 'var(--status-contested)' }}
                stopOpacity="0.95"
              />
              <stop
                offset="100%"
                style={{ stopColor: 'var(--status-contested)' }}
                stopOpacity="0.3"
              />
            </linearGradient>
            <radialGradient id={`bloom-${id}`}>
              <stop
                offset="0%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="0.5"
              />
              <stop
                offset="100%"
                style={{ stopColor: 'var(--color-primary)' }}
                stopOpacity="0"
              />
            </radialGradient>
            <filter
              id={`glow-${id}`}
              filterUnits="userSpaceOnUse"
              x="0"
              y="0"
              width={w}
              height={height + 4}
            >
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>

          {/* The scale of each half: a value beside a short tick at its height. */}
          <g aria-hidden>
            {scale.map((mark) => (
              <g key={`${mark.value}-${mark.y}`}>
                <line
                  x1={plotW + 10}
                  x2={plotW + 15}
                  y1={mark.y}
                  y2={mark.y}
                  style={{ stroke: 'var(--color-border-strong)' }}
                />
                <text x={plotW + 19} y={mark.y} dominantBaseline="middle">
                  {mark.value}
                </text>
              </g>
            ))}
          </g>

          <g className="reveal">
            <path d={area} fill={`url(#area-${id})`} />
            <path
              d={line}
              fill="none"
              stroke={`url(#line-${id})`}
              strokeWidth="6"
              strokeOpacity="0.35"
              filter={`url(#glow-${id})`}
            />
            <path
              d={line}
              fill="none"
              stroke={`url(#line-${id})`}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {challenges.map((v, i) =>
              v > 0 ? (
                <rect
                  key={i}
                  x={x(i) - barW / 2}
                  y={mid + 4}
                  width={barW}
                  height={Math.max(3, yDown(v) - mid - 4)}
                  rx={Math.min(3, barW / 2)}
                  fill={`url(#bar-${id})`}
                />
              ) : null,
            )}
          </g>

          <line
            x1="0"
            x2={plotW}
            y1={mid}
            y2={mid}
            style={{ stroke: 'var(--color-border-strong)' }}
          />

          {head && (
            <g className="head">
              <circle
                cx={head[0]}
                cy={head[1]}
                r="28"
                fill={`url(#bloom-${id})`}
              />
              {live && (
                <circle
                  className="ping"
                  cx={head[0]}
                  cy={head[1]}
                  r="4"
                  fill="none"
                  strokeWidth="1.5"
                  style={{ stroke: 'var(--color-primary)' }}
                />
              )}
              <circle
                cx={head[0]}
                cy={head[1]}
                r="4.5"
                strokeWidth="2.5"
                style={{
                  fill: 'var(--color-surface)',
                  stroke: 'var(--color-primary)',
                }}
              />
            </g>
          )}

          {hover !== null && (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={top}
                y2={bottom}
                style={{ stroke: 'var(--color-border-strong)' }}
              />
              <circle
                cx={x(hover)}
                cy={yUp(requests[hover] ?? 0)}
                r="4"
                strokeWidth="2"
                style={{
                  fill: 'var(--color-text)',
                  stroke: 'var(--color-primary)',
                }}
              />
            </g>
          )}
        </Svg>
      )}

      {hover !== null && width > 0 && (
        <Tip
          style={{
            left: `${Math.min(84, Math.max(16, (x(hover) / w) * 100))}%`,
          }}
        >
          <b>{labels[hover]}</b>
          <div>
            <span>
              <i style={{ background: 'var(--color-primary)' }} />
              Submissions and removals
            </span>
            <span>{requests[hover] ?? 0}</span>
          </div>
          <div>
            <span>
              <i style={{ background: 'var(--status-contested)' }} />
              Challenges
            </span>
            <span>{challenges[hover] ?? 0}</span>
          </div>
        </Tip>
      )}

      <Axis aria-hidden>
        {ticks.map(({ label, index }) => (
          <span
            key={`${label}-${index}`}
            style={{ left: `${(x(index) / w) * 100}%` }}
          >
            {label}
          </span>
        ))}
      </Axis>
    </Wrap>
  )
}

export default ActivityChart
