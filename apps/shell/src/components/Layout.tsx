import { createContext, useContext, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader } from '@all/ui'
import { HeaderMenu } from './HeaderMenu'
import { useI18n } from '../i18n'
import { TOOLS_METADATA } from '../tools/registry'
import { getLocalizedText } from '../types/tool'

interface LayoutProps {
  children: React.ReactNode
}

interface ToolHeaderContextValue {
  headerExtra: React.ReactNode
  setHeaderExtra: (content: React.ReactNode) => void
}

const ToolHeaderContext = createContext<ToolHeaderContextValue>({
  headerExtra: null,
  setHeaderExtra: () => undefined,
})

export function useToolHeader() {
  return useContext(ToolHeaderContext)
}

/**
 * Global application layout containing top navigation bar and dynamic content area.
 */
export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, locale } = useI18n()
  const [headerExtra, setHeaderExtra] = useState<React.ReactNode>(null)

  const slug = location.pathname.match(/^\/tools\/([^/]+)/)?.[1]
  const tool = slug ? TOOLS_METADATA.find(item => item.slug === slug) : undefined
  const toolTitle = tool ? getLocalizedText(tool.name, locale) : ''
  const isToolPage = Boolean(tool)

  return (
    <ToolHeaderContext.Provider value={{ headerExtra, setHeaderExtra }}>
      <AppHeader
        logo={
          <button
            type="button"
            className="header-logo"
            onClick={() => navigate('/')}
            aria-label={t.backToHomeAria}
          >
            <span>AllTools</span>
          </button>
        }
        title={isToolPage ? toolTitle : undefined}
        actions={isToolPage && headerExtra ? headerExtra : undefined}
        menu={<HeaderMenu />}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {children}
      </main>
    </ToolHeaderContext.Provider>
  )
}
