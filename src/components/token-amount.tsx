import React from 'react'
import { BigNumberish, ethers } from 'ethers'
import { Skeleton } from 'components/ui'
import styled from 'styled-components'

const SkeletonTitleProps = { width: 30 }

const StyledSkeleton = styled(Skeleton)`
  display: inline;

  .ui-skeleton-title {
    margin: -3px 0;
  }
`

const trimToPrecision = (value: string, precision: number) => {
  const [whole, fraction = ''] = value.split('.')
  if (precision <= 0 || !fraction) return whole
  const trimmedFraction = fraction.slice(0, precision).replace(/0+$/, '')
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole
}

const TokenAmount: React.FC<{
  amount: BigNumberish | bigint | null | undefined
  tokenDecimals?: number
  precision?: number
  displayUnit?: string
}> = ({ amount, tokenDecimals = 18, precision = 3, displayUnit = '' }) => {
  if (amount == null)
    return (
      <StyledSkeleton active paragraph={false} title={SkeletonTitleProps} />
    )

  const formatted = ethers.utils.formatUnits(String(amount), tokenDecimals)
  const valueDisplayed = trimToPrecision(formatted, precision)

  return <>{valueDisplayed + displayUnit}</>
}

export default TokenAmount
