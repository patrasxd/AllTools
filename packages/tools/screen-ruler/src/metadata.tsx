import React from 'react'
import { IconRuler } from '@alltools/ui'

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
  icon: <IconRuler size={24} strokeWidth={1.5} />,
  category: 'measurement' as const,
  tags: {
    en: ['ruler', 'caliper', 'measure', 'scale', 'inch', 'millimeter', 'card'],
    pl: ['linijka', 'suwmiarka', 'pomiar', 'skala', 'centymetr', 'milimetr', 'karta'],
  },
}
