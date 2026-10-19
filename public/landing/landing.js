/*
 * Kleros Curate landing: theme switch (shared with the app), the figures from
 * the public data snapshot in data.js, scroll reveals, the ring gauge, the
 * glowing line chart and the dispute flow schematic. Plain DOM, no
 * dependencies. Every drawing names what it measures; without data the
 * figures stay as dashes and the panel says so. Reduced motion renders every
 * drawing in its final state.
 */
;(() => {
  const doc = document
  const root = doc.documentElement
  const NS = 'http://www.w3.org/2000/svg'
  const motionQuery = globalThis.matchMedia('(prefers-reduced-motion: reduce)')
  const darkQuery = globalThis.matchMedia('(prefers-color-scheme: dark)')
  const reducedMotion = () => motionQuery.matches
  const $ = (selector, scope = doc) => scope.querySelector(selector)
  const $$ = (selector, scope = doc) => [...scope.querySelectorAll(selector)]

  const integer = new Intl.NumberFormat('en-US')
  const dayFormat = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
  const longDayFormat = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
  const stampFormat = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  })
  const timeFormat = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'UTC',
  })

  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t))
  const easeInOutCubic = (t) =>
    t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

  /**
   * One rAF tween; returns a cancel function. A timer lands it on its final
   * state if frames never come (background tab, capture, prerender), so a
   * figure or drawing is never left at zero.
   */
  const tween = ({ duration, ease, delay = 0, onFrame, onDone }) => {
    let frame = 0
    let finished = false
    const start = performance.now() + delay
    const finish = () => {
      if (finished) return
      finished = true
      cancelAnimationFrame(frame)
      clearTimeout(guard)
      onFrame(1)
      if (onDone) onDone()
    }
    const step = (now) => {
      const t = Math.min(1, Math.max(0, (now - start) / duration))
      if (t >= 1) {
        finish()
        return
      }
      onFrame(ease(t))
      frame = requestAnimationFrame(step)
    }
    const guard = setTimeout(finish, delay + duration + 600)
    frame = requestAnimationFrame(step)
    return () => {
      finished = true
      cancelAnimationFrame(frame)
      clearTimeout(guard)
    }
  }

  /** Runs once when the element is far enough in view. */
  const whenInView = (element, callback, threshold = 0.35) => {
    if (!element) return
    if (!('IntersectionObserver' in globalThis)) {
      callback()
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect()
          callback()
        }
      },
      { threshold },
    )
    observer.observe(element)
  }

  const svgEl = (name, attributes = {}) => {
    const node = doc.createElementNS(NS, name)
    for (const [key, value] of Object.entries(attributes))
      node.setAttribute(key, String(value))
    return node
  }

  /* ---------- Theme: System / Light / Dark / Kleros, shared with the app ---------- */

  const STORAGE_KEY = 'kleros-curate-theme'
  const MODES = ['system', 'light', 'dark', 'kleros']
  const switches = $$('[data-theme-switch]')
  const resolveMode = (mode) =>
    mode === 'system' ? (darkQuery.matches ? 'dark' : 'light') : mode

  const syncSwitch = (group, instant) => {
    const mode = root.dataset.mode || 'system'
    let active
    for (const button of $$('[role="radio"]', group)) {
      const on = button.dataset.mode === mode
      button.setAttribute('aria-checked', String(on))
      button.tabIndex = on ? 0 : -1
      if (on) active = button
    }
    const pill = $('.theme-pill', group)
    if (!pill || !active) return
    if (instant) pill.dataset.instant = ''
    pill.style.width = `${active.offsetWidth}px`
    pill.style.transform = `translateX(${active.offsetLeft}px)`
    if (instant)
      requestAnimationFrame(() => {
        delete pill.dataset.instant
      })
  }

  const applyTheme = (mode, instant = false) => {
    root.dataset.mode = mode
    root.dataset.theme = resolveMode(mode)
    const meta = $('meta[name="theme-color"]')
    if (meta)
      meta.setAttribute(
        'content',
        getComputedStyle(root).getPropertyValue('--stage').trim(),
      )
    for (const group of switches) syncSwitch(group, instant)
  }

  const setMode = (mode) => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // Storage can be blocked; the choice then lasts for this page view.
    }
    applyTheme(mode)
  }

  for (const group of switches) {
    group.addEventListener('click', (event) => {
      const button = event.target.closest('[data-mode]')
      if (button) setMode(button.dataset.mode)
    })
    group.addEventListener('keydown', (event) => {
      const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
      if (!keys.includes(event.key)) return
      event.preventDefault()
      const step = keys.indexOf(event.key) < 2 ? 1 : -1
      const current = MODES.indexOf(root.dataset.mode || 'system')
      const next = MODES[(current + step + MODES.length) % MODES.length]
      setMode(next)
      $(`[data-mode="${next}"]`, group)?.focus()
    })
    if ('ResizeObserver' in globalThis)
      new ResizeObserver(() => syncSwitch(group, true)).observe(group)
  }
  darkQuery.addEventListener('change', () => {
    if ((root.dataset.mode || 'system') === 'system') applyTheme('system')
  })
  applyTheme(root.dataset.mode || 'system', true)
  // Fonts change the buttons' widths; place the pill again once they load.
  doc.fonts?.addEventListener('loadingdone', () => {
    for (const group of switches) syncSwitch(group, true)
  })

  /* ---------- Chrome: floating bar, hover spotlight, paused loops ---------- */

  const bar = $('[data-bar]')
  let barFrame = 0
  const syncBar = () => {
    barFrame = 0
    if (!bar) return
    if (globalThis.scrollY > 24) bar.dataset.lifted = ''
    else delete bar.dataset.lifted
  }
  globalThis.addEventListener(
    'scroll',
    () => {
      if (!barFrame) barFrame = requestAnimationFrame(syncBar)
    },
    { passive: true },
  )
  syncBar()

  let spotFrame = 0
  doc.addEventListener('pointermove', (event) => {
    if (spotFrame || event.pointerType !== 'mouse') return
    spotFrame = requestAnimationFrame(() => {
      spotFrame = 0
      const target =
        event.target instanceof Element && event.target.closest('[data-spot]')
      if (!target) return
      const box = target.getBoundingClientRect()
      target.style.setProperty('--mx', `${event.clientX - box.left}px`)
      target.style.setProperty('--my', `${event.clientY - box.top}px`)
    })
  })

  const syncPaused = () => {
    if (doc.hidden) root.dataset.paused = ''
    else delete root.dataset.paused
  }
  doc.addEventListener('visibilitychange', syncPaused)
  syncPaused()

  /* ---------- Reveals ---------- */

  const revealables = $$('[data-reveal]')
  if ('IntersectionObserver' in globalThis && !reducedMotion()) {
    const revealer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            revealer.unobserve(entry.target)
          }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    )
    for (const node of revealables) revealer.observe(node)
  } else for (const node of revealables) node.classList.add('in')

  /* ---------- Figures from the snapshot ---------- */

  const data = globalThis.CURATE_LANDING_DATA
  const isCount = (value) => Number.isFinite(value) && value >= 0
  const series = Array.isArray(data?.series30d)
    ? data.series30d.filter(
        (row) =>
          Number.isFinite(row?.day) &&
          isCount(row.requests) &&
          isCount(row.challenges),
      )
    : []
  const facts = data?.figures ?? {}
  const snapshotAt = data?.snapshotAt ? new Date(data.snapshotAt) : undefined
  const hasSnapshot = snapshotAt && !Number.isNaN(snapshotAt.getTime())
  const hasSeries = series.length > 1
  const totalRequests = series.reduce((sum, row) => sum + row.requests, 0)
  const totalChallenged = series.reduce((sum, row) => sum + row.challenges, 0)

  const figures = {
    requests: hasSeries ? totalRequests : undefined,
    challenged: hasSeries ? totalChallenged : undefined,
    inCourt: isCount(facts.inCourt) ? facts.inCourt : undefined,
    curators: isCount(facts.curators30d) ? facts.curators30d : undefined,
    entries: isCount(facts.entries) ? facts.entries : undefined,
    requestsOpen: isCount(facts.requestsOpen) ? facts.requestsOpen : undefined,
    registries: isCount(facts.registries) ? facts.registries : undefined,
  }

  const stamp = hasSnapshot ? `${stampFormat.format(snapshotAt)} UTC` : ''
  const scope = typeof data?.scope === 'string' ? data.scope : ''
  const setText = (key, text) => {
    for (const node of $$(`[data-fig="${key}"]`)) node.textContent = text
  }
  if (scope) setText('scope', scope)
  if (stamp) {
    setText('stamp', `Snapshot · ${stamp}`)
    setText(
      'source',
      `Figures: public Curate data on ${scope || 'Curate mainnets'}, snapshot of ${stamp}. The app shows them live.`,
    )
  }

  const featured = $('[data-featured]')
  if (!hasSeries && featured) {
    featured.dataset.emptyState = ''
    const empty = $('[data-empty]', featured)
    if (empty) empty.hidden = false
  }

  /** Rolls each digit on its own column, then settles into plain text. */
  const roll = (node, value) => {
    const text = integer.format(value)
    if (reducedMotion()) {
      node.textContent = text
      return
    }
    const label = doc.createElement('span')
    label.className = 'sr-only'
    label.textContent = text
    const wrap = doc.createElement('span')
    wrap.className = 'odo'
    wrap.setAttribute('aria-hidden', 'true')
    const stacks = []
    for (const char of text) {
      if (!/\d/.test(char)) {
        const plain = doc.createElement('span')
        plain.textContent = char
        wrap.append(plain)
        continue
      }
      const column = doc.createElement('span')
      column.className = 'odo-col'
      const stack = doc.createElement('span')
      stack.className = 'odo-stack'
      for (let index = 0; index < 20; index++) {
        const digit = doc.createElement('span')
        digit.textContent = String(index % 10)
        stack.append(digit)
      }
      column.append(stack)
      wrap.append(column)
      stacks.push({ stack, digit: Number(char) })
    }
    node.replaceChildren(label, wrap)
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        for (const [index, { stack, digit }] of stacks.entries()) {
          stack.style.transitionDelay = `${index * 45}ms`
          stack.style.transform = `translateY(${-(10 + digit)}em)`
        }
      }),
    )
    setTimeout(
      () => {
        node.textContent = text
      },
      1100 + stacks.length * 45 + 150,
    )
  }

  const countUp = (node, value) => {
    if (reducedMotion() || value === 0) {
      node.textContent = integer.format(value)
      return
    }
    tween({
      duration: 1200,
      ease: easeOutExpo,
      onFrame: (p) => {
        node.textContent = integer.format(Math.round(value * p))
      },
    })
  }

  for (const node of $$('[data-fig]')) {
    const value = figures[node.dataset.fig]
    if (value === undefined) {
      // A role row without its figure reads better than a lone dash.
      const roleFigure = node.closest('.role-figure')
      if (roleFigure && node.dataset.fig in figures) roleFigure.hidden = true
      continue
    }
    const animated =
      node.hasAttribute('data-odometer') || 'count' in node.dataset
    if (!animated || reducedMotion()) {
      node.textContent = integer.format(value)
      continue
    }
    // The real figure stays in the page until the count starts, the moment it
    // enters the viewport (its row is still fading in then).
    node.textContent = integer.format(value)
    whenInView(
      node,
      () =>
        node.hasAttribute('data-odometer')
          ? roll(node, value)
          : countUp(node, value),
      0,
    )
  }

  /* ---------- Ring gauge: share of requests not challenged ---------- */

  const C = 120
  const R = 88
  const W = 16
  const START = -135
  const SWEEP = 270
  // A percent scale: 51 ticks, a long one every 10% (0, 10, ... 100%), so the
  // crown reads as the scale the end labels name.
  const PERCENT_TICKS = { count: 51, every: 5 }
  const polar = (r, deg) => {
    const a = (deg * Math.PI) / 180
    return [C + r * Math.sin(a), C - r * Math.cos(a)]
  }
  const arcPath = (r, a0, a1) => {
    const [x0, y0] = polar(r, a0)
    const [x1, y1] = polar(r, a1)
    return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
  }

  const buildGauge = (
    host,
    { ratio, caption, label, ends, ticks: scale = PERCENT_TICKS },
  ) => {
    host.setAttribute('role', 'img')
    host.setAttribute('aria-label', label)

    const under = svgEl('svg', {
      viewBox: '0 0 240 240',
      'aria-hidden': 'true',
    })
    const defs = svgEl('defs')
    const dome = svgEl('radialGradient', {
      id: 'g-dome',
      cx: '50%',
      cy: '32%',
      r: '60%',
    })
    dome.append(
      svgEl('stop', {
        offset: '0',
        style: 'stop-color: var(--g-head); stop-opacity: 0.16',
      }),
      svgEl('stop', {
        offset: '1',
        style: 'stop-color: var(--g-head); stop-opacity: 0',
      }),
    )
    const bloomGradient = svgEl('radialGradient', { id: 'g-bloom' })
    bloomGradient.append(
      svgEl('stop', {
        offset: '0',
        style: 'stop-color: var(--g-head); stop-opacity: 0.55',
      }),
      svgEl('stop', {
        offset: '0.4',
        style: 'stop-color: var(--g-head); stop-opacity: 0.25',
      }),
      svgEl('stop', {
        offset: '1',
        style: 'stop-color: var(--g-head); stop-opacity: 0',
      }),
    )
    const glow = svgEl('filter', {
      id: 'g-tick-glow',
      x: '-20%',
      y: '-20%',
      width: '140%',
      height: '140%',
    })
    const merge = svgEl('feMerge')
    merge.append(
      svgEl('feMergeNode', { in: 'b' }),
      svgEl('feMergeNode', { in: 'SourceGraphic' }),
    )
    glow.append(
      svgEl('feGaussianBlur', { stdDeviation: '1.4', result: 'b' }),
      merge,
    )
    defs.append(dome, bloomGradient, glow)
    under.append(defs)
    under.append(svgEl('circle', { cx: C, cy: C, r: 72, fill: 'url(#g-dome)' }))
    under.append(
      svgEl('path', {
        class: 'hair',
        d: arcPath(74, START, START + SWEEP),
        'stroke-width': 1,
        'stroke-dasharray': '1 4',
      }),
    )
    under.append(
      svgEl('path', {
        class: 'track',
        d: arcPath(R, START, START + SWEEP),
        'stroke-width': W,
      }),
    )
    const ticks = svgEl('g', { filter: 'url(#g-tick-glow)' })
    for (let index = 0; index < scale.count; index++) {
      const t = index / (scale.count - 1)
      const deg = START + t * SWEEP
      const long = index % scale.every === 0
      const [x1, y1] = polar(long ? 103 : 106, deg)
      const [x2, y2] = polar(113, deg)
      const tick = svgEl('line', {
        class: 'tick',
        x1,
        y1,
        x2,
        y2,
        'stroke-width': long ? 1.6 : 1.1,
      })
      tick.style.setProperty('--t', String(t))
      ticks.append(tick)
    }
    under.append(ticks)
    const [lx] = polar(R, START)
    const [rx] = polar(R, START + SWEEP)
    const endLeft = svgEl('text', {
      class: 'end',
      x: lx,
      y: 224,
      'text-anchor': 'middle',
    })
    endLeft.textContent = ends[0]
    const endRight = svgEl('text', {
      class: 'end',
      x: rx,
      y: 224,
      'text-anchor': 'middle',
    })
    endRight.textContent = ends[1]
    under.append(endLeft, endRight)

    const arc = doc.createElement('div')
    arc.className = 'arc'

    const over = svgEl('svg', { viewBox: '0 0 240 240', 'aria-hidden': 'true' })
    const [tx, ty] = polar(R, START)
    const tail = svgEl('circle', {
      class: 'tail-cap',
      cx: tx,
      cy: ty,
      r: W / 2,
    })
    const head = svgEl('g')
    head.append(
      svgEl('circle', { class: 'bloom', r: 34, fill: 'url(#g-bloom)' }),
      svgEl('circle', { class: 'head-cap', r: W / 2 }),
      svgEl('circle', { class: 'core', r: 3.5 }),
    )
    over.append(tail, head)

    const center = doc.createElement('div')
    center.className = 'gauge-center'
    center.setAttribute('aria-hidden', 'true')
    const figure = doc.createElement('span')
    figure.className = 'gauge-figure'
    const value = doc.createElement('span')
    const unit = doc.createElement('small')
    unit.textContent = '%'
    figure.append(value, unit)
    const captionNode = doc.createElement('span')
    captionNode.className = 'gauge-caption'
    captionNode.textContent = caption
    center.append(figure, captionNode)

    host.replaceChildren(under, arc, over, center)

    const draw = (p) => {
      host.style.setProperty('--p', String(p))
      const [hx, hy] = polar(R, START + p * SWEEP)
      head.setAttribute('transform', `translate(${hx} ${hy})`)
      const visible = p > 0.005
      head.style.display = visible ? '' : 'none'
      tail.style.display = visible ? '' : 'none'
      value.textContent = (p * 100).toFixed(1)
    }
    const clamped = Math.min(1, Math.max(0, ratio))
    if (reducedMotion()) {
      draw(clamped)
      return
    }
    draw(0)
    whenInView(host, () =>
      tween({
        duration: 1400,
        delay: 200,
        ease: easeOutExpo,
        onFrame: (p) => draw(clamped * p),
      }),
    )
  }

  const gaugeHost = $('[data-gauge]')
  if (gaugeHost && hasSeries && totalRequests > 0) {
    // Provisional: the newest requests can still be challenged.
    const passed = totalRequests - totalChallenged
    const share = passed / totalRequests
    buildGauge(gaugeHost, {
      ratio: share,
      caption: 'not challenged so far',
      ends: ['0%', '100%'],
      label: `Requests not challenged so far, last 30 days: ${integer.format(passed)} of ${integer.format(totalRequests)}, ${(share * 100).toFixed(1)}%. Some are still open to challenge.`,
    })
    const note = $('[data-fig="gaugeNote"]')
    if (note) {
      note.replaceChildren()
      const strong = (text) => {
        const b = doc.createElement('b')
        b.textContent = text
        return b
      }
      note.append(
        strong(integer.format(passed)),
        ' of ',
        strong(integer.format(totalRequests)),
        ' requests. Some are still open to challenge.',
      )
    }
  }

  /* ---------- Role rows: daily bars and the verified share ---------- */

  /** One bar per day; a real zero stays a faint stub so the baseline reads. */
  const buildSpark = (host, values, { blocks = false } = {}) => {
    const max = Math.max(1, ...values)
    // Blocks: one block per challenge while they fit, so the bars can be counted.
    const stacked = blocks && max <= 6
    host.replaceChildren()
    for (const [index, value] of values.entries()) {
      const bar = doc.createElement('span')
      bar.className = 'spark-bar'
      if (value === 0) bar.dataset.zero = ''
      if (index === values.length - 1) bar.dataset.last = ''
      bar.style.setProperty('--i', String(index))
      if (stacked && value > 0)
        for (let unit = 0; unit < value; unit++)
          bar.append(doc.createElement('i'))
      else bar.style.setProperty('--v', String(value / max))
      host.append(bar)
    }
    if (stacked) host.dataset.stacked = ''
    const run = () => {
      host.dataset.drawn = ''
    }
    if (reducedMotion()) run()
    else whenInView(host, run, 0.5)
  }

  const sparkSeries = {
    requests: series.map((row) => row.requests),
    challenges: series.map((row) => row.challenges),
  }
  for (const host of $$('[data-spark]')) {
    const values = sparkSeries[host.dataset.spark]
    const viz = host.closest('.role-viz')
    if (!hasSeries || !values) {
      if (viz) viz.hidden = true
      continue
    }
    buildSpark(host, values, { blocks: host.dataset.spark === 'challenges' })
    const total = values.reduce((sum, value) => sum + value, 0)
    host.setAttribute('role', 'img')
    host.setAttribute(
      'aria-label',
      host.dataset.spark === 'challenges'
        ? `Challenges made per day, last 30 days: ${integer.format(total)} in total, at most ${integer.format(Math.max(...values))} in a day.`
        : `Requests per day, last 30 days: ${integer.format(total)} in total, at most ${integer.format(Math.max(...values))} in a day.`,
    )
  }

  /** A 270° mini ring: the share of registries on the verified list. */
  const ringHost = $('[data-mini-ring]')
  if (ringHost) {
    const verified = facts.verified
    const total = facts.registries
    if (isCount(verified) && isCount(total) && total > 0 && verified <= total) {
      const share = verified / total
      const size = 64
      const mid = size / 2
      const radius = 25
      const point = (deg) => {
        const a = (deg * Math.PI) / 180
        return [mid + radius * Math.sin(a), mid - radius * Math.cos(a)]
      }
      const [x0, y0] = point(START)
      const [x1, y1] = point(START + SWEEP)
      const d = `M${x0} ${y0}A${radius} ${radius} 0 1 1 ${x1} ${y1}`
      const svg = svgEl('svg', {
        viewBox: `0 0 ${size} ${size}`,
        width: size,
        height: size,
        'aria-hidden': 'true',
      })
      const value = svgEl('path', { class: 'ring-value', d, pathLength: 1 })
      svg.append(svgEl('path', { class: 'ring-track', d }), value)
      const center = doc.createElement('span')
      center.className = 'mini-ring-figure'
      center.textContent = `${Math.round(share * 100)}%`
      ringHost.replaceChildren(svg, center)
      ringHost.setAttribute('role', 'img')
      ringHost.setAttribute(
        'aria-label',
        `Verified registries: ${integer.format(verified)} of ${integer.format(total)}, ${Math.round(share * 100)}%`,
      )
      const draw = (p) => {
        value.style.strokeDasharray = `${share * p} 1`
        value.style.opacity = share * p > 0.002 ? '1' : '0'
      }
      if (reducedMotion()) draw(1)
      else {
        draw(0)
        whenInView(ringHost, () =>
          tween({
            duration: 1200,
            delay: 150,
            ease: easeOutExpo,
            onFrame: draw,
          }),
        )
      }
    } else ringHost.closest('.role-viz')?.setAttribute('hidden', '')
  }

  /* ---------- Line chart: requests per day, challenges made below the baseline ---------- */

  /** Monotone cubic (Fritsch–Carlson): never overshoots the counts. */
  const monotonePath = (points) => {
    const n = points.length
    if (n < 2) return ''
    const dx = []
    const slope = []
    const tangent = []
    for (let index = 0; index < n - 1; index++) {
      dx[index] = points[index + 1][0] - points[index][0]
      slope[index] = (points[index + 1][1] - points[index][1]) / dx[index]
    }
    tangent[0] = slope[0]
    tangent[n - 1] = slope[n - 2]
    for (let index = 1; index < n - 1; index++) {
      if (slope[index - 1] * slope[index] <= 0) {
        tangent[index] = 0
        continue
      }
      const w1 = 2 * dx[index] + dx[index - 1]
      const w2 = dx[index] + 2 * dx[index - 1]
      tangent[index] = (w1 + w2) / (w1 / slope[index - 1] + w2 / slope[index])
    }
    let d = `M${points[0][0]},${points[0][1]}`
    for (let index = 0; index < n - 1; index++) {
      const h = dx[index] / 3
      const [x0, y0] = points[index]
      const [x1, y1] = points[index + 1]
      d += `C${x0 + h},${y0 + tangent[index] * h} ${x1 - h},${y1 - tangent[index + 1] * h} ${x1},${y1}`
    }
    return d
  }

  // Below this many challenges in a day, each one gets its own block.
  const MAX_BLOCKS = 4

  const niceTop = (max) => {
    if (max <= 10) return 10
    const step = max <= 100 ? 10 : 20
    return Math.ceil(max / step) * step
  }

  const buildChart = (host, rows) => {
    const card = host.closest('[data-chart-card]')
    const count = rows.length
    const requests = rows.map((row) => row.requests)
    const challenges = rows.map((row) => row.challenges)
    const lastDay = rows.at(-1).day
    // The newest day is cut at the snapshot time; say so in its tooltip.
    const partialLast =
      hasSnapshot && snapshotAt.getTime() / 1000 < lastDay + 86_400
    const average = totalRequests / count
    const challengeMax = Math.max(1, ...challenges)
    // Challenges use their own scale below the baseline: one block per
    // challenge while they fit, otherwise bars with their maximum labelled.
    const stacked = challengeMax <= MAX_BLOCKS
    const live = $('[data-chart-live]')
    let progress = reducedMotion() ? 1 : 0
    let geometry
    let hoverIndex = -1

    const tip = doc.createElement('div')
    tip.className = 'chart-tip'
    tip.setAttribute('aria-hidden', 'true')

    const render = () => {
      const width = Math.max(260, Math.round(host.clientWidth))
      const height = width < 560 ? 220 : 260
      const padLeft = 34
      const padRight = 12
      const padTop = 14
      const barZone = 30
      const axisZone = 24
      const base = height - barZone - axisZone
      const top = niceTop(Math.max(1, ...requests))
      const x = (index) =>
        padLeft + (index / (count - 1)) * (width - padLeft - padRight)
      const y = (value) => base - (value / top) * (base - padTop)
      const points = requests.map((value, index) => [x(index), y(value)])
      const line = monotonePath(points)
      const area = `${line}L${x(count - 1)},${base}L${x(0)},${base}Z`
      const barWidth = Math.max(
        3,
        Math.min(8, ((width - padLeft) / count) * 0.36),
      )

      const svg = svgEl('svg', {
        viewBox: `0 0 ${width} ${height}`,
        width,
        height,
        role: 'img',
        'aria-label': `Requests per day over the last 30 days: ${integer.format(totalRequests)} in total, ${integer.format(Math.round(average))} a day on average, at most ${integer.format(Math.max(...requests))} in a day. Challenges made per day are drawn on a separate scale below the baseline${stacked ? ', one block per challenge' : ''}: ${integer.format(totalChallenged)} in total.`,
      })
      const defs = svgEl('defs')

      const wash = svgEl('linearGradient', {
        id: 'c-wash',
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
      })
      wash.append(
        svgEl('stop', {
          offset: '0',
          style: 'stop-color: var(--color-primary); stop-opacity: 0.24',
        }),
        svgEl('stop', {
          offset: '0.6',
          style: 'stop-color: var(--color-primary); stop-opacity: 0.06',
        }),
        svgEl('stop', {
          offset: '1',
          style: 'stop-color: var(--color-primary); stop-opacity: 0',
        }),
      )
      const dots = svgEl('pattern', {
        id: 'c-dots',
        width: 6,
        height: 6,
        patternUnits: 'userSpaceOnUse',
      })
      dots.append(
        svgEl('circle', {
          cx: 1.5,
          cy: 1.5,
          r: 0.9,
          style: 'fill: var(--color-primary); fill-opacity: 0.5',
        }),
      )
      const fadeDown = svgEl('linearGradient', {
        id: 'c-fade',
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 1,
      })
      fadeDown.append(
        svgEl('stop', {
          offset: '0',
          style: 'stop-color: var(--white-core); stop-opacity: 1',
        }),
        svgEl('stop', {
          offset: '1',
          style: 'stop-color: var(--white-core); stop-opacity: 0',
        }),
      )
      const dotMask = svgEl('mask', {
        id: 'c-dot-mask',
        maskUnits: 'userSpaceOnUse',
        x: 0,
        y: 0,
        width,
        height,
      })
      dotMask.append(
        svgEl('rect', {
          x: 0,
          y: padTop,
          width,
          height: base - padTop,
          fill: 'url(#c-fade)',
        }),
      )
      const stroke = svgEl('linearGradient', {
        id: 'c-stroke',
        gradientUnits: 'userSpaceOnUse',
        x1: padLeft,
        y1: 0,
        x2: width - padRight,
        y2: 0,
      })
      stroke.append(
        svgEl('stop', {
          offset: '0',
          style: 'stop-color: var(--color-primary); stop-opacity: 0.25',
        }),
        svgEl('stop', {
          offset: '0.3',
          style: 'stop-color: var(--color-primary); stop-opacity: 0.7',
        }),
        svgEl('stop', {
          offset: '1',
          style: 'stop-color: var(--color-primary); stop-opacity: 1',
        }),
      )
      const blur = svgEl('filter', {
        id: 'c-glow',
        filterUnits: 'userSpaceOnUse',
        x: 0,
        y: 0,
        width,
        height,
      })
      blur.append(svgEl('feGaussianBlur', { stdDeviation: 3 }))
      const headGlow = svgEl('radialGradient', { id: 'c-head' })
      headGlow.append(
        svgEl('stop', {
          offset: '0',
          style: 'stop-color: var(--color-primary); stop-opacity: 0.45',
        }),
        svgEl('stop', {
          offset: '1',
          style: 'stop-color: var(--color-primary); stop-opacity: 0',
        }),
      )
      const clip = svgEl('clipPath', { id: 'c-reveal' })
      const clipRect = svgEl('rect', {
        x: 0,
        y: -40,
        width: 0,
        height: height + 80,
      })
      clip.append(clipRect)
      defs.append(wash, dots, fadeDown, dotMask, stroke, blur, headGlow, clip)
      svg.append(defs)

      // Scale: three labels at most, no gridlines; one dashed average line.
      for (const value of [0, top / 2, top]) {
        const label = svgEl('text', {
          class: 'axis',
          x: 0,
          y: y(value) + 3,
        })
        label.textContent = integer.format(value)
        svg.append(label)
      }
      const averageY = y(average)
      const guideLabel = svgEl('text', {
        class: 'guide-label',
        x: width - padRight,
        y: averageY - 6,
        'text-anchor': 'end',
      })
      guideLabel.textContent = `avg ${integer.format(Math.round(average))}`
      svg.append(
        svgEl('line', {
          class: 'guide',
          x1: padLeft,
          x2: width - padRight,
          y1: averageY,
          y2: averageY,
        }),
        guideLabel,
      )

      const revealed = svgEl('g', { 'clip-path': 'url(#c-reveal)' })
      revealed.append(
        svgEl('path', { d: area, fill: 'url(#c-wash)' }),
        svgEl('path', {
          d: area,
          fill: 'url(#c-dots)',
          mask: 'url(#c-dot-mask)',
        }),
      )
      svg.append(revealed)

      const glowPath = svgEl('path', {
        d: line,
        fill: 'none',
        filter: 'url(#c-glow)',
        'stroke-width': 6,
        style: 'stroke: var(--color-primary); stroke-opacity: 0.35',
      })
      const linePath = svgEl('path', {
        d: line,
        fill: 'none',
        stroke: 'url(#c-stroke)',
        'stroke-width': 2.2,
      })
      svg.append(glowPath, linePath)
      svg.append(
        svgEl('line', {
          class: 'baseline',
          x1: padLeft,
          x2: width - padRight,
          y1: base,
          y2: base,
        }),
      )

      const bars = []
      const zone = barZone - 8
      const gap = 2
      const block = stacked ? Math.min(6, (zone + gap) / challengeMax - gap) : 0
      for (const [index, value] of challenges.entries()) {
        if (value <= 0) continue
        // Drawn already (a resize): no second entrance.
        const group = svgEl('g', { class: progress >= 1 ? 'bar on' : 'bar' })
        const left = x(index) - barWidth / 2
        if (stacked)
          for (let unit = 0; unit < value; unit++)
            group.append(
              svgEl('rect', {
                x: left,
                y: base + 4 + unit * (block + gap),
                width: barWidth,
                height: block,
                rx: Math.min(1.5, barWidth / 2),
              }),
            )
        else
          group.append(
            svgEl('rect', {
              x: left,
              y: base + 4,
              width: barWidth,
              height: Math.max(2, (value / challengeMax) * zone),
              rx: Math.min(2, barWidth / 2),
            }),
          )
        bars.push({ rect: group, at: x(index) })
        svg.append(group)
      }
      if (!stacked) {
        // The bars' own scale: their maximum, next to the tallest one's foot.
        const scaleLabel = svgEl('text', {
          class: 'axis axis--challenges',
          x: 0,
          y: base + 4 + zone,
        })
        scaleLabel.textContent = integer.format(challengeMax)
        svg.append(scaleLabel)
      }

      const ticks =
        width < 560
          ? [0, Math.round((count - 1) / 2), count - 1]
          : [0, 7, 14, 21, count - 1]
      const tickIndexes = ticks.filter(
        (index, position, list) =>
          index < count && list.indexOf(index) === position,
      )
      const xLabels = new Map()
      for (const index of tickIndexes) {
        const anchor =
          index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'
        const label = svgEl('text', {
          class: 'axis-x',
          x:
            index === 0
              ? x(0) - 2
              : index === count - 1
                ? x(index) + 2
                : x(index),
          y: height - 6,
          'text-anchor': anchor,
        })
        label.textContent = dayFormat.format(new Date(rows[index].day * 1000))
        xLabels.set(index, label)
        svg.append(label)
      }

      const cross = svgEl('line', {
        class: 'cross',
        x1: 0,
        x2: 0,
        y1: padTop - 6,
        y2: base,
      })
      const hoverDot = svgEl('circle', { class: 'hover-dot', r: 4 })
      svg.append(cross, hoverDot)

      const head = svgEl('g')
      const halo = svgEl('circle', { class: 'head-halo', r: 5 })
      head.append(
        svgEl('circle', { r: 36, fill: 'url(#c-head)' }),
        halo,
        svgEl('circle', { class: 'head-core', r: 4.5 }),
      )
      svg.append(head)

      host.replaceChildren(svg, tip)
      const length = linePath.getTotalLength()
      for (const path of [glowPath, linePath])
        path.style.strokeDasharray = `${length} ${length}`

      geometry = {
        width,
        height,
        base,
        padTop,
        x,
        y,
        length,
        glowPath,
        linePath,
        clipRect,
        head,
        halo,
        bars,
        cross,
        hoverDot,
        xLabels,
      }
      setProgress(progress)
      if (hoverIndex >= 0) showHover(hoverIndex)
    }

    const setProgress = (p) => {
      progress = p
      if (!geometry) return
      const { length, glowPath, linePath, clipRect, head, bars } = geometry
      const offset = String(length * (1 - p))
      glowPath.style.strokeDashoffset = offset
      linePath.style.strokeDashoffset = offset
      const point = linePath.getPointAtLength(Math.max(0.001, p * length))
      clipRect.setAttribute('width', String(point.x))
      head.setAttribute('transform', `translate(${point.x} ${point.y})`)
      head.style.opacity = p > 0.01 ? '1' : '0'
      for (const bar of bars)
        bar.rect.classList.toggle('on', bar.at <= point.x + 0.5)
      if (card) {
        const hostBox = host.getBoundingClientRect()
        const cardBox = card.getBoundingClientRect()
        card.style.setProperty(
          '--hx',
          `${hostBox.left - cardBox.left + point.x}px`,
        )
        card.style.setProperty(
          '--hy',
          `${hostBox.top - cardBox.top + point.y}px`,
        )
      }
    }

    const showHover = (index, announce = false) => {
      hoverIndex = index
      if (!geometry) return
      const { x, y, cross, hoverDot, width, padTop, xLabels } = geometry
      const cx = x(index)
      const cy = y(requests[index])
      cross.setAttribute('x1', String(cx))
      cross.setAttribute('x2', String(cx))
      hoverDot.setAttribute('cx', String(cx))
      hoverDot.setAttribute('cy', String(cy))
      for (const [labelIndex, label] of xLabels)
        label.classList.toggle('x-on', labelIndex === index)
      const day = new Date(rows[index].day * 1000)
      const partial =
        index === count - 1 && partialLast
          ? ` · to ${timeFormat.format(snapshotAt)} UTC`
          : ''
      tip.replaceChildren()
      const title = doc.createElement('b')
      title.textContent = longDayFormat.format(day)
      if (partial) {
        const small = doc.createElement('small')
        small.textContent = partial
        title.append(small)
      }
      const row = (color, labelText, value) => {
        const line = doc.createElement('div')
        const name = doc.createElement('span')
        const dot = doc.createElement('i')
        dot.style.background = color
        name.append(dot, labelText)
        const amount = doc.createElement('span')
        amount.textContent = integer.format(value)
        line.append(name, amount)
        return line
      }
      tip.append(
        title,
        row('var(--color-primary)', 'Requests', requests[index]),
        row('var(--status-contested)', 'Challenges', challenges[index]),
      )
      if (announce && live)
        live.textContent = `${longDayFormat.format(day)}${partial}: ${integer.format(requests[index])} requests, ${integer.format(challenges[index])} challenges`
      const tipWidth = tip.offsetWidth || 170
      const tipHeight = tip.offsetHeight || 80
      const left = Math.min(width - tipWidth, Math.max(0, cx - tipWidth / 2))
      const above = cy - tipHeight - 14
      const topPx = above >= padTop - 14 ? above : cy + 16
      tip.style.transform = `translate(${left}px, ${topPx}px)`
      host.dataset.hovering = ''
    }

    const hideHover = () => {
      hoverIndex = -1
      delete host.dataset.hovering
      if (geometry)
        for (const label of geometry.xLabels.values())
          label.classList.remove('x-on')
    }

    const indexAt = (clientX) => {
      if (!geometry) return -1
      const box = host.getBoundingClientRect()
      const local = ((clientX - box.left) / box.width) * geometry.width
      const ratio =
        (local - geometry.x(0)) / (geometry.x(count - 1) - geometry.x(0))
      return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))))
    }

    host.addEventListener('pointermove', (event) => {
      if (progress < 1) return
      showHover(indexAt(event.clientX))
    })
    host.addEventListener('pointerleave', hideHover)
    host.addEventListener('blur', hideHover)
    host.addEventListener('keydown', (event) => {
      if (progress < 1) return
      const moves = { ArrowLeft: -1, ArrowRight: 1, Home: -count, End: count }
      if (!(event.key in moves)) return
      event.preventDefault()
      // A first arrow lands on an end: Left the newest day, Right the oldest.
      const step = moves[event.key]
      const next =
        hoverIndex < 0 && Math.abs(step) === 1
          ? step < 0
            ? count - 1
            : 0
          : (hoverIndex < 0 ? count - 1 : hoverIndex) + step
      showHover(Math.max(0, Math.min(count - 1, next)), true)
    })
    host.setAttribute('role', 'group')
    host.setAttribute('aria-roledescription', 'chart')
    host.setAttribute(
      'aria-label',
      'Requests and challenges per day, last 30 days. Use the arrow keys to read each day.',
    )

    render()
    if ('ResizeObserver' in globalThis) {
      let lastWidth = host.clientWidth
      new ResizeObserver(() => {
        if (Math.abs(host.clientWidth - lastWidth) < 1) return
        lastWidth = host.clientWidth
        render()
      }).observe(host)
    }

    if (reducedMotion()) return
    whenInView(host, () =>
      tween({
        duration: 1300,
        delay: 150,
        ease: easeInOutCubic,
        onFrame: setProgress,
        onDone: () => {
          const halo = geometry?.halo
          if (!halo) return
          halo.classList.remove('ping')
          // Restart the one-shot ping that marks the newest day.
          void halo.getBoundingClientRect()
          halo.classList.add('ping')
        },
      }),
    )
  }

  const chartHost = $('[data-chart]')
  if (chartHost && hasSeries) {
    buildChart(chartHost, series)
    const perDay = integer.format(Math.round(totalRequests / series.length))
    const blocks =
      Math.max(...series.map((row) => row.challenges)) <= MAX_BLOCKS
    setText('average', `${perDay} a day on average`)
    setText(
      'challengeKey',
      blocks ? 'Challenges, one block each' : 'Challenges, own scale',
    )
    setText(
      'chartCaption',
      `Requests and challenges made per day, last 30 days. Requests average ${perDay} a day; challenges are drawn on a separate scale below the baseline.`,
    )
    const body = $('[data-chart-table] tbody')
    if (body)
      for (const row of series) {
        const tr = doc.createElement('tr')
        for (const text of [
          dayFormat.format(new Date(row.day * 1000)),
          integer.format(row.requests),
          integer.format(row.challenges),
        ]) {
          const cell = doc.createElement('td')
          cell.textContent = text
          tr.append(cell)
        }
        body.append(tr)
      }
  }

  /* ---------- Dispute flow schematic ---------- */

  const flow = $('[data-flow]')
  if (flow) {
    const wires = $('[data-flow-wires]', flow)
    const node = (name) => $(`[data-node="${name}"]`, flow)
    const links = [
      { from: 'submit', to: 'window', tone: 'window' },
      { from: 'window', to: 'accepted', tone: 'registered' },
      { from: 'window', to: 'court', tone: 'contested' },
      { from: 'court', to: 'ruling', tone: 'contested' },
    ]
    const drawnLinks = new Set()

    const boxOf = (element) => {
      const outer = flow.getBoundingClientRect()
      const box = element.getBoundingClientRect()
      const left = box.left - outer.left
      const top = box.top - outer.top
      return {
        left,
        top,
        right: left + box.width,
        bottom: top + box.height,
        cx: left + box.width / 2,
        cy: top + box.height / 2,
      }
    }

    /** Orthogonal path through the given corners, with rounded joints. */
    const rounded = (points, radius = 12) => {
      let d = `M${points[0][0]},${points[0][1]}`
      for (let index = 1; index < points.length - 1; index++) {
        const [px, py] = points[index - 1]
        const [cx, cy] = points[index]
        const [nx, ny] = points[index + 1]
        const inLength = Math.hypot(cx - px, cy - py)
        const outLength = Math.hypot(nx - cx, ny - cy)
        const r = Math.min(radius, inLength / 2, outLength / 2)
        const ax = cx - ((cx - px) / inLength) * r
        const ay = cy - ((cy - py) / inLength) * r
        const bx = cx + ((nx - cx) / outLength) * r
        const by = cy + ((ny - cy) / outLength) * r
        d += `L${ax},${ay}Q${cx},${cy} ${bx},${by}`
      }
      const [lx, ly] = points.at(-1)
      return `${d}L${lx},${ly}`
    }

    const route = (from, to) => {
      const a = boxOf(node(from))
      const b = boxOf(node(to))
      const sameRow = b.top < a.bottom - 4 && b.bottom > a.top + 4
      if (sameRow) {
        const y = Math.max(a.top, b.top) + 30
        return rounded([
          [a.right, y],
          [b.left, y],
        ])
      }
      const sameColumn = b.left < a.right - 4 && b.right > a.left + 4
      const blocked = links
        .flatMap((link) => [link.from, link.to])
        .filter((name, index, list) => list.indexOf(name) === index)
        .filter((name) => name !== from && name !== to)
        .map((name) => boxOf(node(name)))
        .some(
          (box) =>
            box.top >= a.bottom - 1 &&
            box.bottom <= b.top + 1 &&
            box.left < a.right &&
            box.right > a.left,
        )
      if (sameColumn && !blocked)
        return rounded([
          [a.left + 30, a.bottom],
          [b.left + 30, b.top],
        ])
      if (sameColumn) {
        // Phones: run down the left rail around the node in between.
        const rail = Math.max(6, a.left - 14)
        return rounded([
          [a.left, a.top + 30],
          [rail, a.top + 30],
          [rail, b.top + 30],
          [b.left, b.top + 30],
        ])
      }
      const midY = (a.bottom + b.top) / 2
      return rounded([
        [a.left + 30, a.bottom],
        [a.left + 30, midY],
        [b.left + 30, midY],
        [b.left + 30, b.top],
      ])
    }

    const parts = links.map((link) => {
      const bed = svgEl('path', { class: 'wire-bed' })
      const wire = svgEl('path', {
        class: `wire wire--${link.tone}`,
        pathLength: 1,
      })
      const glowSpark = svgEl('circle', {
        class: 'spark-glow',
        r: 9,
        style: `fill: var(--status-${link.tone}); fill-opacity: 0.35`,
      })
      const spark = svgEl('circle', { class: 'spark', r: 3 })
      wires.append(bed, wire, glowSpark, spark)
      return { ...link, bed, wire, spark, glowSpark }
    })

    const layout = () => {
      const outer = flow.getBoundingClientRect()
      wires.setAttribute('viewBox', `0 0 ${outer.width} ${outer.height}`)
      for (const part of parts) {
        const d = route(part.from, part.to)
        part.bed.setAttribute('d', d)
        part.wire.setAttribute('d', d)
        part.wire.style.strokeDashoffset = drawnLinks.has(part) ? '0' : '1'
      }
    }

    const light = (name) => node(name)?.classList.add('lit')
    const settle = (name) => {
      const item = node(name)
      item?.classList.remove('lit')
      item?.classList.add('done')
    }

    const drawLink = (part, duration) =>
      new Promise((resolve) => {
        const length = part.wire.getTotalLength()
        for (const dot of [part.spark, part.glowSpark]) dot.style.opacity = '1'
        tween({
          duration,
          ease: easeInOutCubic,
          onFrame: (p) => {
            part.wire.style.strokeDashoffset = String(1 - p)
            const point = part.wire.getPointAtLength(p * length)
            for (const dot of [part.spark, part.glowSpark])
              dot.setAttribute('transform', `translate(${point.x} ${point.y})`)
          },
          onDone: () => {
            drawnLinks.add(part)
            for (const dot of [part.spark, part.glowSpark])
              dot.style.opacity = '0'
            resolve()
          },
        })
      })

    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
    const replay = $('[data-replay]', flow)
    let running = false

    const play = async () => {
      if (running) return
      running = true
      if (replay) replay.hidden = true
      drawnLinks.clear()
      for (const item of $$('.node', flow)) item.classList.remove('lit', 'done')
      flow.dataset.armed = ''
      layout()
      await wait(120)
      light('submit')
      await wait(320)
      await drawLink(parts[0], 650)
      settle('submit')
      light('window')
      await wait(1250)
      await drawLink(parts[1], 650)
      light('accepted')
      await wait(450)
      await drawLink(parts[2], 650)
      settle('window')
      light('court')
      await wait(500)
      await drawLink(parts[3], 650)
      settle('court')
      light('ruling')
      running = false
      if (replay) replay.hidden = false
    }

    const showAll = () => {
      for (const part of parts) drawnLinks.add(part)
      delete flow.dataset.armed
      layout()
    }

    if ('ResizeObserver' in globalThis) new ResizeObserver(layout).observe(flow)
    doc.fonts?.addEventListener('loadingdone', layout)

    if (reducedMotion()) showAll()
    else {
      flow.dataset.armed = ''
      layout()
      whenInView(flow, play, 0.25)
      replay?.addEventListener('click', play)
    }
  }
})()
