import React, { useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createRoot } from 'react-dom/client'
import styled, { ThemeProvider as SCThemeProvider } from 'styled-components'

const ThemeProvider = SCThemeProvider as any
import { lightTheme, darkTheme } from '../../contexts/theme-context'

const Overlay = styled.div<{ $centered?: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(12px);
  z-index: 1000;
  display: flex;
  align-items: ${({ $centered }) => ($centered ? 'center' : 'flex-start')};
  justify-content: center;
  padding: ${({ $centered }) => ($centered ? '0' : '100px 0')};
  overflow: auto;
`

const ModalContent = styled.div<{ $width?: string | number }>`
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.065),
      rgba(255, 255, 255, 0.025)
    ),
    var(--curate-surface-strong);
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  box-shadow: var(--curate-shadow-hover);
  width: ${({ $width }) =>
    typeof $width === 'number' ? `${$width}px` : $width};
  max-width: calc(100vw - 32px);
  position: relative;
  color: var(--curate-text);
`

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid var(--curate-border);
  font-size: 18px;
  font-weight: 850;
  color: var(--curate-text);
  letter-spacing: 0;
`

const ModalBody = styled.div`
  padding: 24px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--curate-text);
`

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid var(--curate-border);
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--curate-border);
  cursor: pointer;
  font-size: 16px;
  color: var(--curate-muted);
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 10px;
  transition: color 0.3s;

  &:hover {
    color: var(--curate-text);
    border-color: var(--curate-border-strong);
  }
`

const DefaultButton = styled.button`
  padding: 4px 15px;
  min-height: 38px;
  border-radius: 12px;
  border: 1px solid var(--curate-border);
  background: rgba(255, 255, 255, 0.05);
  color: var(--curate-text);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  font-weight: 800;

  &:hover {
    color: var(--curate-text);
    border-color: var(--curate-border-strong);
  }
`

const PrimaryButton = styled(DefaultButton)`
  background: ${({ theme }) => theme.buttonPrimaryBg};
  color: ${({ theme }) => theme.buttonPrimaryText};
  border-color: transparent;

  &:hover {
    background: ${({ theme }) => theme.buttonPrimaryHoverBg};
    border-color: ${({ theme }) => theme.buttonPrimaryHoverBg};
    color: ${({ theme }) => theme.buttonPrimaryText};
  }
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
  width = '520px',
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
      <DefaultButton onClick={onCancel}>Cancel</DefaultButton>
      <PrimaryButton onClick={onOk}>OK</PrimaryButton>
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
        $width={width}
        style={style}
        className={`ui-modal-content${className ? ` ${className}` : ''}`}
      >
        {closable && (
          <CloseButton
            className="ui-modal-close"
            onClick={onCancel}
            aria-label="Close"
          >
            &#x2715;
          </CloseButton>
        )}
        {title && (
          <ModalHeader className="ui-modal-header">{title}</ModalHeader>
        )}
        <ModalBody className="ui-modal-body">{children}</ModalBody>
        {footer !== null && (
          <ModalFooter className="ui-modal-footer">
            {footer !== undefined ? footer : defaultFooter}
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

  // Detect current theme from document body attribute
  const themeAttr = document.body.getAttribute('data-theme')
  const theme = themeAttr === 'dark' ? darkTheme : lightTheme

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
      <Overlay $centered onClick={handleCancel}>
        <ModalContent
          $width="416px"
          className="ui-modal-content"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <ModalBody className="ui-modal-body">
            {title && (
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '18px',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em',
                }}
              >
                {title}
              </div>
            )}
            {content && <div>{content}</div>}
          </ModalBody>
          <ModalFooter className="ui-modal-footer">
            <DefaultButton onClick={handleCancel}>{cancelText}</DefaultButton>
            <PrimaryButton onClick={handleOk}>{okText}</PrimaryButton>
          </ModalFooter>
        </ModalContent>
      </Overlay>
    </ThemeProvider>
  )

  root.render(<ConfirmDialog />)

  return { destroy }
}

export default Modal
