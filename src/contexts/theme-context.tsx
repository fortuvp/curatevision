import React, { createContext, useState, useEffect, useCallback } from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

const THEME_STORAGE_KEY = 'kleros-curate-theme'

export const lightTheme = {
  name: 'light',
  bodyBackground: '#eef3fb',
  componentBackground: '#ffffff',
  cardBackground: '#ffffff',
  elevatedBackground: '#f6f8fc',
  textPrimary: '#101722',
  textSecondary: '#4c5a6d',
  textTertiary: '#6f7f91',
  textInverted: '#ffffff',
  textOnPrimary: '#ffffff',
  primaryColor: '#1677ff',
  primaryColorHover: '#4cc9f0',
  secondaryColor: '#151a26',
  tertiaryColor: '#6d5dfc',
  quaternaryColor: '#e7ecf4',
  gradientStart: '#121826',
  gradientEnd: '#242a38',
  gradientMid: '#1b2332',
  navbarBackground: '#070a10',
  footerBackground: '#070a10',
  borderColor: '#dbe4f0',
  shadowColor: 'rgba(18, 26, 38, 0.12)',
  successColor: '#16a34a',
  errorColor: '#ef4444',
  warningColor: '#d97706',
  infoColor: '#1677ff',
  linkColor: '#1677ff',
  disabledColor: 'rgba(0, 0, 0, 0.25)',
  bannerGradient:
    'linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(233,240,249,0.82) 100%)',
  bannerTextColor: '#101722',
  bannerTitleColor: '#101722',
  bannerDescriptionColor: '#4c5a6d',
  bannerLinkColor: '#1677ff',
  bannerLinkHoverColor: '#4cc9f0',
  bannerPolicyLinkColor: '#1677ff',
  bannerPolicyLinkHoverColor: '#4cc9f0',
  buttonPrimaryBg: '#1677ff',
  buttonPrimaryText: '#ffffff',
  buttonPrimaryHoverBg: '#4cc9f0',
  buttonSecondaryBg: '#151a26',
  buttonSecondaryText: '#ffffff',
  switchOffBg: 'rgba(0, 0, 0, 0.25)',
  switchHoverBg: '#7c3aed',
  switchHandleBg: '#ffffff',
  focusBorderColor: 'rgba(104, 38, 191, 0.4)',
  focusShadowColor: 'rgba(104, 38, 191, 0.2)',
  cardHeaderGradient:
    'linear-gradient(135deg, #101722 0%, #202a3c 52%, #1a3d56 100%)',
  cardHeaderLinkColor: '#d4e8ff',
  cardHeaderLinkHoverColor: '#ffffff',
  evidenceCardBorder: '#e0d4f0',
  timelineDotColor: '#b09cd0',
  cardShadow: 'rgba(188, 156, 255, 0.3)',
  cardNsfwText: '#ffffff',
  dropdownShadow: 'rgba(188, 156, 255, 0.3)',
  dropdownHoverBg: 'rgba(104, 38, 191, 0.1)',
  dropdownSelectedBg: 'rgba(104, 38, 191, 0.15)',
  modalBackground: '#ffffff',
  modalShadow: 'rgba(188, 156, 255, 0.3)',
  modalCloseColor: '#6826bf',
  notificationPending: '#ccc',
  notificationAccepted: '#009aff',
  notificationChallenged: '#fa8d39',
  notificationAppealable: '#722ed1',
  notificationFinalRuling: '#f95638',
  statusCrowdfundingWinner: '#9d52d6',
  loadingIconColor: '#009aff',
  skeletonBase: '#e8e0f0',
  skeletonHighlight: '#f3ecfc',
  countdownTextColor: '#ffffffa0',
  filterBorderColor: '#cbd5e1',
  filterTextColor: '#1f2937',
  tourAccentColor: '#1677ff',
  explorerGradientStart: '#1677ffd9',
  explorerGradientEnd: '#1d4ed8d9',
  explorerTextColor: '#4c5a6d',
  welcomeModalShadow: 'rgba(188, 156, 255, 0.3)',
  betaWarningBg: '#fffbe6',
  badgeFallbackColor: '#ccc',
  stakeTagBg: '#5a3490',
  stakeTagText: '#e8dff5',
  itemDetailsTitleColor: '#4d00b4',
  itemDetailsSubtitleColor: 'rgba(77, 0, 180, 0.45)',
  crowdfundingCardText: '#ffffff',
  richAddressWarningColor: '#787800',
  seerBorderColor: '#e0e0e0',
  seerLinkColor: '#009aff',
  seerTextPrimary: '#333',
  seerTextSecondary: '#666',
  seerBackgroundAlt: '#f9f9f9',
  seerShadow: 'rgba(0, 0, 0, 0.1)',
  tooltipBg: '#101722',
  tooltipText: '#ffffff',
  tooltipBorder: '#243044',
  tooltipShadow: 'rgba(18, 26, 38, 0.24)',
  curateBg: '#edf2f8',
  curateBgSoft: '#f8fbff',
  curateSurface: 'rgba(255, 255, 255, 0.82)',
  curateSurfaceStrong: '#ffffff',
  curateBorder: 'rgba(15, 23, 42, 0.12)',
  curateBorderStrong: 'rgba(22, 119, 255, 0.32)',
  curateText: '#101722',
  curateMuted: '#526174',
  curateFaint: '#7a889b',
  curateLive: '#1677ff',
  curateViolet: '#6d5dfc',
  curateSuccess: '#16a34a',
  curateWarning: '#d97706',
  curateDanger: '#ef4444',
  curateShadow: '0 18px 48px rgba(18, 26, 38, 0.10)',
  curateShadowHover: '0 24px 70px rgba(18, 26, 38, 0.16)',
  curateGlowA: 'rgba(22, 119, 255, 0.12)',
  curateGlowB: 'rgba(109, 93, 252, 0.10)',
}

export const darkTheme = {
  name: 'dark',
  bodyBackground: '#03060a',
  componentBackground: '#080d14',
  cardBackground: '#0b111a',
  elevatedBackground: '#101722',
  textPrimary: '#f4f8ff',
  textSecondary: '#a5b1c2',
  textTertiary: '#748297',
  textInverted: '#03060a',
  textOnPrimary: '#031016',
  primaryColorHover: '#73e6ff',
  primaryColor: '#00d1ff',
  secondaryColor: '#7c65ff',
  tertiaryColor: '#16f195',
  quaternaryColor: '#151f2d',
  gradientStart: '#03060a',
  gradientEnd: '#0b111a',
  gradientMid: '#08111c',
  navbarBackground: '#03060a',
  footerBackground: '#03060a',
  borderColor: '#1d2938',
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  successColor: '#16f195',
  errorColor: '#ff4d67',
  warningColor: '#f6b44b',
  infoColor: '#00d1ff',
  linkColor: '#00d1ff',
  disabledColor: 'rgba(255, 255, 255, 0.35)',
  bannerGradient:
    'linear-gradient(135deg, rgba(8,13,20,0.96) 0%, rgba(12,22,34,0.92) 100%)',
  bannerTextColor: '#e8eef7',
  bannerTitleColor: '#f8fbff',
  bannerDescriptionColor: 'rgba(232, 238, 247, 0.68)',
  bannerLinkColor: '#00d1ff',
  bannerLinkHoverColor: '#73e6ff',
  bannerPolicyLinkColor: '#00d1ff',
  bannerPolicyLinkHoverColor: '#73e6ff',
  buttonPrimaryBg: '#00d1ff',
  buttonPrimaryText: '#031016',
  buttonPrimaryHoverBg: '#73e6ff',
  buttonSecondaryBg: '#101722',
  buttonSecondaryText: '#f4f8ff',
  switchOffBg: '#182334',
  switchHoverBg: '#00d1ff',
  switchHandleBg: '#ffffff',
  focusBorderColor: 'rgba(95, 173, 219, 0.5)',
  focusShadowColor: 'rgba(95, 173, 219, 0.2)',
  cardHeaderGradient:
    'linear-gradient(135deg, #0b111a 0%, #111b29 55%, #0c1622 100%)',
  cardHeaderLinkColor: '#73e6ff',
  cardHeaderLinkHoverColor: '#d2f7ff',
  evidenceCardBorder: '#1d2938',
  timelineDotColor: '#45556b',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  cardNsfwText: '#ffffff',
  dropdownShadow: 'rgba(0, 0, 0, 0.5)',
  dropdownHoverBg: 'rgba(0, 209, 255, 0.1)',
  dropdownSelectedBg: 'rgba(0, 209, 255, 0.15)',
  modalBackground: '#0b111a',
  modalShadow: 'rgba(0, 0, 0, 0.5)',
  modalCloseColor: '#00d1ff',
  notificationPending: '#ccc',
  notificationAccepted: '#00d1ff',
  notificationChallenged: '#fa8d39',
  notificationAppealable: '#722ed1',
  notificationFinalRuling: '#f95638',
  statusCrowdfundingWinner: '#9d52d6',
  loadingIconColor: '#00d1ff',
  skeletonBase: '#111b29',
  skeletonHighlight: '#1c2a3c',
  countdownTextColor: '#ffffff5c',
  filterBorderColor: '#273248',
  filterTextColor: '#d4dae7',
  tourAccentColor: '#00d1ff',
  explorerGradientStart: '#00d1ffd9',
  explorerGradientEnd: '#147ba0d9',
  explorerTextColor: '#a5b1c2',
  welcomeModalShadow: 'rgba(0, 0, 0, 0.5)',
  betaWarningBg: '#3d2a55',
  badgeFallbackColor: '#ccc',
  stakeTagBg: '#14243a',
  stakeTagText: '#dff8ff',
  itemDetailsTitleColor: '#73e6ff',
  itemDetailsSubtitleColor: 'rgba(255, 255, 255, 0.6)',
  crowdfundingCardText: '#ffffff',
  richAddressWarningColor: '#ffc53d',
  seerBorderColor: '#1d2938',
  seerLinkColor: '#00d1ff',
  seerTextPrimary: '#f4f8ff',
  seerTextSecondary: '#a5b1c2',
  seerBackgroundAlt: '#101722',
  seerShadow: 'rgba(0, 0, 0, 0.3)',
  tooltipBg: '#111827',
  tooltipText: '#ffffff',
  tooltipBorder: '#1d2938',
  tooltipShadow: 'rgba(0, 0, 0, 0.6)',
  curateBg: '#03060a',
  curateBgSoft: '#060a11',
  curateSurface: 'rgba(8, 13, 20, 0.92)',
  curateSurfaceStrong: 'rgba(12, 19, 29, 0.96)',
  curateBorder: 'rgba(255, 255, 255, 0.085)',
  curateBorderStrong: 'rgba(0, 209, 255, 0.34)',
  curateText: '#f4f8ff',
  curateMuted: '#9ca9ba',
  curateFaint: '#66748a',
  curateLive: '#00d1ff',
  curateViolet: '#7c65ff',
  curateSuccess: '#16f195',
  curateWarning: '#f6b44b',
  curateDanger: '#ff4d67',
  curateShadow: '0 24px 80px rgba(0, 0, 0, 0.36)',
  curateShadowHover: '0 30px 96px rgba(0, 0, 0, 0.5)',
  curateGlowA: 'rgba(0, 209, 255, 0.1)',
  curateGlowB: 'rgba(124, 101, 255, 0.1)',
}

export type Theme = typeof lightTheme

interface ThemeContextValue {
  isDarkMode: boolean
  toggleTheme: () => void
  theme: Theme
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved !== null) return saved === 'dark'

    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  const theme = isDarkMode ? darkTheme : lightTheme

  const toggleTheme = useCallback(() => {
    setIsDarkMode((prev) => !prev)
  }, [])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light')
    document.body.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    document.body.style.backgroundColor = theme.curateBg
    // Shared @kleros/ui-components-library components (e.g. FileViewer) read
    // their CSS variables from `:root.dark`, so keep that class in sync.
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode, theme.curateBg])

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, theme }}>
      <StyledThemeProvider theme={theme}>{children}</StyledThemeProvider>
    </ThemeContext.Provider>
  )
}

export { ThemeContext, ThemeProvider }
