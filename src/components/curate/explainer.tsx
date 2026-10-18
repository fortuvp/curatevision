import React, { useCallback, useState } from 'react'
import styled from 'styled-components'
import { Surface, Body, Label } from './primitives'

/*
 * Beginner explainer (DESIGN.md, Components): serif heading, numbered steps in
 * sans, a small schematic, and a "Hide this" link that persists per explainer.
 * Pros hide it once; it stays hidden on every later visit.
 */

const STORAGE_PREFIX = 'curatevision-explainer:'

const readHidden = (id: string): boolean => {
  try {
    return localStorage.getItem(STORAGE_PREFIX + id) === 'hidden'
  } catch {
    return false
  }
}

const writeHidden = (id: string, hidden: boolean) => {
  try {
    if (hidden) localStorage.setItem(STORAGE_PREFIX + id, 'hidden')
    else localStorage.removeItem(STORAGE_PREFIX + id)
  } catch {
    // Storage can be blocked; the choice then lasts for the session.
  }
}

export const useExplainerHidden = (id: string) => {
  const [hidden, setHiddenState] = useState(() => readHidden(id))
  const setHidden = useCallback(
    (next: boolean) => {
      setHiddenState(next)
      writeHidden(id, next)
    },
    [id],
  )
  return [hidden, setHidden] as const
}

const Shell = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
  gap: 32px;
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`

const Heading = styled.h2`
  margin: 0 0 6px;
  color: var(--color-text);
  font-family: var(--font-serif);
  font-size: 26px;
  line-height: 32px;
  font-weight: 400;
  letter-spacing: -0.01em;
`

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
`

const Step = styled.li`
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  counter-increment: step;

  &::before {
    content: counter(step);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-pill);
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-data);
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
  font-size: var(--fs-body);
  line-height: var(--lh-body);
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
`

const TextLink = styled.button`
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    color: var(--color-primary-hover);
    text-decoration: underline;
  }
`

const Schematic = styled.div`
  color: var(--color-muted);

  svg {
    display: block;
    width: 100%;
    height: auto;
  }
`

const ShowAgain = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--color-faint);
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  line-height: var(--lh-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    color: var(--color-muted);
  }
`

export interface ExplainerStep {
  title: string
  body: React.ReactNode
}

export const Explainer = ({
  id,
  eyebrow,
  heading,
  intro,
  steps,
  schematic,
  footer,
}: {
  id: string
  eyebrow?: string
  heading: string
  intro?: React.ReactNode
  steps: ExplainerStep[]
  schematic?: React.ReactNode
  footer?: React.ReactNode
}) => {
  const [hidden, setHidden] = useExplainerHidden(id)

  if (hidden)
    return (
      <ShowAgain type="button" onClick={() => setHidden(false)}>
        {heading} · show
      </ShowAgain>
    )

  return (
    <Shell $padding="standard" aria-label={heading}>
      <div>
        {eyebrow && <Label>{eyebrow}</Label>}
        <Heading>{heading}</Heading>
        {intro && <Body $muted>{intro}</Body>}
        <Steps>
          {steps.map((step) => (
            <Step key={step.title}>
              <div>
                <StepTitle>{step.title}</StepTitle>
                <StepBody>{step.body}</StepBody>
              </div>
            </Step>
          ))}
        </Steps>
        <Footer>
          {footer}
          <TextLink type="button" onClick={() => setHidden(true)}>
            Hide this
          </TextLink>
        </Footer>
      </div>
      {schematic && <Schematic aria-hidden>{schematic}</Schematic>}
    </Shell>
  )
}

/**
 * The Curate lifecycle as a schematic: submit → challenge window → registered,
 * or challenged → jurors → kept / removed. Lines and nodes only, mono labels.
 */
export const LifecycleSchematic = () => (
  <svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>How an entry moves through Curate</title>
    <defs>
      <marker
        id="arrow"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0 0 8 4 0 8Z" fill="currentColor" />
      </marker>
    </defs>
    <g
      fill="none"
      stroke="var(--color-border-strong)"
      strokeWidth="1.25"
      markerEnd="url(#arrow)"
    >
      <path d="M86 60 H128" />
      <path d="M250 60 H292" />
      <path d="M190 84 V128" />
      <path d="M190 172 H120 L120 160" markerEnd="none" />
      <path d="M250 150 H292" />
    </g>
    <g fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing="0.06em">
      <rect
        x="12"
        y="40"
        width="74"
        height="40"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="49" y="64" textAnchor="middle" fill="var(--color-text)">
        SUBMIT
      </text>
      <rect
        x="130"
        y="36"
        width="120"
        height="48"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-window)"
      />
      <text x="190" y="57" textAnchor="middle" fill="var(--color-text)">
        CHALLENGE WINDOW
      </text>
      <text x="190" y="73" textAnchor="middle" fill="var(--color-muted)">
        DEPOSIT LOCKED
      </text>
      <rect
        x="294"
        y="40"
        width="112"
        height="40"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-registered)"
      />
      <circle cx="306" cy="60" r="3.5" fill="var(--status-registered)" />
      <text x="358" y="64" textAnchor="middle" fill="var(--color-text)">
        REGISTERED
      </text>
      <text x="272" y="24" textAnchor="middle" fill="var(--color-faint)">
        NOBODY CHALLENGES
      </text>
      <text x="206" y="112" fill="var(--color-faint)">
        SOMEONE CHALLENGES
      </text>
      <rect
        x="130"
        y="130"
        width="120"
        height="44"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-contested)"
      />
      <circle cx="142" cy="152" r="3.5" fill="var(--status-contested)" />
      <text x="198" y="149" textAnchor="middle" fill="var(--color-text)">
        KLEROS JURORS
      </text>
      <text x="198" y="164" textAnchor="middle" fill="var(--color-muted)">
        RULE ON THE POLICY
      </text>
      <rect
        x="294"
        y="130"
        width="112"
        height="44"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="350" y="149" textAnchor="middle" fill="var(--color-text)">
        WINNER PAID
      </text>
      <text x="350" y="164" textAnchor="middle" fill="var(--color-muted)">
        KEPT OR REMOVED
      </text>
      <text x="12" y="208" fill="var(--color-faint)">
        UNCHALLENGED DEPOSITS COME BACK IN FULL
      </text>
    </g>
  </svg>
)

export default Explainer
