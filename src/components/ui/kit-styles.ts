import { css, keyframes } from 'styled-components'

/*
 * Shared styles for the UI kit, v2 (the glow stage). Only token roles from
 * src/styles/global-styles.ts are used: no raw colors anywhere in the kit.
 * Labels are small uppercase sans, figures are Geist with tabular numbers,
 * floating panels are glass like the app bar's menus, fields are raised.
 */

export type Tone = 'registered' | 'window' | 'contested' | 'off' | 'neutral'

/** Small uppercase sans label: 11/16 at 500, tracked (eyebrows, column heads). */
export const kitLabel = css`
  font-family: var(--font-label);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
`

/** Figures: Geist at 13/18 and 500 with tabular numbers (counts, pages, units). */
export const figureData = css`
  font-family: var(--font-figure);
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
`

/** One easing for every hover, press and colour change in the kit. */
export const kitTransition = (...properties: string[]) =>
  properties
    .map((property) => `${property} var(--dur-hover) var(--ease-out)`)
    .join(', ')

/** Glass panel like the app bar's menus: 18px radius, hairline, top highlight. */
export const overlayPanel = css`
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 94%, transparent);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    var(--shadow-overlay);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  color: var(--color-text);
`

/*
 * Entrance for floating panels. It moves with the individual `scale` and
 * `translate` properties so it composes with a placement `transform`.
 */
export const popIn = keyframes`
  from { opacity: 0; scale: 0.97; translate: 0 -4px; }
  to { opacity: 1; scale: 1; translate: 0 0; }
`

export const popInUp = keyframes`
  from { opacity: 0; scale: 0.97; translate: 0 4px; }
  to { opacity: 1; scale: 1; translate: 0 0; }
`

export const floatingEntrance = (up = false) => css`
  animation: ${up ? popInUp : popIn} 200ms var(--ease-out) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** A menu row, as in the app bar menus: 40px, radius 12, primary-soft when chosen. */
export const menuRow = css`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  padding: 4px 12px;
  border-radius: var(--radius);
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
  transition: ${kitTransition('background', 'color')};
`

/** Raised field: 44px, radius 12, hairline; the focus ring is soft and blue. */
export const fieldSurface = css`
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: var(--color-text);
  transition: ${kitTransition('border-color', 'box-shadow', 'background')};
`

export const fieldHover = css`
  border-color: var(--color-border-strong);
`

export const fieldFocus = css`
  border-color: color-mix(in srgb, var(--color-primary) 65%, transparent);
  background: color-mix(in srgb, var(--color-primary) 5%, var(--color-raised));
  box-shadow: 0 0 0 4px var(--color-primary-soft);
  outline: none;
`

/** 2px action-color ring at 2px offset for elements the global rule does not cover. */
export const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`

/** Round ghost icon button (close, clear, remove). Size is set by the caller. */
export const ghostIconButton = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition: ${kitTransition('background', 'color', 'border-color')};

  &:hover:not(:disabled) {
    color: var(--color-text);
    border-color: var(--glass-border);
    background: var(--color-raised);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

/** Thin arc that fades into its tail, drawn in the current color. Size by the caller. */
export const ringSpinner = css`
  display: inline-block;
  flex: 0 0 auto;
  border-radius: var(--radius-pill);
  background: conic-gradient(from 0deg, transparent 10%, currentColor);
  /* Masks read only alpha; any opaque token works as the ink. */
  -webkit-mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 2px),
    var(--color-text) calc(100% - 1.5px)
  );
  mask: radial-gradient(
    farthest-side,
    transparent calc(100% - 2px),
    var(--color-text) calc(100% - 1.5px)
  );
  animation: ${spin} 900ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2.4s;
  }
`

export const shimmer = keyframes`
  from { background-position: 150% 0; }
  to { background-position: -50% 0; }
`

/** Skeleton block: raised fill with a faint blue sweep (never a spinner). */
export const skeletonBlock = css`
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background-color: var(--color-raised);
  background-image: linear-gradient(
    90deg,
    transparent 30%,
    color-mix(in srgb, var(--color-primary) 9%, transparent) 50%,
    transparent 70%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: ${shimmer} 1.4s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/** Small status dot with a soft halo in its own tone. */
export const haloDot = (color: string) => css`
  display: inline-block;
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: ${color};
  box-shadow:
    0 0 0 3px color-mix(in srgb, ${color} 22%, transparent),
    0 0 10px color-mix(in srgb, ${color} 45%, transparent);
`

const TONE_WORDS: Record<string, Tone> = {
  registered: 'registered',
  success: 'registered',
  green: 'registered',
  window: 'window',
  processing: 'window',
  info: 'window',
  blue: 'window',
  contested: 'contested',
  warning: 'contested',
  orange: 'contested',
  gold: 'contested',
  amber: 'contested',
  yellow: 'contested',
  off: 'off',
  error: 'off',
  danger: 'off',
  red: 'off',
  neutral: 'neutral',
  default: 'neutral',
  gray: 'neutral',
  grey: 'neutral',
}

/** Maps a status word or a legacy color word onto a status role; undefined otherwise. */
export const toneFor = (value?: string): Tone | undefined =>
  value ? TONE_WORDS[value.toLowerCase()] : undefined

export const toneColor = (tone: Tone): string => `var(--status-${tone})`

export const toneSoft = (tone: Tone): string => `var(--status-${tone}-soft)`

export const joinClassNames = (
  ...parts: (string | false | null | undefined)[]
): string => parts.filter(Boolean).join(' ')
