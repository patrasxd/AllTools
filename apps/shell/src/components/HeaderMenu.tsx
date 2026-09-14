import { HeaderMenu as UiHeaderMenu } from '@all/ui'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'
import { usePWAInstall } from '../hooks/usePWAInstall'

export function HeaderMenu() {
  const { theme, setTheme, isEink, isDark } = useTheme()
  const { locale, setLocale, t } = useI18n()
  const { canInstall, install } = usePWAInstall()

  return (
    <UiHeaderMenu
      locale={locale}
      onLocaleChange={loc => setLocale(loc as any)}
      theme={theme}
      onThemeChange={th => setTheme(th as any)}
      isEink={isEink}
      onEinkChange={enable => setTheme(enable ? (isDark ? 'e-ink-dark' : 'e-ink-light') : (isDark ? 'dark' : 'light'))}
      canInstall={canInstall}
      onInstall={() => { void install() }}
      labels={{
        language: t.language,
        theme: t.theme,
        darkMode: t.darkMode,
        lightMode: t.lightMode,
        einkMode: t.einkMode,
        einkOff: t.einkOff,
        einkOn: t.einkOn,
        installApp: t.installApp,
        preferences: t.preferences,
        menuToggleAria: t.menuToggleAria,
        closeMenuAria: t.closeMenuAria,
      }}
    />
  )
}
export default HeaderMenu
