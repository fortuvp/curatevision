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

/*
 * Status columns board (DESIGN.md, Components): three columns with mono headers
 * and counts; cards show registry, identifiers, chain, actor and time; a footer
 * "+n more" reveals the rest in place.
 */

export interface BoardCard {
  id: string
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
  padding-bottom: 10px;
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 4px;
`

const ColumnTitle = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
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

const Identifier = styled.div`
  display: flex;
  gap: 8px;
  min-width: 0;

  dt {
    flex: 0 0 auto;
    color: var(--color-faint);
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    line-height: var(--lh-small);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
  }

  dd {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--fs-data);
    line-height: var(--lh-small);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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

const shortAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null

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
        <Data $muted>{column.cards.length}</Data>
      </ColumnHeader>
      {cards.length === 0 && <Empty>{column.empty}</Empty>}
      {cards.map((card) => (
        <Card key={card.id} to={card.href}>
          <CardTop>
            <Registry title={card.registry}>{card.registry}</Registry>
            <ChainChip chainId={card.chainId} size="sm" />
          </CardTop>
          {card.identifiers.length > 0 && (
            <dl style={{ margin: 0, display: 'grid', gap: 2 }}>
              {card.identifiers.map((field) => (
                <Identifier key={field.label}>
                  <dt>{field.label}</dt>
                  <dd title={field.value}>{field.value}</dd>
                </Identifier>
              ))}
            </dl>
          )}
          <Meta>
            <Small $muted>
              {card.when}
              {card.actor && <> · {shortAddress(card.actor)}</>}
            </Small>
            <Data $weight={500}>{card.detail}</Data>
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
