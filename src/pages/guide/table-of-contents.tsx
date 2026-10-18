import React, { useEffect, useMemo, useRef, useState } from 'react'
import styled from 'styled-components'
import { Label, Small } from 'components/curate/primitives'

/*
 * In-page table of contents for the guide. On desktop it is a rail beside
 * the text that follows the reader; on phones it collapses into a "Contents"
 * block above it. The active entry is the section nearest the top of the
 * viewport.
 *
 * The rail cannot use `position: sticky`: the app shell clips horizontal
 * overflow, which turns it into a scroll container and defeats sticky for
 * everything inside. The rail is therefore measured on scroll and switched
 * between its natural place, a fixed position under the app bar, and the
 * bottom of its column once the article ends.
 */

export interface GuideSectionLink {
  id: string
  label: string
}

export const DESKTOP_QUERY = '(min-width: 1024px)'
const RAIL_GAP = 24

export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [query])
  return matches
}

const appBarHeight = (): number => {
  const raw = getComputedStyle(document.body).getPropertyValue(
    '--app-bar-height',
  )
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) ? parsed : 56
}

/** Runs `measure` now and on every scroll or resize, at most once a frame. */
const useViewportMeasure = (measure: () => void) => {
  useEffect(() => {
    let frame = 0
    const run = () => {
      frame = 0
      measure()
    }
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(run)
    }
    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [measure])
}

/** The id of the last section whose top has scrolled under the app bar. */
const useActiveSection = (ids: string[]): string | undefined => {
  const [active, setActive] = useState<string | undefined>(ids[0])
  const measure = useMemo(
    () => () => {
      const threshold = appBarHeight() + 80
      let current = ids[0]
      for (const id of ids) {
        const element = document.querySelector(`#${id}`)
        if (element && element.getBoundingClientRect().top <= threshold)
          current = id
      }
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2
      setActive(atBottom ? ids[ids.length - 1] : current)
    },
    [ids],
  )
  useViewportMeasure(measure)
  return active
}

type RailPlacement =
  | { mode: 'static' }
  | { mode: 'fixed'; top: number; left: number; width: number }
  | { mode: 'bottom' }

/** Where the rail sits: in its column, pinned under the app bar, or at the column's end. */
const useRailPlacement = (
  slot: React.RefObject<HTMLDivElement>,
  rail: React.RefObject<HTMLElement>,
  enabled: boolean,
): RailPlacement => {
  const [placement, setPlacement] = useState<RailPlacement>({ mode: 'static' })
  const measure = useMemo(
    () => () => {
      if (!enabled || !slot.current || !rail.current) {
        setPlacement({ mode: 'static' })
        return
      }
      const top = appBarHeight() + RAIL_GAP
      const slotRect = slot.current.getBoundingClientRect()
      const railHeight = rail.current.offsetHeight
      setPlacement((previous) => {
        let next: RailPlacement
        if (slotRect.top >= top) next = { mode: 'static' }
        else if (slotRect.bottom - railHeight <= top) next = { mode: 'bottom' }
        else
          next = {
            mode: 'fixed',
            top,
            left: slotRect.left,
            width: slotRect.width,
          }
        return previous.mode === next.mode &&
          (next.mode !== 'fixed' ||
            (previous.mode === 'fixed' &&
              previous.left === next.left &&
              previous.width === next.width &&
              previous.top === next.top))
          ? previous
          : next
      })
    },
    [enabled, slot, rail],
  )
  useViewportMeasure(measure)
  return placement
}

const Slot = styled.div`
  position: relative;
  align-self: stretch;
  min-width: 0;
`

const Rail = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const List = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Entry = styled.a<{ $active?: boolean }>`
  display: block;
  padding: 6px 12px;
  border-left: 2px solid
    ${({ $active }) =>
      $active ? 'var(--color-primary)' : 'var(--color-border)'};
  color: ${({ $active }) =>
    $active ? 'var(--color-text)' : 'var(--color-muted)'};
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-weight: ${({ $active }) => ($active ? 500 : 400)};
  text-decoration: none;
  transition:
    color var(--motion),
    border-color var(--motion);

  &:hover {
    color: var(--color-text);
  }
`

const Details = styled.details`
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  background: var(--color-surface);
  box-shadow: var(--shadow-card);
`

const Summary = styled.summary`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 10px 16px;
  cursor: pointer;
  list-style: none;

  &::-webkit-details-marker {
    display: none;
  }
`

const Chevron = styled.svg`
  flex: 0 0 auto;
  color: var(--color-muted);
  transition: transform var(--motion);

  ${Details}[open] & {
    transform: rotate(180deg);
  }
`

const PhoneList = styled(List)`
  padding: 0 8px 12px;
`

const railStyle = (placement: RailPlacement): React.CSSProperties => {
  switch (placement.mode) {
    case 'fixed':
      return {
        position: 'fixed',
        top: placement.top,
        left: placement.left,
        width: placement.width,
      }
    case 'bottom':
      return { position: 'absolute', bottom: 0, left: 0, right: 0 }
    default:
      return {}
  }
}

export const TableOfContents = ({
  sections,
}: {
  sections: GuideSectionLink[]
}) => {
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const [open, setOpen] = useState(false)
  const slotRef = useRef<HTMLDivElement>(null)
  const railRef = useRef<HTMLElement>(null)
  const ids = useMemo(() => sections.map((section) => section.id), [sections])
  const active = useActiveSection(ids)
  const placement = useRailPlacement(slotRef, railRef, desktop)

  const entries = sections.map((section) => (
    <li key={section.id}>
      <Entry
        href={`#${section.id}`}
        $active={section.id === active}
        aria-current={section.id === active ? 'location' : undefined}
        onClick={() => setOpen(false)}
      >
        {section.label}
      </Entry>
    </li>
  ))

  if (desktop)
    return (
      <Slot ref={slotRef}>
        <Rail
          ref={railRef}
          aria-label="On this page"
          style={railStyle(placement)}
        >
          <Label>Contents</Label>
          <List>{entries}</List>
        </Rail>
      </Slot>
    )

  return (
    <Details
      open={open}
      onToggle={(event) =>
        setOpen((event.currentTarget as HTMLDetailsElement).open)
      }
    >
      <Summary>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Label $tone="text">Contents</Label>
          <Small $faint>{sections.length} sections</Small>
        </span>
        <Chevron
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M3 6l5 5 5-5" />
        </Chevron>
      </Summary>
      <nav aria-label="On this page">
        <PhoneList>{entries}</PhoneList>
      </nav>
    </Details>
  )
}

export default TableOfContents
