import React from 'react'
import { IconGuitar } from '@alltools/ui'

export const metadata = {
  slug: 'guitar-tuner',
  name: {
    en: 'Guitar Tuner',
    pl: 'Tuner Gitarowy',
  },
  description: {
    en: 'Accurate chromatic and guitar tuner with real-time frequency analysis & reference tones.',
    pl: 'Precyzyjny tuner chromatyczny i gitarowy z analizą częstotliwości w czasie rzeczywistym.',
  },
  icon: <IconGuitar size={24} strokeWidth={1.5} />,
  category: 'audio' as const,
  tags: {
    en: ['tuner', 'guitar', 'pitch', 'audio', 'chromatic', 'instrument'],
    pl: ['tuner', 'gitara', 'dźwięk', 'audio', 'chromatyczny', 'instrument'],
  },
}
