import React from 'react'
import styled from 'styled-components'
import { LAYOUT_OPTIONS, type ListLayout } from 'hooks/use-stored-layout'
import {
  ChipButton,
  SearchField,
  SegmentedControl,
  Small,
  StatusDot,
  type StatusTone,
} from './primitives'
import { CurateIcon } from './icons'

/*
 * Registry toolbar: search, status filter chips (multi-select), sort, the
 * sensitive-content switch and the remembered layout switcher.
 */

const Bar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 24px 0 16px;
`

const Search = styled(SearchField)`
  flex: 1 1 260px;
`

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  width: 100%;
`

const Toggle = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
  color: var(--color-muted);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  cursor: pointer;
  user-select: none;

  input {
    accent-color: var(--color-primary);
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
    </Search>
    <SegmentedControl<'newest' | 'oldest'>
      ariaLabel="Sort"
      value={sort}
      onChange={onSortChange}
      options={[
        { value: 'newest', label: 'Newest' },
        { value: 'oldest', label: 'Oldest' },
      ]}
    />
    <SegmentedControl
      ariaLabel="Layout"
      value={layout}
      onChange={onLayoutChange}
      options={LAYOUT_OPTIONS}
    />
    <Chips role="group" aria-label="Status filters">
      {chips.map((chip) => (
        <ChipButton
          key={chip.key}
          type="button"
          aria-pressed={chip.checked}
          $selected={chip.checked}
          onClick={() => onChipChange(chip.key, !chip.checked)}
        >
          {chip.tone && <StatusDot $tone={chip.tone} aria-hidden />}
          {chip.label}
        </ChipButton>
      ))}
      <Toggle>
        <input
          type="checkbox"
          checked={nsfwFilter}
          onChange={(event) => onNsfwChange(event.currentTarget.checked)}
        />
        Hide sensitive content
      </Toggle>
      <Small $muted>
        {shown} of {total} shown
      </Small>
    </Chips>
  </Bar>
)

export default RegistryToolbar
