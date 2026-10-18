import React, { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import styled, { ThemeProvider as SCThemeProvider } from 'styled-components'
import {
  lightTheme,
  darkTheme,
  klerosTheme,
} from '../../contexts/theme-context'
import Button from './Button'
import { KitIcon } from './kit-icons'
import { ghostIconButton, joinClassNames } from './kit-styles'

/*
 * Modal (DESIGN.md, Elevation): surface, 1px strong hairline, radius 10,
 * overlay shadow, over a 62% scrim derived from the page background. Max
 * width 560 unless the caller asks for more; a full-screen sheet below 600px.
 */
const ThemeProvider = SCThemeProvider as any

const Overlay = styled.div<{ $centered?: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: ${({ $centered }) => ($centered ? 'center' : 'flex-start')};
  justify-content: center;
  padding: ${({ $centered }) => ($centered ? '16px' : '64px 16px')};
  overflow: auto;
  background: color-mix(in srgb, var(--color-bg) 62%, transparent);

  @media (max-width: 599px) {
    align-items: stretch;
    padding: 0;
  }
`

const ModalContent = styled.div<{ $width?: string | number }>`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: min(
    ${({ $width }) =>
      typeof $width === 'number' ? `${$width}px` : $width || '560px'},
    calc(100vw - 32px)
  );
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-overlay);
  color: var(--color-text);
  outline: none;

  @media (max-width: 599px) {
    max-width: none;
    min-height: 100dvh;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
`

const ModalHeader = styled.div`
  padding: 16px 56px 16px 20px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: var(--fs-subheading);
  line-height: var(--lh-subheading);
  font-weight: 600;
  overflow-wrap: anywhere;
`

const ModalBody = styled.div`
  padding: 20px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);

  @media (max-width: 599px) {
    flex: 1;
    overflow: auto;
  }
`

const ModalFooter = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
`

const CloseButton = styled.button`
  ${ghostIconButton}
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  width: 32px;
  height: 32px;
`

const ConfirmTitle = styled.div`
  margin-bottom: 8px;
  color: var(--color-text);
  font-size: var(--fs-subheading);
  line-height: var(--lh-subheading);
  font-weight: 600;
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
  destroyOnClose = false,
}) => {
  const contentRef = useRef<HTMLDivElement>(null)

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
    if (visible) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
      contentRef.current?.focus()
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [visible, handleKeyDown])

  if (!visible && destroyOnClose) return null
  if (!visible) return null

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
      onClick={handleOverlayClick}
      className="ui-modal-mask"
    >
      <ModalContent
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        $width={width}
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
          <ModalHeader className="ui-modal-header">{title}</ModalHeader>
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
