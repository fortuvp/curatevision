import React from 'react'
import styled from 'styled-components'
import { Body, Small } from 'components/curate/primitives'

const Text = styled(Body)`
  white-space: pre-line;
  overflow-wrap: anywhere;
`

interface LongTextProps {
  value?: string | null
}

const LongText = ({ value }: LongTextProps) => {
  if (!value) return <Small $faint>No text</Small>

  return <Text>{value}</Text>
}

export default LongText
