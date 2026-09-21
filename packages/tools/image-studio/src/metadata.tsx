import React from 'react'
import { PhotoIcon } from '@all/ui'

export const metadata = {
  slug: 'image-studio',
  name: {
    en: 'Image Studio & Converter',
    pl: 'Edytor Zdjęć & Konwerter',
  },
  description: {
    en: 'Watermark, aspect ratio crop (ID/Passport), format converter (HEIC/JPG/PNG/WebP), and smart size compression.',
    pl: 'Znak wodny po przekątnej, kadrowanie do dowodu/paszportu, konwersja (HEIC/JPG/PNG/WebP) i kompresja wagi.',
  },
  icon: <PhotoIcon width={24} height={24} strokeWidth={1.5} />,
  category: 'media' as const,
  tags: {
    en: ['Photo', 'Converter'],
    pl: ['Zdjęcia', 'Konwerter'],
  },
}
