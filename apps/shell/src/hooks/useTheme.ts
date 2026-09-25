import { createElement, type ReactNode } from 'react'
import { ThemeProvider as UiThemeProvider, useTheme as useUiTheme, type Theme as UiTheme } from '@all/ui'

export type Theme = UiTheme

export function ThemeProvider({ children }: { children: ReactNode }) {
  return createElement(UiThemeProvider, {
    defaultTheme: 'dark',
    storageKey: 'alltools:theme',
    children,
  })
}

export function useTheme() {
  return useUiTheme()
}
