---
version: alpha
name: CurateVision
description: Design system for CurateVision, a modern front end for Kleros Curate registries. v2, built on roobinium's glow stage (the YMax dashboard), 2026-10-19.
colors:
  primary: "#3D7BFF"
  primary-fill: "#2962FF"
  primary-hover: "#5A8FFF"
  primary-fill-hover: "#1F56F5"
  on-primary: "#FFFFFF"
  stage: "#02040B"
  background: "#060912"
  surface: "#0C111D"
  surface-raised: "rgba(255,255,255,0.045)"
  text: "#F4F6FB"
  text-muted: "#A1ABC0"
  text-faint: "#7A849E"
  border: "rgba(255,255,255,0.07)"
  border-strong: "rgba(255,255,255,0.16)"
  aurora-a: "#1B2FFF"
  aurora-b: "#0A7CFF"
  aurora-c: "#5B2BFF"
  success: "#34D399"
  warning: "#F5B04A"
  danger: "#FF6B7A"
typography:
  hero:
    fontFamily: "Urbanist"
    fontSize: 84px
    fontWeight: 500
    lineHeight: 82px
  display:
    fontFamily: "Urbanist"
    fontSize: 48px
    fontWeight: 500
    lineHeight: 50px
  figure:
    fontFamily: "Geist"
    fontSize: 64px
    fontWeight: 500
    lineHeight: 61px
  heading:
    fontFamily: "Urbanist"
    fontSize: 30px
    fontWeight: 500
    lineHeight: 34px
  body:
    fontFamily: "Geist"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: "Geist"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
  data:
    fontFamily: "Geist"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 18px
rounded:
  sm: 8px
  button: 10px
  md: 12px
  lg: 18px
  xl: 24px
  frame: 32px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  4xl: 80px
components:
  button-primary:
    backgroundColor: "{colors.primary-fill}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.button}"
    typography: "{typography.body}"
    height: 44px
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.button}"
    typography: "{typography.body}"
    height: 44px
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: 24px
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.pill}"
    typography: "{typography.label}"
---

# Overview

CurateVision is a front end for Kleros Curate: on-chain lists that anyone can add to with a deposit,
anyone can challenge during a challenge window, and Kleros jurors settle when there is a dispute.

v2 is built on roobinium's **glow stage** (the YMax DeFi dashboard): the whole
product sits in one large rounded near-black **frame** floating on an **aurora** in the theme's hues.
Restraint inside the frame, color outside it. Inside, the drama comes from **luminous data**:
gradient rings that draw in, a glowing activity wave with a live head, figures that roll into place.
Copy is short; every page leads with its most important number or visual.

Principles, in order:

1. **True data, labelled.** Every figure comes from the indexers or the chain, and every drawing says
   what it measures and over what window. Figures on one page describe the same scope.
2. **Money and time are legible.** Deposits show total and breakdown before anything is signed;
   deadlines read both ways (relative, absolute UTC on hover).
3. **Data first, words last.** One sentence under a title at most; explainers collapse into a pill.
4. **Smooth.** Motion explains change: reveals, count-ups, rings drawing in, sliding indicators,
   hover lift. Reduced motion turns it off.
5. **One accent.** Blue is action. Status colors are status. The aurora is the only other color,
   and charts take their categories from a fixed data set (`--viz-1…4`) that never reuses a status
   color.

Three themes: **Dark** (blue aurora, the default on a dark system), **Light** (white frame on a pale
aurora) and **Kleros** (the production Kleros palette on a purple aurora). **System** follows the OS
between Light and Dark. `?cv-theme=light|dark|kleros` previews a theme without saving it.

# Frame and stage

- The stage is the page background: two slowly drifting aurora pools and one tilted band in
  `aurora-a/b/c` over `stage`, with a faint grain. The dashboard gets the full aurora; inner routes
  dim it to an underglow so the content leads. Hidden tabs pause the drift.
- The frame wraps the app bar, pages and footer: `frame-radius` (clamp 20–44px), `frame-gap`
  margin (clamp 8–52px), an inset 1px ring, a top highlight, light leaks where the band crosses it
  and a floor light at its bottom edge. On phones the frame goes edge to edge.
- The top bar is transparent at rest; after 24px of scroll it lifts into a floating glass pill.
- Nothing inside the frame paints its own full-bleed background or grid.

# Colors

| Role | Light | Dark | Kleros |
|---|---|---|---|
| stage | `#DFE6F7` | `#02040B` | `#07001A` |
| background (frame) | `#FBFCFE` | `#060912` | `#10022A` |
| surface (panel) | `#FFFFFF` | `#0C111D` | `#1A073D` |
| text | `#0B1220` | `#F4F6FB` | `#EAF4FF` |
| text-muted | `#4D5A6E` | `#A1ABC0` | `#B9C6E0` |
| text-faint | `#647083` | `#7A849E` | `#8F87BD` |
| primary (links, focus, selection) | `#2A63F0` | `#3D7BFF` | `#6CC5FF` |
| primary-fill (buttons) | `#2A63F0` | `#2962FF` | `#6CC5FF` |
| primary-fill-hover (buttons) | `#2459E0` | `#1F56F5` | `#A5DBFF` |
| on-primary | `#FFFFFF` | `#FFFFFF` | `#14002F` |
| success / warning / danger | `#127D47` / `#9A5B00` / `#C92A2A` | `#34D399` / `#F5B04A` / `#FF6B7A` | `#65DC7F` / `#FFC46B` / `#FF5A78` |
| aurora a / b / c | `#9DB7FF` / `#B8E3FF` / `#C9B8FF` | `#1B2FFF` / `#0A7CFF` / `#5B2BFF` | `#7E1BD4` / `#4D00B4` / `#27CDFE` |
| viz 1–4 (chart categories) | `#2A63F0` `#0A87AD` `#7B4FD6` `#C43C84` | `#3D7BFF` `#1AA3C4` `#A274FF` `#D9558F` | as Dark |

`primary-on-soft` (primary mixed 70% with text) is the text color on `primary-soft` fills and
featured tints. The viz set passes the categorical checks (lightness band, chroma, CVD and normal
separation, 3:1 on the surface) in each theme; chains keep one hue each (Gnosis 1, Ethereum 2,
Sepolia 3), lists take them in rank order, "other" is `text-faint`.

Every text pair clears WCAG 2.2 AA (4.5:1), measured. Status roles: green registered, blue window
open, amber contested, red off the list, grey neutral; always a haloed dot plus a text label.

# Typography

- **Urbanist** (the Kleros brand face) for display: hero lines, page titles, section titles, big
  figures. Weight 500, tight tracking (-0.03 to -0.045em).
- **Geist** for everything people read and operate, and for every figure that animates or lines up
  in a column (`--font-figure`, tabular figures; Urbanist has none). Labels are small uppercase
  Geist (11px, 0.06em).
- **Geist Mono** only for addresses, hashes and IDs (`<Data $mono>`, `<Mono>`). Counts, amounts,
  ranks and status words are Geist with tabular figures.
- A typeface switch in the theme menu compares pairings live (Urbanist + Geist, Geist, IBM Plex).

# Surfaces and controls

- Panels: `surface`, `lg` radius, 1px border, a 1px top highlight. One **featured** panel per page
  carries the iridescent rim (aurora hues and a touch of amber) and a single comet of light that
  travels the rim on load.
- Buttons: 44px (34px small), `button` radius; primary is `primary-fill` with a soft accent glow.
- Chips are pills. Segmented controls have a spring-loaded sliding indicator.
- Rows: 56px table rows, or full-width rounded list rows that lift on hover.

# Motion kit (`src/components/curate/motion`)

- `Odometer`: digits roll on their own columns, then settle into plain text.
- `AnimatedNumber`: ease-out count-up.
- `RingGauge`: a 270° conic-gradient arc with the gap at the bottom; only the head glows, a crown
  of ticks lights as it passes, the figure (Geist, tabular) sits inside. Expo ease, no overshoot.
- `ActivityWave`: one series as a glowing area above a baseline with a live head at the newest
  point, a second series mirrored below as bars on its own labelled scale; scanner reveal; hover
  tooltip.
- `AreaChart`, `OrbitChart` (multi-segment ring on crisp halos, no blur), `reveal` (staggered
  entrance). Curves are monotone cubic, so they never overshoot the data.
- Easing `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, `(0.2, 0.8, 0.2, 1)` for state changes,
  springs for indicators. All respect `prefers-reduced-motion`.

# Data rules

- "In court" counts disputes open right now (queried directly); "Open requests" counts unresolved
  requests. Per-list status counters drift on some deployments and are not trusted for these.
- "Unchallenged" counts unresolved requests with no challenge (Open requests minus the disputed
  ones). The indexer has no challenge period, so the dashboard never says a window is open.
- One 30-day window for every "30 days" figure: the chart's 30 UTC days (today so far included,
  drawn dashed). Decided, curators and challenge totals use the same start.
- A count is never the length of a capped list: it comes from its own query, and reads "n+" when
  that query hits its cap.
- "Entries" is every entry a list holds, the figure its registry page shows (Light: settled entries
  plus those with an open request).
- Stake Curate has no requests; its listed count is never shown as "open requests".
- Sepolia is a test network: selectable, never part of the default "Mainnets" scope.
- List creation time is the factory's `NewGTCR` block time (cached), not the first request.

# Do's and Don'ts

- Do lead with a number or a visual; do label every drawing with its measure and window.
- Do show deposits as total and breakdown in the chain's currency, and say when they come back.
- Don't stack panels inside panels; separate with space and hairlines.
- Don't use grids as backgrounds, emoji, exclamation marks, hype words, thin editorial type,
  decorative charts, or icon-in-a-colored-square tiles.
