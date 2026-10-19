import { loadDashboardData } from 'pages/dashboard/data'
import {
  MAINNET_CHAIN_IDS,
  chainInfo,
  scopedFigures,
  scopedSeries,
} from 'pages/dashboard/view'

/*
 * Live figures for the standalone landing page (public/landing/landing.js).
 * The page waits for this promise before drawing its figures; it reads the
 * same indexers with the same query and scope ("Mainnets": Ethereum and
 * Gnosis) as the app's dashboard, so the two never disagree. On any failure,
 * or after a few seconds, it resolves to null and the page falls back to the
 * dated snapshot in public/landing/data.js.
 */

const LIVE_BUDGET_MS = 8000

/** The shape public/landing/data.js holds, plus `live`. */
export interface LandingData {
  live: true
  snapshotAt: string
  scope: string
  figures: {
    registries: number
    verified: number
    entries: number
    requestsOpen: number
    inCourt: number
    curators30d: number
  }
  series30d: { day: number; requests: number; challenges: number }[]
}

const scopeName = (chains: number[]) =>
  chains
    .map((chainId) => chainInfo(chainId)?.name)
    .filter(Boolean)
    .join(' and ')

const readLive = async (): Promise<LandingData | null> => {
  const data = await loadDashboardData({ refreshCreationTimes: false })
  const chains = MAINNET_CHAIN_IDS
  const series = scopedSeries(data, chains)
  // An empty load means the indexers did not answer: use the snapshot.
  if (series.length < 2 || data.registries.length === 0) return null
  const figures = scopedFigures(data, chains)
  return {
    live: true,
    snapshotAt: new Date(data.generatedAt).toISOString(),
    scope: scopeName(chains),
    figures: {
      registries: figures.registries,
      verified: figures.verified,
      entries: figures.entries,
      requestsOpen: figures.requestsOpen,
      inCourt: figures.inCourt,
      curators30d: figures.curators,
    },
    series30d: series.map((day) => ({
      day: day.day,
      requests: day.submissions + day.removals,
      challenges: day.challenges,
    })),
  }
}

declare global {
  interface Window {
    CURATE_LANDING_LIVE?: Promise<LandingData | null>
  }
}

window.CURATE_LANDING_LIVE = Promise.race([
  readLive().catch(() => null),
  new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), LIVE_BUDGET_MS),
  ),
])
