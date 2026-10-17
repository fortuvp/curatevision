import React, { useContext, useState } from 'react'
import { Typography, Button } from 'components/ui'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { getAddress } from 'viem'
import _gtcr from 'assets/abis/LightGeneralizedTCR.json'
import { LightTCRViewContext } from 'contexts/light-tcr-view-context'
import EnsureAuth from 'components/ensure-auth'
import EvidenceForm, { type EvidenceFormValues } from 'components/evidence-form'
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
  const tcrAddress = useContext(LightTCRViewContext)?.tcrAddress
  const { address: account } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { uploadFile } = useAtlasProvider()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const submitEvidence = async ({
    title,
    description,
    evidenceAttachment,
  }: EvidenceFormValues) => {
    if (!account || !walletClient || !publicClient || !tcrAddress) return
    setIsSubmitting(true)
    try {
      const ipfsEvidencePath = await uploadEvidence({
        title: title ?? '',
        description: description ?? '',
        attachment: evidenceAttachment,
        uploadFile,
      })

      const { request } = await simulateContract(wagmiConfig, {
        address: tcrAddress as `0x${string}`,
        abi: _gtcr,
        functionName: 'submitEvidence',
        args: [item.itemID, ipfsEvidencePath],
        account,
      })

      const result = await wrapWithToast(
        () => walletClient.writeContract(request),
        publicClient,
      )

      if (result.status) {
        if (inline) setFormKey((key) => key + 1)
        else onCancel?.()

        if (process.env.REACT_APP_NOTIFICATIONS_API_URL && !!chainId)
          fetch(
            `${process.env.REACT_APP_NOTIFICATIONS_API_URL}/${chainId}/api/subscribe`,
            {
              method: 'post',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscriberAddr: getAddress(account),
                tcrAddr: tcrAddress,
                itemID: item.itemID,
                networkID: chainId,
              }),
            },
          ).catch((err) => {
            console.error('Failed to subscribe for notifications.', err)
          })
      }
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
