import React, { useId, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { Link } from 'react-router-dom'
import {
  ChainChip,
  Label,
  Mono,
  Rail,
  Small,
  StatusDot,
  Surface,
  VisuallyHidden,
} from 'components/curate/primitives'
import { CurateIcon } from 'components/curate/icons'
import { formatEther } from 'components/curate/item-light-format'
import { reveal } from 'components/curate/motion/reveal'
import { getNativeCurrency } from 'config/chains'
import { parseRichAddress } from 'utils/rich-address'
import {
  formatAbsolute,
  formatAgo,
  formatTimeLeft,
  windowProgress,
} from 'utils/time'
import type { DashboardCard } from './view'

/*
 * Happening now: two boxes in the page's scope.
 *  - Open for verification: requests nobody has challenged whose challenge
 *    window is still open, closing soonest first. Each row shows its bounty
 *    (the submitter's deposit, which a winning challenger takes), how much
 *    of its window has run and the time left to challenge it.
 *  - Disputes: the ones in court now first, outlined and with a slow
 *    pulse, then the rulings of the last 30 days, quieter.
 */

/** Rows each group shows before "+n more". */
const OPEN_LIMIT = 6
const LIVE_LIMIT = 3
const DECIDED_LIMIT = 4

const integer = new Intl.NumberFormat('en-US')
const formatInt = (value: number) => integer.format(value)

/** "3,870 xDAI", "0.00005 ETH": full precision, grouped. */
const formatCoin = (wei: bigint | string, chainId: number): string => {
  const [whole, fraction] = formatEther(wei.toString()).split('.')
  return `${integer.format(BigInt(whole))}${fraction ? `.${fraction}` : ''} ${
    getNativeCurrency(chainId).symbol
  }`
}

/** CAIP-10 values read as "0x94bA…8a2f · Robinhood Chain"; others pass through. */
const readableIdentifier = (value: string): string => {
  const rich = parseRichAddress(value)
  if (!rich) return value
  const short =
    rich.address.length > 14
      ? `${rich.address.slice(0, 6)}…${rich.address.slice(-4)}`
      : rich.address
  return `${short} · ${rich.reference.name}`
}

const beat = keyframes`
  0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--status-contested) 60%, transparent); }
  70% { box-shadow: 0 0 0 7px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
`

const breathe = keyframes`
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
`

const Board = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

const Panel = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 8px;
  ${reveal}
`

const PanelHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px 16px;
  padding: 2px 2px 12px;
`

const Heading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const TitleRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const PanelTitle = styled.h3`
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-label);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
`

const Count = styled.span<{ $quiet?: boolean }>`
  color: ${({ $quiet }) =>
    $quiet ? 'var(--color-muted)' : 'var(--color-text)'};
  font-family: var(--font-figure);
  font-size: ${({ $quiet }) => ($quiet ? '20px' : '28px')};
  line-height: 1;
  font-weight: 500;
  letter-spacing: var(--tracking-display);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const Tally = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 18px;
  flex: 0 0 auto;

  > span {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
  }

  /* Phones: the tally wraps under the title and reads from the left. */
  @media (max-width: 520px) {
    > span {
      align-items: flex-start;
    }
  }
`

/* A neutral line while the challenge windows are read again. */
const Checking = styled(Small).attrs({ $muted: true })`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--status-window);
    animation: ${breathe} 1.4s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`

const rowBase = css`
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 4px;
  align-items: center;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: var(--color-raised);
  color: inherit;
  text-decoration: none;
  transition:
    background var(--motion),
    box-shadow var(--motion),
    transform var(--motion);

  &:hover {
    background: color-mix(in srgb, var(--color-raised), var(--color-text) 5%);
    box-shadow: inset 0 0 0 1px var(--glass-border);
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      transform: none;
    }
  }
`

const Row = styled(Link)`
  ${rowBase}
`

/* A dispute in court now: a contested-tone outline, held on hover. */
const LiveRow = styled(Link)`
  ${rowBase}
  background: color-mix(in srgb, var(--color-raised), var(--status-contested) 5%);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--status-contested) 48%, transparent),
    0 0 22px -10px color-mix(in srgb, var(--status-contested) 70%, transparent);

  &:hover {
    background: color-mix(
      in srgb,
      var(--color-raised),
      var(--status-contested) 9%
    );
    box-shadow:
      inset 0 0 0 1px
        color-mix(in srgb, var(--status-contested) 70%, transparent),
      0 0 26px -10px
        color-mix(in srgb, var(--status-contested) 80%, transparent);
  }
`

const AvatarShape = styled.span<{ $image?: string | null; $small?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  grid-row: ${({ $small }) => ($small ? 'auto' : 'span 3')};
  align-self: ${({ $small }) => ($small ? 'center' : 'start')};
  width: ${({ $small }) => ($small ? 28 : 36)}px;
  height: ${({ $small }) => ($small ? 28 : 36)}px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: ${({ $image }) =>
    $image ? `url(${$image}) center / cover` : 'var(--color-surface)'};
  box-shadow: 0 0 0 3px var(--color-surface);
  color: var(--color-faint);
`

/** The list's logo, or the registry glyph when it has none. */
const Avatar = ({ logo, small }: { logo?: string | null; small?: boolean }) => (
  <AvatarShape $image={logo} $small={small} aria-hidden>
    {!logo && <CurateIcon name="registry" size={small ? 13 : 16} />}
  </AvatarShape>
)

const RowTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const Registry = styled.span`
  min-width: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const IdValue = styled.span`
  display: block;
  min-width: 0;
  overflow: hidden;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* The identifier, and the bounty on the right. */
const IdLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
`

/* The submitter's deposit: what a winning challenger takes. */
const Bounty = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  color: var(--color-text);
  font-family: var(--font-figure);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  svg {
    color: var(--status-window);
  }
`

/* Request kind · elapsed share of the window · time left to challenge. */
const WindowLine = styled.div`
  display: grid;
  grid-template-columns: auto minmax(32px, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-width: 0;
  margin-top: 2px;

  > :last-child {
    color: var(--color-text);
    font-family: var(--font-figure);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
`

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 2px 12px;
  min-width: 0;

  > * {
    white-space: nowrap;
  }
`

const LiveTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
`

/* Slow pulse on a live dispute; a still halo under reduced motion. */
const Pulse = styled(StatusDot).attrs({ $tone: 'contested' as const })`
  animation: ${beat} 2.6s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const NoLive = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px dashed var(--glass-border);
  border-radius: var(--radius);
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const GroupHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding: 0 2px 4px;
`

/* Rulings: quieter rows on hairlines, no fill of their own. */
const DecidedRow = styled(Link)`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-top: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
  transition: background var(--motion);

  &:hover {
    background: var(--color-raised);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`

const Ruling = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  min-width: 0;
  text-align: right;

  > span:first-child {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 16px;
    white-space: nowrap;
  }
`

const moreStyles = css`
  align-self: flex-start;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
`

const More = styled.button`
  ${moreStyles}
`

/* Lists holding the open requests: each leads to that list's open ones. */
const Lists = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--glass-border);

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
`

const ListLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  height: 32px;
  padding: 0 12px 0 4px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-decoration: none;
  transition:
    background var(--motion),
    border-color var(--motion);

  > span:nth-child(2) {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  b {
    color: var(--color-muted);
    font-family: var(--font-figure);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }

  &:hover {
    border-color: var(--color-border-strong);
    background: var(--color-raised);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
`

const ListAvatar = styled.span<{ $image?: string | null }>`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: ${({ $image }) =>
    $image ? `url(${$image}) center / cover` : 'var(--color-raised)'};
  color: var(--color-faint);
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 4px 16px;
  margin-top: auto;
  padding-top: 4px;
`

const StakeLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-decoration: none;

  &:hover {
    color: var(--color-text);
  }

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
`

/* The window rail sits on a raised row: give its track some contrast. */
const WindowRail = styled(Rail)`
  background: color-mix(in srgb, var(--color-text) 9%, transparent);
`

const Empty = styled.div`
  padding: 20px 8px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-align: center;
`

/**
 * The row's first identifier. When another row shown from the same list has
 * the same first one, the second leads, so the rows differ even when cut.
 */
const Identifier = ({
  card,
  withSecond,
}: {
  card: DashboardCard
  withSecond?: boolean
}) => {
  const [first, second] = card.identifiers
  if (!first) return <span />
  const text =
    withSecond && second
      ? `${readableIdentifier(second.value)} · ${readableIdentifier(first.value)}`
      : readableIdentifier(first.value)
  return (
    <IdValue
      title={card.identifiers
        .map((identifier) => `${identifier.label}: ${identifier.value}`)
        .join('\n')}
    >
      {text}
    </IdValue>
  )
}

/** Keys of shown rows whose list and first identifier repeat. */
const repeatedIds = (cards: DashboardCard[]): Set<string> => {
  const seen = new Map<string, number>()
  const key = (card: DashboardCard) =>
    `${card.chainId}:${card.registryAddress}:${card.identifiers[0]?.value ?? ''}`
  for (const card of cards) seen.set(key(card), (seen.get(key(card)) ?? 0) + 1)
  return new Set(
    cards.filter((card) => (seen.get(key(card)) ?? 0) > 1).map((c) => c.id),
  )
}

const OpenRow = ({
  card,
  now,
  withSecond,
}: {
  card: DashboardCard
  now: number
  withSecond: boolean
}) => {
  const { windowStart, windowEnd } = card
  const removal = card.request === 'removal'
  return (
    <Row to={card.href} title={card.actor ? `by ${card.actor}` : undefined}>
      <Avatar logo={card.logo} />
      <RowTop>
        <Registry title={card.registry}>{card.registry}</Registry>
        <ChainChip chainId={card.chainId} size="sm" />
      </RowTop>
      <IdLine>
        <Identifier card={card} withSecond={withSecond} />
        {card.deposit !== undefined && (
          <Bounty title="The submitter’s deposit: a successful challenger wins it and gets their own deposit back">
            <CurateIcon name="bounty" size={14} />
            {formatCoin(card.deposit, card.chainId)}
            <VisuallyHidden> bounty</VisuallyHidden>
          </Bounty>
        )}
      </IdLine>
      {windowStart !== undefined && windowEnd !== undefined ? (
        <WindowLine
          title={`${removal ? 'Removal asked' : 'Submitted'} ${formatAgo(windowStart, now)} · challenge window closes ${formatAbsolute(windowEnd)}`}
        >
          <Small $muted>{removal ? 'Removal' : 'Submission'}</Small>
          <WindowRail
            $value={windowProgress(windowStart, windowEnd, now)}
            role="presentation"
          />
          <Small>{formatTimeLeft(windowEnd, now)}</Small>
        </WindowLine>
      ) : (
        <Meta>
          <Small $muted>
            {removal ? 'Removal' : 'Submission'} · {card.when}
          </Small>
        </Meta>
      )}
    </Row>
  )
}

export interface HappeningFigures {
  /** Requests nobody challenged, still inside their window. */
  inWindow: number
  /** Requests nobody challenged, past their window (waiting to be executed). */
  pastWindow: number
  /** The in-window requests' deposits per chain, in wei. */
  inWindowDeposits: Record<number, bigint>
  /** False when some windows could not be read: no window claims then. */
  windowsKnown: boolean
  /** Every unresolved request with no challenge. */
  unchallenged: number
  /** The open-request read hit its cap: counts are lower bounds. */
  unchallengedCapped: boolean
  /** Disputes open right now (the hero's "In court now"). */
  inCourt: number
  decidedCapped: boolean
}

/** A list holding open requests, as its chip shows it. */
export interface OpenListChip {
  key: string
  title: string
  logo?: string | null
  count: number
  href: string
}

export const HappeningNow = ({
  open,
  openLists,
  live,
  decided,
  figures,
  now,
  checking,
  stakeHref,
}: {
  open: DashboardCard[]
  /** The lists holding the open requests, most first. */
  openLists: OpenListChip[]
  live: DashboardCard[]
  decided: DashboardCard[]
  figures: HappeningFigures
  now: number
  /** The challenge windows are being read again. */
  checking: boolean
  /** Browse's Stake lists in scope, when there are any. */
  stakeHref?: string
}) => {
  const openTitleId = useId()
  const disputesTitleId = useId()
  const [openExpanded, setOpenExpanded] = useState(false)
  const [liveExpanded, setLiveExpanded] = useState(false)
  const [decidedExpanded, setDecidedExpanded] = useState(false)
  const plus = (capped: boolean) => (capped ? '+' : '')

  const known = figures.windowsKnown
  const openTotal = Math.max(
    known ? figures.inWindow : figures.unchallenged,
    open.length,
  )
  const openShown = openExpanded ? open : open.slice(0, OPEN_LIMIT)
  const openHidden = openTotal - openShown.length
  const canExpand = !openExpanded && open.length > OPEN_LIMIT
  const repeated = repeatedIds(openShown)
  const bounties = Object.entries(figures.inWindowDeposits)
    .filter(([, wei]) => wei > 0n)
    .map(([chainId, wei]) => formatCoin(wei, Number(chainId)))

  const liveShown = liveExpanded ? live : live.slice(0, LIVE_LIMIT)
  const decidedShown = decidedExpanded
    ? decided
    : decided.slice(0, DECIDED_LIMIT)

  return (
    <Board>
      <Panel
        as="section"
        $padding="compact"
        aria-labelledby={openTitleId}
        style={{ ['--i' as string]: 0 }}
      >
        <PanelHead>
          <Heading>
            <TitleRow>
              <StatusDot $tone="window" aria-hidden />
              <PanelTitle id={openTitleId}>Open for verification</PanelTitle>
            </TitleRow>
            <Small $faint>
              Challenge one that breaks its list’s rules and win its deposit
            </Small>
            {checking && (
              <Checking role="status">Checking challenge windows…</Checking>
            )}
          </Heading>
          <Tally>
            <span>
              <Count>
                {formatInt(openTotal)}
                {plus(figures.unchallengedCapped)}
              </Count>
              <Label $tone="faint">
                {known ? 'In window' : 'Not challenged'}
              </Label>
            </span>
            {known && bounties.length > 0 && (
              <span title="The deposits of the requests in their window: each goes to whoever challenges that request and wins">
                <Count $quiet>
                  {bounties.join(' · ')}
                  {plus(figures.unchallengedCapped)}
                </Count>
                <Label $tone="faint">Bounties</Label>
              </span>
            )}
          </Tally>
        </PanelHead>
        {openShown.length === 0 && (
          <Empty>
            {known
              ? 'No request in its challenge window'
              : 'No request waiting for a challenge'}
          </Empty>
        )}
        {openShown.map((card) => (
          <OpenRow
            key={card.id}
            card={card}
            now={now}
            withSecond={repeated.has(card.id)}
          />
        ))}
        {canExpand && (
          <More type="button" onClick={() => setOpenExpanded(true)}>
            +{formatInt(openHidden)}
            {plus(figures.unchallengedCapped)} more
          </More>
        )}
        {!canExpand && openHidden > 0 && openLists.length > 0 && (
          <Lists>
            <Label $tone="faint">
              All {formatInt(openTotal)}
              {plus(figures.unchallengedCapped)} by list
            </Label>
            <ul>
              {openLists.map((list) => (
                <li key={list.key} style={{ minWidth: 0, maxWidth: '100%' }}>
                  <ListLink to={list.href} title={list.title}>
                    <ListAvatar $image={list.logo} aria-hidden>
                      {!list.logo && <CurateIcon name="registry" size={12} />}
                    </ListAvatar>
                    <span>{list.title}</span>
                    <b>{formatInt(list.count)}</b>
                  </ListLink>
                </li>
              ))}
            </ul>
          </Lists>
        )}
        {openExpanded && (
          <More type="button" onClick={() => setOpenExpanded(false)}>
            Show fewer
          </More>
        )}
        {((known && figures.pastWindow > 0) || stakeHref) && (
          <Footer>
            {known && figures.pastWindow > 0 && (
              <Small $faint>
                {formatInt(figures.pastWindow)}
                {plus(figures.unchallengedCapped)} past their window · waiting
                to be executed
              </Small>
            )}
            {stakeHref && (
              <StakeLink to={stakeHref}>
                Stake lists stay open to challenge at any time
                <CurateIcon name="submit" size={12} />
              </StakeLink>
            )}
          </Footer>
        )}
      </Panel>

      <Panel
        as="section"
        $padding="compact"
        aria-labelledby={disputesTitleId}
        style={{ ['--i' as string]: 1 }}
      >
        <PanelHead>
          <Heading>
            <TitleRow>
              <StatusDot $tone="contested" aria-hidden />
              <PanelTitle id={disputesTitleId}>Disputes</PanelTitle>
            </TitleRow>
            <Small $faint>In court now · rulings issued, last 30 days</Small>
          </Heading>
          <Tally>
            <span>
              <Count>{formatInt(Math.max(figures.inCourt, live.length))}</Count>
              <Label $tone="faint">In court</Label>
            </span>
            <span>
              <Count $quiet>
                {formatInt(decided.length)}
                {plus(figures.decidedCapped)}
              </Count>
              <Label $tone="faint">Rulings</Label>
            </span>
          </Tally>
        </PanelHead>

        {live.length === 0 ? (
          <NoLive>
            <StatusDot $tone="neutral" aria-hidden />
            No live disputes
          </NoLive>
        ) : (
          liveShown.map((card) => (
            <LiveRow
              key={card.id}
              to={card.href}
              title={card.actor ? `by ${card.actor}` : undefined}
            >
              <Avatar logo={card.logo} />
              <RowTop>
                <Registry title={card.registry}>{card.registry}</Registry>
                <ChainChip chainId={card.chainId} size="sm" />
              </RowTop>
              <Identifier card={card} />
              <Meta>
                <LiveTag>
                  <Pulse aria-hidden />
                  In court
                  {card.detailId && <Mono>{card.detailId}</Mono>}
                </LiveTag>
                <Small $muted>{card.when}</Small>
              </Meta>
            </LiveRow>
          ))
        )}
        {live.length > liveShown.length && (
          <More type="button" onClick={() => setLiveExpanded(true)}>
            +{formatInt(live.length - liveShown.length)} more in court
          </More>
        )}
        {liveExpanded && live.length > LIVE_LIMIT && (
          <More type="button" onClick={() => setLiveExpanded(false)}>
            Show fewer
          </More>
        )}

        <GroupHead>
          <Label $tone="faint">Rulings · last 30 days</Label>
        </GroupHead>
        {decided.length === 0 ? (
          <Empty>No rulings in the last 30 days</Empty>
        ) : (
          <div>
            {decidedShown.map((card) => (
              <DecidedRow key={card.id} to={card.href}>
                <Avatar logo={card.logo} small />
                <span style={{ minWidth: 0 }}>
                  <Registry
                    title={card.registry}
                    style={{ display: 'block', fontWeight: 500 }}
                  >
                    {card.registry}
                  </Registry>
                  <Identifier card={card} />
                </span>
                <Ruling>
                  <span>
                    <StatusDot $tone={card.tone} aria-hidden />
                    {card.detail}
                  </span>
                  <Small $faint>{formatAgo(card.at, now)}</Small>
                </Ruling>
              </DecidedRow>
            ))}
          </div>
        )}
        {decided.length > decidedShown.length && (
          <More type="button" onClick={() => setDecidedExpanded(true)}>
            +{formatInt(decided.length - decidedShown.length)} more rulings
          </More>
        )}
        {decidedExpanded && decided.length > DECIDED_LIMIT && (
          <More type="button" onClick={() => setDecidedExpanded(false)}>
            Show fewer
          </More>
        )}
      </Panel>
    </Board>
  )
}

export default HappeningNow
