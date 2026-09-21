import React from 'react'
import { IconFileText } from '@alltools/ui'

export const metadata = {
  slug: 'pdf-suite',
  name: {
    en: 'PDF Manager & Tools',
    pl: 'Menedżer PDF & Narzędzia',
  },
  description: {
    en: 'Merge PDFs, organize & rotate pages, digital signature, and convert images to PDF.',
    pl: 'Łączenie PDF, organizacja i obracanie stron, podpis cyfrowy oraz konwersja zdjęć do PDF.',
  },
  icon: <IconFileText size={24} strokeWidth={1.5} />,
  category: 'utility' as const,
  tags: {
    en: ['Documents', 'Converter'],
    pl: ['Dokumenty', 'Konwerter'],
  },
}
