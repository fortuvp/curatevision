import React from 'react'
import styled from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'

const variantMap: Record<string, 'primary' | 'secondary' | 'tertiary'> = {
  default: 'secondary',
  primary: 'primary',
  secondary: 'secondary',
  ghost: 'secondary',
  link: 'secondary',
  purple: 'tertiary',
  danger: 'tertiary',
}

const ButtonScope = styled.span<{
  $block?: boolean
  $link?: boolean
  $small?: boolean
  $shape?: string
  $variant?: 'primary' | 'secondary' | 'tertiary'
}>`
  display: ${({ $block }) => ($block ? 'flex' : 'inline-flex')};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};

  > .gtcr-v2-button {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: ${({ $block }) => ($block ? '100%' : 'fit-content')};
    min-height: ${({ $small }) => ($small ? '32px' : '46px')};
    padding: ${({ $small, $variant }) =>
      $variant === 'secondary'
        ? $small
          ? '5px 23px'
          : '10.5px 31px'
        : $small
          ? '6px 24px'
          : '11.5px 32px'};
    border: ${({ $variant }) =>
      $variant === 'secondary'
        ? '1px solid var(--klerosUIComponentsPrimaryBlue)'
        : '1px solid transparent'};
    border-radius: ${({ $shape }) => ($shape === 'round' ? '999px' : '3px')};
    background: ${({ $variant }) =>
      $variant === 'tertiary'
        ? 'var(--klerosUIComponentsSecondaryPurple)'
        : $variant === 'secondary'
          ? 'var(--klerosUIComponentsWhiteBackground)'
          : 'var(--klerosUIComponentsPrimaryBlue)'};
    color: ${({ $variant }) =>
      $variant === 'secondary'
        ? 'var(--klerosUIComponentsPrimaryBlue)'
        : 'var(--klerosUIComponentsWhiteBackground)'};
    cursor: pointer;
    appearance: none;
    font: inherit;
    transform: translateZ(0);
    transition:
      background var(--klerosUIComponentsTransitionSpeed),
      transform var(--klerosUIComponentsTransitionSpeed);
    text-decoration: none;
  }

  > .gtcr-v2-button:hover {
    background: ${({ $variant }) =>
      $variant === 'tertiary'
        ? 'var(--klerosUIComponentsPrimaryPurple)'
        : $variant === 'secondary'
          ? 'var(--klerosUIComponentsMediumBlue)'
          : 'var(--klerosUIComponentsSecondaryBlue)'};
  }

  > .gtcr-v2-button:active {
    transform: scale(0.95);
  }

  > .gtcr-v2-button[disabled],
  > .gtcr-v2-button[aria-disabled='true'],
  > .gtcr-v2-button[data-loading='true'] {
    border-color: ${({ $variant }) =>
      $variant === 'secondary'
        ? 'var(--klerosUIComponentsStroke)'
        : 'transparent'};
    background: var(--klerosUIComponentsLightGrey);
    cursor: not-allowed;
  }

  .button-text {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: ${({ $variant }) =>
      $variant === 'secondary'
        ? 'var(--klerosUIComponentsPrimaryBlue)'
        : 'var(--klerosUIComponentsWhiteBackground)'};
    text-align: center;
    font-size: 16px;
    line-height: 22px;
    font-weight: 600;
    white-space: nowrap;

    > svg {
      display: block;
      flex-shrink: 0;
    }
  }

  .button-svg {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: ${({ $variant }) =>
      $variant === 'secondary'
        ? 'var(--klerosUIComponentsPrimaryBlue)'
        : 'var(--klerosUIComponentsWhiteBackground)'};
    fill: currentColor;

    > svg {
      display: block;
      width: 16px;
      height: 16px;
    }
  }

  .button-loading {
    width: 16px;
    height: 16px;
    border: 2px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: gtcr-button-spin 800ms linear infinite;
  }

  @keyframes gtcr-button-spin {
    to {
      transform: rotate(360deg);
    }
  }

  ${({ $shape, $small }) =>
    $shape === 'circle' &&
    `
      > .gtcr-v2-button {
        width: ${$small ? '32px' : '46px'};
        min-width: ${$small ? '32px' : '46px'};
        padding: 0;
        border-radius: 50%;
      }

      .button-svg {
        margin-right: 0;
      }

      .button-text {
        display: none;
      }
    `}

  > .gtcr-v2-button[disabled] .button-text,
  > .gtcr-v2-button[aria-disabled='true'] .button-text,
  > .gtcr-v2-button[data-loading='true'] .button-text,
  > .gtcr-v2-button[disabled] .button-svg,
  > .gtcr-v2-button[aria-disabled='true'] .button-svg,
  > .gtcr-v2-button[data-loading='true'] .button-svg {
    color: var(--klerosUIComponentsStroke);
    fill: var(--klerosUIComponentsStroke);
  }

  ${({ $link }) =>
    $link &&
    `
      > .gtcr-v2-button {
        border: 0 !important;
        padding-inline: 0 !important;
        background: transparent !important;
      }

      > .gtcr-v2-button:hover {
        background: transparent !important;
      }
    `}
`

const IconWrap = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
`

const GroupWrapper = styled.div`
  display: inline-flex;
  align-items: center;

  > ${ButtonScope} {
    margin-left: -1px;

    &:first-child {
      margin-left: 0;
    }
  }

  > ${ButtonScope}:first-child > .gtcr-v2-button {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  > ${ButtonScope}:last-child > .gtcr-v2-button {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  > ${ButtonScope}:not(:first-child):not(:last-child) > .gtcr-v2-button {
    border-radius: 0;
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
  onPress?: React.MouseEventHandler
  href?: string
  target?: string
  block?: boolean
  icon?: React.ReactNode
  form?: string
  text?: React.ReactNode
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
  id?: string
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
  onPress,
  href,
  target,
  block,
  icon,
  form,
  text: textProp,
  children,
  style,
  className,
  id,
  ...rest
}) => {
  const variant = variantMap[type] || 'secondary'
  const text = children ?? textProp ?? ''
  const isDisabled = Boolean(disabled || loading)
  const handleClick: React.MouseEventHandler = (event) => {
    if (isDisabled && href) {
      event.preventDefault()
      return
    }
    ;(onClick || onPress)?.(event)
  }
  const iconNode = icon ? (
    <IconWrap className="button-svg">
      {typeof icon === 'string' ? (
        <FontAwesomeIcon icon={icon as IconProp} />
      ) : (
        icon
      )}
    </IconWrap>
  ) : null

  return (
    <ButtonScope
      $block={block}
      $link={type === 'link' || type === 'ghost'}
      $shape={shape}
      $small={size === 'small'}
      $variant={variant}
      className={className}
      style={style}
    >
      {href ? (
        <a
          id={id}
          className={['gtcr-v2-button', className].filter(Boolean).join(' ')}
          href={isDisabled ? undefined : href}
          target={target}
          aria-disabled={isDisabled}
          data-loading={loading ? 'true' : undefined}
          onClick={handleClick}
          {...rest}
        >
          {loading && <span className="button-loading" aria-hidden="true" />}
          {iconNode}
          {text && <span className="button-text">{text}</span>}
        </a>
      ) : (
        <button
          id={id}
          className={['gtcr-v2-button', className].filter(Boolean).join(' ')}
          disabled={isDisabled}
          data-loading={loading ? 'true' : undefined}
          type={htmlType}
          form={form}
          onClick={handleClick}
          {...rest}
        >
          {loading && <span className="button-loading" aria-hidden="true" />}
          {iconNode}
          {text && <span className="button-text">{text}</span>}
        </button>
      )}
    </ButtonScope>
  )
}

Button.Group = ({ children, style, className }: ButtonGroupProps) => (
  <GroupWrapper style={style} className={className}>
    {children}
  </GroupWrapper>
)

Button.Group.displayName = 'Button.Group'

export default Button
