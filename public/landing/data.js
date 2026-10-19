// A frozen snapshot of public Curate data (on-chain, Ethereum and Gnosis
// mainnets), the same one as docs/design/dashboard-variants/snapshot.json.
// The landing page shows live figures (src/landing/boot.ts) and falls back to
// this object when the indexers do not answer in time; it then labels each
// figure with `snapshotAt` or the series' window, never "now".
// series30d: one row per UTC day; requests = submissions + removal requests
// made that day; challenges = challenges made that day against requests from
// this 30-day window (each one opened a dispute in Kleros Court).
// Refresh by replacing the whole object with a new query result; never edit
// single figures by hand.
window.CURATE_LANDING_DATA = {
  snapshotAt: '2026-10-18T19:58:56.470Z',
  scope: 'Ethereum and Gnosis',
  figures: {
    registries: 237,
    verified: 36,
    entries: 31228,
    requestsOpen: 206,
    inCourt: 7,
    curators30d: 12,
  },
  series30d: [
    {
      day: 1789776000,
      requests: 39,
      challenges: 0,
    },
    {
      day: 1789862400,
      requests: 1,
      challenges: 1,
    },
    {
      day: 1789948800,
      requests: 140,
      challenges: 0,
    },
    {
      day: 1790035200,
      requests: 15,
      challenges: 2,
    },
    {
      day: 1790121600,
      requests: 35,
      challenges: 0,
    },
    {
      day: 1790208000,
      requests: 0,
      challenges: 0,
    },
    {
      day: 1790294400,
      requests: 118,
      challenges: 0,
    },
    {
      day: 1790380800,
      requests: 9,
      challenges: 0,
    },
    {
      day: 1790467200,
      requests: 34,
      challenges: 1,
    },
    {
      day: 1790553600,
      requests: 0,
      challenges: 0,
    },
    {
      day: 1790640000,
      requests: 42,
      challenges: 2,
    },
    {
      day: 1790726400,
      requests: 0,
      challenges: 0,
    },
    {
      day: 1790812800,
      requests: 117,
      challenges: 1,
    },
    {
      day: 1790899200,
      requests: 54,
      challenges: 0,
    },
    {
      day: 1790985600,
      requests: 53,
      challenges: 0,
    },
    {
      day: 1791072000,
      requests: 33,
      challenges: 0,
    },
    {
      day: 1791158400,
      requests: 50,
      challenges: 1,
    },
    {
      day: 1791244800,
      requests: 62,
      challenges: 0,
    },
    {
      day: 1791331200,
      requests: 16,
      challenges: 0,
    },
    {
      day: 1791417600,
      requests: 107,
      challenges: 1,
    },
    {
      day: 1791504000,
      requests: 58,
      challenges: 1,
    },
    {
      day: 1791590400,
      requests: 51,
      challenges: 0,
    },
    {
      day: 1791676800,
      requests: 17,
      challenges: 2,
    },
    {
      day: 1791763200,
      requests: 101,
      challenges: 3,
    },
    {
      day: 1791849600,
      requests: 57,
      challenges: 2,
    },
    {
      day: 1791936000,
      requests: 32,
      challenges: 0,
    },
    {
      day: 1792022400,
      requests: 102,
      challenges: 0,
    },
    {
      day: 1792108800,
      requests: 46,
      challenges: 0,
    },
    {
      day: 1792195200,
      requests: 28,
      challenges: 0,
    },
    {
      day: 1792281600,
      requests: 23,
      challenges: 0,
    },
  ],
}
