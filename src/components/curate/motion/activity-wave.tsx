import React, { useEffect, useId, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'

/*
 * Activity wave: one series above the baseline (requests, a glowing area
 * with a live head at the newest day) and one mirrored below it (challenges,
 * as bars), each half on its own labelled scale so the smaller series stays
 * readable. A scanner reveal sweeps left to right on load; hover scrubs days.
 */

const scan = keyframes`
  from { clip-path: inset(0 100% 0 0); }
  to { clip-path: inset(0 0 0 0); }
`

const pulse = keyframes`
  0% { r: 5; opacity: 0.9; }
  100% { r: 18; opacity: 0; }
`

const Wrap = styled.div`
  position: relative;
  width: 100%;
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  overflow: visible;

  .reveal {
    animation: ${scan} 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .halo {
    animation: ${pulse} 2.2s ease-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .reveal,
    .halo {
      animation: none;
    }
  }
`

const Tip = styled.div`
  position: absolute;
  top: 0;
  min-width: 160px;
  padding: 10px 12px;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  box-shadow: var(--shadow-overlay);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: none;
  transform: translateX(-50%);
  font-size: 12px;

  b {
    display: block;
    margin-bottom: 6px;
    color: var(--color-text);
    font-size: 13px;
    font-weight: 500;
  }

  div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: var(--color-muted);
  }

  i {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 6px;
    border-radius: 999px;
  }

  span:last-child {
    color: var(--color-text);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
`

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  color: var(--color-faint);
  font-size: 11px;
`

/** Monotone cubic (Fritsch–Carlson): never overshoots the data. */
const smoothPath = (pts: [number, number][]) => {
  const n = pts.length
  if (n < 2) return ''
  const xs = pts.map((p) => p[0])
  const ys = pts.map((p) => p[1])
  const dx = Array.from({ length: n - 1 }, (_, i) => xs[i + 1] - xs[i])
  const dy = Array.from({ length: n - 1 }, (_, i) => ys[i + 1] - ys[i])
  const slope = dx.map((d, i) => (d === 0 ? 0 : dy[i] / d))
  const m = new Array<number>(n).fill(0)
  m[0] = slope[0]
  m[n - 1] = slope[n - 2]
  for (let i = 1; i < n - 1; i++)
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / slope[i]
    const b = m[i + 1] / slope[i]
    const h = Math.hypot(a, b)
    if (h > 3) {
      m[i] = ((3 * a) / h) * slope[i]
      m[i + 1] = ((3 * b) / h) * slope[i]
    }
  }
  let d = `M ${xs[0]} ${ys[0]}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i]
    d += ` C ${xs[i] + h / 3} ${ys[i] + (m[i] * h) / 3} ${xs[i + 1] - h / 3} ${ys[i + 1] - (m[i + 1] * h) / 3} ${xs[i + 1]} ${ys[i + 1]}`
  }
  return d
}

const nice = (max: number) => {
  if (max <= 5) return 5
  const pow = 10 ** Math.floor(Math.log10(max))
  return Math.ceil(max / pow) * pow
}

export const ActivityWave = ({
  up,
  down,
  labels,
  upLabel,
  downLabel,
  upColor = 'var(--color-primary)',
  downColor = 'var(--status-contested)',
  height = 260,
  ariaLabel,
}: {
  up: number[]
  down: number[]
  labels: string[]
  upLabel: string
  downLabel: string
  upColor?: string
  downColor?: string
  height?: number
  ariaLabel: string
}) => {
  const id = useId().replace(/:/g, '')
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(1000)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const node = ref.current
    if (!node || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.round(entry.contentRect.width))),
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const count = labels.length
  const mid = Math.round(height * 0.68)
  const upMax = nice(Math.max(1, ...up))
  const downMax = nice(Math.max(1, ...down))
  const x = (i: number) => (count <= 1 ? 0 : (i / (count - 1)) * width)
  const yUp = (v: number) => mid - (v / upMax) * (mid - 14)
  // the lower half keeps an 18px gutter at the bottom for its scale label
  const yDown = (v: number) => mid + (v / downMax) * (height - mid - 24)
  const pts = up.map((v, i) => [x(i), yUp(v)] as [number, number])
  const line = smoothPath(pts)
  const area = `${line} L ${width} ${mid} L 0 ${mid} Z`
  const barW = Math.max(3, Math.min(10, (width / Math.max(1, count)) * 0.42))
  const head = pts[pts.length - 1]

  const onMove = (event: React.MouseEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box || count < 2) return
    const ratio = (event.clientX - box.left) / box.width
    setHover(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))))
  }

  const step = Math.max(1, Math.round(count / 6))

  return (
    <Wrap
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
      role="img"
      aria-label={ariaLabel}
    >
      <Svg viewBox={`0 0 ${width} ${height}`} style={{ height }}>
        <defs>
          <linearGradient id={`up-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={upColor} stopOpacity="0.34" />
            <stop offset="100%" stopColor={upColor} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`dn-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={downColor} stopOpacity="0.95" />
            <stop offset="100%" stopColor={downColor} stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id={`fade-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={upColor} stopOpacity="0.15" />
            <stop offset="100%" stopColor={upColor} stopOpacity="1" />
          </linearGradient>
          <filter id={`glow-${id}`} x="-5%" y="-40%" width="110%" height="180%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id={`head-${id}`}>
            <stop offset="0%" stopColor={upColor} stopOpacity="0.55" />
            <stop offset="100%" stopColor={upColor} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* scale labels for each half */}
        <text
          x={width}
          y={yUp(upMax) - 2}
          textAnchor="end"
          fill="var(--color-faint)"
          fontSize="11"
        >
          {upMax} {upLabel.toLowerCase()}
        </text>
        <line
          x1="0"
          x2={width}
          y1={yUp(upMax / 2)}
          y2={yUp(upMax / 2)}
          stroke="var(--glass-border)"
          strokeDasharray="4 8"
        />
        <text
          x={width}
          y={height - 4}
          textAnchor="end"
          fill="var(--color-faint)"
          fontSize="11"
        >
          {downMax} {downLabel.toLowerCase()}
        </text>

        <g className="reveal">
          <path d={area} fill={`url(#up-${id})`} />
          <path
            d={line}
            fill="none"
            stroke={`url(#fade-${id})`}
            strokeWidth="2.4"
            strokeLinecap="round"
            filter={`url(#glow-${id})`}
          />
          {down.map((v, i) =>
            v > 0 ? (
              <rect
                key={i}
                x={x(i) - barW / 2}
                y={mid + 3}
                width={barW}
                height={Math.max(2, yDown(v) - mid - 3)}
                rx={Math.min(3, barW / 2)}
                fill={`url(#dn-${id})`}
              />
            ) : null,
          )}
        </g>

        <line
          x1="0"
          x2={width}
          y1={mid}
          y2={mid}
          stroke="var(--color-border-strong)"
        />

        {head && (
          <g>
            <circle
              cx={head[0]}
              cy={head[1]}
              r="26"
              fill={`url(#head-${id})`}
            />
            <circle
              className="halo"
              cx={head[0]}
              cy={head[1]}
              r="5"
              fill="none"
              stroke={upColor}
              strokeWidth="1.5"
            />
            <circle
              cx={head[0]}
              cy={head[1]}
              r="5"
              fill="var(--color-surface)"
              stroke={upColor}
              strokeWidth="2.5"
            />
          </g>
        )}

        {hover !== null && (
          <g>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1="0"
              y2={height}
              stroke="var(--color-border-strong)"
            />
            <circle
              cx={x(hover)}
              cy={yUp(up[hover] ?? 0)}
              r="4"
              fill={upColor}
              stroke="var(--color-surface)"
              strokeWidth="2"
            />
          </g>
        )}
      </Svg>
      {hover !== null && (
        <Tip
          style={{
            left: `${Math.min(88, Math.max(12, (hover / Math.max(1, count - 1)) * 100))}%`,
          }}
        >
          <b>{labels[hover]}</b>
          <div>
            <span>
              <i style={{ background: upColor }} />
              {upLabel}
            </span>
            <span>{up[hover] ?? 0}</span>
          </div>
          <div>
            <span>
              <i style={{ background: downColor }} />
              {downLabel}
            </span>
            <span>{down[hover] ?? 0}</span>
          </div>
        </Tip>
      )}
      <Axis aria-hidden>
        {labels
          .filter((_, i) => i % step === 0 || i === count - 1)
          .map((label, i) => (
            <span key={`${label}-${i}`}>{label}</span>
          ))}
      </Axis>
    </Wrap>
  )
}

export default ActivityWave
