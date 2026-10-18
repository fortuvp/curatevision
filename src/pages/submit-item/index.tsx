import React, {
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import type { BigNumber } from 'ethers'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import Loading from 'components/loading'
import ErrorPage from 'pages/error-page'
import useCheckLightCurate from 'hooks/use-check-light-curate'
import useTcrNetwork from 'hooks/use-tcr-network'
import useUrlChainId from 'hooks/use-url-chain-id'
import useArbitrationCost from 'hooks/arbitration-cost'
import useFactory from 'hooks/factory'
import useNativeCurrency from 'hooks/native-currency'
import useNativeBalance from 'hooks/use-native-balance'
import useTokenSymbol from 'hooks/token-symbol'
import { useEthersProvider } from 'hooks/ethers-adapters'
import { TCRViewContext, TCRViewProvider } from 'contexts/tcr-view-context'
import {
  LightTCRViewContext,
  LightTCRViewProvider,
} from 'contexts/light-tcr-view-context'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import { PERMANENT_REGISTRY_QUERY } from 'utils/graphql'
import { parseIpfs } from 'utils/ipfs-parse'
import { formatDurationLong } from 'utils/time'
import type {
  OutcomeStep,
  ReceiptLine,
} from 'components/curate/what-happens-next'
import { SubmitPage, type ConfirmGate } from './submit-page'
import { formatAmount } from './amounts'
import { useWalletGate } from './use-wallet-gate'
import { useDepositSubmit, usePermanentSubmit } from './use-submit-actions'

/*
 * /tcr/:chainId/:tcrAddress/submit. The registry kind decides the data
 * source and the contract call (classic, light or Stake Curate); the page
 * itself is shared. The checks, providers and error states are the ones the
 * previous page had.
 */

const NO_INITIAL_VALUES: unknown[] = []
const NO_DISABLED_FIELDS: boolean[] = []

const useRegistryPath = () => {
  const { chainId, tcrAddress } = useParams<{
    chainId: string
    tcrAddress: string
  }>()
  return `/tcr/${chainId}/${tcrAddress}`
}

/** "Not enough xDAI for the deposit (you have 12.4 xDAI)" or nothing. */
const balanceBlocker = (
  balance: bigint | undefined,
  required: bigint,
  currency: string,
  purpose: string,
  decimals = 18,
): string =>
  balance !== undefined && balance < required
    ? `Not enough ${currency} for the ${purpose} (you have ${formatAmount(
        balance,
        decimals,
      )} ${currency})`
    : ''

/* ---------- Classic and light Curate: one native deposit ---------- */

const DepositSubmitPage = ({
  kind,
  tcrAddress,
  metaEvidence,
  submissionDeposit,
  submissionBaseDeposit,
  arbitrationCost,
  challengePeriodDuration,
}: {
  kind: 'light' | 'classic'
  tcrAddress: string
  metaEvidence?: MetaEvidence
  submissionDeposit?: BigNumber
  submissionBaseDeposit?: BigNumber
  arbitrationCost?: BigNumber
  challengePeriodDuration?: BigNumber
}) => {
  const navigate = useNavigate()
  const registryPath = useRegistryPath()
  const currency = useNativeCurrency()
  const { balance } = useNativeBalance()
  const factoryChecks = useFactory()
  const wallet = useWalletGate()
  const onDone = useCallback(
    () => navigate(registryPath),
    [navigate, registryPath],
  )
  const { submit, phase, submitting } = useDepositSubmit({
    kind,
    tcrAddress,
    submissionDeposit,
    onDone,
  })

  const metadata = metaEvidence?.metadata
  const itemName = metadata?.itemName || 'item'
  const registryTitle =
    metadata?.tcrTitle ?? metadata?.title ?? metaEvidence?.title
  const columns = metadata?.columns
  const policyURI = metaEvidence?.fileURI
  const ready = !!metaEvidence && !!submissionDeposit && !!columns

  const total = submissionDeposit
    ? `${formatAmount(submissionDeposit)} ${currency}`
    : '—'
  const base = submissionBaseDeposit
    ? `${formatAmount(submissionBaseDeposit)} ${currency}`
    : '—'
  const cost = arbitrationCost
    ? `${formatAmount(arbitrationCost)} ${currency}`
    : '—'
  const period = challengePeriodDuration
    ? formatDurationLong(challengePeriodDuration.toNumber())
    : ''

  const receipt: ReceiptLine[] = [
    { label: 'Base deposit', value: base },
    { label: 'Arbitration cost', value: cost },
  ]
  const steps: OutcomeStep[] = [
    {
      title: `You send ${total}`,
      body: `${base} base deposit + ${cost} arbitration cost, in one transaction. This is a deposit, not a fee.`,
    },
    {
      title: period ? `Challenge period: ${period}` : 'Challenge period',
      body: `Your ${itemName} is listed as Submitted while anyone can challenge it against the listing policy.`,
    },
    {
      title: 'Nobody challenges',
      body: `Your ${itemName} is registered and the full ${total} comes back when the request is executed.`,
    },
    {
      title: 'Someone challenges',
      body: 'Kleros jurors decide. If you win, your deposit comes back in full. If you lose, it goes to the challenger minus the arbitration cost.',
      branch: true,
    },
  ]

  const lowBalance = submissionDeposit
    ? balanceBlocker(
        balance,
        BigInt(submissionDeposit.toString()),
        currency,
        'deposit',
      )
    : ''
  const gate: ConfirmGate = wallet.blocker
    ? { blocker: wallet.blocker, fix: wallet.fix }
    : lowBalance
      ? { blocker: lowBalance }
      : {}

  return (
    <SubmitPage
      registryPath={registryPath}
      registryTitle={registryTitle}
      itemName={itemName}
      lede={`One transaction sends the deposit. Your ${itemName} is then listed as Submitted and anyone can challenge it during the challenge period; if nobody does, the deposit comes back in full.`}
      columns={columns}
      initialValues={NO_INITIAL_VALUES}
      disabledFields={NO_DISABLED_FIELDS}
      policyURI={policyURI}
      receipt={receipt}
      total={total}
      steps={steps}
      ready={ready}
      gate={gate}
      phase={phase}
      submitting={submitting}
      factoryChecks={factoryChecks}
      onSubmit={submit}
    />
  )
}

const ClassicSubmitPage = () => {
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const tcrViewContext = useContext(TCRViewContext)
  const tcrError = tcrViewContext?.tcrError

  if (typeof tcrError === 'string')
    return <ErrorPage code="400" message={tcrError} />
  if (!tcrAddress) return <Loading />

  return (
    <DepositSubmitPage
      kind="classic"
      tcrAddress={tcrAddress}
      metaEvidence={tcrViewContext?.metaEvidence}
      submissionDeposit={tcrViewContext?.submissionDeposit}
      submissionBaseDeposit={tcrViewContext?.submissionBaseDeposit}
      arbitrationCost={tcrViewContext?.arbitrationCost}
      challengePeriodDuration={tcrViewContext?.challengePeriodDuration}
    />
  )
}

const LightSubmitPage = () => {
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const tcrViewContext = useContext(LightTCRViewContext)
  const tcrError = tcrViewContext?.tcrError

  if (typeof tcrError === 'string')
    return <ErrorPage code="400" message={tcrError} />
  if (!tcrAddress) return <Loading />

  return (
    <DepositSubmitPage
      kind="light"
      tcrAddress={tcrAddress}
      metaEvidence={tcrViewContext?.metaEvidence}
      submissionDeposit={tcrViewContext?.submissionDeposit}
      submissionBaseDeposit={tcrViewContext?.submissionBaseDeposit}
      arbitrationCost={tcrViewContext?.arbitrationCost}
      challengePeriodDuration={tcrViewContext?.challengePeriodDuration}
    />
  )
}

/* ---------- Stake Curate: token stake plus native arbitration cost ---------- */

const PermanentSubmitPage = () => {
  const navigate = useNavigate()
  const registryPath = useRegistryPath()
  const chainId = useUrlChainId()
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const { graphqlBatcher } = useGraphqlBatcher()
  const library = useEthersProvider({
    chainId: chainId ? Number(chainId) : undefined,
  })
  const [columns, setColumns] = useState<Column[]>()
  const [columnsError, setColumnsError] = useState<string>()

  const registryQuery = useQuery({
    queryKey: ['permanentRegistrySubmit', tcrAddress, chainId],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: PERMANENT_REGISTRY_QUERY,
        variables: { lowerCaseTCRAddress: tcrAddress!.toLowerCase() },
        chainId: chainId!,
        isPermanent: true,
      }),
    enabled: !!chainId && !!tcrAddress,
  })

  const registry = registryQuery.data?.registry as SubgraphRegistry | undefined
  const arbitrationSettings = registry?.arbitrationSettings?.[0]
  const metadata = arbitrationSettings?.metadata
  const metaEvidenceURI = arbitrationSettings?.metaEvidenceURI

  useEffect(() => {
    let cancelled = false
    setColumns(undefined)
    setColumnsError(undefined)

    if (!metaEvidenceURI) return undefined
    ;(async () => {
      try {
        const response = await fetch(parseIpfs(metaEvidenceURI))
        const file = await response.json()
        if (!cancelled) setColumns(file?.metadata?.columns || [])
      } catch (err) {
        console.error('Error loading permanent registry meta evidence:', err)
        if (!cancelled)
          setColumnsError('Could not load this registry submission fields.')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [metaEvidenceURI])

  const { arbitrationCost } = useArbitrationCost({
    address: registry?.arbitrator?.id || '',
    arbitratorExtraData: arbitrationSettings?.arbitratorExtraData || '',
    library,
  })

  const nativeCurrency = useNativeCurrency()
  const factoryChecks = useFactory()
  const wallet = useWalletGate()
  const {
    symbol,
    decimals,
    loading: tokenLoading,
  } = useTokenSymbol(registry?.token)
  const onDone = useCallback(
    () => navigate(registryPath),
    [navigate, registryPath],
  )
  const stakeCurate = usePermanentSubmit({
    tcrAddress: tcrAddress ?? '',
    tokenAddress: registry?.token,
    submissionDeposit: registry?.submissionMinDeposit,
    arbitrationCost,
    onDone,
  })

  if (registryQuery.isLoading || !registryQuery.data) return <Loading />
  if (!registry)
    return (
      <ErrorPage
        code="Error"
        title="Registry Not Found"
        message="This permanent registry could not be found on the configured PGTCR subgraph."
      />
    )
  if (columnsError)
    return (
      <ErrorPage
        code="Error"
        title="Metadata unavailable"
        message={columnsError}
      />
    )

  const itemName = metadata?.itemName || 'item'
  const stakeWei =
    registry.submissionMinDeposit === undefined
      ? undefined
      : BigInt(registry.submissionMinDeposit.toString())
  const costWei = arbitrationCost
    ? BigInt(arbitrationCost.toString())
    : undefined
  const stake =
    stakeWei === undefined
      ? '—'
      : `${formatAmount(stakeWei, decimals)} ${symbol}`
  const cost =
    costWei === undefined ? '—' : `${formatAmount(costWei)} ${nativeCurrency}`
  const total = `${stake} + ${cost}`
  const submissionPeriod = registry.submissionPeriod
    ? formatDurationLong(Number(registry.submissionPeriod))
    : ''
  const withdrawingPeriod = registry.withdrawingPeriod
    ? formatDurationLong(Number(registry.withdrawingPeriod))
    : ''
  // The symbol and decimals must be known before any amount is printed.
  const ready =
    !!metadata && !!columns && !!arbitrationCost && !tokenLoading

  const receipt: ReceiptLine[] = [
    { label: 'Stake, locked while listed', value: stake },
    { label: 'Arbitration cost', value: cost },
  ]
  const steps: OutcomeStep[] = [
    {
      title: `You stake ${stake} and send ${cost}`,
      body: `The stake stays locked while your ${itemName} is listed. The arbitration cost is a deposit held for a possible dispute.`,
    },
    {
      title: submissionPeriod
        ? `Submission period: ${submissionPeriod}`
        : 'Submission period',
      body: `Your ${itemName} is listed as Pending during this window and counts as accepted after it. It can be challenged at any time while it is listed, including while withdrawing.`,
    },
    {
      title: 'While nobody challenges',
      body: `Your ${itemName} stays listed with its stake locked. You can withdraw it later${
        withdrawingPeriod ? `; withdrawing takes ${withdrawingPeriod}` : ''
      }.`,
    },
    {
      title: 'Someone challenges',
      body: `Kleros jurors decide. If you win, your ${itemName} is reincluded and its stake grows by the challenger's stake. If you lose, the challenger takes your stake and the arbitration deposit.`,
      branch: true,
    },
  ]

  const lowStake =
    stakeWei === undefined
      ? ''
      : balanceBlocker(stakeCurate.balance, stakeWei, symbol, 'stake', decimals)
  const lowNative =
    costWei === undefined
      ? ''
      : balanceBlocker(
          stakeCurate.nativeBalance,
          costWei,
          nativeCurrency,
          'arbitration cost',
        )
  const balancesRead =
    stakeCurate.balance !== undefined &&
    stakeCurate.allowance !== undefined &&
    stakeCurate.nativeBalance !== undefined
  const needsApproval =
    stakeWei !== undefined &&
    stakeCurate.allowance !== undefined &&
    stakeCurate.allowance < stakeWei

  let gate: ConfirmGate = {}
  if (wallet.blocker) gate = { blocker: wallet.blocker, fix: wallet.fix }
  else if (stakeCurate.checkFailed)
    gate = {
      blocker: `Could not read your ${symbol} balance`,
      fix: { label: 'Try again', onClick: stakeCurate.recheck },
    }
  else if (stakeCurate.checking || !balancesRead)
    gate = { blocker: `Checking your ${symbol} balance…` }
  else if (lowStake) gate = { blocker: lowStake }
  else if (lowNative) gate = { blocker: lowNative }
  else if (needsApproval)
    gate = {
      blocker: `Approve ${symbol} to submit`,
      fix: {
        label: `Approve ${stake}`,
        onClick: stakeCurate.approve,
        loading: stakeCurate.approving,
      },
    }

  return (
    <SubmitPage
      registryPath={registryPath}
      registryTitle={metadata?.title}
      itemName={itemName}
      lede={
        tokenLoading
          ? undefined
          : `Stake Curate: your ${itemName} is listed against a ${symbol} stake that stays locked while it is on the list, plus an arbitration deposit in ${nativeCurrency}. It can be challenged at any time while it is listed.`
      }
      columns={columns}
      initialValues={NO_INITIAL_VALUES}
      disabledFields={NO_DISABLED_FIELDS}
      policyURI={metadata?.policyURI}
      receipt={receipt}
      total={total}
      steps={steps}
      ready={ready}
      gate={gate}
      phase={stakeCurate.phase}
      submitting={stakeCurate.submitting}
      factoryChecks={factoryChecks}
      onSubmit={stakeCurate.submit}
    />
  )
}

/* ---------- Kind detection and providers (unchanged) ---------- */

const SubmitItem = () => {
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const { isLightCurate, isClassicCurate, isPermanentCurate, checking, error } =
    useCheckLightCurate()
  useTcrNetwork()

  if (checking) return <Loading />
  if (error)
    return (
      <ErrorPage
        code="Error"
        title="Subgraph unavailable"
        message="Curate could not verify this registry type from the configured GTCR subgraphs. Please retry in a moment."
      />
    )

  if (!tcrAddress)
    return (
      <ErrorPage
        code="Error"
        title="Registry Not Found"
        message="This registry could not be found on any subgraph. The subgraph endpoint may be down or the registry address may be invalid."
      />
    )

  if (isClassicCurate)
    return (
      <Suspense fallback={<Loading />}>
        <TCRViewProvider tcrAddress={tcrAddress}>
          <ClassicSubmitPage />
        </TCRViewProvider>
      </Suspense>
    )

  if (isLightCurate)
    return (
      <Suspense fallback={<Loading />}>
        <LightTCRViewProvider tcrAddress={tcrAddress}>
          <LightSubmitPage />
        </LightTCRViewProvider>
      </Suspense>
    )

  if (isPermanentCurate)
    return (
      <Suspense fallback={<Loading />}>
        <PermanentSubmitPage />
      </Suspense>
    )

  return (
    <ErrorPage
      code="Error"
      title="Registry Not Found"
      message="This registry could not be found on any subgraph. The subgraph endpoint may be down or the registry address may be invalid."
    />
  )
}

export default SubmitItem
