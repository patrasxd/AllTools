import React from 'react'
import { IconPaint } from '@alltools/ui'

export const metadata = {
  slug: 'sketch-suite',
  name: {
    en: 'Sketch Suite',
    pl: 'Sketch Suite',
  },
  description: {
    en: 'Retro sketch and drawing suite with shapes, flood fill bucket, clipboard image paste (Ctrl+V) & editing, and custom palettes.',
    pl: 'Pakiet retro do szkicowania i rysowania z kształtami, wiadrem z farbą, wklejaniem/edycją zdjęć (Ctrl+V) i paletą barw.',
  },
  icon: <IconPaint size={24} strokeWidth={1.5} />,
  category: 'media' as const,
  tags: {
    en: ['Drawing', 'Graphics', 'Sketch', 'Canvas'],
    pl: ['Rysowanie', 'Grafika', 'Szkic', 'Płótno'],
  },
}
