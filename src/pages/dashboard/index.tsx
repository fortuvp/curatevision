import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import styled, { css, keyframes } from 'styled-components'
import { Button, Pagination } from 'components/ui'
import { CurateIcon, CurateIconName } from 'components/curate/icons'
import { NETWORKS, NETWORKS_INFO } from 'config/networks'
import { parseIpfs } from 'utils/ipfs-parse'
import useDocumentHead from 'hooks/use-document-head'
import { fetchDashboardData, formatAgo, formatCompact, formatWei } from './data'
import StakeTag from 'assets/images/logo-stake-tag.svg'
import {
  DashboardActivity,
  DashboardRegistry,
  DashboardUser,
  RegistryKind,
  TrustStatus,
} from './types'

const SUPPORTED_CHAIN_IDS: number[] = [
  NETWORKS.ethereum,
  NETWORKS.gnosis,
  NETWORKS.sepolia,
]

type ChainFilter = 'all' | number
type RegistrySort = 'signal' | 'activity' | 'items' | 'recent'
type TrustFilter = 'all' | TrustStatus
type KindFilter = 'all' | RegistryKind
type ViewMode = 'list' | 'cards'
const REGISTRY_PAGE_SIZE = 15

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`

const DashboardPage = styled.main`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px var(--horizontal-padding) 60px;
  color: var(--v2-text);
`

const HeaderGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 376px;
  gap: 18px;
  align-items: stretch;

  @media (max-width: 1080px) {
    grid-template-columns: 1fr;
  }
`

const Surface = styled.div<{ $padded?: boolean }>`
  position: relative;
  overflow: hidden;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);

  &::before {
    content: none;
  }

  &::after {
    content: none;
  }

  & > * {
    position: relative;
    z-index: 1;
  }

  ${({ $padded }) =>
    $padded &&
    css`
      padding: 18px;
    `}
`

const HeaderPanel = styled(Surface)`
  min-height: 260px;
  padding: clamp(22px, 3.4vw, 34px);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background:
    radial-gradient(
      circle at 72% 20%,
      rgba(72, 185, 255, 0.18),
      transparent 30%
    ),
    radial-gradient(
      circle at 42% 55%,
      rgba(255, 79, 216, 0.12),
      transparent 34%
    ),
    linear-gradient(135deg, rgba(7, 9, 20, 0.98), rgba(2, 3, 10, 0.96));
  border-top: 5px solid var(--v2-blue);

  &::before {
    content: none;
  }
`

const HeaderContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 820px;
`

const Kicker = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  color: var(--v2-blue);
  background: var(--v2-blue-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
`

const Pulse = styled.span<{ $tone?: 'success' | 'warning' | 'danger' }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $tone }) =>
    $tone === 'success'
      ? 'var(--curate-success)'
      : $tone === 'warning'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : 'var(--curate-live)'};
  box-shadow: 0 0 18px currentColor;
`

const Title = styled.h1`
  margin: 18px 0 10px;
  color: var(--v2-text);
  font-size: clamp(30px, 4.6vw, 48px);
  line-height: 1.12;
  font-weight: 600;
  letter-spacing: 0;
`

const Subtitle = styled.p`
  max-width: 760px;
  margin: 0;
  color: var(--v2-muted);
  font-size: clamp(15px, 1.5vw, 18px);
  line-height: 1.64;
`

const HeaderActions = styled.div`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
`

const CreatorSubline = styled.div`
  width: 100%;
  margin-top: 2px;
  color: var(--v2-faint);
  font-size: 13px;
  line-height: 1.5;

  a {
    color: var(--v2-blue);
    font-weight: 700;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
`

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1 1 360px;
  max-width: 560px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  color: var(--v2-muted);
  background: var(--v2-card);
  box-shadow: none;
  transition:
    border-color 160ms ease,
    background 160ms ease;

  &:focus-within {
    border-color: var(--v2-blue);
    background: var(--v2-card);
  }

  input {
    width: 100%;
    min-width: 120px;
    border: 0;
    outline: 0;
    color: var(--v2-text);
    background: transparent;
    font-size: 14px;
    font-weight: 650;
  }

  input::placeholder {
    color: var(--v2-faint);
  }
`

const ExplorerSearch = styled(SearchBox)`
  max-width: 440px;
  min-height: 42px;
  flex: 1 1 300px;
  border-radius: 3px;
`

const ClearSearchButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  color: var(--v2-muted);
  background: var(--v2-card);
  cursor: pointer;

  &:hover {
    color: var(--v2-text);
    border-color: var(--v2-blue);
    background: var(--v2-blue-soft);
  }
`

const StatusConsole = styled(Surface)`
  min-height: 294px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const ConsoleHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--v2-stroke);
`

const ConsoleTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  color: var(--v2-text);
  font-size: 15px;
  font-weight: 600;
`

const ConsoleHint = styled.span`
  color: var(--v2-faint);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const ConsoleGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
`

const ConsoleStat = styled.div`
  min-height: 86px;
  padding: 12px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-soft);
`

const ConsoleValue = styled.div`
  overflow: hidden;
  color: var(--v2-text);
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
`

const ConsoleLabel = styled.div`
  margin-top: 8px;
  color: var(--v2-faint);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const ChainDepth = styled.div`
  display: grid;
  gap: 10px;
  margin-top: auto;
`

const ChainDepthRow = styled.div`
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr) 42px;
  gap: 10px;
  align-items: center;
  color: var(--v2-muted);
  font-size: 12px;
  font-weight: 750;
`

const DepthTrack = styled.div`
  position: relative;
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: var(--v2-stroke);
`

const DepthBar = styled.div<{ $width: number; $color?: string }>`
  width: ${({ $width }) => `${Math.max(4, Math.min(100, $width))}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ $color }) => $color || 'var(--curate-live)'};
  box-shadow: 0 0 18px ${({ $color }) => $color || 'var(--curate-live)'};
`

const MetricStrip = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;

  @media (max-width: 680px) {
    grid-template-columns: 1fr;
  }
`

const MetricCard = styled(Surface)`
  min-height: 116px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

const MetricTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`

const MetricIcon = styled.div<{
  $tone?: 'live' | 'success' | 'warning' | 'danger' | 'violet'
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
          : $tone === 'violet'
            ? 'var(--curate-violet)'
            : 'var(--curate-live)'};
  background: color-mix(in srgb, currentColor 12%, transparent);
`

const MetricTrend = styled.span<{ $tone?: 'up' | 'flat' | 'warn' }>`
  color: ${({ $tone }) =>
    $tone === 'up'
      ? 'var(--curate-success)'
      : $tone === 'warn'
        ? 'var(--curate-warning)'
        : 'var(--curate-faint)'};
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const MetricValue = styled.div`
  overflow: hidden;
  margin-top: 16px;
  color: var(--v2-text);
  font-size: clamp(22px, 2.5vw, 31px);
  font-weight: 700;
  line-height: 1;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
`

const MetricLabel = styled.div`
  margin-top: 7px;
  color: var(--v2-faint);
  font-size: 11px;
  font-weight: 850;
  letter-spacing: 0.07em;
  text-transform: uppercase;
`

const DashboardGrid = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 392px;
  gap: 18px;
  margin-top: 18px;

  @media (max-width: 1180px) {
    grid-template-columns: 1fr;
  }
`

const MarketPanel = styled(Surface)`
  min-width: 0;
`

const PanelTop = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--v2-stroke);

  @media (max-width: 860px) {
    flex-direction: column;
  }
`

const PanelTitleBlock = styled.div`
  min-width: 0;
`

const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--v2-text);
  font-size: 19px;
  font-weight: 600;
`

const PanelSub = styled.div`
  margin-top: 6px;
  color: var(--v2-muted);
  font-size: 13px;
  line-height: 1.45;
`

const ControlCluster = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
`

const Segmented = styled.div`
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 3px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-card);
`

const Segment = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 28px;
  padding: 0 10px;
  border: 0;
  border-radius: 9px;
  color: ${({ $active }) => ($active ? 'var(--v2-text)' : 'var(--v2-muted)')};
  background: ${({ $active }) =>
    $active ? 'var(--v2-blue-soft)' : 'transparent'};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition:
    color 160ms ease,
    background 160ms ease;

  &:hover {
    color: var(--v2-text);
    background: var(--v2-soft);
  }
`

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.075);
`

const BoardShell = styled.div`
  display: grid;
  gap: 8px;
  padding: 18px;
`

const BoardRow = styled(Link)<{ $verified?: boolean }>`
  display: grid;
  grid-template-columns:
    minmax(280px, 1fr)
    minmax(100px, max-content)
    minmax(110px, max-content)
    minmax(216px, max-content)
    max-content;
  gap: clamp(12px, 2vw, 32px);
  align-items: center;
  min-height: 64px;
  padding: 0 32px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  color: inherit;
  text-decoration: none;
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;

  &:hover {
    transform: translateY(-1px);
    background: var(--v2-soft);
    border-color: var(--v2-blue);
  }

  @media (max-width: 980px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
    padding: 16px;
  }
`

const RegistryCell = styled.div`
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  min-width: 0;
`

const RegistryAvatar = styled.div<{ $color?: string; $image?: string | null }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border: 1px solid var(--v2-stroke);
  border-radius: 24px;
  color: ${({ $color }) => $color || 'var(--v2-blue)'};
  background: ${({ $image }) =>
    $image ? `url(${$image}) center / contain no-repeat` : 'var(--v2-soft)'};
  flex: 0 0 auto;
`

const RegistryName = styled.div`
  min-width: 0;
`

const RegistryTitle = styled.div`
  overflow: hidden;
  color: var(--v2-text);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RegistryMeta = styled.div`
  overflow: hidden;
  margin-top: 4px;
  color: var(--v2-muted);
  font-size: 12px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Chip = styled.span<{
  $tone?: 'success' | 'warning' | 'danger' | 'live' | 'violet' | 'neutral'
  $color?: string
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: fit-content;
  max-width: 100%;
  min-height: 28px;
  padding: 0 10px;
  border: 1px solid currentColor;
  border-radius: 3px;
  color: ${({ $tone, $color }) =>
    $color ||
    ($tone === 'success'
      ? 'var(--curate-success)'
      : $tone === 'warning'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : $tone === 'violet'
            ? 'var(--curate-violet)'
            : $tone === 'live'
              ? 'var(--curate-live)'
              : 'var(--curate-muted)')};
  background: color-mix(in srgb, currentColor 11%, transparent);
  font-size: 11px;
  font-weight: 600;
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

const Numeric = styled.div<{ $tone?: 'success' | 'warning' | 'danger' }>`
  color: ${({ $tone }) =>
    $tone === 'success'
      ? 'var(--curate-success)'
      : $tone === 'warning'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : 'var(--curate-text)'};
  font-size: 13px;
  font-weight: 850;
  font-variant-numeric: tabular-nums;
`

const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 24px;
  padding: 24px;

  @media (max-width: 720px) {
    padding: 16px;
  }
`

const MarketCard = styled(Link)`
  height: 274px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  color: inherit;
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
  text-decoration: none;
  transition:
    border-color 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: var(--v2-blue);
    box-shadow: var(--v2-shadow-hover);
  }
`

const CardVisual = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  background: var(--v2-card);

  &::after {
    content: none;
  }
`

const CardImage = styled.img`
  width: 125px;
  height: 125px;
  object-fit: contain;
  border-radius: 62.5px;
`

const RegistryArtworkAvatar = styled(RegistryAvatar)`
  position: relative;
  z-index: 1;
  width: 125px;
  height: 125px;
  border: 0;
  border-radius: 62.5px;
  color: var(--v2-text);
  box-shadow: none;

  svg {
    width: 30px;
    height: 30px;
  }
`

const CardBody = styled.div`
  display: contents;
`

const CardHead = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;
  text-align: center;
`

const CardMetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 0;
`

const CardDescription = styled.p`
  display: none;
`

const CardStats = styled.div`
  display: none;
`

const CardChipRow = styled.div`
  display: none;
`

const CardStat = styled.div`
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--v2-stroke);
  border-radius: 3px;
  background: var(--v2-soft);
`

const CardStatValue = styled.div`
  overflow: hidden;
  color: var(--v2-text);
  font-size: 15px;
  font-weight: 700;
  text-overflow: ellipsis;
  font-variant-numeric: tabular-nums;
`

const CardStatLabel = styled.div`
  margin-top: 4px;
  color: var(--v2-faint);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const SideRail = styled.div`
  display: grid;
  gap: 14px;
  align-content: start;
`

const SidePanel = styled(Surface)`
  padding: 15px;
`

const SideHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
`

const SideTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 0;
  color: var(--curate-text);
  font-size: 15px;
  font-weight: 900;
`

const SideHint = styled.span`
  color: var(--curate-faint);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
`

const ActivityLink = styled(Link)`
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 62px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.065);
  color: inherit;
  text-decoration: none;

  &:first-child {
    border-top: 0;
  }

  &:hover ${RegistryTitle} {
    color: var(--curate-live);
  }
`

const ActivityIcon = styled.div<{
  $tone?: 'success' | 'warning' | 'danger' | 'live'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
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
  background: color-mix(in srgb, currentColor 10%, transparent);
`

const ActivityCopy = styled.div`
  min-width: 0;
`

const ActivityTitle = styled.div`
  overflow: hidden;
  color: var(--curate-text);
  font-size: 13px;
  font-weight: 850;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const ActivityMeta = styled.div`
  overflow: hidden;
  margin-top: 4px;
  color: var(--curate-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RankRow = styled(Link)`
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 58px;
  padding: 9px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.065);
  color: inherit;
  text-decoration: none;

  &:first-child {
    border-top: 0;
  }

  &:hover ${ActivityTitle} {
    color: var(--curate-live);
  }
`

const RankNumber = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  color: var(--curate-live);
  background: rgba(0, 163, 255, 0.085);
  font-size: 12px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
`

const EmptyState = styled.div`
  display: grid;
  place-items: center;
  min-height: 190px;
  padding: 24px;
  color: var(--curate-muted);
  text-align: center;
`

const EmptyIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin: 0 auto 12px;
  border: 1px solid rgba(0, 163, 255, 0.24);
  border-radius: 14px;
  color: var(--curate-live);
  background: rgba(0, 163, 255, 0.075);
`

const LoadMoreBar = styled.div`
  display: flex;
  justify-content: center;
  padding: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.075);
`

const EmptyTitle = styled.div`
  margin-bottom: 5px;
  color: var(--curate-text);
  font-size: 15px;
  font-weight: 900;
`

const Skeleton = styled.div<{ $height?: string }>`
  position: relative;
  overflow: hidden;
  min-height: ${({ $height }) => $height || '120px'};
  border-radius: var(--curate-radius);
  background: rgba(255, 255, 255, 0.055);

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.08),
      transparent
    );
    animation: ${shimmer} 1.4s ease-in-out infinite;
  }
`

const SkeletonStack = styled.div`
  display: grid;
  gap: 12px;
  padding: 18px;
`

const MobileBoard = styled.div`
  display: none;
  padding: 14px;

  @media (max-width: 760px) {
    display: grid;
    gap: 12px;
  }
`

const DesktopBoard = styled.div`
  @media (max-width: 760px) {
    display: none;
  }
`

const MobileRegistryCard = styled(Link)`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid rgba(255, 255, 255, 0.085);
  border-radius: 14px;
  color: inherit;
  background: rgba(1, 4, 9, 0.54);
  text-decoration: none;
`

const MobileMetaGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`

const ExternalArrow = styled.span`
  display: inline-flex;
  align-items: center;
  flex-direction: row-reverse;
  gap: 8px;
  color: var(--klerosUIComponentsPrimaryBlue);
  font-size: 14px;
  font-weight: 400;
`

const LargePanelBody = styled.div`
  padding: 18px;
`

const TapeGrid = styled.div`
  display: grid;
  gap: 10px;
`

const TapeRow = styled(Link)`
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) minmax(160px, 0.42fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 70px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 14px;
  color: inherit;
  background: rgba(1, 4, 9, 0.46);
  text-decoration: none;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease;

  &:hover {
    border-color: rgba(0, 163, 255, 0.28);
    background: rgba(255, 255, 255, 0.055);
    transform: translateY(-1px);
  }

  @media (max-width: 820px) {
    grid-template-columns: 38px minmax(0, 1fr) auto;
  }
`

const TapePreview = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;

  @media (max-width: 820px) {
    display: none;
  }
`

const TapePreviewPill = styled.span`
  min-width: 0;
  max-width: 100%;
  padding: 5px 8px;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 999px;
  color: var(--curate-muted);
  background: rgba(0, 0, 0, 0.16);
  font-size: 11px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const shortAddress = (address?: string): string =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'

const chainInfo = (chainId: number) =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]

const registryHref = (registry: DashboardRegistry) =>
  `/tcr/${registry.chainId}/${registry.address}`

const mediaUrl = (uri?: string | null): string | null => {
  if (!uri) return null
  if (/^https?:\/\//i.test(uri)) return uri
  return parseIpfs(uri)
}

const kindLabel = (kind: RegistryKind): string => {
  if (kind === 'light') return 'Light'
  if (kind === 'permanent') return 'Permanent'
  return 'Classic'
}

const kindTone = (
  kind: RegistryKind,
): 'live' | 'violet' | 'warning' | 'neutral' => {
  if (kind === 'light') return 'live'
  if (kind === 'classic') return 'violet'
  return 'warning'
}

const activityIcon = (activity: DashboardActivity): CurateIconName => {
  if (activity.kind === 'challenge') return 'dispute'
  if (activity.kind === 'removal') return 'remove'
  if (activity.kind === 'resolution') return 'court'
  return 'submit'
}

const activityTone = (
  activity: DashboardActivity,
): 'success' | 'warning' | 'danger' | 'live' => {
  if (activity.kind === 'challenge') return 'danger'
  if (activity.kind === 'removal') return 'warning'
  return 'live'
}

const metricBountySummary = (bountyByChain: Record<number, string>): string => {
  const values = Object.entries(bountyByChain)
    .filter(([, value]) => value && BigInt(value) > 0n)
    .map(([chainId, value]) => formatWei(value, Number(chainId)))

  if (values.length === 0) return '0'
  if (values.length === 1) return values[0]
  return values.join(' / ')
}

const patchParams = (
  params: URLSearchParams,
  updates: Record<string, string | null>,
): URLSearchParams => {
  const next = new URLSearchParams(params)
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) next.delete(key)
    else next.set(key, value)
  })
  return next
}

const registrySignalScore = (registry: DashboardRegistry): number => {
  const trust = registry.trustStatus === 'verified' ? 100000 : 0
  const kind =
    registry.kind === 'light'
      ? 16000
      : registry.kind === 'classic'
        ? 12000
        : 7000
  const recent = registry.lastActivityAt
    ? Math.min(6000, registry.lastActivityAt / 1000000)
    : 0
  return (
    trust +
    kind +
    Math.min(registry.activeCount, 300) * 150 +
    Math.min(registry.pendingCount, 200) * 80 +
    Math.min(registry.itemCount, 12000) +
    recent
  )
}

const sortRegistries = (
  registries: DashboardRegistry[],
  sortMode: RegistrySort,
): DashboardRegistry[] => {
  const sorted = [...registries].sort((a, b) => {
    if (sortMode === 'items')
      return (
        b.itemCount - a.itemCount ||
        registrySignalScore(b) - registrySignalScore(a)
      )
    if (sortMode === 'recent')
      return (
        (b.lastActivityAt || 0) - (a.lastActivityAt || 0) ||
        registrySignalScore(b) - registrySignalScore(a)
      )
    if (sortMode === 'activity')
      return (
        b.activeCount - a.activeCount ||
        b.pendingCount - a.pendingCount ||
        registrySignalScore(b) - registrySignalScore(a)
      )
    return registrySignalScore(b) - registrySignalScore(a)
  })

  if (sortMode !== 'signal') return sorted

  const kindOrder: RegistryKind[] = ['light', 'classic', 'permanent']
  const groups = kindOrder.map((kind) =>
    sorted.filter((registry) => registry.kind === kind),
  )
  const balanced: DashboardRegistry[] = []
  while (groups.some((group) => group.length > 0))
    for (const group of groups) {
      const next = group.shift()
      if (next) balanced.push(next)
    }

  return balanced
}

const includesSearch = (
  normalizedSearch: string,
  values: Array<string | number | null | undefined>,
) =>
  !normalizedSearch ||
  values
    .filter((value) => value !== null && value !== undefined)
    .some((value) => String(value).toLowerCase().includes(normalizedSearch))

const registryMatchesSearch = (
  registry: DashboardRegistry,
  normalizedSearch: string,
) =>
  includesSearch(normalizedSearch, [
    registry.title,
    registry.description,
    registry.address,
    shortAddress(registry.address),
    kindLabel(registry.kind),
    chainInfo(registry.chainId)?.name,
    registry.trustStatus,
  ])

const validTrustFilter = (value: string | null): TrustFilter =>
  value === 'verified' || value === 'unverified' ? value : 'all'

const validKindFilter = (value: string | null): KindFilter =>
  value === 'classic' || value === 'light' || value === 'permanent'
    ? value
    : 'all'

const validSort = (value: string | null): RegistrySort =>
  value === 'activity' || value === 'items' || value === 'recent'
    ? value
    : 'signal'

const validView = (value: string | null): ViewMode =>
  value === 'list' ? 'list' : 'cards'

const RegistryStatusStrip = styled.div<{
  $status: DashboardRegistry['trustStatus']
  $compact?: boolean
  $reserveBadge?: boolean
}>`
  display: ${({ $compact, $reserveBadge }) =>
    $compact && $reserveBadge ? 'inline-grid' : 'flex'};
  grid-template-columns: ${({ $compact, $reserveBadge }) =>
    $compact && $reserveBadge ? '96px max-content' : 'none'};
  align-items: center;
  justify-content: ${({ $compact }) =>
    $compact ? 'flex-start' : 'space-between'};
  gap: 12px;
  min-width: ${({ $compact, $reserveBadge }) =>
    $compact && $reserveBadge ? '196px' : '0'};
  height: ${({ $compact }) => ($compact ? 'auto' : '44px')};
  padding: ${({ $compact }) => ($compact ? '0' : '0 24px')};
  border-top: ${({ $compact, $status }) =>
    $compact
      ? '0'
      : `5px solid ${
          $status === 'verified'
            ? 'var(--klerosUIComponentsSuccess)'
            : 'var(--klerosUIComponentsPrimaryBlue)'
        }`};
  border-radius: ${({ $compact }) => ($compact ? '0' : '3px 3px 0 0')};
  background: ${({ $compact, $status }) =>
    $compact
      ? 'transparent'
      : $status === 'verified'
        ? 'var(--klerosUIComponentsSuccessLight)'
        : 'var(--klerosUIComponentsMediumBlue)'};
  color: ${({ $status }) =>
    $status === 'verified'
      ? 'var(--klerosUIComponentsSuccess)'
      : 'var(--klerosUIComponentsPrimaryBlue)'};

  label {
    display: inline-flex;
    align-items: center;
    flex: 0 0 auto;
    margin: 0;
    color: currentColor;
    font-size: 14px;
    line-height: 18px;
    white-space: nowrap;
  }

  label::before {
    content: '';
    flex: 0 0 auto;
    width: 8px;
    height: 8px;
    margin-right: 8px;
    border-radius: 50%;
    background: currentColor;
  }
`

const RegistryLogo = ({ registry }: { registry: DashboardRegistry }) => {
  const info = chainInfo(registry.chainId)
  const image = mediaUrl(registry.logoURI)
  return (
    <RegistryAvatar $color={info?.color} $image={image}>
      {!image && <CurateIcon name="registry" size={20} />}
    </RegistryAvatar>
  )
}

const StakeCurateTag = styled(StakeTag)`
  display: inline-flex;
  width: 96px;
  height: 16px;
  flex-shrink: 0;

  ${({ theme }) =>
    theme.name === 'dark' &&
    `
    path[fill="#EBD4FF"] {
      fill: ${theme.stakeTagBg};
    }
    path[fill="#220050"] {
      fill: ${theme.stakeTagText};
    }
  `}
`

const RegistryStatusBadgeSlot = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 96px;
  min-width: 96px;
`

const RegistryIdentity = ({ registry }: { registry: DashboardRegistry }) => {
  const info = chainInfo(registry.chainId)
  return (
    <RegistryCell>
      <RegistryLogo registry={registry} />
      <RegistryName>
        <RegistryTitle>{registry.title}</RegistryTitle>
        <RegistryMeta>
          {registry.description ||
            `${shortAddress(registry.address)} on ${info?.name || registry.chainId}`}
        </RegistryMeta>
      </RegistryName>
    </RegistryCell>
  )
}

const RegistryBoardRow = ({ registry }: { registry: DashboardRegistry }) => {
  const info = chainInfo(registry.chainId)
  return (
    <BoardRow
      to={registryHref(registry)}
      $verified={registry.trustStatus === 'verified'}
    >
      <RegistryIdentity registry={registry} />
      <ChainChip $color={info?.color}>
        {info?.name || registry.chainId}
      </ChainChip>
      <Numeric>{formatCompact(registry.itemCount)} items</Numeric>
      <RegistryStatusStrip
        $status={registry.trustStatus}
        $compact
        $reserveBadge
      >
        <RegistryStatusBadgeSlot>
          {registry.kind === 'permanent' && (
            <StakeCurateTag aria-label="Stake Curate" />
          )}
        </RegistryStatusBadgeSlot>
        <label>
          {registry.trustStatus === 'verified' ? 'Verified' : 'Unverified'}
        </label>
      </RegistryStatusStrip>
      <ExternalArrow>
        Open
        <CurateIcon
          name="chevron-down"
          size={16}
          style={{ transform: 'rotate(-90deg)' }}
        />
      </ExternalArrow>
    </BoardRow>
  )
}

const RegistryCard = ({ registry }: { registry: DashboardRegistry }) => {
  const info = chainInfo(registry.chainId)
  const image = mediaUrl(registry.logoURI)
  return (
    <MarketCard to={registryHref(registry)}>
      <RegistryStatusStrip $status={registry.trustStatus}>
        <label>
          {registry.trustStatus === 'verified' ? 'Verified' : 'Unverified'}
        </label>
        {registry.kind === 'permanent' && (
          <StakeCurateTag aria-label="Stake Curate" />
        )}
      </RegistryStatusStrip>
      <CardVisual>
        {image ? (
          <CardImage src={image} alt={`${registry.title} logo`} />
        ) : (
          <RegistryArtworkAvatar $color={info?.color}>
            <CurateIcon name="registry" size={28} />
          </RegistryArtworkAvatar>
        )}
        <CardHead>
          <RegistryName>
            <RegistryTitle>{registry.title}</RegistryTitle>
            <RegistryMeta>
              {formatCompact(registry.itemCount)} items
            </RegistryMeta>
          </RegistryName>
        </CardHead>
        <CardMetaRow>
          <ChainChip $color={info?.color}>
            {info?.name || registry.chainId}
          </ChainChip>
          <Chip $tone={kindTone(registry.kind)}>
            {kindLabel(registry.kind)}
          </Chip>
        </CardMetaRow>
      </CardVisual>
      <CardBody>
        <CardDescription>
          {registry.description ||
            `${kindLabel(registry.kind)} registry on ${
              info?.name || 'Curate'
            }.`}
        </CardDescription>
        <CardChipRow>
          <Chip $tone={registry.pendingCount > 0 ? 'warning' : 'neutral'}>
            {registry.pendingCount > 0
              ? `${formatCompact(registry.pendingCount)} pending`
              : 'No pending'}
          </Chip>
        </CardChipRow>
        <CardStats>
          <CardStat>
            <CardStatValue>{formatCompact(registry.itemCount)}</CardStatValue>
            <CardStatLabel>Items</CardStatLabel>
          </CardStat>
          <CardStat>
            <CardStatValue>{formatCompact(registry.activeCount)}</CardStatValue>
            <CardStatLabel>30d flow</CardStatLabel>
          </CardStat>
          <CardStat>
            <CardStatValue>
              {formatCompact(registry.disputeCount)}
            </CardStatValue>
            <CardStatLabel>Disputes</CardStatLabel>
          </CardStat>
        </CardStats>
      </CardBody>
    </MarketCard>
  )
}

const ActivityPanel = ({
  title,
  hint,
  icon,
  activities,
  empty,
}: {
  title: string
  hint: string
  icon: CurateIconName
  activities: DashboardActivity[]
  empty: string
}) => (
  <SidePanel>
    <SideHeader>
      <SideTitle>
        <CurateIcon name={icon} size={17} />
        {title}
      </SideTitle>
      <SideHint>{hint}</SideHint>
    </SideHeader>
    {activities.length > 0 ? (
      <ActivityList>
        {activities.slice(0, 8).map((activity) => {
          const info = chainInfo(activity.chainId)
          return (
            <ActivityLink key={activity.id} to={activity.href}>
              <ActivityIcon $tone={activityTone(activity)}>
                <CurateIcon name={activityIcon(activity)} size={16} />
              </ActivityIcon>
              <ActivityCopy>
                <ActivityTitle>{activity.status}</ActivityTitle>
                <ActivityMeta>
                  {activity.registryTitle} | {shortAddress(activity.actor)} |{' '}
                  {formatAgo(activity.timestamp)}
                </ActivityMeta>
              </ActivityCopy>
              <ChainChip $color={info?.color}>
                {info?.name?.replace('Ethereum', 'Eth') || activity.chainId}
              </ChainChip>
            </ActivityLink>
          )
        })}
      </ActivityList>
    ) : (
      <EmptyState>
        <div>
          <EmptyIcon>
            <CurateIcon name={icon} size={21} />
          </EmptyIcon>
          <EmptyTitle>{empty}</EmptyTitle>
          Subgraph data is unavailable or no matching events were indexed yet.
        </div>
      </EmptyState>
    )}
  </SidePanel>
)

const UsersPanel = ({ users }: { users: DashboardUser[] }) => (
  <SidePanel>
    <SideHeader>
      <SideTitle>
        <CurateIcon name="user" size={17} />
        Top curators
      </SideTitle>
      <SideHint>30d</SideHint>
    </SideHeader>
    {users.length > 0 ? (
      <ActivityList>
        {users.slice(0, 7).map((user, index) => {
          const chainEntries = Object.entries(user.chains).sort(
            ([, a], [, b]) =>
              b.activity - a.activity || b.lastActiveAt - a.lastActiveAt,
          )
          const info = chainInfo(Number(chainEntries[0]?.[0] ?? user.chainId))
          const chainLabel =
            chainEntries.length > 1
              ? `${chainEntries.length} chains`
              : info?.name?.replace('Ethereum', 'Eth') || user.chainId
          return (
            <RankRow key={user.address} to={`/address/${user.address}`}>
              <RankNumber>{index + 1}</RankNumber>
              <ActivityCopy>
                <ActivityTitle>{shortAddress(user.address)}</ActivityTitle>
                <ActivityMeta>
                  {user.submissions} submissions | {user.challenges} challenges
                  | {formatAgo(user.lastActiveAt)}
                </ActivityMeta>
              </ActivityCopy>
              <ChainChip $color={info?.color}>{chainLabel}</ChainChip>
            </RankRow>
          )
        })}
      </ActivityList>
    ) : (
      <EmptyState>
        <div>
          <EmptyIcon>
            <CurateIcon name="user" size={21} />
          </EmptyIcon>
          <EmptyTitle>No curator activity</EmptyTitle>
          Rankings appear once requests or challenges are indexed.
        </div>
      </EmptyState>
    )}
  </SidePanel>
)

const LiveTapePanel = ({ activities }: { activities: DashboardActivity[] }) => (
  <MarketPanel id="live-entry-tape">
    <PanelTop>
      <PanelTitleBlock>
        <PanelTitle>
          <CurateIcon name="submit" size={19} />
          Live Entry Tape
        </PanelTitle>
        <PanelSub>
          Fresh entries across every registry, with the registry, chain, actor,
          and key item fields visible at a glance.
        </PanelSub>
      </PanelTitleBlock>
    </PanelTop>
    <LargePanelBody>
      {activities.length > 0 ? (
        <TapeGrid>
          {activities.slice(0, 16).map((activity) => {
            const info = chainInfo(activity.chainId)
            return (
              <TapeRow key={activity.id} to={activity.href}>
                <ActivityIcon $tone={activityTone(activity)}>
                  <CurateIcon name={activityIcon(activity)} size={17} />
                </ActivityIcon>
                <ActivityCopy>
                  <ActivityTitle>{activity.status}</ActivityTitle>
                  <ActivityMeta>
                    {activity.registryTitle} | {shortAddress(activity.actor)} |{' '}
                    {formatAgo(activity.timestamp)}
                  </ActivityMeta>
                </ActivityCopy>
                <TapePreview>
                  {(activity.previewProps ?? []).length > 0 ? (
                    activity.previewProps?.map((prop) => (
                      <TapePreviewPill
                        key={`${activity.id}-${prop.label}`}
                        title={`${prop.label}: ${prop.value}`}
                      >
                        {prop.label}: {prop.value}
                      </TapePreviewPill>
                    ))
                  ) : (
                    <TapePreviewPill>{activity.registryTitle}</TapePreviewPill>
                  )}
                </TapePreview>
                <ChainChip $color={info?.color}>
                  {info?.name?.replace('Ethereum', 'Eth') || activity.chainId}
                </ChainChip>
              </TapeRow>
            )
          })}
        </TapeGrid>
      ) : (
        <EmptyState>
          <div>
            <EmptyIcon>
              <CurateIcon name="submit" size={21} />
            </EmptyIcon>
            <EmptyTitle>No live entries yet</EmptyTitle>
            Subgraph data is unavailable or no recent entries were indexed.
          </div>
        </EmptyState>
      )}
    </LargePanelBody>
  </MarketPanel>
)

const UnverifiedPanel = ({
  registries,
}: {
  registries: DashboardRegistry[]
}) => (
  <SidePanel>
    <SideHeader>
      <SideTitle>
        <CurateIcon name="shield" size={17} />
        Unverified launchpad
      </SideTitle>
      <SideHint>Discovery</SideHint>
    </SideHeader>
    {registries.length > 0 ? (
      <ActivityList>
        {registries.slice(0, 7).map((registry) => {
          const info = chainInfo(registry.chainId)
          return (
            <RankRow key={registry.id} to={registryHref(registry)}>
              <RegistryLogo registry={registry} />
              <ActivityCopy>
                <ActivityTitle>{registry.title}</ActivityTitle>
                <ActivityMeta>
                  {kindLabel(registry.kind)} | {shortAddress(registry.address)}{' '}
                  | {formatCompact(registry.itemCount)} items
                </ActivityMeta>
              </ActivityCopy>
              <ChainChip $color={info?.color}>
                {info?.name?.replace('Ethereum', 'Eth') || registry.chainId}
              </ChainChip>
            </RankRow>
          )
        })}
      </ActivityList>
    ) : (
      <EmptyState>
        <div>
          <EmptyIcon>
            <CurateIcon name="verified" size={21} />
          </EmptyIcon>
          <EmptyTitle>No unverified registries</EmptyTitle>
          New unverified registries will surface here.
        </div>
      </EmptyState>
    )}
  </SidePanel>
)

const Dashboard = () => {
  useDocumentHead(
    'The verification layer | Kleros Curate',
    'Discover Kleros Curate registries, live entries, disputes, curators, and verification activity across Ethereum, Gnosis, and Sepolia.',
  )
  const [searchParams, setSearchParams] = useSearchParams()
  const chainParam = searchParams.get('chain')
  const chainFilter: ChainFilter =
    chainParam && SUPPORTED_CHAIN_IDS.includes(Number(chainParam))
      ? Number(chainParam)
      : 'all'
  const trustFilter = validTrustFilter(searchParams.get('trust'))
  const kindFilter = validKindFilter(searchParams.get('kind'))
  const sortMode = validSort(searchParams.get('sort'))
  const viewMode = validView(searchParams.get('view'))
  const search = searchParams.get('q') || ''
  const [registryPage, setRegistryPage] = useState(1)

  const dashboardQuery = useQuery({
    queryKey: ['curateDashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  const data = dashboardQuery.data

  const chainStats = useMemo(() => {
    const registries = data?.registries ?? []
    const maxItems = Math.max(
      1,
      ...SUPPORTED_CHAIN_IDS.map((chainId) =>
        registries
          .filter((registry) => registry.chainId === chainId)
          .reduce((sum, registry) => sum + registry.itemCount, 0),
      ),
    )

    return SUPPORTED_CHAIN_IDS.map((chainId) => {
      const chainRegistries = registries.filter(
        (registry) => registry.chainId === chainId,
      )
      const items = chainRegistries.reduce(
        (sum, registry) => sum + registry.itemCount,
        0,
      )
      return {
        chainId,
        registries: chainRegistries.length,
        items,
        active: chainRegistries.reduce(
          (sum, registry) => sum + registry.activeCount,
          0,
        ),
        width: (items / maxItems) * 100,
      }
    })
  }, [data])

  const filteredRegistries = useMemo(() => {
    if (!data) return []
    const normalizedSearch = search.trim().toLowerCase()
    const filtered = data.registries.filter((registry) => {
      if (chainFilter !== 'all' && registry.chainId !== chainFilter)
        return false
      if (trustFilter !== 'all' && registry.trustStatus !== trustFilter)
        return false
      if (kindFilter !== 'all' && registry.kind !== kindFilter) return false
      return registryMatchesSearch(registry, normalizedSearch)
    })
    return sortRegistries(filtered, sortMode)
  }, [chainFilter, data, kindFilter, search, sortMode, trustFilter])

  const filteredActivities = useMemo(() => {
    if (!data) return []
    const normalizedSearch = search.trim().toLowerCase()
    return data.activities.filter((activity) => {
      if (chainFilter !== 'all' && activity.chainId !== chainFilter)
        return false
      return includesSearch(normalizedSearch, [
        activity.status,
        activity.registryTitle,
        activity.actor,
        activity.kind,
        chainInfo(activity.chainId)?.name,
        ...(activity.previewProps ?? []).flatMap((prop) => [
          prop.label,
          prop.value,
        ]),
      ])
    })
  }, [chainFilter, data, search])

  const filteredUsers = useMemo(() => {
    if (!data) return []
    const normalizedSearch = search.trim().toLowerCase()
    return data.users.filter((user) =>
      includesSearch(normalizedSearch, [
        user.address,
        shortAddress(user.address),
        user.chainId,
        chainInfo(user.chainId)?.name,
        ...Object.keys(user.chains).map(
          (chainId) => chainInfo(Number(chainId))?.name,
        ),
      ]),
    )
  }, [data, search])

  useEffect(() => {
    setRegistryPage(1)
  }, [chainFilter, kindFilter, search, sortMode, trustFilter, viewMode])

  const registryPageCount = Math.max(
    1,
    Math.ceil(filteredRegistries.length / REGISTRY_PAGE_SIZE),
  )
  const currentRegistryPage = Math.min(registryPage, registryPageCount)
  const visibleRegistries = filteredRegistries.slice(
    (currentRegistryPage - 1) * REGISTRY_PAGE_SIZE,
    currentRegistryPage * REGISTRY_PAGE_SIZE,
  )

  const unverifiedRegistries = useMemo(
    () =>
      sortRegistries(
        (data?.registries ?? []).filter((registry) => {
          if (registry.trustStatus === 'verified') return false
          const normalizedSearch = search.trim().toLowerCase()
          return registryMatchesSearch(registry, normalizedSearch)
        }),
        'signal',
      ).slice(0, 10),
    [data, search],
  )

  const createChainId =
    chainFilter === 'all' ? NETWORKS.gnosis : Number(chainFilter)

  const updateParams = (updates: Record<string, string | null>) => {
    setSearchParams(patchParams(searchParams, updates), { replace: true })
  }

  const scrollToSection = (id: string) => {
    document.querySelector(`#${id}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <DashboardPage>
      <HeaderGrid>
        <HeaderPanel>
          <HeaderContent>
            <Kicker>
              <Pulse />
              Live registry verification
            </Kicker>
            <Title>Submit. Verify. Earn.</Title>
            <Subtitle>
              Gain credibility by submitting. Earn rewards when you successfully
              challenge incorrect or malicious entries.
            </Subtitle>
          </HeaderContent>
          <HeaderActions>
            <Button
              type="primary"
              size="large"
              onClick={() => scrollToSection('registry-explorer')}
            >
              <CurateIcon name="registry" size={18} />
              Browse registries
            </Button>
            <Button
              size="large"
              onClick={() => scrollToSection('live-entry-tape')}
            >
              <CurateIcon name="activity" size={18} />
              View recent entries
            </Button>
            <CreatorSubline>
              Secure your own dataset with open verification.{' '}
              <Link to={`/launch/${createChainId}`}>Launch a list.</Link>
            </CreatorSubline>
          </HeaderActions>
        </HeaderPanel>

        <StatusConsole>
          <ConsoleHeader>
            <ConsoleTitle>
              <CurateIcon name="activity" size={17} />
              Network pulse
            </ConsoleTitle>
            <ConsoleHint>
              {data
                ? `Updated ${formatAgo(Math.floor(data.generatedAt / 1000))}`
                : 'Loading'}
            </ConsoleHint>
          </ConsoleHeader>
          {dashboardQuery.isLoading || !data ? (
            <Skeleton $height="226px" />
          ) : (
            <>
              <ConsoleGrid>
                <ConsoleStat>
                  <ConsoleValue>
                    {formatCompact(data.metrics.registries)}
                  </ConsoleValue>
                  <ConsoleLabel>Registries</ConsoleLabel>
                </ConsoleStat>
                <ConsoleStat>
                  <ConsoleValue>
                    {formatCompact(data.metrics.verifiedRegistries)}
                  </ConsoleValue>
                  <ConsoleLabel>Verified</ConsoleLabel>
                </ConsoleStat>
                <ConsoleStat>
                  <ConsoleValue>
                    {formatCompact(data.metrics.curatedItems)}
                  </ConsoleValue>
                  <ConsoleLabel>Total items</ConsoleLabel>
                </ConsoleStat>
                <ConsoleStat>
                  <ConsoleValue>
                    {formatCompact(data.metrics.curators)}
                  </ConsoleValue>
                  <ConsoleLabel>Curators</ConsoleLabel>
                </ConsoleStat>
              </ConsoleGrid>
              <ChainDepth>
                {chainStats.map((stat) => {
                  const info = chainInfo(stat.chainId)
                  return (
                    <ChainDepthRow key={stat.chainId}>
                      <span>{info?.name || stat.chainId}</span>
                      <DepthTrack>
                        <DepthBar $width={stat.width} $color={info?.color} />
                      </DepthTrack>
                      <span>{formatCompact(stat.items)}</span>
                    </ChainDepthRow>
                  )
                })}
              </ChainDepth>
            </>
          )}
        </StatusConsole>
      </HeaderGrid>

      {dashboardQuery.isLoading || !data ? (
        <MetricStrip>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} $height="116px" />
          ))}
        </MetricStrip>
      ) : (
        <MetricStrip>
          <MetricCard>
            <MetricTop>
              <MetricIcon $tone="warning">
                <CurateIcon name="challenge" size={17} />
              </MetricIcon>
              <MetricTrend $tone="warn">Open</MetricTrend>
            </MetricTop>
            <div>
              <MetricValue>
                {formatCompact(data.metrics.activeVerification)}
              </MetricValue>
              <MetricLabel>Active verification</MetricLabel>
            </div>
          </MetricCard>
          <MetricCard>
            <MetricTop>
              <MetricIcon $tone="danger">
                <CurateIcon name="dispute" size={17} />
              </MetricIcon>
              <MetricTrend $tone="flat">Cases</MetricTrend>
            </MetricTop>
            <div>
              <MetricValue>{formatCompact(data.metrics.disputes)}</MetricValue>
              <MetricLabel>Disputes created</MetricLabel>
            </div>
          </MetricCard>
          <MetricCard>
            <MetricTop>
              <MetricIcon $tone="success">
                <CurateIcon name="bounty" size={17} />
              </MetricIcon>
              <MetricTrend $tone="up">Estimated</MetricTrend>
            </MetricTop>
            <div>
              <MetricValue>
                {metricBountySummary(data.metrics.bountyByChain)}
              </MetricValue>
              <MetricLabel>Bounties distributed</MetricLabel>
            </div>
          </MetricCard>
        </MetricStrip>
      )}

      <DashboardGrid>
        <LiveTapePanel activities={filteredActivities} />
        <SideRail>
          <UsersPanel users={filteredUsers} />
          <UnverifiedPanel registries={unverifiedRegistries} />
        </SideRail>
      </DashboardGrid>

      <DashboardGrid>
        <MarketPanel id="registry-explorer">
          <PanelTop>
            <PanelTitleBlock>
              <PanelTitle>
                <CurateIcon name="registry" size={19} />
                Registry explorer
              </PanelTitle>
              <PanelSub>
                Showing{' '}
                {filteredRegistries.length === 0
                  ? 0
                  : (currentRegistryPage - 1) * REGISTRY_PAGE_SIZE + 1}
                -
                {Math.min(
                  currentRegistryPage * REGISTRY_PAGE_SIZE,
                  filteredRegistries.length,
                )}{' '}
                of {filteredRegistries.length} matching registries. Default
                ranking balances classic, light, and permanent registries.
              </PanelSub>
            </PanelTitleBlock>
            <ControlCluster>
              <Segmented>
                <Segment
                  $active={viewMode === 'list'}
                  aria-label={
                    viewMode === 'list'
                      ? 'Switch to grid view'
                      : 'Switch to list view'
                  }
                  onClick={() =>
                    updateParams({
                      view: viewMode === 'list' ? null : 'list',
                    })
                  }
                  title={
                    viewMode === 'list'
                      ? 'Switch to grid view'
                      : 'Switch to list view'
                  }
                >
                  <CurateIcon
                    name={viewMode === 'list' ? 'grid' : 'list'}
                    size={16}
                  />
                </Segment>
              </Segmented>
            </ControlCluster>
          </PanelTop>

          <FilterBar>
            <ExplorerSearch>
              <CurateIcon name="search" size={17} />
              <input
                aria-label="Search registry explorer"
                placeholder="Search by name, address, chain, or type"
                value={search}
                onChange={(event) =>
                  updateParams({ q: event.currentTarget.value || null })
                }
              />
              {search && (
                <ClearSearchButton
                  type="button"
                  aria-label="Clear dashboard search"
                  onClick={() => updateParams({ q: null })}
                >
                  <CurateIcon name="close" size={14} />
                </ClearSearchButton>
              )}
            </ExplorerSearch>
            <ControlCluster>
              <Segmented>
                {(['all', 'verified', 'unverified'] as TrustFilter[]).map(
                  (trust) => (
                    <Segment
                      key={trust}
                      $active={trustFilter === trust}
                      onClick={() =>
                        updateParams({
                          trust: trust === 'all' ? null : trust,
                        })
                      }
                    >
                      {trust}
                    </Segment>
                  ),
                )}
              </Segmented>
              <Segmented>
                {(['all', 'light', 'classic', 'permanent'] as KindFilter[]).map(
                  (kind) => (
                    <Segment
                      key={kind}
                      $active={kindFilter === kind}
                      onClick={() =>
                        updateParams({ kind: kind === 'all' ? null : kind })
                      }
                    >
                      {kind}
                    </Segment>
                  ),
                )}
              </Segmented>
            </ControlCluster>
            <Segmented>
              {(
                ['signal', 'activity', 'items', 'recent'] as RegistrySort[]
              ).map((sort) => (
                <Segment
                  key={sort}
                  $active={sortMode === sort}
                  onClick={() =>
                    updateParams({ sort: sort === 'signal' ? null : sort })
                  }
                >
                  {sort}
                </Segment>
              ))}
            </Segmented>
          </FilterBar>

          {dashboardQuery.isLoading ? (
            <SkeletonStack>
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} $height="76px" />
              ))}
            </SkeletonStack>
          ) : filteredRegistries.length > 0 ? (
            viewMode === 'cards' ? (
              <>
                <CardGrid>
                  {visibleRegistries.map((registry) => (
                    <RegistryCard key={registry.id} registry={registry} />
                  ))}
                </CardGrid>
                {filteredRegistries.length > REGISTRY_PAGE_SIZE && (
                  <LoadMoreBar>
                    <Pagination
                      current={currentRegistryPage}
                      pageSize={REGISTRY_PAGE_SIZE}
                      total={filteredRegistries.length}
                      onChange={setRegistryPage}
                    />
                  </LoadMoreBar>
                )}
              </>
            ) : (
              <>
                <DesktopBoard>
                  <BoardShell>
                    {visibleRegistries.map((registry) => (
                      <RegistryBoardRow key={registry.id} registry={registry} />
                    ))}
                  </BoardShell>
                </DesktopBoard>
                <MobileBoard>
                  {visibleRegistries.map((registry) => {
                    const info = chainInfo(registry.chainId)
                    return (
                      <MobileRegistryCard
                        key={registry.id}
                        to={registryHref(registry)}
                      >
                        <RegistryIdentity registry={registry} />
                        <ControlCluster
                          style={{ justifyContent: 'flex-start' }}
                        >
                          <ChainChip $color={info?.color}>
                            {info?.name || registry.chainId}
                          </ChainChip>
                          <Chip $tone={kindTone(registry.kind)}>
                            {kindLabel(registry.kind)}
                          </Chip>
                          {registry.kind === 'permanent' && (
                            <StakeCurateTag aria-label="Stake Curate" />
                          )}
                          <Chip
                            $tone={
                              registry.trustStatus === 'verified'
                                ? 'success'
                                : 'neutral'
                            }
                          >
                            {registry.trustStatus === 'verified'
                              ? 'Verified'
                              : 'Unverified'}
                          </Chip>
                        </ControlCluster>
                        <MobileMetaGrid>
                          <CardStat>
                            <CardStatValue>
                              {formatCompact(registry.itemCount)}
                            </CardStatValue>
                            <CardStatLabel>Items</CardStatLabel>
                          </CardStat>
                          <CardStat>
                            <CardStatValue>
                              {formatCompact(registry.activeCount)}
                            </CardStatValue>
                            <CardStatLabel>30d</CardStatLabel>
                          </CardStat>
                          <CardStat>
                            <CardStatValue>
                              {formatCompact(registry.disputeCount)}
                            </CardStatValue>
                            <CardStatLabel>Disputes</CardStatLabel>
                          </CardStat>
                        </MobileMetaGrid>
                      </MobileRegistryCard>
                    )
                  })}
                </MobileBoard>
                {filteredRegistries.length > REGISTRY_PAGE_SIZE && (
                  <LoadMoreBar>
                    <Pagination
                      current={currentRegistryPage}
                      pageSize={REGISTRY_PAGE_SIZE}
                      total={filteredRegistries.length}
                      onChange={setRegistryPage}
                    />
                  </LoadMoreBar>
                )}
              </>
            )
          ) : (
            <EmptyState>
              <div>
                <EmptyIcon>
                  <CurateIcon name="filter" size={21} />
                </EmptyIcon>
                <EmptyTitle>No registries match this view</EmptyTitle>
                Adjust search, chain, type, status, or sort filters.
              </div>
            </EmptyState>
          )}
        </MarketPanel>

        <SideRail>
          <ActivityPanel
            title="Dispute tape"
            hint="Cases"
            icon="dispute"
            activities={data?.disputes ?? []}
            empty="No disputes found"
          />
        </SideRail>
      </DashboardGrid>
    </DashboardPage>
  )
}

export default Dashboard
