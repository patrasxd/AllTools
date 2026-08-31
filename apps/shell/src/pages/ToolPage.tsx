import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TOOLS_METADATA, loadToolComponent } from '../tools/registry'
import { useI18n } from '../i18n'
import { useEink } from '../hooks/useEink'
import { getLocalizedText } from '../types/tool'
import { useToolHeader } from '../components/Layout'

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2L3 7l5 5" />
      <path d="M3 7h9" />
    </svg>
  )
}

function ToolFallback() {
  const { t } = useI18n()
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: 'var(--text-muted)',
      fontSize: '0.8125rem',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      fontWeight: 500,
    }}>
      <motion.span
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      >
        {t.loading}
      </motion.span>
    </div>
  )
}

function NotFound({ slug }: { slug: string }) {
  const navigate = useNavigate()
  const { t } = useI18n()
  return (
    <div style={{ padding: '4rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
      <p>{t.notFound} <code style={{ fontFamily: 'var(--font-mono)' }}>{slug}</code></p>
      <button
        onClick={() => navigate('/')}
        style={{ marginTop: '1rem', background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: 0 }}
      >
        {t.returnToTools}
      </button>
    </div>
  )
}

const pageVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit:   { opacity: 0, y: -6,  transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } },
}

export function ToolPage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { locale, t } = useI18n()
  const { isEink } = useEink()
  const metadata = TOOLS_METADATA.find(item => item.slug === slug)

  const [ToolComp, setToolComp] = useState<React.ComponentType<any> | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const { headerExtra, setHeaderExtra } = useToolHeader()
  const setHeader = useCallback((content: React.ReactNode) => {
    setHeaderExtra(content)
  }, [setHeaderExtra])

  useEffect(() => {
    setHeaderExtra(null)
  }, [slug, setHeaderExtra])

  useEffect(() => {
    let isMounted = true
    if (slug) {
      setLoading(true)
      loadToolComponent(slug)
        .then((comp) => {
          if (isMounted) {
            setToolComp(() => comp)
            setLoading(false)
          }
        })
        .catch((err) => {
          console.error('Failed to load tool component:', err)
          if (isMounted) setLoading(false)
        })
    }
    return () => {
      isMounted = false
    }
  }, [slug])

  if (!metadata) {
    return <NotFound slug={slug} />
  }

  return (
    <motion.div
      className="tool-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="tool-page-inner">
        <div className="container" style={{ width: '100%' }}>
          <button
            id={`back-btn-${slug}`}
            className="game-floating-back"
            onClick={() => navigate(-1)}
            aria-label={t.backToToolsAria}
            title={t.backToTools}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
              <path d="M9 12h10" />
            </svg>
            <span>{t.backToTools}</span>
          </button>
        </div>

        <div className={`tool-page-content ${slug === 'screen-ruler' ? 'tool-page-content--fullbleed' : 'container'}`}>
          {loading ? (
            <ToolFallback />
          ) : ToolComp ? (
            <ToolComp
              locale={locale}
              setHeader={setHeader}
              isEink={isEink}
              onSave={(data: unknown) => {
                try {
                  localStorage.setItem(`alltools:${slug}:saved`, JSON.stringify(data))
                } catch {
                  // Ignore
                }
              }}
            />
          ) : (
            <NotFound slug={slug} />
          )}
        </div>
      </div>
    </motion.div>
  )
}
