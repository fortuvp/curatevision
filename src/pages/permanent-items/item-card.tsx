import React, { useMemo, useState } from 'react'
import { Card } from 'components/ui'
import { V2Field, V2ItemRow } from 'components/curate/v2'
import {
  itemToStatusCode,
  STATUS_CODE,
  STATUS_TEXT,
} from 'utils/permanent-item-status'

interface ItemCardProps {
  item: SubgraphItem
  registry: SubgraphRegistry
  timestamp: BigNumber
  forceReveal?: boolean | null
  chainId?: string | number
  tcrAddress?: string
  viewMode?: 'list' | 'grid'
  [key: string]: unknown
}

const hiddenStatuses = new Set([
  STATUS_CODE.REJECTED,
  STATUS_CODE.REMOVED,
  STATUS_CODE.WITHDRAWN,
  STATUS_CODE.DISPUTED,
  STATUS_CODE.CROWDFUNDING,
  STATUS_CODE.CROWDFUNDING_WINNER,
])

const ItemCard = ({
  item,
  registry,
  timestamp,
  forceReveal = null,
  chainId,
  tcrAddress,
  viewMode = 'list',
  ...rest
}: ItemCardProps) => {
  const [revealed, setRevealed] = useState(false)

  const statusCode = useMemo(
    () =>
      item && registry && timestamp
        ? itemToStatusCode(item, timestamp, registry)
        : undefined,
    [item, registry, timestamp],
  )

  if (!timestamp || !item || !registry) return <Card loading {...rest} />

  const fields: V2Field[] = item.metadata?.props || item.props || []
  const detailsTo = `/tcr/${chainId}/${tcrAddress}/${item.itemID}`
  const shouldHide =
    !forceReveal && !revealed && hiddenStatuses.has(statusCode as number)

  return (
    <V2ItemRow
      fields={fields}
      statusLabel={STATUS_TEXT[statusCode] || 'Unknown'}
      to={detailsTo}
      warning={shouldHide ? 'Warning: potentially offensive content' : null}
      onReveal={shouldHide ? () => setRevealed(true) : undefined}
      viewMode={viewMode}
    />
  )
}

export default React.memo(ItemCard)
