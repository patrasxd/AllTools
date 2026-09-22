import React from 'react'
import { StopwatchIcon } from '@all/ui'

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
  icon: <StopwatchIcon width="24" height="24" strokeWidth="1.5" />,
  category: 'productivity' as const,
  tags: {
    en: ['Timer', 'Productivity'],
    pl: ['Timer', 'Produktywność'],
  },
}
