import React from 'react'
import styled from 'styled-components'
import { joinClassNames } from './kit-styles'

const BreadcrumbWrapper = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  min-width: 0;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const BreadcrumbSeparator = styled.span`
  margin: 0 8px;
  color: var(--color-faint);
`

const BreadcrumbItemWrapper = styled.span<{ $isLast?: boolean }>`
  display: inline-flex;
  align-items: center;
  min-width: 0;
  color: ${({ $isLast }) =>
    $isLast ? 'var(--color-text)' : 'var(--color-muted)'};
  font-weight: ${({ $isLast }) => ($isLast ? 500 : 400)};
  transition: color var(--motion);

  a {
    color: inherit;
    text-decoration: none;
    transition: color var(--motion);

    &:hover {
      color: var(--color-primary);
    }
  }
`

const ItemButton = styled.button`
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
  transition: color var(--motion);

  &:hover {
    color: var(--color-primary);
  }
`

interface BreadcrumbItemProps {
  children?: React.ReactNode
  href?: string
  onClick?: (e: React.MouseEvent) => void
  style?: React.CSSProperties
  className?: string
  $isLast?: boolean
}

const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  children,
  href,
  onClick,
  style,
  className,
  $isLast,
}) => (
  <BreadcrumbItemWrapper
    $isLast={$isLast}
    style={style}
    className={joinClassNames('ui-breadcrumb-item', className)}
    aria-current={$isLast ? 'page' : undefined}
  >
    {href ? (
      <a href={href} onClick={onClick}>
        {children}
      </a>
    ) : onClick ? (
      <ItemButton type="button" onClick={onClick}>
        {children}
      </ItemButton>
    ) : (
      <span>{children}</span>
    )}
  </BreadcrumbItemWrapper>
)

BreadcrumbItem.displayName = 'Breadcrumb.Item'

interface BreadcrumbProps {
  separator?: React.ReactNode
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface BreadcrumbComponent extends React.FC<BreadcrumbProps> {
  Item: React.FC<BreadcrumbItemProps>
}

const Breadcrumb: BreadcrumbComponent = ({
  separator = '/',
  children,
  style,
  className,
}) => {
  const items = React.Children.toArray(children)

  return (
    <BreadcrumbWrapper
      style={style}
      className={joinClassNames('ui-breadcrumb', className)}
      aria-label="Breadcrumb"
    >
      {items.map((child, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={index}>
            {React.cloneElement(child as React.ReactElement<any>, {
              $isLast: isLast,
            })}
            {!isLast && (
              <BreadcrumbSeparator
                className="ui-breadcrumb-separator"
                aria-hidden
              >
                {separator}
              </BreadcrumbSeparator>
            )}
          </React.Fragment>
        )
      })}
    </BreadcrumbWrapper>
  )
}

Breadcrumb.Item = BreadcrumbItem

export default Breadcrumb
