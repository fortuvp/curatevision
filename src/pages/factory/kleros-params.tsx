import React, { useMemo, useState, useEffect, useCallback, useId } from 'react'
import styled from 'styled-components'
import { ethers, type BigNumber } from 'ethers'
import { abi as _IArbitrator } from '@kleros/erc-792/build/contracts/IArbitrator.json'
import { ARBITRATION_FEE_TOOLTIP } from 'components/arbitration-fee-tooltip'
import { jurorsAndCourtIDFromExtraData } from 'utils/string'
import useNativeCurrency from 'hooks/native-currency'
import useCourtPolicies from 'hooks/use-court-policies'
import {
  Data,
  KeyValueList,
  Row,
  SkeletonBlock,
  Small,
  Stack,
} from 'components/curate/primitives'
import { FormField, Input, RangeInput, Select, formatNative } from './fields'

/*
 * Court and number of jurors for a Kleros arbitrator, encoded into the
 * arbitrator extra data, with the resulting arbitration cost read from the
 * arbitrator contract. Used by the list step and the badges step.
 */

const JurorsInput = styled(Input)`
  flex: 0 0 auto;
  width: 72px;
  text-align: right;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
`

const MIN_JURORS = 1
const MAX_JURORS = 33

const encodeExtraData = (courtID: number, numberOfJurors: number) =>
  `0x${courtID.toString(16).padStart(64, '0')}${Math.ceil(numberOfJurors)
    .toString(16)
    .padStart(64, '0')}`

interface KlerosParamsProps {
  klerosAddress?: string
  policyAddress?: string
  setArbitratorExtraData: (val: string) => void
  arbitratorExtraData?: string
  library?: EthersLibrary | null
}

const KlerosParams = ({
  klerosAddress,
  policyAddress,
  setArbitratorExtraData,
  arbitratorExtraData,
  library,
}: KlerosParamsProps) => {
  const ids = useId()
  const nativeCurrency = useNativeCurrency()
  const [arbitrationCost, setArbitrationCost] = useState<BigNumber>()
  const [numberOfJurors, setNumberOfJurors] = useState(3)
  const [courtID, setCourtID] = useState<number>()
  const { data: courts = [] } = useCourtPolicies(policyAddress, library)

  const arbitrator = useMemo(() => {
    if (!klerosAddress || !library) return
    try {
      return new ethers.Contract(klerosAddress, _IArbitrator, library)
    } catch (err) {
      console.warn(`Failed to connect to kleros at ${klerosAddress}`, err)
      return null
    }
  }, [library, klerosAddress])

  // Load arbitrator extra data
  useEffect(() => {
    if (!arbitratorExtraData) return
    const parsed = jurorsAndCourtIDFromExtraData(arbitratorExtraData)
    setCourtID(Number(parsed.courtID))
    setNumberOfJurors(Number(parsed.numberOfJurors))
  }, [arbitratorExtraData])

  // Display predicted arbitration fee.
  useEffect(() => {
    let cancelled = false
    setArbitrationCost(undefined)
    ;(async () => {
      if (!arbitratorExtraData || !arbitrator || !library) return
      try {
        const cost = await arbitrator.arbitrationCost(arbitratorExtraData)
        if (!cancelled) setArbitrationCost(cost)
      } catch (err) {
        console.warn('Failed to read the arbitration cost', err)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [library, arbitrator, arbitratorExtraData])

  const onCourtChanged = useCallback(
    (value: string) => {
      const newCourtID = Number(value)
      if (Number.isNaN(newCourtID)) return
      setArbitratorExtraData(encodeExtraData(newCourtID, numberOfJurors))
      setCourtID(newCourtID)
    },
    [numberOfJurors, setArbitratorExtraData],
  )

  const onNumJurorsChange = useCallback(
    (value: number) => {
      if (Number.isNaN(value)) return
      let newNumJurors = value > 0 ? value : MIN_JURORS
      newNumJurors = newNumJurors < 35 ? newNumJurors : MAX_JURORS
      if (newNumJurors % 2 === 0) newNumJurors = newNumJurors - 1
      setArbitratorExtraData(encodeExtraData(courtID ?? 0, newNumJurors))
      setNumberOfJurors(newNumJurors)
    },
    [courtID, setArbitratorExtraData],
  )

  const loadingCourts = courts.length === 0 || typeof courtID !== 'number'
  const cost = formatNative(arbitrationCost)

  return (
    <Stack $gap={16}>
      <FormField
        id={`${ids}-court`}
        label="Court"
        help="The Kleros court whose jurors rule on disputes about this list."
      >
        {(a11y) => (
          <Select
            {...a11y}
            value={typeof courtID === 'number' ? String(courtID) : ''}
            disabled={loadingCourts}
            onChange={(event) => onCourtChanged(event.target.value)}
          >
            {loadingCourts && <option value="">Loading courts…</option>}
            {courts.map(({ value, label }) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </Select>
        )}
      </FormField>
      <FormField
        id={`${ids}-jurors`}
        label="Number of jurors"
        help="Jurors drawn in the first round of a dispute; always an odd number. Three is the usual choice: one can do when cases are simple, more when they take real review. Every extra juror raises the arbitration cost, and with it every deposit."
      >
        {(a11y) => (
          <Row $gap={12}>
            <RangeInput
              type="range"
              min={MIN_JURORS}
              max={MAX_JURORS}
              step={2}
              value={numberOfJurors}
              aria-label="Number of jurors"
              onChange={(event) =>
                onNumJurorsChange(Number(event.target.value))
              }
            />
            <JurorsInput
              {...a11y}
              type="text"
              inputMode="numeric"
              value={numberOfJurors}
              onChange={(event) =>
                onNumJurorsChange(Number(event.target.value))
              }
            />
          </Row>
        )}
      </FormField>
      <KeyValueList>
        <dt>Arbitration cost</dt>
        <dd>
          {cost === null ? (
            <SkeletonBlock $height="18px" $width="120px" />
          ) : (
            <Data>
              {cost} {nativeCurrency}
            </Data>
          )}{' '}
          <Small $muted>{ARBITRATION_FEE_TOOLTIP}</Small>
        </dd>
      </KeyValueList>
    </Stack>
  )
}

export default KlerosParams
