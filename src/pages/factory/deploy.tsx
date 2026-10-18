import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import {
  parseEther,
  encodeFunctionData,
  getContractAddress,
  decodeEventLog,
  type Address,
} from 'viem'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import _GTCRFactory from 'assets/abis/LightGTCRFactory.json'
import { Roles, useAtlasProvider } from '@kleros/kleros-app'
import { JSON_UPLOAD_ROLE } from 'utils/atlas-roles'
import {
  ZERO_ADDRESS,
  isVowel,
  jurorsAndCourtIDFromExtraData,
} from 'utils/string'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { formatDurationLong } from 'utils/time'
import { wagmiConfig } from 'config/wagmi'
import { NETWORKS_INFO, getExplorerUrl } from 'config/networks'
import useUrlChainId from 'hooks/use-url-chain-id'
import useLightTcrView from 'hooks/light-tcr-view'
import useNativeCurrency from 'hooks/native-currency'
import SubmitModal from '../light-item-details/modals/submit'
import {
  defaultEvidenceDisplayUri,
  defaultTcrAddresses,
  lgtcrFactoryAddresses,
  txBatcherAddresses,
} from 'config/tcr-addresses'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonLink,
  Data,
  KeyValueList,
  Label,
  Mono,
  Row,
  Small,
  Stack,
  Status,
  truncateMiddle,
} from 'components/curate/primitives'
import { Note, StepHeader, formatNative, useWalletGate } from './fields'
import { incompleteSteps, listInProse } from './schemas'
import type { StepProps, TcrState } from '.'

/*
 * Step 4, deploy: a review of what was entered, what the one signature
 * sends (two factory deployments batched through the transaction batcher,
 * gas only), the blockers that stop it, the transaction status with the
 * hash, and the optional submission to the list of lists afterwards. The
 * meta-evidence upload and the contract calls are unchanged.
 */

export const _txBatcher = [
  {
    constant: false,
    inputs: [
      { name: 'targets', type: 'address[]' },
      { name: 'values', type: 'uint256[]' },
      { name: 'datas', type: 'bytes[]' },
    ],
    name: 'batchSend',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function',
  },
]

const getTcrMetaEvidence = async (
  tcrState: TcrState,
  parentTCRAddress: string,
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
    relColumns,
    relItemName,
    relItemNamePlural,
    relTcrPrimaryDocument,
    isTCRofTCRs,
    relTcrDisabled,
  } = tcrState
  const metadata = {
    tcrTitle,
    tcrDescription,
    columns,
    itemName: itemName.toLowerCase(),
    itemNamePlural: itemNamePlural.toLowerCase(),
    logoURI: tcrLogo,
    requireRemovalEvidence: true,
    isTCRofTCRs,
    relTcrDisabled,
  }

  const relTcrTitle = `${tcrTitle} enabled badges`
  const relMetadata = {
    tcrTitle: relTcrTitle,
    tcrDescription: `A List of lists related to ${tcrTitle}`,
    columns: relColumns,
    itemName: relItemName.toLowerCase(),
    itemNamePlural: relItemNamePlural.toLowerCase(),
    isConnectedTCR: true,
    requireRemovalEvidence: true,
    isTCRofTCRs: true,
    parentTCRAddress,
    relTcrDisabled: true,
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

  const commonRelMetaEvidenceProps = {
    ...commonMetaEvidenceProps,
    question: `Does the ${relItemName} comply with the required criteria?`,
    fileURI: relTcrDisabled
      ? process.env.REACT_APP_REJECT_ALL_POLICY_URI
      : relTcrPrimaryDocument,
    metadata: relMetadata,
    _v: '1.0.0',
    evidenceDisplayInterfaceRequiredParams: [
      'disputeID',
      'arbitrableContractAddress',
      'arbitratorContractAddress',
      'arbitrableChainID',
      'arbitrableJsonRpcUrl',
    ],
  }

  const registrationMetaEvidence = {
    name: 'reg-meta-evidence.json',
    data: {
      title: `Add ${
        itemName
          ? isVowel(itemName[0])
            ? `an ${itemName.toLowerCase()}`
            : `a ${itemName.toLowerCase()}`
          : 'an item'
      } to ${tcrTitle}`,
      description: `Someone requested to add ${
        itemName
          ? isVowel(itemName[0])
            ? `an ${itemName.toLowerCase()}`
            : `a ${itemName.toLowerCase()}`
          : 'an item'
      } to ${tcrTitle}`,
      rulingOptions: {
        titles: ['Yes, Add It', "No, Don't Add It"],
        descriptions: [
          `Select this if you think the ${
            (itemName && itemName.toLowerCase()) || 'item'
          } complies with the required criteria and should be added.`,
          `Select this if you think the ${
            (itemName && itemName.toLowerCase()) || 'item'
          } does not comply with the required criteria and should not be added.`,
        ],
      },
      ...commonMetaEvidenceProps,
    },
  }
  const clearingMetaEvidence = {
    name: 'clr-meta-evidence.json',
    data: {
      title: `Remove ${
        itemName
          ? isVowel(itemName[0])
            ? `an ${itemName.toLowerCase()}`
            : `a ${itemName.toLowerCase()}`
          : 'an item'
      } from ${tcrTitle}`,
      description: `Someone requested to remove ${
        itemName
          ? isVowel(itemName[0])
            ? `an ${itemName.toLowerCase()}`
            : `a ${itemName.toLowerCase()}`
          : 'an item'
      } from ${tcrTitle}`,
      rulingOptions: {
        titles: ['Yes, Remove It', "No, Don't Remove It"],
        descriptions: [
          `Select this if you think the ${
            (itemName && itemName.toLowerCase()) || 'item'
          } does not comply with the required criteria and should be removed.`,
          `Select this if you think the ${
            (itemName && itemName.toLowerCase()) || 'item'
          } complies with the required criteria and should not be removed.`,
        ],
      },
      ...commonMetaEvidenceProps,
    },
  }

  const relRegistrationMetaEvidence = {
    name: 'rel-reg-meta-evidence.json',
    data: {
      title: `Add a ${relItemName} to ${relTcrTitle}`,
      description: `Someone requested to add a ${relItemName} to ${relTcrTitle}.`,
      rulingOptions: {
        titles: ['Yes, Add It', "No, Don't Add It"],
        descriptions: [
          `Select this if you think the ${relItemName} complies with the required criteria and should be added.`,
          `Select this if you think the ${relItemName} does not comply with the required criteria and should not be added.`,
        ],
      },
      ...commonRelMetaEvidenceProps,
    },
  }
  const relClearingMetaEvidence = {
    name: 'rel-clr-meta-evidence.json',
    data: {
      title: `Remove a ${relItemName} from ${relTcrTitle}`,
      description: `Someone requested to remove a ${relItemName} from ${relTcrTitle}.`,
      rulingOptions: {
        titles: ['Yes, Remove It', "No, Don't Remove It"],
        descriptions: [
          `Select this if you think the ${relItemName} does not comply with the required criteria and should be removed.`,
          `Select this if you think the ${relItemName} complies with the required criteria and should not be removed.`,
        ],
      },
      ...commonRelMetaEvidenceProps,
    },
  }

  const files = [
    registrationMetaEvidence,
    clearingMetaEvidence,
    relRegistrationMetaEvidence,
    relClearingMetaEvidence,
  ].map(
    ({ name, data }) =>
      new File([JSON.stringify(data)], name, { type: 'application/json' }),
  )

  const uploaded = await Promise.all(
    files.map((file) => uploadFile(file, JSON_UPLOAD_ROLE)),
  )
  if (uploaded.some((p) => !p))
    throw new Error('Failed to upload meta-evidence to IPFS.')
  const [
    registrationMetaEvidencePath,
    clearingMetaEvidencePath,
    relRegistrationMetaEvidencePath,
    relClearingMetaEvidencePath,
  ] = uploaded as string[]

  return {
    registrationMetaEvidencePath,
    clearingMetaEvidencePath,
    relRegistrationMetaEvidencePath,
    relClearingMetaEvidencePath,
  }
}

/* ---------- Layout ---------- */

const Steps = styled.ol`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
  counter-reset: step;
`

const Step = styled.li`
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  counter-increment: step;

  &::before {
    content: counter(step);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-pill);
    color: var(--color-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-label);
    font-weight: 500;
  }
`

const StepTitle = styled.div`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
`

const StepBody = styled.div`
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
`

const HashLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary);
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  font-variant-numeric: tabular-nums;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

type DeployPhase = 'idle' | 'uploading' | 'wallet' | 'mined'

type DeployProps = Omit<StepProps, 'postSubmit'> & { postSubmit?: () => void }

const Deploy = ({ setTxState, tcrState, setTcrState }: DeployProps) => {
  const urlChainId = useUrlChainId()
  const walletChainId = useChainId()
  const chainId = urlChainId ?? walletChainId
  const chainName =
    NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]?.name ??
    `chain ${chainId}`
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const nativeCurrency = useNativeCurrency()
  const [phase, setPhase] = useState<DeployPhase>('idle')
  const [txSubmitted, setTxSubmitted] = useState<string>()
  const [deployedTCRAddress, setDeployedTCRAddress] = useState<string>()
  const [submissionFormOpen, setSubmissionFormOpen] = useState(false)
  const factoryAddress = lgtcrFactoryAddresses[chainId]
  const defaultTCRAddress = defaultTcrAddresses[chainId]
  const batcherAddress = txBatcherAddresses[chainId]
  const evidenceDisplayInterfaceURI = defaultEvidenceDisplayUri[chainId]
  const {
    submissionDeposit,
    submissionBaseDeposit,
    arbitrationCost,
    metaEvidence,
    challengePeriodDuration,
  } = useLightTcrView(defaultTCRAddress ?? '')
  const { uploadFile } = useAtlasProvider()
  const gate = useWalletGate({ verb: 'deploy', needsChain: true })

  const incomplete = useMemo(() => incompleteSteps(tcrState), [tcrState])
  const busy = phase === 'uploading' || phase === 'wallet'
  const configured =
    !!factoryAddress && !!batcherAddress && !!evidenceDisplayInterfaceURI
  const blocker = !configured
    ? `Lists cannot be deployed on ${chainName}: no factory is configured`
    : incomplete.length > 0
      ? `Complete ${listInProse(incomplete)} before deploying`
      : gate.blocker

  const listOfListsTitle = metaEvidence?.metadata?.tcrTitle || 'Curated Lists'
  const listOfListsDeposit = formatNative(submissionDeposit)
  const extra = tcrState.arbitratorExtraData
    ? jurorsAndCourtIDFromExtraData(tcrState.arbitratorExtraData)
    : null
  const periodHours = Number(tcrState.challengePeriodDuration)
  const period =
    Number.isFinite(periodHours) && periodHours > 0
      ? formatDurationLong(periodHours * 60 * 60)
      : '—'

  const onDeploy = async () => {
    if (
      !factoryAddress ||
      !batcherAddress ||
      !evidenceDisplayInterfaceURI ||
      !publicClient ||
      !walletClient
    ) {
      errorToast(
        !publicClient || !walletClient
          ? 'Your wallet is not ready. Reconnect it and try again.'
          : `No factory is configured for ${chainName}.`,
      )
      return
    }
    const factory = factoryAddress as Address
    const batcher = batcherAddress as Address
    try {
      setPhase('uploading')
      const txCount = await publicClient.getTransactionCount({
        address: factory,
      })
      const parentTCRAddress = getContractAddress({
        from: factory,
        nonce: BigInt(txCount + 1),
      })

      const {
        registrationMetaEvidencePath,
        clearingMetaEvidencePath,
        relRegistrationMetaEvidencePath,
        relClearingMetaEvidencePath,
      } = await getTcrMetaEvidence(
        tcrState,
        parentTCRAddress,
        evidenceDisplayInterfaceURI,
        uploadFile,
      )

      const relTCRArgs = [
        tcrState.relArbitratorAddress,
        tcrState.relArbitratorExtraData,
        ZERO_ADDRESS,
        relRegistrationMetaEvidencePath,
        relClearingMetaEvidencePath,
        tcrState.relGovernorAddress,
        [
          parseEther(
            tcrState.relTcrDisabled
              ? '10000000000000'
              : tcrState.relSubmissionBaseDeposit.toString(),
          ),
          parseEther(tcrState.relRemovalBaseDeposit.toString()),
          parseEther(tcrState.relSubmissionChallengeBaseDeposit.toString()),
          parseEther(tcrState.relRemovalChallengeBaseDeposit.toString()),
        ],
        Number(tcrState.relChallengePeriodDuration) * 60 * 60,
        [
          Math.ceil(Number(tcrState.relSharedStakeMultiplier)) * 100,
          Math.ceil(Number(tcrState.relWinnerStakeMultiplier)) * 100,
          Math.ceil(Number(tcrState.relLoserStakeMultiplier)) * 100,
        ],
        ZERO_ADDRESS,
      ]

      const relData = encodeFunctionData({
        abi: _GTCRFactory,
        functionName: 'deploy',
        args: relTCRArgs,
      })
      const relTCRAddress = getContractAddress({
        from: factory,
        nonce: BigInt(txCount),
      })

      const TCRArgs = [
        tcrState.arbitratorAddress,
        tcrState.arbitratorExtraData,
        relTCRAddress,
        registrationMetaEvidencePath,
        clearingMetaEvidencePath,
        tcrState.governorAddress,
        [
          parseEther(tcrState.submissionBaseDeposit.toString()),
          parseEther(tcrState.removalBaseDeposit.toString()),
          parseEther(tcrState.submissionChallengeBaseDeposit.toString()),
          parseEther(tcrState.removalChallengeBaseDeposit.toString()),
        ],
        Number(tcrState.challengePeriodDuration) * 60 * 60,
        [
          Math.ceil(Number(tcrState.sharedStakeMultiplier)) * 100,
          Math.ceil(Number(tcrState.winnerStakeMultiplier)) * 100,
          Math.ceil(Number(tcrState.loserStakeMultiplier)) * 100,
        ],
        ZERO_ADDRESS,
      ]
      const tcrData = encodeFunctionData({
        abi: _GTCRFactory,
        functionName: 'deploy',
        args: TCRArgs,
      })

      const targets = [factory, factory]
      const values = [0n, 0n]
      const datas = [relData, tcrData]

      const { request } = await simulateContract(wagmiConfig, {
        address: batcher,
        abi: _txBatcher,
        functionName: 'batchSend',
        args: [targets, values, datas],
        gas: 8000000n,
        account,
      })

      setPhase('wallet')

      const result = await wrapWithToast(
        () => walletClient.writeContract(request),
        publicClient,
      )

      if (result.status && result.result) {
        const txHash = result.result.transactionHash
        setTxSubmitted(txHash)

        // Find the deployed contract address from the receipt logs
        let contractAddress: string = parentTCRAddress // fallback to predicted address
        try {
          const newGTCRLogs = result.result.logs
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
            .filter(
              (parsed): parsed is NonNullable<typeof parsed> =>
                !!parsed && parsed.eventName === 'NewGTCR',
            )
          // The second NewGTCR event is the parent TCR
          const pickAddress = (args: unknown): string | undefined =>
            args && typeof args === 'object' && '_address' in args
              ? ((args as { _address?: string })._address ?? undefined)
              : undefined
          if (newGTCRLogs.length >= 2)
            contractAddress =
              pickAddress(newGTCRLogs[1].args) ?? contractAddress
          else if (newGTCRLogs.length === 1)
            contractAddress =
              pickAddress(newGTCRLogs[0].args) ?? contractAddress
        } catch (err) {
          console.error('Error parsing deploy logs:', err)
        }

        setTxState({
          txHash,
          networkId: chainId,
          status: 'mined',
          contractAddress,
        })
        setTcrState((prevState) => ({
          ...prevState,
          finished: true,
        }))
        setPhase('mined')
        setDeployedTCRAddress(contractAddress)
      } else setPhase('idle')
    } catch (err) {
      console.error('Error deploying list:', err)
      errorToast(parseWagmiError(err))
      setPhase('idle')
    }
  }

  const explorerTxUrl = txSubmitted
    ? `${getExplorerUrl(chainId)}/tx/${txSubmitted}`
    : undefined

  return (
    <>
      <Stack $gap={20}>
        <StepHeader
          heading={phase === 'mined' ? 'List deployed' : 'Review and deploy'}
          lede={
            phase === 'mined'
              ? 'The list is live. Bookmark its address; it is also saved in this browser under previous deployments.'
              : 'Check the details, then sign one transaction. You pay gas only; deposits are paid by submitters later.'
          }
        />

        {phase !== 'mined' && (
          <>
            <KeyValueList>
              <dt>Name</dt>
              <dd>{tcrState.tcrTitle || '—'}</dd>
              <dt>Items</dt>
              <dd>
                {tcrState.itemName || '—'} / {tcrState.itemNamePlural || '—'}
              </dd>
              <dt>Fields</dt>
              <dd>
                {tcrState.isTCRofTCRs
                  ? 'List address (a list of lists)'
                  : tcrState.columns
                      .map((column) => column.label)
                      .filter(Boolean)
                      .join(', ') || '—'}
              </dd>
              <dt>Submission deposit</dt>
              <dd>
                <Data>
                  {String(tcrState.submissionBaseDeposit)} {nativeCurrency}
                </Data>{' '}
                <Small $muted>+ arbitration cost</Small>
              </dd>
              <dt>Challenge period</dt>
              <dd>
                <Data>{period}</Data>
              </dd>
              {extra && (
                <>
                  <dt>Jurors</dt>
                  <dd>
                    <Data>{extra.numberOfJurors}</Data>{' '}
                    <Small $muted>
                      in the first round, court {extra.courtID}
                    </Small>
                  </dd>
                </>
              )}
              <dt>Badges list</dt>
              <dd>{tcrState.relTcrDisabled ? 'Skipped' : 'Included'}</dd>
            </KeyValueList>

            <Note role="group" aria-label="What happens next">
              <Label>What happens next</Label>
              <Steps>
                <Step>
                  <div>
                    <StepTitle>You sign one transaction</StepTitle>
                    <StepBody>
                      It batches two deployments through the transaction
                      batcher: the badges list
                      {tcrState.relTcrDisabled
                        ? ' (a closed placeholder, since you skipped it)'
                        : ''}{' '}
                      and your list. You pay gas only; there is no deposit.
                    </StepBody>
                  </div>
                </Step>
                <Step>
                  <div>
                    <StepTitle>The list goes live</StepTitle>
                    <StepBody>
                      Its address and the transaction appear here. Keep this
                      page open until the transaction is mined.
                    </StepBody>
                  </div>
                </Step>
                <Step>
                  <div>
                    <StepTitle>
                      Optional: submit it to {listOfListsTitle}
                    </StepTitle>
                    <StepBody>
                      So people can find it. That submission locks{' '}
                      {listOfListsDeposit
                        ? `${listOfListsDeposit} ${nativeCurrency}`
                        : 'a deposit'}{' '}
                      that comes back in full if nobody challenges it.
                    </StepBody>
                  </div>
                </Step>
              </Steps>
            </Note>

            <Stack $gap={10}>
              <Row $gap={10} $wrap>
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
                {!busy && configured && incomplete.length === 0 && gate.control}
              </Row>
              {blocker && !busy && (
                <Small $muted role="status">
                  {blocker}
                </Small>
              )}
              {busy && (
                <Status
                  tone="window"
                  label="Deploying"
                  detail={
                    phase === 'uploading'
                      ? 'uploading the list details to IPFS'
                      : 'confirm in your wallet, then wait for the transaction to be mined'
                  }
                />
              )}
            </Stack>
          </>
        )}

        {phase === 'mined' && deployedTCRAddress && (
          <>
            <Status tone="registered" label="Deployed" />
            <KeyValueList>
              <dt>Address</dt>
              <dd>
                <Mono title={deployedTCRAddress}>
                  {truncateMiddle(deployedTCRAddress, 10, 8)}
                </Mono>
              </dd>
              {txSubmitted && explorerTxUrl && (
                <>
                  <dt>Transaction</dt>
                  <dd>
                    <HashLink
                      href={explorerTxUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={txSubmitted}
                    >
                      {truncateMiddle(txSubmitted, 10, 8)}
                      <CurateIcon name="external" size={14} />
                    </HashLink>
                  </dd>
                </>
              )}
            </KeyValueList>
            <Body $muted>
              If it meets the listing policy, submit it to {listOfListsTitle} so
              other people can find it.
            </Body>
            <Row $gap={10} $wrap>
              <ButtonLink
                to={`/tcr/${chainId}/${deployedTCRAddress}`}
                $variant="primary"
              >
                Open the list
              </ButtonLink>
              {metaEvidence && submissionDeposit && defaultTCRAddress && (
                <Button
                  type="button"
                  $variant="secondary"
                  onClick={() => setSubmissionFormOpen(true)}
                >
                  Submit it to {listOfListsTitle}
                </Button>
              )}
            </Row>
          </>
        )}
      </Stack>
      {metaEvidence &&
        submissionDeposit &&
        challengePeriodDuration &&
        defaultTCRAddress && (
          <SubmitModal
            initialValues={deployedTCRAddress ? [deployedTCRAddress] : []}
            visible={!!submissionFormOpen}
            onCancel={() => setSubmissionFormOpen(false)}
            submissionDeposit={submissionDeposit}
            baseDeposit={submissionBaseDeposit}
            arbitrationCost={arbitrationCost}
            tcrAddress={defaultTCRAddress}
            metaEvidence={metaEvidence}
            challengePeriodDuration={challengePeriodDuration}
          />
        )}
    </>
  )
}

export default Deploy
