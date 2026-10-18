import React, { useState, useCallback, useMemo } from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames, monoData } from './kit-styles'

/* Pagination: 32px ghost buttons in mono; the current page in the action color. */
const Wrapper = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  user-select: none;
`

const pageButtonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-muted);
  ${monoData}
  cursor: pointer;
  transition:
    background var(--motion),
    color var(--motion);

  &:hover:not(:disabled):not(.active) {
    color: var(--color-text);
    background: var(--color-raised);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }
`

const PageButton = styled.button`
  ${pageButtonBase}

  &.active {
    color: var(--color-primary);
    background: var(--color-primary-soft);
  }
`

const Ellipsis = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 32px;
  color: var(--color-faint);
  ${monoData}
`

const SizeChanger = styled.select`
  height: 32px;
  margin-left: 8px;
  padding: 0 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  cursor: pointer;

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus {
    border-color: var(--color-primary);
  }
`

const SimplePagination = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text);
  ${monoData}
`

const SimpleInput = styled.input`
  width: 48px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text);
  ${monoData}
  text-align: center;

  &:focus {
    border-color: var(--color-primary);
  }
`

const getPageNumbers = (
  current: number,
  total: number,
): (number | string)[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | string)[] = []
  pages.push(1)

  if (current > 3) pages.push('left-ellipsis')

  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)

  for (let i = start; i <= end; i++) pages.push(i)

  if (current < total - 2) pages.push('right-ellipsis')

  if (total > 1) pages.push(total)

  return pages
}

interface PaginationProps {
  total?: number
  current?: number
  pageSize?: number
  onChange?: (page: number, pageSize: number) => void
  showSizeChanger?: boolean
  pageSizeOptions?: string[]
  onShowSizeChange?: (current: number, size: number) => void
  itemRender?: (
    page: number,
    type: string,
    originalElement: React.ReactNode,
  ) => React.ReactNode
  style?: React.CSSProperties
  className?: string
  defaultCurrent?: number
  simple?: boolean
}

const Pagination: React.FC<PaginationProps> = ({
  total = 0,
  current: controlledCurrent,
  pageSize: controlledPageSize,
  onChange,
  showSizeChanger = false,
  pageSizeOptions = ['10', '20', '50', '100'],
  onShowSizeChange,
  itemRender,
  style,
  className,
  defaultCurrent = 1,
  simple = false,
}) => {
  const [internalCurrent, setInternalCurrent] = useState(defaultCurrent)
  const [internalPageSize, setInternalPageSize] = useState(
    controlledPageSize || 10,
  )

  const isControlled = controlledCurrent !== undefined
  const current = isControlled ? controlledCurrent : internalCurrent
  const pageSize =
    controlledPageSize === undefined ? internalPageSize : controlledPageSize
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const goTo = useCallback(
    (page: number) => {
      const p = Math.max(1, Math.min(page, totalPages))
      if (!isControlled) setInternalCurrent(p)
      if (onChange) onChange(p, pageSize)
    },
    [totalPages, isControlled, onChange, pageSize],
  )

  const handleSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newSize = Number(e.target.value)
      setInternalPageSize(newSize)
      const newTotal = Math.max(1, Math.ceil(total / newSize))
      const newCurrent = Math.min(current, newTotal)
      if (!isControlled) setInternalCurrent(newCurrent)
      if (onShowSizeChange) onShowSizeChange(newCurrent, newSize)
      if (onChange) onChange(newCurrent, newSize)
    },
    [total, current, isControlled, onShowSizeChange, onChange],
  )

  const renderItem = useCallback(
    (page: number, type: string, originalElement: React.ReactNode) => {
      if (itemRender) return itemRender(page, type, originalElement)
      return originalElement
    },
    [itemRender],
  )

  const pages = useMemo(
    () => getPageNumbers(current, totalPages),
    [current, totalPages],
  )

  if (simple)
    return (
      <SimplePagination
        style={style}
        className={joinClassNames(
          'ui-pagination',
          'ui-pagination-simple',
          className,
        )}
      >
        <PageButton
          type="button"
          className="ui-pagination-prev"
          disabled={current <= 1}
          onClick={() => goTo(current - 1)}
          aria-label="Previous page"
        >
          <KitIcon name="chevron-left" size={14} />
        </PageButton>
        <SimpleInput
          value={current}
          aria-label="Page"
          onChange={(e) => {
            const val = Number.parseInt(e.target.value, 10)
            if (!Number.isNaN(val)) goTo(val)
          }}
        />
        <span>/</span>
        <span>{totalPages}</span>
        <PageButton
          type="button"
          className="ui-pagination-next"
          disabled={current >= totalPages}
          onClick={() => goTo(current + 1)}
          aria-label="Next page"
        >
          <KitIcon name="chevron-right" size={14} />
        </PageButton>
      </SimplePagination>
    )

  return (
    <Wrapper
      style={style}
      className={joinClassNames('ui-pagination', className)}
      aria-label="Pagination"
    >
      <PageButton
        type="button"
        className="ui-pagination-prev"
        disabled={current <= 1}
        onClick={() => goTo(current - 1)}
        aria-label="Previous page"
      >
        {renderItem(
          current - 1,
          'prev',
          <KitIcon name="chevron-left" size={14} />,
        )}
      </PageButton>

      {pages.map((page, idx) => {
        if (typeof page === 'string')
          return (
            <Ellipsis
              key={page + idx}
              className="ui-pagination-ellipsis"
              aria-hidden
            >
              …
            </Ellipsis>
          )

        return (
          <React.Fragment key={page}>
            {renderItem(
              page,
              'page',
              <PageButton
                type="button"
                className={joinClassNames(
                  'ui-pagination-item',
                  page === current && 'active',
                )}
                aria-current={page === current ? 'page' : undefined}
                aria-label={`Page ${page}`}
                onClick={() => goTo(page)}
              >
                {page}
              </PageButton>,
            )}
          </React.Fragment>
        )
      })}

      <PageButton
        type="button"
        className="ui-pagination-next"
        disabled={current >= totalPages}
        onClick={() => goTo(current + 1)}
        aria-label="Next page"
      >
        {renderItem(
          current + 1,
          'next',
          <KitIcon name="chevron-right" size={14} />,
        )}
      </PageButton>

      {showSizeChanger && (
        <SizeChanger
          className="ui-pagination-size"
          value={pageSize}
          onChange={handleSizeChange}
          aria-label="Items per page"
        >
          {pageSizeOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt} / page
            </option>
          ))}
        </SizeChanger>
      )}
    </Wrapper>
  )
}

export default Pagination
