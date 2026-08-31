import React from 'react'
import { IconCalculator } from '@alltools/ui'

export const metadata = {
  slug: 'calc-converter',
  name: {
    en: 'Calculator & Converter',
    pl: 'Kalkulator & Konwerter',
  },
  description: {
    en: 'Smart calculator and converter for cooking, fitness, travel, and digital data.',
    pl: 'Kalkulator i przelicznik miar, wag, kuchni, podróży oraz danych cyfrowych.',
  },
  icon: <IconCalculator size={24} strokeWidth={1.5} />,
  category: 'math' as const,
  tags: {
    en: ['calculator', 'converter', 'units', 'weight', 'kitchen', 'travel', 'knots', 'bits', 'hex', 'psi', 'mpg'],
    pl: ['kalkulator', 'konwerter', 'przelicznik', 'jednostki', 'waga', 'kuchnia', 'podroze', 'wezly', 'bity', 'hex', 'psi', 'mpg'],
  },
}
