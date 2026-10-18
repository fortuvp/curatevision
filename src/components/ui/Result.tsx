import React from 'react'
import styled from 'styled-components'
import { KitIcon, type KitIconName } from './kit-icons'
import { joinClassNames } from './kit-styles'

type ResultStatus = 'success' | 'error' | 'warning' | 'info'

const STATUS: Record<ResultStatus, { color: string; icon: KitIconName }> = {
  success: { color: 'var(--color-success)', icon: 'check-circle' },
  error: { color: 'var(--color-danger)', icon: 'error-circle' },
  warning: { color: 'var(--color-warning)', icon: 'warning-triangle' },
  info: { color: 'var(--color-primary)', icon: 'info-circle' },
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  text-align: center;
`

const IconWrapper = styled.div<{ $color: string }>`
  display: inline-flex;
  margin-bottom: 16px;
  color: ${({ $color }) => $color};
`

const Title = styled.div`
  color: var(--color-text);
  font-size: var(--fs-subheading);
  line-height: var(--lh-subheading);
  font-weight: 600;
  overflow-wrap: anywhere;
`

const SubTitle = styled.div`
  max-width: 48ch;
  margin-top: 6px;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
`

const Extra = styled.div`
  margin-top: 20px;
`

interface ResultProps {
  status?: ResultStatus
  title?: React.ReactNode
  subTitle?: React.ReactNode
  extra?: React.ReactNode
  icon?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  [key: string]: unknown
}

const Result: React.FC<ResultProps> = ({
  status = 'info',
  title,
  subTitle,
  extra,
  icon,
  className,
  ...rest
}) => {
  const role = STATUS[status] || STATUS.info

  return (
    <Wrapper
      className={joinClassNames('ui-result', `ui-result-${status}`, className)}
      {...rest}
    >
      <IconWrapper className="ui-result-icon" $color={role.color}>
        {icon || <KitIcon name={role.icon} size={32} />}
      </IconWrapper>
      {title && <Title className="ui-result-title">{title}</Title>}
      {subTitle && (
        <SubTitle className="ui-result-subtitle">{subTitle}</SubTitle>
      )}
      {extra && <Extra className="ui-result-extra">{extra}</Extra>}
    </Wrapper>
  )
}

export default Result
