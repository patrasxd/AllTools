import { Routes, Route, useLocation } from 'react-router-dom'
import { MotionConfig, AnimatePresence } from 'framer-motion'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ToolPage } from './pages/ToolPage'
import { useI18n } from './i18n'
import { useEink } from './hooks/useEink'

function NotFoundRoute() {
  const { t } = useI18n()
  return (
    <div className="container" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
      <p>{t.pageNotFound}</p>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const { isEink } = useEink()

  const routes = (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomePage />} />
      <Route path="/tools/:slug" element={<ToolPage />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  )

  return (
    <MotionConfig
      reducedMotion={isEink ? 'always' : 'never'}
      transition={isEink ? { duration: 0 } : undefined}
    >
      <Layout>
        {isEink ? (
          routes
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {routes}
          </AnimatePresence>
        )}
      </Layout>
    </MotionConfig>
  )
}
