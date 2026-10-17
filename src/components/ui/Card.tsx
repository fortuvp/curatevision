import React from 'react'
import styled, { css, keyframes } from 'styled-components'

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`

const StyledCard = styled.div<{ $bordered?: boolean; $hoverable?: boolean }>`
  background: var(--v2-card);
  border-radius: 3px;
  border: ${({ $bordered, theme }) =>
    $bordered ? `1px solid ${theme.borderColor}` : 'none'};
  box-shadow: var(--v2-shadow);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  overflow: hidden;

  ${({ $hoverable }) =>
    $hoverable &&
    css`
      cursor: pointer;
      &:hover {
        border-color: var(--v2-stroke-strong);
        box-shadow: var(--v2-shadow-hover);
        transform: translateY(-1px);
      }
    `}
`

const CardHead = styled.div`
  background: var(--v2-card);
  border-bottom: 1px solid var(--v2-stroke);
  padding: 16px 18px;
  min-height: 54px;
`

const CardHeadWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const CardHeadTitle = styled.div`
  color: var(--v2-text);
  font-weight: 600;
  font-size: 16px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const CardExtra = styled.div`
  margin-left: auto;
  padding-left: 16px;
  color: var(--v2-text);
`

const CardBody = styled.div`
  padding: 18px;
  color: var(--v2-text);
`

const CardActions = styled.div`
  display: flex;
  align-items: center;
  border-top: 1px solid var(--v2-stroke);

  & > * {
    flex: 1;
    text-align: center;
    padding: 12px 0;
    cursor: pointer;
    transition: color 0.3s;

    &:not(:last-child) {
      border-right: 1px solid var(--v2-stroke);
    }
  }
`

const SkeletonLine = styled.div<{ $height?: string; $width?: string }>`
  height: ${({ $height }) => $height || '16px'};
  width: ${({ $width }) => $width || '100%'};
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    ${({ theme }) => theme.skeletonBase} 25%,
    ${({ theme }) => theme.skeletonHighlight} 37%,
    ${({ theme }) => theme.skeletonBase} 63%
  );
  background-size: 400px 100%;
  animation: ${shimmer} 1.4s ease infinite;
  margin-bottom: 12px;
`

const SkeletonContent = () => (
  <div>
    <SkeletonLine $width="38%" $height="16px" />
    <SkeletonLine $width="100%" $height="16px" />
    <SkeletonLine $width="61%" $height="16px" />
    <SkeletonLine $width="80%" $height="16px" />
  </div>
)

// Card.Meta sub-component
const MetaWrapper = styled.div`
  display: flex;
  align-items: flex-start;
`

const MetaAvatar = styled.div`
  margin-right: 16px;
  flex-shrink: 0;
`

const MetaDetail = styled.div`
  flex: 1;
  overflow: hidden;
`

const MetaTitle = styled.div`
  color: var(--v2-text);
  font-weight: 600;
  font-size: 16px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  margin-bottom: 8px;
`

const MetaDescription = styled.div`
  color: var(--v2-muted);
  font-size: 14px;
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
    className={`ui-card${className ? ` ${className}` : ''}`}
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
