import React from 'react'
import { CodeIcon } from '@all/ui'

export const metadata = {
  slug: 'code-studio',
  name: {
    en: 'Code Studio',
    pl: 'Code Studio',
  },
  description: {
    en: 'Offline multi-tab code and text editor with syntax highlighting for many languages, find & replace, syntax error underlining, and export to any file extension.',
    pl: 'Edytor kodu i tekstu offline z zakładkami, kolorowaniem składni wielu języków, wyszukiwaniem i zamianą, podkreślaniem błędów składni oraz eksportem do dowolnego rozszerzenia.',
  },
  icon: <CodeIcon width="24" height="24" strokeWidth="1.5" />,
  category: 'utility' as const,
  tags: {
    en: ['Developer', 'Productivity'],
    pl: ['Developer', 'Produktywność'],
  },
}
