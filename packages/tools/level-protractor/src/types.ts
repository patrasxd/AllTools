import type { ReactNode } from 'react'

export type Locale = 'en' | 'pl'

export type LevelProtractorTab = 'level' | 'protractor' | 'compass'

export type LevelViewMode = 'auto' | 'surface' | 'edge'

export interface LevelStats {
  pitch: number
  roll: number
  isLevel: boolean
  viewMode?: LevelViewMode
  edgeAngle?: number
  slopePercent?: number
  targetAngle?: number
  isTargetMatch?: boolean
  orientation?: string
}

export interface ProtractorStats {
  angle: number
  rad: number
  supplementary: number
}

export interface CompassStats {
  heading: number
  direction: string
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
