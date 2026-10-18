import React, { useEffect, useState, useCallback, useId } from 'react'
import styled from 'styled-components'
import { withFormik, useField, type FormikProps } from 'formik'
import { useDebounce } from 'use-debounce'
import { ethers, type BigNumber } from 'ethers'
import { Roles } from '@kleros/kleros-app'
import { useEthersProvider } from 'hooks/ethers-adapters'
import useArbitrationCost from 'hooks/arbitration-cost'
import useNativeCurrency from 'hooks/native-currency'
import useUrlChainId from 'hooks/use-url-chain-id'
import { klerosAddresses } from 'config/tcr-addresses'
import { formatDurationLong } from 'utils/time'
import {
  Data,
  KeyValueList,
  Label,
  Row,
  SkeletonBlock,
  Small,
  Stack,
} from 'components/curate/primitives'
import KlerosParams from './kleros-params'
import {
  FormField,
  Input,
  Note,
  RangeInput,
  StepHeader,
  SwitchField,
  TextField,
  TextLink,
  UploadField,
  formatNative,
  totalDeposit,
} from './fields'
import { tcrSchemaFor, type FactorySection } from './schemas'
import type { StepProps, TcrState } from '.'

const { getAddress } = ethers.utils

/*
 * Step 1, the list: name, description, logo, policy, deposits (with the
 * court and jurors) and the item name, one section per visual step. Values
 * sync into the cached wizard state as they change; Next submits the form
 * and the section's own schema runs before the wizard advances.
 */

export type { FactorySection } from './schemas'

export const POLICY_EXAMPLE_URL =
  'https://cdn.kleros.link/ipfs/QmUPsjDcKxNv6z6ktnmxkSb4LpqmQ7DT12yG5B73z9uLEy/curated-lists-primary-document.pdf'

const SECTION_COPY: Record<
  FactorySection,
  { title: string; heading: string; lede: string }
> = {
  title: {
    title: 'Name',
    heading: 'Name the list',
    lede: 'Keep it short: the name appears on phones, in notifications and on the list of lists.',
  },
  description: {
    title: 'Description',
    heading: 'Describe what belongs on it',
    lede: 'One sentence on the kind of item the list holds and what the listing criteria are.',
  },
  logo: {
    title: 'Logo',
    heading: 'Add a logo',
    lede: 'The logo identifies the list wherever it appears.',
  },
  policy: {
    title: 'Policy',
    heading: 'Attach the listing policy',
    lede: 'The policy is the document jurors and challengers use to decide whether an item belongs on the list.',
  },
  deposit: {
    title: 'Deposit',
    heading: 'Set the deposits and the court',
    lede: 'A submitter locks a deposit while the challenge period runs. It covers the arbitration cost and rewards a successful challenger; it comes back in full when nobody challenges.',
  },
  custom: {
    title: 'Item name',
    heading: 'Name the items',
    lede: 'The word that replaces “item” in the interface and in notifications, for example “Submit a sock”.',
  },
}

const AmountInput = styled(Input)`
  flex: 0 0 auto;
  width: 96px;
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
`

const SliderEnds = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 8px;
`

const DEPOSIT_MIN = 0
const DEPOSIT_MAX = 30
const DEPOSIT_STEP = 0.01

const clampDeposit = (value: number) =>
  Math.min(DEPOSIT_MAX, Math.max(DEPOSIT_MIN, value))

/* ---------- Shared with the badges step ---------- */

/** The exact amounts from the current values and the loaded arbitration cost. */
export const DepositBreakdown = ({
  submitterBase,
  challengerBase,
  arbitrationCost,
  currency,
  challengePeriodHours,
}: {
  submitterBase: unknown
  challengerBase: unknown
  arbitrationCost?: BigNumber | null
  currency: string
  challengePeriodHours: unknown
}) => {
  const cost = formatNative(arbitrationCost)
  const submitterTotal = formatNative(
    totalDeposit(submitterBase, arbitrationCost),
  )
  const challengerTotal = formatNative(
    totalDeposit(challengerBase, arbitrationCost),
  )
  const hours = Number(challengePeriodHours)
  const period =
    Number.isFinite(hours) && hours > 0
      ? formatDurationLong(hours * 60 * 60)
      : null
  const amount = (value: string | null) =>
    value === null ? (
      <SkeletonBlock $height="18px" $width="120px" />
    ) : (
      <Data>
        {value} {currency}
      </Data>
    )

  return (
    <Note role="group" aria-label="Deposit breakdown">
      <Label>What a submitter and a challenger send</Label>
      <KeyValueList>
        <dt>Submitter sends</dt>
        <dd>
          {amount(submitterTotal)}{' '}
          <Small $muted>
            = {String(submitterBase ?? 0)} base deposit + {cost ?? '…'}{' '}
            arbitration cost
          </Small>
        </dd>
        <dt>Challenger sends</dt>
        <dd>
          {amount(challengerTotal)}{' '}
          <Small $muted>
            = {String(challengerBase ?? 0)} base deposit + {cost ?? '…'}{' '}
            arbitration cost
          </Small>
        </dd>
        <dt>Unchallenged</dt>
        <dd>
          The submitter's deposit comes back in full
          {period ? ` after the ${period} challenge period` : ''}.
        </dd>
        <dt>Challenged and lost</dt>
        <dd>
          The loser's deposit goes to the winner minus the arbitration cost,
          which pays the jurors.
        </dd>
      </KeyValueList>
    </Note>
  )
}

/** A base deposit input with the total (base + arbitration cost) under it. */
export const BaseDepositField = ({
  name,
  label,
  help,
  arbitrationCost,
  currency,
}: {
  name: string
  label: string
  help: string
  arbitrationCost?: BigNumber | null
  currency: string
}) => {
  const [field] = useField<unknown>(name)
  const total = formatNative(totalDeposit(field.value, arbitrationCost))
  return (
    <TextField
      name={name}
      label={label}
      help={help}
      numeric
      placeholder="0.1"
      unit={currency}
      trailing={
        <Small $muted>
          Total with the arbitration cost: {total ?? '…'} {currency}
        </Small>
      }
    />
  )
}

/** The appeal stake multipliers, explained once for both lists. */
export const AppealStakeNote = () => (
  <Note>
    <Label>Appeal stakes</Label>
    <Small $muted>
      To appeal, a side pays the juror fees of the next round plus a stake. The
      stake of the side that finally loses rewards the people who funded the
      winning side. Each stake is a percentage of the round's juror fees: a 100%
      multiplier makes the stake equal to the fees. Large multipliers reward
      crowdfunders but make appeals expensive; small ones make appeals cheap but
      give crowdfunders little reason to take part. The side with the smaller
      multiplier is favoured.
    </Small>
    <Small $muted>
      Total appeal fee for one side = juror fees + juror fees × stake
      multiplier.
    </Small>
  </Note>
)

/* ---------- The step ---------- */

type TCRFormValues = Omit<TcrState, 'transactions'>
type TCRParamsOuterProps = StepProps & { factorySection?: FactorySection }
type TCRParamsProps = TCRParamsOuterProps & FormikProps<TCRFormValues>

const TCRParams = ({
  handleSubmit,
  formId,
  factorySection,
  errors,
  touched,
  values,
  setFieldValue,
  setFieldTouched,
  setTcrState,
  defaultArbLabel,
  defaultArbDataLabel,
  defaultGovernorLabel,
}: TCRParamsProps) => {
  const ids = useId()
  const nativeCurrency = useNativeCurrency()
  const [advancedOptions, setAdvancedOptions] = useState(false)
  const [depositText, setDepositText] = useState(
    String(values.submissionBaseDeposit ?? 0),
  )
  const chainId = useUrlChainId()
  const chainProvider = useEthersProvider({ chainId: chainId ?? undefined })
  const [debouncedArbitrator] = useDebounce(values.arbitratorAddress, 1000)
  const { arbitrator: klerosAddress, policy: policyAddress } =
    (chainId !== null && klerosAddresses[chainId]) || {}
  const { arbitrationCost } = useArbitrationCost({
    address: values.arbitratorAddress,
    arbitratorExtraData: values.arbitratorExtraData,
    library: chainProvider,
  })
  const setArbitratorExtraData = useCallback(
    (val: string) => setFieldValue('arbitratorExtraData', val),
    [setFieldValue],
  )

  let isKlerosArbitrator: boolean
  try {
    isKlerosArbitrator =
      getAddress(debouncedArbitrator) === getAddress(klerosAddress ?? '')
  } catch {
    isKlerosArbitrator = false
  }

  useEffect(() => {
    setTcrState((previousState) => ({
      ...previousState,
      ...values,
    }))
  }, [values, setTcrState])

  const depositVal = clampDeposit(Number(values.submissionBaseDeposit) || 0)

  const onChangeDepositVal = useCallback(
    (value: number) => {
      if (Number.isNaN(value)) return
      const next = clampDeposit(value)
      setFieldValue('submissionBaseDeposit', next)
      setFieldValue('removalBaseDeposit', next)
      setFieldValue('removalChallengeBaseDeposit', next)
    },
    [setFieldValue],
  )

  const show = (section: FactorySection) =>
    !factorySection || factorySection === section
  const copy = factorySection ? SECTION_COPY[factorySection] : null

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate>
      <Stack $gap={20}>
        <StepHeader
          heading={copy ? copy.heading : 'List details'}
          lede={copy?.lede}
        />

        {show('title') && (
          <TextField
            name="tcrTitle"
            label="Name"
            placeholder="Red socks"
            help="Up to 40 characters."
          />
        )}

        {show('description') && (
          <TextField
            name="tcrDescription"
            label="Description"
            placeholder="Images of red socks from various manufacturers"
            help="Up to 255 characters."
          />
        )}

        {show('logo') && (
          <UploadField
            id={`${ids}-logo`}
            label="List logo"
            help="A square image with a transparent background: PNG, SVG, WebP or JPEG, up to 2 MB."
            kind="image"
            role={Roles.Logo}
            value={values.tcrLogo}
            error={errors.tcrLogo}
            showError={!!touched.tcrLogo}
            what="the logo"
            previewAlt="List logo"
            onChange={(uri) => {
              setFieldValue('tcrLogo', uri)
              setFieldTouched('tcrLogo', true)
            }}
          />
        )}

        {show('policy') && (
          <UploadField
            id={`${ids}-policy`}
            label="Listing policy (PDF)"
            help={
              <>
                PDF, up to 4 MB.{' '}
                <TextLink
                  href={POLICY_EXAMPLE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  See an example policy (PDF)
                </TextLink>
              </>
            }
            kind="pdf"
            role={Roles.Policy}
            value={values.tcrPrimaryDocument}
            error={errors.tcrPrimaryDocument}
            showError={!!touched.tcrPrimaryDocument}
            what="the policy"
            onChange={(uri) => {
              setFieldValue('tcrPrimaryDocument', uri)
              setFieldTouched('tcrPrimaryDocument', true)
            }}
          />
        )}

        {show('deposit') && (
          <>
            {!advancedOptions && (
              <FormField
                id={`${ids}-deposit`}
                label="Submission deposit"
                help="The base deposit a submitter locks. The same amount applies to removal requests and to challenging a removal; the arbitration cost is added on top."
                error={errors.submissionBaseDeposit as string | undefined}
                showError={!!touched.submissionBaseDeposit}
              >
                {(a11y) => (
                  <Stack $gap={6}>
                    <Row $gap={12}>
                      <RangeInput
                        type="range"
                        min={DEPOSIT_MIN}
                        max={DEPOSIT_MAX}
                        step={DEPOSIT_STEP}
                        value={depositVal}
                        aria-label="Submission deposit"
                        onChange={(event) => {
                          setDepositText(event.target.value)
                          onChangeDepositVal(Number(event.target.value))
                        }}
                      />
                      <AmountInput
                        {...a11y}
                        type="text"
                        inputMode="decimal"
                        value={depositText}
                        onChange={(event) => {
                          setDepositText(event.target.value)
                          const parsed = Number(event.target.value)
                          if (event.target.value.trim() !== '')
                            onChangeDepositVal(parsed)
                        }}
                        onBlur={() => setDepositText(String(depositVal))}
                      />
                      <Data $muted>{nativeCurrency}</Data>
                    </Row>
                    <SliderEnds>
                      <Small $muted>Lower deposit, more submissions</Small>
                      <Small $muted>Higher deposit, stronger protection</Small>
                    </SliderEnds>
                  </Stack>
                )}
              </FormField>
            )}

            <DepositBreakdown
              submitterBase={values.submissionBaseDeposit}
              challengerBase={values.submissionChallengeBaseDeposit}
              arbitrationCost={arbitrationCost}
              currency={nativeCurrency}
              challengePeriodHours={values.challengePeriodDuration}
            />

            {isKlerosArbitrator ? (
              <KlerosParams
                arbitratorExtraData={values.arbitratorExtraData}
                klerosAddress={debouncedArbitrator}
                policyAddress={policyAddress}
                setArbitratorExtraData={setArbitratorExtraData}
                library={chainProvider}
              />
            ) : (
              <TextField
                name="arbitratorExtraData"
                label="Arbitrator extra data"
                placeholder="0x7331deadbeef..."
                mono
                help={`Hex extra data for the arbitrator (ERC 792). Default: ${defaultArbDataLabel ?? 'the chain default'}.`}
              />
            )}

            <SwitchField
              id={`${ids}-advanced`}
              label="Advanced options"
              help="Set each deposit separately, the challenge period, the governor, the arbitrator and the appeal stakes."
              checked={advancedOptions}
              onChange={setAdvancedOptions}
            />

            {advancedOptions && (
              <>
                <BaseDepositField
                  name="submissionBaseDeposit"
                  label="Submission deposit"
                  help="Locked by a submitter and paid to a successful challenger. Too low and nobody checks submissions; too high and nobody submits."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <BaseDepositField
                  name="removalBaseDeposit"
                  label="Removal deposit"
                  help="Locked by whoever requests a removal and paid to a successful challenger. Too low and compliant items get removed; too high and non-compliant ones stay."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <BaseDepositField
                  name="submissionChallengeBaseDeposit"
                  label="Submission challenge deposit"
                  help="Included in what a challenger sends and paid to the submitter when the challenge fails. Usually zero: being listed is reward enough. Raise it if frivolous challenges are a concern; too high and incorrect items go unchallenged."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <BaseDepositField
                  name="removalChallengeBaseDeposit"
                  label="Removal challenge deposit"
                  help="Included in what a challenger to a removal sends and paid to the requester when the challenge fails. Too high and wrong removals go unchallenged; too low and nobody requests removals."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <TextField
                  name="challengePeriodDuration"
                  label="Challenge period (hours)"
                  placeholder="84"
                  numeric
                  unit="hours"
                  help="How long a submission can be challenged before it is accepted and the deposit returned."
                />
                <TextField
                  name="governorAddress"
                  label="Governor"
                  placeholder="0x7331deadbeef..."
                  mono
                  help={`Can change the deposits, the challenge period, the policy and the governor itself later. Default: ${defaultGovernorLabel ?? 'the chain default'}.`}
                />
                <TextField
                  name="arbitratorAddress"
                  label="Arbitrator"
                  placeholder="0x7331deadbeef..."
                  mono
                  help={`The contract that resolves disputes about challenged submissions and removals. Default: ${defaultArbLabel ?? 'the chain default'}; any ERC 792 arbitrator works.`}
                />
                <AppealStakeNote />
                <TextField
                  name="sharedStakeMultiplier"
                  label="Shared stake multiplier"
                  placeholder="100"
                  numeric
                  unit="%"
                  help="Stake both sides pay to fund an appeal when the round had no winner or loser, for example when the arbitrator refused to rule."
                />
                <TextField
                  name="winnerStakeMultiplier"
                  label="Winner stake multiplier"
                  placeholder="100"
                  numeric
                  unit="%"
                  help="Stake the winner of the previous round pays to fund its side of an appeal."
                />
                <TextField
                  name="loserStakeMultiplier"
                  label="Loser stake multiplier"
                  placeholder="200"
                  numeric
                  unit="%"
                  help="Stake the loser of the previous round pays to fund its side of an appeal."
                />
              </>
            )}
          </>
        )}

        {show('custom') && (
          <>
            <TextField
              name="itemName"
              label="Item name"
              placeholder="sock"
              help="A noun for one entry, up to 20 characters. Buttons then read “Submit a sock”."
            />
            <TextField
              name="itemNamePlural"
              label="Plural"
              placeholder="socks"
              help="The plural of the item name, up to 20 characters."
            />
          </>
        )}
      </Stack>
    </form>
  )
}

export default withFormik<TCRParamsOuterProps, TCRFormValues>({
  validationSchema: ({ factorySection }: TCRParamsOuterProps) =>
    tcrSchemaFor(factorySection),
  mapPropsToValues: ({ tcrState }) => {
    const { transactions: _transactions, ...values } = tcrState
    return values
  },
  handleSubmit: (_, { props: { postSubmit } }) => {
    postSubmit()
  },
})(TCRParams)
