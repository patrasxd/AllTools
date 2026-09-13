import React from 'react'
import { IconFileText } from '@alltools/ui'

export const metadata = {
  slug: 'pdf-suite',
  name: {
    en: 'PDF Manager & Tools',
    pl: 'Menedżer PDF & Narzędzia',
  },
  description: {
    en: '100% offline & private PDF suite: merge multiple PDFs, extract/split pages, rotate, reorder, and convert images to PDF.',
    pl: 'Bezpieczny menedżer PDF w 100% offline: łącz pliki PDF, dziel/wyciągaj strony, obracaj, usuwaj i twórz PDF ze zdjęć.',
  },
  icon: <IconFileText size={24} strokeWidth={1.5} />,
  category: 'utility' as const,
  tags: {
    en: ['Documents', 'Converter'],
    pl: ['Dokumenty', 'Konwerter'],
  },
}
