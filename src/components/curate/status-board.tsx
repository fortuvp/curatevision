import React, { useState } from 'react'
import styled from 'styled-components'
import { Link } from 'react-router-dom'
import {
  ChainChip,
  Data,
  Label,
  Small,
  StatusDot,
  Surface,
  type StatusTone,
} from './primitives'
import { CurateIcon } from './icons'
import { parseRichAddress } from 'utils/rich-address'

/*
 * Status columns board (DESIGN.md, Components): three columns with mono headers
 * and counts; cards show registry, identifiers, chain, actor and time; a footer
 * "+n more" reveals the rest in place.
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
  /** "window open", "Dispute #1040", "Kept by ruling" */
  detail: string
  tone: StatusTone
}

export interface BoardColumn {
  id: string
  title: string
  hint: string
  tone: StatusTone
  cards: BoardCard[]
  empty: string
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
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 2px 12px;
  margin-bottom: 2px;
`

const Count = styled.span`
  color: var(--color-text);
  font-size: 28px;
  line-height: 1;
  font-weight: 300;
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

const Card = styled(Link)`
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr);
  column-gap: 12px;
  row-gap: 4px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-raised);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--motion),
    background var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
    background: var(--color-raised);
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

const Meta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
`

const More = styled.button`
  align-self: flex-start;
  padding: 4px 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`

const Empty = styled.div`
  padding: 20px 8px;
  color: var(--color-faint);
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

const BoardColumnView = ({
  column,
  limit,
}: {
  column: BoardColumn
  limit: number
}) => {
  const [expanded, setExpanded] = useState(false)
  const cards = expanded ? column.cards : column.cards.slice(0, limit)
  const hidden = column.cards.length - cards.length
  return (
    <Column $padding="compact" aria-label={column.title}>
      <ColumnHeader>
        <ColumnTitle>
          <StatusDot $tone={column.tone} aria-hidden />
          <Label $tone="text">{column.title}</Label>
        </ColumnTitle>
        <Count>{column.cards.length}</Count>
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
            <Small $faint>{card.when}</Small>
            <Data $muted $weight={400}>
              {card.detail}
            </Data>
          </Meta>
        </Card>
      ))}
      {hidden > 0 && (
        <More type="button" onClick={() => setExpanded(true)}>
          +{hidden} more
        </More>
      )}
      {expanded && column.cards.length > limit && (
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
