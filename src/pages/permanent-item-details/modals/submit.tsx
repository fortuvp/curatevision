import React, { useCallback, useState, useEffect } from 'react'
import { Button, Form, Tooltip, Typography, Alert } from 'components/ui'
import Icon from 'components/ui/Icon'
import styled from 'styled-components'
import _gtcr from 'assets/abis/PermanentGTCR.json'
import { withFormik, type FormikProps } from 'formik'
import humanizeDuration from 'humanize-duration'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { erc20Abi } from 'viem'
import { ItemTypes, typeDefaultValues } from '@kleros/gtcr-encoder'
import InputSelector from 'components/input-selector'
import EnsureAuth from 'components/ensure-auth'
import ETHAmount from 'components/eth-amount'
import useFactory from 'hooks/factory'
import { ArbitrationFeeLabel } from 'components/arbitration-fee-tooltip'
import { addPeriod, capitalizeFirstLetter } from 'utils/string'
import { useAtlasProvider } from '@kleros/kleros-app'
import { resolveStashedFiles } from 'utils/resolve-stashed-files'
import { JSON_UPLOAD_ROLE } from 'utils/atlas-roles'
import useNativeCurrency from 'hooks/native-currency'
import useTokenSymbol from 'hooks/token-symbol'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import { StyledSpin } from './challenge'
import {
  StyledModal,
  SubmissionNavigation,
  SubmissionFlowScaffold,
} from 'pages/light-item-details/modals/submit'

export const StyledAlert = styled(Alert)`
  margin-bottom: 16px;
`

export const StyledParagraph = styled(Typography.Paragraph)`
  font-size: 14px;
  line-height: 1.6;
`

export const DepositContainer = styled.div`
  border: 1px solid ${({ theme }) => theme.borderColor};
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
  background: ${({ theme }) => theme.componentBackground};
`

export const DepositRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.borderColor};
  }
`

export const DepositLabel = styled.span`
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
`

export const SUBMISSION_FORM_ID = 'submitItemForm'

/** A field value is a string, or a File while an upload is stashed. */
type SubmissionFormValues = Record<string, string | File>

type RegistryExistsCheck = (tcrAddress: string) => Promise<boolean>

interface SubmissionFormOuterProps {
  columns: Column[]
  initialValues?: string[]
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

  return (
    <Form onSubmit={p.handleSubmit} id={SUBMISSION_FORM_ID}>
      {p.columns &&
        p.columns.length > 0 &&
        p.columns.map((column, index) => (
          <InputSelector
            style={p.style}
            type={column.type}
            name={`${column.label}`}
            allowedFileTypes={column.allowedFileTypes}
            key={index}
            values={p.values}
            error={p.errors[column.label]}
            setFieldValue={p.setFieldValue}
            disabled={p.disabledFields && p.disabledFields[index]}
            touched={p.touched[column.label]}
            label={
              <span>
                {column.label}&nbsp;
                <Tooltip title={addPeriod(column.description)}>
                  <Icon type="question-circle-o" />
                </Tooltip>
              </span>
            }
          />
        ))}
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
  tokenAddress?: string
  initialValues?: string[]
  submissionDeposit?: { toString: () => string }
  metadata?: SubgraphArbitrationSettingMetadata
  columns?: Column[]
  disabledFields?: boolean[]
  submissionPeriod?: string | number
  withdrawingPeriod?: string | number
  arbitrationCost?: { toString: () => string }
  embedded?: boolean
}> = (props) => {
  const {
    onCancel,
    initialValues,
    submissionDeposit,
    tcrAddress,
    tokenAddress,
    metadata,
    disabledFields,
    submissionPeriod,
    withdrawingPeriod,
    arbitrationCost,
    columns,
    embedded = false,
  } = props

  const nativeCurrency = useNativeCurrency()
  const {
    deployedWithFactory,
    deployedWithLightFactory,
    deployedWithPermanentFactory,
  } = useFactory()
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const { uploadFile } = useAtlasProvider()

  const [balance, setBalance] = useState(0n)
  const [allowance, setAllowance] = useState(0n)
  const [nativeBalance, setNativeBalance] = useState<bigint>()
  const [checkingToken, setCheckingToken] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldsComplete, setFieldsComplete] = useState(false)
  const { symbol: tokenSymbol } = useTokenSymbol(tokenAddress)

  const { itemName, title, policyURI } = metadata || {}

  const checkTokenStatus = useCallback(async () => {
    if (!account || !publicClient || !tokenAddress) return

    setCheckingToken(true)
    try {
      const [bal, allow, nativeBal] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [account],
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [account, tcrAddress as `0x${string}`],
        }),
        publicClient.getBalance({ address: account }),
      ])
      setBalance(bal)
      setAllowance(allow)
      setNativeBalance(nativeBal)
    } catch (err) {
      console.error('Error checking token status:', err)
    }
    setCheckingToken(false)
  }, [account, publicClient, tokenAddress, tcrAddress])

  useEffect(() => {
    checkTokenStatus()
  }, [checkTokenStatus])

  // Reset loading states when modal is closed
  useEffect(
    () => () => {
      setIsApproving(false)
      setIsSubmitting(false)
    },
    [],
  )

  const handleApprove = useCallback(async () => {
    if (!submissionDeposit) return
    setIsApproving(true)
    try {
      const { request } = await simulateContract(wagmiConfig, {
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'approve',
        args: [
          tcrAddress as `0x${string}`,
          BigInt(submissionDeposit.toString()),
        ],
        account,
      })

      const result = await wrapWithToast(
        () => walletClient!.writeContract(request),
        publicClient!,
      )

      if (result.status) {
        await checkTokenStatus()
        setTimeout(async () => {
          await checkTokenStatus()
        }, 5000)
      }
    } catch (err) {
      console.error('Error approving token:', err)
      errorToast(parseWagmiError(err))
    }
    setIsApproving(false)
  }, [
    tokenAddress,
    tcrAddress,
    submissionDeposit,
    checkTokenStatus,
    account,
    walletClient,
    publicClient,
  ])

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
          args: [ipfsEvidencePath, BigInt(submissionDeposit.toString())],
          value: BigInt((arbitrationCost || 0).toString()),
          account,
        })

        const result = await wrapWithToast(
          () => walletClient!.writeContract(request),
          publicClient!,
        )

        if (result.status) {
          onCancel()
          resetForm({})
        }
      } catch (err) {
        console.error('Error submitting item:', err)
        errorToast(parseWagmiError(err))
      }
      setIsSubmitting(false)
    },
    [
      onCancel,
      submissionDeposit,
      tcrAddress,
      arbitrationCost,
      account,
      walletClient,
      publicClient,
      uploadFile,
    ],
  )

  const submissionDepositBigInt = submissionDeposit
    ? BigInt(submissionDeposit.toString())
    : 0n
  const hasEnoughBalance = balance >= submissionDepositBigInt
  const hasEnoughAllowance = allowance >= submissionDepositBigInt
  const hasEnoughNativeBalance =
    nativeBalance != null &&
    nativeBalance >= BigInt((arbitrationCost || 0).toString())

  const renderSubmitButton = () => {
    if (checkingToken)
      return (
        <Button key="checking" loading>
          Checking Token...
        </Button>
      )

    if (!hasEnoughBalance)
      return (
        <Button key="insufficient" disabled>
          Insufficient {tokenSymbol} Balance
        </Button>
      )

    if (!hasEnoughNativeBalance)
      return (
        <Button key="insufficientNative" disabled>
          Not enough {nativeCurrency}
        </Button>
      )

    if (!hasEnoughAllowance)
      return (
        <Button
          key="approve"
          type="primary"
          onClick={handleApprove}
          loading={isApproving}
        >
          Approve {tokenSymbol}
        </Button>
      )

    return (
      <Button
        key="challengeSubmit"
        type="primary"
        form={SUBMISSION_FORM_ID}
        htmlType="submit"
        disabled={!fieldsComplete}
        loading={isSubmitting}
      >
        Submit
      </Button>
    )
  }

  if (!metadata || !submissionDeposit)
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
      tcrTitle={title}
      itemName={itemName}
      nativeCurrency={tokenSymbol || nativeCurrency}
      submissionDeposit={submissionDeposit}
      fileURI={policyURI}
      navigation={
        embedded ? (
          <SubmissionNavigation>
            <Button
              onClick={() => {
                setIsApproving(false)
                setIsSubmitting(false)
                onCancel()
              }}
            >
              Back
            </Button>
            <EnsureAuth>{renderSubmitButton()}</EnsureAuth>
          </SubmissionNavigation>
        ) : undefined
      }
    >
      <SubmissionForm
        columns={columns ?? []}
        postSubmit={postSubmit}
        initialValues={initialValues}
        disabledFields={disabledFields ?? []}
        deployedWithFactory={deployedWithFactory}
        deployedWithLightFactory={deployedWithLightFactory}
        deployedWithPermanentFactory={deployedWithPermanentFactory}
        onFieldsComplete={setFieldsComplete}
      />
      <DepositContainer>
        <DepositRow>
          <DepositLabel>
            <ArbitrationFeeLabel />
          </DepositLabel>
          <ETHAmount
            decimals={3}
            amount={arbitrationCost ? arbitrationCost.toString() : '0'}
            displayUnit={` ${nativeCurrency}`}
          />
        </DepositRow>
        {submissionPeriod && (
          <DepositRow>
            <DepositLabel>Submission period</DepositLabel>
            <span>
              {humanizeDuration(Number(submissionPeriod) * 1000, {
                largest: 2,
                round: true,
              })}
            </span>
          </DepositRow>
        )}
        {withdrawingPeriod && (
          <DepositRow>
            <DepositLabel>Withdrawing period</DepositLabel>
            <span>
              {humanizeDuration(Number(withdrawingPeriod) * 1000, {
                largest: 2,
                round: true,
              })}
            </span>
          </DepositRow>
        )}
      </DepositContainer>
    </SubmissionFlowScaffold>
  )

  if (embedded) return submitContent

  return (
    // @ts-ignore
    <StyledModal
      title={`Submit ${
        (itemName && capitalizeFirstLetter(itemName)) || 'Item'
      }`}
      footer={[
        <Button
          key="back"
          onClick={() => {
            setIsApproving(false)
            setIsSubmitting(false)
            onCancel()
          }}
        >
          Back
        </Button>,
        <EnsureAuth key="ensure-auth">{renderSubmitButton()}</EnsureAuth>,
      ]}
      {...props}
    >
      {submitContent}
    </StyledModal>
  )
}

export default SubmitModal
