import React, { useState, useEffect, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from 'use-debounce'
import { ethers } from 'ethers'
import { ItemTypes } from '@kleros/gtcr-encoder'
import _GTCRFactory from 'assets/abis/LightGTCRFactory.json'
import { useWeb3Context } from 'hooks/use-web3-context'
import useUrlChainId from 'hooks/use-url-chain-id'
import useDocumentHead from 'hooks/use-document-head'
import { fetchMetaEvidence } from 'hooks/light-tcr-view'
import { parseIpfs } from 'utils/ipfs-parse'
import { version } from '../../../package.json'
import {
  defaultArbitrator as defaultArbitratorAddresses,
  defaultArbitratorExtraData as defaultArbitratorExtraDataObj,
  defaultGovernor as defaultGovernorAddresses,
} from 'config/tcr-addresses'
import { NETWORKS_INFO } from 'config/networks'
import { CurateIcon } from 'components/curate/icons'
import { Explainer } from 'components/curate/explainer'
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
  PanelTitle,
  Row,
  Section,
  SegmentedControl,
  SkeletonBlock,
  Small,
  Stack,
  Statement,
  Surface,
  Title,
  truncateMiddle,
} from 'components/curate/primitives'
import {
  FactoryStepTimeline,
  FactoryWizardGrid,
} from 'components/curate/v2-factory-shell'
import TCRParams from './tcr-params'
import ItemParams from './item-params'
import RelTCRParams from './rel-tcr-params'
import Deploy from './deploy'
import type { FactorySection } from './schemas'

/*
 * /factory/:chainId, the Standard (Light Curate) list wizard: the page's
 * statement, one explainer, the step timeline, the current step's form and
 * the action bar (Next submits the step's form, so its schema runs), then
 * the lists deployed from this browser. The wizard state is cached per
 * chain and app version in localStorage, as before.
 */

export interface TransactionInfo {
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
  submissionBaseDeposit: number
  removalBaseDeposit: number
  submissionChallengeBaseDeposit: number
  removalChallengeBaseDeposit: number
  arbitratorAddress: string
  governorAddress: string
  challengePeriodDuration: number
  itemName: string
  itemNamePlural: string
  requireRemovalEvidence: boolean
  tcrPrimaryDocument: string
  tcrLogo: string
  arbitratorExtraData?: string
  sharedStakeMultiplier: number
  winnerStakeMultiplier: number
  loserStakeMultiplier: number
  isTCRofTCRs: boolean
  relSubmissionBaseDeposit: number
  relRemovalBaseDeposit: number
  relSubmissionChallengeBaseDeposit: number
  relRemovalChallengeBaseDeposit: number
  relArbitratorAddress: string
  relArbitratorExtraData?: string
  relGovernorAddress: string
  relChallengePeriodDuration: number
  relItemName: string
  relItemNamePlural: string
  relRequireRemovalEvidence: boolean
  relTcrPrimaryDocument: string
  relSharedStakeMultiplier: number
  relWinnerStakeMultiplier: number
  relLoserStakeMultiplier: number
  columns: Column[]
  relColumns: Column[]
  currStep: number
  chainId?: number
  transactions: Record<string, TransactionInfo>
  finished?: boolean
  relTcrDisabled?: boolean
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
}

export interface StepProps extends CachedFactory {
  formId?: string
  postSubmit: () => void
}

export const LIGHT_FACTORY_STEPS = [
  {
    title: 'List',
    description: 'Name, description, logo and policy.',
    subitems: ['Name', 'Description', 'Logo', 'Policy'],
  },
  {
    title: 'Item',
    description: 'Deposit, fields, preview and item name.',
    subitems: ['Deposit', 'Fields', 'Preview', 'Item name'],
  },
  {
    title: 'Badges',
    description: 'An optional list of connected lists.',
  },
  {
    title: 'Deploy',
    description: 'Review, then sign one transaction.',
  },
]

export const formIds = [
  'tcrParamsForm',
  'itemParamsForm',
  'relTCRParamsForm',
  'deployTCRForm',
]

type LightFactoryVisualStep = {
  title: string
  componentStep: number
  groupStep: number
  kind: 'tcr' | 'item' | 'rel' | 'deploy'
  section?: FactorySection
  itemSection?: 'fields' | 'preview'
}

const LIGHT_FACTORY_VISUAL_STEPS: LightFactoryVisualStep[] = [
  {
    title: 'Name',
    componentStep: 1,
    groupStep: 1,
    kind: 'tcr',
    section: 'title',
  },
  {
    title: 'Description',
    componentStep: 1,
    groupStep: 1,
    kind: 'tcr',
    section: 'description',
  },
  {
    title: 'Logo',
    componentStep: 1,
    groupStep: 1,
    kind: 'tcr',
    section: 'logo',
  },
  {
    title: 'Policy',
    componentStep: 1,
    groupStep: 1,
    kind: 'tcr',
    section: 'policy',
  },
  {
    title: 'Deposit',
    componentStep: 1,
    groupStep: 2,
    kind: 'tcr',
    section: 'deposit',
  },
  {
    title: 'Fields',
    componentStep: 2,
    groupStep: 2,
    kind: 'item',
    itemSection: 'fields',
  },
  {
    title: 'Preview',
    componentStep: 2,
    groupStep: 2,
    kind: 'item',
    itemSection: 'preview',
  },
  {
    title: 'Item name',
    componentStep: 1,
    groupStep: 2,
    kind: 'tcr',
    section: 'custom',
  },
  { title: 'Badges', componentStep: 3, groupStep: 3, kind: 'rel' },
  { title: 'Deploy', componentStep: 4, groupStep: 4, kind: 'deploy' },
]

const LAST_STEP = LIGHT_FACTORY_VISUAL_STEPS.length - 1
const ONE_DAY = 24 * 60 * 60 * 1000

/* ---------- Cached wizard state ---------- */

const useCachedFactory = (
  version: string,
  networkId: number | undefined,
): CachedFactory | null => {
  const { account } = useWeb3Context()
  const { address: defaultArbitrator, label: defaultArbLabel } =
    (networkId !== undefined && defaultArbitratorAddresses[networkId]) || {}
  const { address: defaultGovernor, label: defaultGovernorLabel } =
    (networkId !== undefined && defaultGovernorAddresses[networkId]) || {}
  const { data: defaultArbitratorExtraData, label: defaultArbDataLabel } =
    (networkId !== undefined && defaultArbitratorExtraDataObj[networkId]) || {}

  const key = `tcrState@${networkId}@${version}`
  const initialWizardState = {
    tcrTitle: '',
    tcrDescription: '',
    submissionBaseDeposit: 0.05,
    removalBaseDeposit: 0.05,
    submissionChallengeBaseDeposit: 0,
    removalChallengeBaseDeposit: 0.05,
    arbitratorAddress: defaultArbitrator || '',
    governorAddress: account || defaultGovernor || '',
    challengePeriodDuration: 84,
    itemName: 'item',
    itemNamePlural: 'items',
    requireRemovalEvidence: true,
    tcrPrimaryDocument: '',
    tcrLogo: '',
    arbitratorExtraData: defaultArbitratorExtraData,
    sharedStakeMultiplier: 100,
    winnerStakeMultiplier: 100,
    loserStakeMultiplier: 200,
    isTCRofTCRs: false,
    relSubmissionBaseDeposit: 1,
    relRemovalBaseDeposit: 1,
    relSubmissionChallengeBaseDeposit: 0,
    relRemovalChallengeBaseDeposit: 1,
    relArbitratorAddress: defaultArbitrator || '',
    relArbitratorExtraData: defaultArbitratorExtraData,
    relGovernorAddress: account || defaultGovernor || '',
    relChallengePeriodDuration: 84,
    relItemName: 'list',
    relItemNamePlural: 'lists',
    relRequireRemovalEvidence: true,
    relTcrPrimaryDocument: '',
    relSharedStakeMultiplier: 100,
    relWinnerStakeMultiplier: 100,
    relLoserStakeMultiplier: 200,
    columns: [
      {
        label: '',
        description: '',
        type: ItemTypes.ADDRESS,
        isIdentifier: true,
      },
    ],
    relColumns: [
      {
        label: 'Address',
        description: 'The Badges list address',
        type: ItemTypes.GTCR_ADDRESS,
        isIdentifier: true,
      },
      {
        label: 'Match File URI',
        description:
          'The URI to the JSON file for matching columns for each list.',
        type: ItemTypes.TEXT,
      },
    ],
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
  // This runs during render (before commit), so tcrState is immediately
  // correct for the new chain — no stale renders.
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

  const STEP_COUNT = 4
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
  }
}

/* ---------- Layout ---------- */

const Hero = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
`

const HeroCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
`

const ActionBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;

  @media (max-width: 720px) {
    position: sticky;
    bottom: 0;
    z-index: 2;
    margin: 0 calc(-1 * var(--horizontal-padding));
    padding: 12px var(--horizontal-padding)
      calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
  }
`

const DeploymentList = styled(Surface)`
  overflow: hidden;
`

const RowCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

/* ---------- Previous deployments ---------- */

const DeploymentRow = ({
  address,
  chainId,
}: {
  address: string
  chainId: number
}) => {
  const { data, isLoading } = useQuery({
    queryKey: ['factoryDeployment', chainId, address.toLowerCase()],
    queryFn: async () => {
      const found = await fetchMetaEvidence(address, chainId)
      if (!found) return null
      const response = await fetch(parseIpfs(found.metaEvidenceURI))
      return (await response.json()) as MetaEvidence
    },
    staleTime: ONE_DAY,
  })
  const title = data?.metadata?.tcrTitle ?? data?.title

  return (
    <ListRow to={`/tcr/${chainId}/${address}`}>
      <RowCopy>
        {isLoading ? (
          <SkeletonBlock $height="18px" $width="40%" />
        ) : (
          <Title>{title || 'Untitled list'}</Title>
        )}
        <Data $muted title={address}>
          {truncateMiddle(address, 10, 8)}
        </Data>
      </RowCopy>
      <CurateIcon
        name="chevron-down"
        size={16}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden
      />
    </ListRow>
  )
}

/** The parent list address from a deploy receipt: the second NewGTCR event. */
const deployedAddressFromLogs = (
  logs: ethers.providers.Log[],
  factoryInterface: ethers.utils.Interface,
): string | undefined => {
  const addresses: string[] = []
  for (const log of logs)
    try {
      const parsed = factoryInterface.parseLog(log)
      if (parsed.name === 'NewGTCR' && typeof parsed.args._address === 'string')
        addresses.push(parsed.args._address)
    } catch {
      // Not a factory event.
    }

  return addresses[1] ?? addresses[0]
}

/* ---------- Page ---------- */

const FactoryPage = () => {
  const urlChainId = useUrlChainId()
  const navigate = useNavigate()
  const { library, active } = useWeb3Context()
  const factoryChainId = urlChainId ?? undefined
  const cachedFactory = useCachedFactory(version, factoryChainId)
  const [previousDeployments, setPreviousDeployments] = useState<string[]>([])
  const [confirmingReset, setConfirmingReset] = useState(false)
  const tcrState = cachedFactory?.tcrState
  const setTcrState = cachedFactory?.setTcrState
  const resetTcrState = cachedFactory?.resetTcrState
  const [visualStepIndex, setVisualStepIndex] = useState(0)

  const transactions = tcrState?.transactions
  const currentVisualStep = LIGHT_FACTORY_VISUAL_STEPS[visualStepIndex]
  const chainName = factoryChainId
    ? (NETWORKS_INFO[factoryChainId as keyof typeof NETWORKS_INFO]?.name ??
      `chain ${factoryChainId}`)
    : undefined
  const supportedChain =
    factoryChainId !== undefined && !!defaultArbitratorAddresses[factoryChainId]

  useDocumentHead(
    'Create a list | Kleros Curate',
    'Create a Standard Kleros Curate list: name it, set the deposits and the court, define the item fields and deploy it with one transaction.',
  )

  const factoryInterface = useMemo(
    () => new ethers.utils.Interface(_GTCRFactory),
    [],
  )

  const goToVisualStep = useCallback((nextIndex: number) => {
    setVisualStepIndex(Math.max(0, Math.min(LAST_STEP, nextIndex)))
    setConfirmingReset(false)
  }, [])

  const startOver = useCallback(() => {
    resetTcrState?.()
    setVisualStepIndex(0)
    setConfirmingReset(false)
  }, [resetTcrState])

  useEffect(() => {
    if (!setTcrState || !currentVisualStep) return
    setTcrState((prev) =>
      prev.currStep === currentVisualStep.componentStep
        ? prev
        : { ...prev, currStep: currentVisualStep.componentStep },
    )
  }, [currentVisualStep, setTcrState])

  // Fetch previously deployed list information
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!cachedFactory) return
      if (!transactions || Object.keys(transactions).length === 0) return

      const deployments = Object.values(transactions).filter(
        (tx) =>
          !tx.isConnectedTCR &&
          (tx.networkId === undefined || tx.networkId === factoryChainId),
      )

      const addresses = await Promise.all(
        deployments.map(async (tx) => {
          if (tx.contractAddress) return tx.contractAddress
          if (!library || !active) return undefined
          try {
            const receipt = await library.waitForTransaction(tx.txHash)
            return deployedAddressFromLogs(receipt.logs, factoryInterface)
          } catch (err) {
            console.warn('Could not read a previous deployment', err)
            return undefined
          }
        }),
      )
      if (!cancelled)
        setPreviousDeployments(
          addresses.filter((address): address is string => !!address),
        )
    })()
    return () => {
      cancelled = true
    }
  }, [
    active,
    cachedFactory,
    factoryInterface,
    library,
    factoryChainId,
    transactions,
  ])

  const header = (
    <Hero>
      <HeroCopy>
        <Row $gap={8} $wrap>
          <Label>Launch a list</Label>
          {factoryChainId !== undefined && (
            <ChainChip chainId={factoryChainId} />
          )}
        </Row>
        <Statement>Create a Standard list.</Statement>
        <Body $muted $large>
          Describe the list, set the deposits and the item fields, then deploy
          it with one transaction. Your progress is saved in this browser.
        </Body>
      </HeroCopy>
      <SegmentedControl
        ariaLabel="List type"
        value="light"
        options={[
          { value: 'light', label: 'Standard' },
          { value: 'permanent', label: 'Stake' },
        ]}
        onChange={(value) => {
          if (value === 'permanent')
            navigate(`/factory-permanent/${factoryChainId ?? ''}`)
        }}
      />
    </Hero>
  )

  if (!cachedFactory || !cachedFactory.tcrState.arbitratorAddress)
    return (
      <Page>
        {header}
        <Section>
          {factoryChainId !== undefined && !supportedChain ? (
            <Surface $padding="none">
              <EmptyState
                icon="factory"
                title={`Lists cannot be created on ${chainName}`}
                action={null}
              >
                No default arbitrator is configured for this chain. Pick another
                chain from the launch page.
              </EmptyState>
            </Surface>
          ) : (
            <FactoryWizardGrid aria-busy>
              <Stack $gap={12}>
                {[0, 1, 2, 3].map((index) => (
                  <SkeletonBlock key={index} $height="24px" $width="70%" />
                ))}
              </Stack>
              <Surface $padding="standard">
                <Stack $gap={20}>
                  <SkeletonBlock $height="24px" $width="40%" />
                  <SkeletonBlock $height="40px" />
                  <SkeletonBlock $height="40px" />
                </Stack>
              </Surface>
            </FactoryWizardGrid>
          )}
        </Section>
      </Page>
    )

  const currentFormId = formIds[currentVisualStep.componentStep - 1]
  const isLast = visualStepIndex === LAST_STEP

  const renderVisualStep = () => {
    switch (currentVisualStep.kind) {
      case 'tcr':
        return (
          <TCRParams
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={currentFormId}
            factorySection={currentVisualStep.section}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'item':
        return (
          <ItemParams
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={currentFormId}
            section={currentVisualStep.itemSection}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'rel':
        return (
          <RelTCRParams
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={currentFormId}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'deploy':
        return (
          <Deploy
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={currentFormId}
            {...cachedFactory}
          />
        )
      default:
        return null
    }
  }

  return (
    <Page>
      {header}

      <Section $gap="sm">
        <Explainer
          id="factory"
          eyebrow="Before you start"
          heading="What a list needs"
          steps={[
            {
              title: 'A description and a policy',
              body: 'A name, a one-line description, a logo and the listing policy: the PDF jurors and challengers use to judge every item.',
            },
            {
              title: 'Deposits, a court and fields',
              body: 'What a submitter locks while the challenge period runs, which Kleros court rules on disputes, and the fields each item has.',
            },
            {
              title: 'One transaction',
              body: 'Deploying sends two batched calls to the factory and costs gas only. Deposits are paid by submitters later.',
            },
          ]}
        />
      </Section>

      <Section>
        <FactoryWizardGrid>
          <FactoryStepTimeline
            currentStep={currentVisualStep.groupStep}
            steps={LIGHT_FACTORY_STEPS}
            activeSubitem={currentVisualStep.title}
          />
          <Stack $gap={16}>
            <Surface $padding="standard">
              <Stack $gap={16}>
                <Label>
                  Step {visualStepIndex + 1} of{' '}
                  {LIGHT_FACTORY_VISUAL_STEPS.length} ·{' '}
                  {LIGHT_FACTORY_STEPS[currentVisualStep.groupStep - 1].title}
                </Label>
                {renderVisualStep()}
              </Stack>
            </Surface>

            {confirmingReset && (
              <Surface
                $padding="compact"
                $raised
                role="alertdialog"
                aria-label="Start over?"
              >
                <Stack $gap={12}>
                  <Body>
                    Clear every field and go back to the first step? Previous
                    deployments are kept.
                  </Body>
                  <Row $gap={8} $wrap>
                    <Button type="button" $variant="danger" onClick={startOver}>
                      Start over
                    </Button>
                    <Button
                      type="button"
                      $variant="ghost"
                      onClick={() => setConfirmingReset(false)}
                    >
                      Keep editing
                    </Button>
                  </Row>
                </Stack>
              </Surface>
            )}

            <ActionBar>
              <Button
                type="button"
                $variant="ghost"
                onClick={() => setConfirmingReset(true)}
              >
                Start over
              </Button>
              <Row $gap={8}>
                <Button
                  type="button"
                  $variant="secondary"
                  disabled={visualStepIndex === 0}
                  onClick={() => goToVisualStep(visualStepIndex - 1)}
                >
                  Previous
                </Button>
                {!isLast && (
                  <Button type="submit" form={currentFormId} $variant="primary">
                    Next
                  </Button>
                )}
              </Row>
            </ActionBar>
          </Stack>
        </FactoryWizardGrid>
      </Section>

      {previousDeployments.length > 0 && factoryChainId !== undefined && (
        <Section>
          <PanelHeader>
            <div>
              <PanelTitle>Previous deployments</PanelTitle>
              <Small $muted>
                Lists deployed from this browser on {chainName}.
              </Small>
            </div>
          </PanelHeader>
          <DeploymentList $padding="none">
            {previousDeployments.map((contractAddress) => (
              <DeploymentRow
                key={contractAddress}
                address={contractAddress}
                chainId={factoryChainId}
              />
            ))}
          </DeploymentList>
        </Section>
      )}
    </Page>
  )
}

export default FactoryPage
