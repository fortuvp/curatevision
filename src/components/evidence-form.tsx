import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import { withFormik, Field, type FormikProps, type FieldProps } from 'formik'
import * as yup from 'yup'
import {
  Button,
  Data,
  IconButton,
  Small,
  Stack,
  TextInput,
} from 'components/curate/primitives'
import { CurateIcon } from 'components/curate/icons'
import { FieldError, FieldLabel } from 'components/curate/item-light-notice'

/*
 * Evidence form (ERC-1497): a title (when detailed), a description and an
 * optional attachment. The file is stashed in form state and uploaded only
 * at submit time, after the Atlas sign-in gate, so the upload never races
 * the sign-in flow.
 */

const MAX_FILE_MB = 4

const FieldBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const Textarea = styled.textarea`
  width: 100%;
  min-height: 112px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
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
`

const Attachment = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-raised);
`

const Preview = styled.img`
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: var(--radius-sm);
  object-fit: cover;
  background: var(--color-surface);
`

const FileIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-muted);
`

const FileMeta = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  > * {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const HiddenInput = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
`

const PickRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`

export interface EvidenceFormValues {
  title?: string
  description?: string
  evidenceAttachment?: File
  [key: string]: unknown
}

interface EvidenceFormOuterProps {
  formID: string
  detailed?: boolean
  onSubmit: (values: EvidenceFormValues) => void
}

type EvidenceFormProps = EvidenceFormOuterProps &
  FormikProps<EvidenceFormValues>

const EvidenceForm = ({
  formID,
  detailed,
  handleSubmit,
  setFieldValue,
  values,
}: EvidenceFormProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const file = values.evidenceAttachment as File | undefined

  // Defer the actual IPFS upload to submit time. The parent's confirm button
  // is the EnsureAuth/SIWE gate; if we uploaded here the request would race
  // the sign-in flow and fail before the user is verified.
  const onPick = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const picked = event.currentTarget.files?.[0]
      event.currentTarget.value = ''
      if (!picked) return
      if (picked.size / 1024 / 1024 >= MAX_FILE_MB) {
        setFileError(`File must be smaller than ${MAX_FILE_MB}MB.`)
        return
      }
      setFileError(null)
      setFieldValue('evidenceAttachment', picked)
    },
    [setFieldValue],
  )

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <form id={formID} onSubmit={handleSubmit} noValidate>
      <Stack $gap={14}>
        {detailed && (
          <Field name="title">
            {({
              field,
              form: { errors },
            }: FieldProps<string | undefined, EvidenceFormValues>) => (
              <FieldBlock>
                <FieldLabel htmlFor={`${formID}-title`}>Title</FieldLabel>
                <TextInput
                  id={`${formID}-title`}
                  {...field}
                  value={field.value ?? ''}
                  placeholder="A short title for this evidence"
                  maxLength={255}
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <FieldError role="alert">{String(errors.title)}</FieldError>
                )}
              </FieldBlock>
            )}
          </Field>
        )}
        <Field name="description">
          {({
            field,
            form: { errors },
          }: FieldProps<string | undefined, EvidenceFormValues>) => (
            <FieldBlock>
              <FieldLabel htmlFor={`${formID}-description`}>
                Description
              </FieldLabel>
              <Textarea
                id={`${formID}-description`}
                {...field}
                value={field.value ?? ''}
                rows={5}
                placeholder="What the jurors should know, with references to the listing policy"
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <FieldError role="alert">
                  {String(errors.description)}
                </FieldError>
              )}
            </FieldBlock>
          )}
        </Field>
        <FieldBlock>
          <FieldLabel htmlFor={`${formID}-file`}>Attachment</FieldLabel>
          {file ? (
            <Attachment>
              {previewUrl && file.type.includes('image') ? (
                <Preview src={previewUrl} alt="" />
              ) : (
                <FileIcon aria-hidden>
                  <CurateIcon name="policy" size={16} />
                </FileIcon>
              )}
              <FileMeta>
                <Data title={file.name}>{file.name}</Data>
                <Small $muted>{formatSize(file.size)}</Small>
              </FileMeta>
              <IconButton
                type="button"
                aria-label="Remove attachment"
                onClick={() => setFieldValue('evidenceAttachment', undefined)}
              >
                <CurateIcon name="close" size={14} />
              </IconButton>
            </Attachment>
          ) : (
            <PickRow>
              <Button
                type="button"
                $variant="secondary"
                $size="sm"
                onClick={() => inputRef.current?.click()}
              >
                Attach a file
              </Button>
              <Small $muted>
                Optional, up to {MAX_FILE_MB} MB. It is uploaded when you
                submit.
              </Small>
            </PickRow>
          )}
          <HiddenInput
            ref={inputRef}
            id={`${formID}-file`}
            type="file"
            tabIndex={-1}
            onChange={onPick}
          />
          {fileError && <FieldError role="alert">{fileError}</FieldError>}
        </FieldBlock>
      </Stack>
    </form>
  )
}

const validationSchema = ({ detailed }: { detailed?: boolean }) =>
  yup.object().shape({
    ...(detailed
      ? {
          title: yup
            .string()
            .required('An evidence title is required.')
            .max(
              255,
              'The evidence title should be at most 255 characters long.',
            ),
        }
      : {}),
    description: yup
      .string()
      .required('An evidence description is required.')
      .max(1024, 'The description must be less than 1024 characters long.'),
  })

export default withFormik<EvidenceFormOuterProps, EvidenceFormValues>({
  validationSchema,
  handleSubmit: (values, { props: { onSubmit } }) => {
    onSubmit(values)
  },
})(EvidenceForm)
