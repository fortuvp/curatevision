import React, { useState } from 'react'
import styled from 'styled-components'
import { parseEther, decodeEventLog, type Address } from 'viem'
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import _GTCRFactory from 'assets/abis/PermanentGTCRFactory.json'
import { JSON_UPLOAD_ROLE } from 'utils/atlas-roles'
import { isVowel } from 'utils/string'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import { NETWORKS_INFO } from 'config/networks'
import {
  defaultEvidenceDisplayUriPermanent,
  defaultTcrAddresses,
  pgtcrFactoryAddresses,
} from 'config/tcr-addresses'
import useLightTcrView from 'hooks/light-tcr-view'
import useNativeCurrency from 'hooks/native-currency'
import useTokenSymbol from 'hooks/token-symbol'
import EnsureAuth from 'components/ensure-auth'
import {
  Body,
  Button,
  ButtonLink,
  Data,
  KeyValueList,
  Label,
  Row,
  Small,
  Stack,
  Status,
  Subheading,
  Surface,
  truncateMiddle,
} from 'components/curate/primitives'
import { FormSection, SectionHead } from './controls'
import { formatHours, readExtraData } from './format'
import type { StepProps, TcrState } from '.'

/*
 * Step 3 of the Stake Curate factory: a review of every parameter the
 * factory will receive, the deploy button with its blocker named, the
 * transaction state as a status line, and the new list's address once it
 * is live. Addresses come from the wizard's chain (the URL), and the button
 * asks to switch when the wallet is elsewhere.
 */

const getTcrMetaEvidence = async (
  tcrState: TcrState,
  evidenceDisplayInterfaceURI: string,
  uploadFile: (file: File, role: Roles) => Promise<string | null>,
) => {
  const {
    tcrTitle,
    tcrDescription,
    columns,
    itemName,
    itemNamePlural,
    tcrPrimaryDocument,
    tcrLogo,
  } = tcrState
  const metadata = {
    tcrTitle,
    tcrDescription,
    columns,
    itemName: itemName.toLowerCase(),
    itemNamePlural: itemNamePlural.toLowerCase(),
    logoURI: tcrLogo,
    requireRemovalEvidence: true,
  }

  const commonMetaEvidenceProps = {
    category: 'Curated Lists',
    question: `Does the ${
      (itemName && itemName.toLowerCase()) || 'item'
    } comply with the required criteria?`,
    fileURI: tcrPrimaryDocument,
    evidenceDisplayInterfaceURI,
    metadata,
  }

  const metaEvidenceData = {
    title: `Keep ${
      itemName
        ? isVowel(itemName[0])
          ? `an ${itemName.toLowerCase()}`
          : `a ${itemName.toLowerCase()}`
        : 'an item'
    } in ${tcrTitle}`,
    description: `Someone requested to remove ${
      itemName
        ? isVowel(itemName[0])
          ? `an ${itemName.toLowerCase()}`
          : `a ${itemName.toLowerCase()}`
        : 'an item'
    } from ${tcrTitle}`,
    rulingOptions: {
      titles: ['Yes, Keep It Included', 'No, Remove It'],
      descriptions: [
        `Select this if you think the ${
          (itemName && itemName.toLowerCase()) || 'item'
        } complies with the required criteria and should be kept included.`,
        `Select this if you think the ${
          (itemName && itemName.toLowerCase()) || 'item'
        } does not comply with the required criteria and should be removed.`,
      ],
    },
    ...commonMetaEvidenceProps,
  }

  const metaEvidenceFile = new File(
    [JSON.stringify(metaEvidenceData)],
    'meta-evidence.json',
    { type: 'application/json' },
  )
  const ipfsMetaEvidencePath = await uploadFile(
    metaEvidenceFile,
    JSON_UPLOAD_ROLE,
  )
  if (!ipfsMetaEvidencePath)
    throw new Error('Failed to upload meta-evidence to IPFS.')

  return {
    ipfsMetaEvidencePath,
  }
}

const pickAddress = (args: unknown): string | undefined =>
  args && typeof args === 'object' && '_address' in args
    ? ((args as { _address?: string })._address ?? undefined)
    : undefined

type Phase = 'idle' | 'uploading' | 'wallet' | 'mining' | 'done' | 'error'

const Review = styled(KeyValueList)`
  dd {
    font-family: var(--font-mono);
    font-size: var(--fs-data);
    line-height: 20px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
`

const LiveAddress = styled(Data)`
  display: block;
  overflow-wrap: anywhere;
`

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`

type DeployProps = StepProps

const Deploy = ({ setTxState, tcrState, setTcrState }: DeployProps) => {
  const targetChainId = tcrState.chainId
  const walletChainId = useChainId()
  const { address: account, isConnected } = useAccount()
  const { isVerified, uploadFile } = useAtlasProvider()
  const { switchChain, isPending: switching } = useSwitchChain()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const nativeCurrency = useNativeCurrency()
  const { symbol: tokenSymbol } = useTokenSymbol(
    tcrState.tokenAddress || undefined,
  )
  const [phase, setPhase] = useState<Phase>('idle')
  const [failure, setFailure] = useState('')
  const [txSubmitted, setTxSubmitted] = useState<string>()
  const factoryAddress =
    targetChainId === undefined ? undefined : pgtcrFactoryAddresses[targetChainId]
  const defaultTCRAddress =
    targetChainId === undefined ? undefined : defaultTcrAddresses[targetChainId]
  const evidenceDisplayInterfaceURI =
    targetChainId === undefined
      ? undefined
      : defaultEvidenceDisplayUriPermanent[targetChainId]
  const { metaEvidence } = useLightTcrView(defaultTCRAddress ?? '')
  const chainName =
    targetChainId === undefined
      ? 'this chain'
      : (NETWORKS_INFO[targetChainId as keyof typeof NETWORKS_INFO]?.name ??
        `chain ${targetChainId}`)

  const deployedAddress =
    (txSubmitted && tcrState.transactions[txSubmitted]?.contractAddress) || ''
  const busy = phase === 'uploading' || phase === 'wallet' || phase === 'mining'
  const wrongChain =
    isConnected && targetChainId !== undefined && walletChainId !== targetChainId

  const configError = factoryAddress
    ? evidenceDisplayInterfaceURI
      ? ''
      : `No evidence display is configured for ${chainName}, so lists cannot be deployed there yet.`
    : `No Stake Curate factory is configured for ${chainName}, so lists cannot be deployed there.`

  let blocker = ''
  if (configError) blocker = configError
  else if (phase === 'done') blocker = 'This list is deployed'
  else if (!isConnected) blocker = 'Connect wallet to deploy'
  else if (wrongChain) blocker = `Switch to ${chainName} to deploy`
  else if (!isVerified) blocker = 'Sign in to deploy'

  const onDeploy = async () => {
    if (
      !factoryAddress ||
      !evidenceDisplayInterfaceURI ||
      !publicClient ||
      !walletClient
    ) {
      setPhase('error')
      setFailure(configError || 'Your wallet is not ready. Reconnect and try again.')
      return
    }
    const factory = factoryAddress as Address
    try {
      setFailure('')
      setPhase('uploading')
      const { ipfsMetaEvidencePath } = await getTcrMetaEvidence(
        tcrState,
        evidenceDisplayInterfaceURI,
        uploadFile,
      )

      setPhase('wallet')
      const { request } = await simulateContract(wagmiConfig, {
        address: factory,
        abi: _GTCRFactory,
        functionName: 'deploy',
        args: [
          tcrState.arbitratorAddress,
          tcrState.arbitratorExtraData,
          ipfsMetaEvidencePath,
          tcrState.governorAddress,
          tcrState.tokenAddress,
          parseEther(tcrState.submissionMinDeposit.toString()),
          [
            Number(tcrState.submissionPeriodDuration) * 60 * 60,
            Number(tcrState.reinclusionPeriodDuration) * 60 * 60,
            Number(tcrState.withdrawingPeriodDuration) * 60 * 60,
            Number(tcrState.arbitrationParamsCooldown) * 60 * 60,
          ],
          [
            Math.ceil(Number(tcrState.sharedStakeMultiplier)) * 100,
            Math.ceil(Number(tcrState.winnerStakeMultiplier)) * 100,
            Math.ceil(Number(tcrState.loserStakeMultiplier)) * 100,
            Math.ceil(Number(tcrState.challengeStakeMultiplier)) * 100,
          ],
        ],
        gas: 8000000n,
        account,
      })

      const result = await wrapWithToast(async () => {
        const hash = await walletClient.writeContract(request)
        setPhase('mining')
        return hash
      }, publicClient)

      if (result.status && result.result) {
        const txHash = result.result.transactionHash
        setTxSubmitted(txHash)

        let contractAddress: string | undefined
        try {
          const newGTCRLog = result.result.logs
            .map((log) => {
              try {
                return decodeEventLog({
                  abi: _GTCRFactory,
                  data: log.data,
                  topics: log.topics,
                })
              } catch {
                return null
              }
            })
            .find((parsed) => parsed && parsed.eventName === 'NewGTCR')

          if (newGTCRLog) contractAddress = pickAddress(newGTCRLog.args)
        } catch (err) {
          console.error('Error parsing deploy logs:', err)
        }

        setTxState({
          txHash,
          networkId: targetChainId,
          status: 'mined',
          contractAddress,
        })
        setTcrState((prevState) => ({
          ...prevState,
          finished: true,
        }))
        setPhase('done')
      } else {
        setPhase('error')
        setFailure('The transaction did not go through.')
      }
    } catch (err) {
      console.error('Error deploying list:', err)
      const message = parseWagmiError(err)
      errorToast(message)
      setPhase('error')
      setFailure(message)
    }
  }

  const extra = readExtraData(tcrState.arbitratorExtraData)
  const fields = tcrState.columns.map((column) => column.label).filter(Boolean)

  return (
    <Stack $gap={24}>
      <FormSection>
        <SectionHead>
          <Label>Step 3 of 3</Label>
          <Subheading>Deploy the list</Subheading>
          <Body $muted>
            The factory on {chainName} deploys the list in one transaction. It
            takes no deposit; you pay the network fee. Check the parameters
            first: the governor can change most of them later, the stake token
            cannot be changed.
          </Body>
        </SectionHead>
        <Review>
          <dt>List</dt>
          <dd>{tcrState.tcrTitle}</dd>
          <dt>Items</dt>
          <dd>
            {tcrState.itemName} / {tcrState.itemNamePlural}
          </dd>
          <dt>Fields</dt>
          <dd>{fields.join(', ')}</dd>
          <dt>Stake token</dt>
          <dd title={tcrState.tokenAddress}>
            {tokenSymbol} · {truncateMiddle(tcrState.tokenAddress || '')}
          </dd>
          <dt>Minimum stake</dt>
          <dd>
            {tcrState.submissionMinDeposit} {tokenSymbol}
          </dd>
          <dt>Challenger stake</dt>
          <dd>{tcrState.challengeStakeMultiplier}% of the entry&apos;s stake</dd>
          <dt>Submission period</dt>
          <dd>{formatHours(tcrState.submissionPeriodDuration)}</dd>
          <dt>Reinclusion period</dt>
          <dd>{formatHours(tcrState.reinclusionPeriodDuration)}</dd>
          <dt>Withdrawing period</dt>
          <dd>{formatHours(tcrState.withdrawingPeriodDuration)}</dd>
          <dt>Parameters cooldown</dt>
          <dd>{formatHours(tcrState.arbitrationParamsCooldown)}</dd>
          <dt>Court</dt>
          <dd>
            {extra
              ? `Court ${extra.courtID} · ${extra.numberOfJurors} juror${extra.numberOfJurors === 1 ? '' : 's'}`
              : truncateMiddle(tcrState.arbitratorExtraData || '', 10, 6)}
          </dd>
          <dt>Arbitrator</dt>
          <dd title={tcrState.arbitratorAddress}>
            {truncateMiddle(tcrState.arbitratorAddress)}
          </dd>
          <dt>Governor</dt>
          <dd title={tcrState.governorAddress}>
            {truncateMiddle(tcrState.governorAddress)}
          </dd>
          <dt>Appeal multipliers</dt>
          <dd>
            shared {tcrState.sharedStakeMultiplier}% · winner{' '}
            {tcrState.winnerStakeMultiplier}% · loser{' '}
            {tcrState.loserStakeMultiplier}%
          </dd>
        </Review>
        <Small $muted>
          Arbitration deposits on this list are paid in {nativeCurrency}; stakes
          in {tokenSymbol}.
        </Small>
      </FormSection>

      <FormSection>
        {phase === 'done' ? (
          <Surface $padding="compact" $raised>
            <Stack $gap={12}>
              <Status tone="registered" label="Deployed" />
              <Subheading>Your list is live at</Subheading>
              <LiveAddress>{deployedAddress}</LiveAddress>
              <Row $gap={8} $wrap>
                {targetChainId !== undefined && deployedAddress && (
                  <ButtonLink
                    to={`/tcr/${targetChainId}/${deployedAddress}`}
                    $variant="primary"
                  >
                    Open {tcrState.tcrTitle}
                  </ButtonLink>
                )}
                {targetChainId !== undefined && defaultTCRAddress && (
                  <ButtonLink
                    to={`/tcr/${targetChainId}/${defaultTCRAddress}`}
                    $variant="secondary"
                  >
                    Open {metaEvidence?.metadata?.tcrTitle || 'Curated Lists'}{' '}
                    to submit this list
                  </ButtonLink>
                )}
              </Row>
              <Small $muted>
                Bookmark the address. Submitting the list to the list of lists
                helps other people find it.
              </Small>
            </Stack>
          </Surface>
        ) : (
          <Stack $gap={12}>
            <Actions>
              <Button
                type="button"
                $variant="primary"
                disabled={!!blocker || busy}
                aria-disabled={!!blocker || busy}
                title={blocker || undefined}
                onClick={onDeploy}
              >
                {busy ? 'Deploying…' : 'Deploy the list'}
              </Button>
              {!configError &&
                (!isConnected || (!wrongChain && !isVerified)) && (
                  <EnsureAuth>{null}</EnsureAuth>
                )}
              {!configError && wrongChain && targetChainId !== undefined && (
                <Button
                  type="button"
                  $variant="secondary"
                  disabled={switching}
                  onClick={() => switchChain({ chainId: targetChainId })}
                >
                  {switching ? 'Waiting…' : `Switch to ${chainName}`}
                </Button>
              )}
            </Actions>
            <div role="status">
              {phase === 'uploading' && (
                <Status
                  tone="window"
                  label="Uploading"
                  detail="the list metadata to IPFS"
                />
              )}
              {phase === 'wallet' && (
                <Status
                  tone="window"
                  label="Waiting for your wallet"
                  detail="confirm the deployment"
                />
              )}
              {phase === 'mining' && (
                <Status
                  tone="window"
                  label="Deploying"
                  detail="waiting for the transaction; keep this page open"
                />
              )}
              {phase === 'error' && (
                <Status tone="off" label="Deployment failed" detail={failure} />
              )}
              {!busy && phase !== 'error' && blocker && (
                <Small $muted>{blocker}</Small>
              )}
            </div>
          </Stack>
        )}
      </FormSection>
    </Stack>
  )
}

export default Deploy
