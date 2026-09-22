import type { ReactNode } from 'react'

export type Locale = 'en' | 'pl'

export type MeasurementUnit = 'cm' | 'inch'

export type CardOrientation = 'landscape' | 'portrait'

export interface CaliperPosition {
  x: number
  y: number
}

export interface WorkspaceDimensions {
  width: number
  height: number
}

export interface MeasurementResult {
  mmX: number
  mmY: number
  cmX: number
  cmY: number
  inX: number
  inY: number
  diagMm: number
  diagCm: number
  diagIn: number
  estimatedDpi: number
}

export interface TickMark {
  mm: number
  coord: number
  isCm: boolean
  isHalfCm: boolean
  tickLength: number
  label?: string
}

export interface ToolComponentProps {
  locale?: Locale
  setHeader?: (content: ReactNode) => void
  isEink?: boolean
  theme?: string
  onSave?: (data: unknown) => void
}

/** Backwards-compatible alias for any legacy references */
export type GameComponentProps = ToolComponentProps
