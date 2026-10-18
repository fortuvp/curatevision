import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ethers, type BigNumber } from 'ethers'
import { abi as _IArbitrator } from '@kleros/erc-792/build/contracts/IArbitrator.json'
import useNativeCurrency from 'hooks/native-currency'
import useCourtPolicies from 'hooks/use-court-policies'
import { ARBITRATION_FEE_TOOLTIP } from 'components/arbitration-fee-tooltip'
import { Data, SkeletonBlock, Small, Stack } from 'components/curate/primitives'
import {
  Field,
  FieldGrid,
  Help,
  MonoInput,
  Range,
  RangeRow,
  Select,
} from './controls'
import { JURORS } from './defaults'
import { encodeExtraData, formatNative, readExtraData } from './format'

/*
 * The Kleros side of the arbitrator settings: which court rules on disputes
 * and how many jurors sit in the first round. Both are encoded into the
 * arbitrator extra data; the arbitration fee that encoding costs is read
 * from the arbitrator contract and shown next to the controls.
 */

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
  const nativeCurrency = useNativeCurrency()
  const [arbitrationCost, setArbitrationCost] = useState<BigNumber | null>(
    null,
  )
  const [numberOfJurors, setNumberOfJurors] = useState(3)
  const [courtID, setCourtID] = useState<number>()
  const { data: courts = [], isLoading: loadingCourts } = useCourtPolicies(
    policyAddress,
    library,
  )

  const arbitrator = useMemo(() => {
    if (!klerosAddress || !library) return
    try {
      return new ethers.Contract(klerosAddress, _IArbitrator, library)
    } catch (err) {
      console.warn(`Failed to connect to kleros at ${klerosAddress}`, err)
      return null
    }
  }, [library, klerosAddress])

  // Load the court and juror count from the arbitrator extra data.
  useEffect(() => {
    const parsed = readExtraData(arbitratorExtraData)
    if (!parsed) return
    setCourtID(parsed.courtID)
    setNumberOfJurors(parsed.numberOfJurors)
  }, [arbitratorExtraData])

  // Read the arbitration fee the current settings cost.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!arbitratorExtraData || !arbitrator || !library) return
      try {
        const cost: BigNumber =
          await arbitrator.arbitrationCost(arbitratorExtraData)
        if (!cancelled) setArbitrationCost(cost)
      } catch (err) {
        console.warn('Failed to read the arbitration cost', err)
        if (!cancelled) setArbitrationCost(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [library, arbitrator, arbitratorExtraData])

  const onCourtChanged = useCallback(
    (value: string) => {
      const newCourtID = Number(value)
      if (value === '' || Number.isNaN(newCourtID)) return
      setArbitratorExtraData(encodeExtraData(newCourtID, numberOfJurors))
      setCourtID(newCourtID)
    },
    [numberOfJurors, setArbitratorExtraData],
  )

  const onNumJurorsChange = useCallback(
    (value: number) => {
      if (Number.isNaN(value)) return
      let newNumJurors = value > 0 ? value : 1
      newNumJurors = newNumJurors < 35 ? newNumJurors : 33
      if (newNumJurors % 2 === 0) newNumJurors = newNumJurors - 1
      setArbitratorExtraData(encodeExtraData(courtID ?? 0, newNumJurors))
      setNumberOfJurors(newNumJurors)
    },
    [courtID, setArbitratorExtraData],
  )

  const courtsReady = courts.length > 0 && typeof courtID === 'number'
  const selectedCourt = courts.find((court) => court.courtID === courtID)

  return (
    <Stack $gap={12}>
      <FieldGrid>
        <Field
          id="court"
          label="Court"
          help="The Kleros court that rules on disputes about this list."
        >
          {(aria) => (
            <Select
              {...aria}
              value={courtsReady ? String(courtID) : ''}
              disabled={!courtsReady}
              onChange={(event) => onCourtChanged(event.target.value)}
            >
              {!courtsReady && (
                <option value="">
                  {loadingCourts ? 'Loading courts…' : 'No courts found'}
                </option>
              )}
              {courts.map(({ value, label }) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field
          id="numJurors"
          label="Number of jurors"
          help="Drawn in the first round of a dispute. Three is the usual choice; one can do for simple checks, more for cases that need real review. Every extra juror raises the arbitration deposit on each submission."
        >
          {(aria) => (
            <RangeRow>
              <Small $muted>Fewer</Small>
              <Range
                type="range"
                aria-label="Number of jurors slider"
                min={JURORS.min}
                max={JURORS.max}
                step={JURORS.step}
                value={numberOfJurors}
                onChange={(event) =>
                  onNumJurorsChange(Number(event.target.value))
                }
              />
              <Small $muted>More</Small>
              <MonoInput
                {...aria}
                type="number"
                inputMode="numeric"
                min={JURORS.min}
                max={JURORS.max}
                step={JURORS.step}
                value={numberOfJurors}
                onChange={(event) =>
                  onNumJurorsChange(Number(event.target.value))
                }
              />
            </RangeRow>
          )}
        </Field>
      </FieldGrid>
      <div>
        <Small>
          Arbitration fee for {numberOfJurors} juror
          {numberOfJurors === 1 ? '' : 's'}
          {selectedCourt ? ` in ${selectedCourt.name}` : ''}:{' '}
          {arbitrationCost ? (
            <Data>
              {formatNative(arbitrationCost)} {nativeCurrency}
            </Data>
          ) : (
            <SkeletonBlock
              $width="96px"
              $height="18px"
              style={{ display: 'inline-block', verticalAlign: 'middle' }}
            />
          )}
        </Small>
        <Help>{ARBITRATION_FEE_TOOLTIP}</Help>
      </div>
    </Stack>
  )
}

export default KlerosParams
