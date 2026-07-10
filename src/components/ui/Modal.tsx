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
  backdrop-filter: none;
  z-index: 1000;
  display: flex;
  align-items: ${({ $centered }) => ($centered ? 'center' : 'flex-start')};
  justify-content: center;
  padding: ${({ $centered }) => ($centered ? '0' : '100px 0')};
  overflow: auto;
`

const ModalContent = styled.div<{ $width?: string | number }>`
  background: var(--klerosUIComponentsWhiteBackground);
  border: 1px solid var(--klerosUIComponentsStroke);
  border-radius: 3px;
  box-shadow: var(--v2-shadow-hover);
  width: ${({ $width }) =>
    typeof $width === 'number' ? `${$width}px` : $width};
  max-width: calc(100vw - 32px);
  position: relative;
  color: var(--v2-text);
`

const ModalHeader = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid var(--klerosUIComponentsStroke);
  font-size: 18px;
  font-weight: 600;
  color: var(--v2-text);
  letter-spacing: 0;
`

const ModalBody = styled.div`
  padding: 24px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--v2-text);
`

const ModalFooter = styled.div`
  padding: 16px 24px;
  border-top: 1px solid var(--klerosUIComponentsStroke);
  text-align: right;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`

const CloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: var(--klerosUIComponentsWhiteBackground);
  border: 1px solid var(--klerosUIComponentsStroke);
  cursor: pointer;
  font-size: 16px;
  color: var(--v2-muted);
  padding: 0;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 3px;
  transition: color 0.3s;

  &:hover {
    color: var(--v2-text);
    border-color: var(--v2-blue);
  }
`

const DefaultButton = styled.button`
  padding: 10.5px 31px;
  min-height: 46px;
  border-radius: 3px;
  border: 1px solid var(--klerosUIComponentsPrimaryBlue);
  background: var(--klerosUIComponentsWhiteBackground);
  color: var(--klerosUIComponentsPrimaryBlue);
  cursor: pointer;
  transition:
    background var(--klerosUIComponentsTransitionSpeed),
    transform var(--klerosUIComponentsTransitionSpeed);
  font-size: 16px;
  line-height: 22px;
  font-weight: 600;
  font-family: 'Open Sans', ui-sans-serif, system-ui, sans-serif;

  &:hover {
    color: var(--klerosUIComponentsPrimaryBlue);
    border-color: var(--klerosUIComponentsPrimaryBlue);
    background: var(--klerosUIComponentsMediumBlue);
  }

  &:active {
    transform: scale(0.95);
  }
`

const PrimaryButton = styled(DefaultButton)`
  background: var(--klerosUIComponentsPrimaryBlue);
  color: var(--klerosUIComponentsWhiteBackground);
  border-color: var(--klerosUIComponentsPrimaryBlue);

  &:hover {
    background: var(--klerosUIComponentsSecondaryBlue);
    border-color: var(--klerosUIComponentsSecondaryBlue);
    color: var(--klerosUIComponentsWhiteBackground);
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
