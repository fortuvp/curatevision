import React from 'react'
import styled from 'styled-components'

/*
 * On phones the item page's action card becomes a sticky bottom bar
 * (DESIGN.md, Layout): the status on the left, the one action on the right.
 * Hidden above 720px, where the right rail holds the action card.
 */

const Bar = styled.div`
  display: none;

  @media (max-width: 720px) {
    position: fixed;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px calc(10px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: var(--shadow-overlay);

    > :last-child {
      flex: 0 0 auto;
    }
  }
`

const StatusSlot = styled.div`
  min-width: 0;
  overflow: hidden;
`

export const StickyActionBar = ({
  status,
  action,
}: {
  status: React.ReactNode
  action: React.ReactNode
}) => (
  <Bar role="region" aria-label="Entry actions">
    <StatusSlot>{status}</StatusSlot>
    {action}
  </Bar>
)

/** Keeps the page bottom clear of the fixed bar on phones. */
export const StickyActionBarSpacer = styled.div`
  display: none;

  @media (max-width: 720px) {
    display: block;
    height: calc(72px + env(safe-area-inset-bottom));
  }
`

export default StickyActionBar
