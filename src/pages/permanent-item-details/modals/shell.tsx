import React, { useCallback, useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { ethers, type BigNumberish } from 'ethers'
import { useAccount, useSwitchChain } from 'wagmi'
import { useAtlasProvider } from '@kleros/kleros-app'
import useUrlChainId from 'hooks/use-url-chain-id'
import { appKitModal } from 'config/wagmi'
import { NETWORKS_INFO } from 'config/networks'
import { errorToast, infoToast, successToast } from 'utils/wrap-with-toast'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  IconButton,
  SkeletonBlock,
  Small,
  Stack,
  Subheading,
} from 'components/curate/primitives'

/*
 * Shared pieces of the Stake Curate item modals: the dialog shell (surface,
 * hairline, 10px radius, bottom sheet on phones), the wallet gate that names
 * its blocker, and the exact amount formatting every receipt uses.
 */

/* ---------- Dialog ---------- */

const Layer = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 48px 16px;
  overflow-y: auto;

  @media (max-width: 720px) {
    align-items: flex-end;
    padding: 0;
  }
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: var(--color-bg);
  opacity: 0.82;
`

const Dialog = styled.div<{ $width: number }>`
  position: relative;
  width: 100%;
  max-width: ${({ $width }) => $width}px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-overlay);
  outline: none;

  @media (max-width: 720px) {
    max-width: none;
    max-height: 92vh;
    overflow-y: auto;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
`

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
`

const DialogBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
`

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export const ModalShell = ({
  open,
  title,
  onClose,
  width = 600,
  children,
}: {
  open: boolean
  title: React.ReactNode
  onClose: () => void
  width?: number
  children: React.ReactNode
}) => {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  // Keep Tab inside the dialog: wrap from the last focusable to the first
  // and from the first (or the dialog itself) back to the last.
  const trapTab = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const dialog = dialogRef.current
    if (event.key !== 'Tab' || !dialog) return
    const nodes = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE),
    ).filter((node) => node.getClientRects().length > 0)
    if (nodes.length === 0) {
      event.preventDefault()
      return
    }
    const first = nodes[0]
    const last = nodes[nodes.length - 1]
    const active = document.activeElement
    if (event.shiftKey) {
      if (active === first || active === dialog || !dialog.contains(active)) {
        event.preventDefault()
        last.focus()
      }
    } else if (active === last || !dialog.contains(active)) {
      event.preventDefault()
      first.focus()
    }
  }

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <Layer>
      <Backdrop onClick={onClose} aria-hidden />
      <Dialog
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        $width={width}
        onKeyDown={trapTab}
      >
        <Head>
          <Subheading id={titleId}>{title}</Subheading>
          <IconButton type="button" aria-label="Close" onClick={onClose}>
            <CurateIcon name="close" size={16} />
          </IconButton>
        </Head>
        <DialogBody>{children}</DialogBody>
      </Dialog>
    </Layer>,
    document.body,
  )
}

/** Skeleton shown while a modal waits for its deposit or metadata. */
export const ModalSkeleton = () => (
  <Stack $gap={10} aria-busy="true" aria-label="Loading">
    <SkeletonBlock $height="20px" $width="60%" />
    <SkeletonBlock $height="96px" />
    <SkeletonBlock $height="40px" />
  </Stack>
)

/* ---------- Wallet gate ---------- */

export interface ActionGate {
  /** True when the wallet is connected, on the right chain and signed in if needed. */
  ready: boolean
  account?: `0x${string}`
  /** "Connect wallet to challenge": shown on the disabled confirm button. */
  blocker?: string
  /** The one button that clears the blocker. */
  helper?: { label: string; onClick: () => void; loading?: boolean }
}

const chainName = (chainId: number): string =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]?.name ??
  `chain ${chainId}`

/**
 * Every write needs a connected wallet on the URL's chain; uploads also need
 * the Atlas sign-in. The gate returns the first blocker in that order.
 */
export const useActionGate = (
  verb: string,
  { needsSignIn = false }: { needsSignIn?: boolean } = {},
): ActionGate => {
  const { address, isConnected, chainId: walletChainId } = useAccount()
  const urlChainId = useUrlChainId()
  const { switchChain, isPending: switching } = useSwitchChain()
  const { isVerified, isSigningIn, authoriseUser } = useAtlasProvider()

  const signIn = useCallback(() => {
    infoToast('Signing in…')
    authoriseUser()
      .then(() => successToast('Signed in.'))
      .catch((err: unknown) => {
        console.error(err)
        const message = err instanceof Error ? err.message : 'unknown error'
        errorToast(`Sign-in failed: ${message}`)
      })
  }, [authoriseUser])

  if (!isConnected || !address)
    return {
      ready: false,
      blocker: `Connect wallet to ${verb}`,
      helper: {
        label: 'Connect wallet',
        onClick: () => appKitModal?.open({ view: 'Connect' }),
      },
    }

  if (urlChainId && walletChainId !== urlChainId)
    return {
      ready: false,
      account: address,
      blocker: `Switch to ${chainName(urlChainId)} to ${verb}`,
      helper: {
        label: `Switch to ${chainName(urlChainId)}`,
        onClick: () => switchChain({ chainId: urlChainId }),
        loading: switching,
      },
    }

  if (needsSignIn && !isVerified)
    return {
      ready: false,
      account: address,
      blocker: `Sign in to ${verb}`,
      helper: { label: 'Sign in', onClick: signIn, loading: isSigningIn },
    }

  return { ready: true, account: address }
}

const HelperRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
`

/** The button that clears the gate's blocker, with the blocker as its caption. */
export const GateHelper = ({ gate }: { gate: ActionGate }) =>
  gate.helper ? (
    <HelperRow>
      <Small $muted role="status">
        {gate.blocker}
      </Small>
      <Button
        type="button"
        $variant="secondary"
        $size="sm"
        disabled={gate.helper.loading}
        onClick={gate.helper.onClick}
      >
        {gate.helper.loading ? 'Waiting…' : gate.helper.label}
      </Button>
    </HelperRow>
  ) : null

/* ---------- Amounts ---------- */

type Amount = BigNumberish | bigint | null | undefined

const trimFraction = (value: string, maxFraction: number): string => {
  const [whole, fraction = ''] = value.split('.')
  const trimmed = fraction.slice(0, maxFraction).replace(/0+$/, '')
  return trimmed ? `${whole}.${trimmed}` : whole
}

/** Exact token amount in display units, at most `maxFraction` decimals, no trailing zeros. */
export const formatTokenAmount = (
  amount: Amount,
  decimals = 18,
  maxFraction = 4,
): string =>
  amount === null || amount === undefined
    ? '…'
    : trimFraction(
        ethers.utils.formatUnits(String(amount), decimals),
        maxFraction,
      )

/** "300 sDAI" */
export const tokenText = (amount: Amount, decimals: number, symbol: string) =>
  `${formatTokenAmount(amount, decimals)} ${symbol}`

/** "36 xDAI" */
export const nativeText = (amount: Amount, currency: string) =>
  `${formatTokenAmount(amount, 18, 5)} ${currency}`

/** Basis-point multiplier applied to a wei amount; the contract divides by 10 000. */
export const MULTIPLIER_DIVISOR = 10_000n

export const applyMultiplier = (
  amount: Amount,
  multiplier: string | number | null | undefined,
  divisor: bigint = MULTIPLIER_DIVISOR,
): bigint => {
  if (amount === null || amount === undefined || divisor === 0n) return 0n
  return (BigInt(String(amount)) * BigInt(String(multiplier ?? 0))) / divisor
}

/** "50%" for a basis-point multiplier. */
export const multiplierPercent = (
  multiplier: string | number | null | undefined,
): string => `${Number(multiplier ?? 0) / 100}%`

/* ---------- Form chrome ---------- */

/** Wraps the shared formik forms so their fields sit on the design tokens. */
export const FormBlock = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  .ui-form-item {
    margin-bottom: 12px;
  }

  label,
  .ui-form-item-label {
    color: var(--color-text);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
    font-weight: 500;
  }

  input,
  textarea,
  .ui-select-trigger {
    border-radius: var(--radius) !important;
    border-color: var(--color-border) !important;
    background: var(--color-surface) !important;
    color: var(--color-text) !important;
  }

  input:focus,
  textarea:focus {
    border-color: var(--color-primary) !important;
  }

  textarea {
    min-height: 96px;
    resize: vertical;
  }
`

export const PolicyText = styled.a`
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`
