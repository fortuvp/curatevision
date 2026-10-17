import React, { useCallback, useEffect, useState } from 'react'
import { ethers } from 'ethers'
import { Modal, Button, Form, Tooltip, Typography } from 'components/ui'
import Icon from 'components/ui/Icon'
import styled from 'styled-components'
import _gtcr from 'assets/abis/LightGeneralizedTCR.json'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { getAddress, keccak256, encodePacked } from 'viem'
import { withFormik, type FormikProps } from 'formik'
import humanizeDuration from 'humanize-duration'
import { ItemTypes, typeDefaultValues } from '@kleros/gtcr-encoder'
import InputSelector from 'components/input-selector'
import EnsureAuth from 'components/ensure-auth'
import ETHAmount from 'components/eth-amount'
import useFactory from 'hooks/factory'
import { addPeriod, capitalizeFirstLetter } from 'utils/string'
import ListingCriteriaLink from 'components/listing-criteria-link'
import { useAtlasProvider } from '@kleros/kleros-app'
import { resolveStashedFiles } from 'utils/resolve-stashed-files'
import { JSON_UPLOAD_ROLE } from 'utils/atlas-roles'
import useNativeCurrency from 'hooks/native-currency'
import useNativeBalance from 'hooks/use-native-balance'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import { StyledSpin, InsufficientBalanceText } from './challenge'

export const StyledModal = styled(Modal)`
  width: min(1180px, calc(100vw - 32px)) !important;
  max-width: calc(100vw - 16px) !important;
  border-radius: 3px;
  background: var(--klerosUIComponentsLightBackground);

  .ui-modal-header {
    display: none;
  }

  .ui-modal-body {
    padding: 0;
    background: var(--klerosUIComponentsLightBackground);
  }

  .ui-modal-footer {
    justify-content: center;
    gap: 24px;
    padding: 24px;
    border-top: 0;
    background: var(--klerosUIComponentsLightBackground);
  }

  @media (max-width: 720px) {
    width: calc(100vw - 16px) !important;
  }
`

export const StyledParagraph = styled(Typography.Paragraph)`
  font-size: 14px;
  line-height: 1.6;
`

export const StyledListingCriteria = styled(Typography.Paragraph)`
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.textSecondary};
  margin-top: 4px;
  margin-bottom: 16px;
`

const SubmissionFlow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0;
  background: var(--klerosUIComponentsLightBackground);
  color: var(--klerosUIComponentsPrimaryText);
`

const SubmissionHeaderCard = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  width: min(91vw, 100%);
  margin: 60px 0 36px;
  padding: 24px clamp(24px, 3vw, 32px);
  border: 1px solid var(--klerosUIComponentsStroke);
  border-radius: 3px;
  background: var(--klerosUIComponentsWhiteBackground);
  box-shadow: var(--v2-shadow);
`

const SubmissionTitle = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--klerosUIComponentsPrimaryText);
  font-size: 24px;
  font-weight: 600;
  line-height: 32px;

  strong {
    color: var(--klerosUIComponentsSecondaryPurple);
    font-weight: 600;
  }
`

const DepositPill = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--klerosUIComponentsPrimaryText);
  font-size: 14px;
  line-height: 18px;

  svg {
    color: var(--klerosUIComponentsSecondaryPurple);
  }
`

const SubmissionWorkspace = styled.div`
  display: grid;
  grid-template-columns: minmax(180px, 220px) minmax(0, 700px);
  justify-content: center;
  align-items: start;
  gap: clamp(24px, 4vw, 44px);
  width: 100%;
  max-width: 87.5rem;
  padding: clamp(24px, 3vw, 28px) clamp(24px, 3vw, 32px) clamp(76px, 8vw, 96px);
  background: var(--klerosUIComponentsLightBackground);

  @media (max-width: 1024px) {
    grid-template-columns: minmax(0, 700px);
  }

  @media (max-width: 900px) {
    padding-inline: 16px;
  }
`

const SubmissionTimeline = styled.ol`
  position: sticky;
  top: 96px;
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 1024px) {
    display: none;
  }
`

const SubmissionStep = styled.li<{ $active?: boolean }>`
  position: relative;
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 12px;
  min-height: 70px;
  color: ${({ $active }) =>
    $active
      ? 'var(--klerosUIComponentsPrimaryBlue)'
      : 'var(--klerosUIComponentsSecondaryText)'};

  &::after {
    content: '';
    position: absolute;
    top: 25px;
    left: 11px;
    width: 1px;
    height: calc(100% - 25px);
    background: var(--klerosUIComponentsStroke);
  }

  &:last-child::after {
    content: none;
  }

  span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid currentColor;
    border-radius: 50%;
    font-size: 12px;
    font-weight: 600;
  }

  strong {
    color: currentColor;
    font-size: 14px;
    font-weight: 600;
    line-height: 18px;
  }

  small {
    display: block;
    margin-top: 4px;
    color: var(--klerosUIComponentsSecondaryText);
    font-size: 12px;
    line-height: 16px;
  }
`

export const SubmissionStageTitle = styled.h2`
  width: min(84vw, 100%);
  margin: 0 0 32px;
  color: var(--klerosUIComponentsPrimaryText);
  text-align: center;
  font-size: 24px;
  line-height: 32px;
  font-weight: 600;
`

const SubmissionMain = styled.div`
  display: grid;
  gap: 24px;
  width: min(100%, 700px);
  min-width: 0;
`

const SubmissionFormCard = styled.div`
  min-width: 0;
  overflow: visible;
  padding: clamp(24px, 4vw, 48px) clamp(24px, 3vw, 32px);
  border: 1px solid var(--klerosUIComponentsStroke);
  border-radius: 3px;
  background: var(--klerosUIComponentsWhiteBackground);
  box-shadow: var(--v2-shadow);
`

const PolicyPanel = styled.div`
  position: relative;
  z-index: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px clamp(20px, 3vw, 28px);
  border-radius: 3px;
  background: var(--klerosUIComponentsMediumBlue);
  color: var(--klerosUIComponentsPrimaryBlue);
  line-height: 22px;
`

export const PolicyReviewPanel = styled.div`
  display: grid;
  gap: 14px;
  color: var(--klerosUIComponentsPrimaryText);
  line-height: 22px;

  p {
    margin: 0;
  }
`

export const SubmissionPreview = styled.div`
  display: grid;
  gap: 12px;
`

export const SubmissionPreviewRow = styled.div`
  display: grid;
  grid-template-columns: minmax(110px, 180px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
  padding: 12px 0;
  border-bottom: 1px solid var(--klerosUIComponentsStroke);

  &:last-child {
    border-bottom: 0;
  }

  small {
    color: var(--klerosUIComponentsSecondaryText);
    font-size: 13px;
    line-height: 18px;
  }

  span {
    min-width: 0;
    color: var(--klerosUIComponentsPrimaryText);
    font-size: 14px;
    line-height: 20px;
    overflow-wrap: anywhere;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 6px;
  }
`

export const SubmissionNavigation = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 24px;
  margin-top: clamp(24px, 4vw, 32px);
`

type SubmissionStage = 'field' | 'policy' | 'preview'

export const SubmissionFlowScaffold = ({
  tcrTitle,
  itemName,
  nativeCurrency,
  submissionDeposit,
  challengePeriodDuration,
  fileURI,
  activeStep = 0,
  fieldLabels = [],
  navigation,
  children,
}: {
  tcrTitle?: string
  itemName?: string
  nativeCurrency: string
  submissionDeposit: { toString: () => string }
  challengePeriodDuration?: { toNumber: () => number }
  fileURI?: string
  activeStep?: number
  fieldLabels?: string[]
  navigation?: React.ReactNode
  children: React.ReactNode
}) => (
  <SubmissionFlow>
    <SubmissionHeaderCard>
      <SubmissionTitle>
        <span>Submit {capitalizeFirstLetter(itemName ?? '') || 'Item'} to</span>
        <strong>{tcrTitle || 'this list'}</strong>
      </SubmissionTitle>
      <DepositPill>
        <Icon type="dollar" />
        <span>Deposit required:&nbsp;</span>
        <ETHAmount
          decimals={3}
          amount={submissionDeposit.toString()}
          displayUnit={` ${nativeCurrency}`}
        />
      </DepositPill>
    </SubmissionHeaderCard>
    <SubmissionWorkspace>
      <SubmissionTimeline>
        <SubmissionStep $active={activeStep === 0}>
          <span>1</span>
          <div>
            <strong>Item Details</strong>
            {fieldLabels.slice(0, 4).map((label) => (
              <small key={label}>{label}</small>
            ))}
          </div>
        </SubmissionStep>
        <SubmissionStep $active={activeStep === 1}>
          <span>2</span>
          <div>
            <strong>Policy Review</strong>
            <small>Check the list criteria.</small>
          </div>
        </SubmissionStep>
        <SubmissionStep $active={activeStep === 2}>
          <span>3</span>
          <div>
            <strong>Preview</strong>
            <small>Confirm and submit.</small>
          </div>
        </SubmissionStep>
      </SubmissionTimeline>
      <SubmissionMain>
        <SubmissionFormCard>{children}</SubmissionFormCard>
        {navigation}
        <PolicyPanel>
          <div>
            Make sure your submission complies with the{' '}
            <ListingCriteriaLink fileURI={fileURI}>
              listing criteria
            </ListingCriteriaLink>{' '}
            to avoid challenges.
          </div>
          <div>
            This is a deposit, not a fee. It is reimbursed if your submission is
            accepted.
            {challengePeriodDuration
              ? ` The challenge period lasts ${humanizeDuration(
                  challengePeriodDuration.toNumber() * 1000,
                )}.`
              : ''}
          </div>
        </PolicyPanel>
      </SubmissionMain>
    </SubmissionWorkspace>
  </SubmissionFlow>
)

export const SUBMISSION_FORM_ID = 'submitItemForm'

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

        const itemFile = new File(
          [JSON.stringify({ columns, values: resolvedValues })],
          'item.json',
          { type: 'application/json' },
        )
        const ipfsEvidencePath = await uploadFile(itemFile, JSON_UPLOAD_ROLE)
        if (!ipfsEvidencePath)
          throw new Error('Failed to upload item metadata to IPFS.')

        const { request } = await simulateContract(wagmiConfig, {
          address: tcrAddress as `0x${string}`,
          abi: _gtcr,
          functionName: 'addItem',
          args: [ipfsEvidencePath],
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
          // Subscribe for notifications
          if (process.env.REACT_APP_NOTIFICATIONS_API_URL && !!chainId) {
            const itemID = keccak256(
              encodePacked(['string'], [ipfsEvidencePath]),
            )
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
