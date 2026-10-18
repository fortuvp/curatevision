import React, { useCallback, useId, useRef, useState } from 'react'
import styled from 'styled-components'
import { useField } from 'formik'
import { toast } from 'react-toastify'
import { ethers, BigNumber, type BigNumberish } from 'ethers'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { appKitModal } from 'config/wagmi'
import { NETWORKS_INFO } from 'config/networks'
import useUrlChainId from 'hooks/use-url-chain-id'
import { parseIpfs } from 'utils/ipfs-parse'
import { errorToast, infoToast, successToast } from 'utils/wrap-with-toast'
import {
  Body,
  Button,
  Data,
  Label,
  Row,
  Small,
  Subheading,
  TextInput,
} from 'components/curate/primitives'

/*
 * The wizard's form controls, on the primitives: a labelled field with
 * visible help text (no hover tooltips) and the validation message inline,
 * text and number inputs, a native select, a switch, a range slider and the
 * IPFS upload through Atlas. Formik binding goes through `useField`, so the
 * steps keep their `withFormik` wrappers and yup schemas.
 */

/* ---------- Amounts ---------- */

/** "0.05" from a wei amount, trailing zeros trimmed; null while unknown. */
export const formatNative = (
  amount: BigNumberish | null | undefined,
): string | null => {
  if (amount === null || amount === undefined) return null
  const integer =
    typeof amount === 'number'
      ? amount.toLocaleString('fullwide', { useGrouping: false })
      : String(amount)
  return ethers.utils.formatEther(integer).replace(/\.?0+$/, '')
}

/** base + arbitration cost in wei, or null while either is unknown or invalid. */
export const totalDeposit = (
  base: unknown,
  arbitrationCost: BigNumberish | null | undefined,
): BigNumber | null => {
  if (arbitrationCost === null || arbitrationCost === undefined) return null
  try {
    return ethers.utils
      .parseEther(String(base ?? '0'))
      .add(BigNumber.from(arbitrationCost))
  } catch {
    return null
  }
}

/* ---------- Layout ---------- */

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

  &:disabled {
    background: var(--color-raised);
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

const UnitRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  ${Input} {
    flex: 1;
  }
`

/** Range slider: the thumb is a control, so it takes the action color. */
export const RangeInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 24px;
  margin: 0;
  accent-color: var(--color-primary);
  cursor: pointer;
`

const SwitchRow = styled.label`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  cursor: pointer;
`

const SwitchText = styled.span`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
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
  max-width: 100%;
  max-height: 120px;
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

export const TextLink = styled.a`
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

/** A raised block of explanatory copy inside a step. */
export const Note = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
`

/* ---------- Step header ---------- */

const HeaderShell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
`

export const StepHeader = ({
  eyebrow,
  heading,
  lede,
}: {
  eyebrow?: React.ReactNode
  heading: string
  lede?: React.ReactNode
}) => (
  <HeaderShell>
    {eyebrow && <Label>{eyebrow}</Label>}
    <Subheading>{heading}</Subheading>
    {lede && <Body $muted>{lede}</Body>}
  </HeaderShell>
)

/* ---------- Field wrapper ---------- */

export interface FieldA11y {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

export const FormField = ({
  id,
  label,
  help,
  error,
  showError,
  children,
}: {
  id: string
  label: React.ReactNode
  help?: React.ReactNode
  error?: string
  showError?: boolean
  children: (a11y: FieldA11y) => React.ReactNode
}) => {
  const helpId = `${id}-help`
  const errorId = `${id}-error`
  const invalid = !!showError && !!error
  const describedBy =
    [help ? helpId : '', invalid ? errorId : ''].filter(Boolean).join(' ') ||
    undefined
  return (
    <Shell>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {help && <Help id={helpId}>{help}</Help>}
      {children({
        id,
        'aria-invalid': invalid || undefined,
        'aria-describedby': describedBy,
      })}
      {invalid && <ErrorText id={errorId}>{error}</ErrorText>}
    </Shell>
  )
}

/* ---------- Formik-bound text field ---------- */

export const TextField = ({
  name,
  label,
  help,
  placeholder,
  unit,
  mono,
  numeric,
  trailing,
}: {
  name: string
  label: React.ReactNode
  help?: React.ReactNode
  placeholder?: string
  /** A unit after the input: the currency, "hours", "%". */
  unit?: React.ReactNode
  mono?: boolean
  numeric?: boolean
  /** Extra content under the input, e.g. the total with the arbitration cost. */
  trailing?: React.ReactNode
}) => {
  const id = useId()
  const [field, meta] = useField<string | number | undefined>(name)
  const Control = mono ? MonoInput : Input
  const value =
    field.value === undefined || field.value === null ? '' : String(field.value)
  return (
    <FormField
      id={id}
      label={label}
      help={help}
      error={meta.error}
      showError={meta.touched}
    >
      {(a11y) => (
        <>
          <UnitRow>
            <Control
              {...a11y}
              type="text"
              name={field.name}
              value={value}
              placeholder={placeholder}
              inputMode={numeric ? 'decimal' : undefined}
              spellCheck={mono ? false : undefined}
              autoComplete="off"
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
            {unit && <Data $muted>{unit}</Data>}
          </UnitRow>
          {trailing}
        </>
      )}
    </FormField>
  )
}

/* ---------- Switch ---------- */

export const SwitchField = ({
  id: givenId,
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  id?: string
  label: React.ReactNode
  help?: React.ReactNode
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
}) => {
  const generated = useId()
  const id = givenId ?? generated
  return (
    <SwitchRow htmlFor={id}>
      <SwitchText>
        {label}
        {help && <Help>{help}</Help>}
      </SwitchText>
      <SwitchInput
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </SwitchRow>
  )
}

/* ---------- Wallet and sign-in gate ---------- */

export interface WalletGate {
  /** The first blocker, if any: connect, switch chain, sign in. */
  blocker?: string
  /** The control that clears the blocker, or null. */
  control: React.ReactNode
}

const signIn = (authoriseUser: () => Promise<unknown>) => {
  infoToast('Signing in...')
  authoriseUser()
    .then(() => successToast('Signed in successfully.'))
    .catch((err) => {
      console.error(err)
      errorToast(`Sign-in failed: ${err?.message ?? 'unknown error'}`)
    })
}

/**
 * Connect, then (for anything that writes on the URL chain) the chain
 * switch, then the Atlas sign-in uploads need. Each blocker names the
 * action it blocks: "Connect wallet to upload the logo".
 */
export const useWalletGate = ({
  verb,
  needsChain = false,
}: {
  verb: string
  needsChain?: boolean
}): WalletGate => {
  const { isConnected } = useAccount()
  const walletChainId = useChainId()
  const urlChainId = useUrlChainId()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { isVerified, isSigningIn, authoriseUser } = useAtlasProvider()

  const chainName = urlChainId
    ? (NETWORKS_INFO[urlChainId as keyof typeof NETWORKS_INFO]?.name ??
      `chain ${urlChainId}`)
    : undefined
  const wrongChain =
    needsChain && isConnected && !!urlChainId && walletChainId !== urlChainId

  if (!isConnected)
    return {
      blocker: `Connect wallet to ${verb}`,
      control: (
        <Button
          type="button"
          $variant="secondary"
          $size="sm"
          onClick={() => appKitModal?.open({ view: 'Connect' })}
        >
          Connect wallet
        </Button>
      ),
    }
  if (wrongChain && urlChainId)
    return {
      blocker: `Switch to ${chainName} to ${verb}`,
      control: (
        <Button
          type="button"
          $variant="secondary"
          $size="sm"
          disabled={switching}
          onClick={() => switchChain({ chainId: urlChainId })}
        >
          {switching ? 'Waiting…' : `Switch to ${chainName}`}
        </Button>
      ),
    }
  if (!isVerified)
    return {
      blocker: `Sign in to ${verb}`,
      control: (
        <Button
          type="button"
          $variant="secondary"
          $size="sm"
          disabled={isSigningIn}
          onClick={() => signIn(authoriseUser)}
        >
          {isSigningIn ? 'Waiting…' : 'Sign in'}
        </Button>
      ),
    }
  return { control: null }
}

/* ---------- IPFS upload through Atlas ---------- */

const IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
])
const IMAGE_MAX_MB = 2
const PDF_MAX_MB = 4

/** The same acceptance rules the previous wizard enforced before uploading. */
const rejectUpload = (file: File, kind: 'image' | 'pdf'): string => {
  if (kind === 'image') {
    if (!IMAGE_TYPES.has(file.type)) return 'Please use PNG, webp, jpeg or SVG.'
    if (file.size / 1024 / 1024 >= IMAGE_MAX_MB)
      return `Image must be smaller than ${IMAGE_MAX_MB}MB.`
    return ''
  }
  if (file.type !== 'application/pdf') return 'Please upload file as PDF.'
  if (file.size / 1024 / 1024 >= PDF_MAX_MB)
    return `File must be smaller than ${PDF_MAX_MB}MB.`
  return ''
}

export const UploadField = ({
  id,
  label,
  help,
  kind,
  role,
  value,
  error,
  showError,
  what,
  previewAlt,
  onChange,
}: {
  id: string
  label: React.ReactNode
  help?: React.ReactNode
  kind: 'image' | 'pdf'
  role: Roles
  /** The IPFS URI already uploaded, or an empty string. */
  value: string
  error?: string
  showError?: boolean
  /** "the logo", "the policy": used in the blockers and the button. */
  what: string
  previewAlt?: string
  onChange: (uri: string) => void
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [rejection, setRejection] = useState('')
  const { uploadFile } = useAtlasProvider()
  const gate = useWalletGate({ verb: `upload ${what}` })
  const invalid = !!showError && !!error
  const uri = value ? parseIpfs(value) : ''

  const pick = useCallback(
    async (file: File) => {
      const problem = rejectUpload(file, kind)
      setRejection(problem)
      if (problem) {
        toast.error(problem)
        return
      }
      setUploading(true)
      try {
        const fileURI = await uploadFile(file, role)
        if (!fileURI) throw new Error('Failed to upload file to IPFS.')
        onChange(fileURI)
        toast.success('File uploaded successfully.')
      } catch (err) {
        console.error(err)
        toast.error('File upload failed.')
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [kind, onChange, role, uploadFile],
  )

  return (
    <FormField
      id={id}
      label={label}
      help={help}
      error={error}
      showError={showError}
    >
      {(a11y) => (
        <>
          <DropZone aria-invalid={invalid || undefined}>
            {uri && kind === 'image' && (
              <Preview src={uri} alt={previewAlt ?? 'Uploaded image'} />
            )}
            {uri && kind === 'pdf' && (
              <Small>
                <TextLink
                  href={uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open the uploaded ${what.replace(/^the /, '')} (PDF)`}
                >
                  Open the uploaded file (PDF)
                </TextLink>
              </Small>
            )}
            {gate.blocker ? (
              <Row $gap={10} $wrap>
                {gate.control}
                <Small $muted role="status">
                  {gate.blocker}
                </Small>
              </Row>
            ) : (
              <Row $gap={8} $wrap>
                <Button
                  type="button"
                  $variant="secondary"
                  $size="sm"
                  disabled={uploading}
                  aria-describedby={a11y['aria-describedby']}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading
                    ? 'Uploading…'
                    : uri
                      ? 'Replace'
                      : `Choose ${what.replace(/^the /, 'the ')}`}
                </Button>
                {uri && (
                  <Button
                    type="button"
                    $variant="ghost"
                    $size="sm"
                    disabled={uploading}
                    onClick={() => {
                      setRejection('')
                      onChange('')
                    }}
                  >
                    Remove
                  </Button>
                )}
              </Row>
            )}
            {uploading && (
              <Small $muted role="status">
                Uploading to IPFS…
              </Small>
            )}
            <HiddenInput
              ref={inputRef}
              id={a11y.id}
              type="file"
              accept={kind === 'image' ? [...IMAGE_TYPES].join(',') : '.pdf'}
              tabIndex={-1}
              aria-invalid={a11y['aria-invalid']}
              aria-describedby={a11y['aria-describedby']}
              onChange={(event) => {
                const picked = event.target.files?.[0]
                if (picked) pick(picked)
              }}
            />
          </DropZone>
          {rejection && <ErrorText role="alert">{rejection}</ErrorText>}
        </>
      )}
    </FormField>
  )
}
