import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import styled, { keyframes } from 'styled-components'

/*
 * Area chart (YMax / Fira): smooth lines with a glow, a gradient fill fading
 * to nothing, faint horizontal guides, a draw-in on load, and a crosshair
 * with a floating tooltip on hover. Series are real counts per point.
 */

export interface AreaSeries {
  key: string
  label: string
  color: string
  values: number[]
}

const draw = keyframes`
  from { stroke-dashoffset: var(--len); }
  to { stroke-dashoffset: 0; }
`

const fade = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const Wrap = styled.div`
  position: relative;
  width: 100%;
`

const Svg = styled.svg`
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;

  .line {
    stroke-dasharray: var(--len);
    animation: ${draw} 1800ms cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .fill {
    animation: ${fade} 1200ms ease 400ms both;
  }

  @media (prefers-reduced-motion: reduce) {
    .line,
    .fill {
      animation: none;
    }
  }
`

const Tooltip = styled.div`
  position: absolute;
  top: 8px;
  min-width: 168px;
  padding: 10px 12px;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  box-shadow: var(--shadow-overlay);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: none;
  transform: translateX(-50%);
  transition:
    left 120ms ease,
    opacity 120ms ease;

  header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--glass-border);
    color: var(--color-text);
    font-size: 13px;
    font-weight: 500;
  }

  header i {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: var(--color-text);
  }

  dl {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4px 16px;
    margin: 0;
  }

  dt {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--color-muted);
    font-size: 12px;
  }

  dt i {
    width: 6px;
    height: 6px;
    border-radius: 999px;
  }

  dd {
    margin: 0;
    color: var(--color-text);
    font-size: 12px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
`

const Axis = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  color: var(--color-faint);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
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

export const AreaChart = ({
  series,
  labels,
  height = 220,
  ariaLabel,
}: {
  series: AreaSeries[]
  /** One label per point (e.g. "12 Oct"), used by the axis and tooltip. */
  labels: string[]
  height?: number
  ariaLabel: string
}) => {
  const id = useId().replace(/:/g, '')
  const padTop = 12
  const ref = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)
  // Draw in real pixels so dots stay round and strokes stay crisp.
  const [width, setWidth] = useState(1000)
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
  const max = Math.max(1, ...series.flatMap((s) => s.values))
  const niceMax = Math.ceil(max / 5) * 5 || 5
  const x = (i: number) => (count <= 1 ? 0 : (i / (count - 1)) * width)
  const y = (v: number) => padTop + (1 - v / niceMax) * (height - padTop)

  const paths = useMemo(
    () =>
      series.map((s) => {
        const pts = s.values.map((v, i) => [x(i), y(v)] as [number, number])
        const line = smoothPath(pts)
        const area = `${line} L ${width} ${height} L 0 ${height} Z`
        return { ...s, line, area }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [series, count, niceMax, height, width],
  )

  const onMove = (event: React.MouseEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box || count < 2) return
    const ratio = (event.clientX - box.left) / box.width
    setHover(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))))
  }

  const guides = [0.5, 1]
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
          {paths.map((p) => (
            <linearGradient
              key={p.key}
              id={`fill-${id}-${p.key}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={p.color} stopOpacity="0.32" />
              <stop offset="100%" stopColor={p.color} stopOpacity="0" />
            </linearGradient>
          ))}
          <filter id={`glow-${id}`} x="-5%" y="-30%" width="110%" height="160%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {guides.map((g) => (
          <text
            key={`t-${g}`}
            x={width - 2}
            y={y(niceMax * g) - 6}
            textAnchor="end"
            fill="var(--color-faint)"
            fontSize="11"
          >
            {Math.round(niceMax * g)}
          </text>
        ))}
        {paths.map((p) => (
          <path
            key={`a-${p.key}`}
            className="fill"
            d={p.area}
            fill={`url(#fill-${id}-${p.key})`}
          />
        ))}
        {paths.map((p) => (
          <path
            key={`l-${p.key}`}
            className="line"
            d={p.line}
            fill="none"
            stroke={p.color}
            strokeWidth="2.2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            filter={`url(#glow-${id})`}
            style={{ ['--len' as string]: '3000' }}
            pathLength={3000}
          />
        ))}
        {hover !== null && (
          <>
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={0}
              y2={height}
              stroke="var(--color-border-strong)"
              vectorEffect="non-scaling-stroke"
            />
            {paths.map((p) => (
              <circle
                key={`d-${p.key}`}
                cx={x(hover)}
                cy={y(p.values[hover] ?? 0)}
                r="4"
                fill={p.color}
                stroke="var(--color-surface)"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}
      </Svg>
      {hover !== null && (
        <Tooltip
          style={{
            left: `${Math.min(88, Math.max(12, (hover / Math.max(1, count - 1)) * 100))}%`,
          }}
        >
          <header>
            <i aria-hidden />
            {labels[hover]}
          </header>
          <dl>
            {series.map((s) => (
              <React.Fragment key={s.key}>
                <dt>
                  <i style={{ background: s.color }} aria-hidden />
                  {s.label}
                </dt>
                <dd>{s.values[hover] ?? 0}</dd>
              </React.Fragment>
            ))}
          </dl>
        </Tooltip>
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

export default AreaChart
