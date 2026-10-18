import React from 'react'
import styled, { css, type FlattenSimpleInterpolation } from 'styled-components'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { joinClassNames, ringSpinner } from './kit-styles'

/*
 * Button (DESIGN.md, Components): primary (blue fill), secondary (surface,
 * border), ghost (no border), danger (danger fill). Height 40, 32 small,
 * radius 4, labels at 600. `type` keeps the legacy names and maps them onto
 * those four looks; indigo is never used on buttons.
 */

type Variant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger'

const variantMap: Record<string, Variant> = {
  default: 'secondary',
  primary: 'primary',
  secondary: 'secondary',
  dashed: 'secondary',
  ghost: 'ghost',
  link: 'link',
  purple: 'primary',
  danger: 'danger',
}

const enabled =
  '&:not(:disabled):not([aria-disabled="true"]):not([data-loading="true"])'

const variantStyles: Record<Variant, FlattenSimpleInterpolation> = {
  primary: css`
    border-color: transparent;
    background: var(--color-primary);
    color: var(--color-on-primary);

    ${enabled}:hover {
      background: var(--color-primary-hover);
    }
  `,
  secondary: css`
    border-color: var(--color-border-strong);
    background: var(--color-surface);
    color: var(--color-text);

    ${enabled}:hover {
      background: var(--color-raised);
    }
  `,
  ghost: css`
    border-color: transparent;
    background: transparent;
    color: var(--color-muted);

    ${enabled}:hover {
      color: var(--color-text);
      background: var(--color-raised);
    }
  `,
  link: css`
    padding-inline: 0;
    border-color: transparent;
    background: transparent;
    color: var(--color-primary);

    ${enabled}:hover {
      color: var(--color-primary-hover);
    }
  `,
  danger: css`
    border-color: transparent;
    background: var(--color-danger);
    color: var(--color-on-primary);

    ${enabled}:hover {
      filter: brightness(1.08);
    }
  `,
}

const ButtonScope = styled.span<{
  $block?: boolean
  $small?: boolean
  $shape?: string
  $variant: Variant
}>`
  display: ${({ $block }) => ($block ? 'flex' : 'inline-flex')};
  width: ${({ $block }) => ($block ? '100%' : 'auto')};
  max-width: 100%;
  vertical-align: middle;

  > .gtcr-v2-button {
    position: relative;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: ${({ $block }) => ($block ? '100%' : 'auto')};
    height: ${({ $small }) => ($small ? '32px' : '40px')};
    padding: 0 ${({ $small }) => ($small ? '12px' : '16px')};
    border: 1px solid transparent;
    border-radius: ${({ $shape }) =>
      $shape === 'round' || $shape === 'circle'
        ? 'var(--radius-pill)'
        : 'var(--radius-sm)'};
    font-family: var(--font-sans);
    font-size: var(--fs-body);
    line-height: var(--lh-body);
    font-weight: 600;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    appearance: none;
    transition:
      background var(--motion),
      border-color var(--motion),
      color var(--motion);

    ${({ $variant }) => variantStyles[$variant]}
  }

  > .gtcr-v2-button:disabled,
  > .gtcr-v2-button[aria-disabled='true'],
  > .gtcr-v2-button[data-loading='true'] {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .button-text {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-width: 0;

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

    > svg {
      display: block;
      width: 16px;
      height: 16px;
    }
  }

  .button-loading {
    ${ringSpinner}
    width: 14px;
    height: 14px;
  }

  ${({ $shape, $small }) =>
    $shape === 'circle' &&
    css`
      > .gtcr-v2-button {
        width: ${$small ? '32px' : '40px'};
        min-width: ${$small ? '32px' : '40px'};
        padding: 0;
      }

      .button-text {
        display: none;
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
  const innerClassName = joinClassNames('gtcr-v2-button', className)

  return (
    <ButtonScope
      $block={block}
      $shape={shape}
      $small={size === 'small'}
      $variant={variant}
      className={joinClassNames('ui-btn', `ui-btn-${variant}`, className)}
      style={style}
    >
      {href ? (
        <a
          id={id}
          className={innerClassName}
          href={isDisabled ? undefined : href}
          target={target}
          rel={target === '_blank' ? 'noopener noreferrer' : undefined}
          aria-disabled={isDisabled}
          aria-busy={loading || undefined}
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
          className={innerClassName}
          disabled={isDisabled}
          aria-busy={loading || undefined}
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
  <GroupWrapper
    style={style}
    className={joinClassNames('ui-btn-group', className)}
    role="group"
  >
    {children}
  </GroupWrapper>
)

Button.Group.displayName = 'Button.Group'

export default Button
