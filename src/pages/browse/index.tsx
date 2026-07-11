import React, { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { Dropdown, Pagination, Select, Tooltip } from 'components/ui'
import { CurateIcon } from 'components/curate/icons'
import ChainLogo from 'components/chain-logo'
import StakeTag from 'assets/images/logo-stake-tag.svg'
import { NETWORKS, NETWORKS_INFO } from 'config/networks'
import { VERIFIED_LIST_OF_LISTS_ADDRESSES } from 'config/list-of-lists'
import useDocumentHead from 'hooks/use-document-head'
import { parseIpfs } from 'utils/ipfs-parse'
import {
  fetchDashboardData,
  formatAgo,
  formatCompact,
} from 'pages/dashboard/data'
import {
  DashboardActivity,
  DashboardRegistry,
  RegistryKind,
} from 'pages/dashboard/types'

type ViewMode = 'cards' | 'list'
type RegistryMode = 'verified' | 'unverified'
type SortMode =
  | 'recent-submission'
  | 'recent-creation'
  | 'activity'
  | 'items'
  | 'disputes'
  | 'name'

const PAGE_SIZE = 15
const CHAINS = [NETWORKS.ethereum, NETWORKS.gnosis, NETWORKS.sepolia]

const Page = styled.main`
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px var(--horizontal-padding) 64px;
  color: var(--v2-text);
`

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 440px);
  gap: 18px;
  align-items: stretch;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--v2-stroke);

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`

const HeroCopy = styled.div`
  min-height: 270px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: clamp(24px, 4vw, 44px);
  border-top: 5px solid var(--v2-blue);
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
`

const Eyebrow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--v2-blue);
  font-size: 11px;
  font-weight: 850;
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 16px 0 12px;
  color: var(--v2-text);
  font-size: clamp(34px, 5vw, 52px);
  font-weight: 620;
  line-height: 1.05;
`

const Lead = styled.p`
  max-width: 720px;
  margin: 0;
  color: var(--v2-muted);
  font-size: 16px;
  line-height: 1.62;
`

const HeroStats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  margin-top: 24px;

  span {
    color: var(--v2-muted);
    font-size: 12px;
  }

  strong {
    margin-right: 6px;
    color: var(--v2-text);
    font-size: 16px;
  }
`

const ActivityPanel = styled.aside`
  min-height: 270px;
  padding: 18px;
  border: 1px solid var(--v2-stroke);
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
`

const PanelHeading = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 13px;
  border-bottom: 1px solid var(--v2-stroke);

  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    color: var(--v2-text);
    font-size: 15px;
    font-weight: 700;
  }

  small {
    color: var(--v2-success);
    font-size: 10px;
    font-weight: 850;
    text-transform: uppercase;
  }
`

const ActivityList = styled.div`
  display: grid;
`

const ActivityRow = styled(Link)`
  min-width: 0;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 43px;
  border-bottom: 1px solid var(--v2-stroke);
  color: inherit;
  text-decoration: none;

  &:hover strong {
    color: var(--v2-blue);
  }
`

const ActivityIcon = styled.span`
  width: 26px;
  height: 26px;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--v2-stroke);
  color: var(--v2-blue);
  background: var(--v2-soft);
`

const ActivityCopy = styled.div`
  min-width: 0;

  strong,
  small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    color: var(--v2-text);
    font-size: 12px;
    font-weight: 700;
  }

  small {
    margin-top: 2px;
    color: var(--v2-faint);
    font-size: 10px;
  }
`

const ChainName = styled.span<{ $color?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: ${({ $color }) => $color || 'var(--v2-muted)'};
  font-size: 11px;
  font-weight: 800;
`

const Toolbar = styled.section`
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 166px 174px 218px auto;
  gap: 10px;
  align-items: center;
  margin: 18px 0 26px;
  padding: 12px;
  border: 1px solid var(--v2-stroke);
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);

  @media (max-width: 1040px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const Search = styled.label`
  min-width: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border: 1px solid var(--v2-stroke);
  color: var(--v2-muted);
  background: var(--v2-bg);

  &:focus-within {
    border-color: var(--v2-blue);
  }

  input {
    width: 100%;
    min-width: 0;
    border: 0 !important;
    outline: 0;
    color: var(--v2-text);
    background: transparent;
    font-size: 13px;
  }
`

const FilterDropdown = styled.div`
  min-width: 0;

  .ui-dropdown {
    width: 100%;
  }
`

const FilterTrigger = styled.button`
  width: 100%;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin: 0;
  padding: 0 12px;
  border: 1px solid var(--v2-stroke);
  color: var(--v2-text);
  background: var(--v2-bg);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;

  &:hover,
  &:focus-visible {
    border-color: var(--v2-blue);
    outline: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

const FilterMenu = styled.fieldset`
  width: 220px;
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 7px;
  border: 0;
`

const FilterLegend = styled.legend`
  width: calc(100% - 12px);
  margin: 0 6px 5px;
  padding: 8px 4px 9px;
  border-bottom: 1px solid var(--v2-stroke);
  color: var(--v2-faint);
  font-size: 10px;
  font-weight: 850;
  text-transform: uppercase;
`

const CheckOption = styled.label`
  min-height: 36px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  color: var(--v2-muted);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;

  &:hover {
    color: var(--v2-text);
    background: var(--v2-soft);
  }

  input {
    width: 14px;
    height: 14px;
    margin: 0;
    accent-color: var(--v2-blue);
  }

  &:has(input:checked) {
    color: var(--v2-text);
    background: var(--v2-blue-soft);
  }
`

const SortSelect = styled(Select)`
  width: 100%;

  > div {
    min-height: 42px;
    background: var(--v2-bg);
    font-size: 12px;
    font-weight: 700;
  }
`

const ViewToggle = styled.div`
  min-height: 42px;
  display: inline-flex;
  justify-self: end;
  padding: 3px;
  border: 1px solid var(--v2-stroke);
  background: var(--v2-bg);

  @media (max-width: 560px) {
    justify-self: stretch;
  }
`

const ViewButton = styled.button<{ $active?: boolean }>`
  width: 36px;
  min-height: 34px;
  display: inline-grid;
  place-items: center;
  border: 0;
  color: ${({ $active }) => ($active ? 'var(--v2-text)' : 'var(--v2-muted)')};
  background: ${({ $active }) =>
    $active ? 'var(--v2-blue-soft)' : 'transparent'};
  cursor: pointer;

  @media (max-width: 560px) {
    width: 50%;
  }
`

const Section = styled.section`
  margin-top: 26px;
`

const SectionHeading = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;

  h2 {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    color: var(--v2-text);
    font-size: 24px;
    font-weight: 650;
  }

  p {
    margin: 6px 0 0;
    color: var(--v2-muted);
    font-size: 13px;
  }

  strong {
    color: var(--v2-blue);
    font-size: 13px;
  }

  @media (max-width: 680px) {
    align-items: flex-start;
    flex-direction: column;
  }
`

const SectionTitleLine = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 9px 14px;
`

const ModeSwitch = styled.button`
  padding: 0;
  border: 0;
  color: var(--v2-warning);
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 750;
  text-decoration: underline;
  text-underline-offset: 3px;
`

const SectionActions = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px 16px;

  @media (max-width: 680px) {
    width: 100%;
    justify-content: space-between;
  }
`

const SubmitRegistryLink = styled(Link)`
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--v2-blue);
  color: var(--v2-bg);
  background: var(--v2-blue);
  font-size: 12px;
  font-weight: 800;
  text-decoration: none;

  &:hover {
    color: var(--v2-bg);
    background: var(--v2-blue-hover);
  }
`

const SubmitRegistryButton = styled.button`
  min-height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--v2-blue);
  color: var(--v2-bg);
  background: var(--v2-blue);
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;

  &:hover {
    background: var(--v2-blue-hover);
  }
`

const SubmitMenu = styled.div`
  width: 230px;
  display: grid;
  gap: 2px;
  padding: 7px;
`

const SubmitMenuLink = styled(Link)`
  min-height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  color: var(--v2-text);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;

  &:hover {
    color: var(--v2-text);
    background: var(--v2-soft);
  }
`

const RegistryCollection = styled.div<{ $view: ViewMode }>`
  display: grid;
  grid-template-columns: ${({ $view }) =>
    $view === 'cards' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr'};
  gap: ${({ $view }) => ($view === 'cards' ? '16px' : '8px')};
`

const Card = styled(Link)`
  position: relative;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 278px;
  border: 1px solid var(--v2-stroke);
  border-top: 4px solid var(--v2-blue);
  color: inherit;
  background: var(--v2-card);
  box-shadow: var(--v2-shadow);
  text-decoration: none;
  transition:
    transform 150ms ease,
    border-color 150ms ease;

  &:hover {
    transform: translateY(-2px);
    border-color: var(--v2-blue);
  }
`

const StakeLogo = styled(StakeTag)`
  width: 76px;
  height: 14px;
  flex: 0 0 auto;
`

const CardIdentity = styled.div`
  min-height: 108px;
  display: grid;
  grid-template-columns: 60px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 18px;
  border-bottom: 1px solid var(--v2-stroke);
`

const Logo = styled.div<{ $image?: string | null; $color?: string }>`
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--v2-stroke);
  color: ${({ $color }) => $color || 'var(--v2-blue)'};
  background: var(--v2-soft);
`

const LogoImage = styled.img`
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
`

const RegistryTitle = styled.h3`
  overflow: hidden;
  margin: 0;
  color: var(--v2-text);
  font-size: 16px;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RegistryMeta = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 12px;
  margin-top: 8px;
  color: var(--v2-muted);
  font-size: 11px;

  ${StakeLogo} {
    width: 68px;
    height: 13px;
  }
`

const CardBody = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 16px 18px 18px;
`

const Description = styled.p`
  display: -webkit-box;
  overflow: hidden;
  min-height: 42px;
  margin: 0;
  color: var(--v2-muted);
  font-size: 12px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
`

const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: auto;
  padding-top: 16px;

  span {
    color: var(--v2-faint);
    font-size: 9px;
    font-weight: 800;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-bottom: 4px;
    color: var(--v2-text);
    font-size: 14px;
  }
`

const Row = styled(Link)`
  min-width: 0;
  display: grid;
  grid-template-columns:
    48px minmax(240px, 1fr) 68px minmax(104px, 126px)
    minmax(80px, 100px) minmax(80px, 100px) minmax(80px, 100px) auto;
  column-gap: clamp(14px, 2vw, 28px);
  align-items: center;
  min-height: 76px;
  padding: 12px 16px;
  border: 1px solid var(--v2-stroke);
  color: inherit;
  background: var(--v2-card);
  text-decoration: none;

  &:hover {
    border-color: var(--v2-blue);
    background: var(--v2-soft);
  }

  ${Logo} {
    width: 48px;
    height: 48px;
  }

  @media (max-width: 900px) {
    grid-template-columns: 48px minmax(0, 1fr) auto;

    > [data-secondary] {
      display: none;
    }
  }
`

const RowIdentity = styled.div`
  min-width: 0;
`

const RowAddress = styled.div`
  overflow: hidden;
  margin-top: 5px;
  color: var(--v2-faint);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const RowStakeSlot = styled.div`
  width: 68px;
  min-width: 68px;
  display: flex;
  align-items: center;
  justify-content: flex-start;

  ${StakeLogo} {
    width: 62px;
    height: 12px;
  }
`

const RowChain = styled.div`
  min-width: 0;
  display: flex;
  align-items: center;
`

const RowCount = styled.div`
  color: var(--v2-text);
  font-size: 12px;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
  text-align: left;

  small {
    display: block;
    margin-top: 3px;
    color: var(--v2-faint);
    font-size: 9px;
    text-transform: uppercase;
  }
`

const OpenLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--v2-blue);
  font-size: 12px;
  font-weight: 800;
`

const Center = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`

const RegistryPagination = styled(Pagination)`
  flex-wrap: wrap;
  justify-content: center;
`

const Warning = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--v2-warning);
  color: var(--v2-warning);
  background: var(--v2-warning-soft);
  font-size: 12px;
  line-height: 1.5;
`

const Empty = styled.div`
  min-height: 150px;
  display: grid;
  place-items: center;
  border: 1px solid var(--v2-stroke);
  color: var(--v2-muted);
  background: var(--v2-card);
  text-align: center;
`

const Skeleton = styled.div`
  min-height: 270px;
  border: 1px solid var(--v2-stroke);
  background: var(--v2-soft);
`

const chainInfo = (chainId: number) =>
  NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]

const ChainLabel = ({
  chainId,
  short = false,
}: {
  chainId: number
  short?: boolean
}) => {
  const info = chainInfo(chainId)
  const name = info?.name || String(chainId)

  return (
    <ChainName $color={info?.color}>
      <ChainLogo chainId={chainId} size={17} />
      {short ? name.replace('Ethereum', 'Eth') : name}
    </ChainName>
  )
}

const kindLabel = (kind: RegistryKind) => {
  if (kind === 'permanent') return 'Stake'
  if (kind === 'light') return 'Traditional'
  return 'Classic'
}

const registryHref = (registry: DashboardRegistry) =>
  `/tcr/${registry.chainId}/${registry.address}`

const registrySubmissionHref = (chainId: number) =>
  `/tcr/${chainId}/${
    VERIFIED_LIST_OF_LISTS_ADDRESSES[
      chainId as keyof typeof VERIFIED_LIST_OF_LISTS_ADDRESSES
    ]
  }/submit`

const mediaUrl = (uri?: string) => {
  if (!uri) return null
  return /^https?:\/\//i.test(uri) ? uri : parseIpfs(uri)
}

const shortAddress = (address?: string) =>
  address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown'

const activityIcon = (activity: DashboardActivity) => {
  if (activity.kind === 'challenge') return 'dispute'
  if (activity.kind === 'removal') return 'remove'
  if (activity.kind === 'resolution') return 'court'
  return 'submit'
}

const updateParams = (
  params: URLSearchParams,
  updates: Record<string, string | null>,
) => {
  const next = new URLSearchParams(params)
  Object.entries(updates).forEach(([key, value]) => {
    if (!value) next.delete(key)
    else next.set(key, value)
  })
  return next
}

const RegistryLogo = ({
  registry,
  size = 24,
}: {
  registry: DashboardRegistry
  size?: number
}) => {
  const [failed, setFailed] = useState(false)
  const info = chainInfo(registry.chainId)
  const image = mediaUrl(registry.logoURI)

  return (
    <Logo $color={info?.color}>
      {image && !failed ? (
        <LogoImage
          src={image}
          alt={`${registry.title} logo`}
          onError={() => setFailed(true)}
        />
      ) : (
        <CurateIcon name="registry" size={size} />
      )}
    </Logo>
  )
}

const RegistryCard = ({ registry }: { registry: DashboardRegistry }) => (
  <Card to={registryHref(registry)}>
    <CardIdentity>
      <RegistryLogo registry={registry} />
      <div>
        <RegistryTitle>{registry.title}</RegistryTitle>
        <RegistryMeta>
          <ChainLabel chainId={registry.chainId} />
          {registry.kind === 'permanent' && (
            <StakeLogo aria-label="Stake Curate" />
          )}
        </RegistryMeta>
      </div>
    </CardIdentity>
    <CardBody>
      <Description>
        {registry.description ||
          `Registry at ${shortAddress(registry.address)}.`}
      </Description>
      <Stats>
        <div>
          <strong>{formatCompact(registry.itemCount)}</strong>
          <span>Items</span>
        </div>
        <div>
          <strong>{formatCompact(registry.pendingCount)}</strong>
          <span>Pending</span>
        </div>
        <div>
          <strong>{formatCompact(registry.disputeCount)}</strong>
          <span>Disputes</span>
        </div>
      </Stats>
    </CardBody>
  </Card>
)

const RegistryRow = ({ registry }: { registry: DashboardRegistry }) => (
  <Row to={registryHref(registry)}>
    <RegistryLogo registry={registry} size={20} />
    <RowIdentity>
      <RegistryTitle>{registry.title}</RegistryTitle>
      <RowAddress>{shortAddress(registry.address)}</RowAddress>
    </RowIdentity>
    <RowStakeSlot data-secondary>
      {registry.kind === 'permanent' && <StakeLogo aria-label="Stake Curate" />}
    </RowStakeSlot>
    <RowChain data-secondary>
      <ChainLabel chainId={registry.chainId} />
    </RowChain>
    <RowCount data-secondary>
      {formatCompact(registry.itemCount)}
      <small>Items</small>
    </RowCount>
    <RowCount data-secondary>
      {formatCompact(registry.pendingCount)}
      <small>Pending</small>
    </RowCount>
    <RowCount data-secondary>
      {formatCompact(registry.disputeCount)}
      <small>Disputes</small>
    </RowCount>
    <OpenLabel>
      Open
      <CurateIcon name="external" size={14} />
    </OpenLabel>
  </Row>
)

const RegistryResults = ({
  registries,
  view,
}: {
  registries: DashboardRegistry[]
  view: ViewMode
}) =>
  registries.length > 0 ? (
    <RegistryCollection $view={view}>
      {registries.map((registry) =>
        view === 'cards' ? (
          <RegistryCard key={registry.id} registry={registry} />
        ) : (
          <RegistryRow key={registry.id} registry={registry} />
        ),
      )}
    </RegistryCollection>
  ) : (
    <Empty>No registries match these filters.</Empty>
  )

const BrowsePage = () => {
  const [params, setParams] = useSearchParams()
  const [chainMenuOpen, setChainMenuOpen] = useState(false)
  const [kindMenuOpen, setKindMenuOpen] = useState(false)
  const [submitMenuOpen, setSubmitMenuOpen] = useState(false)
  const search = params.get('q') || ''
  const chainParam = params.get('chain') || ''
  const kindParam = params.get('kind') || ''
  const selectedChains = useMemo(
    () =>
      chainParam
        .split(',')
        .map(Number)
        .filter((chainId) => CHAINS.includes(chainId)),
    [chainParam],
  )
  const selectedKinds = useMemo(
    () =>
      kindParam
        .split(',')
        .filter((kind): kind is RegistryKind =>
          ['classic', 'light', 'permanent'].includes(kind),
        ),
    [kindParam],
  )
  const view: ViewMode = params.get('view') === 'list' ? 'list' : 'cards'
  const mode: RegistryMode =
    params.get('trust') === 'unverified' ? 'unverified' : 'verified'
  const sortParam = params.get('sort') || ''
  const sort: SortMode = [
    'recent-submission',
    'recent-creation',
    'activity',
    'items',
    'disputes',
    'name',
  ].includes(sortParam)
    ? (sortParam as SortMode)
    : 'recent-submission'
  const requestedPage = Math.max(1, Number(params.get('page')) || 1)

  useDocumentHead(
    'Browse registries | Kleros Curate',
    'Browse Kleros Verified and unverified Curate registries across Ethereum, Gnosis, and Sepolia.',
  )

  const dashboardQuery = useQuery({
    queryKey: ['curateDashboard'],
    queryFn: fetchDashboardData,
    staleTime: 60_000,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (requestedPage !== 1)
      setParams(updateParams(params, { page: null }), { replace: true })
    // Filter changes should always return to the first result page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainParam, kindParam, search, mode, sort])

  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return (dashboardQuery.data?.registries ?? [])
      .filter(
        (registry) =>
          selectedChains.length === 0 ||
          selectedChains.includes(registry.chainId),
      )
      .filter(
        (registry) =>
          selectedKinds.length === 0 || selectedKinds.includes(registry.kind),
      )
      .filter(
        (registry) =>
          !normalized ||
          [
            registry.title,
            registry.description,
            registry.address,
            kindLabel(registry.kind),
            chainInfo(registry.chainId)?.name,
          ].some((value) =>
            String(value || '')
              .toLowerCase()
              .includes(normalized),
          ),
      )
      .sort((a, b) => {
        if (sort === 'activity')
          return (
            b.activeCount - a.activeCount ||
            (b.lastActivityAt || 0) - (a.lastActivityAt || 0)
          )
        if (sort === 'items') return b.itemCount - a.itemCount
        if (sort === 'disputes')
          return (
            b.disputeCount - a.disputeCount || b.activeCount - a.activeCount
          )
        if (sort === 'name') return a.title.localeCompare(b.title)
        if (sort === 'recent-creation')
          return (
            (b.createdAt || 0) - (a.createdAt || 0) ||
            (b.lastActivityAt || 0) - (a.lastActivityAt || 0) ||
            b.itemCount - a.itemCount
          )
        return (
          (b.lastActivityAt || 0) - (a.lastActivityAt || 0) ||
          b.activeCount - a.activeCount ||
          b.itemCount - a.itemCount
        )
      })
  }, [dashboardQuery.data, search, selectedChains, selectedKinds, sort])

  const verified = filtered.filter(
    (registry) => registry.trustStatus === 'verified',
  )
  const unverified = filtered.filter(
    (registry) => registry.trustStatus !== 'verified',
  )
  const activities = (dashboardQuery.data?.activities ?? [])
    .filter(
      (activity) =>
        selectedChains.length === 0 ||
        selectedChains.includes(activity.chainId),
    )
    .slice(0, 5)

  const activeRegistries = mode === 'verified' ? verified : unverified
  const totalPages = Math.max(1, Math.ceil(activeRegistries.length / PAGE_SIZE))
  const currentPage = Math.min(requestedPage, totalPages)
  const pageRegistries = activeRegistries.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const setFilter = (updates: Record<string, string | null>) =>
    setParams(updateParams(params, updates), { replace: true })

  const toggleChain = (chainId: number) => {
    const next = selectedChains.includes(chainId)
      ? selectedChains.filter((value) => value !== chainId)
      : [...selectedChains, chainId]
    setFilter({ chain: next.length > 0 ? next.join(',') : null, page: null })
  }

  const toggleKind = (registryKind: RegistryKind) => {
    const next = selectedKinds.includes(registryKind)
      ? selectedKinds.filter((value) => value !== registryKind)
      : [...selectedKinds, registryKind]
    setFilter({ kind: next.length > 0 ? next.join(',') : null, page: null })
  }

  const chainSummary =
    selectedChains.length === 0
      ? 'All chains'
      : selectedChains.length === 1
        ? chainInfo(selectedChains[0])?.name || String(selectedChains[0])
        : `${selectedChains.length} chains`

  const typeSummary =
    selectedKinds.length === 0
      ? 'All registry types'
      : selectedKinds.length === 1
        ? kindLabel(selectedKinds[0])
        : `${selectedKinds.length} registry types`

  if (dashboardQuery.isLoading || !dashboardQuery.data)
    return (
      <Page>
        <Hero>
          <Skeleton />
          <Skeleton />
        </Hero>
      </Page>
    )

  return (
    <Page>
      <Hero>
        <HeroCopy>
          <Eyebrow>
            <CurateIcon name="registry" size={17} />
            All-chain registry discovery
          </Eyebrow>
          <Title>Browse registries</Title>
          <Lead>
            Find lists across Ethereum, Gnosis, and Sepolia. Start with Kleros
            Verified registries, then switch to unverified registries when you
            need a wider view.
          </Lead>
          <HeroStats>
            <span>
              <strong>{dashboardQuery.data.metrics.verifiedRegistries}</strong>
              Kleros Verified
            </span>
            <span>
              <strong>
                {dashboardQuery.data.metrics.registries -
                  dashboardQuery.data.metrics.verifiedRegistries}
              </strong>
              Unverified
            </span>
            <span>
              <strong>3</strong>
              Chains
            </span>
          </HeroStats>
        </HeroCopy>
        <ActivityPanel>
          <PanelHeading>
            <h2>
              <CurateIcon name="activity" size={17} />
              Recent activity
            </h2>
            <small>Live</small>
          </PanelHeading>
          <ActivityList>
            {activities.map((activity) => (
              <ActivityRow key={activity.id} to={activity.href}>
                <ActivityIcon>
                  <CurateIcon name={activityIcon(activity)} size={14} />
                </ActivityIcon>
                <ActivityCopy>
                  <strong>{activity.status}</strong>
                  <small>
                    {activity.registryTitle} · {formatAgo(activity.timestamp)}
                  </small>
                </ActivityCopy>
                <ChainLabel chainId={activity.chainId} short />
              </ActivityRow>
            ))}
          </ActivityList>
        </ActivityPanel>
      </Hero>

      <Toolbar aria-label="Registry filters">
        <Search>
          <CurateIcon name="search" size={17} />
          <input
            aria-label="Search registries"
            placeholder="Search name, address, chain, or type"
            value={search}
            onChange={(event) =>
              setFilter({ q: event.currentTarget.value || null })
            }
          />
        </Search>
        <FilterDropdown>
          <Dropdown
            trigger={['click']}
            placement="bottomLeft"
            visible={chainMenuOpen}
            onVisibleChange={setChainMenuOpen}
            overlay={
              <FilterMenu
                aria-label="Chains"
                onClick={(event) => event.stopPropagation()}
              >
                <FilterLegend>Chains</FilterLegend>
                <CheckOption>
                  <input
                    type="checkbox"
                    checked={selectedChains.length === 0}
                    onChange={() => setFilter({ chain: null, page: null })}
                  />
                  All chains
                </CheckOption>
                {CHAINS.map((chainId) => (
                  <CheckOption key={chainId}>
                    <input
                      type="checkbox"
                      checked={selectedChains.includes(chainId)}
                      onChange={() => toggleChain(chainId)}
                    />
                    <ChainLogo chainId={chainId} size={16} />
                    {chainInfo(chainId)?.name || chainId}
                  </CheckOption>
                ))}
              </FilterMenu>
            }
          >
            <FilterTrigger type="button" aria-label="Filter by chain">
              <span>{chainSummary}</span>
              <CurateIcon name="chevron-down" size={14} />
            </FilterTrigger>
          </Dropdown>
        </FilterDropdown>
        <FilterDropdown>
          <Dropdown
            trigger={['click']}
            placement="bottomLeft"
            visible={kindMenuOpen}
            onVisibleChange={setKindMenuOpen}
            overlay={
              <FilterMenu
                aria-label="Registry types"
                onClick={(event) => event.stopPropagation()}
              >
                <FilterLegend>Registry types</FilterLegend>
                <CheckOption>
                  <input
                    type="checkbox"
                    checked={selectedKinds.length === 0}
                    onChange={() => setFilter({ kind: null, page: null })}
                  />
                  All registry types
                </CheckOption>
                {(
                  [
                    ['classic', 'Classic'],
                    ['light', 'Traditional'],
                    ['permanent', 'Stake'],
                  ] as [RegistryKind, string][]
                ).map(([registryKind, label]) => (
                  <CheckOption key={registryKind}>
                    <input
                      type="checkbox"
                      checked={selectedKinds.includes(registryKind)}
                      onChange={() => toggleKind(registryKind)}
                    />
                    {label}
                  </CheckOption>
                ))}
              </FilterMenu>
            }
          >
            <FilterTrigger type="button" aria-label="Filter by registry type">
              <span>{typeSummary}</span>
              <CurateIcon name="chevron-down" size={14} />
            </FilterTrigger>
          </Dropdown>
        </FilterDropdown>
        <SortSelect
          value={sort}
          onChange={(value) =>
            setFilter({
              sort: value === 'recent-submission' ? null : String(value),
              page: null,
            })
          }
        >
          <Select.Option value="recent-submission">
            Most recent (submission)
          </Select.Option>
          <Select.Option value="recent-creation">
            Most recent (list creation)
          </Select.Option>
          <Select.Option value="activity">Most active</Select.Option>
          <Select.Option value="items">Most items</Select.Option>
          <Select.Option value="disputes">Most disputes</Select.Option>
          <Select.Option value="name">Name A-Z</Select.Option>
        </SortSelect>
        <ViewToggle aria-label="Registry view">
          <ViewButton
            type="button"
            $active={view === 'cards'}
            aria-label="Card view"
            onClick={() => setFilter({ view: null })}
          >
            <CurateIcon name="grid" size={16} />
          </ViewButton>
          <ViewButton
            type="button"
            $active={view === 'list'}
            aria-label="List view"
            onClick={() => setFilter({ view: 'list' })}
          >
            <CurateIcon name="list" size={16} />
          </ViewButton>
        </ViewToggle>
      </Toolbar>

      <Section>
        <SectionHeading>
          <div>
            <SectionTitleLine>
              <h2>
                {mode === 'verified'
                  ? 'Kleros Verified'
                  : 'Unverified registries'}
              </h2>
              <ModeSwitch
                type="button"
                onClick={() =>
                  setFilter({
                    trust: mode === 'verified' ? 'unverified' : null,
                    page: null,
                  })
                }
              >
                {mode === 'verified'
                  ? 'Switch to unverified'
                  : 'Switch to Kleros Verified'}
              </ModeSwitch>
            </SectionTitleLine>
            <p>
              {mode === 'verified'
                ? 'Verified through a recognized Kleros list of lists.'
                : 'Not present in a recognized Kleros list of lists.'}
            </p>
          </div>
          <SectionActions>
            <strong>{activeRegistries.length} registries</strong>
            {mode === 'verified' &&
              (selectedChains.length === 1 ? (
                <Tooltip title="Submit your registry for verification. Once accepted into this network's list of lists, it will appear here with highlighted placement.">
                  <SubmitRegistryLink
                    to={registrySubmissionHref(selectedChains[0])}
                  >
                    <CurateIcon name="submit" size={15} />
                    Submit a registry
                  </SubmitRegistryLink>
                </Tooltip>
              ) : (
                <Tooltip title="Choose a network and submit your registry for verification. Once accepted, it will appear here with highlighted placement.">
                  <Dropdown
                    trigger={['click']}
                    placement="bottomRight"
                    visible={submitMenuOpen}
                    onVisibleChange={setSubmitMenuOpen}
                    overlay={
                      <SubmitMenu onClick={(event) => event.stopPropagation()}>
                        {CHAINS.map((chainId) => (
                          <SubmitMenuLink
                            key={chainId}
                            to={registrySubmissionHref(chainId)}
                            onClick={() => setSubmitMenuOpen(false)}
                          >
                            <ChainLabel chainId={chainId} />
                          </SubmitMenuLink>
                        ))}
                      </SubmitMenu>
                    }
                  >
                    <SubmitRegistryButton type="button">
                      <CurateIcon name="submit" size={15} />
                      Submit a registry
                      <CurateIcon name="chevron-down" size={13} />
                    </SubmitRegistryButton>
                  </Dropdown>
                </Tooltip>
              ))}
          </SectionActions>
        </SectionHeading>
        {mode === 'unverified' && (
          <Warning>
            <CurateIcon name="dispute" size={17} />
            These registries are unverified. Review their policy and governance
            before interacting.
          </Warning>
        )}
        <RegistryResults registries={pageRegistries} view={view} />
        {activeRegistries.length > PAGE_SIZE && (
          <Center>
            <RegistryPagination
              current={currentPage}
              pageSize={PAGE_SIZE}
              total={activeRegistries.length}
              onChange={(page) =>
                setFilter({ page: page === 1 ? null : String(page) })
              }
            />
          </Center>
        )}
      </Section>
    </Page>
  )
}

export default BrowsePage
