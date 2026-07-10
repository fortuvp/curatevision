import React, { useState } from 'react'
import { Typography, Button } from 'components/ui'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import _gtcr from 'assets/abis/PermanentGTCR.json'
import EnsureAuth from 'components/ensure-auth'
import EvidenceForm from 'components/evidence-form'
import InlineEvidenceComposer from 'components/inline-evidence-composer'
import { useAtlasProvider } from '@kleros/kleros-app'
import { uploadEvidence } from 'utils/upload-evidence'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import { StyledModal } from './challenge'

interface EvidenceModalProps {
  item: SubgraphItem
  inline?: boolean
  composerId?: string
  visible?: boolean
  onCancel?: () => void
  [key: string]: unknown
}

const EvidenceModal = ({
  item,
  inline = false,
  composerId = 'evidence-composer',
  onCancel,
  ...rest
}: EvidenceModalProps) => {
  const tcrAddress = item?.registry?.id
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { uploadFile } = useAtlasProvider()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const submitEvidence = async ({ title, description, evidenceAttachment }) => {
    setIsSubmitting(true)
    try {
      const ipfsEvidencePath = await uploadEvidence({
        title,
        description,
        attachment: evidenceAttachment as File | undefined,
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

  const EVIDENCE_FORM_ID = 'submitEvidenceForm'

  if (inline)
    return (
      <InlineEvidenceComposer
        id={composerId}
        formID={EVIDENCE_FORM_ID}
        formKey={formKey}
        isSubmitting={isSubmitting}
        onSubmit={submitEvidence}
      />
    )

  return (
    <StyledModal
      footer={[
        <Button key="back" onClick={onCancel}>
          Back
        </Button>,
        <EnsureAuth key="ensure-auth">
          <Button
            key="submitEvidence"
            type="primary"
            form={EVIDENCE_FORM_ID}
            htmlType="submit"
            loading={isSubmitting}
          >
            Submit
          </Button>
        </EnsureAuth>,
      ]}
      onCancel={onCancel}
      {...rest}
    >
      <Typography.Title level={4}>Evidence Submission</Typography.Title>
      <EvidenceForm
        onSubmit={submitEvidence}
        formID={EVIDENCE_FORM_ID}
        detailed
      />
    </StyledModal>
  )
}

export default EvidenceModal
