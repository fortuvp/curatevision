import { createGlobalStyle } from 'styled-components'
import { BREAKPOINT_LANDSCAPE } from 'styles/small-screen-style'

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  button, input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }

  body {
    margin: 0;
    font-family: var(--font-sans);
    font-size: 14px;
    line-height: 20px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background-color 0.2s ease, color 0.2s ease;

    /* Type */
    --font-sans: "IBM Plex Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --font-serif: "IBM Plex Serif", Georgia, "Times New Roman", serif;
    --fs-display: clamp(30px, 2.4vw + 18px, 38px);
    --lh-display: 1.16;
    --fs-heading: 22px;
    --lh-heading: 28px;
    --fs-subheading: 17px;
    --lh-subheading: 24px;
    --fs-body-lg: 15px;
    --lh-body-lg: 22px;
    --fs-body: 14px;
    --lh-body: 20px;
    --fs-small: 13px;
    --lh-small: 18px;
    --fs-data: 13px;
    --lh-data: 18px;
    --fs-label: 11px;
    --lh-label: 16px;
    --fs-figure: 28px;
    --lh-figure: 32px;
    --tracking-label: 0.06em;

    /* Legacy scale names still read by older pages, mapped onto the new scale */
    --font-size-page-title: 32px;
    --font-size-section-title: var(--fs-heading);
    --font-size-title: var(--fs-subheading);
    --font-size-large: var(--fs-body-lg);
    --font-size-base: var(--fs-body);
    --font-size-small: var(--fs-small);
    --font-size-xs: 12px;

    /* Shape and space */
    --radius-sm: 4px;
    --radius: 6px;
    --radius-lg: 10px;
    --radius-pill: 999px;
    --horizontal-padding: min(4.6875vw, 66px);
    --page-max-width: 1400px;
    --app-bar-height: 56px;
    --motion: 150ms ease;

    /* Semantic color roles (from the theme) */
    --color-bg: ${({ theme }) => theme.curateBg};
    --color-surface: ${({ theme }) => theme.componentBackground};
    --color-raised: ${({ theme }) => theme.elevatedBackground};
    --color-text: ${({ theme }) => theme.textPrimary};
    --color-muted: ${({ theme }) => theme.textSecondary};
    --color-faint: ${({ theme }) => theme.textTertiary};
    --color-border: ${({ theme }) => theme.borderColor};
    --color-border-strong: ${({ theme }) => theme.curateBorderStrong};
    --color-primary: ${({ theme }) => theme.primaryColor};
    --color-primary-hover: ${({ theme }) => theme.primaryColorHover};
    --color-on-primary: ${({ theme }) => theme.textOnPrimary};
    --color-primary-soft: ${({ theme }) => theme.curateLiveSoft};
    --color-indigo: ${({ theme }) => theme.secondaryColor};
    --color-indigo-soft: ${({ theme }) => theme.curateVioletSoft};
    --color-success: ${({ theme }) => theme.successColor};
    --color-success-soft: ${({ theme }) => theme.curateSuccessSoft};
    --color-warning: ${({ theme }) => theme.warningColor};
    --color-warning-soft: ${({ theme }) => theme.curateWarningSoft};
    --color-danger: ${({ theme }) => theme.errorColor};
    --color-danger-soft: ${({ theme }) => theme.curateDangerSoft};
    --shadow-card: ${({ theme }) => theme.cardShadow};
    --shadow-card-hover: ${({ theme }) => theme.curateShadowHover};
    --shadow-overlay: ${({ theme }) => theme.modalShadow};
    --glow: ${({ theme }) => theme.curateGlowA};

    /* Status roles: one meaning each (DESIGN.md, Colors) */
    --status-registered: var(--color-success);
    --status-registered-soft: var(--color-success-soft);
    --status-window: var(--color-primary);
    --status-window-soft: var(--color-primary-soft);
    --status-contested: var(--color-warning);
    --status-contested-soft: var(--color-warning-soft);
    --status-off: var(--color-danger);
    --status-off-soft: var(--color-danger-soft);
    --status-neutral: var(--color-faint);
    --status-neutral-soft: var(--color-raised);

    /* Names older components read; same values as the roles above */
    --v2-bg: var(--color-bg);
    --v2-bg-soft: var(--color-surface);
    --v2-card: var(--color-surface);
    --v2-soft: var(--color-raised);
    --v2-text: var(--color-text);
    --v2-muted: var(--color-muted);
    --v2-faint: var(--color-faint);
    --v2-stroke: var(--color-border);
    --v2-stroke-strong: var(--color-border-strong);
    --v2-purple: var(--color-indigo);
    --v2-purple-soft: var(--color-indigo-soft);
    --v2-blue: var(--color-primary);
    --v2-blue-hover: var(--color-primary-hover);
    --v2-blue-soft: var(--color-primary-soft);
    --v2-success: var(--color-success);
    --v2-success-soft: var(--color-success-soft);
    --v2-warning: var(--color-warning);
    --v2-warning-soft: var(--color-warning-soft);
    --v2-error: var(--color-danger);
    --v2-error-soft: var(--color-danger-soft);
    --v2-shadow: var(--shadow-card);
    --v2-shadow-hover: var(--shadow-card-hover);
    --curate-bg: var(--color-bg);
    --curate-bg-soft: var(--color-surface);
    --curate-surface: var(--color-surface);
    --curate-surface-strong: var(--color-surface);
    --curate-border: var(--color-border);
    --curate-border-strong: var(--color-border-strong);
    --curate-text: var(--color-text);
    --curate-muted: var(--color-muted);
    --curate-faint: var(--color-faint);
    --curate-live: var(--color-primary);
    --curate-violet: var(--color-indigo);
    --curate-success: var(--color-success);
    --curate-warning: var(--color-warning);
    --curate-danger: var(--color-danger);
    --curate-shadow: var(--shadow-card);
    --curate-shadow-hover: var(--shadow-card-hover);
    --curate-panel: var(--color-surface);
    --curate-card: var(--color-surface);
    --curate-stat: var(--color-surface);
    --curate-button: var(--color-primary);
    --curate-button-soft: var(--color-raised);
    --curate-chip-bg: var(--color-raised);
    --curate-field: var(--color-surface);
    --curate-icon-bg: var(--color-raised);
    --curate-icon-shadow: none;
    --curate-under-glow: transparent;
    --curate-radius: var(--radius);
    --curate-radius-sm: var(--radius-sm);

    /* @kleros/ui-components-library variables, mapped onto the active theme */
    --klerosUIComponentsWhiteBackground: var(--color-surface);
    --klerosUIComponentsLightBackground: var(--color-bg);
    --klerosUIComponentsLightBlue: var(--color-bg);
    --klerosUIComponentsMediumBlue: var(--color-primary-soft);
    --klerosUIComponentsPrimaryBlue: var(--color-primary);
    --klerosUIComponentsSecondaryBlue: var(--color-primary-hover);
    --klerosUIComponentsPrimaryPurple: var(--color-indigo);
    --klerosUIComponentsSecondaryPurple: var(--color-indigo);
    --klerosUIComponentsMediumPurple: var(--color-indigo-soft);
    --klerosUIComponentsPrimaryText: var(--color-text);
    --klerosUIComponentsSecondaryText: var(--color-muted);
    --klerosUIComponentsStroke: var(--color-border);
    --klerosUIComponentsLightGrey: var(--color-raised);
    --klerosUIComponentsSuccess: var(--color-success);
    --klerosUIComponentsSuccessLight: var(--color-success-soft);
    --klerosUIComponentsError: var(--color-danger);
    --klerosUIComponentsErrorLight: var(--color-danger-soft);
    --klerosUIComponentsWarning: var(--color-warning);
    --klerosUIComponentsWarningLight: var(--color-warning-soft);
    --klerosUIComponentsBaseRadius: var(--radius-sm);
    --klerosUIComponentsTransitionSpeed: 150ms;

    color: var(--color-text);
    /* The bloom: one radial glow of the accent behind the page (transparent in light). */
    background:
      radial-gradient(60vw 42vh at 50% -6vh, var(--glow), transparent 70%),
      var(--color-bg);
    background-attachment: fixed;

    @media (max-width: ${BREAKPOINT_LANDSCAPE}px) {
      --horizontal-padding: 16px;
      background-attachment: scroll;
    }

    /* react-toastify */
    --toastify-color-light: var(--color-surface);
    --toastify-text-color-light: var(--color-text);
    --toastify-color-dark: var(--color-raised);
    --toastify-text-color-dark: var(--color-text);
    --toastify-color-info: var(--color-primary);
    --toastify-color-success: var(--color-success);
    --toastify-color-warning: var(--color-warning);
    --toastify-color-error: var(--color-danger);
    --toastify-color-progress-light: var(--color-primary);
    --toastify-color-progress-dark: var(--color-primary);
    --toastify-font-family: var(--font-sans);
    --toastify-toast-bd-radius: var(--radius);
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
    top: calc(var(--app-bar-height) + 8px);
  }

  body:not([data-theme="light"]) {
    background-color: ${({ theme }) => theme.curateBg} !important;
    color: ${({ theme }) => theme.textPrimary} !important;
  }

  body,
  #root {
    min-height: 100vh;
  }

  ::selection {
    color: var(--color-on-primary);
    background: var(--color-primary);
  }

  * {
    scrollbar-width: thin;
    scrollbar-color: var(--color-border-strong) transparent;
  }

  ::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border-radius: var(--radius-pill);
    background: var(--color-border-strong);
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
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
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
    border: 1px solid var(--color-border-strong) !important;
    border-radius: var(--radius) !important;
    background: var(--color-surface) !important;
    box-shadow: var(--shadow-overlay) !important;
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
    border-color: var(--color-border) !important;
    border-radius: var(--radius) !important;
    background: var(--color-surface) !important;
    color: var(--color-text) !important;
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
    font-family: var(--font-mono) !important;
    font-weight: 500 !important;
  }

  /* Global link styles */
  a {
    color: ${({ theme }) => theme.linkColor};
    transition: color var(--motion);
  }
  a:hover {
    color: ${({ theme }) => theme.primaryColorHover};
  }

  /* Theme color class overrides for the dark and kleros themes */
  body:not([data-theme="light"]) {
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
