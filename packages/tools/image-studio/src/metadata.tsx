import React from 'react'
import { PhotoIcon } from '@all/ui'

export const metadata = {
  slug: 'image-studio',
  name: {
    en: 'Image Studio & Vectorizer',
    pl: 'Edytor Zdjęć & Wektoryzator',
  },
  description: {
    en: 'Watermark, aspect ratio crop (ID/Passport), format converter (HEIC/JPG/PNG/WebP), smart compression, and raster-to-SVG vectorization.',
    pl: 'Znak wodny po przekątnej, kadrowanie do dowodu/paszportu, konwersja (HEIC/JPG/PNG/WebP), kompresja wagi oraz wektoryzacja do SVG.',
  },
  icon: <PhotoIcon width={24} height={24} strokeWidth={1.5} />,
  category: 'media' as const,
  tags: {
    en: ['Photo', 'Converter', 'Vectorize', 'SVG'],
    pl: ['Zdjęcia', 'Konwerter', 'Wektoryzacja', 'SVG'],
  },
}
