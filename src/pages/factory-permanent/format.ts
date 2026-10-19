import { BigNumber, ethers, type BigNumberish } from 'ethers'
import { jurorsAndCourtIDFromExtraData } from 'utils/string'

/*
 * Amounts, durations and extra data for the Stake wizard. The factory
 * encodes the typed minimum stake with parseEther: the number times 10^18
 * base units of the stake token. What that is in tokens depends on the
 * token's own decimals, so every stake figure here is
 * formatUnits(parseEther(typed), decimals): for an 18-decimal token it is the
 * typed number, for any other token it is the amount the contract really
 * enforces. The challenger's share uses the deploy call's rounding (the
 * percent rounded up, times 100, over a divisor of 10 000).
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
 * "0.00000000000005"), so parseEther reads it.
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

/** A typed amount in wei as the factory encodes it, or null if it is not one. */
export const parseAmount = (value: unknown): BigNumber | null => {
  if (value === '' || value === undefined || value === null) return null
  try {
    const parsed = ethers.utils.parseEther(plainDecimal(value))
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

/**
 * What a typed minimum stake means for a token with `decimals`: the amount
 * the contract enforces, and, when the token does not use 18 decimals, what
 * to type for the typed number to be the stake in tokens (null when the
 * typed number has more decimals than the token, or when it already is).
 */
export const stakeReading = (
  value: unknown,
  decimals: number,
): { enforced: string | null; suggestion: string | null } => {
  const units = parseAmount(value)
  const enforced = formatToken(units, decimals)
  if (decimals === 18 || !units) return { enforced, suggestion: null }
  try {
    const wanted = ethers.utils.parseUnits(plainDecimal(value), decimals)
    const suggestion = formatNative(wanted)
    return {
      enforced,
      suggestion: suggestion === plainDecimal(value) ? null : suggestion,
    }
  } catch {
    return { enforced, suggestion: null }
  }
}

/** What to type for the factory to require one whole token with `decimals`. */
export const oneTokenTyped = (decimals: number): string | null => {
  try {
    return formatNative(ethers.utils.parseUnits('1', decimals))
  } catch {
    return null
  }
}

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
