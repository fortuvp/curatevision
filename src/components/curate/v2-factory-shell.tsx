import React from 'react'
import styled from 'styled-components'
import { CurateIcon } from 'components/curate/icons'
import { Grid, Statement, Surface } from './primitives'

/*
 * Shared layout for the list factories (Standard and Stake): the step
 * timeline in flow (a column beside the form on desktop, a scrollable row
 * above it on phones), the work area, the action bar and the previous
 * deployments block. Colors, type and radii come only from the tokens.
 */

export type FactoryStepDescriptor = {
  title: string
  description: string
  subitems?: string[]
}

type StepStatus = 'complete' | 'active' | 'upcoming'

export const FactoryPageShell = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--page-max-width);
  margin: 0 auto;
`

/** The page's statement; the factory pages pass their own sentence. */
export const FactoryCreateLabel = styled(Statement)`
  display: block;
  width: 100%;
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 24px var(--horizontal-padding) 0;
`

/**
 * The decorative hero illustration is gone (DESIGN.md: identity through
 * type and structure, never decoration). Kept as a no-op so the Stake
 * factory keeps compiling until its own rewrite drops the call.
 */
export const FactoryHeroImage = () => null

export const FactoryWizardGrid = styled.div`
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  gap: 32px;
  align-items: start;
  width: 100%;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`

const Timeline = styled.nav`
  position: sticky;
  top: calc(var(--app-bar-height) + 16px);
  min-width: 0;

  @media (max-width: 980px) {
    position: static;
  }
`

const StepList = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 980px) {
    flex-direction: row;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 4px;
  }
`

const StepItem = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 20px;

  &::after {
    content: '';
    position: absolute;
    top: 28px;
    bottom: 4px;
    left: 11px;
    width: 1px;
    background: var(--color-border);
  }

  &:last-child {
    padding-bottom: 0;
  }

  &:last-child::after {
    content: none;
  }

  @media (max-width: 980px) {
    flex: 0 0 auto;
    gap: 8px;
    padding-bottom: 0;

    &::after {
      content: none;
    }
  }
`

const StepMarker = styled.span<{ $status: StepStatus }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid
    ${({ $status }) =>
      $status === 'active'
        ? 'var(--color-text)'
        : $status === 'complete'
          ? 'var(--color-border-strong)'
          : 'var(--color-border)'};
  border-radius: var(--radius-pill);
  background: ${({ $status }) =>
    $status === 'active'
      ? 'var(--color-text)'
      : $status === 'complete'
        ? 'var(--color-raised)'
        : 'transparent'};
  color: ${({ $status }) =>
    $status === 'active' ? 'var(--color-surface)' : 'var(--color-muted)'};
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
`

const StepText = styled.div`
  min-width: 0;
`

const StepTitle = styled.span<{ $status: StepStatus }>`
  display: block;
  color: ${({ $status }) =>
    $status === 'active' ? 'var(--color-text)' : 'var(--color-muted)'};
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: ${({ $status }) => ($status === 'active' ? 600 : 500)};
  white-space: nowrap;
`

const StepDescription = styled.span`
  display: block;
  margin-top: 2px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);

  @media (max-width: 980px) {
    display: none;
  }
`

const SubItems = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;

  @media (max-width: 980px) {
    display: none;
  }
`

const SubItem = styled.li<{ $active?: boolean }>`
  color: ${({ $active }) =>
    $active ? 'var(--color-text)' : 'var(--color-faint)'};
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  font-weight: 500;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

export const FactoryStepTimeline = ({
  currentStep,
  steps,
  activeSubitem,
}: {
  /** 1-based index of the active group. */
  currentStep: number
  steps: FactoryStepDescriptor[]
  /** The sub-step inside the active group, when the group has sub-steps. */
  activeSubitem?: string
}) => (
  <Timeline aria-label="Steps">
    <StepList>
      {steps.map((step, index) => {
        const stepNumber = index + 1
        const status: StepStatus =
          stepNumber < currentStep
            ? 'complete'
            : stepNumber === currentStep
              ? 'active'
              : 'upcoming'

        return (
          <StepItem
            key={step.title}
            aria-current={status === 'active' ? 'step' : undefined}
          >
            <StepMarker $status={status} aria-hidden>
              {status === 'complete' ? (
                <CurateIcon name="check" size={14} />
              ) : (
                stepNumber
              )}
            </StepMarker>
            <StepText>
              <StepTitle $status={status}>
                {step.title}
                {status === 'complete' && (
                  <VisuallyHidden> (done)</VisuallyHidden>
                )}
              </StepTitle>
              {step.description && (
                <StepDescription>{step.description}</StepDescription>
              )}
              {step.subitems && step.subitems.length > 0 && (
                <SubItems>
                  {step.subitems.map((subitem) => (
                    <SubItem
                      key={subitem}
                      $active={status === 'active' && subitem === activeSubitem}
                    >
                      {subitem}
                    </SubItem>
                  ))}
                </SubItems>
              )}
            </StepText>
          </StepItem>
        )
      })}
    </StepList>
  </Timeline>
)

/** The form column; the `.ui-card` rules cover the Stake factory's cards. */
export const FactoryWorkArea = styled.div`
  min-width: 0;

  .ui-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
  }

  .ui-card-head {
    min-height: auto;
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
    background: transparent;
  }

  .ui-card-head-title {
    color: var(--color-text);
    font-size: var(--fs-subheading);
    line-height: var(--lh-subheading);
    font-weight: 600;
    text-align: left;
  }

  .ui-card-body {
    padding: 20px;
  }

  form {
    color: var(--color-text);
  }
`

/** Reset on the left, Previous and Next on the right; sticky at the bottom on phones. */
export const FactoryActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 720px) {
    position: sticky;
    bottom: 0;
    z-index: 2;
    margin: 16px calc(-1 * var(--horizontal-padding)) 0;
    padding: 12px var(--horizontal-padding)
      calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
`

export const FactoryActionGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

export const FactoryDeploymentsCard = styled(Surface)`
  margin-top: 32px;
`

export const FactoryDeploymentsHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 0;
    color: var(--color-text);
    font-size: var(--fs-subheading);
    line-height: var(--lh-subheading);
    font-weight: 600;
  }

  span {
    display: block;
    margin-top: 2px;
    color: var(--color-muted);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
  }
`

export const FactoryDeploymentGrid = styled(Grid)``
