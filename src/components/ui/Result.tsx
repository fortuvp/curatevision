import React from 'react'
import styled, { keyframes } from 'styled-components'
import { KitIcon, type KitIconName } from './kit-icons'
import { joinClassNames } from './kit-styles'

type ResultStatus = 'success' | 'error' | 'warning' | 'info'

const STATUS: Record<ResultStatus, { color: string; icon: KitIconName }> = {
  success: { color: 'var(--color-success)', icon: 'check-circle' },
  error: { color: 'var(--color-danger)', icon: 'error-circle' },
  warning: { color: 'var(--color-warning)', icon: 'warning-triangle' },
  info: { color: 'var(--color-primary)', icon: 'info-circle' },
}

const pop = keyframes`
  from { transform: scale(0.6); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`

/*
 * Result, v2: the status icon in a glowing disc (it pops in), a display
 * title, one muted line and the next action.
 */
const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 24px;
  text-align: center;
`

const IconWrapper = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  margin-bottom: 18px;
  border: 1px solid
    ${({ $color }) => `color-mix(in srgb, ${$color} 35%, transparent)`};
  border-radius: var(--radius-pill);
  background: radial-gradient(
    circle at 50% 35%,
    ${({ $color }) => `color-mix(in srgb, ${$color} 26%, transparent)`},
    ${({ $color }) => `color-mix(in srgb, ${$color} 8%, transparent)`} 70%
  );
  box-shadow: 0 0 32px -6px
    ${({ $color }) => `color-mix(in srgb, ${$color} 55%, transparent)`};
  color: ${({ $color }) => $color};
  animation: ${pop} 420ms var(--ease-spring) both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

const Title = styled.div`
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 24px;
  line-height: 30px;
  font-weight: 500;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
`

const SubTitle = styled.div`
  max-width: 48ch;
  margin-top: 8px;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
`

const Extra = styled.div`
  margin-top: 22px;
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
        {icon || <KitIcon name={role.icon} size={28} />}
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
