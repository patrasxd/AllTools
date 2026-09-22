import React from 'react'
import { RulerIcon } from '@all/ui'

export const metadata = {
  slug: 'screen-ruler',
  name: {
    en: 'Screen Ruler & Caliper',
    pl: 'Linijka & Suwmiarka',
  },
  description: {
    en: 'Accurate on-screen millimeter & inch ruler calibrated with a standard credit or ID card.',
    pl: 'Dokładna linijka i suwmiarka ekranowa (mm, cm, cale) kalibrowana kartą płatniczą lub dowodem.',
  },
  icon: <RulerIcon width={24} height={24} strokeWidth={1.5} />,
  category: 'measurement' as const,
  tags: {
    en: ['Measurement'],
    pl: ['Pomiar'],
  },
}
