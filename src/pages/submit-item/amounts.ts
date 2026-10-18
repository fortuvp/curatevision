import { ethers, type BigNumberish } from 'ethers'

/**
 * "51.6" from an integer amount in the token's smallest unit, trailing zeros
 * trimmed: the same rule as `components/eth-amount`, with the decimals read
 * from the token instead of assumed.
 */
export const formatAmount = (value: BigNumberish, decimals = 18): string => {
  const integer =
    typeof value === 'number'
      ? value.toLocaleString('fullwide', { useGrouping: false })
      : value
  return ethers.utils.formatUnits(integer, decimals).replace(/\.?0+$/, '')
}

/** "1.2 MB" or "640 KB" for upload previews. */
export const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
