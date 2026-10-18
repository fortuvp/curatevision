import React, { useEffect, useId, useRef, useState } from 'react'
import styled from 'styled-components'
import { ItemTypes } from '@kleros/gtcr-encoder'
import { getExtension } from 'mime'
import { parseIpfs } from 'utils/ipfs-parse'
import { addPeriod } from 'utils/string'
import { parseRichAddress, references } from 'utils/rich-address'
import { Button, Row, Small, TextInput } from 'components/curate/primitives'
import { formatFileSize } from './amounts'
import { isRequired, type FieldValue } from './form'

/*
 * One field per registry column, on the primitives: label with a required
 * marker, the column description as help text, the control, and the
 * validation message inline. Values keep the shape the encoders expect
 * (strings; a File while an upload is stashed, resolved at submit time).
 */

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])
const IMAGE_MAX_MB = 2
const FILE_MAX_MB = 4
const chainOptions = references.filter((reference) => !reference.deprecated)
const DEFAULT_CHAIN_KEY = `${references[0].namespaceId}:${references[0].id}`

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
`

const FieldLabel = styled.label`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
`

const Marker = styled.span`
  color: var(--color-muted);
`

const Help = styled.p`
  margin: 0;
  max-width: 68ch;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const ErrorText = styled.p`
  margin: 0;
  color: var(--color-danger);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const Input = styled(TextInput)`
  &[aria-invalid='true'] {
    border-color: var(--color-danger);
  }

  &:disabled {
    background: var(--color-raised);
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

const MonoInput = styled(Input)`
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  font-variant-numeric: tabular-nums;
`

const TextArea = styled.textarea`
  width: 100%;
  min-height: 96px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  resize: vertical;
  transition: border-color var(--motion);

  &::placeholder {
    color: var(--color-faint);
  }

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &[aria-invalid='true'] {
    border-color: var(--color-danger);
  }

  &:disabled {
    background: var(--color-raised);
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

const AddressRow = styled.div`
  display: grid;
  grid-template-columns: minmax(150px, 220px) minmax(0, 1fr);
  gap: 8px;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`

const Select = styled.select`
  height: 40px;
  min-width: 0;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  transition: border-color var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
  }

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &:disabled {
    background: var(--color-raised);
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

const SwitchRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 24px;
  cursor: pointer;
`

const SwitchText = styled.span`
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
`

const SwitchInput = styled.input`
  appearance: none;
  position: relative;
  flex: 0 0 auto;
  width: 44px;
  height: 24px;
  margin: 0;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  cursor: pointer;
  transition:
    background var(--motion),
    border-color var(--motion);

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    box-shadow: var(--shadow-card);
    transition: transform var(--motion);
  }

  &:checked {
    border-color: var(--color-primary);
    background: var(--color-primary);
  }

  &:checked::after {
    transform: translateX(20px);
    background: var(--color-on-primary);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

const DropZone = styled.div<{ $invalid?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 1px dashed
    ${({ $invalid }) =>
      $invalid ? 'var(--color-danger)' : 'var(--color-border-strong)'};
  border-radius: var(--radius);
  background: var(--color-surface);
`

const Preview = styled.img`
  display: block;
  max-width: 100%;
  max-height: 160px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-raised);
  object-fit: contain;
`

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`

const FileLink = styled.a`
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const useObjectUrl = (file?: File): string => {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!file) {
      setUrl('')
      return
    }
    const next = URL.createObjectURL(file)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [file])
  return url
}

/** Same acceptance rules as the input selector; the message replaces its toast. */
const rejectImage = (file: File): string => {
  if (!IMAGE_TYPES.has(file.type)) return 'Use a PNG, JPEG, WebP or SVG image.'
  if (file.size / 1024 / 1024 > IMAGE_MAX_MB)
    return `The image must be smaller than ${IMAGE_MAX_MB} MB.`
  return ''
}

const rejectFile = (file: File, allowed: string[]): string => {
  if (allowed.length > 0 && !allowed.includes(getExtension(file.type) ?? ''))
    return `Allowed file types: ${allowed.map((ext) => `.${ext}`).join(', ')}.`
  if (file.size / 1024 / 1024 > FILE_MAX_MB)
    return `The file must be smaller than ${FILE_MAX_MB} MB.`
  return ''
}

const UploadField = ({
  id,
  column,
  value,
  disabled,
  invalid,
  describedBy,
  onChange,
  onBlur,
}: {
  id: string
  column: Column
  value: FieldValue | undefined
  disabled?: boolean
  invalid: boolean
  describedBy?: string
  onChange: (value: FieldValue) => void
  onBlur: () => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rejection, setRejection] = useState('')
  const isImage = column.type === ItemTypes.IMAGE
  const file = value instanceof File ? value : undefined
  const uri =
    !file && typeof value === 'string' && value ? parseIpfs(value) : ''
  const previewUrl = useObjectUrl(isImage ? file : undefined)
  const allowed = (column.allowedFileTypes || '').split(' ').filter(Boolean)
  const accept = isImage
    ? [...IMAGE_TYPES].join(',')
    : allowed.map((ext) => `.${ext}`).join(',') || undefined
  const hint = isImage
    ? `PNG, JPEG, WebP or SVG, up to ${IMAGE_MAX_MB} MB.`
    : allowed.length > 0
      ? `${allowed.map((ext) => `.${ext}`).join(', ')}, up to ${FILE_MAX_MB} MB.`
      : `Up to ${FILE_MAX_MB} MB.`
  const hasValue = !!file || !!uri

  const pick = (picked: File) => {
    const problem = isImage ? rejectImage(picked) : rejectFile(picked, allowed)
    setRejection(problem)
    if (!problem) onChange(picked)
    onBlur()
  }

  const clear = () => {
    setRejection('')
    onChange('')
    if (inputRef.current) inputRef.current.value = ''
    onBlur()
  }

  return (
    <>
      <DropZone $invalid={invalid}>
        {isImage && (previewUrl || uri) && (
          <Preview src={previewUrl || uri} alt={`${column.label} preview`} />
        )}
        {file && (
          <Small>
            {file.name} · {formatFileSize(file.size)}
          </Small>
        )}
        {uri && (
          <Small>
            <FileLink href={uri} target="_blank" rel="noopener noreferrer">
              Open the uploaded file
            </FileLink>
          </Small>
        )}
        <Row $gap={8} $wrap>
          <Button
            type="button"
            $variant="secondary"
            $size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            {hasValue ? 'Replace' : 'Choose a file'}
          </Button>
          {hasValue && (
            <Button
              type="button"
              $variant="ghost"
              $size="sm"
              disabled={disabled}
              onClick={clear}
            >
              Remove
            </Button>
          )}
        </Row>
        <Small $muted>{hint}</Small>
        <HiddenInput
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={disabled}
          tabIndex={-1}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (picked) pick(picked)
          }}
        />
      </DropZone>
      {rejection && <ErrorText role="alert">{rejection}</ErrorText>}
    </>
  )
}

export interface ColumnFieldProps {
  column: Column
  value: FieldValue | undefined
  error?: string
  /** Errors show once the field was touched (or the form was submitted). */
  showError: boolean
  disabled?: boolean
  onChange: (value: FieldValue) => void
  onBlur: () => void
}

export const ColumnField = ({
  column,
  value,
  error,
  showError,
  disabled,
  onChange,
  onBlur,
}: ColumnFieldProps) => {
  const id = useId()
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const required = isRequired(column)
  const description = column.description ? addPeriod(column.description) : ''
  const invalid = showError && !!error
  const describedBy =
    [description ? helpId : '', invalid ? errorId : '']
      .filter(Boolean)
      .join(' ') || undefined
  const text = typeof value === 'string' ? value : ''
  const { type } = column

  const shared = {
    id,
    disabled,
    onBlur,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
  }

  if (type === ItemTypes.BOOLEAN)
    return (
      <Shell>
        <SwitchRow htmlFor={id}>
          <SwitchText>{column.label}</SwitchText>
          <SwitchInput
            {...shared}
            type="checkbox"
            role="switch"
            checked={text === 'true'}
            onChange={(event) => onChange(String(event.target.checked))}
          />
        </SwitchRow>
        {description && <Help id={helpId}>{description}</Help>}
      </Shell>
    )

  let control: React.ReactNode
  if (type === ItemTypes.LONG_TEXT)
    control = (
      <TextArea
        {...shared}
        rows={3}
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  else if (type === ItemTypes.ADDRESS || type === ItemTypes.GTCR_ADDRESS)
    control = (
      <MonoInput
        {...shared}
        type="text"
        value={text}
        placeholder="0x…"
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="none"
        onChange={(event) => onChange(event.target.value.trim())}
      />
    )
  else if (type === ItemTypes.RICH_ADDRESS) {
    const parsed = text ? parseRichAddress(text) : null
    const chainKey = parsed
      ? `${parsed.reference.namespaceId}:${parsed.reference.id}`
      : DEFAULT_CHAIN_KEY
    const address = parsed ? parsed.address : ''
    control = (
      <AddressRow>
        <Select
          aria-label={`${column.label} chain`}
          value={chainKey}
          disabled={disabled}
          onBlur={onBlur}
          onChange={(event) => onChange(`${event.target.value}:${address}`)}
        >
          {chainOptions.map((reference) => (
            <option
              key={`${reference.namespaceId}:${reference.id}`}
              value={`${reference.namespaceId}:${reference.id}`}
            >
              {reference.name}
            </option>
          ))}
        </Select>
        <MonoInput
          {...shared}
          type="text"
          value={address}
          placeholder="Address"
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="none"
          onChange={(event) =>
            onChange(`${chainKey}:${event.target.value.trim()}`)
          }
        />
      </AddressRow>
    )
  } else if (type === ItemTypes.IMAGE || type === ItemTypes.FILE)
    control = (
      <UploadField
        id={id}
        column={column}
        value={value}
        disabled={disabled}
        invalid={invalid}
        describedBy={describedBy}
        onChange={onChange}
        onBlur={onBlur}
      />
    )
  else {
    const numeric =
      type === ItemTypes.NUMBER || type === ItemTypes.TWITTER_USER_ID
    control = (
      <Input
        {...shared}
        type={type === ItemTypes.LINK ? 'url' : 'text'}
        inputMode={numeric ? 'decimal' : undefined}
        placeholder={type === ItemTypes.LINK ? 'https://' : undefined}
        value={text}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  return (
    <Shell>
      <FieldLabel htmlFor={id}>
        {column.label}
        {required && <Marker aria-hidden>*</Marker>}
      </FieldLabel>
      {description && <Help id={helpId}>{description}</Help>}
      {control}
      {invalid && <ErrorText id={errorId}>{error}</ErrorText>}
    </Shell>
  )
}

export default ColumnField
