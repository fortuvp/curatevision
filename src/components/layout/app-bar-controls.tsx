import styled from 'styled-components'

/** 36px square ghost button for the app bar (theme, help, menu). */
export const BarIconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  transition:
    background var(--motion),
    color var(--motion),
    border-color var(--motion);

  &:hover {
    color: var(--color-text);
    background: var(--color-raised);
  }

  &[aria-expanded='true'] {
    color: var(--color-text);
    background: var(--color-raised);
    border-color: var(--color-border);
  }
`

/** 36px chip-shaped control for the app bar (chain, account). */
export const BarChipButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px 0 10px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-pill);
  background: var(--glass);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 12px;
  line-height: 16px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background var(--motion),
    border-color var(--motion);

  &:hover {
    border-color: var(--color-border-strong);
    background: var(--color-raised);
  }

  &[aria-expanded='true'] {
    border-color: var(--color-border-strong);
  }
`

/** 36px primary button for the app bar (Connect). */
export const BarPrimaryButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  background: var(--color-primary-fill);
  color: var(--color-on-primary);
  box-shadow:
    inset 0 1px 0 color-mix(in srgb, white 28%, transparent),
    0 8px 24px -10px var(--color-primary);
  font-size: var(--fs-body);
  line-height: var(--lh-body);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background var(--motion);

  &:hover {
    background: var(--color-primary-hover);
  }
`
