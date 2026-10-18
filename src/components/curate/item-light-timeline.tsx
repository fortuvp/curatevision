import React from 'react'
import styled from 'styled-components'
import { Data, Small, StatusDot, type StatusTone } from './primitives'
import { formatAbsolute } from 'utils/time'

/*
 * Vertical timeline for an entry's history (DESIGN.md: familiar timeline,
 * exact craft). Each event has a status dot, a title, the absolute UTC
 * time linked to its transaction, and an optional body.
 */

export const Timeline = styled.ol`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Event = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 12px;
  padding-bottom: 18px;

  &:last-child {
    padding-bottom: 0;
  }

  &:not(:last-child)::before {
    content: '';
    position: absolute;
    top: 16px;
    bottom: 0;
    left: 7px;
    width: 1px;
    background: var(--color-border);
  }
`

const Marker = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
`

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  min-width: 0;
`

const Title = styled.span`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
`

const When = styled.a`
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: var(--fs-small);
  line-height: var(--lh-small);
  font-variant-numeric: tabular-nums;
  text-decoration: none;

  &:hover {
    color: var(--color-primary);
    text-decoration: underline;
  }
`

export const TimelineEvent = ({
  tone,
  title,
  /** Unix seconds. */
  timestamp,
  /** Explorer page of the transaction; the date links to it. */
  href,
  detail,
  children,
}: {
  tone: StatusTone
  title: React.ReactNode
  timestamp?: number | null
  href?: string
  detail?: React.ReactNode
  children?: React.ReactNode
}) => (
  <Event>
    <Marker>
      <StatusDot $tone={tone} aria-hidden />
    </Marker>
    <Content>
      <Head>
        <Title>{title}</Title>
        {timestamp ? (
          href ? (
            <When href={href} target="_blank" rel="noopener noreferrer">
              {formatAbsolute(timestamp)}
            </When>
          ) : (
            <Data $muted $weight={400}>
              {formatAbsolute(timestamp)}
            </Data>
          )
        ) : null}
      </Head>
      {detail && <Small $muted>{detail}</Small>}
      {children}
    </Content>
  </Event>
)

export default Timeline
