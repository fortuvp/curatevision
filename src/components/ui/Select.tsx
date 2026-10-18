import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useId,
  Children,
} from 'react'
import { createPortal } from 'react-dom'
import styled, { css } from 'styled-components'
import { KitIcon } from './kit-icons'
import { joinClassNames, overlayPanel, ringSpinner } from './kit-styles'

/*
 * Select: a 40px control with radius 6 and the action color on focus; the
 * option panel is styled like the app bar's menus and keeps the keyboard
 * working (arrows, Enter, Escape).
 */
const SelectWrapper = styled.div`
  display: inline-block;
  max-width: 100%;
`

const SelectTrigger = styled.button<{ $focused?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid
    ${({ $focused }) =>
      $focused ? 'var(--color-primary)' : 'var(--color-border)'};
  border-radius: var(--radius);
  background: var(--color-surface);
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  text-align: left;
  cursor: pointer;
  user-select: none;
  transition: border-color var(--motion);

  &:hover:not(:disabled) {
    border-color: ${({ $focused }) =>
      $focused ? 'var(--color-primary)' : 'var(--color-border-strong)'};
  }

  &:disabled {
    background: var(--color-raised);
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
  flex: 0 0 auto;
  color: var(--color-faint);
  transition: transform var(--motion);
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
`

const Spinner = styled.span`
  ${ringSpinner}
  width: 14px;
  height: 14px;
  color: var(--color-muted);
`

const DropdownStyled = styled.div`
  position: fixed;
  z-index: 1050;
  max-height: 280px;
  padding: 6px;
  overflow-y: auto;
  ${overlayPanel}
`

const SearchInput = styled.input`
  width: 100%;
  height: 32px;
  margin-bottom: 6px;
  padding: 0 10px;
  border: 0;
  border-bottom: 1px solid var(--color-border);
  border-radius: 0;
  background: transparent;
  color: var(--color-text);
  font-family: var(--font-sans);
  font-size: var(--fs-body);

  &::placeholder {
    color: var(--color-faint);
  }

  &:focus-visible {
    outline: none;
    border-bottom-color: var(--color-primary);
  }
`

const OptionItem = styled.div<{
  $selected?: boolean
  $disabled?: boolean
  $highlighted?: boolean
}>`
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  color: ${({ $selected }) =>
    $selected ? 'var(--color-primary)' : 'var(--color-text)'};
  background: ${({ $selected, $highlighted }) =>
    $selected
      ? 'var(--color-primary-soft)'
      : $highlighted
        ? 'var(--color-raised)'
        : 'transparent'};
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: ${({ $selected }) => ($selected ? 500 : 400)};
  cursor: pointer;
  transition: background var(--motion);

  ${({ $disabled, $selected }) =>
    $disabled
      ? css`
          color: var(--color-muted);
          cursor: not-allowed;
          opacity: 0.55;
        `
      : css`
          &:hover {
            background: ${$selected
              ? 'var(--color-primary-soft)'
              : 'var(--color-raised)'};
          }
        `}
`

const EmptyOption = styled.div`
  padding: 8px 10px;
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
  const [dropdownPos, setDropdownPos] = useState({
    top: 0,
    left: 0,
    width: 0,
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

  // Place the panel under the trigger (fixed, so it escapes clipped parents)
  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

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
            <KitIcon name="chevron-down" size={14} />
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
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
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
                  {opt.label}
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
