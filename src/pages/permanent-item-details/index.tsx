import React, { useState, useEffect, useContext, useMemo } from 'react'
import styled from 'styled-components'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ethers, BigNumber } from 'ethers'
import { abi as _IArbitrator } from '@kleros/erc-792/build/contracts/IArbitrator.json'
import { ItemTypes } from '@kleros/gtcr-encoder'
import useUrlChainId from 'hooks/use-url-chain-id'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import useNativeCurrency from 'hooks/native-currency'
import useTokenSymbol from 'hooks/token-symbol'
import useArbitrationCost from 'hooks/arbitration-cost'
import { useEthersProvider } from 'hooks/ethers-adapters'
import { useAttachment } from 'hooks/use-attachment'
import { WalletContext } from 'contexts/wallet-context'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import { PERMANENT_ITEM_DETAILS_QUERY } from 'utils/graphql'
import { STALE_TIME } from 'consts'
import { parseIpfs } from 'utils/ipfs-parse'
import { capitalizeFirstLetter } from 'utils/string'
import { truncateAtWord } from 'utils/truncate-at-word'
import { formatAbsolute, formatDurationLong } from 'utils/time'
import {
  CONTRACT_STATUS,
  STATUS_CODE,
  itemToStatusCode,
} from 'utils/permanent-item-status'
import DisplaySelector from 'components/display-selector'
import PolicyUpdatedBadge from 'components/policy-updated-badge'
import { AddressLink } from 'components/curate/item-stake-address'
import { CurateIcon } from 'components/curate/icons'
import {
  Body,
  Button,
  ChainChip,
  Data,
  EmptyState,
  Heading,
  KeyValueList,
  Label,
  Page,
  PanelHeader,
  PanelTitle,
  Row,
  Section,
  SkeletonBlock,
  Small,
  SplitGrid,
  Stack,
  Surface,
  truncateMiddle,
} from 'components/curate/primitives'
import { EntryStatus, stakeEntryStatus } from 'components/curate/entry-status'
import { Explainer } from 'components/curate/explainer'
import RequestTimelines from 'components/permanent-request-timelines'
import ErrorPage from '../error-page'
import ItemStatusCard, {
  rulingSentence,
  type StakeItem,
  type StakeRegistry,
} from './item-status-card'
import { multiplierPercent, nativeText, tokenText } from './modals/shell'

/*
 * Stake Curate item page (DESIGN.md): breadcrumb, identifiers with the
 * entry status, the fields as a key/value list, the request's parties and
 * amounts, the history with evidence; a right rail with the open window as
 * a countdown, the withdrawal stepper, the stake at risk and the one action.
 * Data plumbing (query, IPFS, arbitration cost, appeal cost) is unchanged.
 */

const Crumbs = styled.nav`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);

  a {
    color: var(--color-muted);
    text-decoration: none;
  }

  a:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }
`

const Header = styled.header`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px 24px;
  align-items: start;
  margin-top: 16px;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`

const HeaderCopy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
`

const ItemHeading = styled(Heading)`
  overflow-wrap: anywhere;
`

const Fields = styled(KeyValueList)`
  gap: 12px 24px;

  dt {
    padding-top: 1px;
  }

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
    gap: 4px 0;

    dd {
      margin-bottom: 8px;
    }
  }
`

const IdRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`

/* Same 24px copy affordance as the address links in the request panel. */
const CopyButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-faint);
  cursor: pointer;

  &:hover {
    color: var(--color-text);
    background: var(--color-raised);
  }
`

const toNum = (value: unknown): number => {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

const isIdentifier = (column: Column): boolean => Boolean(column.isIdentifier)

const displayValue = (value: unknown): string | number | boolean | null =>
  value === undefined || value === null
    ? null
    : typeof value === 'object'
      ? JSON.stringify(value)
      : (value as string | number | boolean)

interface ItemDetailsProps {
  itemID: string
  search?: string
}

const ItemDetails = ({ itemID, search }: ItemDetailsProps) => {
  const { tcrAddress } = useParams()
  const chainId = useUrlChainId()
  const library = useEthersProvider({
    chainId: chainId ?? undefined,
  })
  const [ipfsItemData, setIpfsItemData] = useState<
    { values?: Record<string, unknown> } | undefined
  >()
  const [ipfsError, setIpfsError] = useState(false)
  const [idCopied, setIdCopied] = useState(false)
  const timestamp = useContext(WalletContext)?.timestamp
  const [modalOpen, setModalOpen] = useState(false)
  const { graphqlBatcher } = useGraphqlBatcher()
  const [appealCost, setAppealCost] = useState<BigNumber | null | undefined>()
  const [metaEvidence, setMetaEvidence] = useState<MetaEvidence | undefined>()
  const now = useNow()
  const openAttachment = useAttachment()
  const nativeCurrency = useNativeCurrency()

  // Subgraph item entities have id "<itemID>@<listaddress>".
  const compoundId = `${itemID}@${tcrAddress?.toLowerCase()}`
  const query = useQuery({
    queryKey: ['permanentItemDetails', compoundId],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: PERMANENT_ITEM_DETAILS_QUERY,
        variables: { id: compoundId },
        chainId: chainId!,
        isPermanent: true,
      }),
    enabled: !!chainId,
    staleTime: STALE_TIME,
  })

  const item = useMemo(
    () =>
      (query.isLoading ? undefined : query.data?.item) as StakeItem | undefined,
    [query.isLoading, query.data],
  )

  const registry = useMemo(
    () =>
      (query.isLoading ? undefined : query.data?.item?.registry) as
        | StakeRegistry
        | undefined,
    [query.isLoading, query.data],
  )

  useEffect(() => {
    if (!item || ipfsItemData || ipfsError) return
    fetch(parseIpfs(item.data))
      .then((r) => r.json())
      .then((r) => setIpfsItemData(r))
      .catch((err: unknown) => {
        console.error('Could not get ipfs file', err)
        setIpfsError(true)
      })
  }, [item, ipfsItemData, ipfsError])

  const arbitrationCost = useArbitrationCost({
    address: registry?.arbitrator?.id,
    arbitratorExtraData:
      registry?.arbitrationSettings?.[0]?.arbitratorExtraData,
    library,
  })

  useEffect(() => {
    if (!registry) return
    ;(async () => {
      const arbSetting = registry.arbitrationSettings?.[0]
      if (!arbSetting?.metaEvidenceURI) return
      const response = await fetch(parseIpfs(arbSetting.metaEvidenceURI))
      const file = await response.json()
      setMetaEvidence(file)
    })()
  }, [registry])

  const decodedItem = useMemo(() => {
    if (!item || !metaEvidence?.metadata?.columns || !ipfsItemData)
      return undefined

    const orderDecodedData = (
      columns: Column[],
      values: Record<string, unknown> | undefined,
    ) => {
      const labels = columns.map((column) => column.label)
      const ordered: unknown[] = []
      for (const label of labels) {
        const value = values?.[label]
        ordered.push(value)
      }
      return ordered
    }

    return {
      ...item, // Spread to convert from array to object.
      errors: [] as string[],
      columns: metaEvidence.metadata.columns,
      decodedData: orderDecodedData(
        metaEvidence.metadata.columns,
        ipfsItemData.values,
      ),
    }
  }, [item, metaEvidence, ipfsItemData])

  const { metadata } = metaEvidence || {}
  const { decodedData, columns } = decodedItem || {}
  const { tcrTitle, itemName } = metadata || {}
  const { symbol: tokenSymbol, decimals: tokenDecimals } = useTokenSymbol(
    registry?.token,
  )

  const statusCode = useMemo(() => {
    if (!item || !timestamp || !registry) return null
    return itemToStatusCode(item, timestamp, registry)
  }, [item, timestamp, registry])

  const entryStatus = useMemo(
    () => stakeEntryStatus(item, timestamp, registry),
    [item, timestamp, registry],
  )

  const getStatusPhrase = (statusCode: number | null | undefined) => {
    switch (statusCode) {
      case STATUS_CODE.ACCEPTED:
        return 'is verified to be safe'
      case STATUS_CODE.PENDING:
        return 'is pending verification'
      case STATUS_CODE.DISPUTED:
        return 'is under challenge'
      case STATUS_CODE.CROWDFUNDING:
      case STATUS_CODE.CROWDFUNDING_WINNER:
        return 'is crowdfunding appeal'
      case STATUS_CODE.PENDING_WITHDRAWAL:
        return 'awaits withdrawal'
      case STATUS_CODE.WAITING_ARBITRATOR:
        return 'awaits arbitrator ruling'
      case STATUS_CODE.REJECTED:
        return 'was rejected'
      case STATUS_CODE.REMOVED:
        return 'was removed'
      case STATUS_CODE.WITHDRAWN:
        return 'was withdrawn'
      default:
        return 'has unknown status'
    }
  }

  const fullSeoTitle =
    decodedItem && metadata
      ? `${capitalizeFirstLetter(itemName ?? '')} - ${tcrTitle} - Kleros · Curate`
      : 'Kleros · Curate'
  const truncatedSeoTitle = truncateAtWord(fullSeoTitle, 160)

  const fullSeoMetaDescription =
    decodedItem && metadata && statusCode !== null && decodedData
      ? `${decodedData.join(' ')} - ${getStatusPhrase(statusCode)} on ${
          metadata.tcrTitle
        } in Kleros Curate`
      : 'View item details on Kleros Curate.'
  const truncatedSeoMetaDescription = truncateAtWord(
    fullSeoMetaDescription,
    160,
  )

  const loading =
    !metadata ||
    (!decodedData && decodedItem && decodedItem.errors.length === 0)
  // The subgraph item is here but its fields cannot be decoded: the IPFS
  // file failed to load, or the list's metadata declares no columns.
  const fieldsUnavailable = Boolean(
    item && metadata && !decodedItem && (ipfsError || !metadata.columns),
  )

  const copyItemId = () => {
    navigator.clipboard
      ?.writeText(itemID)
      .then(() => {
        setIdCopied(true)
        window.setTimeout(() => setIdCopied(false), 1500)
        return true
      })
      .catch(() => setIdCopied(false))
  }

  // Check if there is some action on the URL and, if so, run it.
  useEffect(() => {
    if (loading) return

    const params = new URLSearchParams(search)
    if (!params.get('action')) return

    setModalOpen(true)
  }, [loading, search])

  // If the item is disputed, unresolved etc, get the appealCost to propagate it
  // to the appeal funding components.
  useEffect(() => {
    if (!item || !registry || appealCost !== undefined) return
    const challenge = item.challenges[0]
    // Appeal cost might not be applicable.
    if (!challenge || challenge.disputeOutcome) setAppealCost(null)
    else {
      const arbitrator = new ethers.Contract(
        registry.arbitrator.id,
        _IArbitrator,
        library,
      )

      arbitrator
        .appealCost(
          challenge.disputeID,
          challenge.arbitrationSetting.arbitratorExtraData,
        )
        .then((cost: BigNumber) => setAppealCost(cost))
        .catch((err: unknown) => {
          console.error(err)
          setAppealCost(null)
        })
    }
  }, [item, appealCost, library, registry])

  useDocumentHead(truncatedSeoTitle, truncatedSeoMetaDescription)

  if (!tcrAddress || !itemID)
    return (
      <ErrorPage
        code="400"
        message={'This item could not be found.'}
        tip="Make sure your wallet is set to the correct network (is this on Gnosis Chain?)."
      />
    )

  const name = itemName || 'item'
  const Name = capitalizeFirstLetter(name)
  const registryHref = `/tcr/${chainId}/${tcrAddress}`
  const policyURI = registry?.arbitrationSettings?.[0]?.metadata?.policyURI
  const identifierColumns = (columns ?? []).filter(isIdentifier)
  const identifiers = identifierColumns
    .map((column) => {
      const index = (columns ?? []).indexOf(column)
      const value = decodedData?.[index]
      return value === undefined || value === null || value === ''
        ? undefined
        : String(value)
    })
    .filter((value): value is string => Boolean(value))
  const heading =
    identifiers.length > 0
      ? identifiers.join(' · ')
      : loading
        ? undefined
        : Name

  const challenge = item?.challenges?.[0]
  const round = challenge?.rounds?.[0]
  const disputed = item?.status === CONTRACT_STATUS.DISPUTED
  const appealable =
    statusCode === STATUS_CODE.CROWDFUNDING ||
    statusCode === STATUS_CODE.CROWDFUNDING_WINNER
  const includedAt = toNum(item?.includedAt)

  const minStake = registry?.submissionMinDeposit
  const explainerSteps = [
    {
      title: 'A stake backs every entry',
      body: registry
        ? `The submitter locks at least ${tokenText(minStake ?? 0, tokenDecimals, tokenSymbol)} in the list's token${
            arbitrationCost.arbitrationCost
              ? ` plus an arbitration deposit of ${nativeText(arbitrationCost.arbitrationCost, nativeCurrency)}`
              : ' plus an arbitration deposit'
          }. Both stay locked for as long as the ${name} is listed.`
        : `The submitter locks a token stake and an arbitration deposit. Both stay locked for as long as the ${name} is listed.`,
    },
    {
      title: 'Anyone can challenge, at any time',
      body: registry
        ? `A challenger stakes ${multiplierPercent(registry.challengeStakeMultiplier)} of the entry's stake and pays the arbitration cost; Kleros jurors decide. The winner takes the loser's stake. ${
            toNum(registry.submissionPeriod) > 0
              ? `During the first ${formatDurationLong(toNum(registry.submissionPeriod))} the ${name} shows as Pending, then Accepted.`
              : `This list has no submission period: a new ${name} is accepted at once.`
          }`
        : `A challenger stakes a share of the entry's stake and pays the arbitration cost; Kleros jurors decide. The winner takes the loser's stake.`,
    },
    {
      title: 'Withdraw to get the stake back',
      body: registry
        ? `The submitter starts a withdrawal${
            toNum(registry.withdrawingPeriod) > 0
              ? `, waits ${formatDurationLong(toNum(registry.withdrawingPeriod))},`
              : ''
          } then anyone executes it and the stake and deposit return. The ${name} can still be challenged while withdrawing.`
        : `The submitter starts a withdrawal, waits the withdrawing period, then anyone executes it and the stake and deposit return.`,
    },
  ]

  return (
    <Page>
      <Crumbs aria-label="Breadcrumb">
        <Link to="/">Curate</Link>
        <span aria-hidden>›</span>
        <Link to={registryHref}>{tcrTitle ?? 'Registry'}</Link>
        <span aria-hidden>›</span>
        <span>{Name}</span>
      </Crumbs>

      <Header>
        <HeaderCopy>
          <Label>
            {tcrTitle ? `${tcrTitle} · ${name}` : 'Stake Curate entry'}
          </Label>
          {heading ? (
            <ItemHeading>{heading}</ItemHeading>
          ) : (
            <SkeletonBlock $height="28px" $width="60%" />
          )}
          <Row $gap={12} $wrap>
            {entryStatus ? (
              <EntryStatus status={entryStatus} now={now} />
            ) : (
              <SkeletonBlock $height="18px" $width="120px" />
            )}
            {chainId && <ChainChip chainId={chainId} />}
            <IdRow>
              <Data $muted $weight={400} title={itemID}>
                ID {truncateMiddle(itemID, 8, 6)}
              </Data>
              <CopyButton
                type="button"
                onClick={copyItemId}
                aria-label={idCopied ? 'Copied' : 'Copy item ID'}
                title={idCopied ? 'Copied' : 'Copy item ID'}
              >
                <CurateIcon name={idCopied ? 'check' : 'copy'} size={14} />
              </CopyButton>
            </IdRow>
          </Row>
        </HeaderCopy>
        {policyURI && (
          <Button
            type="button"
            $variant="secondary"
            $size="sm"
            onClick={() => openAttachment(parseIpfs(policyURI), true)}
          >
            <CurateIcon name="policy" size={14} />
            Listing policy
            <PolicyUpdatedBadge registryAddress={tcrAddress} />
          </Button>
        )}
      </Header>

      <Section>
        <Explainer
          id="stake-curate-item"
          eyebrow="How this list works"
          heading="A stake keeps every entry honest"
          intro={`Stake Curate keeps a token stake locked while the ${name} is listed, so a challenge is possible at any time.`}
          steps={explainerSteps}
        />
      </Section>

      <Section>
        <SplitGrid $rail={360}>
          <Stack $gap={24}>
            <Surface $padding="standard" aria-label="Fields">
              <PanelHeader>
                <PanelTitle>{Name} fields</PanelTitle>
                {columns && (
                  <Label $tone="faint">{columns.length} fields</Label>
                )}
              </PanelHeader>
              {fieldsUnavailable ? (
                <EmptyState title={`${Name} data unavailable`}>
                  {ipfsError
                    ? `The ${name}'s data could not be loaded from IPFS.`
                    : `This list's metadata declares no fields, so the ${name} cannot be displayed.`}
                </EmptyState>
              ) : loading || !columns ? (
                <Stack $gap={10} aria-busy="true">
                  <SkeletonBlock $height="18px" $width="70%" />
                  <SkeletonBlock $height="18px" $width="50%" />
                  <SkeletonBlock $height="18px" $width="60%" />
                </Stack>
              ) : (
                <Fields>
                  {columns.map((column, index) => (
                    <React.Fragment key={column.label}>
                      <dt title={column.description}>{column.label}</dt>
                      <dd>
                        <DisplaySelector
                          type={column.type || ItemTypes.TEXT}
                          value={displayValue(decodedData?.[index])}
                          allowedFileTypes={column.allowedFileTypes}
                          linkImage
                        />
                      </dd>
                    </React.Fragment>
                  ))}
                </Fields>
              )}
            </Surface>

            <Surface $padding="standard" aria-label="Request">
              <PanelHeader>
                <PanelTitle>Request</PanelTitle>
              </PanelHeader>
              {item && registry ? (
                <Fields>
                  <dt>Submitter</dt>
                  <dd>
                    <AddressLink address={item.submitter} />
                  </dd>
                  <dt>Included</dt>
                  <dd>
                    <Data $weight={400}>
                      {includedAt ? formatAbsolute(includedAt) : '—'}
                    </Data>
                  </dd>
                  <dt>Stake</dt>
                  <dd>
                    <Data>
                      {tokenText(item.stake, tokenDecimals, tokenSymbol)}
                    </Data>
                  </dd>
                  {item.arbitrationDeposit && (
                    <>
                      <dt>Arbitration deposit</dt>
                      <dd>
                        <Data>
                          {nativeText(item.arbitrationDeposit, nativeCurrency)}
                        </Data>
                      </dd>
                    </>
                  )}
                  {challenge &&
                    disputed &&
                    Number(challenge.disputeID) !== 0 && (
                      <>
                        <dt>Challenger</dt>
                        <dd>
                          <AddressLink address={challenge.challenger} />
                        </dd>
                        <dt>Dispute</dt>
                        <dd>
                          <Data>#{challenge.disputeID}</Data>
                        </dd>
                        <dt>Arbitrator</dt>
                        <dd>
                          <AddressLink address={registry.arbitrator.id} />
                        </dd>
                      </>
                    )}
                  {disputed && appealable && (
                    <>
                      <dt>Current ruling</dt>
                      <dd>
                        <Body>{rulingSentence(round?.ruling)}</Body>
                        <Small $muted>Appealable until the period ends.</Small>
                      </dd>
                    </>
                  )}
                </Fields>
              ) : (
                <Stack $gap={10} aria-busy="true">
                  <SkeletonBlock $height="18px" $width="50%" />
                  <SkeletonBlock $height="18px" $width="40%" />
                </Stack>
              )}
            </Surface>

            <RequestTimelines item={item} metaEvidence={metaEvidence} />
          </Stack>

          <ItemStatusCard
            item={decodedItem ?? item}
            registry={registry}
            timestamp={timestamp}
            modalOpen={modalOpen}
            metaEvidence={metaEvidence}
            setModalOpen={setModalOpen}
            appealCost={appealCost ?? undefined}
            arbitrationCost={arbitrationCost.arbitrationCost}
          />
        </SplitGrid>
      </Section>
    </Page>
  )
}

export default ItemDetails
