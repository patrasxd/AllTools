import { Routes, Route, useLocation } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ToolPage } from './pages/ToolPage'
import { LegalPage } from './pages/LegalPage'
import { useI18n } from './i18n'
import { useTheme } from './hooks/useTheme'

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
  const { isEink } = useTheme()

  const routes = (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomePage />} />
      <Route path="/tools/:slug" element={<ToolPage />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  )

  return (
    <MotionConfig reducedMotion={isEink ? 'always' : 'never'} transition={isEink ? { duration: 0 } : undefined}>
      <Layout>{routes}</Layout>
    </MotionConfig>
  )
}
