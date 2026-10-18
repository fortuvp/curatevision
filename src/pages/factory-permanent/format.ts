import { ethers, type BigNumberish } from 'ethers'
import { jurorsAndCourtIDFromExtraData } from 'utils/string'

/** "0.0309" from wei, trailing zeros trimmed (same rule as eth-amount). */
export const formatNative = (wei: BigNumberish): string =>
  ethers.utils.formatEther(wei).replace(/\.?0+$/, '')

/** "84 hours", "1 hour". */
export const formatHours = (hours: number | string): string => {
  const count = Number(hours)
  if (Number.isNaN(count)) return `${hours} hours`
  return `${count} hour${count === 1 ? '' : 's'}`
}

/** The court and juror count encoded in arbitrator extra data, if readable. */
export const readExtraData = (
  extraData?: string,
): { courtID: number; numberOfJurors: number } | null => {
  if (!extraData) return null
  try {
    return jurorsAndCourtIDFromExtraData(extraData)
  } catch {
    return null
  }
}

/** Builds the Kleros arbitrator extra data: court id then juror count, 32 bytes each. */
export const encodeExtraData = (courtID: number, numberOfJurors: number) =>
  `0x${courtID.toString(16).padStart(64, '0')}${Math.ceil(numberOfJurors)
    .toString(16)
    .padStart(64, '0')}`
