import React, { useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { useLocation } from 'react-router-dom'

/*
 * The stage behind the app frame (YMax / Fira / ARCrypto): two slow pools,
 * one diagonal band and a floor light, all gradients, drifting over a
 * minute; a grain layer on top kills banding. Inner routes use the quieter
 * "underglow" lighting; the home page gets the full aurora. Drift pauses
 * when the tab is hidden and under reduced motion.
 */

const driftA = keyframes`
  to { transform: translate3d(6vmax, 4vmax, 0) scale(1.08); }
`
const driftB = keyframes`
  to { transform: translate3d(-5vmax, -3vmax, 0) scale(1.05); }
`
const driftBand = keyframes`
  from { transform: translate3d(0, 0, 0) rotate(-22deg) scale(1); }
  to { transform: translate3d(4vw, -3vh, 0) rotate(-18deg) scale(1.06); }
`

const Root = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: var(--stage);

  > * {
    position: absolute;
    will-change: transform;
    transition: opacity 900ms var(--ease-in-out);
  }

  @media (prefers-reduced-motion: reduce) {
    > * {
      animation: none !important;
    }
  }
`

const PoolA = styled.div`
  width: 95vmax;
  height: 95vmax;
  left: -38vmax;
  top: -48vmax;
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--aurora-b) 52%, transparent),
    color-mix(in srgb, var(--aurora-a) 24%, transparent) 45%,
    transparent 72%
  );
  animation: ${driftA} 48s var(--ease-in-out) infinite alternate;
`

const Band = styled.div`
  width: 150vw;
  height: 70vh;
  left: -25vw;
  top: 14vh;
  transform: rotate(-22deg);
  background: linear-gradient(
    90deg,
    transparent 4%,
    color-mix(in srgb, var(--aurora-a) 55%, transparent) 26%,
    color-mix(in srgb, var(--aurora-b) 90%, transparent) 46%,
    color-mix(in srgb, var(--aurora-b) 70%, transparent) 60%,
    color-mix(in srgb, var(--aurora-c) 35%, transparent) 78%,
    transparent 96%
  );
  -webkit-mask-image: radial-gradient(
    closest-side,
    #000,
    rgba(0, 0, 0, 0.55) 55%,
    transparent
  );
  mask-image: radial-gradient(
    closest-side,
    #000,
    rgba(0, 0, 0, 0.55) 55%,
    transparent
  );
  animation: ${driftBand} 40s var(--ease-in-out) infinite alternate;
`

const PoolB = styled.div`
  width: 85vmax;
  height: 85vmax;
  right: -34vmax;
  bottom: -44vmax;
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--aurora-c) 42%, transparent),
    color-mix(in srgb, var(--aurora-a) 18%, transparent) 50%,
    transparent 75%
  );
  animation: ${driftB} 56s var(--ease-in-out) infinite alternate;
`

const Underglow = styled.div`
  width: 120vw;
  height: 56vh;
  left: -10vw;
  bottom: -26vh;
  background: radial-gradient(
    closest-side,
    color-mix(in srgb, var(--aurora-b) 70%, transparent),
    color-mix(in srgb, var(--aurora-a) 42%, transparent) 35%,
    color-mix(in srgb, var(--aurora-a) 20%, transparent) 62%,
    transparent
  );
  opacity: 0;

  [data-light='underglow'] & {
    opacity: 1;
  }
`

const Grain = styled.div`
  inset: 0;
  background-image: var(--noise);
  background-size: 180px;
  opacity: 0.05;
  mix-blend-mode: overlay;
`

const Aurora = styled.div`
  position: absolute;
  inset: 0;

  [data-light='underglow'] & {
    opacity: 0.35;
  }
`

/** Picks the lighting for the route: full aurora on the home page, underglow inside. */
export const useRouteLighting = () => {
  const { pathname } = useLocation()
  const light = pathname === '/' ? 'aurora' : 'underglow'
  useEffect(() => {
    document.body.setAttribute('data-light', light)
  }, [light])
}

const Stage = () => {
  useRouteLighting()
  useEffect(() => {
    const sync = () =>
      document.documentElement.toggleAttribute('data-paused', document.hidden)
    sync()
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])
  return (
    <Root aria-hidden>
      <Aurora>
        <PoolA />
        <Band />
        <PoolB />
      </Aurora>
      <Underglow />
      <Grain />
    </Root>
  )
}

export default Stage
