import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { CurateIcon, CurateIconName } from './icons'

export const pageMaxWidth = '1440px'

const shimmer = keyframes`
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
`

export const AppSurface = styled.div`
  min-height: 100%;
  color: var(--curate-text);
`

export const Page = styled.main`
  width: 100%;
  max-width: ${pageMaxWidth};
  margin: 0 auto;
  padding: 28px var(--horizontal-padding) 56px;

  @media (max-width: 720px) {
    padding-top: 18px;
    padding-bottom: 36px;
  }
`

export const Section = styled.section<{ $compact?: boolean }>`
  margin-top: ${({ $compact }) => ($compact ? '18px' : '28px')};
`

export const Surface = styled.div<{
  $interactive?: boolean
  $tone?: 'soft' | 'strong'
}>`
  position: relative;
  overflow: hidden;
  background: ${({ $tone }) =>
    $tone === 'strong' ? 'var(--curate-card)' : 'var(--curate-panel)'};
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  box-shadow: var(--curate-shadow);
  backdrop-filter: blur(24px);
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;

  ${({ $interactive }) =>
    $interactive &&
    css`
      cursor: pointer;

      &:hover {
        border-color: var(--curate-border-strong);
        transform: translateY(-2px);
        box-shadow: var(--curate-shadow-hover);
      }
    `}
`

export const DashboardHero = styled(Surface)`
  min-height: 310px;
  padding: clamp(24px, 4vw, 44px);
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: clamp(24px, 5vw, 52px);
  align-items: stretch;

  &::before {
    content: '';
    position: absolute;
    inset: -35% -15% auto auto;
    width: 620px;
    height: 620px;
    background:
      radial-gradient(circle, rgba(76, 201, 240, 0.16), transparent 55%),
      radial-gradient(
        circle at 35% 35%,
        rgba(108, 161, 255, 0.18),
        transparent 45%
      );
    pointer-events: none;
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

export const Eyebrow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 28px;
  padding: 6px 10px;
  border: 1px solid rgba(0, 163, 255, 0.24);
  border-radius: 999px;
  background: rgba(0, 163, 255, 0.08);
  color: var(--curate-live);
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export const LiveDot = styled.span<{
  $tone?: 'live' | 'verified' | 'warning' | 'danger'
}>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ $tone }) =>
    $tone === 'verified'
      ? 'var(--curate-success)'
      : $tone === 'warning'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : 'var(--curate-live)'};
  box-shadow: 0 0 18px currentColor;
`

export const HeroTitle = styled.h1`
  margin: 18px 0 12px;
  max-width: 880px;
  color: var(--curate-text);
  font-size: clamp(44px, 7vw, 82px);
  line-height: 0.96;
  font-weight: 900;
  letter-spacing: 0;
`

export const HeroCopy = styled.p`
  margin: 0;
  max-width: 740px;
  color: var(--curate-muted);
  font-size: clamp(16px, 2vw, 19px);
  line-height: 1.65;
`

export const ActionRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 24px;
`

export const SearchShell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid var(--curate-border);
  border-radius: 18px;
  background: var(--curate-field);
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.045);
  color: var(--curate-muted);
  transition:
    border-color 160ms ease,
    background 160ms ease;

  &:focus-within {
    border-color: var(--curate-border-strong);
    background: rgba(2, 6, 12, 0.92);
  }

  input {
    width: 100%;
    min-width: 160px;
    border: 0;
    outline: 0;
    color: var(--curate-text);
    background: transparent;
    font-size: 14px;
  }

  input::placeholder {
    color: var(--curate-faint);
  }
`

export const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 1180px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 680px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

export const MetricTile = styled(Surface)`
  min-height: 134px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`

export const MetricIcon = styled.div<{
  $tone?: 'live' | 'success' | 'warning' | 'danger' | 'violet'
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid currentColor;
  border-radius: 13px;
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

  svg {
    color: currentColor;
  }
`

export const MetricValue = styled.div`
  margin-top: 18px;
  color: var(--curate-text);
  font-size: 30px;
  line-height: 1;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
`

export const MetricLabel = styled.div`
  margin-top: 7px;
  color: var(--curate-muted);
  font-size: 12px;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

export const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 16px;
`

export const PanelTitle = styled.h2`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  color: var(--curate-text);
  font-size: 18px;
  font-weight: 800;
`

export const PanelHint = styled.span`
  color: var(--curate-faint);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
`

export const Segmented = styled.div`
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 4px;
  border: 1px solid var(--curate-border);
  border-radius: 14px;
  background: rgba(3, 6, 14, 0.58);
`

export const SegmentButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  color: ${({ $active }) =>
    $active ? 'var(--curate-text)' : 'var(--curate-muted)'};
  background: ${({ $active }) =>
    $active ? 'rgba(255, 255, 255, 0.11)' : 'transparent'};
  cursor: pointer;
  font-size: 12px;
  font-weight: 750;
  transition:
    background 160ms ease,
    color 160ms ease;

  &:hover {
    color: var(--curate-text);
    background: rgba(255, 255, 255, 0.08);
  }
`

export const RegistryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

export const RegistryCardShell = styled(Surface).attrs({ $interactive: true })`
  min-height: 360px;
  display: flex;
  flex-direction: column;
`

export const CardMedia = styled.div<{ $image?: string | null }>`
  position: relative;
  min-height: 154px;
  background:
    linear-gradient(180deg, transparent 0%, rgba(3, 6, 14, 0.72) 100%),
    ${({ $image }) =>
      $image
        ? `url(${$image}) center / cover`
        : 'radial-gradient(circle at 30% 20%, rgba(76, 201, 240, 0.22), transparent 42%), radial-gradient(circle at 78% 40%, rgba(124, 92, 255, 0.28), transparent 38%), #101622'};
`

export const CardBody = styled.div`
  padding: 18px;
  display: flex;
  flex: 1;
  flex-direction: column;
`

export const CardTitle = styled.h3`
  margin: 0;
  color: var(--curate-text);
  font-size: 18px;
  line-height: 1.25;
  font-weight: 800;
`

export const CardDescription = styled.p`
  margin: 9px 0 0;
  color: var(--curate-muted);
  font-size: 13px;
  line-height: 1.55;
`

export const CardStats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
  padding-top: 18px;
`

export const StatBox = styled.div`
  min-width: 0;
  padding: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  background: rgba(3, 6, 14, 0.48);
`

export const StatValue = styled.div`
  color: var(--curate-text);
  font-size: 16px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const StatLabel = styled.div`
  margin-top: 4px;
  color: var(--curate-faint);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`

export const ListPanel = styled(Surface)`
  padding: 18px;
`

export const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
`

export const ActivityRow = styled.a`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  min-height: 62px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: inherit;
  text-decoration: none;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    color: var(--curate-text);
  }
`

export const RowTitle = styled.div`
  color: var(--curate-text);
  font-size: 14px;
  font-weight: 750;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const RowMeta = styled.div`
  margin-top: 4px;
  color: var(--curate-muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const StatusPill = styled.span<{
  $tone?: 'verified' | 'unverified' | 'pending' | 'danger' | 'live' | 'neutral'
}>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 26px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid;
  white-space: nowrap;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ $tone }) =>
    $tone === 'verified'
      ? 'var(--curate-success)'
      : $tone === 'pending'
        ? 'var(--curate-warning)'
        : $tone === 'danger'
          ? 'var(--curate-danger)'
          : $tone === 'live'
            ? 'var(--curate-live)'
            : $tone === 'unverified'
              ? 'var(--curate-muted)'
              : 'var(--curate-text)'};
  background: currentColor;
  border-color: currentColor;
  box-shadow: inset 0 0 0 999px rgba(3, 6, 14, 0.88);
`

export const ChainChip = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--curate-border);
  border-radius: 999px;
  color: var(--curate-text);
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  font-weight: 750;

  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${({ $color }) => $color || 'var(--curate-live)'};
    box-shadow: 0 0 14px ${({ $color }) => $color || 'var(--curate-live)'};
  }
`

export const IconButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--curate-border);
  border-radius: 12px;
  color: ${({ $active }) =>
    $active ? 'var(--curate-text)' : 'var(--curate-muted)'};
  background: ${({ $active }) =>
    $active ? 'rgba(255, 255, 255, 0.11)' : 'rgba(255, 255, 255, 0.04)'};
  cursor: pointer;
  transition: all 160ms ease;

  &:hover {
    color: var(--curate-text);
    border-color: var(--curate-border-strong);
    background: rgba(255, 255, 255, 0.1);
  }
`

export const DataTable = styled.div`
  overflow: hidden;
  border: 1px solid var(--curate-border);
  border-radius: var(--curate-radius);
  background: rgba(3, 6, 14, 0.44);
`

export const TableRow = styled.a<{ $header?: boolean }>`
  display: grid;
  grid-template-columns: minmax(230px, 1fr) 104px 104px 112px 120px;
  gap: 12px;
  align-items: center;
  min-height: ${({ $header }) => ($header ? '42px' : '66px')};
  padding: 0 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: ${({ $header }) =>
    $header ? 'var(--curate-faint)' : 'var(--curate-text)'};
  text-decoration: none;
  font-size: ${({ $header }) => ($header ? '11px' : '13px')};
  font-weight: ${({ $header }) => ($header ? 850 : 650)};
  letter-spacing: ${({ $header }) => ($header ? '0.08em' : 0)};
  text-transform: ${({ $header }) => ($header ? 'uppercase' : 'none')};

  &:last-child {
    border-bottom: 0;
  }

  &:not([aria-disabled='true']):hover {
    background: rgba(255, 255, 255, 0.04);
  }

  @media (max-width: 920px) {
    grid-template-columns: minmax(220px, 1fr) 92px 92px;

    > :nth-child(4),
    > :nth-child(5) {
      display: none;
    }
  }
`

export const SkeletonBlock = styled.div<{ $height?: string }>`
  position: relative;
  overflow: hidden;
  min-height: ${({ $height }) => $height || '120px'};
  border-radius: var(--curate-radius);
  background: rgba(255, 255, 255, 0.06);

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

export const EmptyState = styled(Surface)`
  padding: 34px 24px;
  text-align: center;
  color: var(--curate-muted);
`

export const EmptyTitle = styled.h3`
  margin: 12px 0 6px;
  color: var(--curate-text);
  font-size: 18px;
`

export const IconBadge = ({
  icon,
  tone = 'live',
}: {
  icon: CurateIconName
  tone?: 'live' | 'success' | 'warning' | 'danger' | 'violet'
}) => (
  <MetricIcon $tone={tone}>
    <CurateIcon name={icon} size={19} />
  </MetricIcon>
)
