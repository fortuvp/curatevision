import React from 'react'
import styled from 'styled-components'
import { Link, useParams } from 'react-router-dom'
import { BigNumber, ethers } from 'ethers'
import useDocumentHead from 'hooks/use-document-head'
import useArbitrationCost from 'hooks/arbitration-cost'
import { useEthersProvider } from 'hooks/ethers-adapters'
import { NETWORKS, NETWORKS_INFO, getNativeCurrency } from 'config/networks'
import {
  defaultArbitrator,
  defaultArbitratorExtraData,
} from 'config/tcr-addresses'
import { jurorsAndCourtIDFromExtraData } from 'utils/string'
import { formatDuration } from 'utils/time'
import { preloadFactory, preloadPermanentFactory } from 'bootstrap/app-router'
import ChainLogo from 'components/chain-logo'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  ButtonAnchor,
  ButtonLink,
  ChainChip,
  Chip,
  Data,
  KeyValueList,
  Label,
  Page,
  Section,
  SkeletonBlock,
  Small,
  Stack,
  Statement,
  Subheading,
  Surface,
  Title,
} from 'components/curate/primitives'
import { Explainer } from 'components/curate/explainer'
import {
  DecisionsSchematic,
  StakeSchematic,
  StandardSchematic,
} from './schematics'

/*
 * Launch a list (route /launch/:chainId): the entry point to create a list.
 * Two list types can be created today, Standard (Light Curate) and Stake
 * (Stake Curate); Classic Curate lists can no longer be created. The two are
 * shown as comparable cards with a schematic, the trade-offs and one primary
 * button each into the matching factory on the chain from the URL.
 */

const SUPPORTED_CHAINS: number[] = [
  NETWORKS.ethereum,
  NETWORKS.gnosis,
  NETWORKS.sepolia,
]

const HOUR = 60 * 60

/*
 * The wizard defaults, mirrored from the factories' initial state
 * (src/pages/factory/index.tsx and src/pages/factory-permanent/index.tsx).
 * Every value can be changed in the wizard. Keep in sync with the factories.
 */
const STANDARD_DEFAULTS = {
  submissionBaseDeposit: 0.05,
  removalBaseDeposit: 0.05,
  challengePeriodHours: 84,
}

const STAKE_DEFAULTS = {
  submissionMinDeposit: 0.05,
  submissionPeriodHours: 84,
  reinclusionPeriodHours: 12,
  withdrawingPeriodHours: 84,
  challengeStakePercent: 50,
}

const CONTACT_HREF =
  'mailto:contact@kleros.io?subject=Launch%20a%20Curate%20list'

/* ---------- Hero ---------- */

const Hero = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 760px;
`

const Eyebrow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`

const ChainPicker = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
`

const ChainLink = styled(Link)<{ $selected?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid
    ${({ $selected }) =>
      $selected ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius-sm);
  background: ${({ $selected }) =>
    $selected ? 'var(--color-primary-soft)' : 'var(--color-surface)'};
  color: ${({ $selected }) =>
    $selected ? 'var(--color-primary)' : 'var(--color-muted)'};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;
  transition:
    border-color var(--motion),
    color var(--motion);

  &:hover {
    border-color: ${({ $selected }) =>
      $selected ? 'var(--color-primary)' : 'var(--color-border-strong)'};
    color: ${({ $selected }) =>
      $selected ? 'var(--color-primary)' : 'var(--color-text)'};
  }
`

/* ---------- Option cards ---------- */

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`

const Option = styled(Surface)`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const OptionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const OptionEyebrow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

const Schematic = styled.div`
  padding: 4px 0;
  color: var(--color-muted);

  svg {
    display: block;
    width: 100%;
    height: auto;
  }
`

const Points = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Point = styled.li`
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 8px;
  max-width: 68ch;
  color: var(--color-muted);
  font-size: var(--fs-body);
  line-height: var(--lh-body);

  svg {
    margin-top: 2px;
    color: var(--color-faint);
  }
`

const Block = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
`

const OptionFooter = styled.div`
  margin-top: auto;
  padding-top: 4px;
`

const GuideLink = styled(Link)`
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
`

/* ---------- Pro ---------- */

const ProShell = styled(Surface)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px;
  align-items: center;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const ProActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;

  @media (max-width: 720px) {
    > a {
      flex: 1 1 auto;
    }
  }
`

/* ---------- Page ---------- */

const hours = (count: number) => `${formatDuration(count * HOUR)} (${count} h)`

/** "0.0309" from wei, trailing zeros trimmed (same rule as eth-amount). */
const formatNative = (wei: BigNumber) =>
  ethers.utils.formatEther(wei).replace(/\.?0+$/, '')

/*
 * A factory default deposit as the total the submitter sends, with its
 * breakdown, once the chain's default arbitrator has answered; a skeleton
 * while it is being read; the base figure alone if the read failed or there
 * is no provider for the chain.
 */
const DepositTotal = ({
  base,
  cost,
  loading,
  symbol,
}: {
  base: number
  cost?: BigNumber
  loading: boolean
  symbol: string
}) => {
  if (cost) {
    const total = ethers.utils.parseEther(String(base)).add(cost)
    return (
      <>
        <Data>
          {formatNative(total)} {symbol}
        </Data>{' '}
        <Small $muted>
          = {base} base deposit + {formatNative(cost)} arbitration cost
        </Small>
      </>
    )
  }
  if (loading) return <SkeletonBlock $width="16ch" $height="20px" />
  return (
    <>
      <Data>
        {base} {symbol}
      </Data>{' '}
      <Small $muted>+ arbitration cost</Small>
    </>
  )
}

const LaunchListPage = () => {
  const { chainId: chainParam } = useParams()
  const parsedChainId = Number(chainParam)
  const chainId = SUPPORTED_CHAINS.includes(parsedChainId)
    ? parsedChainId
    : NETWORKS.gnosis
  const chain = NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
  const symbol = getNativeCurrency(chainId).symbol
  const arbitratorAddress = defaultArbitrator[chainId]?.address
  const extraData = defaultArbitratorExtraData[chainId]?.data
  const jurors = extraData
    ? jurorsAndCourtIDFromExtraData(extraData).numberOfJurors
    : undefined

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

  useDocumentHead(
    'Launch a list | Kleros Curate',
    'Create a Kleros Curate list: a Standard list with a challenge period and refundable deposits, or a Stake list with a token stake that stays locked while the entry is listed. Classic lists can no longer be created.',
  )

  return (
    <Page>
      <Hero>
        <Eyebrow>
          <Label>Launch a list</Label>
          <ChainChip chainId={chainId} />
        </Eyebrow>
        <Statement>
          Pick what backs each entry: a refundable deposit or a locked stake.
        </Statement>
        <Body $muted $large>
          Two list types can be created today. Both let anyone add an entry, let
          anyone challenge it, and send disputes to Kleros jurors who rule on
          your policy. They differ in what a submitter puts at risk and for how
          long. Classic Curate lists can no longer be created; the existing ones
          keep working.
        </Body>
        <ChainPicker aria-label="Chain to launch on">
          <Small $muted>Launch on</Small>
          {SUPPORTED_CHAINS.map((id) => {
            const info = NETWORKS_INFO[id as keyof typeof NETWORKS_INFO]
            return (
              <ChainLink
                key={id}
                to={`/launch/${id}`}
                $selected={id === chainId}
                aria-current={id === chainId ? 'page' : undefined}
              >
                <ChainLogo chainId={id} size={14} />
                {info?.name ?? `Chain ${id}`}
              </ChainLink>
            )
          })}
        </ChainPicker>
      </Hero>

      <Section>
        <Options>
          <Option as="section" $padding="standard" aria-label="Standard list">
            <OptionHeader>
              <OptionEyebrow>
                <Label>Standard · Light Curate</Label>
                <Chip>Default</Chip>
              </OptionEyebrow>
              <Subheading as="h2">Standard list</Subheading>
              <Body $muted>
                Each entry is backed by a deposit in {symbol}. Anyone can
                challenge it during the challenge period; if nobody does, the
                entry is registered and the deposit comes back in full.
              </Body>
            </OptionHeader>

            <Schematic aria-hidden>
              <StandardSchematic />
            </Schematic>

            <Block>
              <Label>Trade-offs</Label>
              <Points>
                <Point>
                  <CurateIcon name="check" size={14} />
                  Entry data is stored off-chain and indexed; only its hash goes
                  on-chain, which keeps submissions cheap.
                </Point>
                <Point>
                  <CurateIcon name="check" size={14} />
                  Submitters pay in {symbol}, the chain’s own currency. No token
                  approval is needed.
                </Point>
                <Point>
                  <CurateIcon name="check" size={14} />
                  Once the challenge period ends, the entry is registered and
                  can only be contested again through a removal request, which
                  opens a new challenge period.
                </Point>
                <Point>
                  <CurateIcon name="challenge" size={14} />
                  If an entry is challenged and loses, its deposit goes to the
                  challenger minus the arbitration cost.
                </Point>
              </Points>
            </Block>

            <Block>
              <Label>Factory defaults · change them in the wizard</Label>
              <KeyValueList>
                <dt>Submit deposit</dt>
                <dd>
                  <DepositTotal
                    base={STANDARD_DEFAULTS.submissionBaseDeposit}
                    cost={arbitrationCost}
                    loading={costLoading}
                    symbol={symbol}
                  />
                </dd>
                <dt>Remove deposit</dt>
                <dd>
                  <DepositTotal
                    base={STANDARD_DEFAULTS.removalBaseDeposit}
                    cost={arbitrationCost}
                    loading={costLoading}
                    symbol={symbol}
                  />
                </dd>
                <dt>Challenge period</dt>
                <dd>
                  <Data>{hours(STANDARD_DEFAULTS.challengePeriodHours)}</Data>
                </dd>
                {jurors !== undefined && (
                  <>
                    <dt>Jurors</dt>
                    <dd>
                      <Data>{jurors}</Data>{' '}
                      <Small $muted>in the first round</Small>
                    </dd>
                  </>
                )}
              </KeyValueList>
            </Block>

            <OptionFooter>
              <ButtonLink
                to={`/factory/${chainId}`}
                $variant="primary"
                $block
                onMouseEnter={() => preloadFactory()}
                onFocus={() => preloadFactory()}
              >
                <CurateIcon name="factory" size={16} />
                Create a Standard list
              </ButtonLink>
            </OptionFooter>
          </Option>

          <Option as="section" $padding="standard" aria-label="Stake list">
            <OptionHeader>
              <OptionEyebrow>
                <Label>Stake · Stake Curate</Label>
              </OptionEyebrow>
              <Subheading as="h2">Stake list</Subheading>
              <Body $muted>
                Each entry is backed by an ERC20 stake that stays locked for as
                long as the entry is listed, plus an arbitration deposit in{' '}
                {symbol}. The entry can be challenged at any time.
              </Body>
            </OptionHeader>

            <Schematic aria-hidden>
              <StakeSchematic />
            </Schematic>

            <Block>
              <Label>Trade-offs</Label>
              <Points>
                <Point>
                  <CurateIcon name="check" size={14} />
                  Entries stay open to challenge for their whole life, so the
                  list keeps correcting itself after the submission period.
                </Point>
                <Point>
                  <CurateIcon name="check" size={14} />A challenger stakes a
                  share of the entry’s stake. If the entry is kept, that share
                  is added to the entry’s stake.
                </Point>
                <Point>
                  <CurateIcon name="challenge" size={14} />
                  Submitters approve and lock a token, and get it back only
                  after the withdrawing period has run.
                </Point>
                <Point>
                  <CurateIcon name="challenge" size={14} />
                  If an entry is challenged and loses, the challenger takes its
                  stake and the entry leaves the list.
                </Point>
              </Points>
            </Block>

            <Block>
              <Label>Factory defaults · change them in the wizard</Label>
              <KeyValueList>
                <dt>Stake token</dt>
                <dd>
                  Any ERC20{' '}
                  <Small $muted>
                    {chainId === NETWORKS.gnosis
                      ? '(sDAI pre-filled)'
                      : '(chosen in the wizard)'}
                  </Small>
                </dd>
                <dt>Minimum stake</dt>
                <dd>
                  <Data>{STAKE_DEFAULTS.submissionMinDeposit}</Data>{' '}
                  <Small $muted>
                    of the stake token +{' '}
                    {arbitrationCost
                      ? `${formatNative(arbitrationCost)} ${symbol} arbitration cost`
                      : `arbitration cost in ${symbol}`}
                  </Small>
                </dd>
                <dt>Submission period</dt>
                <dd>
                  <Data>{hours(STAKE_DEFAULTS.submissionPeriodHours)}</Data>
                </dd>
                <dt>Reinclusion period</dt>
                <dd>
                  <Data>{hours(STAKE_DEFAULTS.reinclusionPeriodHours)}</Data>{' '}
                  <Small $muted>after a ruling keeps the entry</Small>
                </dd>
                <dt>Withdrawing period</dt>
                <dd>
                  <Data>{hours(STAKE_DEFAULTS.withdrawingPeriodHours)}</Data>
                </dd>
                <dt>Challenger stake</dt>
                <dd>
                  <Data>{STAKE_DEFAULTS.challengeStakePercent}%</Data>{' '}
                  <Small $muted>of the entry’s stake</Small>
                </dd>
                {jurors !== undefined && (
                  <>
                    <dt>Jurors</dt>
                    <dd>
                      <Data>{jurors}</Data>{' '}
                      <Small $muted>in the first round</Small>
                    </dd>
                  </>
                )}
              </KeyValueList>
            </Block>

            <OptionFooter>
              <ButtonLink
                to={`/factory-permanent/${chainId}`}
                $variant="primary"
                $block
                onMouseEnter={() => preloadPermanentFactory()}
                onFocus={() => preloadPermanentFactory()}
              >
                <CurateIcon name="layers" size={16} />
                Create a Stake list
              </ButtonLink>
            </OptionFooter>
          </Option>
        </Options>
      </Section>

      <Section>
        <Explainer
          id="launch-list-what-you-decide"
          eyebrow="Before you start"
          heading="What you decide when you launch a list"
          intro={`The wizard asks for each of these in turn, with defaults filled in. Nothing is deployed on ${chain?.name ?? 'the chain'} until the last step.`}
          steps={[
            {
              title: 'Deposits and challenge period',
              body: `What a submitter locks to add an entry and a remover to take one out, on top of the arbitration cost the court charges, and how long an entry can be contested before it is registered and the deposit comes back. Higher deposits deter bad entries; longer periods give curators time to look. Stake lists use a submission period instead and stay open to challenge afterwards. The wizard shows the total in ${symbol} before you deploy.`,
            },
            {
              title: 'Court, jurors and policy',
              body: 'Which Kleros court rules on disputes, how many jurors sit in the first round, and the policy PDF they rule by. More jurors make rulings sturdier and raise the arbitration cost every deposit has to cover. Write down what belongs on the list, what does not, and how to check.',
            },
            {
              title: 'Columns',
              body: 'The fields each entry carries, such as an address, a name or a link, with one or more marked as identifiers that name the entry in lists and search.',
            },
          ]}
          schematic={<DecisionsSchematic />}
          footer={<GuideLink to="/guide">Read the guide</GuideLink>}
        />
      </Section>

      <Section>
        <ProShell as="section" $padding="standard" aria-label="Curate Pro">
          <Stack $gap={6}>
            <Label>Assisted route</Label>
            <Title as="h2">Curate Pro</Title>
            <Body $muted>
              A supported path to production: policy drafting and review, a
              ready API, and help with a dedicated front end. The contracts stay
              permissionless either way, so you can also build your own front
              end on them.
            </Body>
          </Stack>
          <ProActions>
            <ButtonLink to="/pro" $variant="secondary">
              See Curate Pro
            </ButtonLink>
            <ButtonAnchor href={CONTACT_HREF} $variant="ghost">
              Email the Kleros team
            </ButtonAnchor>
          </ProActions>
        </ProShell>
      </Section>
    </Page>
  )
}

export default LaunchListPage
