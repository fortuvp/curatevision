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
      "SF Pro Text",
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
    --curate-panel: linear-gradient(180deg, rgba(7, 18, 32, 0.9), rgba(3, 8, 16, 0.88));
    --curate-card: linear-gradient(180deg, rgba(9, 23, 41, 0.88), rgba(4, 10, 20, 0.93));
    --curate-stat: linear-gradient(180deg, rgba(8, 21, 38, 0.84), rgba(3, 8, 16, 0.92));
    --curate-button: rgba(8, 19, 34, 0.86);
    --curate-button-soft: rgba(5, 11, 21, 0.86);
    --curate-chip-bg: rgba(7, 16, 30, 0.8);
    --curate-field: rgba(2, 6, 12, 0.82);
    --curate-icon-bg: linear-gradient(145deg, rgba(0, 163, 255, 0.18), rgba(108, 161, 255, 0.08));
    --curate-icon-shadow: inset 0 1px rgba(255, 255, 255, 0.07), 0 18px 44px rgba(0, 163, 255, 0.12);
    --curate-under-glow: rgba(0, 163, 255, 0.14);
    --curate-radius: 24px;
    --curate-radius-sm: 14px;
    color: var(--curate-text);
    background:
      radial-gradient(circle at 10% -7%, ${({ theme }) => theme.curateGlowA}, transparent 34%),
      radial-gradient(circle at 88% 8%, ${({ theme }) => theme.curateGlowB}, transparent 28%),
      radial-gradient(circle at 55% 110%, rgba(49, 78, 140, 0.18), transparent 35%),
      linear-gradient(180deg, var(--curate-bg) 0%, var(--curate-bg-soft) 45%, #02050c 100%);
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

  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      linear-gradient(rgba(255, 255, 255, 0.024) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: linear-gradient(180deg, black 0%, transparent 74%);
    opacity: 0.32;
  }

  body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background: linear-gradient(120deg, transparent 0 42%, rgba(255, 255, 255, 0.028) 49%, transparent 56%);
    transform: translateX(-120%);
    animation: curate-sheen 9s ease-in-out infinite;
  }

  @keyframes curate-sheen {
    0%, 74% { transform: translateX(-120%); }
    100% { transform: translateX(120%); }
  }

  #root {
    position: relative;
    z-index: 1;
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

  svg {
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  button {
    color: inherit;
  }

  button,
  [role="button"],
  a,
  input,
  textarea,
  select {
    -webkit-tap-highlight-color: transparent;
  }

  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 2px solid rgba(0, 163, 255, 0.55);
    outline-offset: 3px;
  }

  input,
  textarea,
  select {
    color: var(--curate-text);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--curate-faint);
  }

  .ant-modal-content,
  .ant-dropdown,
  .ant-dropdown-menu,
  .ant-select-dropdown,
  .Toastify__toast {
    border: 1px solid var(--curate-border) !important;
    border-radius: var(--curate-radius-sm) !important;
    background: var(--curate-card) !important;
    box-shadow: var(--curate-shadow) !important;
  }

  .ant-modal-header,
  .ant-modal-footer {
    border-color: var(--curate-border) !important;
    background: transparent !important;
  }

  .ant-input,
  .ant-input-affix-wrapper,
  .ant-select-selector,
  .ant-picker,
  input[type="text"],
  input[type="number"],
  input[type="search"],
  textarea {
    border-color: var(--curate-border) !important;
    border-radius: var(--curate-radius-sm) !important;
    background: var(--curate-field) !important;
    color: var(--curate-text) !important;
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.045) !important;
  }

  .ant-input:hover,
  .ant-input-affix-wrapper:hover,
  .ant-select-selector:hover,
  .ant-picker:hover,
  input[type="text"]:hover,
  input[type="number"]:hover,
  input[type="search"]:hover,
  textarea:hover {
    border-color: var(--curate-border-strong) !important;
  }

  .ant-tag,
  .ant-badge-status-text {
    font-family: inherit !important;
    font-weight: 800 !important;
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
