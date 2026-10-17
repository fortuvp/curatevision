import React, { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { Button, Form, Tooltip } from 'components/ui'
import Icon from 'components/ui/Icon'
import { abi as _gtcr } from '@kleros/tcr/build/contracts/GeneralizedTCR.json'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { getAddress, keccak256 } from 'viem'
import { withFormik, type FormikProps } from 'formik'
import { gtcrEncode, ItemTypes, typeDefaultValues } from '@kleros/gtcr-encoder'
import InputSelector from 'components/input-selector'
import EnsureAuth from 'components/ensure-auth'
import useFactory from 'hooks/factory'
import { useAtlasProvider } from '@kleros/kleros-app'
import { resolveStashedFiles } from 'utils/resolve-stashed-files'
import { addPeriod, capitalizeFirstLetter } from 'utils/string'
import useNativeCurrency from 'hooks/native-currency'
import useNativeBalance from 'hooks/use-native-balance'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import {
  PolicyReviewPanel,
  SUBMISSION_FORM_ID,
  SubmissionNavigation,
  SubmissionPreview,
  SubmissionPreviewRow,
  SubmissionStageTitle,
  StyledModal,
  SubmissionFlowScaffold,
} from 'pages/light-item-details/modals/submit'
import {
  StyledSpin,
  InsufficientBalanceText,
} from 'pages/light-item-details/modals/challenge'

type SubmissionStage = 'field' | 'policy' | 'preview'

/** A field value is a string, or a File while an upload is stashed. */
type SubmissionFormValues = Record<string, string | File>

type RegistryExistsCheck = (tcrAddress: string) => Promise<boolean>

interface SubmissionFormOuterProps {
  columns: Column[]
  initialValues?: string[]
  activeStage?: SubmissionStage
  activeFieldIndex?: number
  disabledFields: boolean[]
  postSubmit: (
    values: SubmissionFormValues,
    columns: Column[],
    resetForm: (nextState?: Record<string, unknown>) => void,
    setFieldValue: (
      field: string,
      value: unknown,
      shouldValidate?: boolean,
    ) => void,
  ) => void
  deployedWithFactory: RegistryExistsCheck
  deployedWithLightFactory: RegistryExistsCheck
  deployedWithPermanentFactory: RegistryExistsCheck
  onFieldsComplete?: (complete: boolean) => void
  style?: React.CSSProperties
}

const _SubmissionForm: React.FC<
  SubmissionFormOuterProps & FormikProps<SubmissionFormValues>
> = (p) => {
  useEffect(() => {
    if (!p.onFieldsComplete || !p.columns) return
    const allFilled = p.columns.every((column) => {
      if (column.type === ItemTypes.BOOLEAN) return true
      if (column.optional) return true
      const value = p.values[column.label]
      return value !== undefined && value !== '' && String(value).trim() !== ''
    })
    p.onFieldsComplete(allFilled)
  }, [p])

  const activeStage = p.activeStage || 'field'
  const activeFieldIndex = p.activeFieldIndex || 0
  const activeColumn = p.columns?.[activeFieldIndex]

  return (
    <Form onSubmit={p.handleSubmit} id={SUBMISSION_FORM_ID}>
      {activeStage === 'field' && activeColumn && (
        <>
          <SubmissionStageTitle>{activeColumn.label}</SubmissionStageTitle>
          <InputSelector
            style={p.style}
            type={activeColumn.type}
            name={`${activeColumn.label}`}
            allowedFileTypes={activeColumn.allowedFileTypes}
            key={activeFieldIndex}
            values={p.values}
            error={p.errors[activeColumn.label]}
            setFieldValue={p.setFieldValue}
            disabled={p.disabledFields && p.disabledFields[activeFieldIndex]}
            touched={p.touched[activeColumn.label]}
            label={
              <span>
                {activeColumn.label}&nbsp;
                <Tooltip title={addPeriod(activeColumn.description)}>
                  <Icon type="question-circle-o" />
                </Tooltip>
              </span>
            }
          />
        </>
      )}
      {activeStage === 'policy' && (
        <>
          <SubmissionStageTitle>Policy Review</SubmissionStageTitle>
          <PolicyReviewPanel>
            <p>
              Review the list policy before submitting. Incorrect entries can be
              challenged and removed.
            </p>
            <p>
              The deposit is returned if the submission is accepted and no valid
              challenge succeeds.
            </p>
          </PolicyReviewPanel>
        </>
      )}
      {activeStage === 'preview' && (
        <>
          <SubmissionStageTitle>Preview</SubmissionStageTitle>
          <SubmissionPreview>
            {p.columns.map((column) => {
              const value = p.values[column.label]
              const displayValue =
                value instanceof File
                  ? value.name
                  : value === undefined || value === ''
                    ? 'Not provided'
                    : String(value)

              return (
                <SubmissionPreviewRow key={column.label}>
                  <small>{column.label}</small>
                  <span>{displayValue}</span>
                </SubmissionPreviewRow>
              )
            })}
          </SubmissionPreview>
        </>
      )}
    </Form>
  )
}

const SubmissionForm = withFormik<
  SubmissionFormOuterProps,
  SubmissionFormValues
>({
  mapPropsToValues: ({ columns, initialValues }) =>
    columns.reduce((acc: Record<string, string>, curr: Column, i: number) => {
      const defaultValue = initialValues
        ? initialValues[i]
        : curr.type === 'number'
          ? ''
          : typeDefaultValues[curr.type]

      return {
        ...acc,
        [curr.label]: String(defaultValue),
      }
    }, {}),
  handleSubmit: (values, { props, resetForm, setFieldValue }) => {
    props.postSubmit(values, props.columns, resetForm, setFieldValue)
  },
  validate: async (
    values,
    {
      columns,
      deployedWithFactory,
      deployedWithLightFactory,
      deployedWithPermanentFactory,
    },
  ) => {
    const errors = (
      await Promise.all(
        columns
          .filter(({ type }: Column) => type === ItemTypes.GTCR_ADDRESS)
          .map(async ({ label }: Column) => {
            const value = values[label]
            // A GTCR address column always holds a string; a stashed File
            // is never a registry address, so it reads as "not deployed".
            const address = typeof value === 'string' ? value : ''
            return {
              isEmpty: !value,
              wasDeployedWithFactory:
                !!value &&
                ((await deployedWithFactory(address)) ||
                  (await deployedWithLightFactory(address)) ||
                  (await deployedWithPermanentFactory(address))),
              label: label,
            }
          }),
      )
    )
      .filter(
        (res: {
          wasDeployedWithFactory: boolean
          isEmpty: boolean
          label: string
        }) => !res.wasDeployedWithFactory || res.isEmpty,
      )
      .reduce(
        (
          acc: Record<string, string>,
          curr: {
            wasDeployedWithFactory: boolean
            isEmpty: boolean
            label: string
          },
        ) => ({
          ...acc,
          [curr.label]: curr.isEmpty
            ? `Enter a list address to proceed.`
            : `This address was not deployed with the list creator.`,
        }),
        {},
      )
    if (Object.keys(errors as Record<string, string>).length > 0) throw errors
  },
})(_SubmissionForm)

const SubmitModal: React.FC<{
  onCancel: () => void
  visible?: boolean
  tcrAddress?: string
  initialValues?: string[]
  submissionDeposit?: ethers.BigNumber
  metaEvidence?: MetaEvidence
  disabledFields?: boolean[]
  challengePeriodDuration?: ethers.BigNumber
  embedded?: boolean
}> = (props) => {
  const {
    onCancel,
    initialValues,
    submissionDeposit,
    tcrAddress,
    metaEvidence,
    disabledFields,
    challengePeriodDuration,
    embedded = false,
  } = props
  const nativeCurrency = useNativeCurrency()
  const { address: account } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { uploadFile } = useAtlasProvider()
  const { balance: nativeBalance } = useNativeBalance()
  const insufficientBalance =
    nativeBalance !== undefined &&
    submissionDeposit &&
    nativeBalance < BigInt(submissionDeposit.toString())
  const {
    deployedWithFactory,
    deployedWithLightFactory,
    deployedWithPermanentFactory,
  } = useFactory()

  const { fileURI, metadata } = metaEvidence || {}
  const { itemName, columns, tcrTitle } = metadata || {}

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldsComplete, setFieldsComplete] = useState(false)
  const [activeStage, setActiveStage] = useState<SubmissionStage>('field')
  const [activeFieldIndex, setActiveFieldIndex] = useState(0)
  const activeStep =
    activeStage === 'field' ? 0 : activeStage === 'policy' ? 1 : 2
  const fieldLabels = columns?.map((column) => column.label) || []

  const goBack = useCallback(() => {
    if (activeStage === 'preview') {
      setActiveStage('policy')
      return
    }
    if (activeStage === 'policy') {
      setActiveStage('field')
      setActiveFieldIndex(Math.max(0, (columns?.length || 1) - 1))
      return
    }
    if (activeFieldIndex > 0) {
      setActiveFieldIndex((index) => Math.max(0, index - 1))
      return
    }
    onCancel()
  }, [activeFieldIndex, activeStage, columns?.length, onCancel])

  const goNext = useCallback(() => {
    if (activeStage === 'field') {
      if (activeFieldIndex < (columns?.length || 1) - 1) {
        setActiveFieldIndex((index) => index + 1)
        return
      }
      setActiveStage('policy')
      return
    }
    if (activeStage === 'policy') setActiveStage('preview')
  }, [activeFieldIndex, activeStage, columns?.length])

  const postSubmit = useCallback(
    async (
      values: Record<string, string | File>,
      columns: Column[],
      resetForm: (nextState?: Record<string, unknown>) => void,
      setFieldValue: (
        field: string,
        value: unknown,
        shouldValidate?: boolean,
      ) => void,
    ) => {
      if (!submissionDeposit) return
      setIsSubmitting(true)
      try {
        const resolvedValues = await resolveStashedFiles({
          columns,
          values,
          uploadFile,
          setFieldValue,
        })

        const encodedParams = gtcrEncode({
          columns,
          values: resolvedValues,
        })

        const { request } = await simulateContract(wagmiConfig, {
          address: tcrAddress as `0x${string}`,
          abi: _gtcr,
          functionName: 'addItem',
          args: [encodedParams],
          value: BigInt(submissionDeposit.toString()),
          account,
        })

        const result = await wrapWithToast(
          () => walletClient!.writeContract(request),
          publicClient!,
        )

        if (result.status) {
          onCancel()
          resetForm({})

          if (process.env.REACT_APP_NOTIFICATIONS_API_URL && !!chainId) {
            const itemID = keccak256(encodedParams as `0x${string}`)
            fetch(
              `${process.env.REACT_APP_NOTIFICATIONS_API_URL}/${chainId}/api/subscribe`,
              {
                method: 'post',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscriberAddr: getAddress(account!),
                  tcrAddr: getAddress(tcrAddress as `0x${string}`),
                  itemID,
                  networkID: chainId,
                }),
              },
            ).catch((err) => {
              console.error('Failed to subscribe for notifications.', err)
            })
          }
        }
      } catch (err) {
        console.error('Error submitting item:', err)
        errorToast(parseWagmiError(err))
      }
      setIsSubmitting(false)
    },
    [
      account,
      chainId,
      onCancel,
      publicClient,
      submissionDeposit,
      tcrAddress,
      uploadFile,
      walletClient,
    ],
  )

  if (!metaEvidence || !submissionDeposit)
    return (
      // @ts-ignore
      <StyledModal
        title="Submit Item"
        footer={[
          <Button key="back" onClick={onCancel}>
            Cancel
          </Button>,
        ]}
        {...props}
      >
        <StyledSpin />
      </StyledModal>
    )

  const submitContent = (
    <SubmissionFlowScaffold
      tcrTitle={tcrTitle}
      itemName={itemName}
      nativeCurrency={nativeCurrency}
      submissionDeposit={submissionDeposit}
      challengePeriodDuration={challengePeriodDuration}
      fileURI={fileURI}
      activeStep={activeStep}
      fieldLabels={fieldLabels}
      navigation={
        <SubmissionNavigation>
          <Button onClick={goBack}>
            {activeStage === 'field' && activeFieldIndex === 0
              ? 'Cancel'
              : 'Previous'}
          </Button>
          {activeStage === 'preview' ? (
            <EnsureAuth>
              <div>
                <Button
                  key="challengeSubmit"
                  type="primary"
                  form={SUBMISSION_FORM_ID}
                  htmlType="submit"
                  disabled={!!insufficientBalance || !fieldsComplete}
                  loading={isSubmitting}
                >
                  Submit
                </Button>
                {insufficientBalance && (
                  <InsufficientBalanceText>
                    Insufficient balance
                  </InsufficientBalanceText>
                )}
              </div>
            </EnsureAuth>
          ) : (
            <Button type="primary" onClick={goNext}>
              Next
            </Button>
          )}
        </SubmissionNavigation>
      }
    >
      <SubmissionForm
        columns={columns ?? []}
        activeStage={activeStage}
        activeFieldIndex={activeFieldIndex}
        postSubmit={postSubmit}
        initialValues={initialValues}
        disabledFields={disabledFields ?? []}
        deployedWithFactory={deployedWithFactory}
        deployedWithLightFactory={deployedWithLightFactory}
        deployedWithPermanentFactory={deployedWithPermanentFactory}
        onFieldsComplete={setFieldsComplete}
      />
    </SubmissionFlowScaffold>
  )

  if (embedded) return submitContent

  return (
    // @ts-ignore
    <StyledModal
      title={`Submit ${
        (itemName && capitalizeFirstLetter(itemName)) || 'Item'
      }`}
      footer={null}
      {...props}
    >
      {submitContent}
    </StyledModal>
  )
}

export default SubmitModal
