import styled, { css } from 'styled-components'
import Layout from 'components/ui/Layout'
import { smallScreenStyle } from 'styles/small-screen-style'

const StyledLayoutContent = styled(Layout.Content)`
  width: 100%;
  max-width: 1440px;
  margin: 0 auto;
  padding: 42px var(--horizontal-padding) 56px;

  ${smallScreenStyle(
    () => css`
      padding-top: 24px;
    `,
  )}
`
export default StyledLayoutContent
