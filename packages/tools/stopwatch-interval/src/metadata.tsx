import React from 'react'
import { IconStopwatch } from '@alltools/ui'

export const metadata = {
  slug: 'stopwatch-interval',
  name: {
    en: 'Stopwatch & Intervals',
    pl: 'Stoper & Interwały',
  },
  description: {
    en: 'Precision stopwatch with laps and interval timer for HIIT, Tabata, and Pomodoro with audio cues.',
    pl: 'Precyzyjny stoper z okrążeniami oraz minutnik interwałowy do HIIT, Tabaty i Pomodoro z dźwiękami.',
  },
  icon: <IconStopwatch size={24} strokeWidth={1.5} />,
  category: 'productivity' as const,
  tags: {
    en: ['stopwatch', 'timer', 'intervals', 'hiit', 'tabata', 'pomodoro', 'laps'],
    pl: ['stoper', 'minutnik', 'interwały', 'hiit', 'tabata', 'pomodoro', 'okrążenia'],
  },
}
