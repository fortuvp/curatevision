import React, { useState, useEffect, useCallback, useContext } from 'react'
import styled from 'styled-components'
import { Card, Button, Result, Alert } from 'components/ui'
import { Copiable } from '@kleros/ui-components-library'
import { useAccount, usePublicClient, useWalletClient, useChainId } from 'wagmi'
import { simulateContract } from '@wagmi/core'
import { Link, useParams } from 'react-router-dom'
import useUrlChainId from 'hooks/use-url-chain-id'
import { abi as _batchWithdraw } from '@kleros/tcr/build/contracts/BatchWithdraw.json'
import { BigNumber } from 'ethers'
import { TCRViewContext } from 'contexts/tcr-view-context'
import TCRMetadataDisplay from './tcr-metadata-display'
import { batchWithdrawAddresses } from 'config/tcr-addresses'
import { wrapWithToast, errorToast } from 'utils/wrap-with-toast'
import { parseWagmiError } from 'utils/parse-wagmi-error'
import { wagmiConfig } from 'config/wagmi'
import SeerExtraDetails from 'components/custom-registries/seer/seer-item-details'
import { isSeerRegistry } from 'components/custom-registries/seer/is-seer-registry'
import { V2DetailFields, v2ToneFromLabel } from 'components/curate/v2'
import { ItemTypes } from '@kleros/gtcr-encoder'
import { CurateIcon } from 'components/curate/icons'

const V2ItemCard = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: auto;
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid var(--klerosUIComponentsStroke);
  border-radius: 3px 3px 0 0;
  border-bottom-color: transparent;
  background: var(--klerosUIComponentsWhiteBackground);
  box-shadow: var(--v2-shadow);
`

const WarningBar = styled.p`
  width: 100%;
  margin: 0;
  padding: 4px 32px;
  background: var(--klerosUIComponentsWarningLight);
  color: var(--klerosUIComponentsWarning);
  text-align: center;
  font-size: 14px;
  font-weight: 500;
`

const ItemCardTop = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 32px;

  @media (max-width: 760px) {
    padding: 16px;
  }
`

const FieldsColumn = styled.div`
  display: flex;
  flex-grow: 1;
  flex-direction: column;
  flex-wrap: wrap;
  gap: 16px;
  min-width: min(100%, 520px);
  padding-top: 16px;
`

const ItemMetaColumn = styled.div`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 48px;
  padding-top: 20px;
  flex-shrink: 0;

  @media (max-width: 760px) {
    width: 100%;
    justify-content: space-between;
    gap: 20px;
  }
`

const ItemIdLabel = styled.div`
  color: var(--klerosUIComponentsPrimaryBlue);
  font-size: 14px;
  line-height: 18px;
  cursor: default;
`

const StatusDisplay = styled.div<{ $tone: ReturnType<typeof v2ToneFromLabel> }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: ${({ $tone }) =>
    $tone === 'green'
      ? 'var(--klerosUIComponentsSuccess)'
      : $tone === 'red'
        ? 'var(--klerosUIComponentsError)'
        : $tone === 'purple'
          ? 'var(--klerosUIComponentsSecondaryPurple)'
          : 'var(--klerosUIComponentsPrimaryBlue)'};
  font-size: 14px;
  line-height: 18px;

  label {
    display: inline-flex;
    align-items: center;
    color: currentColor;
    text-transform: capitalize;

    &::before {
      content: '';
      display: inline-block;
      width: 8px;
      height: 8px;
      margin-right: 8px;
      border-radius: 50%;
      background: currentColor;
    }
  }

  small {
    color: var(--klerosUIComponentsSecondaryText);
  }
`

const ItemDivider = styled.hr`
  height: 1px;
  margin: 20px 32px 28px;
  border: 0;
  background: var(--klerosUIComponentsStroke);

  @media (max-width: 760px) {
    margin-inline: 16px;
  }
`

const ItemCardBottom = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  padding: 0 32px 12px;

  @media (max-width: 760px) {
    padding: 0 16px 16px;
  }
`

const DetailActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;

  @media (max-width: 760px) {
    width: 100%;
    justify-content: flex-start;
  }
`

const OpenRegistryLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--klerosUIComponentsPrimaryBlue);
  border-radius: 3px;
  color: var(--klerosUIComponentsPrimaryBlue);
  background: var(--klerosUIComponentsWhiteBackground);
  text-decoration: none;
  font-size: 14px;
  line-height: 18px;
  font-weight: 600;

  &:hover {
    color: var(--klerosUIComponentsWhiteBackground);
    background: var(--klerosUIComponentsPrimaryBlue);
  }
`

const MetadataBlock = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  margin-bottom: 18px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--v2-stroke);
`

const StyledAlert = styled(Alert)`
  margin-bottom: 12px;
`

interface ItemDetailsCardProps {
  title?: string | null
  columns?: Column[] | null
  loading?: boolean | null
  item?: SubgraphItem
  itemMetaEvidence?: MetaEvidence | false
  disabled?: boolean
}

const ItemDetailsCard = ({
  title,
  columns,
  loading,
  item,
  itemMetaEvidence,
}: ItemDetailsCardProps) => {
  const { address: account } = useAccount()
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const tcrViewContext = useContext(TCRViewContext)
  const [availableRewards, setAvailableRewards] = useState()
  const BATCH_WITHDRAW_ADDRESS = batchWithdrawAddresses[chainId]
  const { tcrAddress } = useParams()
  const urlChainId = useUrlChainId()

  // Fetch available rewards from fee contributions.
  useEffect(() => {
    ;(async () => {
      if (!tcrViewContext || !tcrViewContext.gtcrView || !account || !item)
        return

      setAvailableRewards(
        await tcrViewContext.gtcrView.availableRewards(
          tcrViewContext.tcrAddress,
          item.itemID,
          account,
        ),
      )
    })()
  }, [account, item, tcrViewContext])

  const batchWithdrawClick = useCallback(async () => {
    if (!tcrViewContext || !BATCH_WITHDRAW_ADDRESS || !item) return

    try {
      const { request } = await simulateContract(wagmiConfig, {
        address: BATCH_WITHDRAW_ADDRESS,
        abi: _batchWithdraw,
        functionName: 'batchRequestWithdraw',
        args: [tcrViewContext.tcrAddress, account, item.itemID, 0, 0, 0, 0],
        account,
      })

      const result = await wrapWithToast(
        () => walletClient.writeContract(request),
        publicClient,
      )

      if (result.status)
        setAvailableRewards(
          await tcrViewContext.gtcrView.availableRewards(
            tcrViewContext.tcrAddress,
            item.itemID,
            account,
          ),
        )
    } catch (err) {
      console.error('Error withdrawing rewards:', err)
      errorToast(parseWagmiError(err))
    }
  }, [
    BATCH_WITHDRAW_ADDRESS,
    account,
    item,
    publicClient,
    tcrViewContext,
    walletClient,
  ])

  const { file: itemMetaEvidenceFile, error: itemMetaEvidenceError } =
    itemMetaEvidence || {}
  const { metadata: itemMetaData, fileURI } = itemMetaEvidenceFile || {}
  const { tcrTitle, tcrDescription, logoURI } = itemMetaData || {}
  const statusLabel = item?.disputed
    ? 'Disputed'
    : String(item?.status || 'Unknown').replace(/([a-z])([A-Z])/g, '$1 $2')
  const statusTone = v2ToneFromLabel(statusLabel)
  const childRegistryAddress =
    itemMetaData && item?.decodedData?.[0]
      ? String(item.decodedData[0])
      : undefined
  const detailFields =
    columns
      ?.map((column, index) => ({
        ...column,
        value: item && item.decodedData[index],
      }))
      .filter((field) => {
        if (!itemMetaData) return true
        const type = String(field.type || '').toLowerCase()
        return (
          type !== String(ItemTypes.GTCR_ADDRESS).toLowerCase() &&
          type !== 'gtcr address'
        )
      }) || []

  if (!loading && item && item.errors.length > 0)
    return (
      <Result
        id="item-details-card"
        status="warning"
        subTitle={item.errors.map((e, i) => (
          <p key={i}>{e}</p>
        ))}
        style={{ width: '100%' }}
      />
    )

  if (loading)
    return <Card id="item-details-card" loading style={{ width: '100%' }} />

  return (
    <V2ItemCard id="item-details-card" aria-label={title || undefined}>
      {itemMetaEvidenceError && (
        <StyledAlert
          message={`Warning: Malformed submission, cannot display TCR information. Error: ${itemMetaEvidenceError.message}`}
          type="warning"
          showIcon
          closable
        />
      )}
      {!item?.decodedData?.length && !columns?.length ? (
        <WarningBar>
          This item does not pass the validation checks. Please review
          carefully.
        </WarningBar>
      ) : null}
      {columns && (
        <>
          <ItemCardTop>
            <FieldsColumn>
              {itemMetaData && (
                <MetadataBlock>
                  <TCRMetadataDisplay
                    logoURI={logoURI}
                    tcrTitle={tcrTitle}
                    fileURI={fileURI}
                    tcrDescription={tcrDescription}
                  />
                </MetadataBlock>
              )}
              <V2DetailFields fields={detailFields} />
            </FieldsColumn>
            <ItemMetaColumn>
              {item?.itemID && (
                <Copiable
                  copiableContent={item.itemID}
                  info="Copy Item Id"
                  iconPlacement="left"
                >
                  <ItemIdLabel>Item Id</ItemIdLabel>
                </Copiable>
              )}
              <StatusDisplay $tone={statusTone}>
                <label>{statusLabel}</label>
              </StatusDisplay>
            </ItemMetaColumn>
          </ItemCardTop>
          <ItemDivider />
          <ItemCardBottom>
            <DetailActions>
              {childRegistryAddress && urlChainId && (
                <OpenRegistryLink
                  to={`/tcr/${urlChainId}/${childRegistryAddress}`}
                >
                  Open Registry
                  <CurateIcon name="external" size={16} />
                </OpenRegistryLink>
              )}
              {item &&
                item.resolved &&
                availableRewards &&
                batchWithdrawClick &&
                availableRewards.gt(BigNumber.from(0)) && (
                  <Button onClick={batchWithdrawClick}>Withdraw Rewards</Button>
                )}
            </DetailActions>
          </ItemCardBottom>
        </>
      )}
      {tcrAddress !== undefined &&
        urlChainId !== undefined &&
        isSeerRegistry(tcrAddress, urlChainId) &&
        item && (
          <SeerExtraDetails
            chainId={urlChainId}
            contractAddress={item.decodedData[0]}
            imagesIpfsHash={item.decodedData[1]}
          />
        )}
    </V2ItemCard>
  )
}

export default ItemDetailsCard
