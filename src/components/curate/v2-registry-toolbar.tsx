import styled from 'styled-components'
import { CurateIcon } from './icons'

export const ToolbarSearch = styled.label`
  position: relative;
  display: flex;
  align-items: center;
  min-width: 240px;
  flex: 0 1 360px;

  svg {
    position: absolute;
    left: 14px;
    color: var(--curate-muted);
    pointer-events: none;
  }

  @media (max-width: 768px) {
    width: 100%;
    min-width: 0;
    flex: 1 1 auto;
  }
`

export const ToolbarSearchInput = styled.input`
  width: 100%;
  height: 42px;
  border: 1px solid var(--klerosUIComponentsStroke);
  border-radius: var(--radius-sm);
  background: var(--klerosUIComponentsWhiteBackground);
  color: var(--klerosUIComponentsPrimaryText);
  padding: 0 14px 0 42px;
  font-size: 14px;
  font-weight: 400;
  outline: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background 0.18s ease;

  &::placeholder {
    color: var(--klerosUIComponentsSecondaryText);
    font-weight: 400;
  }

  &:hover,
  &:focus {
    border-color: var(--klerosUIComponentsPrimaryBlue);
    background: var(--klerosUIComponentsWhiteBackground);
    box-shadow: 0 0 0 3px var(--klerosUIComponentsMediumBlue);
  }
`

export const ToolbarMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  color: var(--curate-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
  min-width: 96px;
`

const ViewModeButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid var(--klerosUIComponentsStroke);
  border-radius: var(--radius-sm);
  background: var(--klerosUIComponentsWhiteBackground);
  color: var(--klerosUIComponentsPrimaryBlue);
  cursor: pointer;
  transition: color var(--klerosUIComponentsTransitionSpeed);

  &:hover {
    color: var(--klerosUIComponentsSecondaryBlue);
  }

  &:focus-visible {
    outline: 2px solid var(--klerosUIComponentsPrimaryBlue);
    outline-offset: 2px;
  }
`

export type V2RegistryViewMode = 'list' | 'grid'

export const ViewModeToggle = ({
  viewMode,
  onChange,
}: {
  viewMode: V2RegistryViewMode
  onChange: (viewMode: V2RegistryViewMode) => void
}) => {
  const nextMode = viewMode === 'list' ? 'grid' : 'list'

  return (
    <ViewModeButton
      type="button"
      aria-label={`Switch to ${nextMode} view`}
      title={`Switch to ${nextMode} view`}
      onClick={() => onChange(nextMode)}
    >
      <CurateIcon name={viewMode === 'list' ? 'grid' : 'list'} size={18} />
    </ViewModeButton>
  )
}

const valueToSearchText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number')
    return String(value)
  if (Array.isArray(value)) return value.map(valueToSearchText).join(' ')
  if (typeof value === 'object')
    return Object.values(value as Record<string, unknown>)
      .map(valueToSearchText)
      .join(' ')
  return ''
}

export const itemMatchesSearch = (item: any, rawSearch: string) => {
  const query = rawSearch.trim().toLowerCase()
  if (!query) return true

  const text = [
    item?.itemID,
    item?.ID,
    item?.status,
    item?.tcrData?.itemID,
    item?.tcrData?.ID,
    item?.tcrData?.status,
    item?.columns,
    item?.metadata?.props,
    item?.props,
  ]
    .map(valueToSearchText)
    .join(' ')
    .toLowerCase()

  return text.includes(query)
}
