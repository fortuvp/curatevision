import React, { useEffect, useState, useCallback, useId } from 'react'
import styled from 'styled-components'
import { withFormik, type FormikProps } from 'formik'
import * as yup from 'yup'
import { useDebounce } from 'use-debounce'
import { ethers } from 'ethers'
import { Roles } from '@kleros/kleros-app'
import { useEthersProvider } from 'hooks/ethers-adapters'
import useArbitrationCost from 'hooks/arbitration-cost'
import useNativeCurrency from 'hooks/native-currency'
import useUrlChainId from 'hooks/use-url-chain-id'
import { klerosAddresses } from 'config/tcr-addresses'
import { Data, Row, Small, Stack } from 'components/curate/primitives'
import KlerosParams from './kleros-params'
import {
  FormField,
  Input,
  RangeInput,
  StepHeader,
  SwitchField,
  TextField,
  TextLink,
  UploadField,
} from './fields'
import {
  AppealStakeNote,
  BaseDepositField,
  DepositBreakdown,
  POLICY_EXAMPLE_URL,
} from './tcr-params'
import { relSchema } from './schemas'
import type { StepProps, TcrState } from '.'

const { getAddress } = ethers.utils

/*
 * Step 3, the badges list: a second list, deployed with the main one, that
 * holds the addresses of other lists whose entries count as badges on this
 * list's items. Off by default; when it is off, Next records the choice
 * (`relTcrDisabled`) and the deploy step publishes a closed placeholder.
 */

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

type RelTCRFormValues = Omit<TcrState, 'transactions'>
type RelTCRParamsProps = StepProps & FormikProps<RelTCRFormValues>

const RelTCRParams = ({
  handleSubmit,
  formId,
  errors,
  touched,
  values,
  setFieldValue,
  setFieldTouched,
  setTcrState,
  defaultArbLabel,
  defaultArbDataLabel,
  defaultGovernorLabel,
}: RelTCRParamsProps) => {
  const ids = useId()
  const nativeCurrency = useNativeCurrency()
  const [advancedOptions, setAdvancedOptions] = useState(false)
  const [depositText, setDepositText] = useState(
    String(values.relSubmissionBaseDeposit ?? 0),
  )
  const chainId = useUrlChainId()
  const chainProvider = useEthersProvider({ chainId: chainId ?? undefined })
  const [debouncedArbitrator] = useDebounce(values.relArbitratorAddress, 1000)
  const { arbitrator: klerosAddress, policy: policyAddress } =
    (chainId !== null && klerosAddresses[chainId]) || {}
  const { arbitrationCost } = useArbitrationCost({
    address: values.relArbitratorAddress,
    arbitratorExtraData: values.relArbitratorExtraData,
    library: chainProvider,
  })
  const setRelArbitratorExtraData = useCallback(
    (val: string) => setFieldValue('relArbitratorExtraData', val),
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

  const badgesOn = values.relTcrDisabled === false
  const depositVal = clampDeposit(Number(values.relSubmissionBaseDeposit) || 0)

  const onChangeDepositVal = useCallback(
    (value: number) => {
      if (Number.isNaN(value)) return
      const next = clampDeposit(value)
      setFieldValue('relSubmissionBaseDeposit', next)
      setFieldValue('relRemovalBaseDeposit', next)
      setFieldValue('relRemovalChallengeBaseDeposit', next)
    },
    [setFieldValue],
  )

  return (
    <form id={formId} onSubmit={handleSubmit} noValidate>
      <Stack $gap={20}>
        <StepHeader
          heading="Badges"
          lede="A badges list is a list of other lists connected to yours: an item that also appears on one of them shows that list's badge. You can skip it now and the list still works; a badges list can be added later."
        />

        <SwitchField
          id={`${ids}-enabled`}
          label="Add a badges list"
          help="Deployed together with your list, with its own policy and deposits."
          checked={badgesOn}
          onChange={(on) => setFieldValue('relTcrDisabled', !on)}
        />

        {badgesOn && (
          <>
            <UploadField
              id={`${ids}-policy`}
              label="Badges listing policy (PDF)"
              help={
                <>
                  Defines which lists count as badges for your items. PDF, up to
                  4 MB.{' '}
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
              value={values.relTcrPrimaryDocument}
              error={errors.relTcrPrimaryDocument}
              showError={!!touched.relTcrPrimaryDocument}
              what="the badges policy"
              onChange={(uri) => {
                setFieldValue('relTcrPrimaryDocument', uri)
                setFieldTouched('relTcrPrimaryDocument', true)
              }}
            />

            {!advancedOptions && (
              <FormField
                id={`${ids}-deposit`}
                label="Deposit"
                help="The base deposit for connecting a badge. The same amount applies to removal requests and to challenging a removal; the arbitration cost is added on top."
                error={errors.relSubmissionBaseDeposit as string | undefined}
                showError={!!touched.relSubmissionBaseDeposit}
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
                        aria-label="Badges deposit"
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
                          if (event.target.value.trim() !== '')
                            onChangeDepositVal(Number(event.target.value))
                        }}
                        onBlur={() => setDepositText(String(depositVal))}
                      />
                      <Data $muted>{nativeCurrency}</Data>
                    </Row>
                    <SliderEnds>
                      <Small $muted>Lower deposit, more badges</Small>
                      <Small $muted>Higher deposit, stronger protection</Small>
                    </SliderEnds>
                  </Stack>
                )}
              </FormField>
            )}

            <DepositBreakdown
              submitterBase={values.relSubmissionBaseDeposit}
              challengerBase={values.relSubmissionChallengeBaseDeposit}
              arbitrationCost={arbitrationCost}
              currency={nativeCurrency}
              challengePeriodHours={values.relChallengePeriodDuration}
            />

            {isKlerosArbitrator ? (
              <KlerosParams
                arbitratorExtraData={values.relArbitratorExtraData}
                klerosAddress={debouncedArbitrator}
                policyAddress={policyAddress}
                setArbitratorExtraData={setRelArbitratorExtraData}
                library={chainProvider}
              />
            ) : (
              <TextField
                name="relArbitratorExtraData"
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
                  name="relSubmissionBaseDeposit"
                  label="Badge deposit"
                  help="Locked when connecting a badge and paid to a successful challenger. Too low and nobody checks badges; too high and few badges get connected."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <BaseDepositField
                  name="relRemovalBaseDeposit"
                  label="Removal deposit"
                  help="Locked when disconnecting a badge and paid to a successful challenger. Too low and compliant badges get disconnected; too high and non-compliant ones stay."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <BaseDepositField
                  name="relSubmissionChallengeBaseDeposit"
                  label="Badge challenge deposit"
                  help="Included in what a challenger sends and paid to the submitter when the challenge fails. Usually zero. Too high and incorrect badges go unchallenged."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <BaseDepositField
                  name="relRemovalChallengeBaseDeposit"
                  label="Removal challenge deposit"
                  help="Included in what a challenger to a removal sends and paid to the requester when the challenge fails. Too high and wrong removals go unchallenged; too low and nobody requests removals."
                  arbitrationCost={arbitrationCost}
                  currency={nativeCurrency}
                />
                <TextField
                  name="relChallengePeriodDuration"
                  label="Challenge period (hours)"
                  placeholder="5"
                  numeric
                  unit="hours"
                  help="How long a connection can be challenged before it is accepted and the deposit returned."
                />
                <TextField
                  name="relGovernorAddress"
                  label="Governor"
                  placeholder="0x7331deadbeef..."
                  mono
                  help={`Can change the deposits, the challenge period, the policy and the governor itself later. Default: ${defaultGovernorLabel ?? 'the chain default'}.`}
                />
                <TextField
                  name="relArbitratorAddress"
                  label="Arbitrator"
                  placeholder="0x7331deadbeef..."
                  mono
                  help={`The contract that resolves disputes about this list. Default: ${defaultArbLabel ?? 'the chain default'}.`}
                />
                <AppealStakeNote />
                <TextField
                  name="relSharedStakeMultiplier"
                  label="Shared stake multiplier"
                  placeholder="100"
                  numeric
                  unit="%"
                  help="Stake both sides pay to fund an appeal when the round had no winner or loser."
                />
                <TextField
                  name="relWinnerStakeMultiplier"
                  label="Winner stake multiplier"
                  placeholder="100"
                  numeric
                  unit="%"
                  help="Stake the winner of the previous round pays to fund its side of an appeal."
                />
                <TextField
                  name="relLoserStakeMultiplier"
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
      </Stack>
    </form>
  )
}

export default withFormik<StepProps, RelTCRFormValues>({
  // Only an enabled badges list is validated; a skipped one has nothing to check.
  validationSchema: yup.lazy((values: RelTCRFormValues) =>
    values.relTcrDisabled === false ? relSchema : yup.object(),
  ),
  mapPropsToValues: ({ tcrState }) => {
    const { transactions: _transactions, ...values } = tcrState
    return values
  },
  handleSubmit: (values, { props: { postSubmit, setTcrState } }) => {
    setTcrState((prevState) => ({
      ...prevState,
      relTcrDisabled: values.relTcrDisabled !== false,
    }))
    postSubmit()
  },
})(RelTCRParams)
