import React, {
  useEffect,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import styled, {
  css,
  keyframes,
  ThemeProvider as SCThemeProvider,
} from 'styled-components'
import {
  lightTheme,
  darkTheme,
  klerosTheme,
} from '../../contexts/theme-context'
import Button from './Button'
import { KitIcon } from './kit-icons'
import { ghostIconButton, joinClassNames } from './kit-styles'

/*
 * Modal, v2: a glass dialog (surface fill, hairline, 18px radius) with a thin
 * aurora line along its top edge, over a 62% stage scrim that blurs the page.
 * It springs in from 96% and fades out; under 600px it is a full-screen sheet
 * that rises from the bottom. Max width 560 unless the caller asks for more.
 */
const ThemeProvider = SCThemeProvider as any

const EXIT_MS = 180

const scrimIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`

const scrimOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`

/* Transform only: the opacity rides a separate ease-out so the spring never flashes. */
const dialogIn = keyframes`
  from { transform: translateY(10px) scale(0.96); }
  to { transform: none; }
`

const dialogOut = keyframes`
  from { opacity: 1; transform: none; }
  to { opacity: 0; transform: translateY(6px) scale(0.98); }
`

const sheetIn = keyframes`
  from { transform: translateY(100%); }
  to { transform: none; }
`

const sheetOut = keyframes`
  from { transform: none; }
  to { transform: translateY(100%); }
`

const Overlay = styled.div<{ $centered?: boolean; $leaving?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: ${({ $centered }) => ($centered ? 'center' : 'flex-start')};
  justify-content: center;
  padding: ${({ $centered }) => ($centered ? '16px' : '64px 16px')};
  overflow: auto;
  background: color-mix(in srgb, var(--stage) 62%, transparent);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  animation: ${({ $leaving }) => ($leaving ? scrimOut : scrimIn)}
    ${({ $leaving }) => ($leaving ? EXIT_MS : 240)}ms var(--ease-out) both;
  pointer-events: ${({ $leaving }) => ($leaving ? 'none' : 'auto')};

  @media (max-width: 599px) {
    align-items: stretch;
    padding: 0;
  }

  @media (prefers-reduced-motion: reduce) {
    animation-duration: 120ms;
  }
`

const ModalContent = styled.div<{
  $width?: string | number
  $leaving?: boolean
}>`
  position: relative;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(
    ${({ $width }) =>
      typeof $width === 'number' ? `${$width}px` : $width || '560px'},
    calc(100vw - 32px)
  );
  overflow: clip;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--color-surface) 94%, transparent);
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    var(--shadow-overlay);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  color: var(--color-text);
  outline: none;
  transform-origin: 50% 40%;
  ${({ $leaving }) =>
    $leaving
      ? css`
          animation: ${dialogOut} ${EXIT_MS}ms var(--ease-exit) both;
        `
      : css`
          animation:
            ${dialogIn} 460ms var(--ease-spring) both,
            ${scrimIn} 200ms var(--ease-out) both;
        `}

  /* The aurora along the top edge: a lit 1px line and its faint glow. */
  &::before {
    content: '';
    position: absolute;
    inset: 0 0 auto;
    z-index: -1;
    height: 120px;
    background:
      radial-gradient(
        55% 90px at 22% 0%,
        color-mix(in srgb, var(--aurora-b) 22%, transparent),
        transparent 72%
      ),
      radial-gradient(
        45% 80px at 78% 0%,
        color-mix(in srgb, var(--aurora-c) 18%, transparent),
        transparent 72%
      );
    pointer-events: none;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0 28px auto;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      var(--aurora-b) 22%,
      var(--color-primary) 52%,
      var(--aurora-c) 80%,
      transparent
    );
    box-shadow: 0 0 14px 1px
      color-mix(in srgb, var(--color-primary) 55%, transparent);
    pointer-events: none;
  }

  @media (max-width: 599px) {
    max-width: none;
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
    /* A full-screen sheet is opaque: nothing of the page should read through. */
    background: var(--color-surface);
    box-shadow: none;
    ${({ $leaving }) =>
      $leaving
        ? css`
            animation: ${sheetOut} ${EXIT_MS}ms var(--ease-exit) both;
          `
        : css`
            animation: ${sheetIn} 420ms var(--ease-out) both;
          `}

    &::after {
      inset: 0 0 auto;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: ${({ $leaving }) => ($leaving ? scrimOut : scrimIn)} 120ms linear
      both;
  }
`

const ModalHeader = styled.div`
  padding: 22px 64px 6px 24px;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 28px;
  font-weight: 500;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;

  @media (max-width: 599px) {
    padding: 18px 60px 6px 18px;
  }
`

const ModalBody = styled.div`
  padding: 16px 24px 24px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);

  &:first-child {
    padding-top: 24px;
  }

  @media (max-width: 599px) {
    flex: 1;
    overflow: auto;
    padding: 14px 18px 20px;
  }
`

const ModalFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--glass-border);

  @media (max-width: 599px) {
    position: sticky;
    bottom: 0;
    padding: 14px 18px calc(14px + env(safe-area-inset-bottom));
    background: var(--color-surface);
  }
`

const CloseButton = styled.button`
  ${ghostIconButton}
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 1;
  width: 36px;
  height: 36px;
  border-color: var(--glass-border);

  @media (max-width: 599px) {
    top: 12px;
    right: 12px;
  }
`

const ConfirmTitle = styled.div`
  margin-bottom: 8px;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 20px;
  line-height: 26px;
  font-weight: 500;
  letter-spacing: -0.02em;
`

const ConfirmText = styled.div`
  color: var(--color-muted);
`

interface ModalProps {
  visible?: boolean
  title?: React.ReactNode
  footer?: React.ReactNode | null
  onCancel?: () => void
  onOk?: () => void
  width?: string | number
  closable?: boolean
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
  centered?: boolean
  destroyOnClose?: boolean
}

interface ConfirmConfig {
  title?: React.ReactNode
  content?: React.ReactNode
  okText?: string
  cancelText?: string
  onOk?: () => void
  onCancel?: () => void
}

interface ModalComponent extends React.FC<ModalProps> {
  confirm: (config: ConfirmConfig) => { destroy: () => void }
}

const Modal: ModalComponent = ({
  visible,
  title,
  footer,
  onCancel,
  onOk,
  width = '560px',
  closable = true,
  style,
  className,
  children,
  centered = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  // Keep the dialog on screen for its exit animation after `visible` drops.
  const [leaving, setLeaving] = useState(false)
  const wasVisible = useRef(Boolean(visible))

  useLayoutEffect(() => {
    if (visible) {
      wasVisible.current = true
      setLeaving(false)
      return undefined
    }
    if (!wasVisible.current) return undefined
    wasVisible.current = false
    setLeaving(true)
    const timer = window.setTimeout(() => setLeaving(false), EXIT_MS)
    return () => window.clearTimeout(timer)
  }, [visible])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(e.target as Node))
        onCancel && onCancel()
    },
    [onCancel],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) onCancel()
    },
    [onCancel],
  )

  useEffect(() => {
    if (!visible) return undefined
    const previous = document.activeElement as HTMLElement | null
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    contentRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      // Hand focus back to whatever opened the dialog.
      if (previous && document.contains(previous)) previous.focus()
    }
  }, [visible, handleKeyDown])

  // A hidden dialog is never rendered, so `destroyOnClose` and the default
  // behave the same once the exit animation has run.
  if (!visible && !leaving) return null

  const defaultFooter = (
    <>
      <Button onClick={onCancel}>Cancel</Button>
      <Button type="primary" onClick={onOk}>
        OK
      </Button>
    </>
  )

  const modalContent = (
    <Overlay
      $centered={centered}
      $leaving={leaving}
      onClick={handleOverlayClick}
      className="ui-modal-mask"
    >
      <ModalContent
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        $width={width}
        $leaving={leaving}
        style={style}
        className={joinClassNames('ui-modal-content', className)}
      >
        {closable && (
          <CloseButton
            type="button"
            className="ui-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            <KitIcon name="close" size={16} />
          </CloseButton>
        )}
        {title && (
          <ModalHeader id={titleId} className="ui-modal-header">
            {title}
          </ModalHeader>
        )}
        <ModalBody className="ui-modal-body">{children}</ModalBody>
        {footer !== null && (
          <ModalFooter className="ui-modal-footer">
            {footer === undefined ? defaultFooter : footer}
          </ModalFooter>
        )}
      </ModalContent>
    </Overlay>
  )

  return createPortal(modalContent, document.body)
}

// Static confirm method
Modal.confirm = ({
  title,
  content,
  okText = 'OK',
  cancelText = 'Cancel',
  onOk,
  onCancel,
}: ConfirmConfig) => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)

  // Follow the active theme from the body attribute
  const themeAttr = document.body.getAttribute('data-theme')
  const theme =
    themeAttr === 'dark'
      ? darkTheme
      : themeAttr === 'kleros'
        ? klerosTheme
        : lightTheme

  const destroy = () => {
    root.unmount()
    if (container.parentNode) container.remove()
  }

  const handleOk = () => {
    onOk && onOk()
    destroy()
  }

  const handleCancel = () => {
    onCancel && onCancel()
    destroy()
  }

  const ConfirmDialog = () => (
    <ThemeProvider theme={theme}>
      <Overlay $centered onClick={handleCancel} className="ui-modal-mask">
        <ModalContent
          role="alertdialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          $width="416px"
          className="ui-modal-content ui-modal-confirm"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <ModalBody className="ui-modal-body">
            {title && <ConfirmTitle>{title}</ConfirmTitle>}
            {content && <ConfirmText>{content}</ConfirmText>}
          </ModalBody>
          <ModalFooter className="ui-modal-footer">
            <Button onClick={handleCancel}>{cancelText}</Button>
            <Button type="primary" onClick={handleOk}>
              {okText}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Overlay>
    </ThemeProvider>
  )

  root.render(<ConfirmDialog />)

  return { destroy }
}

export default Modal
