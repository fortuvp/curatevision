import React from 'react'

/*
 * Curate Pro schematic (DESIGN.md, Components → Explainer): the pieces a
 * production registry is made of, as lines and nodes with mono labels. The
 * policy feeds the contract, the contract sends disputes to the court, the
 * indexer reads the contract and the front end reads the indexer.
 */

const MONO = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.06em',
}

export const ProductionStackSchematic = () => (
  <svg viewBox="0 0 372 200" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>What a production registry is made of</title>
    <defs>
      <marker
        id="curate-pro-arrow"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M0 0 8 4 0 8Z" fill="currentColor" />
      </marker>
    </defs>
    <g
      fill="none"
      stroke="var(--color-border-strong)"
      strokeWidth="1.25"
      markerEnd="url(#curate-pro-arrow)"
    >
      <path d="M96 40 H114" />
      <path d="M266 40 H284" />
      <path d="M190 62 V88" />
      <path d="M190 130 V156" />
    </g>
    <g {...MONO}>
      <rect
        x="8"
        y="22"
        width="88"
        height="40"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="52" y="39" textAnchor="middle" fill="var(--color-text)">
        POLICY
      </text>
      <text x="52" y="54" textAnchor="middle" fill="var(--color-muted)">
        PDF ON IPFS
      </text>

      <rect
        x="116"
        y="18"
        width="148"
        height="44"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="190" y="37" textAnchor="middle" fill="var(--color-text)">
        REGISTRY CONTRACT
      </text>
      <text x="190" y="53" textAnchor="middle" fill="var(--color-muted)">
        DEPOSITS · WINDOW
      </text>

      <rect
        x="286"
        y="22"
        width="66"
        height="40"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-contested)"
      />
      <circle cx="298" cy="42" r="3.5" fill="var(--status-contested)" />
      <text x="326" y="39" textAnchor="middle" fill="var(--color-text)">
        COURT
      </text>
      <text x="326" y="54" textAnchor="middle" fill="var(--color-muted)">
        JURORS
      </text>

      <rect
        x="116"
        y="90"
        width="148"
        height="40"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="190" y="107" textAnchor="middle" fill="var(--color-text)">
        INDEXER
      </text>
      <text x="190" y="122" textAnchor="middle" fill="var(--color-muted)">
        SUBGRAPH OR API
      </text>

      <rect
        x="116"
        y="158"
        width="148"
        height="40"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="190" y="175" textAnchor="middle" fill="var(--color-text)">
        FRONT END
      </text>
      <text x="190" y="190" textAnchor="middle" fill="var(--color-muted)">
        SUBMIT · CHALLENGE
      </text>

      <text x="8" y="110" fill="var(--color-faint)">
        JURORS RULE
      </text>
      <text x="8" y="124" fill="var(--color-faint)">
        BY THE POLICY
      </text>
      <text x="274" y="110" fill="var(--color-faint)">
        DISPUTES ONLY
      </text>
    </g>
  </svg>
)

export default ProductionStackSchematic
