import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tsconfigPaths from 'vite-tsconfig-paths'

// The standalone landing page lives in public/landing/. Static hosts serve
// /landing/ as its index; the dev server would hand it to the SPA instead.
const landingIndex = (): Plugin => ({
  name: 'landing-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query] = (req.url ?? '').split('?')
      if (path === '/landing' || path === '/landing/')
        req.url = `/landing/index.html${query ? `?${query}` : ''}`
      next()
    })
  },
})

export default defineConfig(({ mode }) => {
  // Load .env files and map REACT_APP_* vars to process.env.* for legacy compat
  const loadedEnv = loadEnv(mode, process.cwd(), ['REACT_APP_', 'VITE_'])
  const define: Record<string, string> = {}
  for (const [key, value] of Object.entries(loadedEnv))
    define[`process.env.${key}`] = JSON.stringify(value)

  return {
    plugins: [
      landingIndex(),
      react(),
      svgr({ include: '**/*.svg' }),
      tsconfigPaths(),
      nodePolyfills({
        include: ['buffer', 'process', 'util', 'stream', 'events', 'crypto'],
        globals: { Buffer: true, global: true, process: true },
      }),
    ],
    envPrefix: ['VITE_', 'REACT_APP_'],
    define: {
      ...define,
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    build: {
      outDir: 'build',
      sourcemap: true,
    },
    server: {
      port: 3000,
    },
  }
})
