---
version: alpha
name: CurateVision
description: Design system for CurateVision, a modern front end for Kleros Curate registries. Decided from the owner's taste interview (2026-10-18).
colors:
  primary: "#1F6FEB"
  primary-hover: "#185FCC"
  on-primary: "#FFFFFF"
  background: "#F4F6F9"
  surface: "#FFFFFF"
  surface-raised: "#EEF1F5"
  text: "#0F1419"
  text-muted: "#4B5563"
  text-faint: "#6B7686"
  border: "#E1E6EE"
  border-strong: "#C9D2DE"
  indigo: "#5B61D6"
  success: "#178A4C"
  warning: "#9A5B00"
  danger: "#C92A2A"
  success-soft: "#E6F4EC"
  warning-soft: "#FBF1E0"
  danger-soft: "#FBE7E7"
  primary-soft: "#E6F0FD"
typography:
  display:
    fontFamily: "IBM Plex Serif"
    fontSize: 38px
    fontWeight: 400
    lineHeight: 44px
  heading:
    fontFamily: "IBM Plex Sans"
    fontSize: 22px
    fontWeight: 600
    lineHeight: 28px
  title:
    fontFamily: "IBM Plex Sans"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 24px
  body:
    fontFamily: "IBM Plex Sans"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
  data:
    fontFamily: "IBM Plex Mono"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 18px
  label:
    fontFamily: "IBM Plex Mono"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 16px
rounded:
  sm: 4px
  md: 6px
  lg: 10px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    typography: "{typography.body}"
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.sm}"
    typography: "{typography.body}"
    height: 40px
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "{spacing.lg}"
  chip:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-muted}"
    rounded: "{rounded.sm}"
    typography: "{typography.label}"
---

# Overview

CurateVision is a front end for Kleros Curate: on-chain lists that anyone can add to with a
deposit, anyone can challenge during a challenge period, and Kleros jurors settle when there is
a dispute. People come here to browse registries, submit and challenge entries, follow disputes
and claim what they are owed. Many are new to Curate; some run it every day.

The visual world is a **glow stage**: a calm, near-black interface tinted toward one accent,
restrained inside the frame, with a single bloom of the accent behind the page. It carries four
other moods the owner chose: the precision of a **graphite console** for dense data, the honesty
of a **plain-text public record** for addresses and figures, the authority of **editorial
monochrome** for statements and titles, and a trace of **iridescent glass** only in the bloom.
The result should read as modern and familiar (Uniswap Explore, Hyperliquid, Aave are the
reference points) and be recognizable through type and structure, never through decoration.

Principles, in order of priority:

1. **Money and time are always legible.** Deposits, deadlines and outcomes are shown before
   anything is signed, in plain words and exact numbers.
2. **Beginners understand, pros are not slowed down.** Every page carries a short explanation a
   newcomer needs; explanations collapse and stay collapsed for people who know Curate.
3. **One accent.** Blue means action. Status colors mean status. Nothing else is colored.
4. **Data is the hero.** Real counts, real addresses, real timers, set in mono with tabular
   figures, are the identity of the product.
5. **Familiar patterns, exact craft.** Tables, chips, cards, timelines and steppers that people
   know, executed with consistent spacing, type and color.

Three color themes ship: **Light**, **Dark** (the default on a dark system) and **Kleros**, the
production Kleros dApp palette for people who want the brand's deep purple. "System" follows
the operating system between Light and Dark. Every theme meets WCAG 2.2 AA for text (4.5:1) and
3:1 for borders, icons and status dots.

# Colors

Roles, not swatches. Each role has a value per theme; the front matter lists Light.

| Role | Light | Dark | Kleros |
|---|---|---|---|
| background | `#F4F6F9` | `#0A0E14` | `#1B003F` |
| surface | `#FFFFFF` | `#10161F` | `#220050` |
| surface-raised | `#EEF1F5` | `#171F2B` | `#2A1260` |
| text | `#0F1419` | `#E9EEF5` | `#DAF0FF` |
| text-muted | `#4B5563` | `#AEB8C6` | `#BECCE5` |
| text-faint | `#6B7686` | `#7D8A9E` | `#9A93C4` |
| border | `#E1E6EE` | `rgba(148,163,184,.16)` | `#392C74` |
| border-strong | `#C9D2DE` | `rgba(148,163,184,.34)` | `#4F4595` |
| primary (action) | `#1F6FEB` | `#5DA9FF` | `#6CC5FF` |
| on-primary | `#FFFFFF` | `#06101C` | `#1B003F` |
| indigo (identity accent, rare) | `#5B61D6` | `#8B93FF` | `#B45FFF` |
| success | `#178A4C` | `#3DD68C` | `#65DC7F` |
| warning | `#9A5B00` | `#F5B14C` | `#FFC46B` |
| danger | `#C92A2A` | `#FF6B6B` | `#FF5A78` |

Rules:

- **Blue is the only action color.** Primary buttons, links, focused inputs, the active nav item
  and selected chips use `primary`. Never use it for status.
- **Status colors carry one meaning each.** Green: on the list. Blue: a window is open (submitted,
  removal requested). Amber: contested (challenged, in court, appeal). Red: off the list (rejected,
  removed). Grey: neutral or final. Status is shown as a dot plus a text label, never color alone.
- **Soft fills** (`*-soft`, 12–14% of the status color on dark) are for chips and row highlights
  only, never for text.
- **The bloom.** Dark and Kleros themes paint one radial glow of the accent behind the page
  (`primary` at 14%, top center, fading by 40% of the viewport). Light has no glow. No second
  glow color, no gradients on surfaces, no purple-to-blue.
- **Indigo** appears only in the logo mark, text selection and the Kleros theme's identity
  elements. Never on buttons.
- Neutral greys lean toward the accent (blue-tinted in Dark, violet-tinted in Kleros), never
  pure grey.

# Typography

One superfamily, three voices. Loaded from Google Fonts with `display=swap`.

- **IBM Plex Sans** (400, 500, 600) for everything people read and operate: body, headings,
  buttons, inputs, navigation.
- **IBM Plex Mono** (400, 500, 600) for everything that is data: addresses, hashes, amounts,
  timers, counts, chain and status labels, eyebrows and column headers. Always with
  `font-variant-numeric: tabular-nums`.
- **IBM Plex Serif** (400, 400 italic, 500) for editorial moments only: the page's one
  statement, the beginner explainer's heading, the landing page. Never in tables or controls.

Scale (size / line height): display 38/44 (serif, clamp down to 30/36 on phones); heading
22/28; subheading 17/24; body 14/20; body-large 15/22; small 13/18; data 13/18 mono; label 11/16
mono uppercase with 0.06em tracking. Big figures (hero counts) are mono 28/32 at weight 500.

- Headings are sentence case. Only mono labels are uppercase.
- Max line length for running text: 68 characters.
- Letter spacing is 0 except mono labels (0.06em) and the serif display (-0.01em).
- Weight carries hierarchy: 600 for headings and buttons, 500 for data and emphasis, 400 for text.

# Layout

- Page container max 1400px, gutter `var(--horizontal-padding)` (min(4.7vw, 66px), 16px on
  phones). Content sits on the page background; cards are surfaces on it.
- 4px grid. Spacing steps 4, 8, 12, 16, 24, 32, 48. Card padding 16 (compact) or 20 (standard).
- Two densities: **comfortable** (cards, rows) and **compact** (tables). Registry and item lists
  let the user pick table, cards or rows; the choice is remembered.
- Dashboard structure, top to bottom: statement + live figures; "How Curate works" explainer
  (collapsible, remembered); what needs attention (status columns: window open, in court,
  recently decided); registry explorer; activity and curators in a side rail.
- App bar: logo, primary navigation (Dashboard, Browse, Launch a list, Guide), chain chip,
  account chip or Connect, theme menu, help. 56px tall, sticky, surface color with a hairline.
- Phone: single column, 16px gutters, sticky bottom action bar on item pages, tables scroll
  inside their own container.

# Elevation & Depth

- Depth comes from **hairlines and surface steps**, not shadows. Surface sits on background;
  surface-raised sits on surface. Borders are 1px `border`.
- Light theme: cards may carry `0 1px 2px rgba(16,24,40,.06)`. Dark and Kleros: no shadows;
  hover raises the border to `border-strong`.
- Modals and dropdowns: surface, 1px border-strong, `0 12px 32px rgba(0,0,0,.24)` (dark) or
  `.12` (light).
- Focus ring: 2px `primary` outline at 2px offset on every interactive element.
- Glass is not used on surfaces. The only translucency is the sticky app bar at 92% surface
  over the bloom.

# Shapes

- Radius: 4px controls and chips, 6px cards and inputs, 10px modals and the hero panel,
  999px pills (status dots, segmented controls, avatars).
- Status dot: 8px circle, 2px gap, then the mono label.
- Progress rails: 4px tall, radius 2px, track `surface-raised`, fill = status color.
- Ring gauges: 6px stroke, same colors, figure inside in mono.
- Icons: 1.5px stroke outline set (the existing CurateIcon set), 16px in text, 20px in nav.

# Components

- **Button**: primary (blue fill, on-primary text), secondary (surface, border, text),
  ghost (no border, text-muted → text on hover), danger (danger fill, white). Height 40
  (32 small). Labels are verbs. A disabled primary names its blocker in a tooltip or inline
  ("Connect wallet to submit", "Switch to Gnosis").
- **Status**: dot + mono label (`Registered`, `Submitted · 2d 4h to challenge`, `Challenged ·
  jurors voting`, `Appeal · closes in 1h 40m`, `Rejected`). Time left appears wherever an item
  appears, in list rows too.
- **Countdown card**: figure (mono 28), unit line, a 4px rail between the start date and the
  deadline, both dates in small mono, one action.
- **"What happens next" panel**: before any deposit, four steps (you deposit → challenge window
  → nobody challenges / someone challenges) with the exact amounts and period, then a single
  confirm button that repeats the amount.
- **Status columns board**: three columns with mono headers and counts; cards show registry,
  identifiers, chain, actor and time; a footer "+n more" link.
- **Table**: 44px rows, hairline dividers, mono for addresses and numbers, sortable headers in
  mono label style, sticky header, horizontal scroll on phones.
- **Chips**: 24px, radius 4, surface-raised, mono label; selected = primary-soft fill and
  primary text.
- **Explainer**: serif heading, three numbered steps in sans, a small schematic (SVG lines and
  nodes), "Hide this" link that persists.

# Do's and Don'ts

- Do show the deposit as total and breakdown (base + arbitration) with the chain's currency,
  and say when it comes back.
- Do write deadlines both ways: relative ("2d 4h left") and absolute with timezone on hover.
- Do keep addresses middle-truncated in mono with a copy action and an explorer link.
- Do let every page work without a wallet; ask to connect only on an action.
- Don't use gradients, glows on surfaces, glassmorphism, neon or purple-to-blue.
- Don't color status without a label; don't use blue for status.
- Don't put uppercase on anything except mono labels.
- Don't use emoji, exclamation marks or hype words anywhere.
- Don't stack more than one explainer per page; pros should be able to hide it once.
