import type React from 'react'

export type Locale = 'en' | 'pl'

export interface ToolComponentProps {
  locale?: Locale
  isEink?: boolean
  theme?: string
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

export interface CheckItem {
  id: string
  text: string
  completed: boolean
}

export interface NoteList {
  id: string
  title: string
  category: string
  items: CheckItem[]
}

export type Category = 'shopping' | 'todos' | 'ideas'
