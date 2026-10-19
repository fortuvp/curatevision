import React, { useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { useReducedMotion } from './hooks'

/*
 * The Curate lifecycle for Light and Classic lists, drawn as it happens: a
 * request opens a challenge period; unchallenged it is executed, challenged it
 * goes to jurors, then an appeal period that loops into a bigger round when
 * both sides are funded, then a final ruling. Nodes and arrows draw in order,
 * then two requests travel the two paths once. Wide containers get the
 * horizontal map, middle ones a compact version of it, and narrow ones a
 * vertical rail with the same steps.
 */

type Tone = 'window' | 'registered' | 'contested' | 'neutral'

interface NodeSpec {
  id: string
  title: string
  lines: string[]
  tone?: Tone
  delay: number
}

const NODES: Record<string, NodeSpec> = {
  request: {
    id: 'request',
    title: 'Request',
    lines: ['Submit or remove an', 'entry, with a deposit'],
    delay: 0,
  },
  window: {
    id: 'window',
    title: 'Challenge period',
    lines: ['Set by the list; anyone', 'can challenge'],
    tone: 'window',
    delay: 380,
  },
  executed: {
    id: 'executed',
    title: 'Executed',
    lines: ['Entry registered or removed;', 'deposit back in full'],
    tone: 'registered',
    delay: 960,
  },
  dispute: {
    id: 'dispute',
    title: 'Dispute',
    lines: ['Evidence, then jurors vote', 'on the list’s policy'],
    tone: 'contested',
    delay: 960,
  },
  appeal: {
    id: 'appeal',
    title: 'Appeal period',
    lines: ['Anyone can fund', 'either side'],
    tone: 'contested',
    delay: 1480,
  },
  final: {
    id: 'final',
    title: 'Ruling final',
    lines: ['Winner receives both', 'deposits, minus fees'],
    tone: 'neutral',
    delay: 2000,
  },
}

const EDGE_DELAY = {
  toWindow: 120,
  noChallenge: 640,
  challenged: 640,
  toAppeal: 1180,
  toFinal: 1700,
  loop: 1720,
}

const LOOP_LABEL = 'Both sides funded: a new round with more jurors'

const TOKENS = [
  { route: 'happy', delay: 2400, duration: 1500 },
  { route: 'dispute', delay: 2900, duration: 3900 },
] as const

const SUMMARY =
  'How a request moves through a Light or Classic Curate list. A request, with its deposit, opens a challenge period set by the list. If nobody challenges, it is executed: the entry is registered or removed and the deposit comes back in full. If someone challenges, a dispute goes to Kleros jurors, who vote on the list’s policy, followed by an appeal period. If both sides fund an appeal, a new round starts with twice the jurors plus one; otherwise the ruling is final and the winner receives both deposits minus the fees.'

const Svg = styled.svg<{ $max?: number }>`
  display: block;
  width: 100%;
  max-width: ${({ $max }) => ($max ? `${$max}px` : 'none')};
  height: auto;
  margin: 0;
  overflow: visible;
  font-family: var(--font-sans);

  .base {
    fill: var(--color-surface);
  }

  .face {
    fill: var(--color-raised);
    stroke: var(--glass-border);
    stroke-width: 1;
  }

  .tone-window .face {
    stroke: color-mix(in srgb, var(--status-window) 45%, var(--glass-border));
  }

  .tone-registered .face {
    stroke: color-mix(
      in srgb,
      var(--status-registered) 45%,
      var(--glass-border)
    );
  }

  .tone-contested .face {
    stroke: color-mix(
      in srgb,
      var(--status-contested) 45%,
      var(--glass-border)
    );
  }

  .title {
    fill: var(--color-text);
    font-size: 15px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .sub {
    fill: var(--color-muted);
    font-size: 13px;
  }

  .label,
  .tag {
    fill: var(--color-faint);
    font-size: 13px;
  }

  .chip {
    fill: var(--color-raised);
    stroke: var(--glass-border);
    stroke-width: 1;
  }

  .glyph {
    fill: none;
    stroke: var(--color-faint);
    stroke-width: 1.5;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .edge,
  .head {
    fill: none;
    stroke: var(--color-border-strong);
    stroke-width: 1.5;
  }

  .edge {
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
  }

  .head,
  .label,
  .fade {
    opacity: 0;
  }

  .node {
    opacity: 0;
    transform: translateY(8px);
    transform-box: fill-box;
  }

  .token {
    opacity: 0;
  }

  &[data-on='true'] {
    .edge {
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 480ms
        var(--ease-in-out, cubic-bezier(0.65, 0, 0.35, 1)) var(--d, 0ms);
    }

    .head,
    .label,
    .fade {
      opacity: 1;
      transition: opacity 260ms ease calc(var(--d, 0ms) + 380ms);
    }

    .node {
      opacity: 1;
      transform: none;
      transition:
        opacity 520ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))
          var(--d, 0ms),
        transform 680ms var(--ease-out, cubic-bezier(0.16, 1, 0.3, 1))
          var(--d, 0ms);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .edge {
      stroke-dashoffset: 0;
    }

    .head,
    .label,
    .fade,
    .node {
      opacity: 1;
      transform: none;
    }

    &[data-on='true'] .edge,
    &[data-on='true'] .head,
    &[data-on='true'] .label,
    &[data-on='true'] .fade,
    &[data-on='true'] .node {
      transition: none;
    }
  }
`

const delay = (ms: number) => ({ ['--d' as string]: `${ms}ms` })

const Dot = ({ x, y, tone }: { x: number; y: number; tone?: Tone }) =>
  tone ? (
    <>
      <circle
        cx={x}
        cy={y}
        r={9}
        style={{
          fill: `color-mix(in srgb, var(--status-${tone}) 22%, transparent)`,
        }}
      />
      <circle cx={x} cy={y} r={4} style={{ fill: `var(--status-${tone})` }} />
    </>
  ) : (
    <circle
      cx={x}
      cy={y}
      r={5}
      style={{
        fill: 'var(--color-surface)',
        stroke: 'var(--color-border-strong)',
        strokeWidth: 1.5,
      }}
    />
  )

/** A boxed node for the horizontal map. */
const BoxNode = ({
  spec,
  x,
  y,
  w,
  h = 84,
  lines = spec.lines,
}: {
  spec: NodeSpec
  x: number
  y: number
  w: number
  h?: number
  lines?: string[]
}) => (
  <g
    className={`node${spec.tone ? ` tone-${spec.tone}` : ''}`}
    style={delay(spec.delay)}
  >
    <rect className="base" x={x} y={y} width={w} height={h} rx={14} />
    <rect className="face" x={x} y={y} width={w} height={h} rx={14} />
    {spec.tone && <Dot x={x + 22} y={y + 27} tone={spec.tone} />}
    <text className="title" x={x + (spec.tone ? 38 : 18)} y={y + 32}>
      {spec.title}
    </text>
    {lines.map((line, index) => (
      <text key={line} className="sub" x={x + 18} y={y + 56 + index * 18}>
        {line}
      </text>
    ))}
  </g>
)

/** A rail stop for the vertical map: marker, title and its lines. */
const RailNode = ({
  spec,
  x,
  cy,
  lines = spec.lines,
}: {
  spec: NodeSpec
  x: number
  cy: number
  lines?: string[]
}) => (
  <g
    className={`node${spec.tone ? ` tone-${spec.tone}` : ''}`}
    style={delay(spec.delay)}
  >
    <Dot x={x} y={cy} tone={spec.tone} />
    <text className="title" x={x + 24} y={cy + 5}>
      {spec.title}
    </text>
    {lines.map((line, index) => (
      <text key={line} className="sub" x={x + 24} y={cy + 25 + index * 18}>
        {line}
      </text>
    ))}
  </g>
)

const Edge = ({ d, head, ms }: { d: string; head: string; ms: number }) => (
  <>
    <path className="edge" d={d} pathLength={1} style={delay(ms)} />
    <path className="head" d={head} style={delay(ms)} />
  </>
)

const EdgeLabel = ({
  x,
  y,
  ms,
  anchor = 'start',
  children,
}: {
  x: number
  y: number
  ms: number
  anchor?: 'start' | 'middle'
  children: React.ReactNode
}) => (
  <text className="label" x={x} y={y} textAnchor={anchor} style={delay(ms)}>
    {children}
  </text>
)

type Routes = Record<(typeof TOKENS)[number]['route'], string>

const WIDE_ROUTES: Routes = {
  happy: 'M100 76 H875',
  dispute:
    'M100 76 H380 V256 H650 V322 Q650 334 638 334 H392 Q380 334 380 322 V256 H910',
}

const MID_ROUTES: Routes = {
  happy: 'M78 76 H648',
  dispute:
    'M78 76 H272 V256 H462 V322 Q462 334 450 334 H284 Q272 334 272 322 V256 H654',
}

const NARROW_ROUTES: Routes = {
  happy: 'M26 20 V128 Q26 156 50 156 Q70 156 70 190',
  dispute: 'M26 20 V386 H18 Q8 386 8 376 V306 Q8 296 18 296 H26 V488',
}

const ease = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

/** Moves the two request tokens along their routes once, then hides them. */
const useTokens = (
  armed: boolean,
  routes: React.RefObject<SVGPathElement>[],
  tokens: React.RefObject<SVGGElement>[],
) => {
  const reduced = useReducedMotion()
  useEffect(() => {
    if (!armed || reduced) return
    let frame = 0
    const start = performance.now()
    const lengths = routes.map((route) => route.current?.getTotalLength() ?? 0)
    const step = (now: number) => {
      let running = false
      TOKENS.forEach((token, index) => {
        const path = routes[index].current
        const node = tokens[index].current
        if (!path || !node) return
        const t = (now - start - token.delay) / token.duration
        if (t < 0) {
          running = true
          return
        }
        if (t > 1) {
          node.style.opacity = '0'
          return
        }
        running = true
        const point = path.getPointAtLength(lengths[index] * ease(t))
        node.setAttribute('transform', `translate(${point.x} ${point.y})`)
        node.style.opacity = String(Math.min(1, t * 8, (1 - t) * 8))
      })
      if (running) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [armed, reduced, routes, tokens])
}

const Tokens = ({ routes, armed }: { routes: Routes; armed: boolean }) => {
  const happyPath = useRef<SVGPathElement>(null)
  const disputePath = useRef<SVGPathElement>(null)
  const happyToken = useRef<SVGGElement>(null)
  const disputeToken = useRef<SVGGElement>(null)
  const pathRefs = useRef([happyPath, disputePath]).current
  const tokenRefs = useRef([happyToken, disputeToken]).current
  useTokens(armed, pathRefs, tokenRefs)
  return (
    <g aria-hidden>
      <path ref={happyPath} d={routes.happy} fill="none" stroke="none" />
      <path ref={disputePath} d={routes.dispute} fill="none" stroke="none" />
      {tokenRefs.map((ref, index) => (
        <g key={index} ref={ref} className="token">
          <circle r={11} fill="url(#lifecycle-token-glow)" />
          <circle r={4} style={{ fill: 'var(--color-primary)' }} />
        </g>
      ))}
    </g>
  )
}

const TokenGlow = () => (
  <defs>
    <radialGradient id="lifecycle-token-glow">
      <stop offset="0%" style={{ stopColor: 'var(--color-primary)' }} />
      <stop
        offset="100%"
        style={{ stopColor: 'var(--color-primary)', stopOpacity: 0 }}
      />
    </radialGradient>
  </defs>
)

const WideMap = ({ armed }: { armed: boolean }) => (
  <Svg
    viewBox="0 18 1000 352"
    role="img"
    aria-label={SUMMARY}
    data-on={armed ? 'true' : 'false'}
  >
    <TokenGlow />
    <Edge
      d="M200 76 H262"
      head="M262 70 L270 76 L262 82"
      ms={EDGE_DELAY.toWindow}
    />
    <Edge
      d="M490 76 H742"
      head="M742 70 L750 76 L742 82"
      ms={EDGE_DELAY.noChallenge}
    />
    <EdgeLabel x={620} y={64} anchor="middle" ms={EDGE_DELAY.noChallenge}>
      No challenge
    </EdgeLabel>
    <Edge
      d="M380 118 V206"
      head="M374 206 L380 214 L386 206"
      ms={EDGE_DELAY.challenged}
    />
    <EdgeLabel x={394} y={171} ms={EDGE_DELAY.challenged}>
      Challenged
    </EdgeLabel>
    <Edge
      d="M490 256 H552"
      head="M552 250 L560 256 L552 262"
      ms={EDGE_DELAY.toAppeal}
    />
    <Edge
      d="M740 256 H812"
      head="M812 250 L820 256 L812 262"
      ms={EDGE_DELAY.toFinal}
    />
    <Edge
      d="M650 298 V322 Q650 334 638 334 H392 Q380 334 380 322 V306"
      head="M374 306 L380 298 L386 306"
      ms={EDGE_DELAY.loop}
    />
    <EdgeLabel x={515} y={360} anchor="middle" ms={EDGE_DELAY.loop}>
      {LOOP_LABEL}
    </EdgeLabel>
    <Tokens routes={WIDE_ROUTES} armed={armed} />
    <BoxNode spec={NODES.request} x={0} y={34} w={200} />
    <BoxNode spec={NODES.window} x={270} y={34} w={220} />
    <BoxNode spec={NODES.executed} x={750} y={34} w={250} />
    <BoxNode spec={NODES.dispute} x={270} y={214} w={220} />
    <BoxNode spec={NODES.appeal} x={560} y={214} w={180} />
    <BoxNode spec={NODES.final} x={820} y={214} w={180} />
  </Svg>
)

const MID_DISPUTE = ['Evidence, then jurors', 'vote on the list’s policy']

/**
 * The same map for middle containers (laptops under ~1310px, tablets): 740
 * units wide and capped at 800px so the text stays near its drawn size, with
 * the second row tucked under the challenge period.
 */
const MidMap = ({ armed }: { armed: boolean }) => (
  <Svg
    viewBox="0 18 740 352"
    role="img"
    aria-label={SUMMARY}
    data-on={armed ? 'true' : 'false'}
    $max={800}
  >
    <TokenGlow />
    <Edge
      d="M156 76 H180"
      head="M180 70 L188 76 L180 82"
      ms={EDGE_DELAY.toWindow}
    />
    <Edge
      d="M356 76 H548"
      head="M548 70 L556 76 L548 82"
      ms={EDGE_DELAY.noChallenge}
    />
    <EdgeLabel x={456} y={64} anchor="middle" ms={EDGE_DELAY.noChallenge}>
      No challenge
    </EdgeLabel>
    <Edge
      d="M272 118 V206"
      head="M266 206 L272 214 L278 206"
      ms={EDGE_DELAY.challenged}
    />
    <EdgeLabel x={286} y={171} ms={EDGE_DELAY.challenged}>
      Challenged
    </EdgeLabel>
    <Edge
      d="M356 256 H378"
      head="M378 250 L386 256 L378 262"
      ms={EDGE_DELAY.toAppeal}
    />
    <Edge
      d="M538 256 H560"
      head="M560 250 L568 256 L560 262"
      ms={EDGE_DELAY.toFinal}
    />
    <Edge
      d="M462 298 V322 Q462 334 450 334 H284 Q272 334 272 322 V306"
      head="M266 306 L272 298 L278 306"
      ms={EDGE_DELAY.loop}
    />
    <EdgeLabel x={367} y={360} anchor="middle" ms={EDGE_DELAY.loop}>
      {LOOP_LABEL}
    </EdgeLabel>
    <Tokens routes={MID_ROUTES} armed={armed} />
    <BoxNode spec={NODES.request} x={0} y={34} w={156} />
    <BoxNode spec={NODES.window} x={188} y={34} w={168} />
    <BoxNode
      spec={NODES.executed}
      x={556}
      y={34}
      w={184}
      lines={['Registered or removed;', 'deposit back in full']}
    />
    <BoxNode spec={NODES.dispute} x={188} y={214} w={168} lines={MID_DISPUTE} />
    <BoxNode spec={NODES.appeal} x={386} y={214} w={152} />
    <BoxNode spec={NODES.final} x={568} y={214} w={172} />
  </Svg>
)

/** A small loop arrow, the same sign as the appeal loop it labels. */
const LoopGlyph = ({ x, y }: { x: number; y: number }) => (
  <g className="glyph" transform={`translate(${x} ${y})`} aria-hidden>
    <path d="M4.6 -2.6 A5 5 0 1 0 5 1.2" />
    <path d="M1.8 -3.2 L4.8 -2.4 L5.4 -5.4" />
  </g>
)

const NarrowMap = ({ armed }: { armed: boolean }) => (
  <Svg
    viewBox="0 0 360 528"
    role="img"
    aria-label={SUMMARY}
    data-on={armed ? 'true' : 'false'}
    $max={440}
  >
    <TokenGlow />
    <Edge d="M26 30 V78" head="M20 77 L26 84 L32 77" ms={EDGE_DELAY.toWindow} />
    <Edge
      d="M26 102 V282"
      head="M20 281 L26 288 L32 281"
      ms={EDGE_DELAY.challenged}
    />
    <EdgeLabel x={38} y={268} ms={EDGE_DELAY.challenged}>
      Challenged
    </EdgeLabel>
    <Edge
      d="M26 128 Q26 156 50 156 Q70 156 70 168 V176"
      head="M64 175 L70 182 L76 175"
      ms={EDGE_DELAY.noChallenge}
    />
    <EdgeLabel x={84} y={160} ms={EDGE_DELAY.noChallenge}>
      No challenge
    </EdgeLabel>
    <Edge
      d="M26 306 V372"
      head="M20 371 L26 378 L32 371"
      ms={EDGE_DELAY.toAppeal}
    />
    <Edge
      d="M26 396 V474"
      head="M20 473 L26 480 L32 473"
      ms={EDGE_DELAY.toFinal}
    />
    <Edge
      d="M17 386 Q8 386 8 376 V306 Q8 296 15 296"
      head="M10 290 L17 296 L10 302"
      ms={EDGE_DELAY.loop}
    />
    {/* Tagged as the loop's outcome, set off from the node text above. */}
    <g className="fade" style={delay(EDGE_DELAY.loop)}>
      <rect className="chip" x={40} y={424} width={244} height={24} rx={12} />
      <LoopGlyph x={56} y={436} />
      <text className="tag" x={70} y={440.5}>
        Both sides funded: a new round
      </text>
    </g>
    <Tokens routes={NARROW_ROUTES} armed={armed} />
    <RailNode
      spec={NODES.request}
      x={26}
      cy={20}
      lines={['Submit or remove an entry, with a deposit']}
    />
    <RailNode
      spec={NODES.window}
      x={26}
      cy={92}
      lines={['Set by the list; anyone can challenge']}
    />
    <RailNode spec={NODES.executed} x={70} cy={190} />
    <RailNode spec={NODES.dispute} x={26} cy={296} />
    <RailNode
      spec={NODES.appeal}
      x={26}
      cy={386}
      lines={['Anyone can fund either side']}
    />
    <RailNode
      spec={NODES.final}
      x={26}
      cy={488}
      lines={['Winner receives both deposits, minus fees']}
    />
  </Svg>
)

type Layout = 'wide' | 'mid' | 'narrow'

const Frame = styled.figure`
  position: relative;
  display: grid;
  gap: 16px;
  width: 100%;
  margin: 0;
`

/**
 * On the horizontal maps the caption sits in the free corner under the
 * request, where the eye lands after the first row; below the rail otherwise.
 */
const CaptionSlot = styled.figcaption<{ $corner: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);

  ${({ $corner }) =>
    $corner &&
    `
    position: absolute;
    top: 57%;
    left: 0;
    width: 21%;
  `}
`

/** Container widths where the wide and the compact horizontal maps start. */
const WIDE_FROM = 860
const MID_FROM = 600

const layoutFor = (width: number): Layout =>
  width >= WIDE_FROM ? 'wide' : width >= MID_FROM ? 'mid' : 'narrow'

export const LifecycleSchematic = ({
  play,
  run,
  caption,
}: {
  /** Start drawing (the panel came into view). */
  play: boolean
  /** Bump to replay the drawing from the start. */
  run: number
  /** What the drawing shows; rendered inside the figure's figcaption. */
  caption: React.ReactNode
}) => {
  const frame = useRef<HTMLElement>(null)
  const [layout, setLayout] = useState<Layout>('wide')
  // Armed for one run and layout at a time, so a replay or a layout switch
  // starts from the empty drawing instead of flashing the finished one.
  const [armedFor, setArmedFor] = useState('')
  const key = `${run}-${layout}`
  const armed = play && armedFor === key

  useEffect(() => {
    const node = frame.current
    if (!node) return
    const update = () => setLayout(layoutFor(node.clientWidth))
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  // Arm on the next frames so the CSS transitions run from the start.
  useEffect(() => {
    if (!play) return
    let second = 0
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setArmedFor(key))
    })
    return () => {
      cancelAnimationFrame(first)
      cancelAnimationFrame(second)
    }
  }, [play, key])

  return (
    <Frame ref={frame}>
      {layout === 'wide' && <WideMap key={`w-${run}`} armed={armed} />}
      {layout === 'mid' && <MidMap key={`m-${run}`} armed={armed} />}
      {layout === 'narrow' && <NarrowMap key={`n-${run}`} armed={armed} />}
      <CaptionSlot $corner={layout !== 'narrow'}>{caption}</CaptionSlot>
    </Frame>
  )
}

export default LifecycleSchematic
