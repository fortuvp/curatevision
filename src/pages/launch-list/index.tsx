import React from 'react'
import styled, { css } from 'styled-components'
import { Link, useParams } from 'react-router-dom'
import { BigNumber, ethers } from 'ethers'
import useDocumentHead from 'hooks/use-document-head'
import useArbitrationCost from 'hooks/arbitration-cost'
import useCountUp from 'hooks/use-count-up'
import { useEthersProvider } from 'hooks/ethers-adapters'
import { NETWORKS, NETWORKS_INFO, getNativeCurrency } from 'config/networks'
import {
  defaultArbitrator,
  defaultArbitratorExtraData,
} from 'config/tcr-addresses'
import { jurorsAndCourtIDFromExtraData } from 'utils/string'
import { formatDuration, formatDurationLong } from 'utils/time'
import { preloadFactory, preloadPermanentFactory } from 'bootstrap/app-router'
import {
  WIZARD_DEFAULTS as STAKE_DEFAULTS,
  defaultStakeToken,
} from 'pages/factory-permanent/defaults'
import { CurateIcon } from 'components/curate/icons'
import {
  ButtonAnchor,
  ButtonLink,
  Chip,
  Label,
  Page,
  SkeletonBlock,
  Surface,
} from 'components/curate/primitives'
import { reveal } from 'components/curate/motion/reveal'
import { ChainSwitch } from './chain-switch'
import { Lifecycle, axisScale, type LifecycleSpec } from './lifecycle'
import { useInView } from './use-in-view'

/*
 * Launch a list (route /launch/:chainId): the chooser between the two list
 * types that can be created today, Standard (Light Curate) and Stake (Stake
 * Curate), on the chain from the URL. The hero carries what both share on
 * this chain, read live from the default court. Each card leads with its
 * default deposit, draws an entry's life to scale under its default periods
 * (one time axis for both cards), says what can be lost, names one advantage
 * and one trade-off and opens its factory. Then a note that Classic lists can
 * no longer be created, and the assisted route.
 */

const SUPPORTED_CHAINS: number[] = [
  NETWORKS.ethereum,
  NETWORKS.gnosis,
  NETWORKS.sepolia,
]
const TESTNETS: number[] = [NETWORKS.sepolia]

const HOUR = 60 * 60

/*
 * The Standard wizard's defaults. They live inside the factory's state hook
 * (pages/factory/index.tsx, initialWizardState) and are not exported, so
 * they are mirrored here: keep the two in sync. The Stake defaults are
 * imported from the Stake factory.
 */
const STANDARD_DEFAULTS = {
  submissionBaseDeposit: 0.05,
  removalBaseDeposit: 0.05,
  challengePeriodDuration: 84,
} as const

const CONTACT_HREF =
  'mailto:contact@kleros.io?subject=Launch%20a%20Curate%20list'

/* ---------- Lifecycles, on one shared scale ---------- */

const challengePeriod = STANDARD_DEFAULTS.challengePeriodDuration * HOUR
const submissionPeriod = STAKE_DEFAULTS.submissionPeriodDuration * HOUR
const withdrawingPeriod = STAKE_DEFAULTS.withdrawingPeriodDuration * HOUR

const STANDARD_LIFE: LifecycleSpec = {
  phases: [
    {
      label: 'Submitted',
      tone: 'window',
      duration: challengePeriod,
      challengeable: true,
    },
    { label: 'Registered', tone: 'registered' },
    {
      label: 'Removal requested',
      tone: 'window',
      duration: challengePeriod,
      optional: true,
      note: ['if someone requests it', 'if requested'],
      challengeable: true,
    },
  ],
  endLabel: 'Removed',
  funds: { lane: 'Deposit locked', until: 0, label: 'Back in full' },
  description: `Standard list, default periods: an entry can be challenged during its ${formatDurationLong(challengePeriod)} challenge period, while its deposit is locked. If nobody challenges, it is registered and the deposit is back in full. Once registered, it can be challenged again only if someone requests its removal, during another ${formatDurationLong(challengePeriod)} period, after which it is removed.`,
}

const STAKE_LIFE: LifecycleSpec = {
  phases: [
    {
      label: 'Pending',
      tone: 'window',
      duration: submissionPeriod,
      challengeable: true,
    },
    { label: 'Accepted', tone: 'registered', challengeable: true },
    {
      label: 'Withdrawing',
      tone: 'neutral',
      duration: withdrawingPeriod,
      optional: true,
      note: ['if the submitter withdraws', 'if withdrawn'],
      challengeable: true,
    },
  ],
  endLabel: 'Withdrawn',
  funds: { lane: 'Stake locked', until: 2, label: 'Stake back' },
  description: `Stake list, default periods: an entry is pending for its ${formatDurationLong(submissionPeriod)} submission period, then accepted. It can be challenged at any time until it is withdrawn, and its stake stays locked for that whole time. If the submitter withdraws, the stake comes back after a ${formatDurationLong(withdrawingPeriod)} withdrawing period.`,
}

const SCALE = axisScale([STANDARD_LIFE, STAKE_LIFE])

/* ---------- Header ---------- */

const Header = styled.header`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 16px 0 0;
  text-align: center;

  > * {
    ${reveal}
  }

  @media (max-width: 720px) {
    align-items: flex-start;
    gap: 16px;
    padding-top: 8px;
    text-align: left;
  }
`

const Title = styled.h1`
  margin: 4px 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: clamp(40px, 2.4vw + 22px, 56px);
  line-height: 1.02;
  font-weight: 500;
  letter-spacing: -0.035em;
  text-wrap: balance;

  em {
    font-style: normal;
    color: var(--color-primary);
  }
`

const Lede = styled.p`
  margin: 0;
  max-width: 52ch;
  color: var(--color-muted);
  font-size: 17px;
  line-height: 26px;
`

/* The court both list types share on this chain, as a stat strip. */
const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px 0;
  margin-top: 8px;

  @media (max-width: 720px) {
    flex-wrap: nowrap;
    justify-content: flex-start;
  }
`

const Stat = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 0 32px;

  & + & {
    border-left: 1px solid var(--glass-border);
  }

  @media (max-width: 720px) {
    align-items: flex-start;
    padding: 0 20px 0 0;

    & + & {
      padding: 0 0 0 20px;
    }
  }
`

const figure = css`
  color: var(--color-text);
  font-family: var(--font-figure);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  small {
    margin-left: 0.22em;
    color: var(--color-muted);
    font-size: 0.5em;
    font-weight: 400;
    letter-spacing: 0;
  }
`

const StatValue = styled.div`
  ${figure}
  font-size: 30px;
  line-height: 34px;
  letter-spacing: -0.035em;
`

const StatNote = styled.span`
  max-width: 30ch;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 16px;
`

/* ---------- Cards ---------- */

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
  margin-top: 48px;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
  }

  @media (max-width: 720px) {
    margin-top: 32px;
    gap: 16px;
  }
`

const Card = styled(Surface)`
  display: flex;
  flex-direction: column;
  padding: 28px;
  ${reveal}

  /* The featured card keeps its rim; the other one brightens its border. */
  ${({ $featured }) =>
    !$featured &&
    css`
      &:hover {
        border-color: var(--color-border-strong);
      }
    `}

  @media (max-width: 720px) {
    padding: 20px 16px;
  }
`

const CardHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
`

const CardTitle = styled.h2`
  margin: 6px 0 0;
  color: var(--color-text);
  font-family: var(--font-display);
  font-size: 30px;
  line-height: 34px;
  font-weight: 500;
  letter-spacing: -0.03em;
`

/* The card's headline: its default deposit, with side figures. */
const Deposit = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px 28px;
  margin-top: 24px;
`

const Headline = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const Amount = styled.div`
  ${figure}
  font-size: clamp(36px, 1vw + 28px, 44px);
  line-height: 1;
  letter-spacing: -0.045em;
`

const Breakdown = styled.p`
  margin: 0;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-variant-numeric: tabular-nums;

  span {
    display: block;
    color: var(--color-faint);
  }
`

const SideStats = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin: 0;
  padding-bottom: 2px;

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  dd {
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-figure);
    font-size: 18px;
    line-height: 22px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  dd small {
    margin-left: 4px;
    color: var(--color-muted);
    font-family: var(--font-sans);
    font-size: 12px;
    font-weight: 400;
  }
`

const Drawing = styled.div`
  margin: 26px 0 0;
  padding: 22px 0 20px;
  border-top: 1px solid var(--glass-border);
  border-bottom: 1px solid var(--glass-border);
`

/* What can be lost, under the drawing's happy path. */
const Risk = styled.p`
  display: grid;
  grid-template-columns: 8px minmax(0, 1fr);
  align-items: baseline;
  gap: 10px;
  margin: 18px 0 0;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);

  i {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-pill);
    background: var(--status-off);
    box-shadow: 0 0 0 3px var(--status-off-soft);
    transform: translateY(-1px);
  }

  b {
    color: var(--color-text);
    font-weight: 500;
  }
`

const Points = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 22px 0 28px;
  padding: 0;
  list-style: none;
`

const Point = styled.li<{ $con?: boolean }>`
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  color: ${({ $con }) => ($con ? 'var(--color-muted)' : 'var(--color-text)')};
  font-size: var(--fs-body);
  line-height: var(--lh-body);

  svg {
    margin-top: 1px;
    color: ${({ $con }) =>
      $con ? 'var(--color-faint)' : 'var(--color-primary)'};
  }
`

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
`

const CardAction = styled.div`
  margin-top: auto;
`

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M5 12h14m-5-5 5 5-5 5"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

const MinusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path
      d="M7 12h10"
      stroke="currentColor"
      strokeWidth="1.85"
      strokeLinecap="round"
    />
  </svg>
)

/* ---------- Classic note, Pro ---------- */

const ClassicNote = styled.p`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 18px 0 0;
  padding: 0 4px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  ${reveal}

  svg {
    flex: 0 0 auto;
    margin-top: 1px;
    color: var(--color-faint);
  }

  a {
    font-weight: 500;
    white-space: nowrap;
  }

  @media (max-width: 720px) {
    padding: 0;
  }
`

const Pro = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 20px 32px;
  margin-top: 32px;
  padding: 20px 24px;
  ${reveal}

  h2 {
    margin: 4px 0 2px;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 20px;
    line-height: 24px;
    font-weight: 500;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: var(--color-muted);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
  }

  @media (max-width: 720px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 18px 16px;
  }
`

const ProActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

/* ---------- Figures ---------- */

/** "0.0309" from wei, trailing zeros trimmed (same rule as eth-amount). */
const formatNative = (wei: BigNumber) =>
  ethers.utils.formatEther(wei).replace(/\.?0+$/, '')

/**
 * A decimal string that counts up to its exact value once `armed` (in
 * view). The digits are set in the figure face with tabular numbers, so
 * they do not jitter; the accessible name is always the final value.
 */
const Count = ({ exact, armed }: { exact: string; armed: boolean }) => {
  const value = Number(exact)
  const decimals = Math.min(6, exact.split('.')[1]?.length ?? 0)
  const current = useCountUp(armed ? value : 0)
  const shown = current === value ? exact : current.toFixed(decimals)
  return (
    <span aria-label={exact}>
      <span aria-hidden>{shown}</span>
    </span>
  )
}

/* ---------- Page ---------- */

const LaunchListPage = () => {
  const { chainId: chainParam } = useParams()
  const parsedChainId = Number(chainParam)
  const chainId = SUPPORTED_CHAINS.includes(parsedChainId)
    ? parsedChainId
    : NETWORKS.gnosis
  const chain = NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
  const chainName = chain?.name ?? `chain ${chainId}`
  const symbol = getNativeCurrency(chainId).symbol
  const arbitratorAddress = defaultArbitrator[chainId]?.address
  const extraData = defaultArbitratorExtraData[chainId]?.data
  const jurors = extraData
    ? jurorsAndCourtIDFromExtraData(extraData).numberOfJurors
    : undefined
  const stakeToken = defaultStakeToken[chainId]?.label

  // Read-only: the arbitration cost both factories start from on this chain.
  const provider = useEthersProvider({ chainId })
  const { arbitrationCost, error: costError } = useArbitrationCost({
    address: arbitratorAddress,
    arbitratorExtraData: extraData,
    library: provider,
  })
  const costLoading =
    arbitrationCost === undefined &&
    !costError &&
    !!provider &&
    !!arbitratorAddress &&
    !!extraData
  const cost = arbitrationCost ? formatNative(arbitrationCost) : undefined
  /** A Standard default deposit: base plus the live arbitration cost. */
  const total = (base: number) =>
    arbitrationCost
      ? formatNative(ethers.utils.parseEther(String(base)).add(arbitrationCost))
      : undefined
  const submitTotal = total(STANDARD_DEFAULTS.submissionBaseDeposit)
  const removeTotal = total(STANDARD_DEFAULTS.removalBaseDeposit)

  const [statsRef, statsSeen] = useInView<HTMLDivElement>()
  const [standardRef, standardSeen] = useInView<HTMLDivElement>()
  const [stakeRef, stakeSeen] = useInView<HTMLDivElement>()

  useDocumentHead(
    'Launch a list | Kleros Curate',
    'Create a Kleros Curate list: a Standard list with a challenge period and refundable deposits, or a Stake list with a token stake that stays locked while the entry is listed. Classic lists can no longer be created.',
  )

  return (
    <Page>
      <Header>
        <ChainSwitch
          chainId={chainId}
          chains={SUPPORTED_CHAINS}
          testnets={TESTNETS}
          style={{ ['--i' as string]: 0 }}
        />
        <Title style={{ ['--i' as string]: 1 }}>
          Launch a list on <em>{chainName}</em>
        </Title>
        <Lede style={{ ['--i' as string]: 2 }}>
          Both kinds send disputes to Kleros jurors; they differ in what a
          submitter puts at risk, and for how long.
        </Lede>
        <Stats
          ref={statsRef}
          aria-label={`The default court on ${chainName}, shared by both kinds`}
          style={{ ['--i' as string]: 3 }}
        >
          <Stat>
            <Label $tone="faint">Arbitration cost · now</Label>
            <StatValue>
              {cost ? (
                <>
                  <Count exact={cost} armed={statsSeen} />
                  <small>{symbol}</small>
                </>
              ) : costLoading ? (
                <SkeletonBlock
                  $width="7ch"
                  $height="34px"
                  aria-label="Reading the arbitration cost"
                />
              ) : (
                '—'
              )}
            </StatValue>
            {costError && (
              <StatNote>
                Could not read the court: the cost is added in the wizard
              </StatNote>
            )}
          </Stat>
          <Stat>
            <Label $tone="faint">Jurors · first round</Label>
            <StatValue>
              {jurors !== undefined ? (
                <Count exact={String(jurors)} armed={statsSeen} />
              ) : (
                '—'
              )}
            </StatValue>
          </Stat>
        </Stats>
      </Header>

      <Cards>
        <Card
          as="section"
          $featured
          $padding="none"
          aria-labelledby="launch-standard"
          style={{ ['--i' as string]: 4 }}
        >
          <CardHead>
            <div>
              <Label $tone="faint">Light Curate</Label>
              <CardTitle id="launch-standard">Standard list</CardTitle>
            </div>
            <Chip $selected>Default</Chip>
          </CardHead>

          <Deposit ref={standardRef}>
            <Headline>
              <Label $tone="faint">Submit deposit · default</Label>
              <Amount>
                {submitTotal ? (
                  <Count exact={submitTotal} armed={standardSeen} />
                ) : costLoading ? (
                  <SkeletonBlock
                    $width="5ch"
                    $height="44px"
                    aria-label="Reading the arbitration cost"
                  />
                ) : (
                  STANDARD_DEFAULTS.submissionBaseDeposit
                )}
                <small>{symbol}</small>
              </Amount>
              <Breakdown>
                {cost
                  ? `= ${STANDARD_DEFAULTS.submissionBaseDeposit} base deposit + ${cost} arbitration cost`
                  : `+ the arbitration cost, in ${symbol}`}
                <span>Paid in {symbol}, no token approval</span>
              </Breakdown>
            </Headline>
            <SideStats>
              <div>
                <Label as="dt" $tone="faint">
                  Remove deposit
                </Label>
                <dd>
                  {removeTotal ?? STANDARD_DEFAULTS.removalBaseDeposit}
                  <small>{removeTotal ? symbol : `${symbol} + cost`}</small>
                </dd>
              </div>
              <div>
                <Label as="dt" $tone="faint">
                  Challenge period
                </Label>
                <dd>{formatDuration(challengePeriod)}</dd>
              </div>
            </SideStats>
          </Deposit>

          <Drawing>
            <Lifecycle spec={STANDARD_LIFE} scale={SCALE} delay={700} />
            <Risk>
              <i aria-hidden />
              <span>
                <b>If challenged and you lose,</b> the deposit goes to the
                challenger, minus the arbitration cost.
              </span>
            </Risk>
          </Drawing>

          <Points aria-label="Trade-offs">
            <Point>
              <CurateIcon name="check" size={18} />
              <span>
                <VisuallyHidden>Advantage: </VisuallyHidden>
                Only a hash goes on-chain; entry data lives on IPFS.
              </span>
            </Point>
            <Point $con>
              <MinusIcon />
              <span>
                <VisuallyHidden>Trade-off: </VisuallyHidden>
                Once registered, an entry can only be contested through a
                removal request.
              </span>
            </Point>
          </Points>
          <CardAction>
            <ButtonLink
              to={`/factory/${chainId}`}
              $variant="primary"
              $block
              onMouseEnter={() => preloadFactory()}
              onFocus={() => preloadFactory()}
            >
              Create a Standard list
              <ArrowIcon />
            </ButtonLink>
          </CardAction>
        </Card>

        <Card
          as="section"
          $padding="none"
          aria-labelledby="launch-stake"
          style={{ ['--i' as string]: 5 }}
        >
          <CardHead>
            <div>
              <Label $tone="faint">Stake Curate</Label>
              <CardTitle id="launch-stake">Stake list</CardTitle>
            </div>
          </CardHead>

          <Deposit ref={stakeRef}>
            <Headline>
              <Label $tone="faint">Minimum stake · default</Label>
              <Amount>
                <Count
                  exact={String(STAKE_DEFAULTS.submissionMinDeposit)}
                  armed={stakeSeen}
                />
                <small>{stakeToken ?? 'tokens'}</small>
              </Amount>
              <Breakdown>
                {cost
                  ? `+ ${cost} ${symbol} arbitration deposit`
                  : `+ the arbitration deposit, in ${symbol}`}
                <span>
                  {stakeToken
                    ? `Any ERC-20; ${stakeToken} is pre-filled`
                    : 'Any ERC-20, chosen in the wizard'}
                </span>
              </Breakdown>
            </Headline>
            <SideStats>
              <div>
                <Label as="dt" $tone="faint">
                  Challenger stake
                </Label>
                <dd>
                  {STAKE_DEFAULTS.challengeStakeMultiplier}%
                  <small>of the entry’s</small>
                </dd>
              </div>
              <div>
                <Label as="dt" $tone="faint">
                  Reinclusion period
                </Label>
                <dd>
                  {formatDuration(
                    STAKE_DEFAULTS.reinclusionPeriodDuration * HOUR,
                  )}
                  <small>after a ruling keeps it</small>
                </dd>
              </div>
            </SideStats>
          </Deposit>

          <Drawing>
            <Lifecycle spec={STAKE_LIFE} scale={SCALE} delay={780} />
            <Risk>
              <i aria-hidden />
              <span>
                <b>If challenged and you lose,</b> the challenger takes the
                stake and the entry leaves the list.
              </span>
            </Risk>
          </Drawing>

          <Points aria-label="Trade-offs">
            <Point>
              <CurateIcon name="check" size={18} />
              <span>
                <VisuallyHidden>Advantage: </VisuallyHidden>A failed challenge
                adds the challenger’s stake to the entry’s.
              </span>
            </Point>
            <Point $con>
              <MinusIcon />
              <span>
                <VisuallyHidden>Trade-off: </VisuallyHidden>
                Submitters approve and lock a token, and get it back only by
                withdrawing.
              </span>
            </Point>
          </Points>
          <CardAction>
            <ButtonLink
              to={`/factory-permanent/${chainId}`}
              $variant="secondary"
              $block
              onMouseEnter={() => preloadPermanentFactory()}
              onFocus={() => preloadPermanentFactory()}
            >
              Create a Stake list
              <ArrowIcon />
            </ButtonLink>
          </CardAction>
        </Card>
      </Cards>

      <ClassicNote style={{ ['--i' as string]: 6 }}>
        <CurateIcon name="help" size={16} />
        <span>
          Classic lists can no longer be created; existing ones keep working.{' '}
          <Link to="/guide">Read the guide</Link>
        </span>
      </ClassicNote>

      <Pro
        as="section"
        $padding="none"
        aria-labelledby="launch-pro"
        style={{ ['--i' as string]: 7 }}
      >
        <div>
          <Label $tone="faint">Assisted route</Label>
          <h2 id="launch-pro">Curate Pro</h2>
          <p>
            Policy drafting and review, a ready API and help with a dedicated
            front end.
          </p>
        </div>
        <ProActions>
          <ButtonLink to="/pro" $variant="secondary" $size="sm">
            See Curate Pro
          </ButtonLink>
          <ButtonAnchor href={CONTACT_HREF} $variant="ghost" $size="sm">
            Email the Kleros team
          </ButtonAnchor>
        </ProActions>
      </Pro>
    </Page>
  )
}

export default LaunchListPage
