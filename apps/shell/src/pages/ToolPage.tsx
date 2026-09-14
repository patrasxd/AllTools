import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BackLink } from '@all/ui'
import { TOOLS_METADATA, loadToolComponent } from '../tools/registry'
import { useI18n } from '../i18n'
import { useTheme } from '../hooks/useTheme'
import { getLocalizedText } from '../types/tool'
import { useToolHeader } from '../components/Layout'

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
  const { isEink } = useTheme()
  const metadata = TOOLS_METADATA.find(item => item.slug === slug)

  const handleBackToTools = useCallback(() => {
    navigate('/')
  }, [navigate])

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
          <BackLink
            id={`back-btn-${slug}`}
            label={t.backToTools}
            onClick={handleBackToTools}
            aria-label={t.backToToolsAria}
            title={t.backToTools}
          />
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
