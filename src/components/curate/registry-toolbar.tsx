import React from 'react'
import styled from 'styled-components'
import { LAYOUT_OPTIONS, type ListLayout } from 'hooks/use-stored-layout'
import {
  SearchField,
  SegmentedControl,
  StatusDot,
  type StatusTone,
} from './primitives'
import { CurateIcon } from './icons'

/*
 * Registry toolbar: search (with the shown/total count at its end), the
 * sensitive-content switch, sort and layout as sliding segmented controls,
 * and the status filters as a chip rail under them (multi-select; a selected
 * chip fills from its dot). Every chip and control is in view on desktop:
 * the rail wraps. Only on phones does the rail scroll sideways, under a fade.
 */

const integer = new Intl.NumberFormat('en-US')

const Bar = styled.div`
  display: grid;
  grid-template-columns: minmax(220px, 360px) minmax(0, 1fr) auto auto auto;
  grid-template-areas:
    'search . nsfw sort layout'
    'chips chips chips chips chips';
  align-items: center;
  gap: 12px 10px;
  margin: 20px 0 16px;

  @media (max-width: 1100px) {
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-areas:
      'search search search'
      'nsfw sort layout'
      'chips chips chips';
  }

  /* Phones: the search keeps the full width, sort and layout share a line
     (the layout switch keeps its icons only; names stay readable to
     assistive tech), and the switch follows the filters it belongs with. */
  @media (max-width: 520px) {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'search search'
      'sort layout'
      'chips chips'
      'nsfw nsfw';
    gap: 10px 8px;

    [aria-label='Layout'] button {
      gap: 0;
      padding: 0 11px;
      font-size: 0;
    }
  }
`

const Search = styled(SearchField)`
  grid-area: search;
  min-width: 0;
  height: 40px;
`

const Count = styled.span`
  flex: 0 0 auto;
  color: var(--color-muted);
  font-size: 12px;
  line-height: 16px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
`

const RailScroller = styled.div`
  grid-area: chips;
  min-width: 0;

  /* Phones: one swipeable line, the far edge faded so it reads as more. */
  @media (max-width: 720px) {
    margin-right: -4px;
    overflow-x: auto;
    scrollbar-width: none;
    mask-image: linear-gradient(
      90deg,
      var(--color-text) calc(100% - 40px),
      transparent
    );
    -webkit-mask-image: linear-gradient(
      90deg,
      var(--color-text) calc(100% - 40px),
      transparent
    );

    &::-webkit-scrollbar {
      display: none;
    }
  }
`

const Rail = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;

  @media (max-width: 720px) {
    flex-wrap: nowrap;
    width: max-content;
    padding: 2px 40px 2px 0;
  }
`

const ChipToggle = styled.button`
  position: relative;
  isolation: isolate;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 13px 0 11px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--color-raised);
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color var(--motion),
    border-color var(--motion),
    transform var(--motion);

  /* The selected fill slides out from the dot. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--color-primary-soft);
    transform: scaleX(0);
    transform-origin: 14px 50%;
    transition: transform 380ms cubic-bezier(0.34, 1.3, 0.64, 1);
  }

  &:hover {
    color: var(--color-text);
    border-color: var(--color-border-strong);
  }

  &[aria-pressed='true'] {
    color: var(--color-text);
    border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);

    &::before {
      transform: scaleX(1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
  }
`

const Switch = styled.label`
  grid-area: nsfw;
  justify-self: start;
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 32px;
  padding: 0 4px;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;

  input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  i {
    position: relative;
    flex: 0 0 auto;
    width: 28px;
    height: 16px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-pill);
    background: var(--color-raised);
    transition:
      background var(--motion),
      border-color var(--motion);
  }

  i::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 10px;
    height: 10px;
    border-radius: var(--radius-pill);
    background: var(--color-muted);
    transition:
      transform 320ms cubic-bezier(0.34, 1.4, 0.64, 1),
      background var(--motion);
  }

  input:checked + i {
    border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
    background: var(--color-primary-soft);
  }

  input:checked + i::after {
    transform: translateX(12px);
    background: var(--color-primary);
    box-shadow: 0 0 8px var(--color-primary);
  }

  input:focus-visible + i {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &:hover {
    color: var(--color-text);
  }

  @media (max-width: 520px) {
    margin-top: -2px;
  }
`

const Slot = styled.div<{ $area: 'sort' | 'layout' }>`
  grid-area: ${({ $area }) => $area};
  justify-self: end;
  min-width: 0;

  @media (max-width: 520px) {
    justify-self: ${({ $area }) => ($area === 'sort' ? 'start' : 'end')};
  }
`

export interface FilterChip {
  key: string
  label: string
  tone?: StatusTone
  checked: boolean
}

export const RegistryToolbar = ({
  search,
  onSearch,
  placeholder,
  chips,
  onChipChange,
  sort,
  onSortChange,
  layout,
  onLayoutChange,
  nsfwFilter,
  onNsfwChange,
  shown,
  total,
}: {
  search: string
  onSearch: (value: string) => void
  placeholder: string
  chips: FilterChip[]
  onChipChange: (key: string, checked: boolean) => void
  sort: 'newest' | 'oldest'
  onSortChange: (sort: 'newest' | 'oldest') => void
  layout: ListLayout
  onLayoutChange: (layout: ListLayout) => void
  nsfwFilter: boolean
  onNsfwChange: (checked: boolean) => void
  shown: number
  total: number
}) => (
  <Bar role="region" aria-label="Filters">
    <Search>
      <CurateIcon name="search" size={16} />
      <input
        aria-label={placeholder}
        placeholder={placeholder}
        value={search}
        onChange={(event) => onSearch(event.currentTarget.value)}
      />
      <Count aria-live="polite" title="Shown of total">
        {integer.format(shown)} of {integer.format(total)}
      </Count>
    </Search>
    <Switch>
      <input
        type="checkbox"
        checked={nsfwFilter}
        onChange={(event) => onNsfwChange(event.currentTarget.checked)}
      />
      <i aria-hidden />
      Hide sensitive content
    </Switch>
    <Slot $area="sort">
      <SegmentedControl<'newest' | 'oldest'>
        ariaLabel="Sort"
        value={sort}
        onChange={onSortChange}
        options={[
          { value: 'newest', label: 'Newest' },
          { value: 'oldest', label: 'Oldest' },
        ]}
      />
    </Slot>
    <Slot $area="layout">
      <SegmentedControl
        ariaLabel="Layout"
        value={layout}
        onChange={onLayoutChange}
        options={LAYOUT_OPTIONS}
      />
    </Slot>
    <RailScroller>
      <Rail role="group" aria-label="Status filters">
        {chips.map((chip) => (
          <ChipToggle
            key={chip.key}
            type="button"
            aria-pressed={chip.checked}
            onClick={() => onChipChange(chip.key, !chip.checked)}
          >
            {chip.tone && <StatusDot $tone={chip.tone} aria-hidden />}
            {chip.label}
          </ChipToggle>
        ))}
      </Rail>
    </RailScroller>
  </Bar>
)

export default RegistryToolbar
