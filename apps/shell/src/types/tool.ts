import React from 'react'

export type Locale = 'en' | 'pl'

export type LocalizedString = string | { en: string; pl: string }
export type LocalizedTags = string[] | { en: string[]; pl: string[] }

export function getLocalizedText(field: LocalizedString, locale: Locale): string {
  if (typeof field === 'string') return field
  return field[locale] ?? field.en ?? ''
}

export function getLocalizedTags(tags: LocalizedTags, locale: Locale): string[] {
  if (Array.isArray(tags)) return tags
  return tags[locale] ?? tags.en ?? []
}

export interface ToolMetadata {
  slug: string
  name: LocalizedString
  description: LocalizedString
  icon: React.ReactNode
  category: 'audio' | 'measurement' | 'productivity' | 'time' | 'utility'
  tags: LocalizedTags
}

export interface ToolComponentProps {
  locale: Locale
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

export interface ToolModule {
  metadata: ToolMetadata
  ToolComponent: React.ComponentType<ToolComponentProps>
}
