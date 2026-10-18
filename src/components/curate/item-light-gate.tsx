import React from 'react'
import { BigNumber, type BigNumberish } from 'ethers'
import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { useAtlasProvider } from '@kleros/kleros-app'
import useUrlChainId from 'hooks/use-url-chain-id'
import useNativeBalance from 'hooks/use-native-balance'
import useNativeCurrency from 'hooks/native-currency'
import EnsureAuth from 'components/ensure-auth'
import { NETWORKS_INFO } from 'config/networks'
import { Button } from './primitives'
import { formatAmount } from './item-light-format'

/*
 * Why an action is blocked, in plain words, and the control that unblocks
 * it (DESIGN.md: a disabled primary names its blocker; every page works
 * without a wallet and asks to connect only on an action). Uploads go
 * through Atlas, so the existing EnsureAuth gate (Connect, Sign in) is kept.
 */

export interface ActionGate {
  /** Undefined when the action can run. */
  blocker?: string
  ready: boolean
  /** Connect, Sign in or Switch network, or null when nothing blocks. */
  controls: React.ReactNode
}

export const useActionGate = ({
  verb,
  amount,
  needsAuth = true,
  pending,
}: {
  /** "challenge this submission", used in "Connect a wallet to …" */
  verb: string
  /** The deposit about to be sent, to check the balance. */
  amount?: BigNumberish | null
  /** Whether the action uploads to Atlas and needs the sign-in. */
  needsAuth?: boolean
  /** A blocker from the caller while its data loads ("Loading the deposit"). */
  pending?: string
}): ActionGate => {
  const { isConnected } = useAccount()
  const walletChainId = useChainId()
  const urlChainId = useUrlChainId()
  const { isVerified } = useAtlasProvider()
  const { balance } = useNativeBalance()
  const currency = useNativeCurrency()
  const { switchChain, isPending } = useSwitchChain()

  const targetChain = urlChainId ?? undefined
  const chainName = targetChain
    ? (NETWORKS_INFO[targetChain as keyof typeof NETWORKS_INFO]?.name ??
      `chain ${targetChain}`)
    : undefined
  const wrongChain =
    isConnected && !!targetChain && walletChainId !== targetChain
  const insufficient =
    isConnected &&
    amount !== null &&
    amount !== undefined &&
    balance !== undefined &&
    balance < BigInt(BigNumber.from(amount).toString())

  let blocker: string | undefined
  if (pending) blocker = pending
  else if (!isConnected) blocker = `Connect a wallet to ${verb}`
  else if (wrongChain) blocker = `Switch to ${chainName} to ${verb}`
  else if (needsAuth && !isVerified) blocker = `Sign in to ${verb}`
  else if (insufficient)
    blocker = `Not enough ${currency}: you need ${formatAmount(
      amount,
      currency,
    )} plus gas`

  let controls: React.ReactNode = null
  if (!isConnected || (!wrongChain && needsAuth && !isVerified))
    controls = <EnsureAuth>{null}</EnsureAuth>
  else if (wrongChain && targetChain)
    controls = (
      <Button
        type="button"
        $variant="secondary"
        disabled={isPending}
        onClick={() => switchChain({ chainId: targetChain })}
      >
        Switch to {chainName}
      </Button>
    )

  return { blocker, ready: !blocker, controls }
}

export default useActionGate
