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
      "Open Sans",
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
    font-size: 14px;
    transition: background-color 0.3s ease, color 0.3s ease;
    --horizontal-padding: min(4.6875vw, 66px);
    --v2-bg: ${({ theme }) => theme.curateBg};
    --v2-bg-soft: ${({ theme }) => theme.curateBgSoft};
    --v2-card: ${({ theme }) => theme.componentBackground};
    --v2-soft: ${({ theme }) => theme.elevatedBackground};
    --v2-text: ${({ theme }) => theme.textPrimary};
    --v2-muted: ${({ theme }) => theme.textSecondary};
    --v2-faint: ${({ theme }) => theme.textTertiary};
    --v2-stroke: ${({ theme }) => theme.borderColor};
    --v2-stroke-strong: ${({ theme }) => theme.curateBorderStrong};
    --v2-purple: ${({ theme }) => theme.secondaryColor};
    --v2-purple-soft: ${({ theme }) => theme.curateVioletSoft};
    --v2-blue: ${({ theme }) => theme.primaryColor};
    --v2-blue-hover: ${({ theme }) => theme.primaryColorHover};
    --v2-blue-soft: ${({ theme }) => theme.curateLiveSoft};
    --v2-success: ${({ theme }) => theme.successColor};
    --v2-success-soft: ${({ theme }) => theme.curateSuccessSoft};
    --v2-warning: ${({ theme }) => theme.warningColor};
    --v2-warning-soft: ${({ theme }) => theme.curateWarningSoft};
    --v2-error: ${({ theme }) => theme.errorColor};
    --v2-error-soft: ${({ theme }) => theme.curateDangerSoft};
    --v2-shadow: ${({ theme }) => theme.cardShadow};
    --v2-shadow-hover: ${({ theme }) => theme.curateShadowHover};
    --klerosUIComponentsWhiteBackground: ${({ theme }) =>
      theme.componentBackground};
    --klerosUIComponentsLightBackground: ${({ theme }) => theme.curateBg};
    --klerosUIComponentsLightBlue: ${({ theme }) => theme.curateBg};
    --klerosUIComponentsMediumBlue: ${({ theme }) => theme.curateLiveSoft};
    --klerosUIComponentsPrimaryBlue: ${({ theme }) => theme.primaryColor};
    --klerosUIComponentsSecondaryBlue: ${({ theme }) =>
      theme.primaryColorHover};
    --klerosUIComponentsPrimaryPurple: ${({ theme }) => theme.gradientStart};
    --klerosUIComponentsSecondaryPurple: ${({ theme }) => theme.secondaryColor};
    --klerosUIComponentsMediumPurple: ${({ theme }) => theme.curateVioletSoft};
    --klerosUIComponentsPrimaryText: ${({ theme }) => theme.textPrimary};
    --klerosUIComponentsSecondaryText: ${({ theme }) => theme.textSecondary};
    --klerosUIComponentsStroke: ${({ theme }) => theme.borderColor};
    --klerosUIComponentsLightGrey: ${({ theme }) => theme.elevatedBackground};
    --klerosUIComponentsSuccess: ${({ theme }) => theme.successColor};
    --klerosUIComponentsSuccessLight: ${({ theme }) => theme.curateSuccessSoft};
    --klerosUIComponentsError: ${({ theme }) => theme.errorColor};
    --klerosUIComponentsErrorLight: ${({ theme }) => theme.curateDangerSoft};
    --klerosUIComponentsWarning: ${({ theme }) => theme.warningColor};
    --klerosUIComponentsWarningLight: ${({ theme }) => theme.curateWarningSoft};
    --klerosUIComponentsTransitionSpeed: 150ms;
    --curate-bg: var(--v2-bg);
    --curate-bg-soft: var(--v2-bg-soft);
    --curate-surface: var(--v2-card);
    --curate-surface-strong: var(--v2-card);
    --curate-border: var(--v2-stroke);
    --curate-border-strong: var(--v2-stroke-strong);
    --curate-text: var(--v2-text);
    --curate-muted: var(--v2-muted);
    --curate-faint: var(--v2-faint);
    --curate-live: var(--v2-blue);
    --curate-violet: var(--v2-purple);
    --curate-success: var(--v2-success);
    --curate-warning: var(--v2-warning);
    --curate-danger: var(--v2-error);
    --curate-shadow: var(--v2-shadow);
    --curate-shadow-hover: var(--v2-shadow-hover);
    --curate-panel: var(--v2-card);
    --curate-card: var(--v2-card);
    --curate-stat: var(--v2-card);
    --curate-button: var(--v2-blue);
    --curate-button-soft: var(--v2-soft);
    --curate-chip-bg: var(--v2-soft);
    --curate-field: var(--v2-card);
    --curate-icon-bg: var(--v2-soft);
    --curate-icon-shadow: none;
    --curate-under-glow: transparent;
    --curate-radius: 3px;
    --curate-radius-sm: 3px;
    color: var(--v2-text);
    background:
      radial-gradient(circle at 70% 12%, rgba(72, 185, 255, 0.16), transparent 30vw),
      radial-gradient(circle at 36% 30%, rgba(255, 79, 216, 0.14), transparent 32vw),
      radial-gradient(circle at 95% 80%, rgba(143, 92, 255, 0.16), transparent 34vw),
      var(--v2-bg);
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
    --toastify-font-family: "Open Sans", ui-sans-serif, system-ui, sans-serif;
  }

  body::before {
    content: none;
  }

  body::after {
    content: none;
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
    color: #ffffff;
    background: var(--v2-purple);
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: var(--v2-purple) transparent;
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
    background: var(--v2-purple);
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
    color: var(--v2-text);
  }

  input::placeholder,
  textarea::placeholder {
    color: var(--v2-faint);
  }

  .ant-modal-content,
  .ant-dropdown,
  .ant-dropdown-menu,
  .ant-select-dropdown,
  .Toastify__toast {
    border: 1px solid var(--v2-stroke) !important;
    border-radius: 3px !important;
    background: var(--v2-card) !important;
    box-shadow: var(--v2-shadow) !important;
  }

  .ant-modal-header,
  .ant-modal-footer {
    border-color: var(--v2-stroke) !important;
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
    border-color: var(--v2-stroke) !important;
    border-radius: 3px !important;
    background: var(--v2-card) !important;
    color: var(--v2-text) !important;
    box-shadow: none !important;
  }

  .ant-input:hover,
  .ant-input-affix-wrapper:hover,
  .ant-select-selector:hover,
  .ant-picker:hover,
  input[type="text"]:hover,
  input[type="number"]:hover,
  input[type="search"]:hover,
  textarea:hover {
    border-color: var(--v2-blue) !important;
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
