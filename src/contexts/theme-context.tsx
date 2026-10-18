import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

/**
 * Three color themes built from one semantic palette each, so every legacy theme key the
 * app reads stays defined and consistent. See DESIGN.md for the roles and rules.
 *
 *  - light:  cool neutral canvas, one blue accent, no glow
 *  - dark:   the glow stage: blue-tinted near-black with a single accent bloom
 *  - kleros: the production Kleros dApp palette (deep purple surfaces)
 *
 * "system" follows the OS between light and dark.
 */
export type ThemeMode = 'system' | 'light' | 'dark' | 'kleros'
export type ThemeName = 'light' | 'dark' | 'kleros'

export const THEME_STORAGE_KEY = 'kleros-curate-theme'

interface Palette {
  name: ThemeName
  background: string
  surface: string
  raised: string
  text: string
  textMuted: string
  textFaint: string
  textInverted: string
  border: string
  borderStrong: string
  primary: string
  primaryHover: string
  onPrimary: string
  primarySoft: string
  indigo: string
  indigoSoft: string
  success: string
  successSoft: string
  warning: string
  warningSoft: string
  danger: string
  dangerSoft: string
  shadow: string
  shadowHover: string
  overlayShadow: string
  glow: string
}

const light: Palette = {
  name: 'light',
  background: '#f4f6f9',
  surface: '#ffffff',
  raised: '#eef1f5',
  text: '#0f1419',
  textMuted: '#4b5563',
  textFaint: '#6b7686',
  textInverted: '#ffffff',
  border: '#e1e6ee',
  borderStrong: '#c9d2de',
  primary: '#1f6feb',
  primaryHover: '#185fcc',
  onPrimary: '#ffffff',
  primarySoft: '#e6f0fd',
  indigo: '#5b61d6',
  indigoSoft: '#ecedfb',
  success: '#178a4c',
  successSoft: '#e6f4ec',
  warning: '#9a5b00',
  warningSoft: '#fbf1e0',
  danger: '#c92a2a',
  dangerSoft: '#fbe7e7',
  shadow: '0 1px 2px rgba(16, 24, 40, 0.06)',
  shadowHover: '0 2px 6px rgba(16, 24, 40, 0.1)',
  overlayShadow: '0 12px 32px rgba(16, 24, 40, 0.12)',
  glow: 'transparent',
}

const dark: Palette = {
  name: 'dark',
  background: '#0a0e14',
  surface: '#10161f',
  raised: '#171f2b',
  text: '#e9eef5',
  textMuted: '#aeb8c6',
  textFaint: '#7d8a9e',
  textInverted: '#06101c',
  border: 'rgba(148, 163, 184, 0.16)',
  borderStrong: 'rgba(148, 163, 184, 0.34)',
  primary: '#5da9ff',
  primaryHover: '#7fbbff',
  onPrimary: '#06101c',
  primarySoft: 'rgba(93, 169, 255, 0.14)',
  indigo: '#8b93ff',
  indigoSoft: 'rgba(139, 147, 255, 0.14)',
  success: '#3dd68c',
  successSoft: 'rgba(61, 214, 140, 0.14)',
  warning: '#f5b14c',
  warningSoft: 'rgba(245, 177, 76, 0.14)',
  danger: '#ff6b6b',
  dangerSoft: 'rgba(255, 107, 107, 0.14)',
  shadow: 'none',
  shadowHover: 'none',
  overlayShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
  glow: 'rgba(93, 169, 255, 0.14)',
}

// Values from @kleros/ui-components-library theme.css (dark set), see DESIGN.md.
const kleros: Palette = {
  name: 'kleros',
  background: '#1b003f',
  surface: '#220050',
  raised: '#2a1260',
  text: '#daf0ff',
  textMuted: '#becce5',
  textFaint: '#9a93c4',
  textInverted: '#1b003f',
  border: '#392c74',
  borderStrong: '#4f4595',
  primary: '#6cc5ff',
  primaryHover: '#a5dbff',
  onPrimary: '#1b003f',
  primarySoft: '#2e206c',
  indigo: '#b45fff',
  indigoSoft: '#390f6c',
  success: '#65dc7f',
  successSoft: '#32355b',
  warning: '#ffc46b',
  warningSoft: '#451f54',
  danger: '#ff5a78',
  dangerSoft: '#360652',
  shadow: 'none',
  shadowHover: 'none',
  overlayShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
  glow: 'rgba(144, 19, 254, 0.2)',
}

/** Expands a palette into the full set of keys the app's styled components read. */
const buildTheme = (p: Palette) => ({
  name: p.name,
  bodyBackground: p.background,
  componentBackground: p.surface,
  cardBackground: p.surface,
  elevatedBackground: p.raised,
  textPrimary: p.text,
  textSecondary: p.textMuted,
  textTertiary: p.textFaint,
  textInverted: p.textInverted,
  textOnPrimary: p.onPrimary,
  primaryColor: p.primary,
  primaryColorHover: p.primaryHover,
  secondaryColor: p.indigo,
  tertiaryColor: p.indigo,
  quaternaryColor: p.raised,
  gradientStart: p.surface,
  gradientEnd: p.background,
  gradientMid: p.raised,
  navbarBackground: p.surface,
  footerBackground: p.surface,
  borderColor: p.border,
  shadowColor:
    p.name === 'light' ? 'rgba(16, 24, 40, 0.08)' : 'rgba(0, 0, 0, 0.5)',
  successColor: p.success,
  errorColor: p.danger,
  warningColor: p.warning,
  infoColor: p.primary,
  linkColor: p.primary,
  disabledColor:
    p.name === 'light' ? 'rgba(15, 20, 25, 0.3)' : 'rgba(233, 238, 245, 0.35)',
  bannerGradient: p.raised,
  bannerTextColor: p.text,
  bannerTitleColor: p.text,
  bannerDescriptionColor: p.textMuted,
  bannerLinkColor: p.primary,
  bannerLinkHoverColor: p.primaryHover,
  bannerPolicyLinkColor: p.primary,
  bannerPolicyLinkHoverColor: p.primaryHover,
  buttonPrimaryBg: p.primary,
  buttonPrimaryText: p.onPrimary,
  buttonPrimaryHoverBg: p.primaryHover,
  buttonSecondaryBg: p.surface,
  buttonSecondaryText: p.text,
  switchOffBg: p.borderStrong,
  switchHoverBg: p.primaryHover,
  switchHandleBg: '#ffffff',
  focusBorderColor: p.primary,
  focusShadowColor: p.primarySoft,
  cardHeaderGradient: p.surface,
  cardHeaderLinkColor: p.primary,
  cardHeaderLinkHoverColor: p.primaryHover,
  evidenceCardBorder: p.border,
  timelineDotColor: p.borderStrong,
  cardShadow: p.shadow,
  cardNsfwText: p.text,
  dropdownShadow: p.overlayShadow,
  dropdownHoverBg: p.raised,
  dropdownSelectedBg: p.primarySoft,
  modalBackground: p.surface,
  modalShadow: p.overlayShadow,
  modalCloseColor: p.textMuted,
  notificationPending: p.textFaint,
  notificationAccepted: p.success,
  notificationChallenged: p.warning,
  notificationAppealable: p.warning,
  notificationFinalRuling: p.danger,
  statusCrowdfundingWinner: p.warning,
  loadingIconColor: p.primary,
  skeletonBase: p.raised,
  skeletonHighlight: p.surface,
  countdownTextColor: p.textMuted,
  filterBorderColor: p.border,
  filterTextColor: p.text,
  tourAccentColor: p.primary,
  explorerGradientStart: p.raised,
  explorerGradientEnd: p.raised,
  explorerTextColor: p.textMuted,
  welcomeModalShadow: p.overlayShadow,
  betaWarningBg: p.warningSoft,
  badgeFallbackColor: p.borderStrong,
  stakeTagBg: p.indigoSoft,
  stakeTagText: p.indigo,
  itemDetailsTitleColor: p.text,
  itemDetailsSubtitleColor: p.textMuted,
  crowdfundingCardText: p.text,
  richAddressWarningColor: p.warning,
  seerBorderColor: p.border,
  seerLinkColor: p.primary,
  seerTextPrimary: p.text,
  seerTextSecondary: p.textMuted,
  seerBackgroundAlt: p.raised,
  seerShadow: p.shadow,
  tooltipBg: p.name === 'light' ? '#0f1419' : p.raised,
  tooltipText: p.name === 'light' ? '#ffffff' : p.text,
  tooltipBorder: p.name === 'light' ? '#0f1419' : p.borderStrong,
  tooltipShadow: p.overlayShadow,
  curateBg: p.background,
  curateBgSoft: p.surface,
  curateSurface: p.surface,
  curateSurfaceStrong: p.surface,
  curateBorder: p.border,
  curateBorderStrong: p.borderStrong,
  curateText: p.text,
  curateMuted: p.textMuted,
  curateFaint: p.textFaint,
  curateLive: p.primary,
  curateLiveSoft: p.primarySoft,
  curateViolet: p.indigo,
  curateVioletSoft: p.indigoSoft,
  curateSuccess: p.success,
  curateSuccessSoft: p.successSoft,
  curateWarning: p.warning,
  curateWarningSoft: p.warningSoft,
  curateDanger: p.danger,
  curateDangerSoft: p.dangerSoft,
  curateShadow: p.shadow,
  curateShadowHover: p.shadowHover,
  curateGlowA: p.glow,
  curateGlowB: 'transparent',
})

export const lightTheme = buildTheme(light)
export const darkTheme = buildTheme(dark)
export const klerosTheme = buildTheme(kleros)

export type Theme = typeof lightTheme

const THEMES: Record<ThemeName, Theme> = {
  light: lightTheme,
  dark: darkTheme,
  kleros: klerosTheme,
}

export const THEME_MODES: { value: ThemeMode; label: string; hint: string }[] =
  [
    { value: 'system', label: 'System', hint: 'Follows your device' },
    { value: 'light', label: 'Light', hint: 'Cool neutral canvas' },
    { value: 'dark', label: 'Dark', hint: 'Glow stage' },
    { value: 'kleros', label: 'Kleros', hint: 'Brand purple' },
  ]

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'system' ||
  value === 'light' ||
  value === 'dark' ||
  value === 'kleros'

const systemPrefersDark = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

const resolveMode = (mode: ThemeMode, prefersDark: boolean): ThemeName =>
  mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode

/**
 * Default mode for visitors who never picked one: follow the operating system
 * (DESIGN.md). Must match DEFAULT_MODE in index.html, which applies the saved
 * mode before React mounts.
 */
export const DEFAULT_THEME_MODE: ThemeMode = 'system'

const readSavedMode = (): ThemeMode => {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeMode(saved)) return saved
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return DEFAULT_THEME_MODE
}

interface ThemeContextValue {
  /** True for dark and kleros; kept for components written against the old toggle. */
  isDarkMode: boolean
  /** Switches between light and dark; kept for the old toggle button. */
  toggleTheme: () => void
  theme: Theme
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  resolved: ThemeName
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [mode, setModeState] = useState<ThemeMode>(readSavedMode)
  const [prefersDark, setPrefersDark] = useState<boolean>(systemPrefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event: MediaQueryListEvent) =>
      setPrefersDark(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  const resolved = resolveMode(mode, prefersDark)
  const theme = THEMES[resolved]
  const isDarkMode = resolved !== 'light'

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Storage can be blocked; the choice then lasts for the session.
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setMode(resolved === 'light' ? 'dark' : 'light')
  }, [resolved, setMode])

  useEffect(() => {
    document.body.setAttribute('data-theme', resolved)
    document.body.style.backgroundColor = theme.curateBg
    document.body.style.colorScheme = isDarkMode ? 'dark' : 'light'
    // Shared @kleros/ui-components-library components (e.g. FileViewer) read
    // their CSS variables from `:root.dark`, so keep that class in sync.
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [resolved, isDarkMode, theme.curateBg])

  const value = useMemo(
    () => ({ isDarkMode, toggleTheme, theme, mode, setMode, resolved }),
    [isDarkMode, toggleTheme, theme, mode, setMode, resolved],
  )

  return (
    <ThemeContext.Provider value={value}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  )
}

export { ThemeContext, ThemeProvider }
