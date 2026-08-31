import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useI18n } from '../i18n'

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
}

export function LegalPage() {
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const isPl = locale === 'pl'

  return (
    <motion.div
      className="tool-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="tool-page-inner">
        <div className="container" style={{ maxWidth: '680px', width: '100%', margin: '0 auto' }}>
          {/* Back button aligned directly above title */}
          <button
            className="game-floating-back"
            onClick={() => navigate('/')}
            aria-label={t.backToToolsAria}
            title={t.backToTools}
            style={{ marginBottom: '1.25rem' }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
              <path d="M9 12h10" />
            </svg>
            <span>{t.backToTools}</span>
          </button>

          {/* Legal Notice Document Card */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '2rem 1.75rem',
            color: 'var(--text)',
            lineHeight: 1.6,
          }}>
            <header style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.85rem', marginBottom: '1.5rem' }}>
              <h1 style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '1.375rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                margin: 0,
                color: 'var(--text)',
              }}>
                {isPl ? 'Informacje prawne & Zastrzeżenia' : 'Legal Notice & Disclaimers'}
              </h1>
            </header>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.8125rem' }}>
              <section>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.35rem', color: 'var(--text)' }}>
                  {isPl ? '1. Charakter pomocniczy i poglądowy' : '1. Auxiliary & Informational Purpose'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {isPl
                    ? 'Narzędzia dostępne w AllTools (w tym kalkulatory, przeliczniki jednostek, linijka ekranowa, kątomierz, poziomica, tuner gitarowy, edytor zdjęć oraz menedżer PDF) są przeznaczone wyłącznie do codziennego użytku pomocniczego i celów poglądowych. Nie stanowią one certyfikowanych przyrządów pomiarowych ani profesjonalnych ekspertyz inżynieryjnych czy finansowych.'
                    : 'Tools provided within AllTools (including calculators, unit converters, screen ruler, level, protractor, tuner, image editor, and PDF manager) are intended solely for casual auxiliary and informational use. They do not replace certified measuring equipment or professional engineering or financial advice.'}
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.35rem', color: 'var(--text)' }}>
                  {isPl ? '2. Dokładność i zależność od urządzenia' : '2. Accuracy & Device Hardware'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {isPl
                    ? 'Dokładność pomiarów (linijka, kątomierz, poziomica, tuner dźwięku) zależy bezpośrednio od parametrów fizycznych Twojego urządzenia — kalibracji ekranu (DPI), czujników (akcelerometr, żyroskop) oraz czułości mikrofonu. Pomiary mogą różnić się w zależności od modelu urządzenia i przeglądarki.'
                    : 'Measurement accuracy (ruler, protractor, level, pitch tuner) relies directly on your hardware specifications — screen DPI, sensor calibration (accelerometer, gyroscope), and microphone fidelity. Results may vary across devices and browsers.'}
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.35rem', color: 'var(--text)' }}>
                  {isPl ? '3. Prywatność i brak śledzenia' : '3. Privacy & Zero Tracking'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {isPl
                    ? 'AllTools działa w 100% lokalnie na Twoim urządzeniu. Twoje pliki PDF, zdjęcia, notatki czy dane z mikrofonu nigdy nie są przesyłane na żaden serwer. Aplikacja nie stosuje żadnych plików cookies śledzących, reklamowych ani skryptów analitycznych.'
                    : 'AllTools runs 100% locally on your device. Your PDF documents, images, notes, and microphone audio are never uploaded to any server. The application uses zero tracking cookies, ads, or third-party analytics.'}
                </p>
              </section>

              <section>
                <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: '0 0 0.35rem', color: 'var(--text)' }}>
                  {isPl ? '4. Brak gwarancji (Licencja MIT)' : '4. Disclaimer of Warranty (MIT License)'}
                </h2>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                  {isPl
                    ? 'Oprogramowanie udostępniane jest bezpłatnie w stanie „takim, w jakim jest” (AS IS), bez jakichkolwiek gwarancji. Autorzy nie ponoszą odpowiedzialności za jakiekolwiek bezpośrednie lub pośrednie skutki wynikające z korzystania z aplikacji.'
                    : 'The software is provided free of charge "AS IS", without warranty of any kind. In no event shall the authors be liable for any claim, damages, or consequences arising from the use of the tools.'}
                </p>
              </section>
            </div>

            <footer style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                AllTools © {new Date().getFullYear()} — MIT License
              </span>
              <button
                type="button"
                onClick={() => navigate('/')}
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  cursor: 'pointer',
                }}
              >
                {t.backToTools}
              </button>
            </footer>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
