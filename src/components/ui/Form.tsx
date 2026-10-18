import React from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames } from './kit-styles'

const StyledForm = styled.form<{ $layout?: string }>`
  ${({ $layout }) =>
    $layout === 'horizontal' &&
    css`
      .ui-form-item {
        flex-direction: row;
        align-items: center;
        gap: 12px;
      }
      .ui-form-item-label {
        flex: 0 0 auto;
        min-width: 96px;
        margin-bottom: 0;
        text-align: right;
      }
      .ui-form-item-control {
        flex: 1;
        min-width: 0;
      }
    `}
`

/* Field block: label (13/18 at 500), control, help line; status tints the control's border. */
const FormItemWrapper = styled.div<{ $validateStatus?: string }>`
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;

  ${({ $validateStatus }) =>
    $validateStatus === 'error' &&
    css`
      .ui-form-item-control input,
      .ui-form-item-control textarea,
      .ui-form-item-control .ui-select-trigger {
        border-color: var(--color-danger) !important;
      }
    `}

  ${({ $validateStatus }) =>
    $validateStatus === 'success' &&
    css`
      .ui-form-item-control input,
      .ui-form-item-control textarea,
      .ui-form-item-control .ui-select-trigger {
        border-color: var(--color-success) !important;
      }
    `}
`

const Label = styled.label<{ $required?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  color: var(--color-text);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;

  ${({ $required }) =>
    $required &&
    css`
      &::before {
        content: '*';
        color: var(--color-danger);
      }
    `}
`

const HelpText = styled.div<{ $isError?: boolean }>`
  min-height: var(--lh-small);
  margin-top: 4px;
  color: ${({ $isError }) =>
    $isError ? 'var(--color-danger)' : 'var(--color-muted)'};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  transition: color var(--motion);
`

const ControlWrapper = styled.div`
  position: relative;
  min-width: 0;
`

interface FormProps {
  onSubmit?: React.FormEventHandler<HTMLFormElement>
  id?: string
  layout?: string
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
}

interface FormItemProps {
  label?: React.ReactNode
  validateStatus?: string
  help?: React.ReactNode
  hasFeedback?: boolean
  name?: string
  style?: React.CSSProperties
  className?: string
  children?: React.ReactNode
  colon?: boolean
  required?: boolean
}

interface FormComponent extends React.FC<FormProps> {
  Item: React.FC<FormItemProps>
}

const Form: FormComponent = ({
  onSubmit,
  id,
  layout = 'vertical',
  style,
  className,
  children,
}) => {
  const handleSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault()
    onSubmit && onSubmit(e)
  }

  return (
    <StyledForm
      onSubmit={handleSubmit}
      id={id}
      $layout={layout}
      style={style}
      className={joinClassNames('ui-form', `ui-form-${layout}`, className)}
    >
      {children}
    </StyledForm>
  )
}

const FormItem: React.FC<FormItemProps> = ({
  label,
  validateStatus,
  help,
  style,
  className,
  children,
  colon = true,
  required = false,
}) => (
  <FormItemWrapper
    $validateStatus={validateStatus}
    style={style}
    className={joinClassNames(
      'ui-form-item',
      validateStatus && `ui-form-item-${validateStatus}`,
      className,
    )}
  >
    {label && (
      <Label className="ui-form-item-label" $required={required}>
        {label}
        {colon && ':'}
      </Label>
    )}
    <ControlWrapper className="ui-form-item-control">{children}</ControlWrapper>
    {help && (
      <HelpText
        className={joinClassNames(
          'ui-form-item-help',
          validateStatus === 'error' && 'ui-form-item-error',
        )}
        $isError={validateStatus === 'error'}
        aria-live="polite"
      >
        {help}
      </HelpText>
    )}
  </FormItemWrapper>
)

FormItem.displayName = 'Form.Item'

Form.Item = FormItem

export default Form
