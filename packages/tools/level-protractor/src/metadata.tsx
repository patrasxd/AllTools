import React from 'react'
import { IconProtractor } from '@alltools/ui'

export const metadata = {
  slug: 'level-protractor',
  name: {
    en: 'Level, Protractor & Compass',
    pl: 'Poziomica, Kątomierz & Kompas',
  },
  description: {
    en: '2D surface bubble level, rotational angle protractor, and digital magnetic compass.',
    pl: 'Poziomica 2D z czujnikami orientacji, kątomierz obrotowy oraz cyfrowy kompas magnetyczny.',
  },
  icon: <IconProtractor size={24} strokeWidth={1.5} />,
  category: 'measurement' as const,
  tags: {
    en: ['level', 'protractor', 'compass', 'angle', 'heading', 'measure', 'sensor'],
    pl: ['poziomica', 'kątomierz', 'kompas', 'kąt', 'azymut', 'pomiary', 'czujnik'],
  },
}
