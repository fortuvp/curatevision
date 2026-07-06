import React, { createContext, useState, useEffect, useCallback } from 'react'
import { ThemeProvider as StyledThemeProvider } from 'styled-components'

const THEME_STORAGE_KEY = 'kleros-curate-theme'

export const lightTheme = {
  name: 'light',
  bodyBackground: '#020611',
  componentBackground: '#ffffff',
  cardBackground: '#ffffff',
  elevatedBackground: '#f6f8fc',
  textPrimary: '#101722',
  textSecondary: '#4c5a6d',
  textTertiary: '#6f7f91',
  textInverted: '#ffffff',
  textOnPrimary: '#ffffff',
  primaryColor: '#00a3ff',
  primaryColorHover: '#6ca1ff',
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
  linkColor: '#00a3ff',
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
  buttonPrimaryBg: '#00a3ff',
  buttonPrimaryText: '#eef7ff',
  buttonPrimaryHoverBg: '#6ca1ff',
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
  curateBg: '#020611',
  curateBgSoft: '#06111c',
  curateSurface: 'rgba(7, 18, 32, 0.9)',
  curateSurfaceStrong: 'rgba(9, 23, 41, 0.94)',
  curateBorder: 'rgba(117, 151, 197, 0.18)',
  curateBorderStrong: 'rgba(0, 163, 255, 0.46)',
  curateText: '#eef7ff',
  curateMuted: '#8a98ad',
  curateFaint: '#607085',
  curateLive: '#00a3ff',
  curateViolet: '#6ca1ff',
  curateSuccess: '#16a34a',
  curateWarning: '#d97706',
  curateDanger: '#ef4444',
  curateShadow: '0 30px 105px rgba(0, 0, 0, 0.66)',
  curateShadowHover: '0 34px 120px rgba(0, 0, 0, 0.78)',
  curateGlowA: 'rgba(0, 142, 255, 0.26)',
  curateGlowB: 'rgba(72, 196, 255, 0.12)',
}

export const darkTheme = {
  name: 'dark',
  bodyBackground: '#020611',
  componentBackground: '#071220',
  cardBackground: '#091729',
  elevatedBackground: '#0b1728',
  textPrimary: '#eef7ff',
  textSecondary: '#a6b4c7',
  textTertiary: '#7b8ca5',
  textInverted: '#03060a',
  textOnPrimary: '#031016',
  primaryColorHover: '#6ca1ff',
  primaryColor: '#00a3ff',
  secondaryColor: '#6ca1ff',
  tertiaryColor: '#16f195',
  quaternaryColor: '#151f2d',
  gradientStart: '#020611',
  gradientEnd: '#02050c',
  gradientMid: '#06111c',
  navbarBackground: '#03080f',
  footerBackground: '#02050c',
  borderColor: 'rgba(117, 151, 197, 0.18)',
  shadowColor: 'rgba(0, 0, 0, 0.5)',
  successColor: '#16f195',
  errorColor: '#ff4d67',
  warningColor: '#f6b44b',
  infoColor: '#00a3ff',
  linkColor: '#00a3ff',
  disabledColor: 'rgba(255, 255, 255, 0.35)',
  bannerGradient:
    'linear-gradient(135deg, rgba(8,13,20,0.96) 0%, rgba(12,22,34,0.92) 100%)',
  bannerTextColor: '#e8eef7',
  bannerTitleColor: '#f8fbff',
  bannerDescriptionColor: 'rgba(232, 238, 247, 0.68)',
  bannerLinkColor: '#00a3ff',
  bannerLinkHoverColor: '#6ca1ff',
  bannerPolicyLinkColor: '#00a3ff',
  bannerPolicyLinkHoverColor: '#6ca1ff',
  buttonPrimaryBg: '#00a3ff',
  buttonPrimaryText: '#eef7ff',
  buttonPrimaryHoverBg: '#6ca1ff',
  buttonSecondaryBg: '#081322',
  buttonSecondaryText: '#eef7ff',
  switchOffBg: '#182334',
  switchHoverBg: '#00a3ff',
  switchHandleBg: '#ffffff',
  focusBorderColor: 'rgba(95, 173, 219, 0.5)',
  focusShadowColor: 'rgba(95, 173, 219, 0.2)',
  cardHeaderGradient:
    'linear-gradient(135deg, #0b111a 0%, #111b29 55%, #0c1622 100%)',
  cardHeaderLinkColor: '#6ca1ff',
  cardHeaderLinkHoverColor: '#d2f7ff',
  evidenceCardBorder: '#1d2938',
  timelineDotColor: '#45556b',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  cardNsfwText: '#ffffff',
  dropdownShadow: 'rgba(0, 0, 0, 0.5)',
  dropdownHoverBg: 'rgba(0, 163, 255, 0.1)',
  dropdownSelectedBg: 'rgba(0, 163, 255, 0.15)',
  modalBackground: '#0b111a',
  modalShadow: 'rgba(0, 0, 0, 0.5)',
  modalCloseColor: '#00a3ff',
  notificationPending: '#ccc',
  notificationAccepted: '#00a3ff',
  notificationChallenged: '#fa8d39',
  notificationAppealable: '#722ed1',
  notificationFinalRuling: '#f95638',
  statusCrowdfundingWinner: '#9d52d6',
  loadingIconColor: '#00a3ff',
  skeletonBase: '#111b29',
  skeletonHighlight: '#1c2a3c',
  countdownTextColor: '#ffffff5c',
  filterBorderColor: '#273248',
  filterTextColor: '#d4dae7',
  tourAccentColor: '#00a3ff',
  explorerGradientStart: '#00a3ffd9',
  explorerGradientEnd: '#6ca1ffd9',
  explorerTextColor: '#a5b1c2',
  welcomeModalShadow: 'rgba(0, 0, 0, 0.5)',
  betaWarningBg: '#3d2a55',
  badgeFallbackColor: '#ccc',
  stakeTagBg: '#14243a',
  stakeTagText: '#dff8ff',
  itemDetailsTitleColor: '#6ca1ff',
  itemDetailsSubtitleColor: 'rgba(255, 255, 255, 0.6)',
  crowdfundingCardText: '#ffffff',
  richAddressWarningColor: '#ffc53d',
  seerBorderColor: '#1d2938',
  seerLinkColor: '#00a3ff',
  seerTextPrimary: '#eef7ff',
  seerTextSecondary: '#a5b1c2',
  seerBackgroundAlt: '#101722',
  seerShadow: 'rgba(0, 0, 0, 0.3)',
  tooltipBg: '#111827',
  tooltipText: '#ffffff',
  tooltipBorder: '#1d2938',
  tooltipShadow: 'rgba(0, 0, 0, 0.6)',
  curateBg: '#020611',
  curateBgSoft: '#06111c',
  curateSurface: 'rgba(7, 18, 32, 0.9)',
  curateSurfaceStrong: 'rgba(9, 23, 41, 0.94)',
  curateBorder: 'rgba(117, 151, 197, 0.18)',
  curateBorderStrong: 'rgba(0, 163, 255, 0.46)',
  curateText: '#eef7ff',
  curateMuted: '#8a98ad',
  curateFaint: '#607085',
  curateLive: '#00a3ff',
  curateViolet: '#6ca1ff',
  curateSuccess: '#16f195',
  curateWarning: '#f6b44b',
  curateDanger: '#ff4d67',
  curateShadow: '0 30px 105px rgba(0, 0, 0, 0.66)',
  curateShadowHover: '0 34px 120px rgba(0, 0, 0, 0.78)',
  curateGlowA: 'rgba(0, 142, 255, 0.26)',
  curateGlowB: 'rgba(72, 196, 255, 0.12)',
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

    return true
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
