import React from 'react'
import styled from 'styled-components'
import { CurateIcon } from 'components/curate/icons'

/*
 * Three-step stepper for a process that takes several transactions and a
 * wait: Withdraw → Withdrawing → Execute withdrawal. Steps are done, current
 * or upcoming; the current one is the only one in the action color. Done
 * steps are filled with the text color, the connector stays on the border.
 */

export type StepState = 'done' | 'current' | 'upcoming'

export interface StepperStep {
  title: string
  detail?: React.ReactNode
  state: StepState
}

const List = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Item = styled.li<{ $state: StepState; $last: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: ${({ $last }) => ($last ? 0 : '14px')};

  &::before {
    content: '';
    position: absolute;
    top: 22px;
    bottom: 0;
    left: 10px;
    width: 2px;
    background: var(--color-border);
    display: ${({ $last }) => ($last ? 'none' : 'block')};
  }
`

const Marker = styled.span<{ $state: StepState }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: var(--radius-pill);
  border: 2px solid
    ${({ $state }) =>
      $state === 'done'
        ? 'var(--color-text)'
        : $state === 'current'
          ? 'var(--color-primary)'
          : 'var(--color-border-strong)'};
  background: ${({ $state }) =>
    $state === 'done' ? 'var(--color-text)' : 'var(--color-surface)'};
  color: ${({ $state }) =>
    $state === 'done'
      ? 'var(--color-surface)'
      : $state === 'current'
        ? 'var(--color-primary)'
        : 'var(--color-faint)'};
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: 500;
`

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-top: 1px;
`

const StepTitle = styled.span<{ $state: StepState }>`
  color: ${({ $state }) =>
    $state === 'upcoming' ? 'var(--color-muted)' : 'var(--color-text)'};
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: ${({ $state }) => ($state === 'current' ? 600 : 500)};
`

const StepDetail = styled.span`
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

export const Stepper = ({
  steps,
  label,
}: {
  steps: StepperStep[]
  label: string
}) => (
  <List aria-label={label}>
    {steps.map((step, index) => (
      <Item
        key={step.title}
        $state={step.state}
        $last={index === steps.length - 1}
        aria-current={step.state === 'current' ? 'step' : undefined}
      >
        <Marker $state={step.state} aria-hidden>
          {step.state === 'done' ? (
            <CurateIcon name="check" size={12} />
          ) : (
            index + 1
          )}
        </Marker>
        <Copy>
          <StepTitle $state={step.state}>{step.title}</StepTitle>
          {step.detail && <StepDetail>{step.detail}</StepDetail>}
        </Copy>
      </Item>
    ))}
  </List>
)

/** The stages a Stake Curate withdrawal moves through. */
export type WithdrawalStage = 'listed' | 'withdrawing' | 'ready' | 'withdrawn'

export const withdrawalSteps = (
  stage: WithdrawalStage,
  details: {
    withdraw?: React.ReactNode
    withdrawing?: React.ReactNode
    execute?: React.ReactNode
  } = {},
): StepperStep[] => {
  const order: WithdrawalStage[] = [
    'listed',
    'withdrawing',
    'ready',
    'withdrawn',
  ]
  const position = order.indexOf(stage)
  const stateAt = (step: number): StepState =>
    position > step ? 'done' : position === step ? 'current' : 'upcoming'
  return [
    { title: 'Withdraw', detail: details.withdraw, state: stateAt(0) },
    { title: 'Withdrawing', detail: details.withdrawing, state: stateAt(1) },
    {
      title: 'Execute withdrawal',
      detail: details.execute,
      state: stage === 'withdrawn' ? 'done' : stateAt(2),
    },
  ]
}

export default Stepper
