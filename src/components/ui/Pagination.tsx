import React, {
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import {
  fieldFocus,
  fieldSurface,
  figureData,
  joinClassNames,
  kitTransition,
} from './kit-styles'

/*
 * Pagination, v2: ghost pills with tabular figures. The current page sits in
 * a tinted pill that slides from page to page; previous and next are round.
 */
const Wrapper = styled.nav`
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  user-select: none;
`

/* The tinted pill behind the current page; it glides when the page changes. */
const Indicator = styled.span<{ $instant?: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  z-index: -1;
  height: 36px;
  border-radius: var(--radius-pill);
  background: var(--color-primary-soft);
  box-shadow: inset 0 0 0 1px
    color-mix(in srgb, var(--color-primary) 40%, transparent);
  pointer-events: none;
  transition: ${({ $instant }) =>
    $instant
      ? 'none'
      : 'transform var(--dur-control) var(--ease-spring), width var(--dur-control) var(--ease-spring)'};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const pageButtonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-muted);
  ${figureData}
  font-size: var(--fs-small);
  cursor: pointer;
  transition: ${kitTransition(
    'background',
    'color',
    'border-color',
    'transform',
  )};

  &:hover:not(:disabled):not(.active) {
    color: var(--color-text);
    background: var(--color-raised);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.35;
  }
`

const PageButton = styled.button`
  ${pageButtonBase}

  &.ui-pagination-prev,
  &.ui-pagination-next {
    border-color: var(--glass-border);
  }

  &.active {
    color: var(--color-primary);
    background: var(--color-primary-soft);
  }

  /* With the sliding pill drawn, the current page only changes its ink. */
  [data-sliding='true'] > &.active {
    background: transparent;
  }
`

const Ellipsis = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 36px;
  color: var(--color-faint);
  ${figureData}
`

const SizeChanger = styled.select`
  ${fieldSurface}
  height: 36px;
  margin-left: 8px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  cursor: pointer;

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus-visible {
    ${fieldFocus}
  }
`

const SimplePagination = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--color-muted);
  ${figureData}
`

const SimpleInput = styled.input`
  ${fieldSurface}
  width: 52px;
  height: 36px;
  padding: 0;
  border-radius: var(--radius-pill);
  ${figureData}
  text-align: center;

  &:focus-visible {
    ${fieldFocus}
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

  // Measure the current page button so the tinted pill can slide to it.
  const navRef = useRef<HTMLElement>(null)
  const firstMeasure = useRef(true)
  const [pill, setPill] = useState<{
    x: number
    y: number
    width: number
    instant: boolean
  }>()
  const measurePill = useCallback((instant: boolean) => {
    const node = navRef.current?.querySelector<HTMLElement>(
      '[aria-current="page"]',
    )
    setPill(
      node
        ? {
            x: node.offsetLeft,
            y: node.offsetTop,
            width: node.offsetWidth,
            instant,
          }
        : undefined,
    )
  }, [])
  useLayoutEffect(() => {
    if (simple) return
    measurePill(firstMeasure.current)
    firstMeasure.current = false
  }, [current, totalPages, simple, measurePill])
  // A window resize can rewrap the pills: follow them without animating.
  useEffect(() => {
    if (simple) return undefined
    const onResize = () => measurePill(true)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [simple, measurePill])

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
      ref={navRef}
      style={style}
      className={joinClassNames('ui-pagination', className)}
      aria-label="Pagination"
      data-sliding={pill ? 'true' : undefined}
    >
      {pill && (
        <Indicator
          aria-hidden
          $instant={pill.instant}
          style={{
            width: pill.width,
            transform: `translate(${pill.x}px, ${pill.y}px)`,
          }}
        />
      )}
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
