export type SoundMeterMode = 'meter' | 'chart' | 'settings'

export type SoundWeighting = 'dBA' | 'dBZ' // A-weighted or flat Z-weighted

export interface SoundStats {
  currentDb: number
  minDb: number
  avgDb: number
  maxDb: number
  peakDb: number
}

export interface SoundReferenceLevel {
  min: number
  max: number
  labelEn: string
  labelPl: string
  severity: 'calm' | 'normal' | 'loud' | 'warning' | 'danger'
}
