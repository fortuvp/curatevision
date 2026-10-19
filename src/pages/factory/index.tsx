import React, {
  useState,
  useEffect,
  useCallback,
  useId,
  useMemo,
  useRef,
} from 'react'
import styled, { css } from 'styled-components'
import { Link, useNavigate } from 'react-router-dom'
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
import useNativeCurrency from 'hooks/native-currency'
import { CurateIcon } from 'components/curate/icons'
import { Explainer } from 'components/curate/explainer'
import { reveal } from 'components/curate/motion/reveal'
import {
  Button,
  ChainChip,
  Chip,
  Data,
  EmptyState,
  Label,
  Page,
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
import {
  FactoryActionGroup,
  FactoryActions,
  FactoryAside,
  FactorySplit,
  FactoryStepTimeline,
  FactoryWizardGrid,
} from 'components/curate/v2-factory-shell'
import TCRParams from './tcr-params'
import ItemParams from './item-params'
import RelTCRParams from './rel-tcr-params'
import Deploy from './deploy'
import { LivePreview } from './preview'
import { SafeImage } from './fields'
import type { FactorySection } from './schemas'

/*
 * /factory/:chainId, the Standard (Light Curate) list wizard: the page's
 * statement, one explainer, a horizontal stepper, the current step in one
 * panel with its action bar (Next submits the step's form, so its schema
 * runs) beside a live preview of what each side will pay, then the lists
 * deployed from this browser. The wizard state is cached per chain and app
 * version in localStorage, as before.
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
    description: 'Name, logo and policy',
    subitems: ['Name', 'Description', 'Logo', 'Policy'],
  },
  {
    title: 'Item',
    description: 'Deposit, fields, item name',
    subitems: ['Deposit', 'Fields', 'Preview', 'Item name'],
  },
  {
    title: 'Badges',
    description: 'Optional',
  },
  {
    title: 'Deploy',
    description: 'One signature',
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

const Head = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px 32px;

  > * {
    ${reveal}
  }
`

const HeadCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
`

const Lede = styled.p`
  margin: 0;
  max-width: 54ch;
  color: var(--color-muted);
  font-size: 16px;
  line-height: 24px;
`

const Lift = styled.div`
  ${reveal}
`

/** The panel column: it fills the row so the panel can stretch. */
const PanelLift = styled(Lift)`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const StepPanel = styled(Surface)`
  display: flex;
  flex: 1 0 auto;
  flex-direction: column;
  padding: 28px 32px 24px;
  scroll-margin-top: calc(var(--app-bar-height) + 24px);

  @media (max-width: 720px) {
    padding: 20px;
  }
`

/** The step's form; it takes the free height so the action bar sits low. */
const StepContent = styled.div`
  flex: 1 0 auto;
  min-width: 0;
`

const PanelTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px 20px;
  margin-bottom: 22px;
`

const SubTabs = styled.ol`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const SubTab = styled.button<{ $state: 'done' | 'current' | 'next' }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 11px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-faint);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background var(--motion),
    border-color var(--motion),
    color var(--motion);

  ${({ $state }) =>
    $state === 'current'
      ? css`
          border-color: color-mix(
            in srgb,
            var(--color-primary) 35%,
            transparent
          );
          background: var(--color-primary-soft);
          color: var(--color-text);
        `
      : $state === 'done'
        ? css`
            color: var(--color-muted);
            cursor: pointer;

            svg {
              color: var(--color-primary);
            }

            &:hover {
              background: var(--color-raised);
              color: var(--color-text);
            }
          `
        : css`
            cursor: default;
          `}
`

const ConfirmRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
`

const SectionHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin: 72px 0 18px;

  h2 {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 0;
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: 30px;
    line-height: 34px;
    font-weight: 500;
    letter-spacing: -0.03em;
  }

  @media (max-width: 720px) {
    margin-top: 48px;
  }
`

const DeploymentRows = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const DeploymentLink = styled(Link)`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  min-height: 64px;
  padding: 12px 16px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  color: inherit;
  text-decoration: none;
  transition:
    border-color var(--motion),
    translate var(--motion),
    box-shadow var(--motion);
  ${reveal}

  /* translate, not transform: the entrance animation owns transform. */
  &:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-card-hover);
    translate: 0 -1px;
  }

  @media (prefers-reduced-motion: reduce) {
    &:hover {
      translate: none;
    }
  }

  &:hover strong {
    color: var(--color-primary);
  }

  strong {
    display: block;
    overflow: hidden;
    color: var(--color-text);
    font-size: var(--fs-body-lg);
    line-height: var(--lh-body-lg);
    font-weight: 500;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color var(--motion);
  }
`

const DeploymentLogo = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: var(--color-raised);
  color: var(--color-faint);

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`

const OpenHint = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  font-weight: 500;
`

/* ---------- Previous deployments ---------- */

const DeploymentRow = ({
  address,
  chainId,
  index,
}: {
  address: string
  chainId: number
  index: number
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
  const logoURI = data?.metadata?.logoURI
  const logo = logoURI ? parseIpfs(logoURI) : undefined

  return (
    <DeploymentLink
      to={`/tcr/${chainId}/${address}`}
      style={{ ['--i' as string]: Math.min(index, 8) }}
    >
      <DeploymentLogo aria-hidden>
        <SafeImage
          src={logo}
          alt=""
          fallback={<CurateIcon name="registry" size={16} />}
        />
      </DeploymentLogo>
      <span style={{ minWidth: 0 }}>
        {isLoading ? (
          <SkeletonBlock $height="18px" $width="40%" />
        ) : (
          <strong>{title || 'Untitled list'}</strong>
        )}
        <Data $muted $weight={400} title={address}>
          {truncateMiddle(address, 10, 8)}
        </Data>
      </span>
      <OpenHint>
        Open
        <CurateIcon
          name="chevron-down"
          size={14}
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden
        />
      </OpenHint>
    </DeploymentLink>
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
  const nativeCurrency = useNativeCurrency()
  const factoryChainId = urlChainId ?? undefined
  const cachedFactory = useCachedFactory(version, factoryChainId)
  const [previousDeployments, setPreviousDeployments] = useState<string[]>([])
  const [confirmingReset, setConfirmingReset] = useState(false)
  const tcrState = cachedFactory?.tcrState
  const setTcrState = cachedFactory?.setTcrState
  const resetTcrState = cachedFactory?.resetTcrState
  const [visualStepIndex, setVisualStepIndex] = useState(0)
  // Bumped by Start over so the open step remounts with the cleared values.
  const [resets, setResets] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)
  const firstStep = useRef(true)
  const resetTriggerRef = useRef<HTMLButtonElement>(null)
  const keepEditingRef = useRef<HTMLButtonElement>(null)
  // Set when the confirmation closes from its own buttons: focus goes back
  // to the trigger, which remounts in place of the confirmation.
  const returnFocus = useRef(false)
  const confirmQuestionId = useId()

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

  /** A completed group in the stepper opens at its first sub-step. */
  const goToGroup = useCallback(
    (groupStep: number) =>
      goToVisualStep(
        LIGHT_FACTORY_VISUAL_STEPS.findIndex(
          (step) => step.groupStep === groupStep,
        ),
      ),
    [goToVisualStep],
  )

  const startOver = useCallback(() => {
    resetTcrState?.()
    setVisualStepIndex(0)
    setResets((count) => count + 1)
    returnFocus.current = true
    setConfirmingReset(false)
  }, [resetTcrState])

  const keepEditing = useCallback(() => {
    returnFocus.current = true
    setConfirmingReset(false)
  }, [])

  // The confirmation replaces the action bar: move focus into it, and back
  // to the trigger when it closes, so keyboard users keep their place.
  useEffect(() => {
    if (confirmingReset) {
      keepEditingRef.current?.focus()
      return
    }
    if (!returnFocus.current) return
    returnFocus.current = false
    resetTriggerRef.current?.focus()
  }, [confirmingReset])

  // A new step starts at its top: bring the panel back if it scrolled away.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false
      return
    }
    const panel = panelRef.current
    // 72px: below the floating app bar.
    if (!panel || panel.getBoundingClientRect().top >= 72) return
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }, [visualStepIndex])

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
    <>
      <Head>
        <HeadCopy style={{ ['--i' as string]: 0 }}>
          <Row $gap={10} $wrap>
            <Label $tone="faint">Launch a list</Label>
            {factoryChainId !== undefined && (
              <ChainChip chainId={factoryChainId} size="sm" />
            )}
          </Row>
          <Statement>Create a Standard list.</Statement>
          <Lede>
            Four steps and one signature; the draft is saved in this browser as
            you type.
          </Lede>
        </HeadCopy>
        <div style={{ ['--i' as string]: 1 }}>
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
        </div>
      </Head>
      <Section $gap="sm">
        <Lift style={{ ['--i' as string]: 2 }}>
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
        </Lift>
      </Section>
    </>
  )

  if (!cachedFactory || !cachedFactory.tcrState.arbitratorAddress)
    return (
      <Page>
        {header}
        <Section $gap="lg">
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
              <Row $gap={16} $justify="space-between">
                {[0, 1, 2, 3].map((index) => (
                  <SkeletonBlock
                    key={index}
                    $height="36px"
                    $width="36px"
                    style={{ borderRadius: '50%' }}
                  />
                ))}
              </Row>
              <FactorySplit>
                <Surface $padding="standard">
                  <Stack $gap={20}>
                    <SkeletonBlock $height="28px" $width="40%" />
                    <SkeletonBlock $height="44px" />
                    <SkeletonBlock $height="44px" />
                  </Stack>
                </Surface>
                <SkeletonBlock $height="420px" />
              </FactorySplit>
            </FactoryWizardGrid>
          )}
        </Section>
      </Page>
    )

  const currentFormId = formIds[currentVisualStep.componentStep - 1]
  const isLast = visualStepIndex === LAST_STEP
  const group = LIGHT_FACTORY_STEPS[currentVisualStep.groupStep - 1]
  const groupSteps = LIGHT_FACTORY_VISUAL_STEPS.map((step, index) => ({
    ...step,
    index,
  })).filter((step) => step.groupStep === currentVisualStep.groupStep)
  const nextStep = LIGHT_FACTORY_VISUAL_STEPS[visualStepIndex + 1]
  const previewSubject =
    currentVisualStep.kind === 'rel' && tcrState?.relTcrDisabled === false
      ? 'badges'
      : 'list'

  const renderVisualStep = () => {
    switch (currentVisualStep.kind) {
      case 'tcr':
        return (
          <TCRParams
            key={`${factoryChainId}-${visualStepIndex}-${resets}`}
            formId={currentFormId}
            factorySection={currentVisualStep.section}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'item':
        return (
          <ItemParams
            key={`${factoryChainId}-${visualStepIndex}-${resets}`}
            formId={currentFormId}
            section={currentVisualStep.itemSection}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'rel':
        return (
          <RelTCRParams
            key={`${factoryChainId}-${visualStepIndex}-${resets}`}
            formId={currentFormId}
            postSubmit={() => goToVisualStep(visualStepIndex + 1)}
            {...cachedFactory}
          />
        )
      case 'deploy':
        return (
          <Deploy
            key={`${factoryChainId}-${visualStepIndex}-${resets}`}
            formId={currentFormId}
            onEditStep={(title) =>
              goToVisualStep(
                LIGHT_FACTORY_VISUAL_STEPS.findIndex(
                  (step) => step.title === title,
                ),
              )
            }
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

      <Section $gap="lg">
        <FactoryWizardGrid>
          <Lift style={{ ['--i' as string]: 3 }}>
            <FactoryStepTimeline
              currentStep={currentVisualStep.groupStep}
              steps={LIGHT_FACTORY_STEPS}
              activeSubitem={currentVisualStep.title}
              onSelectStep={goToGroup}
            />
          </Lift>
          <FactorySplit>
            <PanelLift style={{ ['--i' as string]: 4 }}>
              <StepPanel $padding="none" ref={panelRef}>
                <PanelTop>
                  <Label $tone="primary">
                    {groupSteps.length > 1
                      ? group.title
                      : `${group.title} · ${group.description}`}
                  </Label>
                  {groupSteps.length > 1 && (
                    <SubTabs aria-label={`${group.title} steps`}>
                      {groupSteps.map((step) => {
                        const state =
                          step.index < visualStepIndex
                            ? 'done'
                            : step.index === visualStepIndex
                              ? 'current'
                              : 'next'
                        return (
                          <li key={step.title}>
                            <SubTab
                              type="button"
                              $state={state}
                              disabled={state !== 'done'}
                              aria-current={
                                state === 'current' ? 'step' : undefined
                              }
                              onClick={() => goToVisualStep(step.index)}
                            >
                              {state === 'done' && (
                                <CurateIcon name="check" size={12} />
                              )}
                              {step.title}
                            </SubTab>
                          </li>
                        )
                      })}
                    </SubTabs>
                  )}
                </PanelTop>

                <StepContent>{renderVisualStep()}</StepContent>

                <FactoryActions $inPanel>
                  {confirmingReset ? (
                    <ConfirmRow
                      role="alertdialog"
                      aria-label="Start over?"
                      aria-describedby={confirmQuestionId}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') keepEditing()
                      }}
                    >
                      <Small $muted id={confirmQuestionId}>
                        Clear every field and return to the first step? Previous
                        deployments are kept.
                      </Small>
                      <Row $gap={8} $wrap>
                        <Button
                          ref={keepEditingRef}
                          type="button"
                          $variant="ghost"
                          $size="sm"
                          onClick={keepEditing}
                        >
                          Keep editing
                        </Button>
                        <Button
                          type="button"
                          $variant="danger"
                          $size="sm"
                          onClick={startOver}
                        >
                          Start over
                        </Button>
                      </Row>
                    </ConfirmRow>
                  ) : (
                    <>
                      <Button
                        ref={resetTriggerRef}
                        type="button"
                        $variant="ghost"
                        $size="sm"
                        onClick={() => setConfirmingReset(true)}
                      >
                        Start over
                      </Button>
                      <FactoryActionGroup>
                        <Button
                          type="button"
                          $variant="secondary"
                          disabled={visualStepIndex === 0}
                          onClick={() => goToVisualStep(visualStepIndex - 1)}
                        >
                          Previous
                        </Button>
                        {!isLast && (
                          <Button
                            type="submit"
                            form={currentFormId}
                            $variant="primary"
                            title={
                              nextStep ? `Next: ${nextStep.title}` : undefined
                            }
                          >
                            Next
                            <CurateIcon name="submit" size={14} />
                          </Button>
                        )}
                      </FactoryActionGroup>
                    </>
                  )}
                </FactoryActions>
              </StepPanel>
            </PanelLift>
            <FactoryAside aria-label="Preview">
              <Lift style={{ ['--i' as string]: 5 }}>
                {tcrState && factoryChainId !== undefined && (
                  <LivePreview
                    tcrState={tcrState}
                    subject={previewSubject}
                    chainId={factoryChainId}
                    currency={nativeCurrency}
                  />
                )}
              </Lift>
            </FactoryAside>
          </FactorySplit>
        </FactoryWizardGrid>
      </Section>

      {previousDeployments.length > 0 && factoryChainId !== undefined && (
        <section aria-label="Previous deployments">
          <SectionHead>
            <h2>
              Your deployments
              <Chip>{previousDeployments.length}</Chip>
            </h2>
            <Small $faint>
              Lists deployed from this browser on {chainName}.
            </Small>
          </SectionHead>
          <DeploymentRows>
            {previousDeployments.map((contractAddress, index) => (
              <DeploymentRow
                key={contractAddress}
                address={contractAddress}
                chainId={factoryChainId}
                index={index}
              />
            ))}
          </DeploymentRows>
        </section>
      )}
    </Page>
  )
}

export default FactoryPage
