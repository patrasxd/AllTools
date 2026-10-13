import React from 'react'

import type { Locale, LocalizedText, LocalizedTags } from '@all/ui'
export type { Locale, LocalizedTags } from '@all/ui'
export type LocalizedString = LocalizedText
export { getLocalizedText, getLocalizedTags } from '@all/ui'

export interface ToolMetadata {
  slug: string
  name: LocalizedString
  description: LocalizedString
  icon: React.ReactNode
  category: 'audio' | 'measurement' | 'productivity' | 'time' | 'utility' | 'math' | 'media'
  tags: LocalizedTags
}

export interface ToolComponentProps {
  locale: Locale
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
  isDirty?: boolean
  setIsDirty?: (dirty: boolean) => void
}

export interface ToolModule {
  metadata: ToolMetadata
  ToolComponent: React.ComponentType<ToolComponentProps>
}
