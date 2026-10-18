import React from 'react'
import styled from 'styled-components'
import {
  Body,
  ButtonLink,
  Label,
  Page,
  Row,
  Stack,
  Statement,
} from 'components/curate/primitives'

/*
 * Error page (DESIGN.md): a mono eyebrow carries the code, the page's one
 * serif statement says what went wrong, plain sentences say why and what to
 * do next. No illustration: type and structure are the identity.
 */

const Wrap = styled(Stack)`
  max-width: 560px;
  padding-top: 24px;
`

interface ErrorPageProps {
  code?: string | null
  title?: string | null
  message?: string | null
  tip?: string | React.ReactNode | null
}

const ErrorPage = ({ code, title, message, tip }: ErrorPageProps) => {
  const shownCode = code || '404'
  const notFound = shownCode === '404'
  const heading =
    title || (notFound ? 'Page not found' : 'Something went wrong')
  const body = message || (notFound ? 'This page could not be found.' : null)

  return (
    <Page>
      <Wrap $gap={16}>
        <Label $tone="faint">{shownCode}</Label>
        <Statement>{heading}</Statement>
        {body && (
          <Body $muted $large>
            {body}
          </Body>
        )}
        {tip && <Body $muted>{tip}</Body>}
        <Row $gap={8} $wrap>
          <ButtonLink to="/" $variant="secondary">
            Go to the dashboard
          </ButtonLink>
        </Row>
      </Wrap>
    </Page>
  )
}

export default ErrorPage
