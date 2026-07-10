import React, { useMemo, useState } from 'react'
import { Card } from 'components/ui'
import { V2Field, V2ItemRow } from 'components/curate/v2'
import { itemToStatusCode, STATUS_CODE, STATUS_TEXT } from 'utils/item-status'

interface ItemCardProps {
  item: SubgraphItem
  challengePeriodDuration: BigNumber
  timestamp: BigNumber
  forceReveal?: boolean | null
  metaEvidence: MetaEvidence
  chainId?: string | number
  tcrAddress: string
  viewMode?: 'list' | 'grid'
  [key: string]: unknown
}

const hiddenStatuses = new Set([
  STATUS_CODE.REJECTED,
  STATUS_CODE.REMOVED,
  STATUS_CODE.CHALLENGED,
  STATUS_CODE.CROWDFUNDING,
  STATUS_CODE.CROWDFUNDING_WINNER,
])

const ItemCard = ({
  item,
  challengePeriodDuration,
  timestamp,
  forceReveal = null,
  metaEvidence,
  chainId,
  tcrAddress,
  viewMode = 'list',
  ...rest
}: ItemCardProps) => {
  const [revealed, setRevealed] = useState(false)

  const statusCode = useMemo(
    () =>
      item && challengePeriodDuration && timestamp
        ? itemToStatusCode(item.tcrData, timestamp, challengePeriodDuration)
        : undefined,
    [challengePeriodDuration, item, timestamp],
  )

  if (!challengePeriodDuration || !timestamp || !item)
    return <Card loading {...rest} />

  const fields: V2Field[] =
    item.tcrData?.mergedData || item.columns || item.props || []
  const isTCRofTCRs = Boolean(metaEvidence?.metadata?.isTCRofTCRs)
  const childTcrAddress = isTCRofTCRs ? item.columns?.[0]?.value : null
  const detailsTo = `/tcr/${chainId}/${tcrAddress}/${item.tcrData?.ID || item.itemID}`
  const openListTo = childTcrAddress
    ? `/tcr/${chainId}/${childTcrAddress}`
    : undefined
  const shouldHide =
    !forceReveal && !revealed && hiddenStatuses.has(statusCode as number)

  return (
    <V2ItemRow
      fields={fields}
      statusLabel={STATUS_TEXT[statusCode] || 'Unknown'}
      to={detailsTo}
      openListTo={openListTo}
      warning={shouldHide ? 'Warning: potentially offensive content' : null}
      onReveal={shouldHide ? () => setRevealed(true) : undefined}
      viewMode={viewMode}
    />
  )
}

export default React.memo(ItemCard)
