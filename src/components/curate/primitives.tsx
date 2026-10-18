import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { Link } from 'react-router-dom'
import { CurateIcon, type CurateIconName } from './icons'
import ChainLogo from 'components/chain-logo'
import { NETWORKS_INFO } from 'config/networks'

/*
 * CurateVision primitives, built from DESIGN.md. Every page composes these:
 * layout (Page, Section, Surface), type (Statement, Heading, Label, Data, Figure),
 * controls (Button, Chip, Segmented), status (StatusDot, Status), tables and
 * empty/skeleton states. Colors come only from the token roles in global-styles.
 */

/* ---------- Layout ---------- */

export const Page = styled.main`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 40px var(--horizontal-padding) 96px;

  @media (max-width: 720px) {
    padding-top: 24px;
    padding-bottom: 64px;
  }
`

export const Section = styled.section<{ $gap?: 'sm' | 'md' | 'lg' }>`
  margin-top: ${({ $gap }) =>
    $gap === 'sm' ? '16px' : $gap === 'lg' ? '48px' : '32px'};

  &:first-child {
    margin-top: 0;
  }
`

export const Stack = styled.div<{ $gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${({ $gap }) => $gap ?? 12}px;
`

export const Row = styled.div<{
  $gap?: number
  $wrap?: boolean
  $align?: string
  $justify?: string
}>`
  display: flex;
  align-items: ${({ $align }) => $align ?? 'center'};
  justify-content: ${({ $justify }) => $justify ?? 'flex-start'};
  flex-wrap: ${({ $wrap }) => ($wrap ? 'wrap' : 'nowrap')};
  gap: ${({ $gap }) => $gap ?? 8}px;
  min-width: 0;
`

export const Surface = styled.div<{
  $padding?: 'none' | 'compact' | 'standard'
  $interactive?: boolean
  $raised?: boolean
  /** One panel per page may carry the iridescent rim (YMax's chart frame). */
  $featured?: boolean
}>`
  position: relative;
  min-width: 0;
  background: ${({ $raised }) =>
    $raised ? 'var(--color-raised)' : 'var(--color-surface)'};
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    var(--shadow-card);
  padding: ${({ $padding }) =>
    $padding === 'none' ? 0 : $padding === 'compact' ? '18px' : '24px'};
  transition:
    border-color var(--motion),
    box-shadow var(--motion),
    transform var(--motion);

  ${({ $featured }) =>
    $featured &&
    css`
      border-color: transparent;
      background:
        linear-gradient(var(--color-surface), var(--color-surface)) padding-box,
        linear-gradient(
            120deg,
            var(--aurora-b),
            color-mix(in srgb, var(--color-warning) 70%, transparent) 38%,
            var(--aurora-c) 68%,
            var(--aurora-a)
          )
          border-box;
      border-width: 1.5px;
    `}

  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;
      color: inherit;
      text-decoration: none;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow:
          inset 0 1px 0 var(--glass-highlight),
          var(--shadow-card-hover);
        transform: translateY(-1px);
      }
    `}
`

export const Hairline = styled.hr`
  margin: 0;
  border: 0;
  border-top: 1px solid var(--color-border);
`

export const Grid = styled.div<{ $min?: number; $gap?: number }>`
  display: grid;
  grid-template-columns: repeat(
    auto-fill,
    minmax(${({ $min }) => $min ?? 280}px, 1fr)
  );
  gap: ${({ $gap }) => $gap ?? 16}px;
`

export const SplitGrid = styled.div<{ $rail?: number }>`
  display: grid;
  grid-template-columns: minmax(0, 1fr) ${({ $rail }) => $rail ?? 360}px;
  gap: 24px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`

/* ---------- Type ---------- */

/** The page's one statement: large, light, tight (no serif). */
export const Statement = styled.h1`
  margin: 0;
  max-width: 22ch;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--fs-display);
  line-height: var(--lh-display);
  font-weight: 500;
  letter-spacing: -0.03em;
  text-wrap: balance;
`

/** Oversized hero line for the landing moments (dashboard, launch). */
export const HeroStatement = styled.h1`
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: var(--fs-hero);
  line-height: var(--lh-hero);
  font-weight: 500;
  letter-spacing: -0.035em;
  text-wrap: balance;

  em {
    font-style: normal;
    color: var(--color-primary);
  }
`

export const Heading = styled.h2`
  margin: 0;
  font-family: var(--font-display);
  color: var(--color-text);
  font-size: var(--fs-heading);
  line-height: var(--lh-heading);
  font-weight: 500;
  letter-spacing: var(--tracking-tight);
`

export const Subheading = styled.h3`
  margin: 0;
  color: var(--color-text);
  font-size: var(--fs-subheading);
  line-height: var(--lh-subheading);
  font-weight: 500;
  letter-spacing: -0.01em;
`

export const Title = styled.h4`
  margin: 0;
  color: var(--color-text);
  font-size: var(--fs-body-lg);
  line-height: var(--lh-body-lg);
  font-weight: 600;
`

export const Body = styled.p<{ $muted?: boolean; $large?: boolean }>`
  margin: 0;
  max-width: 68ch;
  color: ${({ $muted }) =>
    $muted ? 'var(--color-muted)' : 'var(--color-text)'};
  font-size: ${({ $large }) =>
    $large ? 'var(--fs-body-lg)' : 'var(--fs-body)'};
  line-height: ${({ $large }) =>
    $large ? 'var(--lh-body-lg)' : 'var(--lh-body)'};
`

export const Small = styled.span<{ $muted?: boolean; $faint?: boolean }>`
  color: ${({ $muted, $faint }) =>
    $faint
      ? 'var(--color-faint)'
      : $muted
        ? 'var(--color-muted)'
        : 'var(--color-text)'};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

/** Small uppercase label (eyebrows, column headers): sans, tracked, quiet. */
export const Label = styled.span<{
  $tone?: 'muted' | 'faint' | 'text' | 'primary'
}>`
  display: inline-block;
  color: ${({ $tone }) =>
    $tone === 'faint'
      ? 'var(--color-faint)'
      : $tone === 'text'
        ? 'var(--color-text)'
        : $tone === 'primary'
          ? 'var(--color-primary)'
          : 'var(--color-muted)'};
  font-family: var(--font-label);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
`

/** Mono data: addresses, amounts, timers, counts (13/18, tabular). */
export const Data = styled.span<{
  $muted?: boolean
  $weight?: 400 | 500 | 600
}>`
  color: ${({ $muted }) =>
    $muted ? 'var(--color-muted)' : 'var(--color-text)'};
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  line-height: var(--lh-data);
  font-weight: ${({ $weight }) => $weight ?? 500};
  font-variant-numeric: tabular-nums;
`

/** Big figure (hero counts, countdowns): light, large, tabular. */
export const Figure = styled.span<{ $size?: 'md' | 'lg' }>`
  display: block;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: ${({ $size }) =>
    $size === 'lg' ? 'clamp(40px, 3.4vw + 16px, 64px)' : 'var(--fs-figure)'};
  line-height: var(--lh-figure);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: var(--tracking-display);
`

export const Mono = styled.span`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
`

/* ---------- Controls ---------- */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonStyles = css<{
  $variant?: ButtonVariant
  $size?: 'sm' | 'md'
  $block?: boolean
}>`
  position: relative;
  display: ${({ $block }) => ($block ? 'flex' : 'inline-flex')};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: ${({ $size }) => ($size === 'sm' ? '34px' : '44px')};
  padding: 0 ${({ $size }) => ($size === 'sm' ? '14px' : '20px')};
  border-radius: 10px;
  border: 1px solid transparent;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
  letter-spacing: -0.005em;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition:
    background var(--motion),
    border-color var(--motion),
    box-shadow var(--motion),
    color var(--motion),
    transform var(--motion);

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  ${({ $variant }) =>
    $variant === 'secondary'
      ? css`
          background: var(--color-raised);
          border-color: var(--glass-border);
          box-shadow: inset 0 1px 0 var(--glass-highlight);
          color: var(--color-text);

          &:hover:not(:disabled) {
            border-color: var(--color-border-strong);
            color: var(--color-text);
          }
        `
      : $variant === 'ghost'
        ? css`
            background: transparent;
            color: var(--color-muted);

            &:hover:not(:disabled) {
              color: var(--color-text);
              background: var(--color-raised);
            }
          `
        : $variant === 'danger'
          ? css`
              background: var(--color-danger);
              color: var(--color-on-primary);

              &:hover:not(:disabled) {
                filter: brightness(1.08);
              }
            `
          : css`
              background: var(--color-primary);
              color: var(--color-on-primary);
              box-shadow:
                inset 0 1px 0 color-mix(in srgb, white 24%, transparent),
                0 10px 30px -12px var(--color-primary);

              &:hover:not(:disabled) {
                background: var(--color-primary-hover);
                color: var(--color-on-primary);
                box-shadow:
                  inset 0 1px 0 color-mix(in srgb, white 32%, transparent),
                  0 12px 32px -10px var(--color-primary);
              }
            `}

  &:disabled,
  &[aria-disabled='true'] {
    cursor: not-allowed;
    opacity: 0.5;
    box-shadow: none;
  }
`

export const Button = styled.button<{
  $variant?: ButtonVariant
  $size?: 'sm' | 'md'
  $block?: boolean
}>`
  ${buttonStyles}
`

export const ButtonLink = styled(Link)<{
  $variant?: ButtonVariant
  $size?: 'sm' | 'md'
  $block?: boolean
}>`
  ${buttonStyles}
`

export const ButtonAnchor = styled.a<{
  $variant?: ButtonVariant
  $size?: 'sm' | 'md'
  $block?: boolean
}>`
  ${buttonStyles}
`

export const IconButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid
    ${({ $active }) => ($active ? 'var(--glass-border)' : 'transparent')};
  border-radius: var(--radius-pill);
  background: ${({ $active }) => ($active ? 'var(--glass)' : 'transparent')};
  color: ${({ $active }) =>
    $active ? 'var(--color-text)' : 'var(--color-muted)'};
  cursor: pointer;
  transition:
    background var(--motion),
    color var(--motion);

  &:hover {
    color: var(--color-text);
    background: var(--color-raised);
  }
`

/** 24px pill chip, mono label; selected = primary-soft fill and primary text. */
const chipStyles = css<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 10px;
  border: 1px solid
    ${({ $selected }) =>
      $selected
        ? 'color-mix(in srgb, var(--color-primary) 40%, transparent)'
        : 'var(--glass-border)'};
  border-radius: var(--radius-pill);
  background: ${({ $selected }) =>
    $selected ? 'var(--color-primary-soft)' : 'var(--glass)'};
  color: ${({ $selected }) =>
    $selected ? 'var(--color-primary)' : 'var(--color-muted)'};
  font-family: var(--font-label);
  font-size: 11px;
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: 0.02em;
  white-space: nowrap;
`

export const Chip = styled.span<{ $selected?: boolean }>`
  ${chipStyles}
`

export const ChipButton = styled.button<{ $selected?: boolean }>`
  ${chipStyles}
  height: 28px;
  cursor: pointer;
  transition:
    background var(--motion),
    color var(--motion);

  &:hover {
    color: ${({ $selected }) =>
      $selected ? 'var(--color-primary)' : 'var(--color-text)'};
  }
`

export const ChainChip = ({
  chainId,
  size = 'md',
}: {
  chainId: number
  size?: 'sm' | 'md'
}) => {
  const info = NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
  return (
    <Chip title={info ? `${info.name} (chain ${chainId})` : `Chain ${chainId}`}>
      <ChainLogo chainId={chainId} size={size === 'sm' ? 12 : 14} />
      {info?.name ?? `Chain ${chainId}`}
    </Chip>
  )
}

/** Segmented control (table / cards / rows, filters). */
export const Segmented = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  background: var(--color-raised);
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
`

export const Segment = styled.button<{
  $active?: boolean
  /** Inside a sliding track the pill draws the active state. */
  $sliding?: boolean
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 9px;
  background: ${({ $active, $sliding }) =>
    $active && !$sliding ? 'var(--color-primary-soft)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--color-text)' : 'var(--color-muted)'};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--motion),
    color var(--motion);

  &:hover {
    color: var(--color-text);
  }
`

const SlidingTrack = styled(Segmented)`
  position: relative;
  isolation: isolate;
`

const SlidingPill = styled.span`
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 0;
  z-index: -1;
  border-radius: 9px;
  background: var(--color-primary-soft);
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--color-primary) 30%, transparent);
  transition:
    transform 380ms cubic-bezier(0.34, 1.4, 0.64, 1),
    width 380ms cubic-bezier(0.34, 1.4, 0.64, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export type SegmentOption<T extends string> = {
  value: T
  label: string
  icon?: CurateIconName
}

/** Segmented control whose active pill slides between options. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
}) {
  const track = React.useRef<HTMLDivElement>(null)
  const [pill, setPill] = React.useState<{ left: number; width: number }>()
  React.useLayoutEffect(() => {
    const node = track.current?.querySelector<HTMLButtonElement>(
      '[aria-checked="true"]',
    )
    if (node) setPill({ left: node.offsetLeft, width: node.offsetWidth })
  }, [value, options.length])
  return (
    <SlidingTrack ref={track} role="radiogroup" aria-label={ariaLabel}>
      {pill && (
        <SlidingPill
          aria-hidden
          style={{ transform: `translateX(${pill.left}px)`, width: pill.width }}
        />
      )}
      {options.map((option) => (
        <Segment
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          $active={option.value === value}
          $sliding
          onClick={() => onChange(option.value)}
        >
          {option.icon && <CurateIcon name={option.icon} size={14} />}
          {option.label}
        </Segment>
      ))}
    </SlidingTrack>
  )
}

export const TextInput = styled.input`
  width: 100%;
  height: 44px;
  padding: 0 14px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  transition:
    border-color var(--motion),
    box-shadow var(--motion);

  &::placeholder {
    color: var(--color-faint);
  }

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px var(--color-primary-soft);
  }
`

export const SearchField = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: var(--color-faint);
  transition:
    border-color var(--motion),
    box-shadow var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px var(--color-primary-soft);
  }

  input {
    flex: 1;
    min-width: 0;
    border: 0 !important;
    outline: 0;
    background: transparent !important;
    box-shadow: none !important;
    color: var(--color-text);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
  }

  input::placeholder {
    color: var(--color-faint);
  }
`

/* ---------- Status ---------- */

export type StatusTone =
  | 'registered'
  | 'window'
  | 'contested'
  | 'off'
  | 'neutral'

/** 8px dot in a status role color with a soft halo. Never alone: pair it with a label. */
export const StatusDot = styled.span<{ $tone: StatusTone }>`
  display: inline-block;
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: var(--status-${({ $tone }) => $tone});
  box-shadow: 0 0 0 3px
    color-mix(in srgb, var(--status-${({ $tone }) => $tone}) 22%, transparent);
`

const StatusWrap = styled.span<{ $wrap?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  white-space: ${({ $wrap }) => ($wrap ? 'normal' : 'nowrap')};
`

/**
 * Dot + mono label, optional detail: "Submitted · 2d 4h to challenge".
 * The dot carries the role color; the text stays in the text roles.
 */
export const Status = ({
  tone,
  label,
  detail,
  title,
  className,
}: {
  tone: StatusTone
  label: React.ReactNode
  detail?: React.ReactNode
  title?: string
  className?: string
}) => (
  <StatusWrap className={className} title={title}>
    <StatusDot $tone={tone} aria-hidden />
    <Data $weight={500}>{label}</Data>
    {detail && (
      <Data $muted $weight={400}>
        · {detail}
      </Data>
    )}
  </StatusWrap>
)

/** Kept for the registry panels: a status label shown as a chip. */
export const StatusPill = ({
  tone,
  children,
}: {
  tone: StatusTone
  children: React.ReactNode
}) => (
  <Chip>
    <StatusDot $tone={tone} aria-hidden />
    {children}
  </Chip>
)

/** An 8px indicator used next to "live" labels. */
export const LiveDot = styled(StatusDot).attrs({
  $tone: 'registered' as StatusTone,
})``

/** Progress rail; fill color follows the status tone, with a soft glow. */
export const Rail = styled.div<{ $value: number; $tone?: StatusTone }>`
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: ${({ $value }) =>
      Math.round(Math.min(1, Math.max(0, $value)) * 100)}%;
    border-radius: var(--radius-pill);
    background: var(--status-${({ $tone }) => $tone ?? 'window'});
    box-shadow: 0 0 12px
      color-mix(
        in srgb,
        var(--status-${({ $tone }) => $tone ?? 'window'}) 60%,
        transparent
      );
    transition: width 400ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
`

/* ---------- Panels ---------- */

export const PanelHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
`

export const PanelTitle = styled(Subheading)`
  display: flex;
  align-items: center;
  gap: 8px;
`

export const PanelHint = styled(Label)``

/* ---------- Tables ---------- */

export const TableScroller = styled.div`
  width: 100%;
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
`

export const Table = styled.table`
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;

  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    height: 44px;
    padding: 0 16px;
    border-bottom: 1px solid var(--glass-border);
    background: transparent;
    color: var(--color-faint);
    font-family: var(--font-label);
    font-size: var(--fs-label);
    line-height: var(--lh-label);
    font-weight: 500;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    text-align: left;
    white-space: nowrap;
  }

  thead th[data-sortable='true'] {
    cursor: pointer;
  }

  thead th[data-sortable='true']:hover {
    color: var(--color-text);
  }

  tbody td {
    height: 56px;
    padding: 0 16px;
    border-bottom: 1px solid var(--glass-border);
    color: var(--color-text);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    vertical-align: middle;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }

  tbody tr {
    transition: background var(--motion);
  }

  tbody tr[data-href]:hover td {
    background: var(--color-raised);
    cursor: pointer;
  }

  td.num,
  th.num {
    text-align: right;
  }

  td.num {
    font-size: var(--fs-body);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
`

/* ---------- Rows (comfortable list) ---------- */

export const ListRow = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  color: inherit;
  text-decoration: none;
  transition: background var(--motion);

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: var(--color-raised);
  }
`

/* ---------- States ---------- */

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`

export const SkeletonBlock = styled.div<{ $height?: string; $width?: string }>`
  position: relative;
  overflow: hidden;
  width: ${({ $width }) => $width || '100%'};
  min-height: ${({ $height }) => $height || '20px'};
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

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 40px 24px;
  text-align: center;
  color: var(--color-muted);
`

const EmptyIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-bottom: 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-faint);
`

export const EmptyState = ({
  icon = 'list',
  title,
  children,
  action,
}: {
  icon?: CurateIconName
  title: React.ReactNode
  children?: React.ReactNode
  action?: React.ReactNode
}) => (
  <EmptyWrap>
    <EmptyIcon>
      <CurateIcon name={icon} size={18} />
    </EmptyIcon>
    <Title>{title}</Title>
    {children && <Body $muted>{children}</Body>}
    {action && <div style={{ marginTop: 10 }}>{action}</div>}
  </EmptyWrap>
)

/* ---------- Key/value ---------- */

export const KeyValueList = styled.dl`
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 8px 16px;
  margin: 0;

  dt {
    color: var(--color-muted);
    font-family: var(--font-label);
    font-size: var(--fs-label);
    line-height: 20px;
    font-weight: 500;
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }

  dd {
    margin: 0;
    min-width: 0;
    color: var(--color-text);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    overflow-wrap: anywhere;
  }
`

/** Middle-truncated address in mono with a title holding the full value. */
export const truncateMiddle = (value: string, head = 6, tail = 4): string =>
  value.length > head + tail + 1
    ? `${value.slice(0, head)}…${value.slice(-tail)}`
    : value
