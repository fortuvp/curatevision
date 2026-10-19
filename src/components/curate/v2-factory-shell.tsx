import React from 'react'
import styled, { css } from 'styled-components'
import { CurateIcon } from 'components/curate/icons'

/*
 * Layout for the list factory: a horizontal stepper whose progress bar
 * slides as the wizard advances, the step panel with its action bar beside
 * a sticky preview column. Colors, type and radii come only from the tokens.
 */

export type FactoryStepDescriptor = {
  title: string
  description: string
  subitems?: string[]
}

type StepStatus = 'complete' | 'active' | 'upcoming'

const EASE_OUT = 'var(--ease-out)'

/** Stepper on top, the work below: one column at every width. */
export const FactoryWizardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  width: 100%;
  min-width: 0;

  @media (max-width: 720px) {
    gap: 20px;
  }
`

/**
 * The step panel beside a sticky preview column; stacked below 1080px. The
 * panel column stretches to the row, so a short step ends on the preview's
 * baseline with its action bar at the bottom.
 */
export const FactorySplit = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 392px;
  gap: 24px;
  align-items: stretch;

  @media (max-width: 1080px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
`

export const FactoryAside = styled.aside`
  position: sticky;
  top: calc(var(--app-bar-height) + 20px);
  align-self: start;
  min-width: 0;

  @media (max-width: 1080px) {
    position: static;
  }
`

/* ---------- Horizontal stepper ---------- */

const Stepper = styled.nav`
  position: relative;
  width: 100%;
  min-width: 0;
`

const Track = styled.div<{ $count: number }>`
  position: absolute;
  top: 17px;
  left: calc(100% / ${({ $count }) => $count * 2});
  right: calc(100% / ${({ $count }) => $count * 2});
  height: 2px;
  border-radius: var(--radius-pill);
  background: var(--glass-border);

  @media (max-width: 720px) {
    top: 14px;
  }
`

const Fill = styled.span`
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--progress, 0) * 100%);
  border-radius: inherit;
  background: linear-gradient(90deg, var(--aurora-b), var(--color-primary));
  box-shadow: 0 0 14px color-mix(in srgb, var(--color-primary) 70%, transparent);
  transition: width 900ms ${EASE_OUT};

  /* The live head: the brightest point is where the wizard is now. */
  &::after {
    content: '';
    position: absolute;
    top: 50%;
    right: -4px;
    width: 8px;
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--color-primary);
    box-shadow:
      0 0 0 4px color-mix(in srgb, var(--color-primary) 22%, transparent),
      0 0 16px var(--color-primary);
    transform: translateY(-50%);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Nodes = styled.ol<{ $count: number }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
`

const Node = styled.li`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  text-align: center;
`

const nodeInner = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: center;

  @media (max-width: 720px) {
    gap: 8px;
  }
`

const NodeBody = styled.div`
  ${nodeInner}
`

const NodeButton = styled.button`
  ${nodeInner}
  cursor: pointer;
  border-radius: var(--radius);

  &:hover span[data-marker] {
    transform: translateY(-1px);
    box-shadow:
      0 0 0 5px color-mix(in srgb, var(--color-primary) 14%, transparent),
      0 8px 20px -10px var(--color-primary);
  }

  &:hover span[data-title] {
    color: var(--color-primary);
  }
`

const markerTone = {
  upcoming: css`
    border-color: var(--glass-border);
    background: var(--color-surface);
    color: var(--color-faint);
  `,
  active: css`
    border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
    background: var(--color-primary-fill);
    color: var(--color-on-primary);
    box-shadow:
      0 0 0 6px var(--color-primary-soft),
      0 10px 28px -8px var(--color-primary);
  `,
  complete: css`
    border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
    background:
      linear-gradient(var(--color-primary-soft), var(--color-primary-soft)),
      var(--color-surface);
    color: var(--color-primary);
  `,
}

const Marker = styled.span<{ $status: StepStatus }>`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid;
  border-radius: var(--radius-pill);
  font-size: 14px;
  line-height: 1;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition:
    background 320ms ${EASE_OUT},
    border-color 320ms ${EASE_OUT},
    box-shadow 320ms ${EASE_OUT},
    color 320ms ${EASE_OUT},
    transform var(--motion);
  ${({ $status }) => markerTone[$status]}

  @media (max-width: 720px) {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }
`

const NodeTitle = styled.span<{ $status: StepStatus }>`
  display: block;
  max-width: 100%;
  overflow: hidden;
  color: ${({ $status }) =>
    $status === 'upcoming' ? 'var(--color-muted)' : 'var(--color-text)'};
  font-size: 15px;
  line-height: 20px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color var(--motion);

  @media (max-width: 720px) {
    font-size: 13px;
    line-height: 18px;
  }
`

const NodeMeta = styled.span`
  display: block;
  max-width: 100%;
  margin-top: 4px;
  overflow: hidden;
  color: var(--color-faint);
  font-size: 13px;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 720px) {
    display: none;
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

/** Where the bar ends: the active group plus the share of its sub-steps done. */
const progressOf = (
  currentStep: number,
  steps: FactoryStepDescriptor[],
  activeSubitem?: string,
): number => {
  if (steps.length < 2) return 1
  const active = steps[currentStep - 1]
  const subIndex =
    active?.subitems && activeSubitem
      ? active.subitems.indexOf(activeSubitem)
      : -1
  const within =
    subIndex > 0 && active?.subitems ? subIndex / active.subitems.length : 0
  return Math.min(
    1,
    Math.max(0, (currentStep - 1 + within) / (steps.length - 1)),
  )
}

export const FactoryStepTimeline = ({
  currentStep,
  steps,
  activeSubitem,
  onSelectStep,
}: {
  /** 1-based index of the active group. */
  currentStep: number
  steps: FactoryStepDescriptor[]
  /**
   * The sub-step inside the active group: it only moves the progress bar;
   * the step panel's own tabs name it.
   */
  activeSubitem?: string
  /** Called with a 1-based group number when a completed group is clicked. */
  onSelectStep?: (stepNumber: number) => void
}) => {
  const progress = progressOf(currentStep, steps, activeSubitem)
  return (
    <Stepper aria-label="Steps">
      <Track $count={steps.length} aria-hidden>
        <Fill style={{ ['--progress' as string]: progress }} />
      </Track>
      <Nodes $count={steps.length}>
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const status: StepStatus =
            stepNumber < currentStep
              ? 'complete'
              : stepNumber === currentStep
                ? 'active'
                : 'upcoming'
          const clickable = !!onSelectStep && status === 'complete'
          const body = (
            <>
              <Marker $status={status} data-marker aria-hidden>
                {status === 'complete' ? (
                  <CurateIcon name="check" size={16} />
                ) : (
                  stepNumber
                )}
              </Marker>
              <span style={{ minWidth: 0, maxWidth: '100%' }}>
                <NodeTitle $status={status} data-title>
                  {step.title}
                  {status === 'complete' && (
                    <VisuallyHidden> (done)</VisuallyHidden>
                  )}
                </NodeTitle>
                <NodeMeta>
                  {status === 'complete' ? 'Done' : step.description}
                </NodeMeta>
              </span>
            </>
          )

          return (
            <Node
              key={step.title}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              {clickable ? (
                <NodeButton
                  type="button"
                  aria-label={`Go back to ${step.title}`}
                  onClick={() => onSelectStep?.(stepNumber)}
                >
                  {body}
                </NodeButton>
              ) : (
                <NodeBody>{body}</NodeBody>
              )}
            </Node>
          )
        })}
      </Nodes>
    </Stepper>
  )
}

/**
 * Reset on the left, Previous and Next on the right; sticky at the bottom on
 * phones. `$inPanel` places it at the foot of a 20px-padded step panel (a
 * hairline above it on desktop, the panel's own edges on phones; in a
 * stretched panel it sits at the bottom); without it the bar sits under the
 * form at page level.
 */
export const FactoryActions = styled.div<{ $inPanel?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: ${({ $inPanel }) => ($inPanel ? '28px' : '16px')};
  ${({ $inPanel }) =>
    $inPanel &&
    css`
      flex: 0 0 auto;
      padding-top: 20px;
      border-top: 1px solid var(--glass-border);
    `}

  @media (max-width: 720px) {
    position: sticky;
    bottom: 0;
    z-index: 3;
    background: var(--color-surface);
    ${({ $inPanel }) =>
      $inPanel
        ? css`
            margin: 24px -20px -20px;
            padding: 12px 20px calc(12px + env(safe-area-inset-bottom));
            border-radius: 0 0 var(--radius-lg) var(--radius-lg);
            box-shadow: 0 -12px 24px -16px var(--color-bg);
          `
        : css`
            margin: 16px calc(-1 * var(--horizontal-padding)) 0;
            padding: 12px var(--horizontal-padding)
              calc(12px + env(safe-area-inset-bottom));
            border-top: 1px solid var(--glass-border);
          `}
  }
`

export const FactoryActionGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
`
