import type React from 'react'

export type Locale = 'en' | 'pl'

export interface ToolComponentProps {
  locale?: Locale
  isEink?: boolean
  theme?: string
  onSave?: (data: unknown) => void
  setHeader?: (content: React.ReactNode) => void
}

export interface Lap {
  id: number
  lapTime: number
  totalTime: number
}

export type Mode = 'stopwatch' | 'interval'
export type Phase = 'idle' | 'work' | 'rest' | 'finished'
export type Preset = 'tabata' | 'hiit' | 'pomodoro'

export interface PresetConfig {
  workSec: number
  restSec: number
  setsTotal: number
}

export interface LapsStats {
  bestLapId: number | null
  worstLapId: number | null
  sortedLaps: Lap[]
}
