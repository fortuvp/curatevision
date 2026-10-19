import React, { useState } from 'react'
import type { Address } from 'viem'
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import _gtcr from 'assets/abis/PermanentGTCR.json'
import useNativeCurrency from 'hooks/native-currency'
import useTokenSymbol from 'hooks/token-symbol'
import { formatDuration, formatDurationLong } from 'utils/time'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import { Body, Stack } from 'components/curate/primitives'
import { WhatHappensNext } from 'components/curate/what-happens-next'
import { WithdrawalStepper } from '../withdrawal-stepper'
import {
  GateHelper,
  ModalShell,
  nativeText,
  tokenText,
  useActionGate,
} from './shell'

/*
 * Start withdrawing a Stake Curate item. Nothing is deposited: the submitter
 * signs one transaction, waits the withdrawing period (during which the item
 * can still be challenged), then anyone executes the withdrawal and the stake
 * and arbitration deposit return. The three steps are drawn as the same
 * stepper the item page shows.
 */

interface WithdrawModalProps {
  isOpen: boolean
  onCancel: () => void
  item: SubgraphItem
  registry: SubgraphRegistry
  itemName: string
}

const WithdrawModal: React.FC<WithdrawModalProps> = ({
  isOpen,
  onCancel,
  item,
  registry,
  itemName,
}) => {
  const { address: account } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [loading, setLoading] = useState(false)
  const nativeCurrency = useNativeCurrency()
  const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenSymbol(
    registry?.token,
  )
  const gate = useActionGate('withdraw')

  const submitter = item?.submitter as string | undefined
  const isSubmitter =
    !!account &&
    !!submitter &&
    account.toLowerCase() === submitter.toLowerCase()

  const handleStartWithdraw = async () => {
    if (!item || !registry || !walletClient || !publicClient) return

    setLoading(true)

    try {
      const { request } = await simulateContract(wagmiConfig, {
        address: registry.id as Address,
        abi: _gtcr,
        functionName: 'startWithdrawItem',
        args: [item.itemID],
        account,
      })

      const result = await wrapWithToast(
        () => walletClient.writeContract(request),
        publicClient,
      )

      if (result.status) onCancel()
    } catch (err) {
      console.error('Withdrawal failed:', err)
      errorToast(parseWagmiError(err))
    } finally {
      setLoading(false)
    }
  }

  const periodSeconds = Number(registry?.withdrawingPeriod ?? Number.NaN)
  const period =
    periodSeconds > 0 ? formatDurationLong(periodSeconds) : undefined
  const stakeText = tokenText(item?.stake || 0, tokenDecimals, tokenSymbol)
  const deposit = item?.arbitrationDeposit as string | undefined
  const depositText = deposit
    ? nativeText(deposit, nativeCurrency)
    : 'the arbitration deposit'
  const returned = deposit ? `${stakeText} + ${depositText}` : stakeText

  const blocker = !gate.ready
    ? gate.blocker
    : !isSubmitter
      ? 'Only the submitter can withdraw'
      : undefined

  return (
    <ModalShell
      open={isOpen}
      title={`Withdraw ${itemName}`}
      eyebrow="No deposit, gas only"
      onClose={onCancel}
    >
      <Stack $gap={20}>
        <Body $muted>
          Takes the {itemName} off the list and returns what backs it. It cannot
          be undone once started.
        </Body>
        <WithdrawalStepper
          stage="listed"
          label={`Withdrawal steps: you start it, wait ${period ?? 'the withdrawing period'} while it stays challengeable, then anyone executes it and ${returned} return to the submitter.`}
          notes={[
            'You, one transaction',
            periodSeconds > 0 ? formatDuration(periodSeconds) : undefined,
            'Anyone, gas only',
          ]}
        />
        <WhatHappensNext
          receipt={[
            {
              label: period
                ? `Returned after ${period}`
                : 'Returned after the withdrawing period',
              value: returned,
            },
          ]}
          total="gas only"
          steps={[
            {
              title: 'You start the withdrawal',
              body: 'No deposit leaves your wallet. The withdrawing period starts with this transaction.',
            },
            {
              title: period ? `Withdrawing for ${period}` : 'Withdrawing',
              body: `The ${itemName} stays listed with its ${stakeText} at stake. A challenger can still open a dispute; if the jurors keep the ${itemName}, it is withdrawn at that moment instead.`,
            },
            {
              title: 'Execute withdrawal',
              body: `Once the period is over, you or anyone else executes it and ${returned} go back to the submitter.`,
            },
          ]}
          confirmLabel="Start withdrawal"
          onConfirm={handleStartWithdraw}
          confirmDisabled={Boolean(blocker)}
          confirmBlocker={blocker}
          loading={loading}
          bare
        />
        <GateHelper gate={gate} />
      </Stack>
    </ModalShell>
  )
}

export default WithdrawModal
