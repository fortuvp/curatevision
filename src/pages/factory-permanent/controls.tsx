import React, { useRef, useState } from 'react'
import styled from 'styled-components'
import { parseIpfs } from 'utils/ipfs-parse'
import EnsureAuth from 'components/ensure-auth'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  Label,
  Row,
  Small,
  Stack,
  TextInput,
} from 'components/curate/primitives'

/*
 * Form controls for the Stake Curate factory, on the primitives: a labelled
 * field with help and an inline error, text, mono and number inputs, a native
 * select, a switch, a range and an upload card. Every control is a native
 * element so labels, focus rings and keyboard use come for free.
 */

export interface ControlAria {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
}

/* ---------- Layout ---------- */

export const FormSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);

  &:first-child {
    padding-top: 0;
    border-top: 0;
  }
`

export const SectionHead = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

export const FieldGrid = styled.div<{ $columns?: 1 | 2 }>`
  display: grid;
  grid-template-columns: repeat(
    ${({ $columns }) => $columns ?? 2},
    minmax(0, 1fr)
  );
  gap: 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const FullWidth = styled.div`
  grid-column: 1 / -1;
  min-width: 0;
`

/* ---------- Field ---------- */

const FieldShell = styled.div`
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

export const Help = styled.p`
  margin: 0;
  max-width: 68ch;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

export const ErrorText = styled.p`
  margin: 0;
  color: var(--color-danger);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

/**
 * Label, control, help and error wired together with ids so screen readers
 * announce the help and the error with the control.
 */
export const Field = ({
  id,
  label,
  help,
  error,
  children,
}: {
  id: string
  label: React.ReactNode
  help?: React.ReactNode
  error?: string
  children: (aria: ControlAria) => React.ReactNode
}) => {
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const describedBy =
    [help ? helpId : '', error ? errorId : ''].filter(Boolean).join(' ') ||
    undefined
  return (
    <FieldShell>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {help && <Help id={helpId}>{help}</Help>}
      {error && <ErrorText id={errorId}>{error}</ErrorText>}
    </FieldShell>
  )
}

/* ---------- Inputs ---------- */

export const Input = styled(TextInput)`
  &[aria-invalid='true'] {
    border-color: var(--color-danger);
  }

  &:disabled {
    background: var(--color-raised);
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

export const MonoInput = styled(Input)`
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  font-variant-numeric: tabular-nums;
`

const UnitWrap = styled.div`
  display: flex;
  align-items: stretch;
  min-width: 0;

  input {
    min-width: 0;
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }
`

const Unit = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-left: 0;
  border-radius: 0 var(--radius) var(--radius) 0;
  background: var(--color-raised);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

/** A number input with its unit as a suffix ("hours", "%", a token symbol). */
export const UnitInput = ({
  unit,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { unit: React.ReactNode }) => (
  <UnitWrap>
    <MonoInput type="number" inputMode="decimal" {...props} />
    <Unit aria-hidden>{unit}</Unit>
  </UnitWrap>
)

export const Select = styled.select`
  width: 100%;
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

  &[aria-invalid='true'] {
    border-color: var(--color-danger);
  }

  &:disabled {
    background: var(--color-raised);
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

/* ---------- Switch ---------- */

export const SwitchRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 24px;
  cursor: pointer;
`

export const SwitchText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
`

export const SwitchInput = styled.input`
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

/* ---------- Range ---------- */

export const RangeRow = styled.div`
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto 140px;
  align-items: center;
  gap: 12px;

  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) 120px;

    & > span {
      display: none;
    }
  }
`

export const Range = styled.input`
  width: 100%;
  min-width: 0;
  height: 24px;
  margin: 0;
  accent-color: var(--color-primary);
  cursor: pointer;
`

/* ---------- Upload ---------- */

const DropZone = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
  padding: 16px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius);
  background: var(--color-surface);

  &[aria-invalid='true'] {
    border-color: var(--color-danger);
  }
`

const Preview = styled.img`
  display: block;
  width: 72px;
  height: 72px;
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

/**
 * One upload: a hidden file input the label points at, a button that opens
 * it (behind the Atlas sign-in gate, since uploads go through Atlas), the
 * current file as a preview or a link, and the acceptance rule as help.
 */
export const UploadCard = ({
  id,
  label,
  help,
  hint,
  error,
  accept,
  kind,
  value,
  uploading,
  reject,
  onPick,
}: {
  id: string
  label: React.ReactNode
  help?: React.ReactNode
  /** The acceptance rule ("PNG, SVG, WebP or JPEG, up to 2 MB."). */
  hint: string
  error?: string
  accept: string
  kind: 'image' | 'file'
  /** The IPFS path once uploaded. */
  value?: string
  uploading: boolean
  /** Returns the problem with a picked file, or '' when it is acceptable. */
  reject: (file: File) => string
  onPick: (file: File) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [rejection, setRejection] = useState('')
  const uri = value ? parseIpfs(value) : ''
  const problem = rejection || error
  const helpId = `${id}-help`
  const errorId = `${id}-error`

  const pick = (picked: File) => {
    const next = reject(picked)
    setRejection(next)
    if (!next) onPick(picked)
  }

  return (
    <FieldShell>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <DropZone aria-invalid={problem ? true : undefined}>
        {uri && kind === 'image' && <Preview src={uri} alt="" />}
        {uri && (
          <Small>
            <FileLink href={uri} target="_blank" rel="noopener noreferrer">
              {kind === 'image' ? 'Open the uploaded logo' : 'Open the uploaded PDF'}
              <CurateIcon name="external" size={14} />
            </FileLink>
          </Small>
        )}
        <Row $gap={8} $wrap>
          <EnsureAuth>
            <Button
              type="button"
              $variant="secondary"
              $size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? 'Uploading…' : uri ? 'Replace' : 'Choose a file'}
            </Button>
          </EnsureAuth>
        </Row>
        <Small $muted>{hint}</Small>
        <HiddenInput
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          disabled={uploading}
          tabIndex={-1}
          aria-describedby={
            [help ? helpId : '', problem ? errorId : '']
              .filter(Boolean)
              .join(' ') || undefined
          }
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (picked) pick(picked)
            event.target.value = ''
          }}
        />
      </DropZone>
      {help && <Help id={helpId}>{help}</Help>}
      {problem && (
        <ErrorText id={errorId} role="alert">
          {problem}
        </ErrorText>
      )}
    </FieldShell>
  )
}

/* ---------- Misc ---------- */

/** A mono eyebrow over a group of fields. */
export const Eyebrow = ({ children }: { children: React.ReactNode }) => (
  <Label>{children}</Label>
)

export const ControlStack = Stack
