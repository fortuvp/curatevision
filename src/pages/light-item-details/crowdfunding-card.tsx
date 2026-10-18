import React, { useContext } from 'react'
import { BigNumber } from 'ethers'
import {
  PARTY,
  SUBGRAPH_RULING,
  CONTRACT_STATUS,
  itemToStatusCode,
  STATUS_CODE,
} from 'utils/item-status'
import { LightTCRViewContext } from 'contexts/light-tcr-view-context'
import useRequiredFees from 'hooks/required-fees'
import useNativeCurrency from 'hooks/native-currency'
import { CurateIcon } from 'components/curate/icons'
import {
  Chip,
  Data,
  Label,
  PanelHeader,
  PanelTitle,
  Rail,
  Row,
  Small,
  Stack,
  Surface,
} from 'components/curate/primitives'
import { formatAmount, formatEther } from 'components/curate/item-light-format'

/*
 * Appeal funding (DESIGN.md: progress rails with exact amounts): how much
 * each side has raised toward its appeal, what is still needed, and what
 * backers can win. Rendered only while the dispute can be appealed.
 */

const Side = ({
  name,
  paid,
  required,
  funded,
  reward,
  role,
  currency,
}: {
  name: string
  paid: BigNumber
  required: BigNumber
  funded: boolean
  reward: BigNumber
  role?: 'winning' | 'losing'
  currency: string
}) => {
  const share = required.isZero()
    ? 0
    : paid.mul(10000).div(required).toNumber() / 10000
  return (
    <Stack $gap={6}>
      <Row $justify="space-between" $gap={8} $wrap>
        <Row $gap={8}>
          <Label $tone="text">{name}</Label>
          {role && <Chip>{role}</Chip>}
        </Row>
        <Data>
          {formatEther(paid)} / {formatAmount(required, currency)}
        </Data>
      </Row>
      <Rail
        $value={funded ? 1 : share}
        $tone={funded ? 'registered' : 'contested'}
      />
      <Small $muted>
        {funded
          ? 'Fully funded.'
          : `Still needed: ${formatAmount(
              required.sub(paid),
              currency,
            )}. Backers can win up to ${formatAmount(reward, currency)}.`}
      </Small>
    </Stack>
  )
}

interface CrowdfundingCardProps {
  item: SubgraphItem
  timestamp?: BigNumber
  appealCost?: BigNumber
}

const CrowdfundingCard = ({
  item,
  timestamp,
  appealCost,
}: CrowdfundingCardProps) => {
  const {
    challengePeriodDuration,
    sharedStakeMultiplier,
    winnerStakeMultiplier,
    loserStakeMultiplier,
    MULTIPLIER_DIVISOR,
  } = useContext(LightTCRViewContext) || {}
  const nativeCurrency = useNativeCurrency()

  const requesterFees = useRequiredFees({
    side: PARTY.REQUESTER,
    sharedStakeMultiplier,
    winnerStakeMultiplier,
    loserStakeMultiplier,
    item,
    MULTIPLIER_DIVISOR,
    appealCost,
  })
  const challengerFees = useRequiredFees({
    side: PARTY.CHALLENGER,
    sharedStakeMultiplier,
    winnerStakeMultiplier,
    loserStakeMultiplier,
    item,
    MULTIPLIER_DIVISOR,
    appealCost,
  })

  if (!item || !challengePeriodDuration || !MULTIPLIER_DIVISOR) return null
  const round = item.requests?.[0]?.rounds?.[0]
  if (!round) return null
  const { hasPaidRequester, hasPaidChallenger, ruling: currentRuling } = round

  const amountPaidRequester = BigNumber.from(round.amountPaidRequester)
  const amountPaidChallenger = BigNumber.from(round.amountPaidChallenger)

  if (
    !requesterFees ||
    !challengerFees ||
    !challengerFees.requiredForSide ||
    !challengerFees.potentialReward ||
    !requesterFees.requiredForSide ||
    !requesterFees.potentialReward ||
    !appealCost
  )
    return null

  const statusCode = itemToStatusCode(item, timestamp, challengePeriodDuration)

  if (
    !(
      statusCode === STATUS_CODE.CROWDFUNDING ||
      statusCode === STATUS_CODE.CROWDFUNDING_WINNER
    )
  )
    return null

  const isRegistration = item.status === CONTRACT_STATUS.REGISTRATION_REQUESTED
  const requesterName = isRegistration ? 'Submitter' : 'Requester'
  const decisive = currentRuling !== SUBGRAPH_RULING.NONE
  const requesterWins = currentRuling === SUBGRAPH_RULING.ACCEPT
  const winner = requesterWins ? requesterName.toLowerCase() : 'challenger'
  const loser = requesterWins ? 'challenger' : requesterName.toLowerCase()

  return (
    <Surface $padding="compact" role="region" aria-label="Appeal funding">
      <PanelHeader>
        <div>
          <PanelTitle>
            <CurateIcon name="bounty" size={16} />
            Appeal funding
          </PanelTitle>
          <Small $muted>
            Fund a side to appeal the ruling. Backers of the side that wins the
            next round share the other side&apos;s fees.
          </Small>
        </div>
      </PanelHeader>
      <Stack $gap={16}>
        <Side
          name={requesterName}
          paid={amountPaidRequester}
          required={requesterFees.requiredForSide}
          funded={!!hasPaidRequester}
          reward={requesterFees.potentialReward}
          role={decisive ? (requesterWins ? 'winning' : 'losing') : undefined}
          currency={nativeCurrency}
        />
        <Side
          name="Challenger"
          paid={amountPaidChallenger}
          required={challengerFees.requiredForSide}
          funded={!!hasPaidChallenger}
          reward={challengerFees.potentialReward}
          role={decisive ? (requesterWins ? 'losing' : 'winning') : undefined}
          currency={nativeCurrency}
        />
        <Small $muted>
          {decisive
            ? `Jurors currently favour the ${winner}. The ${loser} must fully fund the appeal in the first half of the period; then the ${winner} must fund too, or the ${loser} wins.`
            : 'Jurors did not give a decisive ruling. If one side fully funds its appeal, the other must fund too or loses the dispute.'}
        </Small>
      </Stack>
    </Surface>
  )
}

export default CrowdfundingCard
