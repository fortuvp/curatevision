import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useLayoutEffect,
  useMemo,
  useId,
  Children,
} from 'react'
import { createPortal } from 'react-dom'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import {
  fieldFocus,
  fieldHover,
  fieldSurface,
  floatingEntrance,
  joinClassNames,
  menuRow,
  overlayPanel,
  ringSpinner,
} from './kit-styles'

/*
 * Select, v2: the same raised 44px field as Input with a chevron that turns
 * on open; the option panel is glass like the app bar menus (40px rows,
 * radius 12, the chosen row tinted and checked). Keyboard works throughout
 * (arrows, Enter, Escape), and the panel flips above when there is no room.
 */
/* Panel geometry: 40px rows with a 2px gap, 6px padding and a hairline. */
const PANEL_MAX = 296
const PANEL_MIN = 120
const PANEL_GAP = 6
const VIEWPORT_EDGE = 8
const OPTION_ROW = 42
const SEARCH_ROW = 46
const PANEL_CHROME = 14

const SelectWrapper = styled.div`
  display: inline-block;
  max-width: 100%;
`

const SelectTrigger = styled.button<{ $focused?: boolean }>`
  ${fieldSurface}
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  padding: 0 12px 0 14px;
  font-family: var(--font-sans);
  font-size: var(--fs-body-lg);
  line-height: var(--lh-body-lg);
  text-align: left;
  cursor: pointer;
  user-select: none;

  /* Hover never outranks focus or the open state. */
  &:hover:not(:disabled):not(:focus-visible):not([aria-expanded='true']) {
    ${fieldHover}
  }

  ${({ $focused }) =>
    $focused &&
    css`
      && {
        ${fieldFocus}
      }
    `}

  &:focus-visible {
    ${fieldFocus}
  }

  &:disabled {
    background: transparent;
    color: var(--color-muted);
    cursor: not-allowed;
  }
`

const SelectValue = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Placeholder = styled.span`
  color: var(--color-faint);
`

const Arrow = styled.span<{ $open?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-pill);
  color: ${({ $open }) =>
    $open ? 'var(--color-primary)' : 'var(--color-faint)'};
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  transition:
    transform var(--dur-control) var(--ease-spring),
    color var(--dur-hover) var(--ease-out);
`

const Spinner = styled.span`
  ${ringSpinner}
  width: 16px;
  height: 16px;
  color: var(--color-primary);
`

const DropdownStyled = styled.div<{ $up?: boolean }>`
  position: fixed;
  z-index: 1050;
  max-height: ${PANEL_MAX}px;
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
  ${overlayPanel}
  transform-origin: ${({ $up }) => ($up ? '50% 100%' : '50% 0')};
  ${({ $up }) => floatingEntrance($up)}
`

/* No type attribute, so the global text-input rules leave it alone. */
const SearchInput = styled.input`
  ${fieldSurface}
  width: 100%;
  height: 40px;
  margin-bottom: 6px;
  padding: 0 12px;
  font-family: var(--font-sans);
  font-size: var(--fs-body);

  &::placeholder {
    color: var(--color-faint);
  }

  &:focus-visible {
    ${fieldFocus}
  }
`

const OptionItem = styled.div<{
  $selected?: boolean
  $disabled?: boolean
  $highlighted?: boolean
}>`
  ${menuRow}
  justify-content: space-between;
  color: ${({ $selected }) =>
    $selected ? 'var(--color-primary)' : 'var(--color-text)'};
  background: ${({ $selected, $highlighted }) =>
    $selected
      ? 'var(--color-primary-soft)'
      : $highlighted
        ? 'var(--color-raised)'
        : 'transparent'};
  font-weight: ${({ $selected }) => ($selected ? 500 : 400)};
  cursor: pointer;

  & + & {
    margin-top: 2px;
  }

  ${({ $disabled, $selected }) =>
    $disabled
      ? css`
          color: var(--color-muted);
          cursor: not-allowed;
          opacity: 0.5;
        `
      : css`
          &:hover {
            background: ${$selected
              ? 'var(--color-primary-soft)'
              : 'var(--color-raised)'};
          }
        `}
`

const OptionLabel = styled.span`
  flex: 1;
  min-width: 0;
`

const OptionCheck = styled.span`
  display: inline-flex;
  flex: 0 0 auto;
  color: var(--color-primary);
`

const EmptyOption = styled.div`
  padding: 12px 10px;
  color: var(--color-faint);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  text-align: center;
`

interface OptionProps {
  value: string | number
  disabled?: boolean
  children?: React.ReactNode
}

// Option sub-component (used mainly as a declarative API)
const Option: React.FC<OptionProps> = () => null
Option.displayName = 'Select.Option'

export interface LabeledValue {
  key: string | number
  label: React.ReactNode
}

export type SelectChangeValue = string | number | LabeledValue

interface SelectProps {
  value?: string | number
  onChange?: (value: SelectChangeValue) => void
  disabled?: boolean
  loading?: boolean
  labelInValue?: boolean
  style?: React.CSSProperties
  dropdownStyle?: React.CSSProperties
  defaultValue?: string | number
  placeholder?: string
  showSearch?: boolean
  children?: React.ReactNode
  className?: string
  id?: string
  name?: string
}

interface SelectComponent extends React.FC<SelectProps> {
  Option: React.FC<OptionProps>
}

type ParsedOption = {
  value: string | number
  label: React.ReactNode
  disabled?: boolean
}

const Select: SelectComponent = ({
  value,
  onChange,
  disabled = false,
  loading = false,
  labelInValue = false,
  style,
  dropdownStyle,
  defaultValue,
  placeholder,
  showSearch = false,
  children,
  className,
  id,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState(-1)
  const [selectedValue, setSelectedValue] = useState<
    string | number | undefined
  >(value === undefined ? defaultValue : value)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const [dropdownPos, setDropdownPos] = useState<{
    top?: number
    bottom?: number
    left: number
    width: number
    maxHeight: number
  }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: PANEL_MAX,
  })

  // Sync controlled value
  useEffect(() => {
    if (value !== undefined) setSelectedValue(value)
  }, [value])

  // Parse options from children
  const options = useMemo(() => {
    const opts: ParsedOption[] = []
    Children.forEach(children, (child) => {
      const element = child as React.ReactElement
      if (!element || !element.props) return
      opts.push({
        value: element.props.value,
        label: element.props.children,
        disabled: element.props.disabled,
      })
    })
    return opts
  }, [children])

  // Filter options when searching
  const filteredOptions = useMemo(() => {
    if (!showSearch || !search) return options
    const lowerSearch = search.toLowerCase()
    return options.filter((opt) => {
      const label =
        typeof opt.label === 'string' ? opt.label : String(opt.value)
      return label.toLowerCase().includes(lowerSearch)
    })
  }, [options, search, showSearch])

  // Until the panel has rendered, estimate its height from the rows it holds.
  const estimatedHeight = Math.min(
    PANEL_MAX,
    (showSearch ? SEARCH_ROW : 0) +
      Math.max(1, filteredOptions.length) * OPTION_ROW +
      PANEL_CHROME,
  )
  const estimateRef = useRef(estimatedHeight)
  estimateRef.current = estimatedHeight

  // Place the panel under the trigger (fixed, so it escapes clipped parents).
  // It opens upward only when its real height does not fit below and there
  // is more room above; when neither side fits it is capped to the room.
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom - PANEL_GAP - VIEWPORT_EDGE
    const above = rect.top - PANEL_GAP - VIEWPORT_EDGE
    const panel = dropdownRef.current
    const needed = Math.min(
      PANEL_MAX,
      panel ? panel.scrollHeight + 2 : estimateRef.current,
    )
    const up = below < needed && above > below
    const maxHeight = Math.max(
      PANEL_MIN,
      Math.min(PANEL_MAX, up ? above : below),
    )
    if (up)
      setDropdownPos({
        bottom: window.innerHeight - rect.top + PANEL_GAP,
        left: rect.left,
        width: rect.width,
        maxHeight,
      })
    else
      setDropdownPos({
        top: rect.bottom + PANEL_GAP,
        left: rect.left,
        width: rect.width,
        maxHeight,
      })
  }, [])

  // Re-place the panel once it has rendered and whenever its rows change.
  useLayoutEffect(() => {
    if (open) updateDropdownPosition()
  }, [open, filteredOptions.length, updateDropdownPosition])

  const close = useCallback(() => {
    setOpen(false)
    setSearch('')
    setHighlighted(-1)
  }, [])

  // Click outside, Escape, scroll and resize while open
  useEffect(() => {
    if (!open) return undefined
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        close()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close()
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', updateDropdownPosition, true)
      window.removeEventListener('resize', updateDropdownPosition)
    }
  }, [open, close, updateDropdownPosition])

  // Focus the search input when the panel opens
  useEffect(() => {
    if (open && showSearch && searchRef.current) searchRef.current.focus()
  }, [open, showSearch])

  const handleToggle = useCallback(() => {
    if (disabled || loading) return
    if (open) close()
    else {
      updateDropdownPosition()
      setHighlighted(options.findIndex((opt) => opt.value === selectedValue))
      setOpen(true)
    }
  }, [
    disabled,
    loading,
    open,
    close,
    updateDropdownPosition,
    options,
    selectedValue,
  ])

  const handleSelect = useCallback(
    (opt: ParsedOption) => {
      if (opt.disabled) return
      const newValue = opt.value
      setSelectedValue(newValue)
      close()
      if (onChange)
        if (labelInValue) onChange({ key: newValue, label: opt.label })
        else onChange(newValue)
    },
    [onChange, labelInValue, close],
  )

  const moveHighlight = useCallback(
    (delta: number) => {
      if (filteredOptions.length === 0) return
      setHighlighted((prev) => {
        let next = prev
        for (let i = 0; i < filteredOptions.length; i++) {
          next =
            (next + delta + filteredOptions.length) % filteredOptions.length
          if (!filteredOptions[next].disabled) return next
        }
        return prev
      })
    },
    [filteredOptions],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || loading) return
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        if (!open) {
          handleToggle()
          return
        }
        moveHighlight(e.key === 'ArrowDown' ? 1 : -1)
      } else if (e.key === 'Enter' && open) {
        e.preventDefault()
        const opt = filteredOptions[highlighted]
        if (opt) handleSelect(opt)
      }
    },
    [
      disabled,
      loading,
      open,
      handleToggle,
      moveHighlight,
      filteredOptions,
      highlighted,
      handleSelect,
    ],
  )

  // Find display label for selected value
  const selectedLabel = useMemo(() => {
    const found = options.find((opt) => opt.value === selectedValue)
    return found ? found.label : selectedValue
  }, [selectedValue, options])

  const currentVal = selectedValue
  const hasValue =
    currentVal !== undefined && currentVal !== null && currentVal !== ''

  return (
    <SelectWrapper
      className={joinClassNames(
        'ui-select',
        open && 'ui-select-open',
        disabled && 'ui-select-disabled',
        className,
      )}
    >
      <SelectTrigger
        ref={triggerRef}
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-busy={loading || undefined}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        $focused={open}
        style={style}
        className="ui-select-trigger"
      >
        <SelectValue className="ui-select-value">
          {hasValue ? (
            selectedLabel
          ) : (
            <Placeholder className="ui-select-placeholder">
              {placeholder || ' '}
            </Placeholder>
          )}
        </SelectValue>
        {loading ? (
          <Spinner aria-hidden />
        ) : (
          <Arrow className="ui-select-arrow" $open={open} aria-hidden>
            <KitIcon name="chevron-down" size={16} />
          </Arrow>
        )}
      </SelectTrigger>

      {open &&
        createPortal(
          <DropdownStyled
            ref={dropdownRef}
            id={listboxId}
            role="listbox"
            className="ui-select-dropdown"
            $up={dropdownPos.bottom !== undefined}
            style={{
              top: dropdownPos.top,
              bottom: dropdownPos.bottom,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: dropdownPos.maxHeight,
              ...dropdownStyle,
            }}
          >
            {showSearch && (
              <SearchInput
                ref={searchRef}
                className="ui-select-search"
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setSearch(e.target.value)
                  setHighlighted(0)
                }}
                onKeyDown={handleKeyDown}
                placeholder="Search"
                aria-label="Search options"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
              />
            )}
            {filteredOptions.length === 0 ? (
              <EmptyOption className="ui-select-empty">No options</EmptyOption>
            ) : (
              filteredOptions.map((opt, index) => (
                <OptionItem
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === currentVal}
                  aria-disabled={opt.disabled || undefined}
                  className={joinClassNames(
                    'ui-select-option',
                    opt.value === currentVal && 'ui-select-option-selected',
                  )}
                  $selected={opt.value === currentVal}
                  $disabled={opt.disabled}
                  $highlighted={index === highlighted}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    handleSelect(opt)
                  }}
                >
                  <OptionLabel>{opt.label}</OptionLabel>
                  {opt.value === currentVal && (
                    <OptionCheck aria-hidden>
                      <KitIcon name="check" size={16} />
                    </OptionCheck>
                  )}
                </OptionItem>
              ))
            )}
          </DropdownStyled>,
          document.body,
        )}
    </SelectWrapper>
  )
}

Select.Option = Option

export default Select
