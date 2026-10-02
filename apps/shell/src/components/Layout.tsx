import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AppHeader, clearLastActiveCardId, ConfirmDialog } from '@all/ui'
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
  isDirty: boolean
  setIsDirty: (dirty: boolean) => void
  requestExit: (onConfirmExit: () => void) => void
}

const ToolHeaderContext = createContext<ToolHeaderContextValue>({
  headerExtra: null,
  setHeaderExtra: () => {},
  isDirty: false,
  setIsDirty: () => {},
  requestExit: (action) => action(),
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
  const [isDirty, setIsDirty] = useState<boolean>(false)
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false)
  const [pendingExitAction, setPendingExitAction] = useState<(() => void) | null>(null)

  const requestExit = useCallback(
    (onConfirmExit: () => void) => {
      if (isDirty) {
        setPendingExitAction(() => onConfirmExit)
        setShowExitConfirm(true)
      } else {
        onConfirmExit()
      }
    },
    [isDirty],
  )

  useEffect(() => {
    setHeaderExtra(null)
    setIsDirty(false)
    setShowExitConfirm(false)
    setPendingExitAction(null)
    // Only force scroll-to-top when navigating into a tool or legal subpage.
    // When navigating to home ('/'), allow useCardScrollRestoration to position the last active card.
    if (location.pathname !== '/') {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      if (document.documentElement) {
        document.documentElement.scrollTop = 0
      }
    }
  }, [location.pathname])

  // Guard against browser refresh / tab close when dirty
  useEffect(() => {
    if (!isDirty) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isDirty])

  // Guard against browser back button (popstate) when dirty
  useEffect(() => {
    if (!isDirty) return

    window.history.pushState({ allToolsExitGuard: true }, '')

    const handlePopState = () => {
      if (isDirty) {
        window.history.pushState({ allToolsExitGuard: true }, '')
        requestExit(() => {
          setIsDirty(false)
          navigate('/')
        })
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [isDirty, requestExit, navigate])

  const slug = location.pathname.match(/^\/tools\/([^/]+)/)?.[1]
  const tool = slug ? TOOLS_METADATA.find((item) => item.slug === slug) : undefined
  const toolTitle = tool ? getLocalizedText(tool.name, locale) : ''
  const isToolPage = Boolean(tool)

  return (
    <ToolHeaderContext.Provider value={{ headerExtra, setHeaderExtra, isDirty, setIsDirty, requestExit }}>
      <AppHeader
        logo={
          <button
            type="button"
            className="header-logo"
            onClick={() => {
              requestExit(() => {
                clearLastActiveCardId()
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
                navigate('/')
              })
            }}
            aria-label={t.backToHomeAria}
          >
            <span>AllTools</span>
          </button>
        }
        title={isToolPage ? toolTitle : undefined}
        actions={isToolPage && headerExtra ? headerExtra : undefined}
        menu={<HeaderMenu />}
      />

      <main className="app-main">{children}</main>

      <ConfirmDialog
        open={showExitConfirm}
        title={t.exitConfirmTitle}
        description={t.exitConfirmDesc}
        confirmLabel={t.exitConfirmLeave}
        cancelLabel={t.exitConfirmStay}
        confirmVariant="danger"
        confirmId="confirm-exit-btn"
        cancelId="cancel-exit-btn"
        onConfirm={() => {
          setShowExitConfirm(false)
          setIsDirty(false)
          if (pendingExitAction) {
            pendingExitAction()
            setPendingExitAction(null)
          }
        }}
        onCancel={() => {
          setShowExitConfirm(false)
          setPendingExitAction(null)
        }}
        onClose={() => {
          setShowExitConfirm(false)
          setPendingExitAction(null)
        }}
      />
    </ToolHeaderContext.Provider>
  )
}
