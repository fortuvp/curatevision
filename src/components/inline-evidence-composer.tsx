import React from 'react'
import styled from 'styled-components'
import EvidenceForm, { type EvidenceFormValues } from 'components/evidence-form'
import { Button, Row, Small, Surface } from 'components/curate/primitives'
import { useActionGate } from 'components/curate/item-light-gate'

/*
 * Inline evidence composer at the end of an entry's history: the evidence
 * form, the one submit button, and the blocker named when it is disabled
 * (connect, sign in for the upload, switch network).
 */

const Shell = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 18px;
  scroll-margin-bottom: 140px;
`

const Head = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const Title = styled.h2`
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 28px;
  font-weight: 500;
  letter-spacing: -0.02em;
`

const Footer = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--glass-border);

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
      $padding="standard"
      role="region"
      aria-label="Add evidence"
    >
      <Head>
        <Title>Add evidence</Title>
        <Small $muted>
          Published on-chain with this entry, for jurors and curators to read.
        </Small>
      </Head>
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
          {/* One coloured button per view: while the gate's own control
              (Connect, Sign in, Switch) is the next step, submit waits as
              a secondary button. */}
          <Button
            type="submit"
            form={formID}
            $variant={gate.ready ? 'primary' : 'secondary'}
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
