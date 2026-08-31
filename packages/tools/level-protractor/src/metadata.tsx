import React from 'react'
import { IconProtractor } from '@alltools/ui'

export const metadata = {
  slug: 'level-protractor',
  name: {
    en: 'Level & Protractor',
    pl: 'Poziomica & Kątomierz',
  },
  description: {
    en: '2D surface bubble level, tubular spirit level, and rotational angle protractor with camera overlay.',
    pl: 'Poziomica 2D i rurkowa z czujnikami orientacji oraz precyzyjny kątomierz obrotowy.',
  },
  icon: <IconProtractor size={24} strokeWidth={1.5} />,
  category: 'measurement' as const,
  tags: {
    en: ['level', 'protractor', 'angle', 'measure', 'sensor'],
    pl: ['poziomica', 'kątomierz', 'kąt', 'pomiary', 'czujnik'],
  },
}
