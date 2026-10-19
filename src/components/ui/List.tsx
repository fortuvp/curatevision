import React from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, kitRadius, skeletonBlock } from './kit-styles'

/*
 * List, v2: rows of 52px (44 small, 64 large) split by inset hairlines; a
 * hovered row lifts onto a raised fill. Bordered lists sit in a glass well.
 */
const ListWrapper = styled.div<{ $bordered?: boolean }>`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  background: transparent;
  border-radius: ${kitRadius.well};

  ${({ $bordered }) =>
    $bordered &&
    css`
      padding: 4px;
      border: 1px solid var(--glass-border);
      background: var(--color-raised);
    `}
`

const ListHeader = styled.div`
  padding: 12px 16px;
  border-bottom: 1px solid var(--glass-border);
  color: var(--color-text);
  font-size: var(--fs-body-lg);
  line-height: var(--lh-body-lg);
  font-weight: 500;
`

const ListFooter = styled.div`
  padding: 12px 16px;
  border-top: 1px solid var(--glass-border);
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const ListContentWrapper = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`

const sizeMap: Record<string, ReturnType<typeof css>> = {
  small: css`
    min-height: 44px;
    padding: 8px 12px;
  `,
  default: css`
    min-height: 52px;
    padding: 10px 14px;
  `,
  large: css`
    min-height: 64px;
    padding: 14px 16px;
  `,
}

const ListItemWrapper = styled.li<{ $size?: string; $split?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: var(--radius);
  transition: background var(--dur-hover) var(--ease-out);
  ${({ $size }) => sizeMap[$size || 'default'] || sizeMap.default}

  &:hover {
    background: var(--color-raised);
  }

  ${({ $split }) =>
    $split &&
    css`
      &:not(:last-child)::after {
        content: '';
        position: absolute;
        right: 14px;
        bottom: 0;
        left: 14px;
        border-bottom: 1px solid var(--glass-border);
        transition: opacity var(--dur-hover) var(--ease-out);
      }

      &:hover::after {
        opacity: 0;
      }
    `}
`

const ListItemContent = styled.div`
  flex: 1;
  min-width: 0;
`

const ListItemActions = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  gap: 12px;
`

const MetaWrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
`

const MetaAvatar = styled.div`
  flex: 0 0 auto;
`

const MetaDetail = styled.div`
  flex: 1;
  min-width: 0;
`

const MetaTitle = styled.div`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
`

const MetaDescription = styled.div`
  margin-top: 2px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const LoadingRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;

  &:not(:last-child) {
    border-bottom: 1px solid var(--glass-border);
  }
`

const LoadingLine = styled.div<{ $width: string }>`
  ${skeletonBlock}
  height: 12px;
  border-radius: var(--radius-pill);
  width: ${({ $width }) => $width};
`

interface MetaProps {
  title?: React.ReactNode
  description?: React.ReactNode
  avatar?: React.ReactNode
}

const Meta: React.FC<MetaProps> = ({ title, description, avatar }) => (
  <MetaWrapper className="ui-list-item-meta">
    {avatar && (
      <MetaAvatar className="ui-list-item-meta-avatar">{avatar}</MetaAvatar>
    )}
    <MetaDetail className="ui-list-item-meta-content">
      {title && (
        <MetaTitle className="ui-list-item-meta-title">{title}</MetaTitle>
      )}
      {description && (
        <MetaDescription className="ui-list-item-meta-description">
          {description}
        </MetaDescription>
      )}
    </MetaDetail>
  </MetaWrapper>
)

Meta.displayName = 'List.Item.Meta'

interface ListItemProps {
  actions?: React.ReactNode[]
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  $size?: string
  $split?: boolean
}

interface ListItemComponent extends React.FC<ListItemProps> {
  Meta: React.FC<MetaProps>
}

const ListItem: ListItemComponent = ({
  actions,
  children,
  style,
  className,
  $size,
  $split,
}) => (
  <ListItemWrapper
    $size={$size}
    $split={$split}
    style={style}
    className={joinClassNames('ui-list-item', className)}
  >
    <ListItemContent className="ui-list-item-content">
      {children}
    </ListItemContent>
    {actions && actions.length > 0 && (
      <ListItemActions className="ui-list-item-actions">
        {actions.map((action, i) => (
          <span key={i}>{action}</span>
        ))}
      </ListItemActions>
    )}
  </ListItemWrapper>
)

ListItem.displayName = 'List.Item'
ListItem.Meta = Meta

interface ListProps {
  bordered?: boolean
  dataSource?: unknown[]
  renderItem?: (item: unknown, index: number) => React.ReactNode
  loading?: boolean
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  size?: string
  header?: React.ReactNode
  footer?: React.ReactNode
  split?: boolean
}

interface ListComponent extends React.FC<ListProps> {
  Item: ListItemComponent
}

const List: ListComponent = ({
  bordered = false,
  dataSource,
  renderItem,
  loading = false,
  children,
  style,
  className,
  size = 'default',
  header,
  footer,
  split = true,
}) => {
  let content: React.ReactNode

  if (loading)
    content = (
      <div className="ui-list-loading" aria-busy="true">
        {[0, 1, 2].map((row) => (
          <LoadingRow key={row}>
            <LoadingLine $width="42%" />
            <LoadingLine $width="76%" />
          </LoadingRow>
        ))}
      </div>
    )
  else if (dataSource && renderItem)
    content = (
      <ListContentWrapper>
        {dataSource.map((item, index) => {
          const rendered = renderItem(item, index) as React.ReactElement
          if (rendered && rendered.type === ListItem)
            return React.cloneElement(rendered, {
              key: rendered.key || index,
              $size: size,
              $split: split,
            })

          return (
            <ListItemWrapper
              key={index}
              className="ui-list-item"
              $size={size}
              $split={split}
            >
              <ListItemContent className="ui-list-item-content">
                {rendered}
              </ListItemContent>
            </ListItemWrapper>
          )
        })}
      </ListContentWrapper>
    )
  else if (children)
    content = (
      <ListContentWrapper>
        {React.Children.map(children, (child, index) => {
          const element = child as React.ReactElement
          if (element && element.type === ListItem)
            return React.cloneElement(element, {
              key: element.key || index,
              $size: size,
              $split: split,
            })

          return child
        })}
      </ListContentWrapper>
    )

  return (
    <ListWrapper
      $bordered={bordered}
      style={style}
      className={joinClassNames(
        'ui-list',
        bordered && 'ui-list-bordered',
        `ui-list-${size}`,
        className,
      )}
    >
      {header && <ListHeader className="ui-list-header">{header}</ListHeader>}
      {content}
      {footer && <ListFooter className="ui-list-footer">{footer}</ListFooter>}
    </ListWrapper>
  )
}

List.Item = ListItem

export default List
