import React, { useState } from 'react'
import styled from 'styled-components'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { useAtlasProvider } from '@kleros/kleros-app'
import _gtcr from 'assets/abis/PermanentGTCR.json'
import EvidenceForm, { type EvidenceFormValues } from 'components/evidence-form'
import { uploadEvidence } from 'utils/upload-evidence'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import {
  Body,
  Button,
  PanelHeader,
  PanelTitle,
  Small,
  Stack,
  Surface,
} from 'components/curate/primitives'
import { CurateIcon } from 'components/curate/icons'
import { FormBlock, GateHelper, ModalShell, useActionGate } from './shell'

/*
 * Evidence on a Stake Curate item: a title, a description and an optional
 * file, uploaded through Atlas and published on-chain. Inline it is the
 * composer under the history; as a modal it is the same form in a dialog.
 */

const EVIDENCE_FORM_ID = 'submitEvidenceForm'

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 16px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
`

interface EvidenceModalProps {
  item: SubgraphItem
  inline?: boolean
  composerId?: string
  visible?: boolean
  onCancel?: () => void
  title?: React.ReactNode
  [key: string]: unknown
}

const EvidenceModal = ({
  item,
  inline = false,
  composerId = 'evidence-composer',
  visible = false,
  onCancel,
  title,
}: EvidenceModalProps) => {
  const tcrAddress = item?.registry?.id
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { uploadFile } = useAtlasProvider()
  const gate = useActionGate('submit evidence', { needsSignIn: true })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const submitEvidence = async ({
    title: evidenceTitle,
    description,
    evidenceAttachment,
  }: EvidenceFormValues) => {
    if (!account || !walletClient || !publicClient || !tcrAddress) return
    setIsSubmitting(true)
    try {
      const ipfsEvidencePath = await uploadEvidence({
        title: evidenceTitle ?? '',
        description: description ?? '',
        attachment: evidenceAttachment,
        uploadFile,
      })

      const { request } = await simulateContract(wagmiConfig, {
        address: tcrAddress,
        abi: _gtcr,
        functionName: 'submitEvidence',
        args: [item.itemID, ipfsEvidencePath],
        account,
      })

      const result = await wrapWithToast(
        () => walletClient.writeContract(request),
        publicClient,
      )

      if (result.status)
        if (inline) setFormKey((key) => key + 1)
        else onCancel?.()
    } catch (err) {
      console.error('Error submitting evidence:', err)
      errorToast(parseWagmiError(err))
    }
    setIsSubmitting(false)
  }

  const disabled = !gate.ready || isSubmitting

  const form = (
    <Stack $gap={12}>
      <FormBlock>
        <EvidenceForm
          key={formKey}
          onSubmit={submitEvidence}
          formID={EVIDENCE_FORM_ID}
          detailed
        />
      </FormBlock>
      <Footer>
        <Small $muted>
          Evidence is published on-chain and stays with this item.
        </Small>
        <Button
          type="submit"
          form={EVIDENCE_FORM_ID}
          $variant="primary"
          disabled={disabled}
          aria-disabled={disabled}
          title={!gate.ready ? gate.blocker : undefined}
        >
          {isSubmitting ? 'Waiting for your wallet…' : 'Submit evidence'}
        </Button>
      </Footer>
      <GateHelper gate={gate} />
    </Stack>
  )

  if (inline)
    return (
      <Surface
        as="section"
        id={composerId}
        tabIndex={-1}
        $padding="standard"
        aria-label="Add evidence"
      >
        <PanelHeader>
          <PanelTitle>
            <CurateIcon name="policy" size={16} />
            Add evidence
          </PanelTitle>
        </PanelHeader>
        <Body $muted style={{ marginBottom: 12 }}>
          Anyone can add context for the jurors and the curators: a title, what
          it shows, and a file if you have one.
        </Body>
        {form}
      </Surface>
    )

  return (
    <ModalShell
      open={visible}
      title={title ?? 'Submit evidence'}
      onClose={() => onCancel?.()}
    >
      {form}
    </ModalShell>
  )
}

export default EvidenceModal
