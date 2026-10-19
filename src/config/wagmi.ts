import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { SUPPORTED_CHAINS, DEFAULT_CHAIN } from './chains'
import { transports } from './rpc'

const projectId =
  import.meta.env.REACT_APP_REOWN_PROJECT_ID ||
  process.env.REACT_APP_REOWN_PROJECT_ID ||
  ''

export const wagmiAdapter = new WagmiAdapter({
  networks: SUPPORTED_CHAINS,
  projectId,
  transports,
})

export const wagmiConfig = wagmiAdapter.wagmiConfig

export const appKitModal = projectId
  ? createAppKit({
      adapters: [wagmiAdapter],
      networks: SUPPORTED_CHAINS,
      defaultNetwork: DEFAULT_CHAIN,
      projectId,
      allowUnsupportedChain: true,
      metadata: {
        name: 'Kleros Curate',
        description:
          'A UI for the Kleros powered Generalized Token Curated List',
        url: 'https://curate.kleros.builders',
        icons: ['/favicon.ico'],
      },
      features: {
        analytics: false,
      },
      // The wallet modal opens from inside the app's dialogs (z-index up
      // to 1070), so it must stack above all of them.
      themeVariables: {
        '--w3m-z-index': 2000,
      },
    })
  : null
