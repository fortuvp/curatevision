import React, { useId, useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import {
  ChainChip,
  Label,
  Mono,
  Small,
  StatusDot,
  Surface,
  type StatusTone,
} from './primitives'
import { CurateIcon } from './icons'
import { parseRichAddress } from 'utils/rich-address'

/*
 * Status columns board (DESIGN.md, Components): three columns, each with a
 * label, the measure and window it covers, and its count; cards show
 * registry, identifier, chain and time. A footer "+n more" reveals the rest
 * in place, or links on when the column counts more than it loaded.
 */

export interface BoardCard {
  id: string
  /** Registry logo (IPFS or http URL), shown as the row avatar. */
  logo?: string | null
  href: string
  registry: string
  identifiers: { label: string; value: string }[]
  chainId: number
  actor?: string
  /** "submitted 3h ago", "challenged 2d ago" */
  when: string
  /** "Dispute", "Kept by ruling"; empty for none. */
  detail: string
  /** An identifier set in mono after the detail, e.g. "#1040". */
  detailId?: string
  tone: StatusTone
}

export interface BoardColumn {
  id: string
  title: string
  /** What the column counts and over what window, under the title. */
  hint: string
  tone: StatusTone
  cards: BoardCard[]
  empty: string
  /** The column's true count when it is more than the cards loaded. */
  count?: number
  /** The count hit the query's cap: shown as "n+". */
  capped?: boolean
  /** Where "+n more" leads when the column counts more than it loaded. */
  moreHref?: string
}

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`

const Column = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const ColumnHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 12px;
  margin-bottom: 2px;
`

const ColumnHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Count = styled.span`
  color: var(--color-text);
  font-family: var(--font-figure);
  font-size: 28px;
  line-height: 1;
  font-weight: 500;
  letter-spacing: var(--tracking-display);
  font-variant-numeric: tabular-nums;
`

const IdValue = styled.span`
  display: block;
  overflow: hidden;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ColumnTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

/* Rows on a raised fill, no border of their own (no panel in a panel). */
const Card = styled(Link)`
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

const Avatar = styled.span<{ $image?: string | null }>`
  grid-row: span 3;
  align-self: start;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid var(--glass-border);
  background: ${({ $image }) =>
    $image ? `url(${$image}) center / cover` : 'var(--color-raised)'};
  box-shadow: 0 0 0 3px var(--color-surface);
`

const CardTop = styled.div`
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

/* The time and the detail never break mid-phrase: the detail moves to its own line instead. */
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

  > :last-child:not(:first-child) {
    margin-left: auto;
  }
`

const moreStyles = `
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
`

const More = styled.button`
  ${moreStyles}
`

const MoreLink = styled(Link)`
  ${moreStyles}
`

const Empty = styled.div`
  padding: 20px 8px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-align: center;
`

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

const integer = new Intl.NumberFormat('en-US')

const BoardColumnView = ({
  column,
  limit,
}: {
  column: BoardColumn
  limit: number
}) => {
  const hintId = useId()
  const [expanded, setExpanded] = useState(false)
  const total = Math.max(column.count ?? 0, column.cards.length)
  // A column that counts more than it loaded links on instead of expanding.
  const linksOn = !!column.moreHref && total > column.cards.length
  const cards =
    expanded && !linksOn ? column.cards : column.cards.slice(0, limit)
  const hidden = total - cards.length
  return (
    <Column
      $padding="compact"
      aria-label={column.title}
      aria-describedby={hintId}
    >
      <ColumnHeader>
        <ColumnHeading>
          <ColumnTitle>
            <StatusDot $tone={column.tone} aria-hidden />
            <Label $tone="text">{column.title}</Label>
          </ColumnTitle>
          <Small $faint id={hintId}>
            {column.hint}
          </Small>
        </ColumnHeading>
        <Count>
          {integer.format(total)}
          {column.capped ? '+' : ''}
        </Count>
      </ColumnHeader>
      {cards.length === 0 && <Empty>{column.empty}</Empty>}
      {cards.map((card) => (
        <Card
          key={card.id}
          to={card.href}
          title={card.actor ? `by ${card.actor}` : undefined}
        >
          <Avatar $image={card.logo} aria-hidden />
          <CardTop>
            <Registry title={card.registry}>{card.registry}</Registry>
            <ChainChip chainId={card.chainId} size="sm" />
          </CardTop>
          {card.identifiers[0] && (
            <IdValue
              title={`${card.identifiers[0].label}: ${card.identifiers[0].value}`}
            >
              {readableIdentifier(card.identifiers[0].value)}
            </IdValue>
          )}
          <Meta>
            <Small $muted>{card.when}</Small>
            {(card.detail || card.detailId) && (
              <Small $muted>
                {card.detail}
                {card.detailId && (
                  <>
                    {card.detail ? ' ' : ''}
                    <Mono>{card.detailId}</Mono>
                  </>
                )}
              </Small>
            )}
          </Meta>
        </Card>
      ))}
      {hidden > 0 &&
        (linksOn && column.moreHref ? (
          <MoreLink to={column.moreHref}>
            +{integer.format(hidden)}
            {column.capped ? '+' : ''} more
          </MoreLink>
        ) : (
          <More type="button" onClick={() => setExpanded(true)}>
            +{integer.format(hidden)} more
          </More>
        ))}
      {expanded && !linksOn && column.cards.length > limit && (
        <More type="button" onClick={() => setExpanded(false)}>
          Show fewer
        </More>
      )}
    </Column>
  )
}

export const StatusBoard = ({
  columns,
  limit = 5,
}: {
  columns: BoardColumn[]
  limit?: number
}) => (
  <Columns>
    {columns.map((column) => (
      <BoardColumnView key={column.id} column={column} limit={limit} />
    ))}
  </Columns>
)

export const BoardHint = () => (
  <Small $faint>
    <CurateIcon name="activity" size={12} /> Latest requests across every
    registry
  </Small>
)

export default StatusBoard
