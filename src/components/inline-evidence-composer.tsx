import React from 'react'
import styled from 'styled-components'
import EvidenceForm, { type EvidenceFormValues } from 'components/evidence-form'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  PanelHeader,
  PanelTitle,
  Row,
  Small,
  Surface,
} from 'components/curate/primitives'
import { useActionGate } from 'components/curate/item-light-gate'

/*
 * Inline evidence composer at the end of an entry's history: the evidence
 * form, the one submit button, and the blocker named when it is disabled
 * (connect, sign in for the upload, switch network).
 */

const Shell = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 4px;
  scroll-margin-bottom: 96px;
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);

  @media (max-width: 560px) {
    flex-direction: column;
    align-items: stretch;

    button {
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
}: InlineEvidenceComposerProps) => {
  const gate = useActionGate({ verb: 'submit evidence', needsAuth: true })
  const disabled = !!isSubmitting || !gate.ready

  return (
    <Shell
      id={id}
      tabIndex={-1}
      $padding="compact"
      role="region"
      aria-label="Add evidence"
    >
      <PanelHeader>
        <div>
          <PanelTitle>
            <CurateIcon name="policy" size={16} />
            Add evidence
          </PanelTitle>
          <Small $muted>
            Published on-chain and attached to this entry for jurors and
            curators to read.
          </Small>
        </div>
      </PanelHeader>
      <EvidenceForm
        key={formKey}
        onSubmit={onSubmit}
        formID={formID}
        detailed
      />
      <Footer>
        <Small $muted role="status">
          {gate.blocker ??
            'Publishing costs gas only; evidence needs no deposit.'}
        </Small>
        <Row $gap={8} $wrap>
          {gate.controls}
          <Button
            type="submit"
            form={formID}
            $variant="primary"
            disabled={disabled}
            aria-disabled={disabled}
            title={gate.blocker}
          >
            {isSubmitting ? 'Waiting for your wallet…' : 'Submit evidence'}
          </Button>
        </Row>
      </Footer>
    </Shell>
  )
}

export default InlineEvidenceComposer
