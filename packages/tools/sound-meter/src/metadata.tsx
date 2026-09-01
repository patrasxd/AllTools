import React from 'react'
import { IconVolume } from '@alltools/ui'

export interface ToolMetadata {
  slug: string
  name: {
    en: string
    pl: string
  }
  category: 'audio' | 'measurement' | 'productivity' | 'time'
  description: {
    en: string
    pl: string
  }
  tags: {
    en: string[]
    pl: string[]
  }
  icon: React.ReactNode
  version: string
}

export const metadata: ToolMetadata = {
  slug: 'sound-meter',
  name: {
    en: 'Sound Meter & Decibels',
    pl: 'Decybelomierz & Hałas',
  },
  category: 'audio',
  description: {
    en: 'Real-time noise and sound level meter (dBA/dBZ) with peak tracking, live wave chart, and microphone calibration.',
    pl: 'Miernik natężenia dźwięku i decybelomierz w czasie rzeczywistym (dBA/dBZ) ze śledzeniem szczytów i wykresem.',
  },
  tags: {
    en: ['Decibels', 'Sound', 'Noise', 'Audio', 'Microphone', 'dB', 'Meter'],
    pl: ['Decybele', 'Dźwięk', 'Hałas', 'Audio', 'Mikrofon', 'dB', 'Miernik'],
  },
  icon: <IconVolume size={24} />,
  version: '1.0.0',
}
