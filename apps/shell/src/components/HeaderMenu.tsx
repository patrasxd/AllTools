import { HeaderMenu as UiHeaderMenu } from '@all/ui'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'
import { usePWAInstall } from '../hooks/usePWAInstall'

export function HeaderMenu() {
  const { theme, setTheme, isEink, isDark } = useTheme()
  const { locale, setLocale } = useI18n()
  const { canInstall, install } = usePWAInstall()

  return (
    <UiHeaderMenu
      locale={locale}
      onLocaleChange={(loc) => setLocale(loc as Parameters<typeof setLocale>[0])}
      theme={theme}
      onThemeChange={(th) => setTheme(th as Parameters<typeof setTheme>[0])}
      isEink={isEink}
      onEinkChange={(enable) => setTheme(enable ? (isDark ? 'e-ink-dark' : 'e-ink-light') : isDark ? 'dark' : 'light')}
      canInstall={canInstall}
      onInstall={() => {
        void install()
      }}
    />
  )
}
export default HeaderMenu
