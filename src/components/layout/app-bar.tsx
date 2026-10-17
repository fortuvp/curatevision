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
import { Button, Dropdown } from 'components/ui'
import { useAppKit } from '@reown/appkit/react'
import { ThemeContext } from 'contexts/theme-context'
import { NETWORKS_INFO } from 'config/networks'
import { SUPPORTED_CHAINS } from 'config/chains'
import Identicon from 'components/identicon'
import Logo from 'assets/images/logo.svg'
import StakeCurateLogoRaw from 'assets/images/logo-stake-curate.svg'
import { SAVED_NETWORK_KEY } from 'utils/string'
import AppMenu from 'components/layout/app-menu'
import Help from 'components/layout/help'
import { defaultTcrAddresses, type validChains } from 'config/tcr-addresses'
import { StakeContext } from 'contexts/stake-context'
import useUrlChainId from 'hooks/use-url-chain-id'
import { preloadFactory } from 'bootstrap/app-router'
import { CurateIcon } from 'components/curate/icons'
import ChainLogo from 'components/chain-logo'

const Container = styled.div`
  padding: 0;
  position: sticky;
  top: 0;
  z-index: 50;
  background: ${({ theme }) => theme.navbarBackground};
  border-bottom: 0;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease;
`

const ThemeToggleButton = styled.button`
  width: 38px;
  height: 38px;
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.75);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.14);
    border-color: transparent;
    color: #ffffff;
  }
`

const LeftGroup = styled.div`
  display: flex;
  align-items: center;
  flex: 1;

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
      margin-right: 12px;
    `,
  )}
`

const HamburgerButton = styled.button`
  width: 38px;
  height: 38px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 3px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  transition:
    border-color 160ms ease,
    background 160ms ease;

  &:hover {
    border-color: transparent;
    background: rgba(255, 255, 255, 0.14);
  }
`

const RightGroup = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;

  ${smallScreenStyle(
    () => css`
      flex: 0 0 auto;
      justify-content: flex-start;
    `,
  )}
`

const MobileNavMenu = styled.div`
  padding: 4px 0;
  min-width: 160px;
`

const MobileMenuLink = styled(Link)<{ $active?: boolean }>`
  display: block;
  padding: 10px 16px;
  color: ${({ $active }) =>
    $active ? 'var(--curate-text)' : 'var(--curate-muted)'};
  text-decoration: none;
  font-size: var(--font-size-base);
  transition: all 0.2s;
  white-space: nowrap;
  font-weight: ${({ $active }) => ($active ? '750' : '600')};

  &:hover {
    color: var(--curate-text);
    background: ${({ theme }) => theme.dropdownHoverBg};
  }
`

const StyledRouterLink = styled(Link)`
  color: var(--curate-text);
  display: flex;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.7;
  }
`

const StyledConnectButton = styled(Button)`
  background: rgba(255, 255, 255, 0.13);
  color: #ffffff;
  border-color: transparent;
  font-weight: 600;

  &:hover:not(:disabled),
  &:focus:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    color: #ffffff;
    border-color: transparent;
  }
  margin-left: 8px;
`

const StyledIdenticonWrapper = styled.div`
  margin-left: 8px;
  border-radius: 50%;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }
`

const StyledAppBarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--horizontal-padding);
  min-height: 72px;
  max-width: 1440px;
  margin: 0 auto;
  width: 100%;

  ${smallScreenStyle(
    () => css`
      padding-top: 8px;
      padding-bottom: 8px;
      flex-wrap: wrap;
      row-gap: 8px;
    `,
  )}
`

const ChainSelectorButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 3px;
  padding: 0 13px;
  height: 38px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.32);
  }
`

const ChainDropdownWrapper = styled.div`
  ${smallScreenStyle(
    () => css`
      .ui-dropdown > div:last-child {
        right: auto;
        left: 0;
      }
    `,
  )}
`

const ChainMenu = styled.div`
  min-width: 172px;
  padding: 6px;
`

const ChainMenuItem = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border: none;
  border-radius: 3px;
  background: ${({ $active, theme }) =>
    $active
      ? theme.dropdownSelectedBg || 'rgba(0, 0, 0, 0.06)'
      : 'transparent'};
  color: ${({ theme }) => theme.textPrimary};
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) =>
      theme.dropdownHoverBg || 'rgba(0, 0, 0, 0.04)'};
  }
`

const HelpButton = styled.button`
  width: 38px;
  height: 38px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -2px;
  border-radius: 3px;
  color: rgba(255, 255, 255, 0.75);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    border-color: transparent;
    color: #ffffff;
  }
`

const StakeCurateLogo = styled(StakeCurateLogoRaw)`
  /* Dark mode: change stake tag background and text colors */
  ${({ theme }) =>
    theme.name === 'dark' &&
    `
    /* Stake tag background (path with fill="#EBD4FF") */
    path[fill="#EBD4FF"] {
      fill: ${theme.stakeTagBg};
    }
    /* Stake tag text (path with fill="#220050") */
    path[fill="#220050"] {
      fill: ${theme.stakeTagText};
    }
  `}
`

const AppBar = () => {
  const web3Context = useWeb3Context()
  const { open } = useAppKit()
  const isPermanent = useContext(StakeContext)?.isPermanent
  const themeContext = useContext(ThemeContext)
  const isDarkMode = themeContext?.isDarkMode
  const toggleTheme = themeContext?.toggleTheme
  const navigate = useNavigate()
  const location = useLocation()
  const { networkId, account: _account } = web3Context

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
    <MobileNavMenu>
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
        Guide & Skills
      </MobileMenuLink>
    </MobileNavMenu>
  )

  return (
    <Container>
      <StyledAppBarRow>
        <LeftGroup>
          <MobileMenuWrapper>
            <Dropdown
              overlay={mobileMenuOverlay}
              trigger={['click']}
              placement="bottomLeft"
              visible={mobileMenuOpen}
              onVisibleChange={setMobileMenuOpen}
            >
              <HamburgerButton type="button" aria-label="Open menu">
                <CurateIcon name="menu" size={20} />
              </HamburgerButton>
            </Dropdown>
          </MobileMenuWrapper>
          <StyledRouterLink to="/">
            {isPermanent ? (
              <StakeCurateLogo
                style={{ maxHeight: '50px', maxWidth: '120px' }}
              />
            ) : (
              <Logo style={{ maxHeight: '50px', maxWidth: '120px' }} />
            )}
          </StyledRouterLink>
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
                <ChainMenu>
                  {isBrowse && (
                    <ChainMenuItem
                      $active={browseChainIds.length === 0}
                      onClick={() => handleBrowseChainSelect(null)}
                    >
                      <CurateIcon name="chain" size={15} />
                      All chains
                    </ChainMenuItem>
                  )}
                  {SUPPORTED_CHAINS.map((chain) => {
                    const info =
                      NETWORKS_INFO[chain.id as keyof typeof NETWORKS_INFO]
                    if (!info) return null
                    return (
                      <ChainMenuItem
                        key={chain.id}
                        $active={
                          isBrowse
                            ? Number(chain.id) === browseChainId
                            : chain.id === displayedChainId
                        }
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
              <ChainSelectorButton
                title={isBrowse ? 'Filter registries by chain' : undefined}
              >
                {currentChainInfo ? (
                  <ChainLogo
                    chainId={Number(currentChainInfo.chainId)}
                    size={18}
                  />
                ) : (
                  <CurateIcon name="chain" size={15} />
                )}
                {isBrowse
                  ? browseChainLabel
                  : currentChainInfo?.name || 'Select Chain'}
                <CurateIcon name="chevron-down" size={13} />
              </ChainSelectorButton>
            </Dropdown>
          </ChainDropdownWrapper>
          {web3Context.active && web3Context.account ? (
            <StyledIdenticonWrapper
              as={Link as any}
              to={`/address/${web3Context.account}`}
              title="Open profile"
            >
              <Identicon />
            </StyledIdenticonWrapper>
          ) : (
            <StyledConnectButton
              ghost
              shape="round"
              onClick={() => open({ view: 'Connect' })}
            >
              Connect
            </StyledConnectButton>
          )}
          <ThemeToggleButton
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            <CurateIcon name={isDarkMode ? 'sun' : 'moon'} size={19} />
          </ThemeToggleButton>
          <Dropdown
            trigger={['click']}
            visible={helpDropdownOpen}
            onVisibleChange={setHelpDropdownOpen}
            placement="bottomRight"
            overlay={<Help />}
          >
            <HelpButton type="button" title="Help">
              <CurateIcon name="help" size={19} />
            </HelpButton>
          </Dropdown>
        </RightGroup>
      </StyledAppBarRow>
    </Container>
  )
}

export default AppBar
