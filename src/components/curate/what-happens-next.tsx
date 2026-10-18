import React from 'react'
import styled from 'styled-components'
import { Button, Data, Label, Small, Surface } from './primitives'

/*
 * "What happens next" (DESIGN.md, Components): before any deposit, the
 * possible outcomes as steps with the exact amounts and period, then one
 * confirm button that repeats the amount. The receipt breakdown lives inside.
 */

const Shell = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const Receipt = styled.dl`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 6px 16px;
  margin: 0;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);

  dt {
    color: var(--color-muted);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
  }

  dd {
    margin: 0;
    text-align: right;
  }

  dt.total,
  dd.total {
    padding-top: 6px;
    border-top: 1px solid var(--color-border);
    color: var(--color-text);
    font-weight: 600;
  }
`

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
`

const Step = styled.li<{ $branch?: boolean }>`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  counter-increment: step;
  margin-left: ${({ $branch }) => ($branch ? '34px' : 0)};

  &::before {
    content: counter(step);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-pill);
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 500;
  }
`

const StepTitle = styled.div`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
`

const StepBody = styled.div`
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

export interface ReceiptLine {
  label: string
  value: React.ReactNode
}

export interface OutcomeStep {
  title: string
  body: React.ReactNode
  /** Indent as an alternative branch ("or, if someone challenges…"). */
  branch?: boolean
}

export const WhatHappensNext = ({
  title = 'What happens next',
  receipt,
  total,
  steps,
  confirmLabel,
  onConfirm,
  confirmDisabled,
  confirmBlocker,
  loading,
  policy,
}: {
  title?: string
  receipt: ReceiptLine[]
  /** The exact total that will be sent, repeated on the button. */
  total: React.ReactNode
  steps: OutcomeStep[]
  confirmLabel: string
  onConfirm: () => void
  confirmDisabled?: boolean
  /** Why the button is disabled ("Connect wallet to submit"). */
  confirmBlocker?: string
  loading?: boolean
  policy?: React.ReactNode
}) => (
  <Shell $padding="compact" role="group" aria-label={title}>
    <Label>{title}</Label>
    <Receipt>
      {receipt.map((line) => (
        <React.Fragment key={line.label}>
          <dt>{line.label}</dt>
          <dd>
            <Data>{line.value}</Data>
          </dd>
        </React.Fragment>
      ))}
      <dt className="total">You send now</dt>
      <dd className="total">
        <Data $weight={600}>{total}</Data>
      </dd>
    </Receipt>
    <Steps>
      {steps.map((step) => (
        <Step key={step.title} $branch={step.branch}>
          <div>
            <StepTitle>{step.title}</StepTitle>
            <StepBody>{step.body}</StepBody>
          </div>
        </Step>
      ))}
    </Steps>
    {policy && <Small $muted>{policy}</Small>}
    <Button
      type="button"
      $variant="primary"
      $block
      disabled={confirmDisabled || loading}
      aria-disabled={confirmDisabled || loading}
      title={confirmDisabled ? confirmBlocker : undefined}
      onClick={onConfirm}
    >
      {loading ? 'Waiting for your wallet…' : `${confirmLabel} · `}
      {!loading && total}
    </Button>
    {confirmDisabled && confirmBlocker && (
      <Small $muted role="status">
        {confirmBlocker}
      </Small>
    )}
  </Shell>
)

export default WhatHappensNext
