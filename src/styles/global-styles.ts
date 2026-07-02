import { createGlobalStyle } from 'styled-components'
import { BREAKPOINT_LANDSCAPE } from 'styles/small-screen-style'

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  button, input, select, textarea {
    font-family: inherit;
  }

  body {
    margin: 0;
    font-family:
      Inter,
      "Inter Tight",
      "SF Pro Display",
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    font-size: 14px;
    transition: background-color 0.3s ease, color 0.3s ease;
    --horizontal-padding: min(4.6875vw, 66px);
    --curate-bg: ${({ theme }) => theme.curateBg};
    --curate-bg-soft: ${({ theme }) => theme.curateBgSoft};
    --curate-surface: ${({ theme }) => theme.curateSurface};
    --curate-surface-strong: ${({ theme }) => theme.curateSurfaceStrong};
    --curate-border: ${({ theme }) => theme.curateBorder};
    --curate-border-strong: ${({ theme }) => theme.curateBorderStrong};
    --curate-text: ${({ theme }) => theme.curateText};
    --curate-muted: ${({ theme }) => theme.curateMuted};
    --curate-faint: ${({ theme }) => theme.curateFaint};
    --curate-live: ${({ theme }) => theme.curateLive};
    --curate-violet: ${({ theme }) => theme.curateViolet};
    --curate-success: ${({ theme }) => theme.curateSuccess};
    --curate-warning: ${({ theme }) => theme.curateWarning};
    --curate-danger: ${({ theme }) => theme.curateDanger};
    --curate-shadow: ${({ theme }) => theme.curateShadow};
    --curate-shadow-hover: ${({ theme }) => theme.curateShadowHover};
    --curate-radius: 14px;
    --curate-radius-sm: 10px;
    color: var(--curate-text);
    background: linear-gradient(180deg, var(--curate-bg) 0%, var(--curate-bg-soft) 100%);
    background-attachment: fixed;
    font-variant-ligatures: contextual;
    text-rendering: geometricPrecision;

    /* Font size scale */
    --font-size-page-title: 40px;
    --font-size-section-title: 26px;
    --font-size-title: 18px;
    --font-size-large: 16px;
    --font-size-base: 14px;
    --font-size-small: 13px;
    --font-size-xs: 12px;

    @media (max-width: ${BREAKPOINT_LANDSCAPE}px) {
      --horizontal-padding: 16px;
    }

    /* React-Toastify theme overrides */
    --toastify-color-light: ${({ theme }) => theme.componentBackground};
    --toastify-text-color-light: ${({ theme }) => theme.textPrimary};
    --toastify-color-dark: ${({ theme }) => theme.elevatedBackground};
    --toastify-text-color-dark: ${({ theme }) => theme.textPrimary};
    --toastify-color-info: ${({ theme }) => theme.primaryColor};
    --toastify-color-success: ${({ theme }) => theme.successColor};
    --toastify-color-warning: ${({ theme }) => theme.warningColor};
    --toastify-color-error: ${({ theme }) => theme.errorColor};
    --toastify-color-progress-light: ${({ theme }) => theme.primaryColor};
    --toastify-color-progress-dark: ${({ theme }) => theme.primaryColor};
    --toastify-font-family: Inter, "Inter Tight", ui-sans-serif, system-ui, sans-serif;
  }

  .Toastify__toast-container--top-center {
    top: 48px;
  }

  body[data-theme="dark"] {
    background-color: ${({ theme }) => theme.curateBg} !important;
    color: ${({ theme }) => theme.textPrimary} !important;
  }

  body,
  #root {
    min-height: 100vh;
  }

  ::selection {
    color: #031016;
    background: var(--curate-live);
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
  }

  h1,
  h2,
  h3,
  h4 {
    letter-spacing: 0;
  }

  /* Global link styles */
  a {
    color: ${({ theme }) => theme.linkColor};
    transition: color 0.2s ease;
  }
  a:hover {
    color: ${({ theme }) => theme.primaryColorHover};
  }

  /* Theme color class overrides for dark mode */
  body[data-theme="dark"] {
    .quaternary-background.theme-background,
    .quaternary-background .theme-background {
      background: ${({ theme }) => theme.elevatedBackground} !important;
    }
    .quaternary-color.theme-color,
    .quaternary-color .theme-color {
      color: ${({ theme }) => theme.textSecondary} !important;
    }
    .ternary-color.theme-color,
    .ternary-color .theme-color {
      color: ${({ theme }) => theme.textSecondary} !important;
    }
    .secondary-color.theme-color,
    .secondary-color .theme-color {
      color: ${({ theme }) => theme.textTertiary} !important;
    }
    .primary-color.theme-color,
    .primary-color .theme-color {
      color: ${({ theme }) => theme.primaryColor} !important;
    }

  }
`

export default GlobalStyle
