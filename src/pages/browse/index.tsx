import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import useStoredLayout, {
  LAYOUT_OPTIONS,
  type ListLayout,
} from 'hooks/use-stored-layout'
import { formatAbsolute, formatAgo } from 'utils/time'
import { parseRichAddress } from 'utils/rich-address'
import ChainLogo from 'components/chain-logo'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  ChainChip,
  Chip,
  EmptyState,
  Label,
  Page,
  SearchField,
  SegmentedControl,
  SkeletonBlock,
  Small,
  StatusDot,
  Surface,
  Table,
  TableScroller,
  truncateMiddle,
  type StatusTone,
} from 'components/curate/primitives'
import { AnimatedNumber } from 'components/curate/motion/animated-number'
import { Odometer } from 'components/curate/motion/odometer'
import { RingGauge } from 'components/curate/motion/ring-gauge'
import { reveal } from 'components/curate/motion/reveal'
import { Pagination } from 'components/ui'
import { fetchDashboardData } from 'pages/dashboard/data'
import {
  applyCreationTimes,
  fetchRegistryCreationTimes,
} from 'utils/registry-creation'
import type { DashboardRegistry } from 'pages/dashboard/types'
import {
  KIND_OPTIONS,
  PAGE_SIZE,
  SORT_OPTIONS,
  SUPPORTED_CHAIN_IDS,
  VERIFICATION_CHAIN_IDS,
  activityTone,
  chainName,
  entryCount,
  filterRegistries,
  kindLabel,
  mediaUrl,
  parseChains,
  parseKinds,
  parsePage,
  parseSort,
  parseTrust,
  pendingLabel,
  registryHref,
  scopeText,
  shareCaption,
  shownCreation,
  sortRegistries,
  summarize,
  toggleKind,
  verificationHref,
  type TrustMode,
} from './view'

/*
 * Browse (/browse): every registry the indexers know, across chains. A
 * compact title, one panel of figures for the chosen chain scope, then the
 * explorer: one toolbar row (search, trust, type, sort, layout), the
 * registries as rows, cards or a table, and pagination. The rail holds the
 * way to get a registry verified and the latest requests. The chain is
 * chosen in the app bar through ?chain. Every figure is read from the data.
 */

const integer = new Intl.NumberFormat('en-US')
const formatInt = (value: number) => integer.format(Math.round(value))

const dateParts = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * "7 Sep 2026" (UTC), day first with the three-letter month. Not
 * utils/time formatDate: its en-GB format writes September as "Sept", which
 * breaks the three-letter rhythm of the Created column.
 */
const formatDay = (timestamp: number): string => {
  const parts = Object.fromEntries(
    dateParts
      .formatToParts(new Date(timestamp * 1000))
      .map((part) => [part.type, part.value]),
  )
  return `${parts.day} ${parts.month} ${parts.year}`
}

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--status-registered) 55%, transparent); }
  70% { box-shadow: 0 0 0 8px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`

const displayFigure = css`
  color: var(--color-text);
  font-family: var(--font-figure);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
`

const ellipsis = css`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ---------- Header ---------- */

const Header = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px 32px;

  > * {
    ${reveal}
  }
`

const Title = styled.h1`
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(36px, 1.6vw + 24px, 48px);
  line-height: 1;
  font-weight: 500;
  letter-spacing: -0.035em;
`

const Lede = styled.p`
  margin: 12px 0 0;
  color: var(--color-muted);
  font-size: var(--fs-subheading);
  line-height: 24px;
`

const LivePill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  height: 32px;
  padding: 0 14px 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  color: var(--color-muted);
  font-size: var(--fs-small);
  font-weight: 500;
  white-space: nowrap;

  b {
    color: var(--color-primary);
    font-weight: 500;
  }
`

/** The pulsing dot: only while the data is present and the last fetch worked. */
const Pulse = styled.i`
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: var(--radius-pill);
  background: var(--status-registered);
  animation: ${pulse} 2.4s infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/* ---------- Figures ---------- */

/*
 * One panel: the verified share as a ring (the same gauge the home page draws
 * for it), the verified count as the hero figure, then a strip of the other
 * counts. Every figure appears once.
 */
const FiguresPanel = styled(Surface)`
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 24px 36px;
  margin-top: 28px;
  padding: 22px 28px;
  ${reveal}

  @media (max-width: 1100px) {
    grid-template-columns: auto minmax(0, 1fr);
  }

  @media (max-width: 720px) {
    gap: 18px 16px;
    padding: 18px 16px;
  }
`

const GaugeSlot = styled.div`
  display: flex;
  width: 148px;

  @media (max-width: 720px) {
    width: 118px;
  }
`

const HeroFigure = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
`

const Big = styled.span`
  ${displayFigure}
  font-size: clamp(48px, 2.4vw + 28px, 68px);
  line-height: 0.95;
  letter-spacing: -0.04em;
`

const Caption = styled.span`
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

/** The other counts as a strip, split by hairlines; it takes the free width. */
const InlineStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));

  @media (max-width: 1100px) {
    grid-column: 1 / -1;
    padding-top: 18px;
    border-top: 1px solid var(--glass-border);
  }
`

/* Label on top, figure at the bottom: the figures share a baseline even when
   a label wraps at phone width. */
const InlineStat = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  min-height: 64px;
  padding: 0 24px;
  border-left: 1px solid var(--glass-border);

  b {
    ${displayFigure}
    font-size: 28px;
    line-height: 30px;
  }

  @media (max-width: 1100px) {
    min-height: 0;

    &:first-child {
      padding-left: 0;
      border-left: 0;
    }
  }

  @media (max-width: 720px) {
    padding: 0 12px;

    b {
      font-size: 20px;
      line-height: 24px;
    }
  }
`

/* ---------- Layout ---------- */

const Split = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 24px;
  align-items: start;
  margin-top: 40px;

  @media (max-width: 1240px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const Explorer = styled.section`
  min-width: 0;
  ${reveal}
`

/* ---------- Toolbar ---------- */

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;

  /* The search takes its own line when the column is too narrow for one row. */
  @media (min-width: 1241px) and (max-width: 1400px), (max-width: 900px) {
    > label:first-child {
      flex-basis: 100%;
    }
  }

  /* On a phone the layout switch rides next to the trust control. */
  @media (max-width: 600px) {
    > [role='radiogroup'][aria-label='Layout'] {
      order: 1;
    }

    > [role='group'],
    > label:last-of-type {
      order: 2;
    }
  }
`

const Search = styled(SearchField)`
  flex: 1 1 170px;
  height: 38px;
  padding: 0 6px 0 14px;
  border-radius: var(--radius);

  input {
    width: 0;
    font-size: var(--fs-small);
  }

  /* The field itself shows focus (primary border and ring). */
  input:focus-visible {
    outline: none;
  }
`

const ClearButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-faint);
  cursor: pointer;
  transition:
    background var(--motion),
    color var(--motion);

  &:hover {
    background: var(--color-surface);
    color: var(--color-text);
  }
`

const Track = styled.div`
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 38px;
  padding: 3px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
`

const Toggle = styled.button<{ $on?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius-sm);
  background: ${({ $on }) =>
    $on ? 'var(--color-primary-soft)' : 'transparent'};
  box-shadow: ${({ $on }) =>
    $on
      ? 'inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 30%, transparent)'
      : 'none'};
  color: ${({ $on }) => ($on ? 'var(--color-text)' : 'var(--color-muted)')};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--motion),
    box-shadow var(--motion),
    color var(--motion);

  &:hover {
    color: var(--color-text);
  }
`

const SortField = styled.label`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: var(--color-faint);
  transition: border-color var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus-within {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 4px var(--color-primary-soft);
  }

  select:focus-visible {
    outline: none;
  }

  select {
    appearance: none;
    height: 100%;
    padding-right: 18px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-text);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
    font-weight: 500;
    cursor: pointer;
  }

  select option {
    background: var(--color-surface);
    color: var(--color-text);
  }

  > svg:last-child {
    position: absolute;
    right: 10px;
    pointer-events: none;
  }
`

const LayoutTrack = styled(Track)`
  margin-left: auto;

  @media (max-width: 520px) {
    margin-left: 0;
  }
`

const LayoutPill = styled.span`
  position: absolute;
  top: 3px;
  left: 3px;
  z-index: -1;
  width: 34px;
  height: 30px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--color-primary) 30%, transparent);
  transition: transform var(--dur-control) var(--ease-spring);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const LayoutButton = styled.button<{ $on?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 30px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: ${({ $on }) => ($on ? 'var(--color-text)' : 'var(--color-faint)')};
  cursor: pointer;
  transition: color var(--motion);

  &:hover {
    color: var(--color-text);
  }
`

const Notice = styled.p`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 14px;
  padding: 10px 14px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);

  svg {
    flex: 0 0 auto;
    color: var(--status-contested);
  }
`

/* ---------- Registry identity ---------- */

const Logo = styled.span<{ $size: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border: 1px solid var(--glass-border);
  border-radius: ${({ $size }) =>
    $size >= 40 ? 'var(--radius)' : 'var(--radius-sm)'};
  background: var(--color-raised);
  color: var(--color-faint);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`

const Name = styled.span`
  ${ellipsis}
  color: var(--color-text);
  font-size: var(--fs-body-lg);
  line-height: 20px;
  font-weight: 500;
  letter-spacing: -0.005em;
  transition: color var(--motion);
`

const Meta = styled.span`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  margin-top: 6px;
`

/** Why a search matched: the description, else the address. */
const Blurb = styled.span`
  ${ellipsis}
  flex: 1 1 auto;
  min-width: 0;
  margin-left: 4px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);

  code {
    font-family: var(--font-mono);
    font-size: 12px;
  }
`

const Created = styled.span`
  color: var(--color-faint);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
`

/** Rows: the chips, then the description (or the address) on the same line. */
const RowMeta = styled(Meta)`
  flex-wrap: nowrap;

  > :not(${Blurb}) {
    flex: 0 0 auto;
  }
`

/* ---------- Rows ---------- */

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const RowLink = styled(Link)`
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 112px 112px 92px 16px;
  grid-template-areas: 'logo id entries open court go';
  align-items: center;
  column-gap: 16px;
  min-height: 78px;
  padding: 14px 18px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
  color: inherit;
  text-decoration: none;
  /* The lift uses translate, not transform: the entrance animation keeps its
     final transform applied (fill-mode both), which would cancel it. */
  transition:
    border-color var(--motion),
    background var(--motion),
    translate var(--motion);
  ${reveal}

  &:hover {
    border-color: var(--color-border-strong);
    background: var(--color-raised);
    translate: 0 -1px;
  }

  &:hover ${Name} {
    color: var(--color-primary);
  }

  &:hover [data-go] {
    color: var(--color-primary);
    transform: translateX(2px);
  }

  @media (max-width: 760px) {
    grid-template-columns: 40px minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
    grid-template-areas:
      'logo id id id'
      'entries entries open court';
    row-gap: 14px;
    column-gap: 12px;
    padding: 14px;
  }
`

const RowId = styled.span`
  grid-area: id;
  min-width: 0;
`

const RowStat = styled.span<{ $area: string }>`
  grid-area: ${({ $area }) => $area};
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  min-width: 0;
  text-align: right;

  @media (max-width: 760px) {
    align-items: flex-start;
    text-align: left;
  }
`

const StatValue = styled.span<{ $large?: boolean; $zero?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  ${displayFigure}
  font-size: ${({ $large }) => ($large ? '24px' : '18px')};
  line-height: ${({ $large }) => ($large ? '26px' : '22px')};
  /* Zeros recede so the lists with something going on stand out. */
  color: ${({ $zero }) => ($zero ? 'var(--color-faint)' : 'var(--color-text)')};
`

const StatLabel = styled.span`
  color: var(--color-faint);
  font-size: 12px;
  line-height: 16px;
  white-space: nowrap;
`

const Go = styled.span`
  grid-area: go;
  display: inline-flex;
  color: var(--color-faint);
  transition:
    color var(--motion),
    transform var(--motion);

  @media (max-width: 760px) {
    display: none;
  }
`

/* ---------- Cards ---------- */

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
`

const CardLink = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 220px;
  padding: 18px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--motion),
    background var(--motion),
    translate var(--motion);
  ${reveal}

  &:hover {
    border-color: var(--color-border-strong);
    background: var(--color-raised);
    translate: 0 -2px;
  }

  &:hover ${Name} {
    color: var(--color-primary);
  }
`

const CardTop = styled.span`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const CardDescription = styled.span`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const CardStats = styled.span`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid var(--glass-border);

  > span {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
`

/** "71 Open requests" over "0 In court", right-aligned. */
const CardSide = styled.span`
  align-items: flex-end;

  > span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-faint);
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
  }

  b {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    ${displayFigure}
    font-size: var(--fs-body);
  }

  b[data-zero='true'] {
    color: var(--color-faint);
  }
`

/* ---------- Table ---------- */

const TableName = styled(Link)`
  ${ellipsis}
  color: var(--color-text);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    color: var(--color-primary);
  }
`

/** The registry column takes the free width and lets its text ellipsize. */
const RegistryCell = styled.td`
  width: 100%;
  max-width: 0;
`

const IdentityCell = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`

const SubLine = styled.span`
  ${ellipsis}
  min-width: 0;
  color: var(--color-faint);
  font-size: 12px;
  line-height: 16px;

  code {
    font-family: var(--font-mono);
    font-size: 12px;
  }
`

const CourtCell = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
`

/* ---------- Footer ---------- */

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
`

/* ---------- Rail ---------- */

const Rail = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;

  /* Under the list, the two panels sit side by side until phone width. */
  @media (min-width: 761px) and (max-width: 1240px) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
  }

  > * {
    ${reveal}
  }
`

const RailTitle = styled.h2`
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 24px;
  font-weight: 500;
  letter-spacing: -0.02em;
`

const RailHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
`

const VerifyLinks = styled.div`
  display: flex;
  flex-direction: column;
  margin-top: 14px;
  border-top: 1px solid var(--glass-border);
`

const VerifyLink = styled(Link)`
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  height: 46px;
  border-bottom: 1px solid var(--glass-border);
  color: var(--color-text);
  font-size: var(--fs-body);
  font-weight: 500;
  text-decoration: none;

  &:last-child {
    border-bottom: 0;
  }

  span:last-child {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-primary);
    font-size: var(--fs-small);
    transition: transform var(--motion);
  }

  &:hover span:last-child {
    transform: translateX(2px);
  }
`

const Feed = styled.ol`
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
`

const FeedItem = styled.li`
  position: relative;

  /* A hairline strings each dot to the next one. */
  &:not(:last-child)::before {
    content: '';
    position: absolute;
    top: 26px;
    bottom: -8px;
    left: 3.5px;
    width: 1px;
    background: var(--glass-border);
  }

  a {
    display: grid;
    grid-template-columns: 8px minmax(0, 1fr) auto;
    align-items: start;
    gap: 14px;
    padding: 12px 0;
    color: inherit;
    text-decoration: none;
  }

  a > span:first-child {
    margin-top: 5px;
  }

  a:hover strong {
    color: var(--color-primary);
  }

  strong {
    ${ellipsis}
    color: var(--color-text);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
    font-weight: 500;
    transition: color var(--motion);
  }

  em {
    ${ellipsis}
    margin-top: 2px;
    color: var(--color-muted);
    font-size: 12px;
    font-style: normal;
    line-height: 16px;
  }

  em code {
    font-family: var(--font-mono);
  }

  time {
    flex: 0 0 auto;
    color: var(--color-faint);
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;
  }

  small {
    ${ellipsis}
    margin-top: 2px;
    color: var(--color-faint);
    font-size: 12px;
    line-height: 16px;
  }
`

/** The item's first field; CAIP-10 values read as "0x94bA…8a2f · Robinhood Chain". */
const Identifier = ({ label, value }: { label: string; value: string }) => {
  const rich = parseRichAddress(value)
  return (
    <em title={`${label}: ${value}`}>
      {rich ? (
        <>
          <code>{truncateMiddle(rich.address)}</code> · {rich.reference.name}
        </>
      ) : (
        value
      )}
    </em>
  )
}

const FeedHead = styled.span`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
`

/** Read by screen readers, not shown. */
const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

/* ---------- Pieces ---------- */

/** Registry logo from its metadata, falling back to the registry icon. */
const RegistryLogo = ({
  registry,
  size = 44,
}: {
  registry: DashboardRegistry
  size?: number
}) => {
  const [failed, setFailed] = useState(false)
  const image = mediaUrl(registry.logoURI)
  return (
    <Logo $size={size} aria-hidden style={{ gridArea: 'logo' }}>
      {image && !failed ? (
        <img src={image} alt="" onError={() => setFailed(true)} />
      ) : (
        <CurateIcon name="registry" size={Math.round(size * 0.42)} />
      )}
    </Logo>
  )
}

const STAKE_PENDING_TITLE =
  'Stake lists report the entries currently listed, not open requests'

/** Open requests, or for Stake lists the entries currently listed. */
const pendingTitle = (registry: DashboardRegistry) =>
  registry.kind === 'permanent' ? STAKE_PENDING_TITLE : undefined

/** "In court" with an amber haloed dot when something is in court. */
const CourtValue = ({ count }: { count: number }) => (
  <>
    {count > 0 && <StatusDot $tone="contested" aria-hidden />}
    {formatInt(count)}
  </>
)

const CreatedOn = ({ timestamp }: { timestamp: number }) => (
  <Created title={formatAbsolute(timestamp)}>
    Created {formatDay(timestamp)}
  </Created>
)

const SortIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
    <g
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4v16" />
      <path d="m3.5 16.5 3.5 3.5 3.5-3.5" />
      <path d="M17 20V4" />
      <path d="m13.5 7.5 3.5-3.5 3.5 3.5" />
    </g>
  </svg>
)

const ArrowIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
    <g
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </g>
  </svg>
)

/** Table, cards or rows as icon buttons with a sliding pill. */
const LayoutSwitch = ({
  value,
  onChange,
}: {
  value: ListLayout
  onChange: (layout: ListLayout) => void
}) => {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])
  const index = Math.max(
    0,
    LAYOUT_OPTIONS.findIndex((option) => option.value === value),
  )
  // Radio group keyboard model: one tab stop, arrows move and select.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const last = LAYOUT_OPTIONS.length - 1
    const next =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? index === last
          ? 0
          : index + 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? index === 0
            ? last
            : index - 1
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : -1
    if (next < 0) return
    event.preventDefault()
    onChange(LAYOUT_OPTIONS[next].value)
    buttons.current[next]?.focus()
  }
  return (
    <LayoutTrack role="radiogroup" aria-label="Layout" onKeyDown={onKeyDown}>
      <LayoutPill
        aria-hidden
        style={{ transform: `translateX(${index * 36}px)` }}
      />
      {LAYOUT_OPTIONS.map((option, position) => {
        const checked = option.value === value
        return (
          <LayoutButton
            key={option.value}
            ref={(node) => {
              buttons.current[position] = node
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.label}
            title={option.label}
            tabIndex={checked ? 0 : -1}
            $on={checked}
            onClick={() => onChange(option.value)}
          >
            <CurateIcon name={option.icon} size={16} />
          </LayoutButton>
        )
      })}
    </LayoutTrack>
  )
}

type Freshness = 'live' | 'stale' | 'connecting' | 'down'

const FRESHNESS_TONE: Record<Exclude<Freshness, 'live'>, StatusTone> = {
  stale: 'contested',
  connecting: 'neutral',
  down: 'off',
}

/**
 * The data's state, said plainly: a pulsing "Live" only while the figures are
 * loaded and the last fetch worked; a still dot otherwise.
 */
const FreshnessPill = ({
  state,
  updatedAt,
  now,
  index,
}: {
  state: Freshness
  updatedAt?: number
  now: number
  index: number
}) => {
  const ago = updatedAt ? `Updated ${formatAgo(updatedAt, now)}` : ''
  return (
    <LivePill style={{ ['--i' as string]: index }}>
      {state === 'live' ? (
        <Pulse aria-hidden />
      ) : (
        <StatusDot $tone={FRESHNESS_TONE[state]} aria-hidden />
      )}
      {state === 'live' && <b>Live</b>}
      {state === 'live'
        ? ago
        : state === 'stale'
          ? `${ago} · last refresh failed`
          : state === 'connecting'
            ? 'Connecting to the indexers'
            : 'Indexers not answering'}
    </LivePill>
  )
}

/* ---------- Page ---------- */

const BrowsePage = () => {
  useDocumentHead(
    'Browse registries | Kleros Curate',
    'Browse Kleros Verified and discovery Curate registries across Ethereum, Gnosis and Sepolia.',
  )
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const chainParam = searchParams.get('chain')
  const chains = useMemo(() => parseChains(chainParam), [chainParam])
  const trust = parseTrust(searchParams.get('trust'))
  const kindParam = searchParams.get('kind')
  const kinds = useMemo(() => parseKinds(kindParam), [kindParam])
  const sort = parseSort(searchParams.get('sort'))
  const search = searchParams.get('q') || ''
  const requestedPage = parsePage(searchParams.get('page'))
  const [layout, setLayout] = useStoredLayout('browse', 'rows')
  const now = useNow(30_000)

  const query = useQuery({
    queryKey: ['curateDashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
  const data = query.data

  // Real creation blocks (factory NewGTCR events), cached once read. Until
  // they arrive the dashboard data already carries whatever was cached.
  const creation = useQuery({
    queryKey: ['registryCreationTimes'],
    queryFn: () => fetchRegistryCreationTimes(SUPPORTED_CHAIN_IDS),
    staleTime: 10 * 60_000,
  })

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    setSearchParams(next, { replace: true })
  }

  // Any filter change returns to the first page, including changes made
  // elsewhere (the app bar's chain chip, back and forward navigation).
  const filterKey = `${chainParam ?? ''}|${trust}|${kindParam ?? ''}|${sort}|${search}`
  const lastFilterKey = useRef(filterKey)
  useEffect(() => {
    if (lastFilterKey.current === filterKey) return
    lastFilterKey.current = filterKey
    if (!searchParams.get('page')) return
    const next = new URLSearchParams(searchParams)
    next.delete('page')
    setSearchParams(next, { replace: true })
  }, [filterKey, searchParams, setSearchParams])

  // Old links carried the layout in the URL (?view=list or ?view=cards). The
  // layout is now remembered per device, so adopt it once and drop the param.
  useEffect(() => {
    const view = searchParams.get('view')
    if (view === null) return
    if (view === 'list') setLayout('rows')
    else if (view === 'cards') setLayout('cards')
    const next = new URLSearchParams(searchParams)
    next.delete('view')
    setSearchParams(next, { replace: true })
  }, [searchParams, setLayout, setSearchParams])

  const registries = useMemo(
    () =>
      data
        ? sortRegistries(
            filterRegistries(
              creation.data
                ? applyCreationTimes(data.registries, creation.data)
                : data.registries,
              { chains, trust, kinds, search },
            ),
            sort,
          )
        : [],
    [data, creation.data, chains, trust, kinds, search, sort],
  )
  const pageCount = Math.max(1, Math.ceil(registries.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, pageCount)
  const visible = registries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const figures = useMemo(
    () => summarize(data?.registries ?? [], chains),
    [data, chains],
  )

  const latest = useMemo(
    () =>
      (data?.activities ?? [])
        .filter(
          (activity) =>
            chains.length === 0 || chains.includes(activity.chainId),
        )
        .slice(0, 5),
    [data, chains],
  )

  const verificationChains =
    chains.length === 1 && VERIFICATION_CHAIN_IDS.includes(chains[0])
      ? chains
      : VERIFICATION_CHAIN_IDS
  const scope = scopeText(chains)
  const showCreated = sort === 'recent-creation'

  const loading = query.isLoading || (!data && !query.isError)
  // fetchDashboardData swallows indexer errors and answers with empty lists,
  // so an answer without a single registry means the indexers did not answer
  // (every supported chain has registries, its list of lists at least).
  const unanswered = !!data && data.registries.length === 0
  const failed = (query.isError && !data) || unanswered
  const freshness: Freshness =
    data && !unanswered
      ? query.isError
        ? 'stale'
        : 'live'
      : failed
        ? 'down'
        : 'connecting'
  const registryTotal = figures.verified + figures.discovery

  const clearFilters = () =>
    setParam({ q: null, trust: null, kind: null, chain: null, page: null })

  return (
    <Page>
      <Header>
        <div style={{ ['--i' as string]: 0 }}>
          <Title>Registries</Title>
          <Lede>Every Curate list on {scope}.</Lede>
        </div>
        <FreshnessPill
          state={freshness}
          updatedAt={data ? Math.floor(data.generatedAt / 1000) : undefined}
          now={now}
          index={1}
        />
      </Header>

      <FiguresPanel
        as="section"
        $featured
        $padding="none"
        aria-labelledby="browse-figures-title"
        style={{ ['--i' as string]: 2 }}
      >
        <VisuallyHidden as="h2" id="browse-figures-title">
          Registry figures for {scope}
        </VisuallyHidden>
        {failed ? (
          <Small $muted style={{ gridColumn: '1 / -1' }}>
            No figures until the indexers answer.
          </Small>
        ) : (
          <>
            <GaugeSlot>
              {loading ? (
                <SkeletonBlock
                  $width="100%"
                  $height="auto"
                  style={{ aspectRatio: '1', borderRadius: '50%' }}
                />
              ) : (
                <RingGauge
                  key={chainParam ?? 'all'}
                  size={148}
                  ratio={registryTotal ? figures.verified / registryTotal : 0}
                  from="var(--status-registered)"
                  to="var(--aurora-b)"
                  label={`Verified share: ${formatInt(figures.verified)} of ${formatInt(registryTotal)} registries on ${scope} are on the Kleros Verified list of lists`}
                  caption="verified"
                />
              )}
            </GaugeSlot>
            <HeroFigure>
              <Label $tone="faint">Verified registries</Label>
              <Big>{loading ? '—' : <Odometer value={figures.verified} />}</Big>
              <Caption>
                {loading ? '—' : shareCaption(registryTotal, chains)}
              </Caption>
            </HeroFigure>
            <InlineStats>
              {[
                { label: 'Discovery', value: figures.discovery },
                { label: 'Entries', value: figures.entries },
                { label: 'Open requests', value: figures.openRequests },
              ].map((figure) => (
                <InlineStat key={figure.label}>
                  <Label $tone="faint">{figure.label}</Label>
                  <b>
                    <AnimatedNumber
                      value={loading ? undefined : figure.value}
                    />
                  </b>
                </InlineStat>
              ))}
            </InlineStats>
          </>
        )}
      </FiguresPanel>

      <Split>
        <Explorer
          aria-labelledby="browse-explorer-title"
          style={{ ['--i' as string]: 3 }}
        >
          <VisuallyHidden as="h2" id="browse-explorer-title">
            Registry list
          </VisuallyHidden>
          <Toolbar>
            <Search>
              <CurateIcon name="search" size={16} />
              <input
                aria-label="Search registries"
                placeholder="Search name, address or chain"
                value={search}
                onChange={(event) =>
                  setParam({
                    q: event.currentTarget.value || null,
                    page: null,
                  })
                }
              />
              {search && (
                <ClearButton
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setParam({ q: null, page: null })}
                >
                  <CurateIcon name="close" size={14} />
                </ClearButton>
              )}
            </Search>
            <SegmentedControl<TrustMode>
              ariaLabel="Trust"
              value={trust}
              onChange={(value) =>
                setParam({
                  trust: value === 'verified' ? null : value,
                  page: null,
                })
              }
              options={[
                { value: 'verified', label: 'Verified' },
                { value: 'unverified', label: 'Discovery' },
              ]}
            />
            <Track role="group" aria-label="Registry type">
              {KIND_OPTIONS.map((option) => {
                const selected = kinds.includes(option.value)
                return (
                  <Toggle
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    $on={selected}
                    onClick={() =>
                      setParam({
                        kind: toggleKind(kinds, option.value).join(',') || null,
                        page: null,
                      })
                    }
                  >
                    {option.label}
                  </Toggle>
                )
              })}
            </Track>
            <SortField>
              <SortIcon />
              <select
                aria-label="Sort registries"
                value={sort}
                onChange={(event) =>
                  setParam({
                    sort:
                      event.currentTarget.value === 'recent-submission'
                        ? null
                        : event.currentTarget.value,
                    page: null,
                  })
                }
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <CurateIcon name="chevron-down" size={14} />
            </SortField>
            <LayoutSwitch value={layout} onChange={setLayout} />
          </Toolbar>

          {trust === 'unverified' && (
            <Notice>
              <CurateIcon name="shield" size={16} />
              Discovery registries are not on the Kleros Verified list of lists.
              Read a list&apos;s policy before you act on it.
            </Notice>
          )}

          {loading ? (
            <List aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  $height="78px"
                  style={{ borderRadius: 'var(--radius)' }}
                />
              ))}
            </List>
          ) : failed ? (
            <Surface $padding="none">
              <EmptyState
                icon="registry"
                title="Registries could not be loaded"
                action={
                  <Button
                    type="button"
                    $variant="secondary"
                    $size="sm"
                    onClick={() => query.refetch()}
                  >
                    Try again
                  </Button>
                }
              >
                The indexers did not answer. Check your connection and try
                again.
              </EmptyState>
            </Surface>
          ) : registries.length === 0 ? (
            <Surface $padding="none">
              <EmptyState
                icon="filter"
                title="No registries match"
                action={
                  <Button
                    type="button"
                    $variant="secondary"
                    $size="sm"
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                }
              >
                Change the search, chain, type or trust filter.
              </EmptyState>
            </Surface>
          ) : layout === 'table' ? (
            <TableScroller>
              <Table>
                <thead>
                  <tr>
                    <th>Registry</th>
                    {showCreated ? <th>Created</th> : <th>Chain</th>}
                    <th className="num">Entries</th>
                    <th className="num">Open requests</th>
                    <th className="num">In court</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((registry) => {
                    const created = shownCreation(registry, sort)
                    return (
                      <tr
                        key={registry.id}
                        data-href={registryHref(registry)}
                        onClick={() => navigate(registryHref(registry))}
                      >
                        <RegistryCell>
                          <IdentityCell>
                            <RegistryLogo registry={registry} size={34} />
                            <div style={{ minWidth: 0 }}>
                              <TableName
                                to={registryHref(registry)}
                                onClick={(event) => event.stopPropagation()}
                              >
                                {registry.title}
                              </TableName>
                              <SubLine>
                                {kindLabel(registry.kind)}
                                {/* With the Created column the chain rides here. */}
                                {showCreated &&
                                  ` · ${chainName(registry.chainId)}`}
                                {' · '}
                                <code>{truncateMiddle(registry.address)}</code>
                              </SubLine>
                            </div>
                          </IdentityCell>
                        </RegistryCell>
                        {showCreated ? (
                          <td>
                            {created ? (
                              <Small
                                $muted
                                title={formatAbsolute(created)}
                                style={{ whiteSpace: 'nowrap' }}
                              >
                                {formatDay(created)}
                              </Small>
                            ) : (
                              <Small $faint>—</Small>
                            )}
                          </td>
                        ) : (
                          <td>
                            <ChainChip chainId={registry.chainId} size="sm" />
                          </td>
                        )}
                        <td className="num">
                          {formatInt(entryCount(registry))}
                        </td>
                        <td
                          className="num"
                          title={pendingTitle(registry)}
                          style={{ whiteSpace: 'nowrap' }}
                        >
                          {formatInt(registry.pendingCount)}
                          {registry.kind === 'permanent' && (
                            <Small $faint> listed</Small>
                          )}
                        </td>
                        <td className="num">
                          <CourtCell>
                            <CourtValue count={registry.disputeCount} />
                          </CourtCell>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableScroller>
          ) : layout === 'cards' ? (
            <CardGrid>
              {visible.map((registry, index) => {
                const created = shownCreation(registry, sort)
                return (
                  <CardLink
                    key={registry.id}
                    to={registryHref(registry)}
                    style={{ ['--i' as string]: Math.min(index, 12) }}
                  >
                    <CardTop>
                      <RegistryLogo registry={registry} size={40} />
                      <span style={{ minWidth: 0 }}>
                        <Name>{registry.title}</Name>
                        <SubLine>
                          {kindLabel(registry.kind)}
                          {created && (
                            <>
                              {' · '}
                              <CreatedOn timestamp={created} />
                            </>
                          )}
                        </SubLine>
                      </span>
                    </CardTop>
                    <CardDescription>
                      {registry.description ||
                        `${kindLabel(registry.kind)} registry at ${truncateMiddle(registry.address)}`}
                    </CardDescription>
                    <Meta style={{ marginTop: 0 }}>
                      <ChainChip chainId={registry.chainId} size="sm" />
                    </Meta>
                    <CardStats>
                      <span>
                        <StatValue $large $zero={entryCount(registry) === 0}>
                          {formatInt(entryCount(registry))}
                        </StatValue>
                        <StatLabel>Entries</StatLabel>
                      </span>
                      <CardSide>
                        <span title={pendingTitle(registry)}>
                          <b data-zero={registry.pendingCount === 0}>
                            {formatInt(registry.pendingCount)}
                          </b>
                          {pendingLabel(registry.kind)}
                        </span>
                        <span>
                          <b data-zero={registry.disputeCount === 0}>
                            <CourtValue count={registry.disputeCount} />
                          </b>
                          In court
                        </span>
                      </CardSide>
                    </CardStats>
                  </CardLink>
                )
              })}
            </CardGrid>
          ) : (
            <List>
              {visible.map((registry, index) => {
                const created = shownCreation(registry, sort)
                return (
                  <RowLink
                    key={registry.id}
                    to={registryHref(registry)}
                    title={`${registry.title} · ${registry.address}`}
                    style={{ ['--i' as string]: Math.min(index, 12) }}
                  >
                    <RegistryLogo registry={registry} />
                    <RowId>
                      <Name>{registry.title}</Name>
                      <RowMeta>
                        <Chip>{kindLabel(registry.kind)}</Chip>
                        <ChainChip chainId={registry.chainId} size="sm" />
                        {created && <CreatedOn timestamp={created} />}
                        <Blurb>
                          {registry.description || (
                            <code>{truncateMiddle(registry.address)}</code>
                          )}
                        </Blurb>
                      </RowMeta>
                    </RowId>
                    <RowStat $area="entries">
                      <StatValue $large $zero={entryCount(registry) === 0}>
                        {formatInt(entryCount(registry))}
                      </StatValue>
                      <StatLabel>Entries</StatLabel>
                    </RowStat>
                    <RowStat $area="open" title={pendingTitle(registry)}>
                      <StatValue $zero={registry.pendingCount === 0}>
                        {formatInt(registry.pendingCount)}
                      </StatValue>
                      <StatLabel>{pendingLabel(registry.kind)}</StatLabel>
                    </RowStat>
                    <RowStat $area="court">
                      <StatValue $zero={registry.disputeCount === 0}>
                        <CourtValue count={registry.disputeCount} />
                      </StatValue>
                      <StatLabel>In court</StatLabel>
                    </RowStat>
                    <Go data-go aria-hidden>
                      <ArrowIcon />
                    </Go>
                  </RowLink>
                )
              })}
            </List>
          )}

          {!loading && !failed && registries.length > 0 && (
            <Footer>
              <Small $muted>
                {formatInt((currentPage - 1) * PAGE_SIZE + 1)}–
                {formatInt(
                  Math.min(currentPage * PAGE_SIZE, registries.length),
                )}{' '}
                of {formatInt(registries.length)}{' '}
                {trust === 'verified' ? 'verified' : 'discovery'} registries
              </Small>
              {registries.length > PAGE_SIZE && (
                <Pagination
                  current={currentPage}
                  pageSize={PAGE_SIZE}
                  total={registries.length}
                  onChange={(page: number) =>
                    setParam({ page: page === 1 ? null : String(page) })
                  }
                />
              )}
            </Footer>
          )}
        </Explorer>

        <Rail aria-label="Verification and activity">
          <Surface
            as="section"
            $padding="standard"
            aria-labelledby="browse-verify-title"
            style={{ ['--i' as string]: 4 }}
          >
            <RailTitle id="browse-verify-title">
              Get a registry verified
            </RailTitle>
            <Small $muted as="p" style={{ margin: '6px 0 0' }}>
              Submit it to the Kleros Verified list of lists for its chain.
            </Small>
            <VerifyLinks>
              {verificationChains.map((chainId) => {
                const href = verificationHref(chainId)
                return href ? (
                  <VerifyLink
                    key={chainId}
                    to={href}
                    aria-label={`Submit a registry on ${chainName(chainId)}`}
                  >
                    <ChainLogo chainId={chainId} size={20} />
                    <span>{chainName(chainId)}</span>
                    <span>
                      Submit <ArrowIcon size={14} />
                    </span>
                  </VerifyLink>
                ) : null
              })}
            </VerifyLinks>
          </Surface>

          <Surface
            as="section"
            $padding="standard"
            aria-labelledby="browse-activity-title"
            style={{ ['--i' as string]: 5 }}
          >
            <RailHead>
              <RailTitle id="browse-activity-title">Recent activity</RailTitle>
              <Label $tone="faint">Latest 5</Label>
            </RailHead>
            {loading ? (
              <SkeletonBlock $height="220px" style={{ marginTop: 10 }} />
            ) : failed ? (
              <Small $muted>No activity until the indexers answer.</Small>
            ) : latest.length === 0 ? (
              <Small $muted>No recent requests in this scope.</Small>
            ) : (
              <Feed>
                {latest.map((activity) => (
                  <FeedItem key={activity.id}>
                    <Link to={activity.href}>
                      <StatusDot $tone={activityTone(activity)} aria-hidden />
                      <span style={{ minWidth: 0 }}>
                        <FeedHead>
                          <strong>{activity.status}</strong>
                          <time
                            dateTime={new Date(
                              activity.timestamp * 1000,
                            ).toISOString()}
                            title={formatAbsolute(activity.timestamp)}
                          >
                            {formatAgo(activity.timestamp, now)}
                          </time>
                        </FeedHead>
                        {activity.previewProps?.[0]?.value && (
                          <Identifier
                            label={activity.previewProps[0].label}
                            value={activity.previewProps[0].value}
                          />
                        )}
                        <small>{activity.registryTitle}</small>
                      </span>
                      <span title={chainName(activity.chainId)}>
                        <ChainLogo chainId={activity.chainId} size={18} />
                        <VisuallyHidden>
                          {chainName(activity.chainId)}
                        </VisuallyHidden>
                      </span>
                    </Link>
                  </FeedItem>
                ))}
              </Feed>
            )}
          </Surface>
        </Rail>
      </Split>
    </Page>
  )
}

export default BrowsePage
