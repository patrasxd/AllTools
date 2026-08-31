import React from 'react'
import { IconPhoto } from '@alltools/ui'

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
  icon: <IconPhoto size={24} strokeWidth={1.5} />,
  category: 'media' as const,
  tags: {
    en: ['image', 'photo', 'watermark', 'converter', 'heic', 'compress', 'crop', 'passport', 'resize'],
    pl: ['zdjęcie', 'obraz', 'znak wodny', 'konwerter', 'heic', 'kompresja', 'kadrowanie', 'dowód', 'paszport', 'rozmiar'],
  },
}
