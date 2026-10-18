import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { withFormik, type FormikProps } from 'formik'
import * as yup from 'yup'
import { useDebounce } from 'use-debounce'
import { ethers } from 'ethers'
import { toast } from 'react-toastify'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { useEthersProvider } from 'hooks/ethers-adapters'
import useArbitrationCost from 'hooks/arbitration-cost'
import useNativeCurrency from 'hooks/native-currency'
import useTokenSymbol from 'hooks/token-symbol'
import useUrlChainId from 'hooks/use-url-chain-id'
import { klerosAddresses } from 'config/tcr-addresses'
import { NETWORKS_INFO } from 'config/networks'
import { Explainer } from 'components/curate/explainer'
import {
  Body,
  Data,
  Label,
  SkeletonBlock,
  Small,
  Stack,
  Subheading,
} from 'components/curate/primitives'
import KlerosParams from './kleros-params'
import {
  Field,
  FieldGrid,
  FormSection,
  FullWidth,
  Input,
  MonoInput,
  Range,
  RangeRow,
  SectionHead,
  SwitchInput,
  SwitchRow,
  SwitchText,
  UnitInput,
  UploadCard,
} from './controls'
import {
  EXAMPLE_POLICY_URL,
  LOGO_MAX_MB,
  LOGO_TYPES,
  POLICY_MAX_MB,
  POLICY_TYPE,
  STAKE_SLIDER,
  WIZARD_DEFAULTS,
} from './defaults'
import { formatNative } from './format'
import type { StepProps, TcrState } from '.'

/*
 * Step 1 of the Stake Curate factory: the list's identity, logo and policy,
 * the stake token and minimum stake, the court, and the advanced periods,
 * addresses and appeal multipliers. The deposit is shown as its two parts,
 * an ERC-20 stake and a native arbitration deposit, never as one sum.
 */

const { getAddress } = ethers.utils

type TCRFormValues = Omit<TcrState, 'transactions'>
type TCRParamsProps = StepProps & FormikProps<TCRFormValues>

const rejectLogo = (file: File): string => {
  if (!LOGO_TYPES.has(file.type)) return 'Use a PNG, SVG, WebP or JPEG image.'
  if (file.size / 1024 / 1024 >= LOGO_MAX_MB)
    return `The image must be smaller than ${LOGO_MAX_MB} MB.`
  return ''
}

const rejectPolicy = (file: File): string => {
  if (file.type !== POLICY_TYPE) return 'Upload the policy as a PDF.'
  if (file.size / 1024 / 1024 >= POLICY_MAX_MB)
    return `The file must be smaller than ${POLICY_MAX_MB} MB.`
  return ''
}

const APPEAL_STEPS = [
  {
    title: 'Appeals need fees and a stake',
    body: 'To appeal, each side pays the juror fees for the next round plus an extra stake. The stake of the side that loses pays the people who funded the winning side.',
  },
  {
    title: 'The multipliers set the stake',
    body: 'Each stake is a share of the juror fees for the appeal: a multiplier of 10% makes the stake 10% of those fees. The winner, loser and shared multipliers apply to the side the court favours, the other side, and a round with no ruling.',
  },
  {
    title: 'Larger or smaller',
    body: 'Large multipliers reward funders but can make appeals too expensive to reach; small ones keep appeals cheap but may not attract funders. The further the winner and loser multipliers are apart, the more the side with the smaller one is favoured.',
  },
]

const TCRParams = (props: TCRParamsProps) => {
  const {
    handleSubmit,
    formId,
    errors,
    touched,
    values,
    setFieldValue,
    getFieldProps,
    setTcrState,
    defaultArbLabel,
    defaultArbDataLabel,
    defaultGovernorLabel,
    defaultStakeTokenLabel,
  } = props
  const nativeCurrency = useNativeCurrency()
  const { uploadFile } = useAtlasProvider()
  const [uploading, setUploading] = useState<{
    tcrLogo?: boolean
    tcrPrimaryDocument?: boolean
  }>({})
  const [advancedOptions, setAdvancedOptions] = useState(false)
  const [depositVal, setDepositVal] = useState(() => {
    const stored = Number(values.submissionMinDeposit)
    return Number.isNaN(stored) ? WIZARD_DEFAULTS.submissionMinDeposit : stored
  })
  const chainId = useUrlChainId()
  const chainName =
    chainId === null
      ? 'this chain'
      : (NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]?.name ??
        `chain ${chainId}`)
  const chainProvider = useEthersProvider({ chainId: chainId ?? undefined })
  const [debouncedArbitrator] = useDebounce(values.arbitratorAddress, 1000)
  const { arbitrator: klerosAddress, policy: policyAddress } =
    (chainId !== null && klerosAddresses[chainId]) || {}
  const { arbitrationCost } = useArbitrationCost({
    address: values.arbitratorAddress,
    arbitratorExtraData: values.arbitratorExtraData,
    library: chainProvider,
  })
  const { symbol: tokenSymbol, loading: loadingSymbol } = useTokenSymbol(
    values.tokenAddress || undefined,
  )
  const setArbitratorExtraData = useCallback(
    (val: string) => setFieldValue('arbitratorExtraData', val),
    [setFieldValue],
  )

  const isKlerosArbitrator = useMemo(() => {
    try {
      return getAddress(debouncedArbitrator) === getAddress(klerosAddress ?? '')
    } catch {
      return false
    }
  }, [debouncedArbitrator, klerosAddress])

  useEffect(() => {
    setTcrState((previousState) => ({
      ...previousState,
      ...values,
    }))
  }, [values, setTcrState])

  const upload = useCallback(
    async (
      field: 'tcrLogo' | 'tcrPrimaryDocument',
      role: Roles,
      file: File,
    ) => {
      setUploading((previous) => ({ ...previous, [field]: true }))
      try {
        const fileURI = await uploadFile(file, role)
        if (!fileURI) throw new Error('Failed to upload file to IPFS.')
        setFieldValue(field, fileURI)
        toast.success('File uploaded successfully.')
      } catch (err) {
        console.error(err)
        toast.error('File upload failed.')
      } finally {
        setUploading((previous) => ({ ...previous, [field]: false }))
      }
    },
    [setFieldValue, uploadFile],
  )

  const onChangeDepositVal = useCallback(
    (value: number) => {
      if (Number.isNaN(value)) return
      setDepositVal(value)
      setFieldValue('submissionMinDeposit', value)
    },
    [setFieldValue],
  )

  const fieldError = (name: keyof TCRFormValues): string | undefined =>
    touched[name] && errors[name] ? String(errors[name]) : undefined

  const symbolKnown =
    !!values.tokenAddress && !loadingSymbol && tokenSymbol !== 'tokens'
  const stakeShown = Number(values.submissionMinDeposit)

  return (
    <form id={formId} noValidate onSubmit={handleSubmit}>
      <Stack $gap={24}>
        <FormSection>
          <SectionHead>
            <Label>Step 1 of 3</Label>
            <Subheading>List parameters</Subheading>
            <Body $muted>
              What the list is called, what it holds and what it costs to add
              an entry. Defaults are filled in; change what you need.
            </Body>
          </SectionHead>
          <FieldGrid>
            <Field
              id="tcrTitle"
              label="Title"
              help="Short: it appears in notifications and on cards. At most 40 characters."
              error={fieldError('tcrTitle')}
            >
              {(aria) => (
                <Input {...aria} type="text" {...getFieldProps('tcrTitle')} />
              )}
            </Field>
            <Field
              id="tcrDescription"
              label="Description"
              help="One sentence on what belongs in the list. At most 255 characters."
              error={fieldError('tcrDescription')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="text"
                  {...getFieldProps('tcrDescription')}
                />
              )}
            </Field>
            <Field
              id="itemName"
              label="Item name"
              help='A noun for one entry. It replaces the word "item" everywhere, as in "Submit a sock". At most 20 characters.'
              error={fieldError('itemName')}
            >
              {(aria) => (
                <Input {...aria} type="text" {...getFieldProps('itemName')} />
              )}
            </Field>
            <Field
              id="itemNamePlural"
              label="Plural item name"
              help='Its plural, as in "socks". At most 20 characters.'
              error={fieldError('itemNamePlural')}
            >
              {(aria) => (
                <Input
                  {...aria}
                  type="text"
                  {...getFieldProps('itemNamePlural')}
                />
              )}
            </Field>
          </FieldGrid>
        </FormSection>

        <FormSection>
          <SectionHead>
            <Label>Logo and policy</Label>
            <Body $muted>
              Uploads go through Atlas, so they ask for a wallet connection and
              a sign-in.
            </Body>
          </SectionHead>
          <FieldGrid>
            <UploadCard
              id="tcr-logo"
              label="List logo"
              help="A square image with a transparent background."
              hint={`PNG, SVG, WebP or JPEG, up to ${LOGO_MAX_MB} MB.`}
              accept={[...LOGO_TYPES].join(',')}
              kind="image"
              value={values.tcrLogo}
              uploading={!!uploading.tcrLogo}
              reject={rejectLogo}
              onPick={(file) => upload('tcrLogo', Roles.Logo, file)}
              error={fieldError('tcrLogo')}
            />
            <UploadCard
              id="primary-document"
              label="Acceptance criteria (primary document)"
              help={
                <>
                  The policy jurors and challengers apply to every submission.{' '}
                  <a
                    href={EXAMPLE_POLICY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    See an example policy
                  </a>
                  .
                </>
              }
              hint={`PDF, up to ${POLICY_MAX_MB} MB.`}
              accept={POLICY_TYPE}
              kind="file"
              value={values.tcrPrimaryDocument}
              uploading={!!uploading.tcrPrimaryDocument}
              reject={rejectPolicy}
              onPick={(file) =>
                upload('tcrPrimaryDocument', Roles.Policy, file)
              }
              error={fieldError('tcrPrimaryDocument')}
            />
          </FieldGrid>
        </FormSection>

        <FormSection>
          <SectionHead>
            <Label>Deposit</Label>
            <Body $muted>
              A submitter locks a stake in the list token for as long as the
              entry is listed and pays the court&apos;s arbitration deposit in{' '}
              {nativeCurrency}. A low stake invites wrong entries; a high one
              keeps submitters away.
            </Body>
          </SectionHead>
          <FieldGrid>
            <FullWidth>
              <Field
                id="tokenAddress"
                label="Stake token address"
                help={
                  defaultStakeTokenLabel
                    ? `The ERC-20 submitters stake. Pre-filled with ${defaultStakeTokenLabel} on ${chainName}.${symbolKnown ? ` Detected ${tokenSymbol}.` : ''}`
                    : `The ERC-20 submitters stake. There is no default on ${chainName}; enter the token's address.${symbolKnown ? ` Detected ${tokenSymbol}.` : ''}`
                }
                error={fieldError('tokenAddress')}
              >
                {(aria) => (
                  <MonoInput
                    {...aria}
                    type="text"
                    placeholder="0x…"
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="none"
                    {...getFieldProps('tokenAddress')}
                  />
                )}
              </Field>
            </FullWidth>
            {!advancedOptions && (
              <FullWidth>
                <Field
                  id="depositSlider"
                  label="Minimum stake"
                  help="What a submitter locks at least. Drag towards the cheap end to bring more submissions, towards the safe end to make wrong entries worth challenging."
                  error={fieldError('submissionMinDeposit')}
                >
                  {(aria) => (
                    <RangeRow>
                      <Small $muted>Cheapest</Small>
                      <Range
                        type="range"
                        aria-label="Minimum stake slider"
                        min={STAKE_SLIDER.min}
                        max={STAKE_SLIDER.max}
                        step={STAKE_SLIDER.step}
                        value={depositVal}
                        onChange={(event) =>
                          onChangeDepositVal(Number(event.target.value))
                        }
                      />
                      <Small $muted>Safest</Small>
                      <UnitInput
                        {...aria}
                        unit={tokenSymbol}
                        min={STAKE_SLIDER.min}
                        max={STAKE_SLIDER.max}
                        step={STAKE_SLIDER.step}
                        value={depositVal}
                        onChange={(event) =>
                          onChangeDepositVal(Number(event.target.value))
                        }
                      />
                    </RangeRow>
                  )}
                </Field>
              </FullWidth>
            )}
            <FullWidth>
              <Stack $gap={4} aria-label="What a submitter sends">
                <Small>
                  <Data>
                    {Number.isNaN(stakeShown)
                      ? values.submissionMinDeposit
                      : stakeShown}{' '}
                    {tokenSymbol}
                  </Data>{' '}
                  <Small $muted>stake, locked while the item is listed</Small>
                </Small>
                <Small>
                  {arbitrationCost ? (
                    <Data>
                      {formatNative(arbitrationCost)} {nativeCurrency}
                    </Data>
                  ) : (
                    <SkeletonBlock
                      $width="96px"
                      $height="18px"
                      style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                      }}
                    />
                  )}{' '}
                  <Small $muted>arbitration deposit</Small>
                </Small>
              </Stack>
            </FullWidth>
          </FieldGrid>
        </FormSection>

        <FormSection>
          <SectionHead>
            <Label>Court</Label>
          </SectionHead>
          {isKlerosArbitrator ? (
            <KlerosParams
              arbitratorExtraData={values.arbitratorExtraData}
              klerosAddress={debouncedArbitrator}
              policyAddress={policyAddress}
              setArbitratorExtraData={setArbitratorExtraData}
              library={chainProvider}
            />
          ) : (
            <Field
              id="arbitratorExtraData"
              label="Arbitrator extra data"
              help={`Passed to the arbitrator with every dispute (ERC-792). ${defaultArbDataLabel ?? ''}`}
              error={fieldError('arbitratorExtraData')}
            >
              {(aria) => (
                <MonoInput
                  {...aria}
                  type="text"
                  placeholder="0x…"
                  spellCheck={false}
                  autoComplete="off"
                  {...getFieldProps('arbitratorExtraData')}
                />
              )}
            </Field>
          )}
        </FormSection>

        <FormSection>
          <SwitchRow htmlFor="advancedOptions">
            <SwitchText>
              Advanced options
              <Small $muted>
                Periods, governor and arbitrator addresses, challenger stake
                and appeal multipliers.
              </Small>
            </SwitchText>
            <SwitchInput
              id="advancedOptions"
              type="checkbox"
              role="switch"
              checked={advancedOptions}
              onChange={() => setAdvancedOptions((toggle) => !toggle)}
            />
          </SwitchRow>
        </FormSection>

        {advancedOptions && (
          <FormSection>
            <FieldGrid>
              <Field
                id="submissionMinDeposit"
                label="Minimum submission stake"
                help="The least a submitter can stake on an entry. A successful challenger takes it."
                error={fieldError('submissionMinDeposit')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit={tokenSymbol}
                    step={0.0001}
                    min={0}
                    placeholder={String(WIZARD_DEFAULTS.submissionMinDeposit)}
                    {...getFieldProps('submissionMinDeposit')}
                  />
                )}
              </Field>
              <Field
                id="submissionPeriodDuration"
                label="Submission period"
                help="How long a new entry must go unchallenged before it counts as accepted."
                error={fieldError('submissionPeriodDuration')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="hours"
                    step={1}
                    min={0}
                    placeholder={String(
                      WIZARD_DEFAULTS.submissionPeriodDuration,
                    )}
                    {...getFieldProps('submissionPeriodDuration')}
                  />
                )}
              </Field>
              <Field
                id="reinclusionPeriodDuration"
                label="Reinclusion period"
                help="How long an entry that jurors kept must go unchallenged before it counts as accepted again."
                error={fieldError('reinclusionPeriodDuration')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="hours"
                    step={1}
                    min={0}
                    placeholder={String(
                      WIZARD_DEFAULTS.reinclusionPeriodDuration,
                    )}
                    {...getFieldProps('reinclusionPeriodDuration')}
                  />
                )}
              </Field>
              <Field
                id="withdrawingPeriodDuration"
                label="Withdrawing period"
                help="How long a submitter waits between asking to withdraw an entry and getting the stake back."
                error={fieldError('withdrawingPeriodDuration')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="hours"
                    step={1}
                    min={0}
                    placeholder={String(
                      WIZARD_DEFAULTS.withdrawingPeriodDuration,
                    )}
                    {...getFieldProps('withdrawingPeriodDuration')}
                  />
                )}
              </Field>
              <Field
                id="arbitrationParamsCooldown"
                label="Arbitration parameters cooldown"
                help="How long a new policy or new arbitration settings wait before they apply."
                error={fieldError('arbitrationParamsCooldown')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="hours"
                    step={1}
                    min={0}
                    placeholder={String(
                      WIZARD_DEFAULTS.arbitrationParamsCooldown,
                    )}
                    {...getFieldProps('arbitrationParamsCooldown')}
                  />
                )}
              </Field>
              <Field
                id="challengeStakeMultiplier"
                label="Challenger stake"
                help="The challenger's stake as a share of the entry's stake. It comes back if the challenge wins and joins the entry's stake if it loses."
                error={fieldError('challengeStakeMultiplier')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="%"
                    step={1}
                    min={0}
                    placeholder={String(
                      WIZARD_DEFAULTS.challengeStakeMultiplier,
                    )}
                    {...getFieldProps('challengeStakeMultiplier')}
                  />
                )}
              </Field>
              <Field
                id="governorAddress"
                label="Governor"
                help={`Can change the periods, deposits and policy, and hand the role to another address. Default: ${defaultGovernorLabel ?? 'none'}.`}
                error={fieldError('governorAddress')}
              >
                {(aria) => (
                  <MonoInput
                    {...aria}
                    type="text"
                    placeholder="0x…"
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="none"
                    {...getFieldProps('governorAddress')}
                  />
                )}
              </Field>
              <Field
                id="arbitratorAddress"
                label="Arbitrator"
                help={`The contract that rules on challenges. Default: ${defaultArbLabel ?? 'none'}; any ERC-792 arbitrator works.`}
                error={fieldError('arbitratorAddress')}
              >
                {(aria) => (
                  <MonoInput
                    {...aria}
                    type="text"
                    placeholder="0x…"
                    spellCheck={false}
                    autoComplete="off"
                    autoCapitalize="none"
                    {...getFieldProps('arbitratorAddress')}
                  />
                )}
              </Field>
            </FieldGrid>

            <Explainer
              id="factory-permanent-appeals"
              eyebrow="Appeals"
              heading="How appeal stakes work"
              steps={APPEAL_STEPS}
            />

            <FieldGrid>
              <Field
                id="sharedStakeMultiplier"
                label="Shared stake multiplier"
                help="Both sides, when there is no winner or loser (the arbitrator refused to rule)."
                error={fieldError('sharedStakeMultiplier')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="%"
                    step={1}
                    min={0}
                    placeholder={String(WIZARD_DEFAULTS.sharedStakeMultiplier)}
                    {...getFieldProps('sharedStakeMultiplier')}
                  />
                )}
              </Field>
              <Field
                id="winnerStakeMultiplier"
                label="Winner stake multiplier"
                help="The side the court currently favours."
                error={fieldError('winnerStakeMultiplier')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="%"
                    step={1}
                    min={0}
                    placeholder={String(WIZARD_DEFAULTS.winnerStakeMultiplier)}
                    {...getFieldProps('winnerStakeMultiplier')}
                  />
                )}
              </Field>
              <Field
                id="loserStakeMultiplier"
                label="Loser stake multiplier"
                help="The side the court currently rules against."
                error={fieldError('loserStakeMultiplier')}
              >
                {(aria) => (
                  <UnitInput
                    {...aria}
                    unit="%"
                    step={1}
                    min={0}
                    placeholder={String(WIZARD_DEFAULTS.loserStakeMultiplier)}
                    {...getFieldProps('loserStakeMultiplier')}
                  />
                )}
              </Field>
            </FieldGrid>
            <Small $muted>
              Total appeal fee for one side = juror fees + juror fees × stake
              multiplier.
            </Small>
          </FormSection>
        )}
      </Stack>
    </form>
  )
}

const validationSchema = yup.object().shape({
  tcrTitle: yup
    .string()
    .required('A title is required.')
    .max(40, 'Title must be less than 40 characters long.'),
  tcrDescription: yup
    .string()
    .required('A description is required.')
    .max(255, 'Description must be less than 255 characters long.'),
  arbitratorAddress: yup
    .string()
    .required('An arbitrator address is required.')
    .max(42, 'Ethereum addresses are 42 characters long.'),
  arbitratorExtraData: yup
    .string()
    .required('The arbitrator extra data is required.'),
  governorAddress: yup
    .string()
    .required('A governor address is required.')
    .max(42, 'Ethereum addresses are 42 characters long.'),
  tokenAddress: yup
    .string()
    .required('A stake token address is required.')
    .max(42, 'Ethereum addresses are 42 characters long.'),
  itemName: yup
    .string()
    .required('An item name is required.')
    .max(20, 'The item name must be less than 20 characters long.'),
  itemNamePlural: yup
    .string()
    .required('The plural of the item name is required.')
    .max(20, 'The item name must be less than 20 characters long.'),
  submissionMinDeposit: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  submissionPeriodDuration: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  reinclusionPeriodDuration: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  withdrawingPeriodDuration: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  arbitrationParamsCooldown: yup
    .number()
    .typeError('Amount should be a number.')
    .required('A value is required.')
    .min(0, 'The amount must not be negative.'),
  tcrPrimaryDocument: yup.string().required('A primary document is required.'),
  tcrLogo: yup.string().required('A logo is required.'),
  challengeStakeMultiplier: yup
    .number()
    .typeError('Amount should be a number.')
    .min(0, 'The stake multiplier cannot be negative.')
    .required('A value is required'),
  sharedStakeMultiplier: yup
    .number()
    .typeError('Amount should be a number.')
    .min(0, 'The stake multiplier cannot be negative.')
    .required('A value is required'),
  winnerStakeMultiplier: yup
    .number()
    .typeError('Amount should be a number.')
    .min(0, 'The stake multiplier cannot be negative.')
    .required('A value is required'),
  loserStakeMultiplier: yup
    .number()
    .typeError('Amount should be a number.')
    .min(0, 'The stake multiplier cannot be negative.')
    .required('A value is required'),
})

export default withFormik<StepProps, TCRFormValues>({
  validationSchema,
  mapPropsToValues: ({ tcrState }) => {
    const { transactions: _transactions, ...values } = tcrState
    return values
  },
  handleSubmit: (_, { props: { postSubmit } }) => {
    postSubmit()
  },
})(TCRParams)
