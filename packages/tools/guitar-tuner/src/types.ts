import type { ReactNode } from 'react'

export type Locale = 'en' | 'pl'

export type LocalizedText = string | Record<Locale, string>
export type LocalizedTags = string[] | Record<Locale, string[]>

export interface ToolMetadata {
  slug: string
  name: LocalizedText
  description: LocalizedText
  icon: string | ReactNode
  tags: LocalizedTags
}

export type NoiseGateLevel = 'low' | 'medium' | 'high'

export interface ToolComponentProps {
  locale?: Locale
  isEink?: boolean
  theme?: string
  onSave?: (data: unknown) => void
  setHeader?: (content: ReactNode) => void
}

/** Backwards-compatible alias for legacy references */
export type GameComponentProps = ToolComponentProps
