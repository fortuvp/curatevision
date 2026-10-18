import React, { useContext, useEffect, useState } from 'react'
import styled from 'styled-components'
import { BrowserRouter } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ErrorBoundary } from 'react-error-boundary'
import Footer from '../components/footer'
import Layout from 'components/ui/Layout'
import { unregister } from './service-worker'
import { WalletProvider } from 'contexts/wallet-context'
import { StakeProvider } from 'contexts/stake-context'
import { ThemeProvider, ThemeContext } from 'contexts/theme-context'
import SmartContractWalletWarning from 'components/smart-contract-wallet-warning'
import AppBar from 'components/layout/app-bar'
import AppRouter from './app-router'
import ErrorPage from 'pages/error-page'
import { wagmiConfig } from 'config/wagmi'
import { GraphqlBatcherProvider } from 'contexts/graphql-batcher'
import AtlasProvider from 'contexts/atlas-provider'
import { ToastContainer } from 'react-toastify'
import GlobalStyle from 'styles/global-styles'
import 'react-toastify/dist/ReactToastify.css'
import './fontawesome'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

const ThemedToastContainer = () => {
  const themeContext = useContext(ThemeContext)
  return (
    <ToastContainer
      position="top-center"
      theme={themeContext?.isDarkMode ? 'dark' : 'light'}
    />
  )
}

const StyledClickaway = styled.div<{ isMenuClosed: boolean }>`
  background-color: black;
  position: fixed;
  width: 100%;
  height: 100%;
  opacity: ${(properties) => (properties.isMenuClosed ? 0 : 0.4)};
  transition: opacity 0.3s;
  pointer-events: ${(properties) =>
    properties.isMenuClosed ? 'none' : 'auto'};
`

/*
 * The app frame (roobinium's YMax): the whole product sits in one large
 * rounded near-black container floating on the aurora stage. Restraint
 * inside the frame, color outside it. Edge to edge on phones.
 */
const StyledLayout = styled(Layout)`
  position: relative;
  z-index: 1;
  min-height: calc(100vh - 2 * var(--frame-gap)) !important;
  margin: var(--frame-gap);
  border: 1px solid var(--glass-border);
  border-radius: var(--frame-radius);
  background:
    radial-gradient(80% 38% at 50% 0%, var(--glow), transparent 70%),
    var(--color-bg) !important;
  box-shadow:
    inset 0 1px 0 var(--glass-highlight),
    0 40px 120px -40px rgba(0, 0, 0, 0.6);
  overflow: clip;
`

const ContentContainer = styled.div`
  margin: 0 auto;
  width: 100%;
  flex: 1;
`

const App = () => {
  const [isMenuClosed, setIsMenuClosed] = useState(true)

  // this useEffect redirects the URL to a correct one in case Court sent you to an incorrect URL using old ?chainId= syntax
  useEffect(() => {
    const url = window.location.href
    let tcrAddress, itemId, chainId

    if (url.includes('?chainId=')) {
      tcrAddress = url.split('/')[4]
      itemId = url.split('/')[5].split('?')[0]
      chainId = url.split('=')[1]
      const redirectUrl = url.replace(
        `/tcr/${tcrAddress}/${itemId}?chainId=${chainId}`,
        `/tcr/${chainId}/${tcrAddress}/${itemId}`,
      )
      window.location.replace(redirectUrl)
    }
  }, [])

  return (
    <ThemeProvider>
      <GlobalStyle />
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <AtlasProvider>
            <GraphqlBatcherProvider>
              <BrowserRouter future={{ v7_relativeSplatPath: true }}>
                <ErrorBoundary
                  FallbackComponent={({ error }) => (
                    <ErrorPage
                      code="Error"
                      title="Something went wrong"
                      message={
                        (error instanceof Error && error.message) ||
                        'An unexpected error occurred.'
                      }
                      tip="Try refreshing the page."
                    />
                  )}
                >
                  <WalletProvider>
                    <StakeProvider>
                      <StyledLayout>
                        <SmartContractWalletWarning />
                        <AppBar />
                        <ContentContainer>
                          <AppRouter />
                        </ContentContainer>
                        <StyledClickaway
                          isMenuClosed={isMenuClosed}
                          onClick={
                            isMenuClosed
                              ? undefined
                              : () => setIsMenuClosed(true)
                          }
                        />
                        <Footer />
                      </StyledLayout>
                    </StakeProvider>
                    <ThemedToastContainer />
                  </WalletProvider>
                </ErrorBoundary>
              </BrowserRouter>
            </GraphqlBatcherProvider>
          </AtlasProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}

export default App

// Unregister service worker to prevent aggressive caching.
// This ensures users always get the latest version without needing to clear cache.
unregister()
