import React from 'react'
import styled from 'styled-components'
import { Button } from 'components/ui'
import EnsureAuth from 'components/ensure-auth'
import EvidenceForm, { type EvidenceFormValues } from 'components/evidence-form'
import { CurateIcon } from 'components/curate/icons'

const ComposerShell = styled.section`
  position: sticky;
  bottom: 16px;
  z-index: 3;
  margin-top: 18px;
  padding: 16px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-card);
  box-shadow: var(--v2-shadow-hover);

  @media (max-width: 720px) {
    bottom: 8px;
    margin-top: 14px;
    padding: 12px;
  }
`

const ComposerHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 14px;

  @media (max-width: 640px) {
    flex-direction: column;
  }
`

const ComposerTitle = styled.div`
  display: grid;
  gap: 4px;
  min-width: 0;

  strong {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: var(--v2-text);
    font-size: 15px;
    line-height: 20px;
    font-weight: 700;
  }

  span {
    color: var(--v2-muted);
    font-size: 13px;
    line-height: 18px;
  }
`

const ComposerBody = styled.div`
  display: grid;
  gap: 12px;

  .ui-form-item {
    margin-bottom: 12px;
  }

  input,
  textarea {
    border-radius: 3px !important;
    background: var(--v2-soft) !important;
    color: var(--v2-text) !important;
  }

  textarea {
    min-height: 94px;
    resize: vertical;
  }

  .ui-upload.ui-upload-select-picture-card {
    border-radius: 3px !important;
    background: var(--v2-soft) !important;
  }
`

const ComposerFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--v2-stroke);

  small {
    color: var(--v2-muted);
    font-size: 12px;
    line-height: 16px;
  }

  @media (max-width: 640px) {
    align-items: stretch;
    flex-direction: column;

    > span,
    button,
    a {
      width: 100%;
    }
  }
`

interface InlineEvidenceComposerProps {
  id?: string
  formID: string
  formKey?: number
  isSubmitting?: boolean
  onSubmit: (values: EvidenceFormValues) => void
}

const InlineEvidenceComposer = ({
  id = 'evidence-composer',
  formID,
  formKey,
  isSubmitting,
  onSubmit,
}: InlineEvidenceComposerProps) => (
  <ComposerShell id={id} tabIndex={-1}>
    <ComposerHeader>
      <ComposerTitle>
        <strong>
          <CurateIcon name="policy" size={16} />
          Evidence thread
        </strong>
        <span>Add context while keeping the request history in view.</span>
      </ComposerTitle>
    </ComposerHeader>
    <ComposerBody>
      <EvidenceForm
        key={formKey}
        onSubmit={onSubmit}
        formID={formID}
        detailed
      />
      <ComposerFooter>
        <small>
          Evidence is published onchain and becomes part of this item.
        </small>
        <EnsureAuth>
          <Button
            type="primary"
            form={formID}
            htmlType="submit"
            loading={isSubmitting}
          >
            Submit evidence
          </Button>
        </EnsureAuth>
      </ComposerFooter>
    </ComposerBody>
  </ComposerShell>
)

export default InlineEvidenceComposer
