import React from 'react'
import styled from 'styled-components'

/*
 * On phones the item page's action card becomes a sticky bottom bar: the
 * status on top, the one action (with its amount) full width under it.
 * A frosted surface so the page reads through as it scrolls. Hidden above
 * 720px, where the right rail holds the action card.
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
    flex-direction: column;
    gap: 10px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--glass-border);
    border-radius: 18px 18px 0 0;
    background: color-mix(in srgb, var(--color-surface) 84%, transparent);
    box-shadow:
      inset 0 1px 0 var(--glass-highlight),
      var(--shadow-overlay);
    backdrop-filter: blur(var(--blur)) saturate(140%);
    -webkit-backdrop-filter: blur(var(--blur)) saturate(140%);
  }
`

const StatusSlot = styled.div`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
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
    height: calc(120px + env(safe-area-inset-bottom));
  }
`

export default StickyActionBar
