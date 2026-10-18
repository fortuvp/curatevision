import React from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, skeletonBlock } from './kit-styles'

/*
 * Card (DESIGN.md, Elevation): a surface on the page with a hairline and
 * radius 6; depth comes from the border, the token shadow is none in dark.
 */
const StyledCard = styled.div<{ $bordered?: boolean; $hoverable?: boolean }>`
  position: relative;
  min-width: 0;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid
    ${({ $bordered }) => ($bordered ? 'var(--color-border)' : 'transparent')};
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  color: var(--color-text);
  transition:
    border-color var(--motion),
    box-shadow var(--motion);

  ${({ $hoverable }) =>
    $hoverable &&
    css`
      cursor: pointer;

      &:hover {
        border-color: var(--color-border-strong);
        box-shadow: var(--shadow-card-hover);
      }
    `}
`

const CardHead = styled.div`
  display: flex;
  align-items: center;
  min-height: 56px;
  padding: 12px 20px;
  border-bottom: 1px solid var(--color-border);
`

const CardHeadWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  min-width: 0;
`

const CardHeadTitle = styled.div`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--fs-subheading);
  line-height: var(--lh-subheading);
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const CardExtra = styled.div`
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const CardBody = styled.div`
  padding: 20px;
  color: var(--color-text);
`

const CardActions = styled.div`
  display: flex;
  align-items: stretch;
  border-top: 1px solid var(--color-border);

  > * {
    display: inline-flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    padding: 0 12px;
    color: var(--color-muted);
    text-align: center;
    cursor: pointer;
    transition:
      color var(--motion),
      background var(--motion);

    &:not(:last-child) {
      border-right: 1px solid var(--color-border);
    }

    &:hover {
      color: var(--color-text);
      background: var(--color-raised);
    }
  }
`

const SkeletonLine = styled.div<{ $width?: string }>`
  ${skeletonBlock}
  height: 14px;
  width: ${({ $width }) => $width || '100%'};
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }
`

const SkeletonContent = () => (
  <div className="ui-card-loading" aria-busy="true">
    <SkeletonLine $width="38%" />
    <SkeletonLine $width="100%" />
    <SkeletonLine $width="61%" />
    <SkeletonLine $width="80%" />
  </div>
)

// Card.Meta sub-component
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
  overflow: hidden;
`

const MetaTitle = styled.div`
  overflow: hidden;
  color: var(--color-text);
  font-size: var(--fs-body-lg);
  line-height: var(--lh-body-lg);
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const MetaDescription = styled.div`
  margin-top: 2px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

interface CardMetaProps {
  title?: React.ReactNode
  description?: React.ReactNode
  avatar?: React.ReactNode
}

const Meta: React.FC<CardMetaProps> = ({ title, description, avatar }) => (
  <MetaWrapper className="ui-card-meta">
    {avatar && (
      <MetaAvatar className="ui-card-meta-avatar">{avatar}</MetaAvatar>
    )}
    <MetaDetail className="ui-card-meta-detail">
      {title && <MetaTitle className="ui-card-meta-title">{title}</MetaTitle>}
      {description && (
        <MetaDescription className="ui-card-meta-description">
          {description}
        </MetaDescription>
      )}
    </MetaDetail>
  </MetaWrapper>
)

Meta.displayName = 'Card.Meta'

interface CardProps {
  title?: React.ReactNode
  extra?: React.ReactNode
  actions?: React.ReactNode[] | null | false
  bordered?: boolean
  loading?: boolean
  hoverable?: boolean
  id?: string
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
}

interface CardComponent extends React.FC<CardProps> {
  Meta: React.FC<CardMetaProps>
}

const Card: CardComponent = ({
  title,
  extra,
  actions,
  bordered = true,
  loading = false,
  hoverable = false,
  id,
  style,
  className,
  children,
}) => (
  <StyledCard
    className={joinClassNames(
      'ui-card',
      bordered && 'ui-card-bordered',
      hoverable && 'ui-card-hoverable',
      className,
    )}
    $bordered={bordered}
    $hoverable={hoverable}
    id={id}
    style={style}
  >
    {(title || extra) && (
      <CardHead className="ui-card-head">
        <CardHeadWrapper className="ui-card-head-wrapper">
          {title && (
            <CardHeadTitle className="ui-card-head-title">
              {title}
            </CardHeadTitle>
          )}
          {extra && <CardExtra className="ui-card-extra">{extra}</CardExtra>}
        </CardHeadWrapper>
      </CardHead>
    )}
    <CardBody className="ui-card-body">
      {loading ? <SkeletonContent /> : children}
    </CardBody>
    {actions && actions.length > 0 && (
      <CardActions className="ui-card-actions">
        {actions.map((action, i) => (
          <span key={i}>{action}</span>
        ))}
      </CardActions>
    )}
  </StyledCard>
)

Card.Meta = Meta

export default Card
