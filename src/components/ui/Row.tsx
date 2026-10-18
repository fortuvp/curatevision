import React from 'react'
import styled, { css } from 'styled-components'
import { joinClassNames } from './kit-styles'

const justifyMap: Record<string, string> = {
  start: 'flex-start',
  end: 'flex-end',
  center: 'center',
  'space-between': 'space-between',
  'space-around': 'space-around',
}

const alignMap: Record<string, string> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
}

const BREAKPOINT_WIDTHS: [string, number][] = [
  ['xxl', 1600],
  ['xl', 1200],
  ['lg', 992],
  ['md', 768],
  ['sm', 576],
  ['xs', 0],
]

/** Horizontal and vertical gutter from a number, a [h, v] pair or a breakpoint map. */
const resolveGutter = (gutter: number | object): [number, number] => {
  if (typeof gutter === 'number') return [gutter, 0]
  if (Array.isArray(gutter))
    return [Number(gutter[0]) || 0, Number(gutter[1]) || 0]
  if (gutter && typeof gutter === 'object') {
    const map = gutter as Record<string, number>
    const width = typeof window === 'undefined' ? 1200 : window.innerWidth
    for (const [name, min] of BREAKPOINT_WIDTHS)
      if (map[name] !== undefined && width >= min) return [map[name], 0]
  }
  return [0, 0]
}

interface RowWrapperProps {
  $justify?: string
  $align?: string
  $gutter?: number
  $rowGap?: number
}

const RowWrapper = styled.div<RowWrapperProps>`
  display: flex;
  flex-flow: row wrap;
  min-width: 0;
  ${({ $justify }) =>
    $justify &&
    css`
      justify-content: ${justifyMap[$justify] || $justify};
    `}
  ${({ $align }) =>
    $align &&
    css`
      align-items: ${alignMap[$align] || $align};
    `}
  ${({ $gutter }) =>
    $gutter &&
    $gutter > 0 &&
    css`
      margin-left: -${$gutter / 2}px;
      margin-right: -${$gutter / 2}px;
    `}
  ${({ $rowGap }) =>
    $rowGap &&
    $rowGap > 0 &&
    css`
      row-gap: ${$rowGap}px;
    `}
`

interface RowProps {
  type?: string
  justify?: string
  align?: string
  gutter?: number | object
  children?: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const Row: React.FC<RowProps> = ({
  justify,
  align,
  gutter = 0,
  children,
  style,
  className,
}) => {
  const [gutterValue, rowGap] = resolveGutter(gutter)

  const childrenWithGutter =
    gutterValue > 0
      ? React.Children.map(children, (child) => {
          if (!child || !React.isValidElement(child)) return child
          return React.cloneElement(child as React.ReactElement<any>, {
            $gutter: gutterValue,
          })
        })
      : children

  return (
    <RowWrapper
      $justify={justify}
      $align={align}
      $gutter={gutterValue}
      $rowGap={rowGap}
      style={style}
      className={joinClassNames('ui-row', className)}
    >
      {childrenWithGutter}
    </RowWrapper>
  )
}

export default Row
