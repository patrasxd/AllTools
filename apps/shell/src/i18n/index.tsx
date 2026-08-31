import React, { createContext, useContext, useEffect, useState, useMemo } from 'react'
import type { Locale } from '../types/tool'

const STORAGE_KEY = 'alltools:language'

function detectInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'pl') return saved

    // Auto-detect from browser locale
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('pl')) return 'pl'
    return 'en'
  } catch {
    return 'en'
  }
}

export interface TranslationDictionary {
  backToHomeAria: string
  preferences: string
  language: string
  theme: string
  darkMode: string
  lightMode: string
  einkMode: string
  einkOn: string
  einkOff: string
  einkDesc: string
  menuToggleAria: string
  closeMenuAria: string
  heroEyebrow: string
  heroTitle: string
  heroDescription: string
  toolCount: (n: number) => string
  open: string
  openAria: (name: string) => string
  toolTagsAria: string
  backToTools: string
  backToToolsAria: string
  loading: string
  notFound: string
  returnToTools: string
  pageNotFound: string
  installApp: string
  installedApp: string
  allFilter: string
  filterLabel: string
  noFilteredTools: string
  clearFilter: string
  legalNotice: string
}

export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    backToHomeAria: 'AllTools — return to home',
    preferences: 'Preferences',
    language: 'Language',
    theme: 'Theme',
    darkMode: 'Dark',
    lightMode: 'Light',
    einkMode: 'E-reader mode (E-ink)',
    einkOn: 'On',
    einkOff: 'Off',
    einkDesc: 'Optimized for E-ink screens: zero animations, ultra high contrast.',
    menuToggleAria: 'Open preferences menu',
    closeMenuAria: 'Close preferences menu',
    heroEyebrow: 'Tool collection',
    heroTitle: 'All\nTools',
    heroDescription: 'Essential browser utilities. No registration, no ads. All your data stays on this device.',
    toolCount: (n: number) => (n === 1 ? '1 tool' : `${n} tools`),
    open: 'Open',
    openAria: (name: string) => `Open ${name}`,
    toolTagsAria: 'Tool tags',
    backToTools: 'All tools',
    backToToolsAria: 'Back to tools list',
    loading: 'Loading…',
    notFound: 'Tool not found:',
    returnToTools: 'Return to tools list →',
    pageNotFound: '404 — Page not found',
    installApp: 'Install app',
    installedApp: 'Installed',
    allFilter: 'All',
    filterLabel: 'Filter by category',
    noFilteredTools: 'No tools found in this category.',
    clearFilter: 'Show all tools',
    legalNotice: 'Legal Notice & Privacy',
  },
  pl: {
    backToHomeAria: 'AllTools — wróć do strony głównej',
    preferences: 'Preferencje',
    language: 'Język',
    theme: 'Motyw',
    darkMode: 'Ciemny',
    lightMode: 'Jasny',
    einkMode: 'Tryb czytnika (E-ink)',
    einkOn: 'Włączony',
    einkOff: 'Wyłączony',
    einkDesc: 'Optymalizacja pod ekrany E-ink: brak animacji, wysoki kontrast.',
    menuToggleAria: 'Otwórz menu preferencji',
    closeMenuAria: 'Zamknij menu preferencji',
    heroEyebrow: 'Kolekcja narzędzi',
    heroTitle: 'All\nTools',
    heroDescription: 'Podręczne narzędzia w przeglądarce. Bez rejestracji, bez reklam. Twoje dane zostają na tym urządzeniu.',
    toolCount: (n: number) => {
      if (n === 1) return '1 narzędzie'
      if (n >= 2 && n <= 4) return `${n} narzędzia`
      return `${n} narzędzi`
    },
    open: 'Otwórz',
    openAria: (name: string) => `Otwórz ${name}`,
    toolTagsAria: 'Tagi narzędzia',
    backToTools: 'Wszystkie narzędzia',
    backToToolsAria: 'Wróć do listy narzędzi',
    loading: 'Wczytywanie…',
    notFound: 'Nie znaleziono narzędzia:',
    returnToTools: 'Wróć do listy narzędzi →',
    pageNotFound: '404 — Nie znaleziono strony',
    installApp: 'Zainstaluj aplikację',
    installedApp: 'Zainstalowano',
    allFilter: 'Wszystkie',
    filterLabel: 'Filtruj po kategorii',
    noFilteredTools: 'Brak narzędzi w tej kategorii.',
    clearFilter: 'Pokaż wszystkie narzędzia',
    legalNotice: 'Nota prawna & Prywatność',
  },
}

interface I18nContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: TranslationDictionary
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale)

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    try {
      localStorage.setItem(STORAGE_KEY, newLocale)
    } catch {
      // Ignore
    }
  }

  // Sync with document element lang attribute
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useMemo(() => translations[locale], [locale])

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}
