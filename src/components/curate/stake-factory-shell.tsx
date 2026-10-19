import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { Link } from 'react-router-dom'
import { CurateIcon } from 'components/curate/icons'
import { reveal } from 'components/curate/motion/reveal'

/*
 * Layout for the Stake list factory, composed with the shared factory split
 * (v2-factory-shell): the page head, the group stepper (forward groups the
 * wizard already reached stay clickable), the step panel with its sub-step
 * tabs, the transaction stepper of the deploy step and the rows of lists
 * deployed from this browser. Colors, type and radii come only from the
 * tokens; every entrance respects reduced motion.
 */

/* ---------- Page head ---------- */

export const StakeHead = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px 32px;

  > * {
    ${reveal}
  }
`

export const StakeHeadCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`

export const StakeLede = styled.p`
  margin: 0;
  max-width: 58ch;
  color: var(--color-muted);
  font-size: 16px;
  line-height: 24px;
`

export const StakeLift = styled.div`
  ${reveal}
`

/**
 * The panel column. It does not stretch to the preview's height: a short
 * step ends right under its content, with the action bar beneath it.
 */
export const StakePanelLift = styled(StakeLift)`
  display: flex;
  flex-direction: column;
  align-self: start;
  min-width: 0;
`

/* ---------- Group stepper ---------- */

export type StakeStepGroup = {
  title: string
  description: string
  subitems?: string[]
}

/**
 * complete: every sub-step passed; active: the open group; reached: opened
 * before, not fully passed; upcoming: not reached yet.
 */
export type StakeGroupStatus = 'complete' | 'active' | 'reached' | 'upcoming'

const GroupStepper = styled.nav`
  position: relative;
  width: 100%;
  min-width: 0;
`

const GroupTrack = styled.div<{ $count: number }>`
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

/** How far the wizard has been: a quiet fill under the live one. */
const GroupReach = styled.span`
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--reach, 0) * 100%);
  border-radius: inherit;
  background: color-mix(in srgb, var(--color-primary) 30%, transparent);
  transition: width 900ms var(--ease-out);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const GroupFill = styled.span`
  position: absolute;
  inset: 0 auto 0 0;
  width: calc(var(--progress, 0) * 100%);
  border-radius: inherit;
  background: linear-gradient(90deg, var(--aurora-b), var(--color-primary));
  box-shadow: 0 0 14px color-mix(in srgb, var(--color-primary) 70%, transparent);
  transition: width 900ms var(--ease-out);

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

const GroupNodes = styled.ol<{ $count: number }>`
  position: relative;
  display: grid;
  grid-template-columns: repeat(${({ $count }) => $count}, minmax(0, 1fr));
  margin: 0;
  padding: 0;
  list-style: none;
`

const GroupNode = styled.li`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 0;
  text-align: center;
`

const groupInner = css`
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

const GroupBody = styled.div`
  ${groupInner}
`

const GroupButton = styled.button`
  ${groupInner}
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

const groupMarkerTone: Record<StakeGroupStatus, ReturnType<typeof css>> = {
  upcoming: css`
    border-color: var(--glass-border);
    background: var(--color-surface);
    color: var(--color-faint);
  `,
  reached: css`
    border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
    background: var(--color-surface);
    color: var(--color-primary);
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

const GroupMarker = styled.span<{ $status: StakeGroupStatus }>`
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
    background 320ms var(--ease-out),
    border-color 320ms var(--ease-out),
    box-shadow 320ms var(--ease-out),
    color 320ms var(--ease-out),
    transform var(--motion);
  ${({ $status }) => groupMarkerTone[$status]}

  @media (max-width: 720px) {
    width: 30px;
    height: 30px;
    font-size: 13px;
  }
`

const GroupTitle = styled.span<{ $status: StakeGroupStatus }>`
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

const GroupMeta = styled.span`
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

const GroupHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

/** Where a bar ends: the group's position plus the share of its sub-steps passed. */
const groupProgress = (
  group: number,
  steps: StakeStepGroup[],
  subitem?: string,
): number => {
  if (steps.length < 2) return 1
  const step = steps[group - 1]
  const subIndex =
    step?.subitems && subitem ? step.subitems.indexOf(subitem) : -1
  const within =
    subIndex > 0 && step?.subitems ? subIndex / step.subitems.length : 0
  return Math.min(1, Math.max(0, (group - 1 + within) / (steps.length - 1)))
}

/**
 * The factory's four groups on one track. The live fill ends where the
 * wizard is; a quieter fill shows how far it has been, and every group up
 * to there (forward included) opens with a click.
 */
export const StakeStepTimeline = ({
  steps,
  statuses,
  current,
  reached,
  onSelectStep,
}: {
  steps: StakeStepGroup[]
  /** One status per group, in order. */
  statuses: StakeGroupStatus[]
  /** The open group (1-based) and its open sub-step. */
  current: { group: number; subitem?: string }
  /** The furthest group (1-based) and sub-step the wizard has reached. */
  reached: { group: number; subitem?: string }
  /** Called with a 1-based group number when a complete or reached group is clicked. */
  onSelectStep?: (stepNumber: number) => void
}) => {
  const progress = groupProgress(current.group, steps, current.subitem)
  const reach = Math.max(
    progress,
    groupProgress(reached.group, steps, reached.subitem),
  )
  return (
    <GroupStepper aria-label="Steps">
      <GroupTrack $count={steps.length} aria-hidden>
        <GroupReach style={{ ['--reach' as string]: reach }} />
        <GroupFill style={{ ['--progress' as string]: progress }} />
      </GroupTrack>
      <GroupNodes $count={steps.length}>
        {steps.map((step, index) => {
          const stepNumber = index + 1
          const status = statuses[index] ?? 'upcoming'
          const clickable =
            !!onSelectStep && (status === 'complete' || status === 'reached')
          const body = (
            <>
              <GroupMarker $status={status} data-marker aria-hidden>
                {status === 'complete' ? (
                  <CurateIcon name="check" size={16} />
                ) : (
                  stepNumber
                )}
              </GroupMarker>
              <span style={{ minWidth: 0, maxWidth: '100%' }}>
                <GroupTitle $status={status} data-title>
                  {step.title}
                  {status === 'complete' && <GroupHidden> (done)</GroupHidden>}
                </GroupTitle>
                <GroupMeta>
                  {status === 'complete' ? 'Done' : step.description}
                </GroupMeta>
              </span>
            </>
          )

          return (
            <GroupNode
              key={step.title}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              {clickable ? (
                <GroupButton
                  type="button"
                  aria-label={`${stepNumber < current.group ? 'Go back to' : 'Go to'} ${step.title}`}
                  onClick={() => onSelectStep?.(stepNumber)}
                >
                  {body}
                </GroupButton>
              ) : (
                <GroupBody>{body}</GroupBody>
              )}
            </GroupNode>
          )
        })}
      </GroupNodes>
    </GroupStepper>
  )
}

/* ---------- Step panel ---------- */

export const StakePanelTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 22px;

  /* On phones the stepper above names the group: the tabs get the row. */
  @media (max-width: 720px) {
    &[data-tabs='true'] > :first-child {
      display: none;
    }
  }
`

/** The step's form, above the action bar. */
export const StakeStepContent = styled.div`
  min-width: 0;
`

export const StakeSubTabs = styled.ol`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 720px) {
    gap: 2px;
  }
`

/**
 * done: passed with Next (a check); reached: opened before but not passed;
 * both are clickable. next: not reached yet.
 */
export type SubTabState = 'done' | 'reached' | 'current' | 'next'

export const StakeSubTab = styled.button<{ $state: SubTabState }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-faint);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--motion),
    border-color var(--motion),
    color var(--motion);

  @media (max-width: 720px) {
    gap: 5px;
    padding: 0 9px;
  }

  ${({ $state }) =>
    $state === 'current'
      ? css`
          border-color: color-mix(
            in srgb,
            var(--color-primary) 35%,
            transparent
          );
          background: var(--color-primary-soft);
          color: var(--color-text);
        `
      : $state === 'done' || $state === 'reached'
        ? css`
            color: var(--color-muted);
            cursor: pointer;

            svg {
              color: var(--color-primary);
            }

            &:hover {
              background: var(--color-raised);
              color: var(--color-text);
            }
          `
        : css`
            cursor: default;
          `}
`

export const StakeConfirmRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
`

/* ---------- Transaction stepper ---------- */

export type TxStatus = 'upcoming' | 'active' | 'done' | 'failed'

const spin = keyframes`
  to { transform: rotate(360deg); }
`

export const TxList = styled.ol`
  position: relative;
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const TxItem = styled.li<{ $status: TxStatus; $last?: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 14px;
  padding-bottom: ${({ $last }) => ($last ? 0 : '22px')};
  ${reveal}

  /* The connector to the next step fills once this one is done. */
  &::before,
  &::after {
    content: ${({ $last }) => ($last ? 'none' : "''")};
    position: absolute;
    top: 36px;
    bottom: 4px;
    left: 15px;
    width: 2px;
    border-radius: var(--radius-pill);
  }

  &::before {
    background: var(--glass-border);
  }

  &::after {
    background: linear-gradient(var(--color-primary), var(--aurora-b));
    box-shadow: 0 0 10px
      color-mix(in srgb, var(--color-primary) 60%, transparent);
    transform-origin: top;
    transform: scaleY(${({ $status }) => ($status === 'done' ? 1 : 0)});
    transition: transform 700ms var(--ease-out);
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      transition: none;
    }
  }
`

const txMarker = {
  upcoming: css`
    border-color: var(--glass-border);
    background: var(--color-surface);
    color: var(--color-faint);
  `,
  active: css`
    border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
    background: var(--color-primary-soft);
    color: var(--color-primary);
    box-shadow: 0 0 0 5px
      color-mix(in srgb, var(--color-primary) 10%, transparent);
  `,
  done: css`
    border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
    background: var(--color-primary-fill);
    color: var(--color-on-primary);
    box-shadow: 0 6px 18px -8px var(--color-primary);
  `,
  failed: css`
    border-color: color-mix(in srgb, var(--color-danger) 60%, transparent);
    background: var(--color-danger-soft);
    color: var(--color-danger);
  `,
}

const TxMarker = styled.span<{ $status: TxStatus }>`
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid;
  border-radius: var(--radius-pill);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  transition:
    background 320ms var(--ease-out),
    border-color 320ms var(--ease-out),
    box-shadow 320ms var(--ease-out),
    color 320ms var(--ease-out);
  ${({ $status }) => txMarker[$status]}
`

const Spinner = styled.i`
  width: 14px;
  height: 14px;
  border: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-top-color: var(--color-primary);
  border-radius: var(--radius-pill);
  animation: ${spin} 800ms linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2400ms;
  }
`

const TxBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  padding-top: 5px;
`

const TxTitle = styled.span<{ $status: TxStatus }>`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 10px;
  color: ${({ $status }) =>
    $status === 'upcoming' ? 'var(--color-muted)' : 'var(--color-text)'};
  font-size: var(--fs-body-lg);
  line-height: var(--lh-body-lg);
  font-weight: 500;
`

const TxTag = styled.span`
  color: var(--color-faint);
  font-size: var(--fs-small);
  font-weight: 400;
`

const TxNote = styled.span`
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

/** Chips under a transaction step: hashes, paths, addresses. */
export const TxData = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 8px;
  margin-top: 6px;
`

const pill = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  height: 26px;
  padding: 0 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  font-family: var(--font-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  span {
    color: var(--color-muted);
    font-family: var(--font-sans);
  }
`

export const TxLink = styled.a`
  ${pill}
  color: var(--color-primary);
  text-decoration: none;
  transition:
    border-color var(--motion),
    background var(--motion);

  &:hover {
    border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
    background: var(--color-primary-soft);
  }
`

export const TxPill = styled.span`
  ${pill}
  color: var(--color-text);
`

/**
 * One step of a transaction: a numbered marker (a spinner while it runs, a
 * check once done, a cross if it failed), the title with a quiet tag, the
 * note while it runs or after it failed, and its evidence as chips.
 */
export const TxStep = ({
  number,
  status,
  title,
  tag,
  note,
  last,
  index,
  children,
}: {
  number: number
  status: TxStatus
  title: React.ReactNode
  tag?: React.ReactNode
  note?: React.ReactNode
  last?: boolean
  index: number
  children?: React.ReactNode
}) => (
  <TxItem
    $status={status}
    $last={last}
    style={{ ['--i' as string]: index }}
    aria-current={status === 'active' ? 'step' : undefined}
  >
    <TxMarker $status={status} aria-hidden>
      {status === 'done' ? (
        <CurateIcon name="check" size={15} />
      ) : status === 'active' ? (
        <Spinner />
      ) : status === 'failed' ? (
        <CurateIcon name="close" size={14} />
      ) : (
        number
      )}
    </TxMarker>
    <TxBody>
      <TxTitle $status={status}>
        {title}
        {tag && <TxTag>{tag}</TxTag>}
      </TxTitle>
      {note && (status === 'active' || status === 'failed') && (
        <TxNote>{note}</TxNote>
      )}
      {children}
    </TxBody>
  </TxItem>
)

/* ---------- Deployed lists ---------- */

export const StakeSectionHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin: 72px 0 18px;

  h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 30px;
    line-height: 34px;
    font-weight: 500;
    letter-spacing: -0.03em;
  }

  @media (max-width: 720px) {
    margin-top: 48px;

    h2 {
      font-size: 24px;
      line-height: 28px;
    }
  }
`

export const StakeDeploymentRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

export const StakeDeploymentLink = styled(Link)`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 12px 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--motion),
    translate var(--motion),
    box-shadow var(--motion);
  ${reveal}

  /* translate, not transform: the entrance animation owns transform. */
  &:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-card-hover);
    translate: 0 -1px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      translate: none;
    }
  }

  &:hover strong {
    color: var(--color-primary);
  }

  strong {
    display: block;
    overflow: hidden;
    color: var(--color-text);
    font-size: var(--fs-body-lg);
    line-height: var(--lh-body-lg);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color var(--motion);
  }
`

export const StakeDeploymentLogo = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--color-raised);
  color: var(--color-faint);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

export const StakeOpenHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  font-weight: 500;
`
