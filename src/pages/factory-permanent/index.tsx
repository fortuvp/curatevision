import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
import { useDebounce } from 'use-debounce'
import { ethers } from 'ethers'
import { useWeb3Context } from 'hooks/use-web3-context'
import { useEthersProvider } from 'hooks/ethers-adapters'
import useUrlChainId from 'hooks/use-url-chain-id'
import useDocumentHead from 'hooks/use-document-head'
import useTcrMetaEvidence from 'hooks/use-tcr-meta-evidence'
import _GTCRFactory from 'assets/abis/PermanentGTCRFactory.json'
import { version } from '../../../package.json'
import { parseIpfs } from 'utils/ipfs-parse'
import { NETWORKS, NETWORKS_INFO } from 'config/networks'
import {
  defaultArbitrator as defaultArbitratorAddresses,
  defaultArbitratorExtraData as defaultArbitratorExtraDataObj,
  defaultGovernor as defaultGovernorAddresses,
  pgtcrFactoryAddresses,
} from 'config/tcr-addresses'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ChainChip,
  Data,
  EmptyState,
  Label,
  ListRow,
  Page,
  PanelHeader,
  PanelHint,
  PanelTitle,
  Row,
  Section,
  SegmentedControl,
  SkeletonBlock,
  Small,
  Stack,
  Statement,
  Surface,
  truncateMiddle,
} from 'components/curate/primitives'
import TCRParams from './tcr-params'
import ItemParams from './item-params'
import Deploy from './deploy'
import { DEFAULT_COLUMN, WIZARD_DEFAULTS, defaultStakeToken } from './defaults'

/*
 * Stake Curate factory (route /factory-permanent/:chainId): a three-step
 * wizard (list, item, deploy) whose state lives in localStorage per chain
 * and app version, so a half-finished list survives a reload. The page
 * header names the chain and switches factory type; the steps compose the
 * primitives; lists deployed from this browser are listed at the bottom.
 */

interface TransactionInfo {
  txHash: string
  networkId?: number
  isConnectedTCR?: boolean
  status?: string
  contractAddress?: string
  [key: string]: unknown
}

export interface TcrState {
  tcrTitle: string
  tcrDescription: string
  submissionMinDeposit: number
  arbitratorAddress: string
  governorAddress: string
  tokenAddress: string
  submissionPeriodDuration: number
  reinclusionPeriodDuration: number
  withdrawingPeriodDuration: number
  arbitrationParamsCooldown: number
  itemName: string
  itemNamePlural: string
  requireRemovalEvidence: boolean
  tcrPrimaryDocument: string
  tcrLogo: string
  arbitratorExtraData?: string
  challengeStakeMultiplier: number
  sharedStakeMultiplier: number
  winnerStakeMultiplier: number
  loserStakeMultiplier: number
  columns: Column[]
  currStep: number
  chainId?: number
  transactions: Record<string, TransactionInfo>
  finished?: boolean
}

export interface CachedFactory {
  tcrState: TcrState
  setTcrState: React.Dispatch<React.SetStateAction<TcrState>>
  resetTcrState: () => void
  nextStep: () => void
  previousStep: () => void
  resetStepper: () => void
  STEP_COUNT: number
  setTxState: (tx: TransactionInfo) => void
  defaultArbLabel?: string
  defaultArbDataLabel?: string
  defaultGovernorLabel?: string
  defaultStakeTokenLabel?: string
}

export interface StepProps extends CachedFactory {
  formId?: string
  postSubmit: () => void
}

const STEP_COUNT = 3

const STEPS = [
  {
    title: 'List',
    description: 'Name, logo, policy, stake token, deposit and timing.',
  },
  {
    title: 'Item',
    description: 'The fields each entry has and which ones identify it.',
  },
  {
    title: 'Deploy',
    description: 'Review the parameters and send the transaction.',
  },
]

const SUPPORTED_CHAINS: number[] = [
  NETWORKS.gnosis,
  NETWORKS.ethereum,
  NETWORKS.sepolia,
].filter((chainId) => !!pgtcrFactoryAddresses[chainId])

const chainName = (chainId: number): string =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]?.name ??
  `chain ${chainId}`

export const formIds = ['tcrParamsForm', 'itemParamsForm', 'deployTCRForm']

export const CurrentStep = (
  props: CachedFactory & { postSubmit: () => void },
) => {
  const {
    tcrState: { currStep },
  } = props
  switch (currStep) {
    case 1: {
      return <TCRParams formId={formIds[currStep]} {...props} />
    }
    case 2: {
      return <ItemParams formId={formIds[currStep]} {...props} />
    }
    case 3: {
      return <Deploy formId={formIds[currStep]} {...props} />
    }
    default: {
      throw new Error('Unknown step')
    }
  }
}

/* ---------- Wizard state ---------- */

const useCachedFactory = (
  appVersion: string,
  networkId: number | undefined,
): CachedFactory | null => {
  const { account } = useWeb3Context()
  const { address: defaultArbitrator, label: defaultArbLabel } =
    (networkId !== undefined && defaultArbitratorAddresses[networkId]) || {}
  const { address: defaultGovernor, label: defaultGovernorLabel } =
    (networkId !== undefined && defaultGovernorAddresses[networkId]) || {}
  const { data: defaultArbitratorExtraData, label: defaultArbDataLabel } =
    (networkId !== undefined && defaultArbitratorExtraDataObj[networkId]) || {}
  const { address: defaultToken, label: defaultStakeTokenLabel } =
    (networkId !== undefined && defaultStakeToken[networkId]) || {}

  const key = `pgtcrState@${networkId}@${appVersion}`
  const initialWizardState = {
    tcrTitle: '',
    tcrDescription: '',
    submissionMinDeposit: WIZARD_DEFAULTS.submissionMinDeposit,
    arbitratorAddress: defaultArbitrator || '',
    governorAddress: account || defaultGovernor || '',
    tokenAddress: defaultToken || '',
    submissionPeriodDuration: WIZARD_DEFAULTS.submissionPeriodDuration,
    reinclusionPeriodDuration: WIZARD_DEFAULTS.reinclusionPeriodDuration,
    withdrawingPeriodDuration: WIZARD_DEFAULTS.withdrawingPeriodDuration,
    arbitrationParamsCooldown: WIZARD_DEFAULTS.arbitrationParamsCooldown,
    itemName: WIZARD_DEFAULTS.itemName,
    itemNamePlural: WIZARD_DEFAULTS.itemNamePlural,
    requireRemovalEvidence: true,
    tcrPrimaryDocument: '',
    tcrLogo: '',
    arbitratorExtraData: defaultArbitratorExtraData,
    challengeStakeMultiplier: WIZARD_DEFAULTS.challengeStakeMultiplier,
    sharedStakeMultiplier: WIZARD_DEFAULTS.sharedStakeMultiplier,
    winnerStakeMultiplier: WIZARD_DEFAULTS.winnerStakeMultiplier,
    loserStakeMultiplier: WIZARD_DEFAULTS.loserStakeMultiplier,
    columns: [{ ...DEFAULT_COLUMN }],
    currStep: 1,
    chainId: networkId,
  }
  const initialState: TcrState = {
    ...initialWizardState,
    transactions: {},
  }

  const newInitialState: TcrState = JSON.parse(JSON.stringify(initialState)) // Deep copy.
  const cached = window.localStorage.getItem(key)
  let resolvedState: TcrState = newInitialState
  if (cached) {
    const parsed = JSON.parse(cached) as TcrState
    if (parsed.arbitratorAddress && parsed.chainId === networkId)
      resolvedState = parsed
  }

  // We check for the finished flag to reset the form
  // if the user finished his previous deployment.
  // We only keep the deployment transactions.
  if (resolvedState.finished)
    resolvedState = {
      ...newInitialState,
      transactions: resolvedState.transactions,
    }

  const [tcrState, setTcrState] = useState<TcrState>(resolvedState)
  const [debouncedTcrState] = useDebounce(tcrState, 1000)
  const [prevNetworkId, setPrevNetworkId] = useState(networkId)

  // Synchronous state reset when chain changes via URL.
  if (networkId && networkId !== prevNetworkId) {
    setPrevNetworkId(networkId)
    setTcrState((prev) => ({
      ...JSON.parse(JSON.stringify(initialWizardState)),
      transactions: prev.transactions,
    }))
  }

  useEffect(() => {
    if (
      !networkId ||
      !debouncedTcrState ||
      !debouncedTcrState.arbitratorAddress
    )
      return
    window.localStorage.setItem(key, JSON.stringify({ ...debouncedTcrState }))
  }, [debouncedTcrState, key, networkId])

  if (!networkId || !tcrState.arbitratorAddress) return null

  const nextStep = () =>
    setTcrState((prevState) => ({
      ...prevState,
      currStep:
        prevState.currStep === STEP_COUNT
          ? prevState.currStep
          : prevState.currStep + 1,
    }))
  const previousStep = () =>
    setTcrState((prevState) => ({
      ...prevState,
      currStep:
        prevState.currStep === 1 ? prevState.currStep : prevState.currStep - 1,
    }))
  const resetStepper = () =>
    setTcrState((prevState) => ({ ...prevState, currStep: 1 }))
  const resetTcrState = () =>
    setTcrState((prevState) => ({
      ...JSON.parse(JSON.stringify(initialWizardState)),
      transactions: prevState.transactions,
    }))
  const setTxState = (tx: TransactionInfo) =>
    setTcrState((prevState) => ({
      ...prevState,
      transactions: {
        ...prevState.transactions,
        [tx.txHash]: tx,
      },
    }))

  return {
    tcrState,
    setTcrState,
    resetTcrState,
    nextStep,
    previousStep,
    resetStepper,
    STEP_COUNT,
    setTxState,
    defaultArbLabel,
    defaultArbDataLabel,
    defaultGovernorLabel,
    defaultStakeTokenLabel,
  }
}

/* ---------- Layout ---------- */

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 760px;
`

const HeaderActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 4px;
`

const Steps = styled.ol`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 720px) {
    gap: 8px;
  }
`

const Step = styled.li<{ $state: 'done' | 'current' | 'todo' }>`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px 14px;
  border: 1px solid
    ${({ $state }) =>
      $state === 'current'
        ? 'var(--color-primary)'
        : 'var(--color-border)'};
  border-radius: var(--radius);
  background: var(--color-surface);
  color: ${({ $state }) =>
    $state === 'todo' ? 'var(--color-muted)' : 'var(--color-text)'};

  @media (max-width: 720px) {
    grid-template-columns: 24px;
    justify-items: center;
    padding: 10px 6px;
  }
`

const StepIndex = styled.span<{ $state: 'done' | 'current' | 'todo' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid
    ${({ $state }) =>
      $state === 'current'
        ? 'var(--color-primary)'
        : 'var(--color-border-strong)'};
  border-radius: var(--radius-pill);
  background: ${({ $state }) =>
    $state === 'current'
      ? 'var(--color-primary)'
      : $state === 'done'
        ? 'var(--color-raised)'
        : 'transparent'};
  color: ${({ $state }) =>
    $state === 'current' ? 'var(--color-on-primary)' : 'var(--color-muted)'};
  font-family: var(--font-mono);
  font-size: var(--fs-label);
  font-weight: 500;
`

const StepText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  @media (max-width: 720px) {
    align-items: center;

    p {
      display: none;
    }
  }
`

const StepTitle = styled.span`
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
`

const StepDescription = styled.p`
  margin: 0;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const ActionBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`

const ActionGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const ConfirmReset = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const ChainLinks = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`

const ChainLink = styled(Link)`
  display: inline-flex;
  border-radius: var(--radius-sm);
  text-decoration: none;
`

const Logo = styled.span<{ $image?: string | null }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: ${({ $image }) =>
    $image ? `url(${$image}) center / cover` : 'var(--color-raised)'};
  color: var(--color-faint);
  overflow: hidden;
`

const DeployedCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
`

const DeployedText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const DeployedTitle = styled.span`
  overflow: hidden;
  color: var(--color-text);
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const WizardSteps = ({ current }: { current: number }) => (
  <nav aria-label="Wizard steps">
    <Steps>
      {STEPS.map((step, index) => {
        const position = index + 1
        const state =
          position < current ? 'done' : position === current ? 'current' : 'todo'
        return (
          <Step
            key={step.title}
            $state={state}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <StepIndex $state={state} aria-hidden>
              {state === 'done' ? (
                <CurateIcon name="check" size={12} />
              ) : (
                position
              )}
            </StepIndex>
            <StepText>
              <StepTitle>
                <span className="sr-only">
                  Step {position}
                  {state === 'done' ? ', done' : ''}:{' '}
                </span>
                {step.title}
              </StepTitle>
              <StepDescription>{step.description}</StepDescription>
            </StepText>
          </Step>
        )
      })}
    </Steps>
  </nav>
)

/** One list deployed from this browser: logo, title and address, linking to the list. */
const DeployedList = ({
  address,
  chainId,
}: {
  address: string
  chainId: number
}) => {
  const { data: metaEvidence, isLoading } = useTcrMetaEvidence(
    address,
    chainId,
  )
  const metadata = metaEvidence?.metadata
  const title = metadata?.tcrTitle ?? metadata?.title
  const logo = metadata?.logoURI ? parseIpfs(metadata.logoURI) : null
  return (
    <ListRow to={`/tcr/${chainId}/${address}`}>
      <DeployedCell>
        <Logo $image={logo} aria-hidden>
          {!logo && <CurateIcon name="list" size={14} />}
        </Logo>
        <DeployedText>
          {isLoading ? (
            <SkeletonBlock $height="16px" $width="160px" />
          ) : (
            <DeployedTitle>{title ?? 'Untitled list'}</DeployedTitle>
          )}
          <Data $muted $weight={400} title={address}>
            {truncateMiddle(address, 8, 6)}
          </Data>
        </DeployedText>
      </DeployedCell>
      <Small $muted>Open list</Small>
    </ListRow>
  )
}

/* ---------- Page ---------- */

const FactoryPermanentPage = () => {
  const urlChainId = useUrlChainId()
  const navigate = useNavigate()
  const factoryChainId = urlChainId ?? undefined
  const supported =
    factoryChainId !== undefined && !!pgtcrFactoryAddresses[factoryChainId]
  const cachedFactory = useCachedFactory(
    version,
    supported ? factoryChainId : undefined,
  )
  const provider = useEthersProvider({ chainId: factoryChainId })
  const [previousDeployments, setPreviousDeployments] = useState<string[]>([])
  const [deploymentsFailed, setDeploymentsFailed] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const tcrState = cachedFactory?.tcrState
  const nextStep = cachedFactory?.nextStep
  const previousStep = cachedFactory?.previousStep
  const resetTcrState = cachedFactory?.resetTcrState

  const currStep = tcrState?.currStep ?? 1
  const transactions = tcrState?.transactions

  useDocumentHead(
    'Create a Stake list · CurateVision',
    'Launch a Stake Curate list: name it, set the stake token and deposit, choose the court and the fields, then deploy.',
  )

  const factoryInterface = useMemo(
    () => new ethers.utils.Interface(_GTCRFactory),
    [],
  )

  // Lists deployed from this browser on this chain: the address stored with
  // the transaction, or read from its receipt's NewGTCR log.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!transactions || factoryChainId === undefined) return
      const own = Object.values(transactions).filter(
        (tx) => tx.networkId === factoryChainId,
      )
      if (own.length === 0) return
      try {
        const topic = factoryInterface.getEventTopic('NewGTCR')
        const addresses = await Promise.all(
          own.map(async (tx) => {
            if (tx.contractAddress) return tx.contractAddress
            if (!provider) return ''
            const receipt = await provider.waitForTransaction(
              tx.txHash,
              1,
              30_000,
            )
            const log = receipt.logs.find((entry) => entry.topics[0] === topic)
            return log
              ? String(factoryInterface.parseLog(log).args._address)
              : ''
          }),
        )
        if (!cancelled) {
          setPreviousDeployments(addresses.filter(Boolean))
          setDeploymentsFailed(false)
        }
      } catch (err) {
        console.error('Could not read previous deployments:', err)
        if (!cancelled) setDeploymentsFailed(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [factoryChainId, factoryInterface, provider, transactions])

  if (urlChainId === null)
    return (
      <Page>
        <Section aria-busy>
          <Stack $gap={16}>
            <SkeletonBlock $height="20px" $width="120px" />
            <SkeletonBlock $height="44px" $width="60%" />
            <SkeletonBlock $height="320px" />
          </Stack>
        </Section>
      </Page>
    )

  if (!supported || !cachedFactory || !tcrState)
    return (
      <Page>
        <Section>
          <Surface $padding="standard">
            <EmptyState
              icon="factory"
              title="Stake Curate lists can be created on Gnosis, Ethereum and Sepolia"
              action={
                <ChainLinks>
                  {SUPPORTED_CHAINS.map((chainId) => (
                    <ChainLink
                      key={chainId}
                      to={`/factory-permanent/${chainId}`}
                      aria-label={`Create a Stake list on ${chainName(chainId)}`}
                    >
                      <ChainChip chainId={chainId} />
                    </ChainLink>
                  ))}
                </ChainLinks>
              }
            >
              {supported
                ? 'The factory for this chain could not be set up.'
                : `There is no Stake Curate factory on chain ${urlChainId}. Pick one of the supported chains.`}
            </EmptyState>
          </Surface>
        </Section>
      </Page>
    )

  const chainId = tcrState.chainId ?? urlChainId
  const confirmReset = () => {
    resetTcrState?.()
    setConfirmingReset(false)
  }

  return (
    <Page>
      <Section>
        <Header>
          <Row $gap={10} $wrap>
            <Label>Launch a list · Stake Curate</Label>
            <ChainChip chainId={chainId} />
          </Row>
          <Statement>Create a Stake list</Statement>
          <Body $muted $large>
            Entries keep a stake in the list token locked while they are
            listed, so anyone can challenge them at any time. Three steps;
            nothing is deployed on {chainName(chainId)} until the last one.
          </Body>
          <HeaderActions>
            <Small $muted>Factory type</Small>
            <SegmentedControl
              ariaLabel="Factory type"
              value="permanent"
              options={[
                { value: 'light', label: 'Standard' },
                { value: 'permanent', label: 'Stake' },
              ]}
              onChange={(next) => {
                if (next === 'light') navigate(`/factory/${chainId}`)
              }}
            />
          </HeaderActions>
        </Header>
      </Section>

      <Section>
        <WizardSteps current={currStep} />
      </Section>

      <Section $gap="sm">
        <Surface $padding="standard">
          <CurrentStep
            key={factoryChainId}
            postSubmit={() => nextStep?.()}
            {...cachedFactory}
          />
        </Surface>
      </Section>

      <Section $gap="sm">
        <ActionBar>
          {confirmingReset ? (
            <ConfirmReset role="group" aria-label="Confirm starting over">
              <Small>Clear every field and go back to step 1?</Small>
              <Button
                type="button"
                $variant="danger"
                $size="sm"
                onClick={confirmReset}
              >
                Yes, start over
              </Button>
              <Button
                type="button"
                $variant="ghost"
                $size="sm"
                onClick={() => setConfirmingReset(false)}
              >
                Keep editing
              </Button>
            </ConfirmReset>
          ) : (
            <Button
              type="button"
              $variant="ghost"
              onClick={() => setConfirmingReset(true)}
            >
              <CurateIcon name="remove" size={16} />
              Start over
            </Button>
          )}
          <ActionGroup>
            <Button
              type="button"
              $variant="secondary"
              disabled={currStep === 1}
              onClick={() => previousStep?.()}
            >
              <CurateIcon
                name="chevron-down"
                size={16}
                style={{ transform: 'rotate(90deg)' }}
              />
              Previous
            </Button>
            {currStep < STEP_COUNT && (
              <Button form={formIds[currStep]} type="submit" $variant="primary">
                Next
                <CurateIcon
                  name="chevron-down"
                  size={16}
                  style={{ transform: 'rotate(-90deg)' }}
                />
              </Button>
            )}
          </ActionGroup>
        </ActionBar>
      </Section>

      {(previousDeployments.length > 0 || deploymentsFailed) && (
        <Section>
          <PanelHeader>
            <PanelTitle>Previous deployments</PanelTitle>
            <PanelHint>from this browser on {chainName(chainId)}</PanelHint>
          </PanelHeader>
          <Surface $padding="none">
            {deploymentsFailed ? (
              <EmptyState
                icon="list"
                title="Previous deployments could not be read"
              >
                The receipts of your earlier deployments on{' '}
                {chainName(chainId)} did not load. They are still stored in
                this browser; try again later.
              </EmptyState>
            ) : (
              previousDeployments.map((address) => (
                <DeployedList
                  key={address}
                  address={address}
                  chainId={chainId}
                />
              ))
            )}
          </Surface>
        </Section>
      )}
    </Page>
  )
}

export default FactoryPermanentPage
