import React, { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { Heading, IconButton, Label } from './primitives'
import { CurateIcon } from './icons'

/*
 * Dialog for the item pages (DESIGN.md, Elevation): surface, 1px strong
 * border, overlay shadow, 10px radius. Escape and the scrim close it, the
 * page behind stops scrolling, and focus moves into the dialog and back.
 */

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
  overflow-y: auto;
  background: color-mix(in srgb, var(--color-bg) 78%, transparent);

  @media (max-width: 720px) {
    padding: 16px 16px 24px;
  }
`

const Panel = styled.div<{ $width: 'md' | 'lg' }>`
  width: 100%;
  max-width: ${({ $width }) => ($width === 'lg' ? '1040px' : '600px')};
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-overlay);
  color: var(--color-text);
  outline: none;
`

const Head = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--color-border);
`

const Titles = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Body = styled.div`
  padding: 20px;
`

const Foot = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--color-border);

  @media (max-width: 520px) {
    > * {
      flex: 1 1 auto;
    }
  }
`

export interface DialogProps {
  open: boolean
  onClose: () => void
  title?: React.ReactNode
  /** Mono eyebrow above the title, e.g. the entry name. */
  eyebrow?: React.ReactNode
  width?: 'md' | 'lg'
  footer?: React.ReactNode
  children?: React.ReactNode
}

export const Dialog = ({
  open,
  onClose,
  title,
  eyebrow,
  width = 'md',
  footer,
  children,
}: DialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown)
      previous?.focus?.()
    }
  }, [open, onKeyDown])

  if (!open) return null

  return createPortal(
    <Scrim
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <Panel
        ref={panelRef}
        $width={width}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
      >
        <Head>
          <Titles>
            {eyebrow && <Label>{eyebrow}</Label>}
            {title && <Heading id={titleId}>{title}</Heading>}
          </Titles>
          <IconButton type="button" aria-label="Close" onClick={onClose}>
            <CurateIcon name="close" size={16} />
          </IconButton>
        </Head>
        <Body>{children}</Body>
        {footer && <Foot>{footer}</Foot>}
      </Panel>
    </Scrim>,
    document.body,
  )
}

/** Two columns inside a wide dialog: the form, then the receipt rail. */
export const DialogColumns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 24px;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

export default Dialog
