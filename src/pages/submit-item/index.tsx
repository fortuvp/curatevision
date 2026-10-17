import React, { Suspense, useContext, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import Loading from 'components/loading'
import ErrorPage from 'pages/error-page'
import useCheckLightCurate from 'hooks/use-check-light-curate'
import useTcrNetwork from 'hooks/use-tcr-network'
import useUrlChainId from 'hooks/use-url-chain-id'
import useArbitrationCost from 'hooks/arbitration-cost'
import { useEthersProvider } from 'hooks/ethers-adapters'
import { TCRViewContext, TCRViewProvider } from 'contexts/tcr-view-context'
import {
  LightTCRViewContext,
  LightTCRViewProvider,
} from 'contexts/light-tcr-view-context'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import ClassicSubmit from 'pages/item-details/modals/submit'
import LightSubmit from 'pages/light-item-details/modals/submit'
import PermanentSubmit from 'pages/permanent-item-details/modals/submit'
import { PERMANENT_REGISTRY_QUERY } from 'utils/graphql'
import { parseIpfs } from 'utils/ipfs-parse'

const ClassicSubmitPage = () => {
  const navigate = useNavigate()
  const chainId = useUrlChainId()
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const tcrViewContext = useContext(TCRViewContext)
  const metaEvidence = tcrViewContext?.metaEvidence
  const submissionDeposit = tcrViewContext?.submissionDeposit
  const challengePeriodDuration = tcrViewContext?.challengePeriodDuration
  const tcrError = tcrViewContext?.tcrError

  if (typeof tcrError === 'string')
    return <ErrorPage code="400" message={tcrError} />
  if (!tcrAddress || !metaEvidence || !submissionDeposit) return <Loading />

  return (
    <ClassicSubmit
      embedded
      onCancel={() => navigate(`/tcr/${chainId}/${tcrAddress}`)}
      tcrAddress={tcrAddress}
      initialValues={[]}
      submissionDeposit={submissionDeposit}
      challengePeriodDuration={challengePeriodDuration}
      metaEvidence={metaEvidence}
      disabledFields={[]}
    />
  )
}

const LightSubmitPage = () => {
  const navigate = useNavigate()
  const chainId = useUrlChainId()
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const tcrViewContext = useContext(LightTCRViewContext)
  const metaEvidence = tcrViewContext?.metaEvidence
  const submissionDeposit = tcrViewContext?.submissionDeposit
  const challengePeriodDuration = tcrViewContext?.challengePeriodDuration
  const tcrError = tcrViewContext?.tcrError

  if (typeof tcrError === 'string')
    return <ErrorPage code="400" message={tcrError} />
  if (!tcrAddress || !metaEvidence || !submissionDeposit) return <Loading />

  return (
    <LightSubmit
      embedded
      onCancel={() => navigate(`/tcr/${chainId}/${tcrAddress}`)}
      tcrAddress={tcrAddress}
      initialValues={[]}
      submissionDeposit={submissionDeposit}
      challengePeriodDuration={challengePeriodDuration}
      metaEvidence={metaEvidence}
      disabledFields={[]}
    />
  )
}

const PermanentSubmitPage = () => {
  const navigate = useNavigate()
  const chainId = useUrlChainId()
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  const { graphqlBatcher } = useGraphqlBatcher()
  const library = useEthersProvider({
    chainId: chainId ? Number(chainId) : undefined,
  })
  const [columns, setColumns] = useState<any[]>()
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

  const registry = registryQuery.data?.registry
  const arbitrationSettings = registry?.arbitrationSettings?.[0]
  const metadata = arbitrationSettings?.metadata

  useEffect(() => {
    let cancelled = false
    setColumns(undefined)
    setColumnsError(undefined)

    if (!arbitrationSettings?.metaEvidenceURI) return undefined
    ;(async () => {
      try {
        const response = await fetch(
          parseIpfs(arbitrationSettings.metaEvidenceURI),
        )
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
  }, [arbitrationSettings?.metaEvidenceURI])

  const { arbitrationCost } = useArbitrationCost({
    address: registry?.arbitrator?.id || '',
    arbitratorExtraData: arbitrationSettings?.arbitratorExtraData || '',
    library,
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
  if (!metadata || !columns || !arbitrationCost) return <Loading />

  return (
    <PermanentSubmit
      embedded
      onCancel={() => navigate(`/tcr/${chainId}/${tcrAddress}`)}
      tcrAddress={tcrAddress!}
      tokenAddress={registry.token}
      initialValues={[]}
      submissionDeposit={registry.submissionMinDeposit}
      metadata={metadata}
      columns={columns}
      disabledFields={[]}
      submissionPeriod={registry.submissionPeriod}
      withdrawingPeriod={registry.withdrawingPeriod}
      arbitrationCost={arbitrationCost}
    />
  )
}

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
