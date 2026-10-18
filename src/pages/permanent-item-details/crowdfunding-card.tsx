import React from 'react'
import styled from 'styled-components'
import { BigNumber } from 'ethers'
import useNativeCurrency from 'hooks/native-currency'
import useRequiredFees from 'hooks/required-fees'
import {
  PARTY,
  STATUS_CODE,
  SUBGRAPH_RULING,
  itemToStatusCode,
} from 'utils/permanent-item-status'
import {
  Data,
  Label,
  Rail,
  Small,
  Stack,
  Surface,
} from 'components/curate/primitives'
import { nativeText } from './modals/shell'

/*
 * Appeal funding, one rail per side: how much each side has raised toward
 * the amount it needs, and what backing a side can earn. Rendered only while
 * an appeal can be funded.
 */

const MULTIPLIER_DIVISOR = BigNumber.from(10_000)

const Side = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const SideHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const toBigNumber = (value: unknown): BigNumber | undefined =>
  value === null || value === undefined
    ? undefined
    : BigNumber.from(String(value))

interface AppealFundingCardProps {
  item: SubgraphItem
  registry: SubgraphRegistry
  timestamp?: BigNumber
  appealCost?: BigNumber
}

const AppealFundingCard = ({
  item,
  registry,
  timestamp,
  appealCost,
}: AppealFundingCardProps) => {
  const nativeCurrency = useNativeCurrency()
  const { sharedStakeMultiplier, winnerStakeMultiplier, loserStakeMultiplier } =
    registry || {}
  const multipliers = {
    sharedStakeMultiplier: toBigNumber(sharedStakeMultiplier),
    winnerStakeMultiplier: toBigNumber(winnerStakeMultiplier),
    loserStakeMultiplier: toBigNumber(loserStakeMultiplier),
    item,
    MULTIPLIER_DIVISOR,
    appealCost,
  }
  const requesterFees = useRequiredFees({
    side: PARTY.REQUESTER,
    ...multipliers,
  })
  const challengerFees = useRequiredFees({
    side: PARTY.CHALLENGER,
    ...multipliers,
  })

  if (
    !item ||
    !registry ||
    !timestamp ||
    !item.challenges ||
    item.challenges.length === 0 ||
    !appealCost
  )
    return null

  const statusCode = itemToStatusCode(item, timestamp, registry)
  if (
    statusCode !== STATUS_CODE.CROWDFUNDING &&
    statusCode !== STATUS_CODE.CROWDFUNDING_WINNER
  )
    return null

  const round = item.challenges[0].rounds[0]
  if (
    !requesterFees.requiredForSide ||
    !requesterFees.potentialReward ||
    !challengerFees.requiredForSide ||
    !challengerFees.potentialReward
  )
    return null

  const sides = [
    {
      name: 'Submitter',
      paid: BigNumber.from(String(round.amountPaidRequester)),
      funded: round.hasPaidRequester,
      required: requesterFees.requiredForSide,
      reward: requesterFees.potentialReward,
    },
    {
      name: 'Challenger',
      paid: BigNumber.from(String(round.amountPaidChallenger)),
      funded: round.hasPaidChallenger,
      required: challengerFees.requiredForSide,
      reward: challengerFees.potentialReward,
    },
  ]

  const note =
    round.ruling === SUBGRAPH_RULING.NONE
      ? 'The jurors did not give a decisive ruling. If one side fully funds its appeal, the other must fund too or lose the dispute.'
      : `The ${
          round.ruling === SUBGRAPH_RULING.ACCEPT ? 'challenger' : 'submitter'
        } lost this round and must fully fund first; the ${
          round.ruling === SUBGRAPH_RULING.ACCEPT ? 'submitter' : 'challenger'
        } must then match it or lose the dispute.`

  return (
    <Surface $padding="compact" role="group" aria-label="Appeal funding">
      <Stack $gap={14}>
        <Label>Appeal funding</Label>
        {sides.map((side) => {
          const share = side.funded
            ? 1
            : side.paid.mul(MULTIPLIER_DIVISOR).div(side.required).toNumber() /
              10_000
          return (
            <Side key={side.name}>
              <SideHead>
                <Data $weight={500}>{side.name}</Data>
                <Data $muted $weight={400}>
                  {nativeText(side.paid, nativeCurrency)} of{' '}
                  {nativeText(side.required, nativeCurrency)}
                </Data>
              </SideHead>
              <Rail
                $value={share}
                $tone={side.funded ? 'registered' : 'contested'}
              />
              <Small $muted>
                {side.funded
                  ? 'Fully funded.'
                  : `Back this side to earn up to ${nativeText(side.reward, nativeCurrency)} if it wins the round.`}
              </Small>
            </Side>
          )
        })}
        <Small $muted>{note}</Small>
      </Stack>
    </Surface>
  )
}

export default AppealFundingCard
