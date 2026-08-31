import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'
import { useEink } from '../hooks/useEink'
import { usePWAInstall } from '../hooks/usePWAInstall'
import type { Locale } from '../types/tool'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="4" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="2" y1="12" x2="4" y2="12" />
      <line x1="20" y1="12" x2="22" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {isOpen ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  )
}

export function HeaderMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const { isEink, setIsEink } = useEink()
  const { canInstall, install } = usePWAInstall()

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const selectLocale = (newLocale: Locale) => {
    setLocale(newLocale)
  }

  const handleInstall = async () => {
    await install()
    setIsOpen(false)
  }

  return (
    <div className="header-menu-container" ref={menuRef}>
      <button
        id="header-menu-toggle"
        className={`header-menu-btn ${isOpen ? 'header-menu-btn--active' : ''}`}
        onClick={() => setIsOpen(prev => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? t.closeMenuAria : t.menuToggleAria}
        title={t.preferences}
      >
        <HamburgerIcon isOpen={isOpen} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="header-menu-dropdown"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Language Section */}
            <div className="header-menu-section">
              <span className="header-menu-label">{t.language}</span>
              <div className="header-menu-options" role="group" aria-label={t.language}>
                <button
                  type="button"
                  id="lang-btn-en"
                  className={`header-menu-option ${locale === 'en' ? 'header-menu-option--selected' : ''}`}
                  onClick={() => selectLocale('en')}
                >
                  <span className="header-menu-option-code">EN</span>
                  <span className="header-menu-option-name">English</span>
                </button>
                <button
                  type="button"
                  id="lang-btn-pl"
                  className={`header-menu-option ${locale === 'pl' ? 'header-menu-option--selected' : ''}`}
                  onClick={() => selectLocale('pl')}
                >
                  <span className="header-menu-option-code">PL</span>
                  <span className="header-menu-option-name">Polski</span>
                </button>
              </div>
            </div>

            <div className="header-menu-divider" />

            {/* Theme Section */}
            <div className="header-menu-section">
              <span className="header-menu-label">{t.theme}</span>
              <div className="header-menu-options" role="group" aria-label={t.theme}>
                <button
                  type="button"
                  id="theme-btn-dark"
                  className={`header-menu-option ${theme === 'dark' ? 'header-menu-option--selected' : ''}`}
                  onClick={() => setTheme('dark')}
                >
                  <MoonIcon />
                  <span>{t.darkMode}</span>
                </button>
                <button
                  type="button"
                  id="theme-btn-light"
                  className={`header-menu-option ${theme === 'light' ? 'header-menu-option--selected' : ''}`}
                  onClick={() => setTheme('light')}
                >
                  <SunIcon />
                  <span>{t.lightMode}</span>
                </button>
              </div>
            </div>

            <div className="header-menu-divider" />

            {/* E-reader (E-ink) Section */}
            <div className="header-menu-section">
              <span className="header-menu-label">{t.einkMode}</span>
              <div className="header-menu-options" role="group" aria-label={t.einkMode}>
                <button
                  type="button"
                  id="eink-btn-off"
                  className={`header-menu-option ${!isEink ? 'header-menu-option--selected' : ''}`}
                  onClick={() => setIsEink(false)}
                >
                  <span>{t.einkOff}</span>
                </button>
                <button
                  type="button"
                  id="eink-btn-on"
                  className={`header-menu-option ${isEink ? 'header-menu-option--selected' : ''}`}
                  onClick={() => setIsEink(true)}
                >
                  <BookIcon />
                  <span>{t.einkOn}</span>
                </button>
              </div>
            </div>

            {/* PWA Install Button when supported */}
            {canInstall && (
              <>
                <div className="header-menu-divider" />
                <button
                  type="button"
                  id="pwa-install-btn"
                  className="header-menu-install-btn"
                  onClick={handleInstall}
                >
                  <DownloadIcon />
                  <span>{t.installApp}</span>
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
