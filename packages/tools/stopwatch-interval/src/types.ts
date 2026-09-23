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
export type Preset = 'tabata' | 'hiit' | 'pomodoro' | 'custom'

export interface PresetConfig {
  workSec: number
  restSec: number
  setsTotal: number
}

export interface IntervalStep {
  id: string
  name?: string
  cycles: number // e.g. 2 in 2 x 8
  sets: number   // e.g. 8 in 2 x 8
  workSec: number
  restSec: number
}

export interface LapsStats {
  bestLapId: number | null
  worstLapId: number | null
  sortedLaps: Lap[]
}
