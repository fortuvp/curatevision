import React, { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { getPublicClient, simulateContract } from '@wagmi/core'
import { useAccount, useWalletClient } from 'wagmi'
import { formatEther, isAddress, parseEther } from 'viem'
import type { Abi } from 'viem'
import { useAtlasProvider } from '@kleros/kleros-app'
import classicAbi from 'assets/abis/GeneralizedTCR.json'
import lightAbi from 'assets/abis/LightGeneralizedTCR.json'
import permanentAbi from 'assets/abis/PermanentGTCR.json'
import { Button, Modal } from 'components/ui'
import { CurateIcon, CurateIconName } from 'components/curate/icons'
import EnsureAuth from 'components/ensure-auth'
import { NETWORKS_INFO } from 'config/networks'
import { klerosAddresses } from 'config/tcr-addresses'
import { wagmiConfig } from 'config/wagmi'
import { useEthersProvider } from 'hooks/ethers-adapters'
import useCourtPolicies from 'hooks/use-court-policies'
import useDocumentHead from 'hooks/use-document-head'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { jurorsAndCourtIDFromExtraData } from 'utils/string'
import { JSON_UPLOAD_ROLE } from 'utils/atlas-roles'
import {
  chainName,
  fetchAddressProfileData,
  GovernanceParams,
  GovernedRegistry,
  profileUpdatedLabel,
} from './data'
import {
  formatAgo,
  formatCompact,
  normalizeAddress,
  shortAddress,
} from 'pages/dashboard/data'
import { DashboardActivity, RegistryKind } from 'pages/dashboard/types'

const Page = styled.main`
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  padding: 24px var(--horizontal-padding) 56px;
  color: var(--curate-text);
`

const Surface = styled.section`
  overflow: hidden;
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.055),
      rgba(255, 255, 255, 0.02)
    ),
    rgba(7, 11, 18, 0.9);
  box-shadow: var(--curate-shadow);
`

const Hero = styled(Surface)`
  min-height: 270px;
  padding: clamp(22px, 4vw, 38px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 20px;
  align-items: end;
  background:
    linear-gradient(120deg, rgba(7, 11, 18, 0.98), rgba(10, 18, 28, 0.92)),
    #070b12;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(0, 209, 255, 0.24);
  border-radius: 999px;
  color: var(--curate-live);
  background: rgba(0, 209, 255, 0.075);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 18px 0 10px;
  color: var(--curate-text);
  font-size: clamp(38px, 5.6vw, 70px);
  line-height: 0.98;
  font-weight: 900;
  letter-spacing: 0;
  overflow-wrap: anywhere;
`

const Subtitle = styled.p`
  max-width: 760px;
  margin: 0;
  color: var(--curate-muted);
  font-size: 16px;
  line-height: 1.65;
`

const HeroCard = styled.div`
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  background: rgba(1, 4, 9, 0.56);
`

const Grid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 18px;
  margin-top: 18px;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr;
  }
`

const MetricGrid = styled.section`
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const Metric = styled(Surface)`
  min-height: 112px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const MetricTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--curate-muted);
`

const MetricIcon = styled.div<{
  $tone?: 'live' | 'success' | 'warning' | 'danger'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid currentColor;
  border-radius: 10px;
  color: ${({ $tone }) =>
    $tone === 'success'
      ? 'var(--curate-success)'
      : $tone === 'warning'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : 'var(--curate-live)'};
  background: color-mix(in srgb, currentColor 11%, transparent);
`

const MetricValue = styled.div`
  margin-top: 12px;
  color: var(--curate-text);
  font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 900;
  line-height: 1;
  font-variant-numeric: tabular-nums;
`

const MetricLabel = styled.div`
  margin-top: 7px;
  color: var(--curate-faint);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`

const PanelTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding: 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.075);

  @media (max-width: 720px) {
    flex-direction: column;
  }
`

const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--curate-text);
  font-size: 18px;
  font-weight: 900;
`

const PanelSub = styled.div`
  margin-top: 6px;
  color: var(--curate-muted);
  font-size: 13px;
  line-height: 1.45;
`

const ActivityList = styled.div`
  display: grid;
  gap: 0;
`

const ActivityRow = styled(Link)`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 72px;
  padding: 12px 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.065);
  color: inherit;
  text-decoration: none;

  &:first-child {
    border-top: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.045);
  }
`

const IconBox = styled.div<{
  $tone?: 'live' | 'success' | 'warning' | 'danger'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid currentColor;
  border-radius: 11px;
  color: ${({ $tone }) =>
    $tone === 'success'
      ? 'var(--curate-success)'
      : $tone === 'warning'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : 'var(--curate-live)'};
  background: color-mix(in srgb, currentColor 10%, transparent);
`

const RowTitle = styled.div`
  overflow: hidden;
  color: var(--curate-text);
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RowMeta = styled.div`
  overflow: hidden;
  margin-top: 4px;
  color: var(--curate-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Chip = styled.span<{
  $color?: string
  $tone?: 'success' | 'warning' | 'danger' | 'live' | 'neutral'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: fit-content;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid currentColor;
  border-radius: 999px;
  color: ${({ $color, $tone }) =>
    $color ||
    ($tone === 'success'
      ? 'var(--curate-success)'
      : $tone === 'warning'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : $tone === 'live'
            ? 'var(--curate-live)'
            : 'var(--curate-muted)')};
  background: color-mix(in srgb, currentColor 11%, transparent);
  font-size: 11px;
  font-weight: 850;
  white-space: nowrap;
`

const ChainChip = styled(Chip)`
  &::before {
    content: '';
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
    box-shadow: 0 0 12px currentColor;
  }
`

const BadgeGrid = styled.div`
  display: grid;
  gap: 10px;
`

const BadgeCard = styled.div<{ $earned?: boolean }>`
  padding: 13px;
  border: 1px solid
    ${({ $earned }) =>
      $earned ? 'rgba(22, 241, 149, 0.28)' : 'rgba(255, 255, 255, 0.075)'};
  border-radius: 14px;
  background: ${({ $earned }) =>
    $earned ? 'rgba(22, 241, 149, 0.075)' : 'rgba(1, 4, 9, 0.5)'};
`

const ProgressTrack = styled.div`
  overflow: hidden;
  height: 7px;
  margin-top: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.075);
`

const ProgressBar = styled.div<{ $width: number }>`
  width: ${({ $width }) => `${Math.max(3, Math.min(100, $width))}%`};
  height: 100%;
  border-radius: inherit;
  background: var(--curate-live);
  box-shadow: 0 0 16px var(--curate-live);
`

const GovernanceList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding: 18px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`

const RegistryGovernanceCard = styled.div`
  min-height: 220px;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 16px;
  background: rgba(1, 4, 9, 0.45);
`

const RegistryHead = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;

  @media (max-width: 760px) {
    flex-direction: column;
  }
`

const RegistryCardBody = styled.div`
  display: grid;
  gap: 12px;
  padding: 0 14px 14px;
`

const RegistryMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

const RegistryMetaBox = styled.div`
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
`

const RegistryActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: auto;
`

const ProfileTabs = styled.div`
  display: inline-flex;
  gap: 6px;
  margin-top: 18px;
  padding: 5px;
  border: 1px solid var(--curate-border);
  border-radius: 14px;
  background: rgba(1, 4, 9, 0.56);

  @media (max-width: 620px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    width: 100%;
  }
`

const ProfileTabButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid
    ${({ $active }) =>
      $active ? 'rgba(0, 209, 255, 0.34)' : 'rgba(255, 255, 255, 0)'};
  border-radius: 10px;
  color: ${({ $active }) =>
    $active ? 'var(--curate-text)' : 'var(--curate-muted)'};
  background: ${({ $active }) =>
    $active ? 'rgba(0, 209, 255, 0.1)' : 'transparent'};
  cursor: pointer;
  font-size: 13px;
  font-weight: 900;
  transition:
    border-color 160ms ease,
    color 160ms ease,
    background 160ms ease;

  &:hover {
    color: var(--curate-text);
    background: rgba(255, 255, 255, 0.055);
  }
`

const FieldGrid = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
`

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 210px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 46px;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`

const FieldLabel = styled.label`
  color: var(--curate-muted);
  font-size: 12px;
  font-weight: 850;
`

const Input = styled.input`
  min-width: 0;
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 11px;
  color: var(--curate-text);
  background: rgba(0, 0, 0, 0.22);
  font-size: 13px;
  font-weight: 650;

  &:disabled {
    color: var(--curate-muted);
    opacity: 0.7;
  }
`

const SelectInput = styled.select`
  min-width: 0;
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 11px;
  color: var(--curate-text);
  background: rgba(0, 0, 0, 0.22);
  font-size: 13px;
  font-weight: 650;

  &:disabled {
    color: var(--curate-muted);
    opacity: 0.7;
  }
`

const InlineGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 780px) {
    grid-template-columns: 1fr;
  }
`

const FieldHint = styled.div`
  grid-column: 2 / 4;
  margin-top: -5px;
  color: var(--curate-muted);
  font-size: 11px;
  line-height: 1.45;

  @media (max-width: 780px) {
    grid-column: auto;
  }
`

const InlineActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const HiddenFileInput = styled.input`
  display: none;
`

const UploadButtonLabel = styled.label<{ $disabled?: boolean }>`
  min-height: 32px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: ${({ $disabled }) =>
    $disabled ? 'var(--curate-faint)' : 'var(--curate-text)'};
  background: rgba(255, 255, 255, 0.055);
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  font-size: 12px;
  font-weight: 850;
`

const SectionTitle = styled.div`
  margin: 10px 0 2px;
  color: var(--curate-text);
  font-size: 13px;
  font-weight: 900;
`

const Empty = styled.div`
  display: grid;
  place-items: center;
  min-height: 190px;
  padding: 24px;
  color: var(--curate-muted);
  text-align: center;
`

const Skeleton = styled.div<{ $height?: string }>`
  min-height: ${({ $height }) => $height || '120px'};
  border-radius: var(--curate-radius);
  background: rgba(255, 255, 255, 0.055);
`

type ParamKind = 'wei' | 'seconds' | 'raw' | 'address' | 'policy'
type ParamKey = keyof GovernanceParams | 'policyURI'

interface ParamConfig {
  key: ParamKey
  label: string
  kind: ParamKind
  functionName: string
  hint?: string
}

const iconForActivity = (activity: DashboardActivity): CurateIconName => {
  if (activity.kind === 'challenge') return 'dispute'
  if (activity.kind === 'removal') return 'remove'
  return 'submit'
}

const toneForActivity = (
  activity: DashboardActivity,
): 'live' | 'success' | 'warning' | 'danger' => {
  if (activity.kind === 'challenge') return 'danger'
  if (activity.kind === 'removal') return 'warning'
  return 'live'
}

const abiForKind = (kind: RegistryKind): Abi => {
  if (kind === 'light') return lightAbi as Abi
  if (kind === 'permanent') return permanentAbi as Abi
  return classicAbi as Abi
}

const kindLabel = (kind: RegistryKind) => {
  if (kind === 'light') return 'Light'
  if (kind === 'permanent') return 'Permanent'
  return 'Classic'
}

const nativeSymbol = (chainId: number) =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]?.nativeCurrency.symbol ||
  'ETH'

const formatParamValue = (
  value: string | undefined,
  kind: ParamKind,
): string => {
  if (!value) return ''
  if (kind === 'wei')
    try {
      return formatEther(BigInt(value))
    } catch {
      return value
    }
  if (kind === 'seconds') {
    const days = Number(value) / 86400
    return Number.isFinite(days)
      ? new Intl.NumberFormat('en-US', {
          maximumFractionDigits: days >= 10 ? 1 : 3,
        }).format(days)
      : value
  }
  return value
}

const parseParamValue = (value: string, kind: ParamKind) => {
  if (kind === 'wei') return parseEther(value || '0')
  if (kind === 'seconds')
    return BigInt(Math.max(0, Math.round(Number(value || '0') * 86400)))
  if (kind === 'raw') return BigInt(value || '0')
  return value
}

const formatDate = (timestamp?: number) => {
  if (!timestamp) return 'Unavailable'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(timestamp * 1000)
}

const editableParams = (registry: GovernedRegistry): ParamConfig[] => {
  if (registry.kind === 'permanent')
    return [
      {
        key: 'policyURI',
        label: 'MetaEvidence URI',
        kind: 'policy',
        functionName: 'changeArbitrationParams',
        hint: 'Advanced users only: this must point to valid Curate MetaEvidence. A wrong URI may break frontend visualization for this registry.',
      },
      {
        key: 'submissionMinDeposit',
        label: `Submission minimum deposit (${nativeSymbol(registry.chainId)})`,
        kind: 'wei',
        functionName: 'changeSubmissionMinDeposit',
      },
      {
        key: 'submissionPeriod',
        label: 'Submission period (days)',
        kind: 'seconds',
        functionName: 'changeSubmissionPeriod',
      },
      {
        key: 'reinclusionPeriod',
        label: 'Reinclusion period (days)',
        kind: 'seconds',
        functionName: 'changeReinclusionPeriod',
      },
      {
        key: 'withdrawingPeriod',
        label: 'Withdrawal period (days)',
        kind: 'seconds',
        functionName: 'changeWithdrawingPeriod',
      },
      {
        key: 'challengeStakeMultiplier',
        label: 'Challenge stake multiplier',
        kind: 'raw',
        functionName: 'changeChallengeStakeMultiplier',
      },
      {
        key: 'winnerStakeMultiplier',
        label: 'Winner appeal multiplier',
        kind: 'raw',
        functionName: 'changeWinnerStakeMultiplier',
      },
      {
        key: 'loserStakeMultiplier',
        label: 'Loser appeal multiplier',
        kind: 'raw',
        functionName: 'changeLoserStakeMultiplier',
      },
      {
        key: 'sharedStakeMultiplier',
        label: 'Shared appeal multiplier',
        kind: 'raw',
        functionName: 'changeSharedStakeMultiplier',
      },
      {
        key: 'governor',
        label: 'Governor address',
        kind: 'address',
        functionName: 'changeGovernor',
      },
    ]

  return [
    {
      key: 'policyURI',
      label: 'MetaEvidence URI',
      kind: 'policy',
      functionName:
        registry.kind === 'light'
          ? 'changeArbitrationParams'
          : 'changeMetaEvidence',
      hint:
        registry.kind === 'light'
          ? 'Advanced users only: this updates registration and clearing MetaEvidence to the same URI while keeping current arbitration params. A wrong URI may break frontend visualization.'
          : 'Advanced users only: this updates registration and clearing MetaEvidence to the same URI. A wrong URI may break frontend visualization.',
    },
    {
      key: 'submissionBaseDeposit',
      label: `Submission deposit (${nativeSymbol(registry.chainId)})`,
      kind: 'wei',
      functionName: 'changeSubmissionBaseDeposit',
    },
    {
      key: 'submissionChallengeBaseDeposit',
      label: `Submission challenge deposit (${nativeSymbol(registry.chainId)})`,
      kind: 'wei',
      functionName: 'changeSubmissionChallengeBaseDeposit',
    },
    {
      key: 'removalBaseDeposit',
      label: `Removal deposit (${nativeSymbol(registry.chainId)})`,
      kind: 'wei',
      functionName: 'changeRemovalBaseDeposit',
    },
    {
      key: 'removalChallengeBaseDeposit',
      label: `Removal challenge deposit (${nativeSymbol(registry.chainId)})`,
      kind: 'wei',
      functionName: 'changeRemovalChallengeBaseDeposit',
    },
    {
      key: 'challengePeriodDuration',
      label: 'Challenge period (days)',
      kind: 'seconds',
      functionName:
        registry.kind === 'light'
          ? 'changeChallengePeriodDuration'
          : 'changeTimeToChallenge',
    },
    {
      key: 'winnerStakeMultiplier',
      label: 'Winner appeal multiplier',
      kind: 'raw',
      functionName: 'changeWinnerStakeMultiplier',
    },
    {
      key: 'loserStakeMultiplier',
      label: 'Loser appeal multiplier',
      kind: 'raw',
      functionName: 'changeLoserStakeMultiplier',
    },
    {
      key: 'sharedStakeMultiplier',
      label: 'Shared appeal multiplier',
      kind: 'raw',
      functionName: 'changeSharedStakeMultiplier',
    },
    {
      key: 'connectedTCR',
      label: 'Connected TCR address',
      kind: 'address',
      functionName: 'changeConnectedTCR',
      hint: 'Optional contract hook for connected registry flows. Leave untouched unless your list uses one.',
    },
    ...(registry.kind === 'light'
      ? [
          {
            key: 'relayerContract' as ParamKey,
            label: 'Relayer contract address',
            kind: 'address' as ParamKind,
            functionName: 'changeRelayerContract',
            hint: 'Optional relayer for delegated Light Curate submissions.',
          },
        ]
      : []),
    {
      key: 'governor',
      label: 'Governor address',
      kind: 'address',
      functionName: 'changeGovernor',
    },
  ]
}

const buildArgs = (
  registry: GovernedRegistry,
  config: ParamConfig,
  value: string,
) => {
  if (config.kind === 'policy') {
    if (registry.kind === 'classic') return [value, value]
    if (registry.kind === 'light')
      return [
        registry.params?.arbitrator,
        registry.params?.arbitratorExtraData || '0x',
        value,
        value,
      ]
    return [registry.params?.arbitratorExtraData || '0x', value]
  }
  return [parseParamValue(value, config.kind)]
}

const buildArbitratorExtraData = (courtID: string, jurors: string) =>
  `0x${Number(courtID || 0)
    .toString(16)
    .padStart(64, '0')}${Math.max(1, Math.ceil(Number(jurors || 1)))
    .toString(16)
    .padStart(64, '0')}`

const ActivityPanel = ({
  title,
  icon,
  activities,
  empty,
}: {
  title: string
  icon: CurateIconName
  activities: DashboardActivity[]
  empty: string
}) => (
  <Surface>
    <PanelTop>
      <div>
        <PanelTitle>
          <CurateIcon name={icon} size={18} />
          {title}
        </PanelTitle>
        <PanelSub>
          Profile activity across Mainnet, Gnosis, and Sepolia.
        </PanelSub>
      </div>
    </PanelTop>
    {activities.length > 0 ? (
      <ActivityList>
        {activities.slice(0, 18).map((activity) => {
          const info =
            NETWORKS_INFO[activity.chainId as keyof typeof NETWORKS_INFO]
          return (
            <ActivityRow key={activity.id} to={activity.href}>
              <IconBox $tone={toneForActivity(activity)}>
                <CurateIcon name={iconForActivity(activity)} size={17} />
              </IconBox>
              <div>
                <RowTitle>{activity.status}</RowTitle>
                <RowMeta>
                  {activity.registryTitle} | {formatAgo(activity.timestamp)}
                </RowMeta>
              </div>
              <ChainChip $color={info?.color}>
                {info?.name?.replace('Ethereum', 'Eth') || activity.chainId}
              </ChainChip>
            </ActivityRow>
          )
        })}
      </ActivityList>
    ) : (
      <Empty>{empty}</Empty>
    )}
  </Surface>
)

const ArbitrationGovernanceField = ({
  registry,
  editable,
  onSaved,
}: {
  registry: GovernedRegistry
  editable: boolean
  onSaved: () => void
}) => {
  const queryClient = useQueryClient()
  const { data: walletClient } = useWalletClient()
  const chainProvider = useEthersProvider({ chainId: registry.chainId })
  const knownKleros = klerosAddresses[registry.chainId]
  const { data: courts = [] } = useCourtPolicies(
    knownKleros?.policy,
    chainProvider ?? null,
  )
  const [arbitrator, setArbitrator] = useState(
    registry.params?.arbitrator || knownKleros?.arbitrator || '',
  )
  const [extraData, setExtraData] = useState(
    registry.params?.arbitratorExtraData || '0x',
  )
  const [courtID, setCourtID] = useState('')
  const [jurors, setJurors] = useState('3')
  const [registrationMetaEvidence, setRegistrationMetaEvidence] = useState('')
  const [clearingMetaEvidence, setClearingMetaEvidence] = useState('')
  const [metaEvidence, setMetaEvidence] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!extraData || extraData === '0x') return
    const decoded = jurorsAndCourtIDFromExtraData(extraData)
    setCourtID(String(decoded.courtID))
    setJurors(String(decoded.numberOfJurors))
  }, [extraData])

  const updateCourt = (nextCourtID: string) => {
    setCourtID(nextCourtID)
    if (!Number.isNaN(Number(nextCourtID)))
      setExtraData(buildArbitratorExtraData(nextCourtID, jurors))
  }

  const updateJurors = (nextJurors: string) => {
    const normalized = Math.max(1, Math.min(33, Number(nextJurors || 1)))
    const oddJurors = normalized % 2 === 0 ? normalized - 1 : normalized
    setJurors(String(oddJurors))
    if (courtID !== '')
      setExtraData(buildArbitratorExtraData(courtID, String(oddJurors)))
  }

  const save = async () => {
    if (registry.kind !== 'permanent' && !isAddress(arbitrator)) {
      errorToast('Enter a valid arbitrator address.')
      return
    }
    if (
      registry.kind === 'light' &&
      (!registrationMetaEvidence.trim() || !clearingMetaEvidence.trim())
    ) {
      errorToast('Light registries require both MetaEvidence URIs.')
      return
    }
    if (registry.kind === 'permanent' && !metaEvidence.trim()) {
      errorToast('Permanent registries require a MetaEvidence URI.')
      return
    }

    const functionName =
      registry.kind === 'classic'
        ? 'changeArbitrator'
        : 'changeArbitrationParams'
    const args =
      registry.kind === 'classic'
        ? [arbitrator, extraData || '0x']
        : registry.kind === 'light'
          ? [
              arbitrator,
              extraData || '0x',
              registrationMetaEvidence,
              clearingMetaEvidence,
            ]
          : [extraData || '0x', metaEvidence]

    setPending(true)
    try {
      const { request } = await simulateContract(wagmiConfig, {
        chainId: registry.chainId,
        address: registry.address as `0x${string}`,
        abi: abiForKind(registry.kind),
        functionName,
        args,
      } as any)
      const publicClient = getPublicClient(wagmiConfig, {
        chainId: registry.chainId,
      })
      const result = await wrapWithToast(
        () => walletClient!.writeContract(request),
        publicClient!,
      )
      if (result.status) {
        onSaved()
        queryClient.invalidateQueries({
          queryKey: ['addressProfile'],
        })
      }
    } finally {
      setPending(false)
    }
  }

  const disabled = !editable || pending || !walletClient

  return (
    <>
      <SectionTitle>Arbitration and court</SectionTitle>
      <FieldRow>
        <FieldLabel>
          {registry.kind === 'permanent'
            ? 'Court and MetaEvidence'
            : 'Arbitrator and court'}
        </FieldLabel>
        <div style={{ display: 'grid', gap: 10 }}>
          {registry.kind !== 'permanent' && (
            <Input
              value={arbitrator}
              disabled={!editable || pending}
              onChange={(event) => setArbitrator(event.currentTarget.value)}
              placeholder="Arbitrator address"
            />
          )}
          <InlineGrid>
            <SelectInput
              value={courtID}
              disabled={!editable || pending || courts.length === 0}
              onChange={(event) => updateCourt(event.currentTarget.value)}
            >
              <option value="">
                {courts.length > 0 ? 'Select court' : 'Court list unavailable'}
              </option>
              {courts.map((court) => (
                <option key={court.value} value={court.value}>
                  {court.label}
                </option>
              ))}
            </SelectInput>
            <Input
              value={jurors}
              disabled={!editable || pending}
              onChange={(event) => updateJurors(event.currentTarget.value)}
              placeholder="Jurors"
              inputMode="numeric"
            />
          </InlineGrid>
          <Input
            value={extraData}
            disabled
            readOnly
            placeholder="Arbitrator extra data is generated automatically"
          />
          {registry.kind === 'light' && (
            <InlineGrid>
              <Input
                value={registrationMetaEvidence}
                disabled={!editable || pending}
                onChange={(event) =>
                  setRegistrationMetaEvidence(event.currentTarget.value)
                }
                placeholder="Registration MetaEvidence URI"
              />
              <Input
                value={clearingMetaEvidence}
                disabled={!editable || pending}
                onChange={(event) =>
                  setClearingMetaEvidence(event.currentTarget.value)
                }
                placeholder="Clearing MetaEvidence URI"
              />
            </InlineGrid>
          )}
          {registry.kind === 'permanent' && (
            <Input
              value={metaEvidence}
              disabled={!editable || pending}
              onChange={(event) => setMetaEvidence(event.currentTarget.value)}
              placeholder="MetaEvidence URI"
            />
          )}
        </div>
        <Button type="primary" size="small" disabled={disabled} onClick={save}>
          Save
        </Button>
        <FieldHint>
          Court selection rewrites arbitrator extra data automatically. Light
          and permanent contracts update arbitration params together with
          MetaEvidence, so those URIs are required for this transaction.
          MetaEvidence is for advanced users: a wrong URI may break frontend
          visualization for this registry.
        </FieldHint>
      </FieldRow>
    </>
  )
}

const GovernanceField = ({
  registry,
  config,
  editable,
  onSaved,
}: {
  registry: GovernedRegistry
  config: ParamConfig
  editable: boolean
  onSaved: () => void
}) => {
  const { data: walletClient } = useWalletClient()
  const { uploadFile } = useAtlasProvider()
  const [value, setValue] = useState(() =>
    formatParamValue(
      config.key === 'policyURI' ? '' : registry.params?.[config.key],
      config.kind,
    ),
  )
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)

  const disabled =
    !editable ||
    pending ||
    uploading ||
    !walletClient ||
    (config.kind === 'policy' && !value.trim())

  const uploadMetaEvidence = async (file?: File) => {
    if (!file) return
    if (
      file.type !== 'application/json' &&
      !file.name.toLowerCase().endsWith('.json')
    ) {
      errorToast('Upload a MetaEvidence JSON file.')
      return
    }
    setUploading(true)
    try {
      const uri = await uploadFile(file, JSON_UPLOAD_ROLE)
      if (!uri) throw new Error('Atlas upload failed.')
      setValue(uri)
    } catch (err) {
      console.error(err)
      errorToast('MetaEvidence upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (config.kind === 'address' && !isAddress(value)) {
      errorToast('Enter a valid address.')
      return
    }

    const args = buildArgs(registry, config, value)
    if (args.some((arg) => arg === undefined || arg === '')) {
      errorToast('Missing current arbitration parameters for this update.')
      return
    }

    setPending(true)
    try {
      const { request } = await simulateContract(wagmiConfig, {
        chainId: registry.chainId,
        address: registry.address as `0x${string}`,
        abi: abiForKind(registry.kind),
        functionName: config.functionName,
        args,
      } as any)
      const publicClient = getPublicClient(wagmiConfig, {
        chainId: registry.chainId,
      })
      const result = await wrapWithToast(
        () => walletClient!.writeContract(request),
        publicClient!,
      )
      if (result.status) onSaved()
    } finally {
      setPending(false)
    }
  }

  const placeholder =
    config.kind === 'policy'
      ? '/ipfs/... or https://...'
      : config.kind === 'seconds'
        ? 'days'
        : undefined

  return (
    <>
      <FieldRow>
        <FieldLabel>{config.label}</FieldLabel>
        <div style={{ display: 'grid', gap: 8 }}>
          <Input
            value={value}
            placeholder={placeholder}
            disabled={!editable || pending || uploading}
            onChange={(event) => setValue(event.currentTarget.value)}
          />
          {config.kind === 'policy' && (
            <InlineActions>
              <EnsureAuth>
                <UploadButtonLabel
                  $disabled={!editable || pending || uploading}
                >
                  <CurateIcon name="submit" size={14} />
                  {uploading ? 'Uploading...' : 'Upload MetaEvidence JSON'}
                  <HiddenFileInput
                    type="file"
                    accept="application/json,.json"
                    disabled={!editable || pending || uploading}
                    onChange={(event) =>
                      uploadMetaEvidence(event.currentTarget.files?.[0])
                    }
                  />
                </UploadButtonLabel>
              </EnsureAuth>
            </InlineActions>
          )}
        </div>
        <Button type="primary" size="small" disabled={disabled} onClick={save}>
          Save
        </Button>
        {config.hint && <FieldHint>{config.hint}</FieldHint>}
      </FieldRow>
    </>
  )
}

const GovernanceUpdateModal = ({
  registry,
  editable,
  profileAddress,
  onClose,
}: {
  registry: GovernedRegistry | null
  editable: boolean
  profileAddress: string
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  if (!registry) return null

  return (
    <Modal
      visible
      title={`Update ${registry.title}`}
      width="760px"
      footer={null}
      onCancel={onClose}
      destroyOnClose
    >
      <PanelSub style={{ marginTop: 0, marginBottom: 16 }}>
        Changes are sent one parameter at a time and simulated before the wallet
        transaction is requested.
      </PanelSub>
      <FieldGrid style={{ padding: 0 }}>
        <ArbitrationGovernanceField
          registry={registry}
          editable={editable}
          onSaved={() =>
            queryClient.invalidateQueries({
              queryKey: ['addressProfile', profileAddress],
            })
          }
        />
        <SectionTitle>Registry parameters</SectionTitle>
        {editableParams(registry).map((config) => (
          <GovernanceField
            key={`${registry.id}-${config.key}`}
            registry={registry}
            config={config}
            editable={editable}
            onSaved={() =>
              queryClient.invalidateQueries({
                queryKey: ['addressProfile', profileAddress],
              })
            }
          />
        ))}
      </FieldGrid>
    </Modal>
  )
}

const CourtDisplay = ({ registry }: { registry: GovernedRegistry }) => {
  const extraData = registry.params?.arbitratorExtraData
  const knownKleros = klerosAddresses[registry.chainId]
  const chainProvider = useEthersProvider({ chainId: registry.chainId })
  const { data: courts = [] } = useCourtPolicies(
    knownKleros?.policy,
    chainProvider ?? null,
  )

  if (!extraData || extraData === '0x') return <>Unavailable</>

  const decoded = jurorsAndCourtIDFromExtraData(extraData)
  const court = courts.find(
    (item) => String(item.courtID) === String(decoded.courtID),
  )

  return (
    <>
      {court?.label || `Court ${decoded.courtID}`}
      {decoded.numberOfJurors ? ` · ${decoded.numberOfJurors} jurors` : ''}
    </>
  )
}

const GovernancePanel = ({
  registries,
  profileAddress,
}: {
  registries: GovernedRegistry[]
  profileAddress: string
}) => {
  const { address: connectedAddress } = useAccount()
  const [selectedRegistry, setSelectedRegistry] =
    useState<GovernedRegistry | null>(null)
  const connected = normalizeAddress(connectedAddress)
  const isOwner = connected === profileAddress
  const selectedEditable =
    isOwner && normalizeAddress(selectedRegistry?.governor) === connected

  return (
    <Surface>
      <PanelTop>
        <div>
          <PanelTitle>
            <CurateIcon name="policy" size={18} />
            Governed lists
          </PanelTitle>
          <PanelSub>
            Public governance view. Edit controls unlock only for the connected
            governor wallet.
          </PanelSub>
        </div>
        <Chip $tone={isOwner ? 'success' : 'neutral'}>
          {isOwner ? 'Owner view' : 'Public profile'}
        </Chip>
      </PanelTop>
      {registries.length > 0 ? (
        <GovernanceList>
          {registries.map((registry) => {
            const chainInfo =
              NETWORKS_INFO[registry.chainId as keyof typeof NETWORKS_INFO]
            const editable =
              isOwner && normalizeAddress(registry.governor) === connected
            return (
              <RegistryGovernanceCard key={registry.id}>
                <RegistryHead>
                  <div>
                    <RowTitle>{registry.title}</RowTitle>
                    <RowMeta>
                      {shortAddress(registry.address)} |{' '}
                      {kindLabel(registry.kind)}
                    </RowMeta>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <ChainChip $color={chainInfo?.color}>
                      {chainInfo?.name || registry.chainId}
                    </ChainChip>
                    <Chip $tone={editable ? 'success' : 'neutral'}>
                      {editable ? 'Editable' : 'Governed list'}
                    </Chip>
                  </div>
                </RegistryHead>
                <RegistryCardBody>
                  <RegistryMetaGrid>
                    <RegistryMetaBox>
                      <MetricLabel>Created</MetricLabel>
                      <MetricValue style={{ fontSize: 15 }}>
                        {formatDate(registry.createdAt)}
                      </MetricValue>
                    </RegistryMetaBox>
                    <RegistryMetaBox>
                      <MetricLabel>Court</MetricLabel>
                      <MetricValue style={{ fontSize: 15 }}>
                        <CourtDisplay registry={registry} />
                      </MetricValue>
                    </RegistryMetaBox>
                    <RegistryMetaBox>
                      <MetricLabel>Items</MetricLabel>
                      <MetricValue style={{ fontSize: 15 }}>
                        {formatCompact(registry.itemCount)}
                      </MetricValue>
                    </RegistryMetaBox>
                    <RegistryMetaBox>
                      <MetricLabel>Type</MetricLabel>
                      <MetricValue style={{ fontSize: 15 }}>
                        {kindLabel(registry.kind)}
                      </MetricValue>
                    </RegistryMetaBox>
                  </RegistryMetaGrid>
                  <RegistryActions>
                    <Button
                      type="primary"
                      size="small"
                      disabled={!editable}
                      onClick={() => setSelectedRegistry(registry)}
                    >
                      {editable ? 'Update list' : 'Connect governor'}
                    </Button>
                    <Button
                      as={Link as any}
                      to={`/tcr/${registry.chainId}/${registry.address}`}
                      size="small"
                    >
                      Open list
                    </Button>
                  </RegistryActions>
                </RegistryCardBody>
              </RegistryGovernanceCard>
            )
          })}
        </GovernanceList>
      ) : (
        <Empty>
          No governed indexed lists found for this address. Newly indexed lists
          appear here after the profile scan can read their governor.
        </Empty>
      )}
      <GovernanceUpdateModal
        registry={selectedRegistry}
        editable={selectedEditable}
        profileAddress={profileAddress}
        onClose={() => setSelectedRegistry(null)}
      />
    </Surface>
  )
}

type ProfileTab = 'curator' | 'governor'

const AddressPage = () => {
  const params = useParams()
  const address = normalizeAddress(params.address)
  const validAddress = isAddress(address)
  const [activeTab, setActiveTab] = useState<ProfileTab>('curator')
  useDocumentHead(
    validAddress
      ? `${shortAddress(address)} | Curate profile`
      : 'Curate profile | Kleros Curate',
    validAddress
      ? `Curator and governor profile for ${address} across Kleros Curate registries, submissions, challenges, disputes, and governed lists.`
      : 'Explore Kleros Curate address profiles, curator activity, disputes, and governed registries.',
  )

  const profileQuery = useQuery({
    queryKey: ['addressProfile', address],
    queryFn: () => fetchAddressProfileData(address),
    enabled: validAddress,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })

  const data = profileQuery.data

  const chainRows = useMemo(
    () =>
      Object.entries(data?.chainBreakdown ?? {})
        .map(([chainId, stats]) => ({
          chainId: Number(chainId),
          stats,
        }))
        .filter(({ stats }) => stats.activity > 0 || stats.governedLists > 0),
    [data],
  )

  if (!validAddress)
    return (
      <Page>
        <Empty>Invalid address.</Empty>
      </Page>
    )

  return (
    <Page>
      <Hero>
        <div>
          <Eyebrow>
            <CurateIcon name="user" size={15} />
            Curator profile
          </Eyebrow>
          <Title>{shortAddress(address)}</Title>
          <Subtitle>
            Submissions, challenges, disputes, badges, and governed registry
            settings for {address}.
          </Subtitle>
        </div>
        <HeroCard>
          <PanelTitle>
            <CurateIcon name="activity" size={18} />
            Verification footprint
          </PanelTitle>
          <PanelSub>{profileUpdatedLabel(data?.generatedAt)}</PanelSub>
          <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
            {chainRows.length > 0 ? (
              chainRows.map(({ chainId, stats }) => {
                const info =
                  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
                return (
                  <div
                    key={chainId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <ChainChip $color={info?.color}>
                      {chainName(chainId)}
                    </ChainChip>
                    <RowMeta>
                      {stats.activity} actions | {stats.governedLists} lists
                    </RowMeta>
                  </div>
                )
              })
            ) : (
              <RowMeta>Activity will appear once indexed.</RowMeta>
            )}
          </div>
        </HeroCard>
      </Hero>

      {profileQuery.isLoading || !data ? (
        <MetricGrid>
          {Array.from({ length: 7 }).map((_, index) => (
            <Skeleton key={index} $height="112px" />
          ))}
        </MetricGrid>
      ) : (
        <MetricGrid>
          {[
            ['submit', 'Submissions', data.stats.submissions, 'live'],
            ['challenge', 'Challenges', data.stats.challenges, 'danger'],
            ['remove', 'Removals', data.stats.removals, 'warning'],
            ['court', 'Disputes', data.stats.disputes, 'danger'],
            [
              'verified',
              'Won challenges',
              data.stats.successfulChallenges,
              'success',
            ],
            ['registry', 'Governed lists', data.stats.governedLists, 'live'],
            ['activity', 'Total actions', data.stats.activity, 'live'],
          ].map(([icon, label, value, tone]) => (
            <Metric key={String(label)}>
              <MetricTop>
                <MetricIcon $tone={tone as any}>
                  <CurateIcon name={icon as CurateIconName} size={17} />
                </MetricIcon>
              </MetricTop>
              <div>
                <MetricValue>{formatCompact(Number(value))}</MetricValue>
                <MetricLabel>{label}</MetricLabel>
              </div>
            </Metric>
          ))}
        </MetricGrid>
      )}

      <ProfileTabs role="tablist" aria-label="Address profile sections">
        <ProfileTabButton
          type="button"
          role="tab"
          aria-selected={activeTab === 'curator'}
          $active={activeTab === 'curator'}
          onClick={() => setActiveTab('curator')}
        >
          <CurateIcon name="activity" size={16} />
          Curator
        </ProfileTabButton>
        <ProfileTabButton
          type="button"
          role="tab"
          aria-selected={activeTab === 'governor'}
          $active={activeTab === 'governor'}
          onClick={() => setActiveTab('governor')}
        >
          <CurateIcon name="policy" size={16} />
          Governor
        </ProfileTabButton>
      </ProfileTabs>

      {activeTab === 'curator' ? (
        <>
          <Grid>
            <ActivityPanel
              title="Profile activity"
              icon="activity"
              activities={data?.activities ?? []}
              empty="No submissions, removals, or challenges were found for this address."
            />
            <Surface>
              <PanelTop>
                <div>
                  <PanelTitle>
                    <CurateIcon name="spark" size={18} />
                    Badges
                  </PanelTitle>
                  <PanelSub>
                    Badges are calculated across all supported chains.
                  </PanelSub>
                </div>
              </PanelTop>
              <div style={{ padding: 18 }}>
                {data ? (
                  <BadgeGrid>
                    {data.badges.map((badge) => (
                      <BadgeCard key={badge.id} $earned={badge.earned}>
                        <RowTitle>{badge.label}</RowTitle>
                        <RowMeta>
                          {badge.description} | {badge.progress}/{badge.goal}
                        </RowMeta>
                        <ProgressTrack>
                          <ProgressBar
                            $width={(badge.progress / badge.goal) * 100}
                          />
                        </ProgressTrack>
                      </BadgeCard>
                    ))}
                  </BadgeGrid>
                ) : (
                  <Skeleton $height="210px" />
                )}
              </div>
            </Surface>
          </Grid>
          <div style={{ marginTop: 18 }}>
            <ActivityPanel
              title="Dispute history"
              icon="dispute"
              activities={data?.disputes ?? []}
              empty="No previous disputes were found for this address."
            />
          </div>
        </>
      ) : (
        <div style={{ marginTop: 18 }}>
          <GovernancePanel
            registries={data?.governedRegistries ?? []}
            profileAddress={address}
          />
        </div>
      )}
    </Page>
  )
}

export default AddressPage
