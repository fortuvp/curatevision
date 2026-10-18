import React from 'react'
import styled from 'styled-components'
import { Label, Small, type StatusTone } from './primitives'

/*
 * Ring gauge (DESIGN.md, Shapes): 6px stroke, status color fill, figure inside
 * in mono. Used for real ratios only, never invented targets.
 */

const Wrap = styled.div`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
`

const Ring = styled.svg`
  display: block;
  width: 72px;
  height: 72px;
`

const Center = styled.text`
  fill: var(--color-text);
  font-family: var(--font-mono);
  font-size: 15px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
`

const Copy = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
`

const Value = styled.div`
  color: var(--color-text);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 600;
`

export const Gauge = ({
  ratio,
  tone = 'window',
  label,
  value,
  hint,
}: {
  /** 0..1 */
  ratio: number
  tone?: StatusTone
  label: string
  value: React.ReactNode
  hint?: React.ReactNode
}) => {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0))
  const radius = 30
  const circumference = 2 * Math.PI * radius
  const dash = circumference * clamped
  const percent = Math.round(clamped * 100)
  return (
    <Wrap role="img" aria-label={`${label}: ${percent}%`}>
      <Ring viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="var(--color-raised)"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={`var(--status-${tone})`}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform="rotate(-90 36 36)"
        />
        <Center x="36" y="41" textAnchor="middle">
          {percent}%
        </Center>
      </Ring>
      <Copy>
        <Label>{label}</Label>
        <Value>{value}</Value>
        {hint && <Small $muted>{hint}</Small>}
      </Copy>
    </Wrap>
  )
}

export default Gauge
