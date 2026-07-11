import React, { useMemo } from 'react'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { NavLink, Link, useLocation } from 'react-router-dom'
import { useWeb3Context } from 'hooks/use-web3-context'
import useUrlChainId from 'hooks/use-url-chain-id'
import { SAVED_NETWORK_KEY } from 'utils/string'
import { preloadFactory } from 'bootstrap/app-router'

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 750;
  line-height: 1;

  ${smallScreenStyle(
    () => css`
      display: none;
    `,
  )}
`

const StyledNavLink = styled(NavLink)`
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 13px;
  border-radius: 3px;
  color: var(--curate-muted);
  text-decoration: none;
  transition:
    color 0.2s ease,
    background 0.2s ease;

  &:hover {
    color: var(--curate-text);
    background: rgba(255, 255, 255, 0.06);
  }

  &.active {
    color: var(--curate-text);
    background: rgba(255, 255, 255, 0.1);
  }
`

const StyledLink = styled(Link)<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 13px;
  border-radius: 3px;
  color: ${({ $active }) =>
    $active ? 'var(--curate-text)' : 'var(--curate-muted)'};
  background: ${({ $active }) =>
    $active ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
  text-decoration: none;
  transition:
    color 0.2s ease,
    background 0.2s ease;

  &:hover {
    color: var(--curate-text);
    background: rgba(255, 255, 255, 0.06);
  }
`

const AppMenu = () => {
  const { pathname } = useLocation()
  const { networkId } = useWeb3Context()
  const urlChainId = useUrlChainId()
  const isHome = pathname === '/'

  const currentChainId = useMemo(() => {
    if (urlChainId) return urlChainId
    const saved = localStorage.getItem(SAVED_NETWORK_KEY)
    return saved ? Number(saved) : networkId
  }, [urlChainId, networkId])
  return (
    <DesktopNav>
      <StyledLink to="/" $active={isHome}>
        Dashboard
      </StyledLink>
      <StyledLink
        to="/browse"
        $active={pathname === '/browse' || pathname.startsWith('/tcr/')}
      >
        Browse
      </StyledLink>
      <StyledLink
        to={`/launch/${currentChainId}`}
        $active={
          pathname.startsWith('/launch') || pathname.startsWith('/factory')
        }
        onMouseEnter={() => preloadFactory()}
      >
        Launch a list
      </StyledLink>
      <StyledNavLink to="/guide">Guide & Skills</StyledNavLink>
    </DesktopNav>
  )
}

export default AppMenu
