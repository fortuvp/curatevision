import React, { useMemo } from 'react'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { Link, useLocation } from 'react-router-dom'
import { useWeb3Context } from 'hooks/use-web3-context'
import useUrlChainId from 'hooks/use-url-chain-id'
import { SAVED_NETWORK_KEY } from 'utils/string'
import { preloadFactory } from 'bootstrap/app-router'

const DesktopNav = styled.nav`
  display: flex;
  align-items: center;
  gap: 2px;

  ${smallScreenStyle(
    () => css`
      display: none;
    `,
  )}
`

/* Primary navigation (DESIGN.md): sans 14/500, the active item in the action color. */
const NavLink = styled(Link)<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: ${({ $active }) =>
    $active ? 'var(--color-primary)' : 'var(--color-muted)'};
  background: ${({ $active }) =>
    $active ? 'var(--color-primary-soft)' : 'transparent'};
  text-decoration: none;
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
  white-space: nowrap;
  transition:
    color var(--motion),
    background var(--motion);

  &:hover {
    color: ${({ $active }) =>
      $active ? 'var(--color-primary)' : 'var(--color-text)'};
    background: ${({ $active }) =>
      $active ? 'var(--color-primary-soft)' : 'var(--color-raised)'};
  }
`

const AppMenu = () => {
  const { pathname } = useLocation()
  const { networkId } = useWeb3Context()
  const urlChainId = useUrlChainId()

  const currentChainId = useMemo(() => {
    if (urlChainId) return urlChainId
    const saved = localStorage.getItem(SAVED_NETWORK_KEY)
    return saved ? Number(saved) : networkId
  }, [urlChainId, networkId])

  return (
    <DesktopNav aria-label="Main">
      <NavLink to="/" $active={pathname === '/'}>
        Dashboard
      </NavLink>
      <NavLink
        to="/browse"
        $active={pathname === '/browse' || pathname.startsWith('/tcr/')}
      >
        Browse
      </NavLink>
      <NavLink
        to={`/launch/${currentChainId}`}
        $active={
          pathname.startsWith('/launch') || pathname.startsWith('/factory')
        }
        onMouseEnter={() => preloadFactory()}
      >
        Launch a list
      </NavLink>
      <NavLink to="/guide" $active={pathname === '/guide'}>
        Guide
      </NavLink>
    </DesktopNav>
  )
}

export default AppMenu
