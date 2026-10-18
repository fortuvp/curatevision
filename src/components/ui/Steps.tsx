import React from 'react'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames, monoLabel } from './kit-styles'

/*
 * Stepper (DESIGN.md): 24px pill markers with mono numbers, hairline tails.
 * The current step is drawn in the action color, finished steps are filled
 * with it and carry a check, waiting steps stay muted.
 */
const StepsWrapper = styled.div<{ $direction?: string }>`
  display: flex;
  width: 100%;
  ${({ $direction }) =>
    $direction === 'vertical'
      ? css`
          flex-direction: column;
        `
      : css`
          flex-direction: row;
          align-items: flex-start;
          gap: 8px;
        `}
`

const StepItem = styled.div<{ $isLast?: boolean; $direction?: string }>`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
  flex: ${({ $isLast }) => ($isLast ? '0 0 auto' : '1 1 0')};
  ${({ $direction }) =>
    $direction === 'vertical' &&
    css`
      flex: 0 0 auto;
      min-height: 56px;
    `}
`

const statusStyles: Record<string, ReturnType<typeof css>> = {
  wait: css`
    border-color: var(--color-border-strong);
    background: var(--color-surface);
    color: var(--color-muted);
  `,
  process: css`
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    color: var(--color-primary);
  `,
  finish: css`
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-on-primary);
  `,
  error: css`
    border-color: var(--color-danger);
    background: var(--color-danger-soft);
    color: var(--color-danger);
  `,
}

const StepCircle = styled.div<{ $status?: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border: 1px solid;
  border-radius: var(--radius-pill);
  ${monoLabel}
  letter-spacing: 0;
  transition:
    background var(--motion),
    border-color var(--motion),
    color var(--motion);
  ${({ $status }) => statusStyles[$status || 'wait'] || statusStyles.wait}

  svg {
    display: block;
  }
`

const StepTail = styled.div<{ $direction?: string; $done?: boolean }>`
  flex: 1;
  background: ${({ $done }) =>
    $done ? 'var(--color-primary)' : 'var(--color-border)'};
  transition: background var(--motion);
  ${({ $direction }) =>
    $direction === 'vertical'
      ? css`
          width: 1px;
          min-height: 24px;
          margin: 4px 0;
        `
      : css`
          height: 1px;
          min-width: 16px;
          margin-top: 12px;
        `}
`

const StepColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  align-self: stretch;
`

const StepBody = styled.div<{ $direction?: string }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-top: 2px;
  ${({ $direction }) =>
    $direction === 'vertical' &&
    css`
      padding-bottom: 16px;
    `}
`

const StepTitle = styled.span<{ $status?: string }>`
  color: ${({ $status }) =>
    $status === 'wait' ? 'var(--color-muted)' : 'var(--color-text)'};
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
  white-space: nowrap;
  transition: color var(--motion);
`

const StepDescription = styled.div`
  max-width: 160px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

interface StepProps {
  title?: React.ReactNode
  description?: React.ReactNode
  icon?: React.ReactNode
  status?: string
  $index?: number
  $direction?: string
  $isLast?: boolean
}

const Step: React.FC<StepProps> = ({
  title,
  description,
  icon,
  status = 'wait',
  $index = 0,
  $direction,
  $isLast,
}) => {
  const marker =
    icon ||
    (status === 'finish' ? <KitIcon name="check" size={14} /> : $index + 1)
  const className = joinClassNames('ui-steps-item', `ui-steps-item-${status}`)
  const current = status === 'process' ? 'step' : undefined

  if ($direction === 'vertical')
    return (
      <StepItem
        className={className}
        $direction={$direction}
        $isLast={$isLast}
        aria-current={current}
      >
        <StepColumn>
          <StepCircle className="ui-steps-icon" $status={status}>
            {marker}
          </StepCircle>
          {!$isLast && (
            <StepTail
              className="ui-steps-tail"
              $direction={$direction}
              $done={status === 'finish'}
            />
          )}
        </StepColumn>
        <StepBody $direction={$direction}>
          <StepTitle className="ui-steps-title" $status={status}>
            {title}
          </StepTitle>
          {description && (
            <StepDescription className="ui-steps-description">
              {description}
            </StepDescription>
          )}
        </StepBody>
      </StepItem>
    )

  return (
    <StepItem className={className} $isLast={$isLast} aria-current={current}>
      <StepCircle className="ui-steps-icon" $status={status}>
        {marker}
      </StepCircle>
      <StepBody>
        <StepTitle className="ui-steps-title" $status={status}>
          {title}
        </StepTitle>
        {description && (
          <StepDescription className="ui-steps-description">
            {description}
          </StepDescription>
        )}
      </StepBody>
      {!$isLast && (
        <StepTail className="ui-steps-tail" $done={status === 'finish'} />
      )}
    </StepItem>
  )
}

Step.displayName = 'Steps.Step'

interface StepsProps {
  current?: number
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  direction?: string
}

interface StepsComponent extends React.FC<StepsProps> {
  Step: React.FC<StepProps>
}

const Steps: StepsComponent = ({
  current = 0,
  children,
  style,
  className,
  direction = 'horizontal',
}) => {
  const items = React.Children.toArray(children)

  return (
    <StepsWrapper
      $direction={direction}
      style={style}
      className={joinClassNames('ui-steps', `ui-steps-${direction}`, className)}
    >
      {items.map((child, index) => {
        const element = child as React.ReactElement
        let status = element.props.status
        if (!status)
          if (index < current) status = 'finish'
          else if (index === current) status = 'process'
          else status = 'wait'

        return React.cloneElement(element, {
          key: index,
          $index: index,
          $direction: direction,
          $isLast: index === items.length - 1,
          status,
        })
      })}
    </StepsWrapper>
  )
}

Steps.Step = Step

export { Step }
export default Steps
