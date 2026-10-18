import React, {
  useState,
  useCallback,
  useContext,
  useMemo,
  useEffect,
} from 'react'
import styled, { css } from 'styled-components'
import { smallScreenStyle } from 'styles/small-screen-style'
import { useWeb3Context } from 'hooks/use-web3-context'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Dropdown } from 'components/ui'
import { useAppKit } from '@reown/appkit/react'
import { NETWORKS_INFO } from 'config/networks'
import { SUPPORTED_CHAINS } from 'config/chains'
import Identicon from 'components/identicon'
import CurateWordmark from 'assets/images/curate-v2-wordmark.svg'
import { SAVED_NETWORK_KEY } from 'utils/string'
import AppMenu from 'components/layout/app-menu'
import Help from 'components/layout/help'
import ThemeMenu from 'components/layout/theme-menu'
import {
  BarChipButton,
  BarIconButton,
  BarPrimaryButton,
} from 'components/layout/app-bar-controls'
import { defaultTcrAddresses, type validChains } from 'config/tcr-addresses'
import { StakeContext } from 'contexts/stake-context'
import useUrlChainId from 'hooks/use-url-chain-id'
import { preloadFactory } from 'bootstrap/app-router'
import { CurateIcon } from 'components/curate/icons'
import ChainLogo from 'components/chain-logo'

/*
 * App bar (DESIGN.md, Layout): 56px, sticky, surface at 92% over the bloom with a
 * hairline. Logo, primary navigation, chain chip, account chip or Connect, theme
 * menu, help. On phones the navigation moves under the menu button.
 */
/*
 * Sticky bar; after 24px of scroll it lifts into a floating pill (the spec's
 * top bar) so the content underneath reads through the blur.
 */
const Container = styled.header<{ $floating?: boolean }>`
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  margin: 0 auto;
  max-width: ${({ $floating }) => ($floating ? 'calc(100% - 24px)' : '100%')};
  background: ${({ $floating }) =>
    $floating
      ? 'color-mix(in srgb, var(--color-bg) 72%, transparent)'
      : 'transparent'};
  backdrop-filter: ${({ $floating }) =>
    $floating ? 'blur(16px) saturate(160%)' : 'none'};
  -webkit-backdrop-filter: ${({ $floating }) =>
    $floating ? 'blur(16px) saturate(160%)' : 'none'};
  border: 1px solid
    ${({ $floating }) => ($floating ? 'var(--glass-border)' : 'transparent')};
  border-bottom-color: ${({ $floating }) =>
    $floating ? 'var(--glass-border)' : 'var(--glass-border)'};
  border-radius: ${({ $floating }) => ($floating ? 'var(--radius-pill)' : '0')};
  transform: translateY(${({ $floating }) => ($floating ? '8px' : '0')});
  transition:
    max-width 200ms var(--ease-in-out),
    background-color 200ms var(--ease-in-out),
    border-color 200ms var(--ease-in-out),
    border-radius 200ms var(--ease-in-out),
    transform 200ms var(--ease-in-out);

  @media (max-width: 600px) {
    max-width: 100%;
    border-radius: 0;
    transform: none;
  }
`

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  height: var(--app-bar-height);
  max-width: var(--page-max-width);
  margin: 0 auto;
  padding: 0 var(--horizontal-padding);

  ${smallScreenStyle(
    () => css`
      gap: 8px;
    `,
  )}
`

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;

  ${smallScreenStyle(
    () => css`
      flex: 0 0 auto;
    `,
  )}
`

const MobileMenuWrapper = styled.div`
  display: none;

  ${smallScreenStyle(
    () => css`
      display: block;
    `,
  )}
`

const RightGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1;
  min-width: 0;
`

const MobileNavMenu = styled.nav`
  min-width: 200px;
  padding: 6px;
`

const MobileMenuLink = styled(Link)<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  min-height: 40px;
  padding: 0 10px;
  border-radius: var(--radius-sm);
  color: ${({ $active }) =>
    $active ? 'var(--color-primary)' : 'var(--color-text)'};
  background: ${({ $active }) =>
    $active ? 'var(--color-primary-soft)' : 'transparent'};
  text-decoration: none;
  font-size: var(--fs-body);
  font-weight: 500;
  white-space: nowrap;
  transition: background var(--motion);

  &:hover {
    color: ${({ $active }) =>
      $active ? 'var(--color-primary)' : 'var(--color-text)'};
    background: ${({ $active }) =>
      $active ? 'var(--color-primary-soft)' : 'var(--color-raised)'};
  }
`

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  color: var(--color-text);
  transition: opacity var(--motion);

  &:hover {
    opacity: 0.8;
  }

  svg {
    display: block;
    height: 26px;
    width: auto;
  }

  /* Phones: keep only the hexagon mark (the first ~37 of 130 units). */
  @media (max-width: 600px) {
    width: 24px;
    overflow: hidden;

    svg {
      flex: 0 0 auto;
      width: 84px;
      max-width: none;
    }
  }
`

const StakeTag = styled.span`
  margin-left: 8px;
  padding: 2px 8px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
`

const ConnectLabel = styled.span`
  @media (max-width: 600px) {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
`

const ChainLabel = styled.span`
  @media (max-width: 600px) {
    display: none;
  }
`

const ChainDropdownWrapper = styled.div`
  ${smallScreenStyle(
    () => css`
      .ui-dropdown > div:last-child {
        right: 0;
        left: auto;
      }
    `,
  )}
`

const ChainMenu = styled.div`
  min-width: 180px;
  padding: 6px;
`

const ChainMenuItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 38px;
  padding: 0 12px;
  border: 0;
  border-radius: var(--radius);
  background: ${({ $active }) =>
    $active ? 'var(--color-primary-soft)' : 'transparent'};
  color: ${({ $active }) =>
    $active ? 'var(--color-primary)' : 'var(--color-text)'};
  font-size: var(--fs-body);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--motion);

  &:hover {
    background: ${({ $active }) =>
      $active ? 'var(--color-primary-soft)' : 'var(--color-raised)'};
  }
`

const AccountLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  overflow: hidden;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--glass);
  transition:
    border-color var(--motion),
    background var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
    background: var(--color-raised);
  }
`

const AppBar = () => {
  const web3Context = useWeb3Context()
  const { open } = useAppKit()
  const isPermanent = useContext(StakeContext)?.isPermanent
  const navigate = useNavigate()
  const location = useLocation()
  const { networkId } = web3Context

  const urlChainId = useUrlChainId()

  // Persist URL chain so non-chain-aware pages can restore it
  useEffect(() => {
    if (urlChainId)
      localStorage.setItem(SAVED_NETWORK_KEY, urlChainId.toString())
  }, [urlChainId])

  const savedChainId = useMemo(() => {
    const saved = localStorage.getItem(SAVED_NETWORK_KEY)
    return saved ? Number(saved) : null
    // Re-read on every navigation so it stays current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const displayedChainId = urlChainId ?? savedChainId ?? networkId
  const [floating, setFloating] = useState(false)
  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const [chainDropdownOpen, setChainDropdownOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [helpDropdownOpen, setHelpDropdownOpen] = useState(false)

  const isBrowse = location.pathname === '/browse'
  const browseChainIds = useMemo(
    () =>
      new URLSearchParams(location.search)
        .get('chain')
        ?.split(',')
        .map(Number)
        .filter((chainId) =>
          SUPPORTED_CHAINS.some((chain) => Number(chain.id) === chainId),
        ) ?? [],
    [location.search],
  )
  const browseChainId = browseChainIds.length === 1 ? browseChainIds[0] : null
  const currentChainInfo =
    NETWORKS_INFO[
      (isBrowse
        ? browseChainId
        : displayedChainId) as keyof typeof NETWORKS_INFO
    ]
  const browseChainLabel =
    browseChainIds.length === 0
      ? 'All chains'
      : browseChainIds.length === 1
        ? currentChainInfo?.name || 'Select chain'
        : `${browseChainIds.length} chains`

  const handleBrowseChainSelect = useCallback(
    (chainId: number | null) => {
      const next = new URLSearchParams(location.search)
      if (chainId) next.set('chain', String(chainId))
      else next.delete('chain')
      next.delete('page')
      const search = next.toString()
      navigate(`/browse${search ? `?${search}` : ''}`)
      setChainDropdownOpen(false)
    },
    [location.search, navigate],
  )

  const handleChainSelect = useCallback(
    (chainId: number) => {
      if (isBrowse) {
        handleBrowseChainSelect(chainId)
        return
      }
      if (chainId === displayedChainId) {
        setChainDropdownOpen(false)
        return
      }
      const nextTcr = defaultTcrAddresses[chainId as validChains]
      if (!nextTcr) return
      localStorage.setItem(SAVED_NETWORK_KEY, chainId.toString())

      // Only navigate — useTcrNetwork handles the wallet switch when the
      // new page mounts, avoiding a double switchChain prompt.
      const factoryMatch = location.pathname.match(
        /^\/(factory(?:-permanent)?|launch)\//,
      )
      if (factoryMatch) navigate(`/${factoryMatch[1]}/${chainId}`)
      else if (location.pathname === '/') navigate(`/?chain=${chainId}`)
      else navigate(`/tcr/${chainId}/${nextTcr}`)

      setChainDropdownOpen(false)
    },
    [
      navigate,
      displayedChainId,
      handleBrowseChainSelect,
      isBrowse,
      location.pathname,
    ],
  )

  const mobileMenuOverlay = (
    <MobileNavMenu aria-label="Main">
      <MobileMenuLink
        to="/"
        $active={location.pathname === '/'}
        onClick={() => setMobileMenuOpen(false)}
      >
        Dashboard
      </MobileMenuLink>
      <MobileMenuLink
        to="/browse"
        $active={
          location.pathname === '/browse' ||
          location.pathname.startsWith('/tcr/')
        }
        onClick={() => setMobileMenuOpen(false)}
      >
        Browse
      </MobileMenuLink>
      <MobileMenuLink
        to={`/launch/${displayedChainId}`}
        $active={
          location.pathname.startsWith('/launch') ||
          location.pathname.startsWith('/factory')
        }
        onClick={() => setMobileMenuOpen(false)}
        onMouseEnter={() => preloadFactory()}
      >
        Launch a list
      </MobileMenuLink>
      <MobileMenuLink
        to="/guide"
        $active={location.pathname === '/guide'}
        onClick={() => setMobileMenuOpen(false)}
      >
        Guide
      </MobileMenuLink>
      <MobileMenuLink
        to="/pro"
        $active={location.pathname === '/pro'}
        onClick={() => setMobileMenuOpen(false)}
      >
        Curate Pro
      </MobileMenuLink>
    </MobileNavMenu>
  )

  return (
    <Container $floating={floating}>
      <Row>
        <LeftGroup>
          <MobileMenuWrapper>
            <Dropdown
              overlay={mobileMenuOverlay}
              trigger={['click']}
              placement="bottomLeft"
              visible={mobileMenuOpen}
              onVisibleChange={setMobileMenuOpen}
            >
              <BarIconButton
                type="button"
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                <CurateIcon name="menu" size={20} />
              </BarIconButton>
            </Dropdown>
          </MobileMenuWrapper>
          <LogoLink to="/" aria-label="Kleros Curate, dashboard">
            <CurateWordmark aria-hidden />
            {isPermanent && <StakeTag>Stake</StakeTag>}
          </LogoLink>
        </LeftGroup>
        <AppMenu />
        <RightGroup>
          <ChainDropdownWrapper>
            <Dropdown
              trigger={['click']}
              visible={chainDropdownOpen}
              onVisibleChange={setChainDropdownOpen}
              placement="bottomRight"
              overlay={
                <ChainMenu role="menu" aria-label="Chain">
                  {isBrowse && (
                    <ChainMenuItem
                      type="button"
                      role="menuitemradio"
                      aria-checked={browseChainIds.length === 0}
                      $active={browseChainIds.length === 0}
                      onClick={() => handleBrowseChainSelect(null)}
                    >
                      <CurateIcon name="chain" size={16} />
                      All chains
                    </ChainMenuItem>
                  )}
                  {SUPPORTED_CHAINS.map((chain) => {
                    const info =
                      NETWORKS_INFO[chain.id as keyof typeof NETWORKS_INFO]
                    if (!info) return null
                    const active = isBrowse
                      ? Number(chain.id) === browseChainId
                      : chain.id === displayedChainId
                    return (
                      <ChainMenuItem
                        key={chain.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        $active={active}
                        onClick={() => handleChainSelect(Number(chain.id))}
                      >
                        <ChainLogo chainId={Number(chain.id)} size={18} />
                        {info.name}
                      </ChainMenuItem>
                    )
                  })}
                </ChainMenu>
              }
            >
              <BarChipButton
                type="button"
                aria-haspopup="menu"
                aria-expanded={chainDropdownOpen}
                title={isBrowse ? 'Filter registries by chain' : 'Chain'}
              >
                {currentChainInfo ? (
                  <ChainLogo
                    chainId={Number(currentChainInfo.chainId)}
                    size={18}
                  />
                ) : (
                  <CurateIcon name="chain" size={16} />
                )}
                <ChainLabel>
                  {isBrowse
                    ? browseChainLabel
                    : currentChainInfo?.name || 'Select chain'}
                </ChainLabel>
                <CurateIcon name="chevron-down" size={13} />
              </BarChipButton>
            </Dropdown>
          </ChainDropdownWrapper>
          {web3Context.active && web3Context.account ? (
            <AccountLink
              to={`/address/${web3Context.account}`}
              title="Open profile"
            >
              <Identicon />
            </AccountLink>
          ) : (
            <BarPrimaryButton
              type="button"
              onClick={() => open({ view: 'Connect' })}
            >
              <CurateIcon name="wallet" size={16} />
              <ConnectLabel>Connect</ConnectLabel>
            </BarPrimaryButton>
          )}
          <ThemeMenu />
          <Dropdown
            trigger={['click']}
            visible={helpDropdownOpen}
            onVisibleChange={setHelpDropdownOpen}
            placement="bottomRight"
            overlay={<Help />}
          >
            <BarIconButton
              type="button"
              aria-label="Help"
              aria-haspopup="menu"
              aria-expanded={helpDropdownOpen}
              title="Help"
            >
              <CurateIcon name="help" size={19} />
            </BarIconButton>
          </Dropdown>
        </RightGroup>
      </Row>
    </Container>
  )
}

export default AppBar
