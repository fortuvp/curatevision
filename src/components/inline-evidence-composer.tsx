import React, { useContext, useEffect, useId, useRef, useState } from 'react'
import styled from 'styled-components'
import EvidenceForm, { type EvidenceFormValues } from 'components/evidence-form'
import { CurateIcon } from 'components/curate/icons'
import { Button, Row, Small, Surface } from 'components/curate/primitives'
import { useActionGate } from 'components/curate/item-light-gate'

/*
 * Inline evidence composer at the end of an entry's history: the evidence
 * form, the one submit button, and the blocker named when it is disabled
 * (connect, sign in for the upload, switch network). Where the history
 * folds it (EvidenceComposerCollapse), it waits as one row and opens in
 * place; the action card and the phone bar open it with
 * `openEvidenceComposer()`, which also scrolls to it and focuses the form.
 */

/** When true, the composer starts folded to its title row. */
export const EvidenceComposerCollapse = React.createContext(false)

const OPEN_EVENT = 'cv:open-evidence'

/** Open the composer on this page, scroll to it and focus its first field. */
export const openEvidenceComposer = () => {
  window.dispatchEvent(new Event(OPEN_EVENT))
}

const DURATION = 180

const Shell = styled(Surface)`
  display: flex;
  flex-direction: column;
  scroll-margin-top: calc(var(--app-bar-height, 64px) + 24px);
  scroll-margin-bottom: 140px;
`

const Intro = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

/* The disclosure pattern: the heading holds the button that opens it. */
const ToggleHeading = styled.h2`
  margin: 0;
  font: inherit;
`

const Toggle = styled.button`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 6px;
    border-radius: 6px;
  }

  &:hover svg {
    color: var(--color-text);
  }
`

const Head = styled.span`
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  min-width: 0;
`

const Title = styled.span`
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 28px;
  font-weight: 500;
  letter-spacing: -0.02em;
`

const Chevron = styled.span<{ $open: boolean }>`
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--color-muted);
  transform: rotate(${({ $open }) => ($open ? 180 : 0)}deg);
  transition: transform ${DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1);

  svg {
    transition: color var(--motion);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

/* Opens in place: the row track grows from 0fr to 1fr while it fades in. */
const Fold = styled.div<{ $open: boolean }>`
  display: grid;
  grid-template-rows: ${({ $open }) => ($open ? '1fr' : '0fr')};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    grid-template-rows ${DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1),
    opacity ${DURATION}ms ease;

  > div {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 0;
    overflow: hidden;
  }

  > div::before {
    content: '';
    flex: 0 0 auto;
    height: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--glass-border);

  @media (max-width: 560px) {
    flex-direction: column;
    align-items: stretch;

    > div {
      flex-direction: column;
      align-items: stretch;
    }

    /* The gate's Connect / Sign in (a components/ui Button: a wrapper
       around the button) stretch like Submit evidence. */
    button,
    .ui-btn,
    .ui-btn > .gtcr-v2-button {
      display: flex;
      width: 100%;
    }
  }
`

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

interface InlineEvidenceComposerProps {
  id?: string
  formID: string
  formKey?: number
  isSubmitting?: boolean
  onSubmit: (values: EvidenceFormValues) => void
}

const InlineEvidenceComposer = ({
  id = 'evidence-composer',
  formID,
  formKey,
  isSubmitting,
  onSubmit,
}: InlineEvidenceComposerProps) => {
  const collapsible = useContext(EvidenceComposerCollapse)
  const gate = useActionGate({ verb: 'submit evidence', needsAuth: true })
  const disabled = !!isSubmitting || !gate.ready
  const bodyId = useId()
  const shellRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(!collapsible)
  // The form stays mounted while the fold closes, then leaves, so nothing
  // inside it validates or takes focus while it is hidden.
  const [mounted, setMounted] = useState(!collapsible)
  const [focusRequest, setFocusRequest] = useState(0)
  const pendingFocus = useRef(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = window.setTimeout(
      () => setMounted(false),
      prefersReducedMotion() ? 0 : DURATION,
    )
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    const onOpen = () => {
      pendingFocus.current = true
      setOpen(true)
      setFocusRequest((count) => count + 1)
    }
    window.addEventListener(OPEN_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_EVENT, onOpen)
  }, [])

  // After the open has rendered: bring the composer into view and put the
  // cursor in its first field.
  useEffect(() => {
    if (!focusRequest || !mounted || !pendingFocus.current) return
    const frame = requestAnimationFrame(() => {
      const shell = shellRef.current
      if (!shell) return
      pendingFocus.current = false
      shell.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start',
      })
      shell
        .querySelector<HTMLElement>('input:not([type="file"]), textarea')
        ?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(frame)
  }, [focusRequest, mounted])

  const form = (
    <>
      <EvidenceForm
        key={formKey}
        onSubmit={onSubmit}
        formID={formID}
        detailed
      />
      <Footer>
        <Small $muted role="status">
          {gate.blocker ??
            'Publishing costs gas only; evidence needs no deposit.'}
        </Small>
        <Row $gap={8} $wrap>
          {gate.controls}
          {/* One coloured button per view: while the gate's own control
              (Connect, Sign in, Switch) is the next step, submit waits as
              a secondary button. */}
          <Button
            type="submit"
            form={formID}
            $variant={gate.ready ? 'primary' : 'secondary'}
            disabled={disabled}
            aria-disabled={disabled}
            title={gate.blocker}
          >
            {isSubmitting ? 'Waiting for your wallet…' : 'Submit evidence'}
          </Button>
        </Row>
      </Footer>
    </>
  )

  if (!collapsible)
    return (
      <Shell
        ref={shellRef}
        id={id}
        tabIndex={-1}
        $padding="standard"
        role="region"
        aria-label="Add evidence"
        style={{ gap: 18 }}
      >
        <Intro>
          <Title as="h2">Add evidence</Title>
          <Small $muted>
            Published on-chain with this entry, for jurors and curators to read.
          </Small>
        </Intro>
        {form}
      </Shell>
    )

  return (
    <Shell
      ref={shellRef}
      id={id}
      tabIndex={-1}
      $padding="standard"
      role="region"
      aria-label="Add evidence"
    >
      <ToggleHeading>
        <Toggle
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((value) => !value)}
        >
          <Head>
            <Title>Add evidence</Title>
            <Small $muted>Gas only, no deposit</Small>
          </Head>
          <Chevron $open={open} aria-hidden>
            <CurateIcon name="chevron-down" size={18} />
          </Chevron>
        </Toggle>
      </ToggleHeading>
      <Fold id={bodyId} $open={open} aria-hidden={!open || undefined}>
        <div>{mounted && form}</div>
      </Fold>
    </Shell>
  )
}

export default InlineEvidenceComposer
