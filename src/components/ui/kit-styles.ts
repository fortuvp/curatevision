import { css, keyframes } from 'styled-components'

/*
 * Shared styles for the UI kit (DESIGN.md). Only token roles from
 * src/styles/global-styles.ts are used: no raw colors anywhere in the kit.
 */

export type Tone = 'registered' | 'window' | 'contested' | 'off' | 'neutral'

/** Mono uppercase label: 11/16, 0.06em tracking (eyebrows, chips, headers). */
export const monoLabel = css`
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
`

/** Mono data: 13/18 at 500 with tabular figures (numbers, addresses, timers). */
export const monoData = css`
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
`

/** Floating panel like the app bar's menus: surface, strong hairline, overlay shadow. */
export const overlayPanel = css`
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius);
  box-shadow: var(--shadow-overlay);
  color: var(--color-text);
`

/** 2px action-color ring at 2px offset for elements the global rule does not cover. */
export const focusRing = css`
  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`

/** Square ghost icon button (close, clear, remove). Size is set by the caller. */
export const ghostIconButton = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background var(--motion),
    color var(--motion);

  &:hover:not(:disabled) {
    color: var(--color-text);
    background: var(--color-raised);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

/** Ring spinner drawn in the current color. Width and height are set by the caller. */
export const ringSpinner = css`
  display: inline-block;
  flex: 0 0 auto;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: var(--radius-pill);
  animation: ${spin} 800ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2s;
  }
`

export const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`

/** Skeleton block: raised surface with a sweep of the surface color (as in the primitives). */
export const skeletonBlock = css`
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--color-raised);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      var(--color-surface),
      transparent
    );
    opacity: 0.6;
    animation: ${shimmer} 1.4s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      animation: none;
    }
  }
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
