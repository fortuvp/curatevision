import React from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { ItemTypes } from '@kleros/gtcr-encoder'
import DisplaySelector from 'components/display-selector'
import { parseIpfs } from 'utils/ipfs-parse'
import type { ListLayout } from 'hooks/use-stored-layout'
import {
  Button,
  Data,
  EmptyState,
  Grid,
  Label,
  Small,
  Surface,
  Table,
  TableScroller,
} from './primitives'
import { CurateIcon } from './icons'
import type { V2Field } from './v2'
import { V2FieldDisplay } from './v2'
import { EntryStatus, type EntryStatusView } from './entry-status'

/*
 * Entries of a registry in the user's chosen layout (DESIGN.md: table, cards
 * or rows). Fields are rendered by type through DisplaySelector; the status
 * is a dot, a label and the time left.
 */

export interface EntryRow {
  id: string
  href: string
  fields: V2Field[]
  status?: EntryStatusView
  /** For lists of lists: the registry this entry points to. */
  openListTo?: string
  /** Potentially offensive content hidden behind a reveal. */
  hidden?: boolean
  onReveal?: () => void
}

const normalizeType = (type?: string) => (type || '').toLowerCase()
const isImage = (field: V2Field) =>
  normalizeType(field.type) === normalizeType(ItemTypes.IMAGE)
const isGtcrAddress = (field: V2Field) =>
  normalizeType(field.type) === normalizeType(ItemTypes.GTCR_ADDRESS)
const hasValue = (field: V2Field) =>
  field.value !== undefined &&
  field.value !== null &&
  String(field.value) !== ''

/** Columns worth a table column: identifiers first, then images, max 4. */
export const tableColumns = (fields: V2Field[]): V2Field[] => {
  const identifiers = fields.filter((field) => field.isIdentifier)
  const images = fields.filter((field) => isImage(field) && !field.isIdentifier)
  const chosen = [...identifiers, ...images]
  return (chosen.length > 0 ? chosen : fields).slice(0, 4)
}

const Thumb = styled.img`
  display: block;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--color-raised);
`

const CellValue = styled.div`
  min-width: 0;
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  a {
    color: var(--color-primary);
  }
`

const FieldValue = ({ field, large }: { field: V2Field; large?: boolean }) => {
  if (!hasValue(field)) return <Small $faint>—</Small>
  if (isImage(field))
    return large ? (
      <V2FieldDisplay detailed field={field} showStakeBadge={false} />
    ) : (
      <Thumb src={parseIpfs(String(field.value))} alt={field.label || ''} />
    )
  if (isGtcrAddress(field))
    return <V2FieldDisplay field={field} showStakeBadge={false} />
  return (
    <DisplaySelector
      type={field.type || ItemTypes.TEXT}
      value={field.value as string}
      allowedFileTypes={field.allowedFileTypes as string}
      truncateLinks
      linkImage
    />
  )
}

const Hidden = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: var(--color-muted);
  font-size: var(--fs-small);
`

const HiddenNotice = ({ entry }: { entry: EntryRow }) => (
  <Hidden>
    <span>Hidden: potentially offensive content.</span>
    {entry.onReveal && (
      <Button
        type="button"
        $variant="secondary"
        $size="sm"
        onClick={entry.onReveal}
      >
        Show entry
      </Button>
    )}
  </Hidden>
)

/* ---------- Table ---------- */

const EntryTable = ({
  entries,
  columns,
  now,
  itemName,
}: {
  entries: EntryRow[]
  columns: V2Field[]
  now: number
  itemName: string
}) => {
  const navigate = useNavigate()
  return (
    <TableScroller>
      <Table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.label}>{column.label}</th>
            ))}
            <th>Status</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              data-href={entry.href}
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a, button')) return
                navigate(entry.href)
              }}
            >
              {entry.hidden ? (
                <td colSpan={columns.length}>
                  <HiddenNotice entry={entry} />
                </td>
              ) : (
                columns.map((column) => {
                  const field =
                    entry.fields.find((f) => f.label === column.label) ?? column
                  return (
                    <td key={column.label}>
                      <CellValue>
                        <FieldValue field={field} />
                      </CellValue>
                    </td>
                  )
                })
              )}
              <td>
                {entry.status ? (
                  <EntryStatus status={entry.status} now={now} />
                ) : (
                  <Small $faint>Loading</Small>
                )}
              </td>
              <td className="num">
                <Link to={entry.href} aria-label={`Open ${itemName}`}>
                  <CurateIcon name="external" size={14} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableScroller>
  )
}

/* ---------- Cards ---------- */

const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 160px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--motion),
    box-shadow var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-card-hover);
  }
`

const CardField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  > div,
  > span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

const CardFooter = styled.div`
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
`

const EntryCards = ({
  entries,
  columns,
  now,
}: {
  entries: EntryRow[]
  columns: V2Field[]
  now: number
}) => (
  <Grid $min={260}>
    {entries.map((entry) => {
      const image = entry.fields.find(
        (field) => isImage(field) && hasValue(field),
      )
      const textual = columns.filter((column) => !isImage(column)).slice(0, 3)
      return (
        <Card key={entry.id} to={entry.href}>
          {entry.hidden ? (
            <HiddenNotice entry={entry} />
          ) : (
            <>
              {image && (
                <div>
                  <FieldValue field={image} large />
                </div>
              )}
              {textual.map((column) => {
                const field =
                  entry.fields.find((f) => f.label === column.label) ?? column
                return (
                  <CardField key={column.label}>
                    <Label $tone="faint">{column.label}</Label>
                    <div>
                      <FieldValue field={field} />
                    </div>
                  </CardField>
                )
              })}
            </>
          )}
          <CardFooter>
            {entry.status ? (
              <EntryStatus status={entry.status} now={now} />
            ) : (
              <Small $faint>Loading</Small>
            )}
          </CardFooter>
        </Card>
      )
    })}
  </Grid>
)

/* ---------- Rows ---------- */

const RowsShell = styled(Surface)`
  display: flex;
  flex-direction: column;
`

const RowLink = styled(Link)`
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

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const RowFields = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 20px;
  min-width: 0;
`

const RowField = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  max-width: 100%;

  > div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const EntryRows = ({
  entries,
  columns,
  now,
}: {
  entries: EntryRow[]
  columns: V2Field[]
  now: number
}) => (
  <RowsShell $padding="none">
    {entries.map((entry) => (
      <RowLink key={entry.id} to={entry.href}>
        {entry.hidden ? (
          <HiddenNotice entry={entry} />
        ) : (
          <RowFields>
            {columns.map((column) => {
              const field =
                entry.fields.find((f) => f.label === column.label) ?? column
              return (
                <RowField key={column.label}>
                  {!isImage(column) && (
                    <Label $tone="faint">{column.label}</Label>
                  )}
                  <div>
                    <FieldValue field={field} />
                  </div>
                </RowField>
              )
            })}
          </RowFields>
        )}
        {entry.status ? (
          <EntryStatus status={entry.status} now={now} />
        ) : (
          <Small $faint>Loading</Small>
        )}
      </RowLink>
    ))}
  </RowsShell>
)

/* ---------- Switch ---------- */

export const EntryList = ({
  layout,
  entries,
  columns,
  now,
  itemName = 'entry',
  itemNamePlural = 'entries',
  loading,
  emptyAction,
}: {
  layout: ListLayout
  entries: EntryRow[]
  columns: V2Field[]
  now: number
  itemName?: string
  itemNamePlural?: string
  loading?: boolean
  emptyAction?: React.ReactNode
}) => {
  if (loading && entries.length === 0)
    return (
      <Surface $padding="compact">
        <Data $muted>Loading {itemNamePlural}…</Data>
      </Surface>
    )
  if (entries.length === 0)
    return (
      <Surface $padding="none">
        <EmptyState
          icon="list"
          title={`No ${itemNamePlural} match`}
          action={emptyAction}
        >
          Change the filters or search, or be the first to submit.
        </EmptyState>
      </Surface>
    )
  if (layout === 'cards')
    return <EntryCards entries={entries} columns={columns} now={now} />
  if (layout === 'rows')
    return <EntryRows entries={entries} columns={columns} now={now} />
  return (
    <EntryTable
      entries={entries}
      columns={columns}
      now={now}
      itemName={itemName}
    />
  )
}

export default EntryList
