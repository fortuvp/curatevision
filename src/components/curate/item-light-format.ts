import { BigNumber, type BigNumberish, utils } from 'ethers'

/*
 * Amount and time helpers for the item pages (DESIGN.md: money is always
 * legible, full precision, with the chain's currency).
 */

/** "51.6" from wei: full precision, trailing zeros stripped. */
export const formatEther = (value: BigNumberish): string =>
  utils.formatEther(BigNumber.from(value)).replace(/\.?0+$/, '')

/** "51.6 xDAI"; an em dash while the amount is unknown. */
export const formatAmount = (
  value: BigNumberish | null | undefined,
  currency: string,
): string =>
  value === null || value === undefined
    ? '—'
    : `${formatEther(value)} ${currency}`

/** Unix seconds from a subgraph string, a BigNumber or a number; 0 if unset. */
export const toSeconds = (value: unknown): number => {
  if (value === undefined || value === null) return 0
  if (BigNumber.isBigNumber(value)) return value.toNumber()
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Sum of two amounts when both are known. */
export const sumAmounts = (
  a: BigNumberish | null | undefined,
  b: BigNumberish | null | undefined,
): BigNumber | undefined =>
  a === null || a === undefined || b === null || b === undefined
    ? undefined
    : BigNumber.from(a).add(BigNumber.from(b))
