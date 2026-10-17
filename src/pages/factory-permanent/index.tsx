import React, { useState, useEffect, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { Button, Card, Modal } from 'components/ui'
import { useDebounce } from 'use-debounce'
import { useWeb3Context } from 'hooks/use-web3-context'
import useUrlChainId from 'hooks/use-url-chain-id'
import { ethers } from 'ethers'
import _GTCRFactory from 'assets/abis/PermanentGTCRFactory.json'
import TCRParams from './tcr-params'
import ItemParams from './item-params'
import Deploy from './deploy'
import StyledLayoutContent from '../layout-content'
import { version } from '../../../package.json'
import { ItemTypes } from '@kleros/gtcr-encoder'
import TCRCardContent from 'components/permanent-tcr-card-content'
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
}

export interface StepProps extends CachedFactory {
  formId?: string
  postSubmit: () => void
}

const PERMANENT_FACTORY_STEPS = [
  {
    title: 'List',
    description:
      'Name, description, logo, policy, token, deposits, and timing.',
  },
  {
    title: 'Item',
    description: 'Fields, identifiers, and how submissions are displayed.',
  },
  {
    title: 'Deploy',
    description: 'Review the generated transactions and publish the registry.',
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

export const formIds = ['tcrParamsForm', 'itemParamsForm', 'deployTCRForm']

export const CurrentStep = (
  props: CachedFactory & { postSubmit: () => void },
) => (
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
          return <Deploy formId={formIds[currStep]} {...props} />
        default:
          throw new Error('Unknown step')
      }
    })()}
  </>
)

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

  const key = `pgtcrState@${networkId}@${version}`
  const initialWizardState = {
    tcrTitle: '',
    tcrDescription: '',
    submissionMinDeposit: 0.05,
    arbitratorAddress: defaultArbitrator || '',
    governorAddress: account || defaultGovernor || '',
    tokenAddress: '0xaf204776c7245bF4147c2612BF6e5972Ee483701', // sDAI token address
    submissionPeriodDuration: 84,
    reinclusionPeriodDuration: 12,
    withdrawingPeriodDuration: 84,
    arbitrationParamsCooldown: 168,
    itemName: 'item',
    itemNamePlural: 'items',
    requireRemovalEvidence: true,
    tcrPrimaryDocument: '',
    tcrLogo: '',
    arbitratorExtraData: defaultArbitratorExtraData,
    challengeStakeMultiplier: 50,
    sharedStakeMultiplier: 100,
    winnerStakeMultiplier: 100,
    loserStakeMultiplier: 200,
    columns: [
      {
        label: '',
        description: '',
        type: ItemTypes.ADDRESS,
        isIdentifier: true,
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

  const STEP_COUNT = 3
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

const FactoryPermanentPage = () => {
  const urlChainId = useUrlChainId()
  const { library, active } = useWeb3Context()
  const factoryChainId = urlChainId ?? undefined
  const cachedFactory = useCachedFactory(version, factoryChainId)
  const [previousDeployments, setPreviousDeployments] = useState<string[]>([])
  const tcrState = cachedFactory?.tcrState
  const nextStep = cachedFactory?.nextStep
  const previousStep = cachedFactory?.previousStep
  const STEP_COUNT = cachedFactory?.STEP_COUNT
  const resetTcrState = cachedFactory?.resetTcrState

  const currStep = tcrState?.currStep ?? 1
  const transactions = tcrState?.transactions

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
        resetTcrState?.()
      },
    })
  }, [resetTcrState])

  // Fetch previously deployed list information
  useEffect(() => {
    ;(async () => {
      if (!cachedFactory) return
      if (!transactions || Object.keys(transactions).length === 0) return
      if (!library || !active || !factoryInterface) return

      const deploymentTxHashes = Object.keys(transactions).filter(
        (txHash) => transactions[txHash].networkId === factoryChainId,
      )

      const txDatas = await Promise.all(
        deploymentTxHashes.map(async (txHash) =>
          library.waitForTransaction(txHash),
        ),
      )
      setPreviousDeployments(
        txDatas.map(
          (txData) => factoryInterface.parseLog(txData.logs[1]).args._address,
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

  return (
    <>
      <FactoryHeroImage />
      <FactoryCreateLabel>Create a List</FactoryCreateLabel>
      <StyledLayoutContent>
        <FactoryPageShell>
          <FactoryWizardGrid>
            <FactoryStepTimeline
              currentStep={currStep}
              steps={PERMANENT_FACTORY_STEPS}
            />
            <div>
              <FactoryWorkArea>
                <CurrentStep
                  key={factoryChainId}
                  postSubmit={() => nextStep?.()}
                  {...cachedFactory}
                />
              </FactoryWorkArea>
              <FactoryActions>
                <Button
                  onClick={showConfirmReset}
                  icon={<CurateIcon name="remove" size={16} />}
                >
                  Reset
                </Button>
                <FactoryActionGroup>
                  <Button
                    onClick={() => previousStep?.()}
                    type="primary"
                    disabled={currStep === 1}
                  >
                    <CurateIcon
                      name="chevron-down"
                      size={16}
                      style={{ transform: 'rotate(90deg)' }}
                    />
                    Previous
                  </Button>
                  <Button
                    form={formIds[currStep]}
                    htmlType="submit"
                    type="primary"
                    disabled={currStep === STEP_COUNT}
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
export default FactoryPermanentPage
