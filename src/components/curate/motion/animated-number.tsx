import React from 'react'
import useCountUp from 'hooks/use-count-up'

const formatter = new Intl.NumberFormat('en-US')

/** A count-up number; renders an em dash until the value is known. */
export const AnimatedNumber = ({
  value,
  duration,
  format = (n: number) => formatter.format(Math.round(n)),
}: {
  value?: number
  duration?: number
  format?: (n: number) => string
}) => {
  const current = useCountUp(value, duration)
  if (value === undefined) return <>—</>
  return (
    <span aria-label={format(value)}>
      <span aria-hidden>{format(current)}</span>
    </span>
  )
}

export default AnimatedNumber
