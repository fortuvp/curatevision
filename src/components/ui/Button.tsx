import React from 'react'
import styled, { css, keyframes, DefaultTheme } from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

const sizeStyles: Record<string, ReturnType<typeof css>> = {
  small: css`
    min-height: 28px;
    padding: 0 10px;
    font-size: 12px;
  `,
  default: css`
    min-height: 38px;
    padding: 0 15px;
    font-size: 14px;
  `,
  large: css`
    min-height: 46px;
    padding: 0 18px;
    font-size: 15px;
  `,
}

const getTypeStyles = ({
  btnType,
  theme,
}: {
  btnType?: string
  theme: DefaultTheme
}) => {
  switch (btnType) {
    case 'primary':
      return css`
        background: linear-gradient(135deg, #063756, #0b2a56 48%, #142f62);
        color: ${theme.buttonPrimaryText};
        border-color: rgba(0, 163, 255, 0.46);
        box-shadow:
          inset 0 1px rgba(255, 255, 255, 0.12),
          0 16px 42px rgba(0, 0, 0, 0.35),
          0 0 36px rgba(0, 163, 255, 0.12);

        &:hover:not(:disabled),
        &:focus:not(:disabled) {
          background: linear-gradient(135deg, #07496f, #0e3970 48%, #193c7b);
          border-color: rgba(0, 163, 255, 0.62);
          color: ${theme.buttonPrimaryText};
          transform: translateY(-2px);
        }
      `
    case 'ghost':
      return css`
        background: var(--curate-button-soft);
        color: var(--curate-text);
        border-color: var(--curate-border);

        &:hover:not(:disabled),
        &:focus:not(:disabled) {
          color: var(--curate-text);
          border-color: var(--curate-border-strong);
          background: rgba(0, 163, 255, 0.11);
        }
      `
    case 'danger':
      return css`
        background: ${theme.errorColor};
        color: #fff;
        border-color: ${theme.errorColor};

        &:hover:not(:disabled),
        &:focus:not(:disabled) {
          opacity: 0.85;
        }
      `
    case 'link':
      return css`
        background: transparent;
        color: ${theme.linkColor};
        border-color: transparent;
        box-shadow: none;

        &:hover:not(:disabled),
        &:focus:not(:disabled) {
          color: ${theme.primaryColor};
          opacity: 0.85;
        }
      `
    default:
      return css`
        background: var(--curate-button);
        color: var(--curate-text);
        border-color: var(--curate-border);
        box-shadow: 0 16px 42px rgba(0, 0, 0, 0.28);

        &:hover:not(:disabled),
        &:focus:not(:disabled) {
          color: var(--curate-text);
          border-color: var(--curate-border-strong);
          background: rgba(0, 163, 255, 0.1);
          transform: translateY(-1px);
        }
      `
  }
}

const shapeStyles = ({ shape }: { shape?: string }) => {
  if (shape === 'circle')
    return css`
      border-radius: 50%;
      min-width: 32px;
      padding: 0;
      text-align: center;
    `
  if (shape === 'round')
    return css`
      border-radius: 999px;
    `
  return ''
}

interface StyledButtonTransientProps {
  btnType?: string
  shape?: string
  size?: string
  block?: boolean
}

const StyledButton = styled.button<StyledButtonTransientProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid;
  border-radius: var(--curate-radius-sm);
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
  line-height: 1.5;
  font-weight: 850;
  letter-spacing: 0;
  white-space: nowrap;
  user-select: none;
  touch-action: manipulation;

  ${({ size }) => sizeStyles[size || 'default']}
  ${getTypeStyles}
  ${shapeStyles}

  ${({ block }) =>
    block &&
    css`
      display: flex;
      width: 100%;
    `}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`

const StyledLink = styled.a<StyledButtonTransientProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid;
  border-radius: var(--curate-radius-sm);
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
  line-height: 1.5;
  font-weight: 850;
  white-space: nowrap;
  user-select: none;
  touch-action: manipulation;
  text-decoration: none;

  ${({ size }) => sizeStyles[size || 'default']}
  ${getTypeStyles}
  ${shapeStyles}

  ${({ block }) =>
    block &&
    css`
      display: flex;
      width: 100%;
    `}

  &:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }
`

const Spinner = styled(FontAwesomeIcon)`
  animation: ${spin} 1s linear infinite;
`

const GroupWrapper = styled.div`
  display: inline-flex;

  & > button,
  & > a {
    border-radius: 0;

    &:first-child {
      border-radius: var(--curate-radius-sm) 0 0 var(--curate-radius-sm);
    }

    &:last-child {
      border-radius: 0 var(--curate-radius-sm) var(--curate-radius-sm) 0;
    }

    &:not(:last-child) {
      border-right-width: 0;
    }
  }
`

interface ButtonProps {
  type?: string
  shape?: string
  size?: string
  loading?: boolean
  htmlType?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  onClick?: React.MouseEventHandler
  href?: string
  target?: string
  block?: boolean
  icon?: React.ReactNode
  form?: string
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  [key: string]: unknown
}

interface ButtonGroupProps {
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const Button: React.FC<ButtonProps> & { Group: React.FC<ButtonGroupProps> } = ({
  type = 'default',
  shape,
  size,
  loading,
  htmlType = 'button',
  disabled,
  onClick,
  href,
  target,
  block,
  icon,
  form,
  children,
  style,
  className,
  ...rest
}) => {
  const iconContent = loading ? (
    <Spinner icon="spinner" />
  ) : icon ? (
    typeof icon === 'string' ? (
      <FontAwesomeIcon icon={icon as IconDefinition} />
    ) : (
      icon
    )
  ) : null

  if (href)
    return (
      <StyledLink
        href={href}
        target={target}
        btnType={type}
        shape={shape}
        size={size}
        block={block}
        style={style}
        className={className}
        onClick={
          disabled || loading
            ? (e: React.MouseEvent) => e.preventDefault()
            : onClick
        }
        {...rest}
      >
        {iconContent}
        {children}
      </StyledLink>
    )

  return (
    <StyledButton
      type={htmlType}
      btnType={type}
      shape={shape}
      size={size}
      disabled={disabled || loading}
      onClick={onClick}
      block={block}
      form={form}
      style={style}
      className={className}
      {...rest}
    >
      {iconContent}
      {children}
    </StyledButton>
  )
}

Button.Group = ({ children, style, className }: ButtonGroupProps) => (
  <GroupWrapper style={style} className={className}>
    {children}
  </GroupWrapper>
)

Button.Group.displayName = 'Button.Group'

export default Button
