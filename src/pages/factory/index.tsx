import React, { useState, useEffect, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Button, Card, Modal } from 'components/ui'
import { useDebounce } from 'use-debounce'
import { useWeb3Context } from 'hooks/use-web3-context'
import useUrlChainId from 'hooks/use-url-chain-id'
import { ethers } from 'ethers'
import _GTCRFactory from 'assets/abis/LightGTCRFactory.json'
import TCRParams, { FactorySection } from './tcr-params'
import ItemParams from './item-params'
import Deploy from './deploy'
import StyledLayoutContent from '../layout-content'
import { version } from '../../../package.json'
import { ItemTypes } from '@kleros/gtcr-encoder'
import RelTCRParams from './rel-tcr-params'
import TCRCardContent from 'components/tcr-card-content'
import {
  defaultArbitrator as defaultArbitratorAddresses,
  defaultArbitratorExtraData as defaultArbitratorExtraDataObj,
  defaultGovernor as defaultGovernorAddresses,
} from 'config/tcr-addresses'
import { CurateIcon } from 'components/curate/icons'
import {
  FactoryActionGroup,
  FactoryActions,
  FactoryCreateLabel,
  FactoryDeploymentGrid,
  FactoryDeploymentsCard,
  FactoryDeploymentsHeader,
  FactoryHeroImage,
  FactoryPageShell,
  FactoryStepTimeline,
  FactoryWizardGrid,
  FactoryWorkArea,
} from 'components/curate/v2-factory-shell'

const { confirm } = Modal

export const LIGHT_FACTORY_STEPS = [
  {
    title: 'List',
    description: '',
    subitems: ['Name', 'Description', 'Logo', 'Policy'],
  },
  {
    title: 'Item',
    description: '',
    subitems: ['Deposit', 'Fields', 'Preview', 'Custom'],
  },
  {
    title: 'Advanced',
    description: 'Badges, governor, and court.',
  },
  {
    title: 'Deploy',
    description: 'Review the generated transactions and publish the list.',
  },
]

export const StyledButtonGroup = styled(Button.Group)`
  &.ui-btn-group {
    margin-left: 12px;
  }
`

export const StyledStepper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
`
export const StyledContainer = styled.div`
  margin: 32px 0;
  word-break: break-word;
`

export const StyledBanner = styled.div`
  width: calc(100% - var(--horizontal-padding) * 2);
  max-width: 1440px;
  margin: 24px auto 0;
  padding: clamp(24px, 4vw, 42px);
  background: var(--v2-card);
  border: 1px solid var(--v2-stroke);
  border-top: 5px solid var(--v2-purple);
  border-radius: 3px;
  box-shadow: var(--v2-shadow);
  color: var(--v2-text);
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease,
    color 0.3s ease;
  position: relative;
  overflow: hidden;

  &::before {
    content: none;
  }
`

export const StyledGrid = styled.div`
  display: grid;
  margin: 24px 0;
  grid-gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
`

export const StyledTitle = styled.h1`
  position: relative;
  margin: 0;
  max-width: 900px;
  font-size: clamp(30px, 4.8vw, 48px);
  line-height: 1.12;
  font-weight: 600;
  color: var(--v2-text);
`

export const StyledSubtitle = styled.h3`
  margin-bottom: 16px;
  font-size: var(--font-size-section-title);
  font-weight: 600;
  color: var(--v2-muted);
`

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
  { title: 'Fields', componentStep: 2, groupStep: 2, kind: 'item' },
  { title: 'Preview', componentStep: 2, groupStep: 2, kind: 'item' },
  {
    title: 'Custom',
    componentStep: 1,
    groupStep: 2,
    kind: 'tcr',
    section: 'custom',
  },
  { title: 'Advanced', componentStep: 3, groupStep: 3, kind: 'rel' },
  { title: 'Deploy', componentStep: 4, groupStep: 4, kind: 'deploy' },
]

export const CurrentStep = (props: Record<string, unknown>) => (
  <>
    {(() => {
      const {
        tcrState: { currStep },
      } = props
      switch (currStep) {
        case 1:
          return <TCRParams formId={formIds[currStep]} {...props} />
        case 2:
          return <ItemParams formId={formIds[currStep]} {...props} />
        case 3:
          return <RelTCRParams formId={formIds[currStep]} {...props} />
        case 4:
          return <Deploy formId={formIds[currStep]} {...props} />
        default:
          throw new Error('Unknown step')
      }
    })()}
  </>
)

const useCachedFactory = (version: string, networkId: number | undefined) => {
  const { account } = useWeb3Context()
  const { address: defaultArbitrator, label: defaultArbLabel } =
    defaultArbitratorAddresses[networkId] || {}
  const { address: defaultGovernor, label: defaultGovernorLabel } =
    defaultGovernorAddresses[networkId] || {}
  const { data: defaultArbitratorExtraData, label: defaultArbDataLabel } =
    defaultArbitratorExtraDataObj[networkId] || {}

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
  const initialState = {
    ...initialWizardState,
    transactions: {},
  }
  let cache = window.localStorage.getItem(key)

  const newInitialState = JSON.parse(JSON.stringify(initialState)) // Deep copy.
  if (cache) {
    const parsed = JSON.parse(cache)
    if (parsed.arbitratorAddress && parsed.chainId === networkId) cache = parsed
    else cache = newInitialState
  } else cache = newInitialState

  // We check for the finished flag to reset the form
  // if the user finished his previous deployment.
  // We only keep the deployment transactions.
  if (cache.finished)
    cache = { ...newInitialState, transactions: cache.transactions }

  const [tcrState, setTcrState] = useState(cache)
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
  const setTxState = (tx) =>
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

const FactoryPage = () => {
  const urlChainId = useUrlChainId()
  const { library, active } = useWeb3Context()
  const factoryChainId = urlChainId ?? undefined
  const cachedFactory = useCachedFactory(version, factoryChainId)
  const [previousDeployments, setPreviousDeployments] = useState([])
  const { tcrState, setTcrState, resetTcrState } = cachedFactory ?? {}
  const [visualStepIndex, setVisualStepIndex] = useState(0)

  const { transactions } = tcrState ?? {}
  const currentVisualStep = LIGHT_FACTORY_VISUAL_STEPS[visualStepIndex]

  const factoryInterface = useMemo(
    () => new ethers.utils.Interface(_GTCRFactory),
    [],
  )

  const showConfirmReset = useCallback(() => {
    confirm({
      title: 'Are you sure?',
      content: 'This will clear all fields and reset the wizard to step 1',
      okText: 'Yes, start over',
      onOk: () => {
        resetTcrState()
        setVisualStepIndex(0)
      },
    })
  }, [resetTcrState])

  const goToVisualStep = useCallback((nextIndex: number) => {
    setVisualStepIndex(
      Math.max(0, Math.min(LIGHT_FACTORY_VISUAL_STEPS.length - 1, nextIndex)),
    )
  }, [])

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
    ;(async () => {
      if (!cachedFactory) return
      if (!transactions || Object.keys(transactions).length === 0) return
      if (!library || !active || !factoryInterface) return

      const deploymentTxHashes = Object.keys(transactions)
        .filter((txHash) => transactions[txHash].networkId === factoryChainId)
        .filter((txHash) => !transactions[txHash].isConnectedTCR)

      const txDatas = await Promise.all(
        deploymentTxHashes.map(async (txHash) =>
          library.waitForTransaction(txHash),
        ),
      )
      setPreviousDeployments(
        txDatas.map(
          (txData) => factoryInterface.parseLog(txData.logs[7]).args._address,
        ),
      )
    })()
  }, [
    active,
    cachedFactory,
    factoryInterface,
    library,
    factoryChainId,
    transactions,
  ])

  if (!cachedFactory || !cachedFactory.tcrState.arbitratorAddress)
    return (
      <>
        <StyledBanner>
          <StyledTitle>Loading factory...</StyledTitle>
        </StyledBanner>
        <StyledLayoutContent>
          <StyledSubtitle>Fetching factory configuration...</StyledSubtitle>
        </StyledLayoutContent>
      </>
    )

  const renderVisualStep = () => {
    switch (currentVisualStep.kind) {
      case 'tcr':
        return (
          <TCRParams
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={formIds[0]}
            factorySection={currentVisualStep.section}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'item':
        return (
          <ItemParams
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={formIds[1]}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'rel':
        return (
          <RelTCRParams
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={formIds[2]}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
            nextStep={() => goToVisualStep(visualStepIndex + 1)}
          />
        )
      case 'deploy':
        return (
          <Deploy
            key={`${factoryChainId}-${visualStepIndex}`}
            formId={formIds[3]}
            {...cachedFactory}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <FactoryHeroImage />
      <FactoryCreateLabel>Create a List</FactoryCreateLabel>
      <StyledLayoutContent>
        <FactoryPageShell>
          <FactoryWizardGrid>
            <FactoryStepTimeline
              currentStep={currentVisualStep.groupStep}
              steps={LIGHT_FACTORY_STEPS}
            />
            <div>
              <FactoryWorkArea>{renderVisualStep()}</FactoryWorkArea>
              <FactoryActions>
                <Button
                  onClick={showConfirmReset}
                  icon={<CurateIcon name="remove" size={16} />}
                >
                  Reset
                </Button>
                <FactoryActionGroup>
                  <Button
                    onClick={() => goToVisualStep(visualStepIndex - 1)}
                    type="primary"
                    disabled={visualStepIndex === 0}
                  >
                    <CurateIcon
                      name="chevron-down"
                      size={16}
                      style={{ transform: 'rotate(90deg)' }}
                    />
                    Previous
                  </Button>
                  <Button
                    onClick={() => goToVisualStep(visualStepIndex + 1)}
                    type="primary"
                    disabled={
                      visualStepIndex === LIGHT_FACTORY_VISUAL_STEPS.length - 1
                    }
                  >
                    Next
                    <CurateIcon
                      name="chevron-down"
                      size={16}
                      style={{ transform: 'rotate(-90deg)' }}
                    />
                  </Button>
                </FactoryActionGroup>
              </FactoryActions>
            </div>
          </FactoryWizardGrid>
        </FactoryPageShell>
        {previousDeployments.length > 0 && (
          <FactoryDeploymentsCard>
            <FactoryDeploymentsHeader>
              <div>
                <h2>Previous deployments</h2>
                <span>Lists deployed from this browser and network.</span>
              </div>
            </FactoryDeploymentsHeader>
            <FactoryDeploymentGrid>
              {previousDeployments.map((contractAddress, i) => (
                <Card key={i}>
                  <TCRCardContent
                    tcrAddress={contractAddress}
                    hideDetailsButton
                  />
                </Card>
              ))}
            </FactoryDeploymentGrid>
          </FactoryDeploymentsCard>
        )}
      </StyledLayoutContent>
    </>
  )
}
export default FactoryPage
