import React from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames, toneColor, toneFor, type Tone } from './kit-styles'

/*
 * Timeline: 8px dots in the status roles on a hairline rail. `color` takes a
 * status word (registered, window, contested, off, neutral) or a legacy
 * color word; anything else is used as given.
 */
const TimelineWrapper = styled.ul`
  position: relative;
  list-style: none;
  margin: 0;
  padding: 0;
`

const TimelineItemWrapper = styled.li`
  position: relative;
  padding: 0 0 20px 24px;

  &:last-child {
    padding-bottom: 0;
  }
`

const TimelineTail = styled.div`
  position: absolute;
  top: 16px;
  left: 3.5px;
  width: 1px;
  height: calc(100% - 16px);
  background: var(--color-border);

  ${TimelineItemWrapper}:last-child & {
    display: none;
  }
`

const TimelineDot = styled.div<{
  $tone: Tone
  $raw?: string
  $custom?: boolean
}>`
  position: absolute;
  left: 0;
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-pill);
  background: ${({ $tone, $raw }) => $raw || toneColor($tone)};

  ${({ $custom }) =>
    $custom &&
    css`
      top: 2px;
      left: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: auto;
      height: auto;
      border-radius: 0;
      background: var(--color-surface);
      color: var(--color-muted);
      transform: translateX(-50%);
    `}
`

const TimelineContent = styled.div`
  min-height: 20px;
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);

  a {
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`

interface TimelineItemProps {
  dot?: React.ReactNode
  color?: string
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const TimelineItem: React.FC<TimelineItemProps> = ({
  dot,
  color,
  children,
  style,
  className,
}) => {
  const tone = toneFor(color) || 'neutral'
  const raw = color && !toneFor(color) ? color : undefined

  return (
    <TimelineItemWrapper
      style={style}
      className={joinClassNames('ui-timeline-item', className)}
    >
      <TimelineTail className="ui-timeline-tail" aria-hidden />
      <TimelineDot
        className="ui-timeline-dot"
        $tone={tone}
        $raw={raw}
        $custom={Boolean(dot)}
        aria-hidden={dot ? undefined : true}
      >
        {dot || null}
      </TimelineDot>
      <TimelineContent className="ui-timeline-content">
        {children}
      </TimelineContent>
    </TimelineItemWrapper>
  )
}

TimelineItem.displayName = 'Timeline.Item'

interface TimelineProps {
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

interface TimelineComponent extends React.FC<TimelineProps> {
  Item: React.FC<TimelineItemProps>
}

const Timeline: TimelineComponent = ({ children, style, className }) => (
  <TimelineWrapper
    style={style}
    className={joinClassNames('ui-timeline', className)}
  >
    {children}
  </TimelineWrapper>
)

Timeline.Item = TimelineItem

export default Timeline
