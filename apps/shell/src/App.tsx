import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { ToolPage } from './pages/ToolPage'
import { LegalPage } from './pages/LegalPage'
import { useI18n } from './i18n'
import { TOOLS_METADATA } from './tools/registry'
import { getLocalizedText } from './types/tool'

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
  const { locale } = useI18n()

  useEffect(() => {
    const [section, slug] = location.pathname.split('/').filter(Boolean)
    const tool = section === 'tools' ? TOOLS_METADATA.find((item) => item.slug === slug) : undefined
    document.title = tool ? `${getLocalizedText(tool.name, locale)} · AllTools` : 'AllTools'
  }, [location.pathname, locale])

  const routes = (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<HomePage />} />
      <Route path="/tools/:slug" element={<ToolPage />} />
      <Route path="/legal" element={<LegalPage />} />
      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  )

  return <Layout>{routes}</Layout>
}
