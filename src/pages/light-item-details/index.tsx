import React, { useState, useEffect, useContext, useMemo } from 'react'
import { ethers, type BigNumber } from 'ethers'
import styled from 'styled-components'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { abi as _IArbitrator } from '@kleros/erc-792/build/contracts/IArbitrator.json'
import useUrlChainId from 'hooks/use-url-chain-id'
import useDocumentHead from 'hooks/use-document-head'
import useNow from 'hooks/use-now'
import { useEthersProvider } from 'hooks/ethers-adapters'
import useTcrMetaEvidence from 'hooks/use-tcr-meta-evidence'
import { useAttachment } from 'hooks/use-attachment'
import ErrorPage from '../error-page'
import ItemDetailsCard from 'components/item-details-card'
import RequestTimelines, {
  type TimelineRequest,
} from 'components/request-timelines'
import PolicyUpdatedBadge from 'components/policy-updated-badge'
import { LightTCRViewContext } from 'contexts/light-tcr-view-context'
import { WalletContext } from 'contexts/wallet-context'
import { useGraphqlBatcher } from 'contexts/graphql-batcher'
import { capitalizeFirstLetter } from 'utils/string'
import { LIGHT_ITEM_DETAILS_QUERY } from 'utils/graphql'
import { STALE_TIME } from 'consts'
import { parseIpfs } from 'utils/ipfs-parse'
import { truncateAtWord } from 'utils/truncate-at-word'
import { CurateIcon } from 'components/curate/icons'
import {
  Button,
  ChainChip,
  Heading,
  Label,
  Page,
  Row,
  Section,
  SkeletonBlock,
  Small,
  SplitGrid,
  Stack,
} from 'components/curate/primitives'
import { EntryStatus, lightEntryStatus } from 'components/curate/entry-status'
import { Explainer } from 'components/curate/explainer'
import {
  FieldValue,
  identifierFields,
  titleField,
  type EntryField,
} from 'components/curate/item-light-fields'
import { StickyActionBarSpacer } from 'components/curate/item-light-action-bar'
import ItemStatusCard from './item-status-card'
import CrowdfundingCard from './crowdfunding-card'

/*
 * Light Curate item page (DESIGN.md): breadcrumb back to the registry, the
 * identifiers as the title with the status next to it, then two columns:
 * the fields, the history with evidence and the evidence form on the left;
 * the action card on the right (a sticky bottom bar on phones). Every
 * figure comes from the subgraph, the list contract and the clock.
 */

const Crumbs = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: var(--color-muted);
    text-decoration: none;
  }

  a:hover {
    color: var(--color-primary);
  }
`

const TitleBlock = styled.header`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
`

const TitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
`

const EntryTitle = styled(Heading)`
  min-width: 0;
  overflow-wrap: anywhere;

  a {
    color: var(--color-text);
  }
`

const Identifiers = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 6px 20px;
  margin: 0;

  div {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 6px;
    min-width: 0;
  }

  dt {
    color: var(--color-faint);
    font-size: var(--fs-small);
    line-height: var(--lh-small);
  }

  dd {
    margin: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`

export const PolicyLink: React.FC<{ href: string }> = ({ href }) => {
  const openAttachment = useAttachment()
  const { tcrAddress } = useParams<{ tcrAddress: string }>()
  return (
    <Button
      type="button"
      $variant="ghost"
      $size="sm"
      onClick={() => openAttachment(href, true)}
    >
      <CurateIcon name="policy" size={14} />
      Listing policy
      <PolicyUpdatedBadge registryAddress={tcrAddress} />
    </Button>
  )
}

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
    Record<string, unknown> | undefined
  >()
  const timestamp = useContext(WalletContext)?.timestamp
  const [modalOpen, setModalOpen] = useState<boolean | undefined>()
  const tcrViewContext = useContext(LightTCRViewContext)
  const tcrError = tcrViewContext?.tcrError
  const metaEvidence = tcrViewContext?.metaEvidence
  const challengePeriodDuration = tcrViewContext?.challengePeriodDuration
  // null means "resolved, but no appeal cost applies"; undefined means "not yet fetched".
  const [appealCost, setAppealCost] = useState<BigNumber | null | undefined>()
  const now = useNow()

  // subgraph item entities have id "<itemID>@<listaddress>"
  const compoundId = `${itemID}@${tcrAddress?.toLowerCase()}`
  const { graphqlBatcher } = useGraphqlBatcher()
  const detailsViewQuery = useQuery({
    queryKey: ['lightItemDetails', compoundId],
    queryFn: () =>
      graphqlBatcher.fetch({
        id: crypto.randomUUID(),
        document: LIGHT_ITEM_DETAILS_QUERY,
        variables: { id: compoundId },
        chainId: chainId!,
      }),
    enabled: !!chainId,
    staleTime: STALE_TIME,
  })

  const item = useMemo(
    () =>
      detailsViewQuery.isLoading ? undefined : detailsViewQuery.data?.litem,
    [detailsViewQuery.isLoading, detailsViewQuery.data],
  )

  // Scout-style fire-and-forget IPFS background fetch. Only runs when the
  // subgraph didn't index props (indexer hit IPFS failure). Never blocks
  // rendering: the unavailable warning shows immediately and is silently
  // upgraded to real fields if/when the fetch resolves.
  const subgraphPropsMissing =
    !!item && (!item.props || item.props.length === 0)

  useEffect(() => {
    if (!item || !subgraphPropsMissing || ipfsItemData) return
    let cancelled = false
    const controller = new AbortController()
    ;(async () => {
      try {
        const r = await fetch(parseIpfs(item.data), {
          signal: controller.signal,
        })
        if (!r.ok) return
        const data = await r.json()
        if (!cancelled) setIpfsItemData(data)
      } catch (err) {
        if (cancelled) return
        console.error('Could not get ipfs file', err)
      }
    })()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [item, subgraphPropsMissing, ipfsItemData])

  const decodedItem = useMemo(() => {
    if (!item) return undefined

    // Happy path: subgraph already decoded the item into props. Derive columns
    // from props directly so the fields card does not have to wait for the
    // metaEvidence IPFS fetch (which also hits the CDN and can lag).
    if (item.props && item.props.length > 0) {
      type ItemProp = {
        label: string
        value: unknown
        type: string
        description?: string
        isIdentifier?: boolean
      }
      return {
        ...item,
        errors: [],
        columns: item.props.map((p: ItemProp) => ({
          label: p.label,
          type: p.type,
          description: p.description,
          isIdentifier: p.isIdentifier,
        })),
        decodedData: item.props.map((p: ItemProp) => p.value),
      }
    }

    // Props missing from subgraph. If the background IPFS fetch succeeded,
    // show fields; otherwise show the "unavailable" warning immediately so the
    // user isn't stuck behind a hanging gateway.
    if (ipfsItemData && metaEvidence) {
      const columns = metaEvidence.metadata?.columns ?? []
      return {
        ...item,
        errors: [],
        columns,
        decodedData: columns.map(
          (c: { label: string }) =>
            (ipfsItemData.values as Record<string, unknown>)?.[c.label],
        ),
      }
    }

    return {
      ...item,
      errors: [`IPFS data unavailable for this item (${item.data}).`],
      columns: metaEvidence?.metadata?.columns ?? [],
      decodedData: [],
    }
  }, [item, metaEvidence, ipfsItemData])

  const { metadata } = metaEvidence || {}
  const { decodedData } = decodedItem || {}
  const { tcrTitle, itemName } = metadata || {}

  const view = useMemo(
    () => lightEntryStatus(item, timestamp, challengePeriodDuration),
    [item, timestamp, challengePeriodDuration],
  )

  const fields = useMemo<EntryField[]>(
    () =>
      decodedItem
        ? decodedItem.columns.map((column: Column, index: number) => ({
            ...column,
            value: decodedItem.decodedData?.[index],
          }))
        : [],
    [decodedItem],
  )
  const primaryField = useMemo(() => titleField(fields), [fields])
  const otherIdentifiers = useMemo(
    () => identifierFields(fields).filter((field) => field !== primaryField),
    [fields, primaryField],
  )

  const capitalizeFirst = (s: string | undefined) =>
    s ? s.charAt(0).toUpperCase() + s.slice(1) : ''

  const fullSeoTitle =
    decodedItem && metadata
      ? `${capitalizeFirst(itemName)} - ${tcrTitle} - Kleros · Curate`
      : 'Kleros · Curate'
  const truncatedSeoTitle = truncateAtWord(fullSeoTitle, 160)

  const fullSeoMetaDescription =
    decodedItem && metadata && view && (decodedData?.length ?? 0) > 0
      ? `${decodedData.join(' ')} · ${view.label} on ${
          metadata.tcrTitle
        } in Kleros Curate`
      : 'View entry details on Kleros Curate.'
  const truncatedSeoMetaDescription = truncateAtWord(
    fullSeoMetaDescription,
    160,
  )

  // If this is a TCR in a TCR of TCRs, fetch its metadata via cached hook.
  const itemAddress = metadata?.isTCRofTCRs
    ? decodedItem?.decodedData?.[0]
    : undefined
  const itemMetaQuery = useTcrMetaEvidence(itemAddress, chainId ?? undefined)
  const itemMetaEvidence = useMemo(() => {
    if (itemMetaQuery.error) return { error: itemMetaQuery.error }
    if (itemMetaQuery.data) return { file: itemMetaQuery.data }
    return undefined
  }, [itemMetaQuery.data, itemMetaQuery.error])

  // Fields render as soon as the subgraph responds. Neither metaEvidence nor
  // the background IPFS fetch blocks the card: if props are missing, the card
  // shows the "unavailable" warning immediately and silently upgrades if IPFS
  // ever resolves.
  const loading = !item

  // Check if there is some action on the URL and, if so, run it.
  useEffect(() => {
    if (loading) return

    const params = new URLSearchParams(search)
    if (!params.get('action')) return

    setModalOpen(true)
  }, [loading, search])

  // If the item is disputed, unresolved etc, get the appealCost to propagate it to
  // crowdfunding related components
  useEffect(() => {
    if (!item || appealCost !== undefined) return
    const request = item.requests[0]
    // appeal cost might not be applicable
    if (request.resolved || !request.disputed) setAppealCost(null)
    else {
      const arbitrator = new ethers.Contract(
        request.arbitrator,
        _IArbitrator,
        library,
      )
      arbitrator
        .appealCost(request.disputeID, request.arbitratorExtraData)
        .then((cost: BigNumber) => setAppealCost(cost))
        .catch((err: unknown) => {
          console.error(err)
          setAppealCost(null)
        })
    }
  }, [item, appealCost, library])

  useDocumentHead(truncatedSeoTitle, truncatedSeoMetaDescription)

  if (!tcrAddress || !itemID || tcrError)
    return (
      <ErrorPage
        code="400"
        message={
          typeof tcrError === 'string'
            ? tcrError
            : 'This entry could not be found.'
        }
        tip="Make sure your wallet is set to the correct network (is this on Gnosis Chain?)."
      />
    )

  const entryName = itemName ? capitalizeFirstLetter(itemName) : 'Entry'
  const registryHref = `/tcr/${chainId}/${tcrAddress}`

  return (
    <Page>
      <Crumbs aria-label="Breadcrumb">
        <Link to={registryHref}>
          <CurateIcon name="registry" size={14} />
          {tcrTitle || 'Registry'}
        </Link>
        <span aria-hidden>/</span>
        <span>{entryName}</span>
      </Crumbs>

      <TitleBlock>
        <Row $gap={8} $wrap>
          <Label>{entryName}</Label>
          {chainId && <ChainChip chainId={chainId} size="sm" />}
        </Row>
        <TitleRow>
          {loading ? (
            <SkeletonBlock $height="28px" $width="320px" />
          ) : (
            <EntryTitle as="h1">
              {primaryField ? (
                <FieldValue field={primaryField} detailed />
              ) : (
                entryName
              )}
            </EntryTitle>
          )}
          {view && <EntryStatus status={view} now={now} />}
        </TitleRow>
        {otherIdentifiers.length > 0 && (
          <Identifiers>
            {otherIdentifiers.map((field, index) => (
              <div key={`${field.label}-${index}`}>
                <dt>{field.label}</dt>
                <dd>
                  <FieldValue field={field} detailed />
                </dd>
              </div>
            ))}
          </Identifiers>
        )}
        {metaEvidence?.fileURI && (
          <Row $gap={8} $wrap>
            <PolicyLink href={parseIpfs(metaEvidence.fileURI)} />
          </Row>
        )}
      </TitleBlock>

      <Section $gap="sm">
        <SplitGrid $rail={360}>
          <Stack $gap={24}>
            <ItemDetailsCard
              columns={decodedItem?.columns}
              item={decodedItem}
              title={`${entryName} fields`}
              loading={loading}
              itemMetaEvidence={itemMetaEvidence}
            />
            <Explainer
              id="item-light-how-entries-are-judged"
              eyebrow="How this entry is judged"
              heading="A deposit, a window, then jurors if anyone objects."
              steps={[
                {
                  title: 'A request locks a deposit',
                  body: `Submitting or removing a ${itemName || 'entry'} locks the list's base deposit plus the arbitration cost. It comes back in full if nobody challenges.`,
                },
                {
                  title: 'Anyone can challenge during the window',
                  body: 'A challenger locks their own deposit and gives a reason. The window and the cost to challenge are shown in the action card.',
                },
                {
                  title: 'Kleros jurors decide; the winner is paid',
                  body: 'The court rules on the listing policy. The winner takes both deposits minus one arbitration cost; the loser loses the deposit.',
                },
              ]}
              footer={
                <Link to="/guide">
                  <Small>Read the guide</Small>
                </Link>
              }
            />
            {/* Spread the `requests` parameter to convert elements from array to an object */}
            <RequestTimelines
              item={item}
              requests={
                item?.requests &&
                item.requests.map((r: TimelineRequest) => ({ ...r }))
              }
              kind="light"
              metaEvidence={metaEvidence}
            />
          </Stack>

          <Stack $gap={16}>
            <ItemStatusCard
              item={decodedItem}
              timestamp={timestamp}
              request={item?.requests && { ...item.requests[0] }}
              modalOpen={modalOpen}
              setModalOpen={setModalOpen}
              appealCost={appealCost ?? undefined}
              dark
            />
            {/* Appeal funding is only rendered if the item has an appealable dispute. */}
            <CrowdfundingCard
              item={decodedItem}
              timestamp={timestamp}
              appealCost={appealCost ?? undefined}
            />
          </Stack>
        </SplitGrid>
      </Section>
      <StickyActionBarSpacer />
    </Page>
  )
}

export default ItemDetails
