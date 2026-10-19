import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames, kitType } from './kit-styles'

/*
 * Stepper, v2: 28px round nodes joined by a 2px track. The track fills in the
 * action color behind every finished step and the fill slides along to the
 * current node, which glows; finished nodes carry a check, waiting nodes stay
 * hollow. The fill is the measure: how far through the steps you are.
 * Horizontal on wide screens; under 600px a horizontal stepper stacks
 * vertically (SPEC 7.4) so its titles never collide.
 */
const NARROW = '(max-width: 599px)'

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
          gap: 10px;

          @media ${NARROW} {
            flex-direction: column;
            gap: 0;
          }
        `}
`

/*
 * Horizontal: a grid puts the node and its track on one line and the words
 * under the node, so the track reads as one continuous rail.
 */
const StepItem = styled.div<{ $isLast?: boolean; $direction?: string }>`
  min-width: 0;
  flex: ${({ $isLast }) => ($isLast ? '0 1 auto' : '1 1 0')};
  ${({ $direction }) =>
    $direction === 'vertical'
      ? css`
          display: flex;
          align-items: flex-start;
          gap: 12px;
          flex: 0 0 auto;
          min-height: 60px;
        `
      : css`
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          grid-template-areas:
            'node tail'
            'body body';
          align-items: center;
          column-gap: 10px;

          > .ui-steps-icon {
            grid-area: node;
          }

          > .ui-steps-tail {
            grid-area: tail;
          }

          > :not(.ui-steps-icon):not(.ui-steps-tail) {
            grid-area: body;
            padding-right: 12px;
            padding-top: 10px;
          }

          /* Narrow: node over its track on the left, words beside them. */
          @media ${NARROW} {
            flex: 0 0 auto;
            grid-template-areas:
              'node body'
              'tail body';
            grid-template-rows: auto 1fr;
            align-items: start;
            column-gap: 12px;

            > .ui-steps-tail {
              justify-self: center;
            }

            > :not(.ui-steps-icon):not(.ui-steps-tail) {
              padding: 4px 0 18px;
            }
          }
        `}
`

const nodePop = keyframes`
  from { transform: scale(0.6); }
  to { transform: scale(1); }
`

const statusStyles: Record<string, ReturnType<typeof css>> = {
  wait: css`
    border-color: var(--color-border-strong);
    background: transparent;
    color: var(--color-faint);
  `,
  process: css`
    border-color: transparent;
    background: var(--color-primary-fill);
    color: var(--color-on-primary);
    box-shadow:
      0 0 0 4px var(--color-primary-soft),
      0 0 18px color-mix(in srgb, var(--color-primary) 55%, transparent);
    animation: ${nodePop} 420ms var(--ease-spring) both;
  `,
  finish: css`
    border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
    background: var(--color-primary-soft);
    color: var(--color-primary);
  `,
  error: css`
    border-color: color-mix(in srgb, var(--color-danger) 55%, transparent);
    background: var(--color-danger-soft);
    color: var(--color-danger);
    box-shadow: 0 0 0 4px var(--color-danger-soft);
  `,
}

const StepCircle = styled.div<{ $status?: string }>`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border: 1px solid;
  border-radius: var(--radius-pill);
  font-family: var(--font-figure);
  font-size: ${kitType.meta};
  line-height: 1;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  transition:
    background var(--dur-control) var(--ease-out),
    border-color var(--dur-control) var(--ease-out),
    box-shadow var(--dur-control) var(--ease-out),
    color var(--dur-control) var(--ease-out);
  ${({ $status }) => statusStyles[$status || 'wait'] || statusStyles.wait}

  svg {
    display: block;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

/* Track segment; its fill slides in from the start when the step is done. */
const StepTail = styled.div<{ $direction?: string; $done?: boolean }>`
  position: relative;
  flex: 1;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--color-raised);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: var(--color-primary);
    box-shadow: 0 0 10px
      color-mix(in srgb, var(--color-primary) 60%, transparent);
    transition: transform var(--dur-panel) var(--ease-in-out);
  }

  ${({ $direction, $done }) =>
    $direction === 'vertical'
      ? css`
          width: 2px;
          min-height: 24px;
          margin: 6px 0;

          &::after {
            transform-origin: top;
            transform: scaleY(${$done ? 1 : 0});
          }
        `
      : css`
          height: 2px;
          min-width: 16px;

          &::after {
            transform-origin: left;
            transform: scaleX(${$done ? 1 : 0});
          }

          @media ${NARROW} {
            align-self: stretch;
            width: 2px;
            height: auto;
            min-width: 0;
            min-height: 16px;
            margin: 6px 0;

            &::after {
              transform-origin: top;
              transform: scaleY(${$done ? 1 : 0});
            }
          }
        `}

  @media (prefers-reduced-motion: reduce) {
    &::after {
      transition: none;
    }
  }
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
  padding-top: 4px;
  ${({ $direction }) =>
    $direction === 'vertical' &&
    css`
      padding-bottom: 18px;
    `}
`

/* Titles wrap rather than run into the next step. */
const StepTitle = styled.span<{ $status?: string }>`
  color: ${({ $status }) =>
    $status === 'wait' ? 'var(--color-muted)' : 'var(--color-text)'};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  overflow-wrap: anywhere;
  text-wrap: balance;
  transition: color var(--dur-control) var(--ease-out);
`

const StepDescription = styled.div`
  max-width: 180px;
  color: var(--color-faint);
  font-size: ${kitType.meta};
  line-height: ${kitType.metaLine};

  @media ${NARROW} {
    max-width: none;
  }
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
      role="group"
      aria-label={
        items.length > 0
          ? `Step ${Math.min(current + 1, items.length)} of ${items.length}`
          : undefined
      }
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
