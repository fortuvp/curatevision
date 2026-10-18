import React from 'react'

/*
 * Launch-list schematics (DESIGN.md, Components → Explainer): lines and nodes
 * only, mono labels, colors from the token roles. One per list type and one
 * for the decisions a list owner makes in the wizard.
 */

const MONO = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  letterSpacing: '0.06em',
}

const Arrow = ({ id }: { id: string }) => (
  <defs>
    <marker
      id={id}
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
)

/** Standard (Light Curate): submit → challenge period → registered, or jurors. */
export const StandardSchematic = () => (
  <svg viewBox="0 0 360 168" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>How a Standard list entry is listed</title>
    <Arrow id="launch-arrow-standard" />
    <g
      fill="none"
      stroke="var(--color-border-strong)"
      strokeWidth="1.25"
      markerEnd="url(#launch-arrow-standard)"
    >
      <path d="M84 48 H104" />
      <path d="M226 48 H246" />
      <path d="M165 72 V104" />
    </g>
    <g {...MONO}>
      <rect
        x="8"
        y="30"
        width="76"
        height="36"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="46" y="52" textAnchor="middle" fill="var(--color-text)">
        SUBMIT
      </text>
      <rect
        x="106"
        y="24"
        width="118"
        height="48"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-window)"
      />
      <circle cx="118" cy="48" r="3.5" fill="var(--status-window)" />
      <text x="170" y="45" textAnchor="middle" fill="var(--color-text)">
        CHALLENGE PERIOD
      </text>
      <text x="170" y="61" textAnchor="middle" fill="var(--color-muted)">
        DEPOSIT HELD
      </text>
      <rect
        x="248"
        y="30"
        width="104"
        height="36"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-registered)"
      />
      <circle cx="260" cy="48" r="3.5" fill="var(--status-registered)" />
      <text x="308" y="52" textAnchor="middle" fill="var(--color-text)">
        REGISTERED
      </text>
      <text x="300" y="16" textAnchor="middle" fill="var(--color-faint)">
        NOBODY CHALLENGES
      </text>
      <text x="290" y="82" textAnchor="middle" fill="var(--color-faint)">
        DEPOSIT BACK IN FULL
      </text>
      <text x="172" y="97" fill="var(--color-faint)">
        SOMEONE CHALLENGES
      </text>
      <rect
        x="98"
        y="106"
        width="136"
        height="44"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-contested)"
      />
      <circle cx="110" cy="128" r="3.5" fill="var(--status-contested)" />
      <text x="170" y="125" textAnchor="middle" fill="var(--color-text)">
        KLEROS JURORS
      </text>
      <text x="170" y="140" textAnchor="middle" fill="var(--color-muted)">
        RULE ON THE POLICY
      </text>
      <text x="244" y="124" fill="var(--color-faint)">
        LOSER PAYS
      </text>
      <text x="244" y="138" fill="var(--color-faint)">
        THE WINNER
      </text>
    </g>
  </svg>
)

/** Stake (Stake Curate): stake → listed with the stake locked → withdraw; jurors at any time. */
export const StakeSchematic = () => (
  <svg viewBox="0 0 360 168" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>How a Stake list entry is listed</title>
    <Arrow id="launch-arrow-stake" />
    <g
      fill="none"
      stroke="var(--color-border-strong)"
      strokeWidth="1.25"
      markerEnd="url(#launch-arrow-stake)"
    >
      <path d="M92 48 H112" />
      <path d="M232 48 H252" />
      <path d="M160 72 V104" />
      <path d="M184 104 V72" />
    </g>
    <g {...MONO}>
      <rect
        x="8"
        y="30"
        width="84"
        height="36"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="50" y="45" textAnchor="middle" fill="var(--color-text)">
        APPROVE
      </text>
      <text x="50" y="59" textAnchor="middle" fill="var(--color-muted)">
        AND STAKE
      </text>
      <rect
        x="114"
        y="24"
        width="116"
        height="48"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-registered)"
      />
      <circle cx="126" cy="48" r="3.5" fill="var(--status-registered)" />
      <text x="176" y="45" textAnchor="middle" fill="var(--color-text)">
        LISTED
      </text>
      <text x="176" y="61" textAnchor="middle" fill="var(--color-muted)">
        STAKE LOCKED
      </text>
      <rect
        x="254"
        y="30"
        width="98"
        height="36"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="303" y="52" textAnchor="middle" fill="var(--color-text)">
        WITHDRAW
      </text>
      <text x="296" y="16" textAnchor="middle" fill="var(--color-faint)">
        WITHDRAWING PERIOD
      </text>
      <text x="303" y="82" textAnchor="middle" fill="var(--color-faint)">
        STAKE BACK
      </text>
      <text x="192" y="97" fill="var(--color-faint)">
        CHALLENGE AT ANY TIME
      </text>
      <rect
        x="106"
        y="106"
        width="136"
        height="44"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-contested)"
      />
      <circle cx="118" cy="128" r="3.5" fill="var(--status-contested)" />
      <text x="178" y="125" textAnchor="middle" fill="var(--color-text)">
        KLEROS JURORS
      </text>
      <text x="178" y="140" textAnchor="middle" fill="var(--color-muted)">
        RULE ON THE POLICY
      </text>
      <text x="250" y="114" fill="var(--color-faint)">
        KEPT:
      </text>
      <text x="250" y="127" fill="var(--color-faint)">
        STAKE GROWS
      </text>
      <text x="250" y="143" fill="var(--color-faint)">
        LOST: STAKE
      </text>
      <text x="250" y="156" fill="var(--color-faint)">
        TO CHALLENGER
      </text>
    </g>
  </svg>
)

/** The five decisions in the wizard, around the list they shape. */
export const DecisionsSchematic = () => (
  <svg viewBox="0 0 420 220" xmlns="http://www.w3.org/2000/svg" role="img">
    <title>What a list owner decides in the wizard</title>
    <g fill="none" stroke="var(--color-border-strong)" strokeWidth="1.25">
      <path d="M164 92 L96 58" />
      <path d="M256 92 L324 58" />
      <path d="M160 110 H100" />
      <path d="M260 110 H320" />
      <path d="M210 130 V166" />
    </g>
    <g
      fontFamily="var(--font-mono)"
      fontSize="10.5"
      letterSpacing="0.06em"
      textAnchor="middle"
    >
      <rect
        x="160"
        y="90"
        width="100"
        height="40"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-primary)"
      />
      <text x="210" y="106" fill="var(--color-text)">
        YOUR LIST
      </text>
      <text x="210" y="121" fill="var(--color-muted)">
        ON ONE CHAIN
      </text>
      <rect
        x="16"
        y="28"
        width="84"
        height="30"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="58" y="47" fill="var(--color-text)">
        DEPOSITS
      </text>
      <rect
        x="292"
        y="28"
        width="112"
        height="30"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-window)"
      />
      <text x="348" y="47" fill="var(--color-text)">
        CHALLENGE PERIOD
      </text>
      <rect
        x="12"
        y="95"
        width="88"
        height="30"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="56" y="114" fill="var(--color-text)">
        COLUMNS
      </text>
      <rect
        x="320"
        y="95"
        width="92"
        height="30"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--status-contested)"
      />
      <text x="366" y="114" fill="var(--color-text)">
        COURT · JURORS
      </text>
      <rect
        x="158"
        y="168"
        width="104"
        height="30"
        rx="4"
        fill="var(--color-surface)"
        stroke="var(--color-border-strong)"
      />
      <text x="210" y="187" fill="var(--color-text)">
        POLICY (PDF)
      </text>
    </g>
  </svg>
)
