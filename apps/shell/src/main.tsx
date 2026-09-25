import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MotionProvider } from '@all/ui'
import { I18nProvider } from './i18n'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import './styles/index.css'
import App from './App'

function ThemedMotionProvider({ children }: { children: React.ReactNode }) {
  const { isEink } = useTheme()
  return <MotionProvider forcedNone={isEink}>{children}</MotionProvider>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/AllTools/">
      <ThemeProvider>
        <ThemedMotionProvider>
          <I18nProvider>
            <App />
          </I18nProvider>
        </ThemedMotionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
