import { BigNumber, ethers, type BigNumberish } from 'ethers'
import { jurorsAndCourtIDFromExtraData } from 'utils/string'

/*
 * Amounts, durations and extra data for the Stake wizard. The typed minimum
 * stake is in tokens: the deploy call encodes it in the stake token's own
 * base units (parseUnits with the token's decimals), the same way the submit
 * dialog and the item pages read stakes. The challenger's share uses the
 * deploy call's rounding (the percent rounded up, times 100, over a divisor
 * of 10 000).
 */

const trimZeros = (text: string) => text.replace(/\.?0+$/, '')

/** "0.0309" from wei, trailing zeros trimmed (same rule as eth-amount). */
export const formatNative = (wei: BigNumberish): string =>
  trimZeros(ethers.utils.formatEther(wei))

/** Like formatNative, but null while the amount is unknown. */
export const formatMaybe = (
  wei: BigNumberish | null | undefined,
): string | null => {
  if (wei === null || wei === undefined) return null
  try {
    return formatNative(wei)
  } catch {
    return null
  }
}

/** Base units of a token as a token amount, trailing zeros trimmed. */
export const formatToken = (
  units: BigNumberish | null | undefined,
  decimals: number,
): string | null => {
  if (units === null || units === undefined) return null
  try {
    return trimZeros(ethers.utils.formatUnits(units, decimals))
  } catch {
    return null
  }
}

/**
 * A stored amount as a plain decimal string: the shortest form JavaScript
 * gives a number, with its exponent written out ("5e-14" becomes
 * "0.00000000000005"), so parseUnits reads it.
 */
export const plainDecimal = (value: unknown): string => {
  const text = String(value ?? '').trim()
  const match = /^(-?)(\d+)(?:\.(\d+))?e([+-]?\d+)$/i.exec(text)
  if (!match) return text
  const [, sign, whole, fraction = '', exponentText] = match
  const exponent = Number(exponentText)
  const digits = `${whole}${fraction}`
  const point = whole.length + exponent
  const plain =
    point <= 0
      ? `0.${'0'.repeat(-point)}${digits}`
      : point >= digits.length
        ? `${digits}${'0'.repeat(point - digits.length)}`
        : `${digits.slice(0, point)}.${digits.slice(point)}`
  const tidy = plain.includes('.') ? trimZeros(plain) : plain
  return `${sign}${tidy.replace(/^0+(?=\d)/, '')}`
}

/**
 * A typed token amount in the token's base units, as the deploy call encodes
 * it, or null if it is not one (or has more decimals than the token).
 */
export const parseAmount = (
  value: unknown,
  decimals = 18,
): BigNumber | null => {
  if (value === '' || value === undefined || value === null) return null
  try {
    const parsed = ethers.utils.parseUnits(plainDecimal(value), decimals)
    return parsed.isNegative() ? null : parsed
  } catch {
    return null
  }
}

/** The percent the deploy call sends: rounded up, or null if not a number. */
export const effectivePercent = (value: unknown): number | null => {
  if (value === '' || value === undefined || value === null) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.ceil(parsed) : null
}

/** stake × percent, with the contract's basis-point arithmetic. */
export const shareOf = (stake: BigNumber, percent: number): BigNumber =>
  stake.mul(percent * 100).div(10_000)

/** The typed minimum stake as the contract will enforce it, in tokens. */
export const enforcedStake = (
  value: unknown,
  decimals: number,
): string | null => formatToken(parseAmount(value, decimals), decimals)

const grouped = (exact: string) => {
  const [whole, fraction] = exact.split('.')
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction === undefined ? withCommas : `${withCommas}.${fraction}`
}

/** An exact amount for display: the integer part grouped in thousands. */
export const groupAmount = (exact: string | null): string | null =>
  exact === null ? null : grouped(exact)

/** For a count-up: intermediate values at the amount's precision, then the exact string, grouped. */
export const amountFormat = (exact: string) => {
  const decimals = Math.min(6, (exact.split('.')[1] ?? '').length)
  const target = Number(exact)
  const format = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (n: number) => (n === target ? grouped(exact) : format.format(n))
}

/** "84 hours", "1 hour". */
export const formatHours = (hours: number | string): string => {
  const count = Number(hours)
  if (Number.isNaN(count)) return `${hours} hours`
  return `${count} hour${count === 1 ? '' : 's'}`
}

/** Hours typed in a field as seconds, or null if not a valid duration. */
export const hoursToSeconds = (hours: unknown): number | null => {
  if (hours === '' || hours === undefined || hours === null) return null
  const parsed = Number(hours)
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * 3600)
    : null
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
