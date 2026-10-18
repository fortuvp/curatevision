import React, { useEffect, useMemo, useState } from 'react'
import styled from 'styled-components'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { isAddress } from 'viem'
import ReactBlockies from 'react-blockies'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import useStoredLayout, { LAYOUT_OPTIONS } from 'hooks/use-stored-layout'
import { formatAbsolute, formatAgo, formatDate } from 'utils/time'
import { getAddressPage } from 'utils/network-utils'
import { NETWORKS_INFO } from 'config/networks'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ButtonLink,
  ChainChip,
  Chip,
  ChipButton,
  Data,
  EmptyState,
  Figure,
  Grid,
  Heading,
  IconButton,
  Label,
  Page,
  PanelHeader,
  PanelTitle,
  Rail,
  Row,
  Section,
  SegmentedControl,
  SkeletonBlock,
  Small,
  SplitGrid,
  Stack,
  StatusDot,
  Surface,
  Table,
  TableScroller,
  truncateMiddle,
} from 'components/curate/primitives'
import { EntryStatus } from 'components/curate/entry-status'
import { Gauge } from 'components/curate/gauge'
import { Pagination } from 'components/ui'
import { normalizeAddress } from 'pages/dashboard/data'
import {
  ACTIVITY_LIMIT,
  PROFILE_LIMIT,
  SUPPORTED_CHAIN_IDS,
  chainName,
  fetchAddressProfileData,
  type AddressProfileData,
  type ProfileActivity,
} from './data'
import { GovernancePanel } from './governance'
import {
  FILTERS,
  PAGE_SIZE,
  activeChains,
  activityStatus,
  coverage,
  filterActivities,
  filterCount,
  formatInt,
  otherParty,
  parseFilter,
  registryHref,
} from './view'

/*
 * Curator profile (/address/:address): who this address is on Curate. The
 * address in mono with copy and explorer links, the figures its actions add
 * up to per chain, the actions themselves in a remembered table / cards /
 * rows layout, the win rate as a ring only when there are challenges, and the
 * lists it governs. Every number comes from the profile data; nothing is
 * invented and nothing the data layer lacks (rewards, entry status) is shown.
 */

/* ---------- Hero ---------- */

const Hero = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
  gap: 32px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`

const Identity = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
  min-width: 0;
`

const IdentityRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  min-width: 0;
`

const Avatar = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-raised);

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
`

const AddressTitle = styled.h1`
  margin: 0;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: clamp(18px, 1.2vw + 9px, 26px);
  line-height: 1.3;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
`

const Links = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
`

const TextAnchor = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const FiguresGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px 12px;

  @media (max-width: 480px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const FigureCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const ChainRails = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 6px 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
`

const Coverage = styled(Small)`
  display: block;
  margin-top: 16px;
`

/* ---------- Activity ---------- */

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
`

const RegistryName = styled(Link)`
  display: block;
  overflow: hidden;
  color: var(--color-text);
  font-weight: 600;
  text-decoration: none;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:hover {
    color: var(--color-primary);
  }
`

const PartyLink = styled(Link)`
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: var(--fs-data);
  font-weight: 400;
  text-decoration: none;

  &:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 160px;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  transition:
    border-color var(--motion),
    box-shadow var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-card-hover);
  }
`

const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
`

const OpenLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--color-primary);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`

const RowsShell = styled.div`
  display: flex;
  flex-direction: column;
`

const ActivityRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  min-height: 56px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  transition: background var(--motion);

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: var(--color-raised);
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const RowCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const RowMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  min-width: 0;
`

const RowRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const Footer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
`

/* ---------- Rail ---------- */

const BadgeRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--color-border);

  &:last-child {
    padding-bottom: 0;
    border-bottom: 0;
  }

  > :last-child {
    grid-column: 1 / -1;
  }
`

/* ---------- Pieces ---------- */

const explorerLinks = (address: string, chainIds: number[]) =>
  chainIds.map((chainId) => {
    const info = NETWORKS_INFO[chainId as keyof typeof NETWORKS_INFO]
    return {
      chainId,
      name: info?.name ?? `Chain ${chainId}`,
      explorer: info?.explorers?.[0]?.name ?? 'explorer',
      href: getAddressPage({ networkId: chainId, address }),
    }
  })

/** Click anywhere on a card or row opens the entry; inner links keep their own target. */
const openUnlessLink = (
  event: React.MouseEvent<HTMLElement>,
  open: () => void,
) => {
  if ((event.target as HTMLElement).closest('a, button')) return
  open()
}

const When = ({ timestamp, now }: { timestamp: number; now: number }) =>
  timestamp > 0 ? (
    <Data $muted $weight={400} title={formatAbsolute(timestamp)}>
      {formatAgo(timestamp, now)}
    </Data>
  ) : (
    <Small $faint>—</Small>
  )

const EntryId = ({ itemID }: { itemID?: string }) =>
  itemID ? (
    <Data $weight={400} title={itemID}>
      {truncateMiddle(itemID, 8, 6)}
    </Data>
  ) : (
    <Small $faint>—</Small>
  )

/* ---------- Page ---------- */

const AddressPage = () => {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const address = normalizeAddress(params.address)
  const validAddress = isAddress(address)
  const filter = parseFilter(searchParams.get('show'))
  const [page, setPage] = useState(1)
  const [layout, setLayout] = useStoredLayout('address', 'table')
  const [copied, setCopied] = useState(false)
  const now = useNow(30_000)
  const { address: connectedAddress, isConnected } = useAccount()
  const isYou =
    validAddress &&
    isConnected &&
    normalizeAddress(connectedAddress) === address

  useDocumentHead(
    validAddress
      ? `Curator ${truncateMiddle(address)} · Kleros Curate`
      : 'Curator profile · Kleros Curate',
    validAddress
      ? `Submissions, removals, challenges and governed lists of ${address} across Kleros Curate registries.`
      : 'Curator profiles across Kleros Curate registries: submissions, removals, challenges and governed lists.',
  )

  const query = useQuery({
    queryKey: ['addressProfile', address],
    queryFn: () => fetchAddressProfileData(address),
    enabled: validAddress,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
  const data: AddressProfileData | undefined = query.data
  // isPending is false once the query errors, so the error state can render.
  const loading = validAddress && query.isPending

  const setFilter = (value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete('show')
    else next.set('show', value)
    setSearchParams(next, { replace: true })
  }

  useEffect(() => {
    setPage(1)
  }, [filter, address])

  const activities = useMemo(() => data?.activities ?? [], [data])
  const disputes = useMemo(() => data?.disputes ?? [], [data])
  const shown = useMemo(
    () => filterActivities(activities, disputes, filter),
    [activities, disputes, filter],
  )
  const pageCount = Math.max(1, Math.ceil(shown.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = shown.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const chains = useMemo(() => activeChains(data?.chainBreakdown), [data])
  const covered = useMemo(() => coverage(activities), [activities])
  const explorers = explorerLinks(
    address,
    chains.length > 0
      ? chains.map((chain) => chain.chainId)
      : SUPPORTED_CHAIN_IDS,
  )
  const chainNames = SUPPORTED_CHAIN_IDS.map(chainName)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  if (!validAddress)
    return (
      <Page>
        <Surface $padding="none">
          <EmptyState
            icon="user"
            title="Not an address"
            action={
              <ButtonLink to="/browse" $variant="secondary" $size="sm">
                Browse registries
              </ButtonLink>
            }
          >
            A profile lives at /address followed by a 0x address of 40 hex
            characters.
          </EmptyState>
        </Surface>
      </Page>
    )

  const stats = data?.stats
  const won = stats?.successfulChallenges ?? 0
  const challenges = stats?.challenges ?? 0

  const renderStatus = (activity: ProfileActivity) => (
    <EntryStatus status={activityStatus(activity)} now={now} />
  )

  return (
    <Page>
      <Hero>
        <Identity>
          <Label>Curator profile</Label>
          <IdentityRow>
            <Avatar aria-hidden>
              <ReactBlockies seed={address} size={8} scale={7} />
            </Avatar>
            <Stack $gap={8} style={{ minWidth: 0 }}>
              <AddressTitle>{address}</AddressTitle>
              <Row $gap={6} $wrap>
                {isYou && (
                  <Chip title="The connected wallet">
                    <CurateIcon name="user" size={12} />
                    This is you
                  </Chip>
                )}
                {chains.map((chain) => (
                  <ChainChip
                    key={chain.chainId}
                    chainId={chain.chainId}
                    size="sm"
                  />
                ))}
              </Row>
            </Stack>
          </IdentityRow>
          <Body $muted>
            The submissions, removals and challenges this address made across
            Kleros Curate registries on {chainNames.join(', ')}, and the lists
            it governs.
          </Body>
          <Links>
            <IconButton
              type="button"
              onClick={copy}
              aria-label={copied ? 'Copied' : 'Copy address'}
              title={copied ? 'Copied' : 'Copy address'}
            >
              <CurateIcon name={copied ? 'check' : 'copy'} size={16} />
            </IconButton>
            <Label $tone="faint">Explorer</Label>
            {explorers.map((explorer) => (
              <TextAnchor
                key={explorer.chainId}
                href={explorer.href}
                target="_blank"
                rel="noopener noreferrer"
                title={`Open on ${explorer.explorer}`}
              >
                {explorer.name}
                <CurateIcon name="external" size={14} />
              </TextAnchor>
            ))}
          </Links>
        </Identity>

        <Surface $padding="standard" aria-label="Figures">
          <PanelHeader>
            <PanelTitle>
              <CurateIcon name="activity" size={16} />
              Figures
            </PanelTitle>
            <Label $tone="faint">
              {data
                ? `Updated ${formatAgo(Math.floor(data.generatedAt / 1000), now)}`
                : query.isError
                  ? 'Unavailable'
                  : 'Loading'}
            </Label>
          </PanelHeader>
          {loading ? (
            <SkeletonBlock $height="220px" />
          ) : !stats ? (
            <Small $faint>—</Small>
          ) : (
            <>
              <FiguresGrid>
                <FigureCell>
                  <Figure>{formatInt(stats.activity)}</Figure>
                  <Label>Actions</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(stats.submissions)}</Figure>
                  <Label>Submissions</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(stats.removals)}</Figure>
                  <Label>Removals</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(stats.challenges)}</Figure>
                  <Label>Challenges</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(stats.successfulChallenges)}</Figure>
                  <Label>Challenges won</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(stats.disputes)}</Figure>
                  <Label>Disputes</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(stats.governedLists)}</Figure>
                  <Label>Governed lists</Label>
                </FigureCell>
                <FigureCell>
                  <Figure>{formatInt(chains.length)}</Figure>
                  <Label>Chains</Label>
                </FigureCell>
              </FiguresGrid>
              {chains.length > 0 && (
                <ChainRails aria-label="Actions per chain">
                  {chains.map((chain) => (
                    <React.Fragment key={chain.chainId}>
                      <Small $muted>{chainName(chain.chainId)}</Small>
                      <Rail
                        $value={
                          stats.activity
                            ? chain.stats.activity / stats.activity
                            : 0
                        }
                        $tone="neutral"
                      />
                      <Data $muted title="Actions on this chain">
                        {formatInt(chain.stats.activity)}
                      </Data>
                      <Data
                        $muted
                        $weight={400}
                        title="Lists this address governs on this chain"
                      >
                        · {formatInt(chain.stats.governedLists)}{' '}
                        {chain.stats.governedLists === 1 ? 'list' : 'lists'}
                      </Data>
                    </React.Fragment>
                  ))}
                </ChainRails>
              )}
              <Coverage $muted>
                Counts cover the latest {formatInt(PROFILE_LIMIT)} requests per
                chain and registry type.{' '}
                {covered
                  ? `The actions listed below run from ${formatDate(covered.oldest)} to ${formatDate(covered.newest)}.`
                  : 'No action is indexed for this address.'}
              </Coverage>
            </>
          )}
        </Surface>
      </Hero>

      <Section>
        <PanelHeader>
          <div>
            <Heading>Activity</Heading>
            <Small $muted>
              {loading
                ? 'Loading actions…'
                : query.isError
                  ? 'The profile could not be loaded.'
                  : activities.length === 0
                    ? 'No submission, removal or challenge indexed.'
                    : activities.length >= ACTIVITY_LIMIT
                      ? `The ${formatInt(ACTIVITY_LIMIT)} most recent actions; older ones count in the figures but are not listed.`
                      : `All ${formatInt(activities.length)} indexed actions.`}
            </Small>
          </div>
        </PanelHeader>

        <SplitGrid $rail={340}>
          <Surface $padding="none">
            <Toolbar>
              <Chips role="group" aria-label="Show">
                {FILTERS.map((option) => (
                  <ChipButton
                    key={option.value}
                    type="button"
                    $selected={filter === option.value}
                    aria-pressed={filter === option.value}
                    onClick={() => setFilter(option.value)}
                  >
                    {option.label}
                    {!loading && (
                      <span>
                        {formatInt(
                          filterCount(activities, disputes, option.value),
                        )}
                      </span>
                    )}
                  </ChipButton>
                ))}
              </Chips>
              <SegmentedControl
                ariaLabel="Layout"
                value={layout}
                onChange={setLayout}
                options={LAYOUT_OPTIONS}
              />
            </Toolbar>

            {loading ? (
              <Stack $gap={8} style={{ padding: 16 }}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonBlock key={index} $height="44px" />
                ))}
              </Stack>
            ) : query.isError ? (
              <EmptyState
                icon="activity"
                title="Could not load this profile"
                action={
                  <Button
                    type="button"
                    $variant="secondary"
                    $size="sm"
                    onClick={() => query.refetch()}
                  >
                    Try again
                  </Button>
                }
              >
                The indexers did not answer. Try again in a moment.
              </EmptyState>
            ) : shown.length === 0 ? (
              <EmptyState
                icon="activity"
                title={
                  activities.length === 0
                    ? 'No activity indexed'
                    : `No ${FILTERS.find((option) => option.value === filter)?.label.toLowerCase() ?? 'actions'}`
                }
                action={
                  activities.length === 0 ? (
                    <ButtonLink to="/browse" $variant="secondary" $size="sm">
                      Browse registries
                    </ButtonLink>
                  ) : (
                    <Button
                      type="button"
                      $variant="secondary"
                      $size="sm"
                      onClick={() => setFilter('all')}
                    >
                      Show all actions
                    </Button>
                  )
                }
              >
                {activities.length === 0
                  ? `This address has not submitted, removed or challenged an entry on ${chainNames.join(', ')}.`
                  : 'This address has other actions; show all of them or pick another filter.'}
              </EmptyState>
            ) : layout === 'table' ? (
              <TableScroller style={{ border: 0, borderRadius: 0 }}>
                <Table>
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Registry</th>
                      <th>Entry</th>
                      <th>Chain</th>
                      <th>Other party</th>
                      <th className="num">When</th>
                      <th aria-label="Open" />
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((activity) => {
                      const party = otherParty(activity, address)
                      return (
                        <tr
                          key={activity.id}
                          data-href={activity.href}
                          onClick={(event) =>
                            openUnlessLink(event, () => navigate(activity.href))
                          }
                        >
                          <td>{renderStatus(activity)}</td>
                          <td>
                            <div style={{ minWidth: 0, maxWidth: 320 }}>
                              <RegistryName to={registryHref(activity)}>
                                {activity.registryTitle}
                              </RegistryName>
                              <Small $faint>
                                {truncateMiddle(activity.registryAddress)}
                              </Small>
                            </div>
                          </td>
                          <td>
                            <EntryId itemID={activity.itemID} />
                          </td>
                          <td>
                            <ChainChip chainId={activity.chainId} size="sm" />
                          </td>
                          <td>
                            {party ? (
                              <PartyLink to={`/address/${party}`} title={party}>
                                {truncateMiddle(party)}
                              </PartyLink>
                            ) : (
                              <Small $faint>—</Small>
                            )}
                          </td>
                          <td className="num">
                            <When timestamp={activity.timestamp} now={now} />
                          </td>
                          <td className="num">
                            <Link to={activity.href} aria-label="Open entry">
                              <CurateIcon name="external" size={14} />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </TableScroller>
            ) : layout === 'cards' ? (
              <Grid $min={260} style={{ padding: 16 }}>
                {visible.map((activity) => (
                  <Card
                    key={activity.id}
                    role="presentation"
                    onClick={(event) =>
                      openUnlessLink(event, () => navigate(activity.href))
                    }
                  >
                    {renderStatus(activity)}
                    <div style={{ minWidth: 0 }}>
                      <RegistryName to={registryHref(activity)}>
                        {activity.registryTitle}
                      </RegistryName>
                      <Small $faint>
                        {truncateMiddle(activity.registryAddress)}
                      </Small>
                    </div>
                    <Row $gap={6} $wrap>
                      <ChainChip chainId={activity.chainId} size="sm" />
                      <EntryId itemID={activity.itemID} />
                    </Row>
                    <CardFooter>
                      <When timestamp={activity.timestamp} now={now} />
                      <OpenLink to={activity.href}>
                        Open entry
                        <CurateIcon name="external" size={14} />
                      </OpenLink>
                    </CardFooter>
                  </Card>
                ))}
              </Grid>
            ) : (
              <RowsShell>
                {visible.map((activity) => (
                  <ActivityRow
                    key={activity.id}
                    role="presentation"
                    onClick={(event) =>
                      openUnlessLink(event, () => navigate(activity.href))
                    }
                  >
                    <RowCopy>
                      {renderStatus(activity)}
                      <RowMeta>
                        <RegistryName to={registryHref(activity)}>
                          {activity.registryTitle}
                        </RegistryName>
                        <EntryId itemID={activity.itemID} />
                      </RowMeta>
                    </RowCopy>
                    <RowRight>
                      <ChainChip chainId={activity.chainId} size="sm" />
                      <When timestamp={activity.timestamp} now={now} />
                      <OpenLink to={activity.href} aria-label="Open entry">
                        <CurateIcon name="external" size={14} />
                      </OpenLink>
                    </RowRight>
                  </ActivityRow>
                ))}
              </RowsShell>
            )}

            {!loading && shown.length > 0 && (
              <Footer>
                <Small $muted>
                  {formatInt((currentPage - 1) * PAGE_SIZE + 1)}–
                  {formatInt(Math.min(currentPage * PAGE_SIZE, shown.length))}{' '}
                  of {formatInt(shown.length)} actions
                </Small>
                {shown.length > PAGE_SIZE && (
                  <Pagination
                    current={currentPage}
                    pageSize={PAGE_SIZE}
                    total={shown.length}
                    onChange={setPage}
                  />
                )}
              </Footer>
            )}
          </Surface>

          <Stack $gap={16}>
            {!loading && challenges > 0 && (
              <Surface $padding="standard" aria-label="Challenge record">
                <PanelHeader>
                  <PanelTitle>Challenge record</PanelTitle>
                </PanelHeader>
                <Gauge
                  ratio={won / challenges}
                  tone="registered"
                  label="Challenges won"
                  value={`${formatInt(won)} of ${formatInt(challenges)}`}
                  hint="Challenges where the court rejected the request, out of all challenges including those still in court."
                />
              </Surface>
            )}

            <Surface $padding="standard" aria-label="Badges">
              <PanelHeader>
                <PanelTitle>Badges</PanelTitle>
                <Label $tone="faint">All chains</Label>
              </PanelHeader>
              {loading || !data ? (
                <SkeletonBlock $height="160px" />
              ) : (
                <div>
                  {data.badges.map((badge) => (
                    <BadgeRow key={badge.id}>
                      <div style={{ minWidth: 0 }}>
                        <Row $gap={8}>
                          <Small>{badge.label}</Small>
                          {badge.earned && (
                            <Chip>
                              <StatusDot $tone="registered" aria-hidden />
                              Earned
                            </Chip>
                          )}
                        </Row>
                        <Small $muted>{badge.description}</Small>
                      </div>
                      <Data $muted $weight={400}>
                        {formatInt(badge.progress)}/{formatInt(badge.goal)}
                      </Data>
                      <Rail
                        $value={badge.goal ? badge.progress / badge.goal : 0}
                        $tone={badge.earned ? 'registered' : 'neutral'}
                      />
                    </BadgeRow>
                  ))}
                </div>
              )}
            </Surface>
          </Stack>
        </SplitGrid>
      </Section>

      {!query.isError && (
        <Section>
          <GovernancePanel
            registries={data?.governedRegistries ?? []}
            profileAddress={address}
            loading={loading}
          />
        </Section>
      )}
    </Page>
  )
}

export default AddressPage
