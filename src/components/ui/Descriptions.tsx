import React, { Children, useMemo } from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, kitLabel } from './kit-styles'

interface DescriptionsItemProps {
  label?: React.ReactNode
  span?: number
  children?: React.ReactNode
}

// Descriptions.Item (declarative API)
const Item: React.FC<DescriptionsItemProps> = ({ children }) =>
  children as React.ReactElement
Item.displayName = 'Descriptions.Item'

const DescriptionsWrapper = styled.div`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
`

const Title = styled.div`
  margin-bottom: 14px;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 26px;
  font-weight: 500;
  letter-spacing: -0.02em;
`

/*
 * ---- Bordered layout, v2: key/value rows in one raised well, split by
 * hairlines only (no cell grid). Rows are 48px (40px small). ----
 */
const BorderedTableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid var(--glass-border);
  border-radius: 14px;
  background: var(--color-raised);
`

const BorderedTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`

const rowHeight = ($size?: string) => ($size === 'small' ? '40px' : '48px')

const BorderedLabelCell = styled.th<{ $size?: string }>`
  height: ${({ $size }) => rowHeight($size)};
  padding: 0 16px;
  border-bottom: 1px solid var(--glass-border);
  background: transparent;
  /* Muted, not faint: small text on the raised well needs the stronger role. */
  color: var(--color-muted);
  ${kitLabel}
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
  width: 1%;

  tr:last-child & {
    border-bottom: 0;
  }
`

const BorderedContentCell = styled.td<{ $size?: string }>`
  height: ${({ $size }) => rowHeight($size)};
  padding: ${({ $size }) => ($size === 'small' ? '8px 16px' : '12px 16px')};
  border-bottom: 1px solid var(--glass-border);
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-variant-numeric: tabular-nums;
  vertical-align: middle;
  overflow-wrap: anywhere;

  tr:last-child & {
    border-bottom: 0;
  }
`

/* ---- Plain layout: a small label above each value, in a column grid ---- */
const ListGrid = styled.div<{ $columns?: number }>`
  display: grid;
  grid-template-columns: ${({ $columns }) =>
    `repeat(${$columns || 1}, minmax(0, 1fr))`};
  gap: 16px 20px;

  @media (max-width: 599px) {
    grid-template-columns: minmax(0, 1fr);
  }
`

const ListItem = styled.div<{ $span?: number }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  ${({ $span }) =>
    $span &&
    $span > 1 &&
    css`
      grid-column: span ${$span};

      @media (max-width: 599px) {
        grid-column: auto;
      }
    `}
`

const ListLabel = styled.span`
  ${kitLabel}
  color: var(--color-faint);
`

const ListContent = styled.span`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
`

const getColumnCount = (
  column: number | Record<string, number> | undefined,
  defaultVal = 3,
): number => {
  if (typeof column === 'number') return column
  if (typeof column === 'object' && column !== null) {
    // Simple responsive approach: pick the largest matching breakpoint
    const breakpoints = ['xxl', 'xl', 'lg', 'md', 'sm', 'xs'] as const
    const width = typeof window === 'undefined' ? 1200 : window.innerWidth
    const widthMap: Record<string, number> = {
      xxl: 1600,
      xl: 1200,
      lg: 992,
      md: 768,
      sm: 576,
      xs: 0,
    }
    for (const bp of breakpoints)
      if (column[bp] !== undefined && width >= widthMap[bp]) return column[bp]
  }
  return defaultVal
}

interface DescriptionsProps {
  bordered?: boolean
  column?: number | Record<string, number>
  title?: React.ReactNode
  size?: string
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
}

interface DescriptionsComponent extends React.FC<DescriptionsProps> {
  Item: React.FC<DescriptionsItemProps>
}

const Descriptions: DescriptionsComponent = ({
  bordered = false,
  column = 3,
  title: descTitle,
  size,
  style,
  className,
  children,
}) => {
  const columns = getColumnCount(column)

  // Parse items from children, flattening fragments
  const items = useMemo(() => {
    const result: {
      label: React.ReactNode
      span: number
      content: React.ReactNode
    }[] = []
    const flatten = (node: React.ReactNode) => {
      Children.forEach(node, (child) => {
        if (!child || !React.isValidElement<DescriptionsItemProps>(child))
          return
        // If it's a fragment, recurse into its children
        if (child.type === React.Fragment) {
          flatten(child.props.children)
          return
        }
        if (!child.props) return
        result.push({
          label: child.props.label,
          span: child.props.span || 1,
          content: child.props.children,
        })
      })
    }
    flatten(children)
    return result
  }, [children])

  const rootClassName = joinClassNames(
    'ui-descriptions',
    bordered && 'ui-descriptions-bordered',
    size === 'small' && 'ui-descriptions-small',
    className,
  )

  if (bordered) {
    // Build rows for the table
    const rows: (typeof items)[] = []
    let currentRow: typeof items = []
    let currentSpan = 0

    for (const item of items) {
      if (currentSpan + item.span > columns) {
        rows.push(currentRow)
        currentRow = []
        currentSpan = 0
      }
      currentRow.push(item)
      currentSpan += item.span
      if (currentSpan >= columns) {
        rows.push(currentRow)
        currentRow = []
        currentSpan = 0
      }
    }
    if (currentRow.length > 0) rows.push(currentRow)

    return (
      <DescriptionsWrapper style={style} className={rootClassName}>
        {descTitle && (
          <Title className="ui-descriptions-title">{descTitle}</Title>
        )}
        <BorderedTableWrapper className="ui-descriptions-view">
          <BorderedTable>
            <tbody>
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="ui-descriptions-row">
                  {row.map((item, cellIdx) => (
                    <React.Fragment key={cellIdx}>
                      <BorderedLabelCell
                        className="ui-descriptions-item-label"
                        scope="row"
                        $size={size}
                      >
                        {item.label}
                      </BorderedLabelCell>
                      <BorderedContentCell
                        className="ui-descriptions-item-content"
                        $size={size}
                        colSpan={item.span > 1 ? item.span * 2 - 1 : 1}
                      >
                        {item.content}
                      </BorderedContentCell>
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </BorderedTable>
        </BorderedTableWrapper>
      </DescriptionsWrapper>
    )
  }

  return (
    <DescriptionsWrapper style={style} className={rootClassName}>
      {descTitle && (
        <Title className="ui-descriptions-title">{descTitle}</Title>
      )}
      <ListGrid className="ui-descriptions-view" $columns={columns}>
        {items.map((item, idx) => (
          <ListItem
            key={idx}
            className="ui-descriptions-item"
            $span={item.span}
          >
            <ListLabel className="ui-descriptions-item-label">
              {item.label}
            </ListLabel>
            <ListContent className="ui-descriptions-item-content">
              {item.content}
            </ListContent>
          </ListItem>
        ))}
      </ListGrid>
    </DescriptionsWrapper>
  )
}

Descriptions.Item = Item

export default Descriptions
