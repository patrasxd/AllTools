import type React from 'react'

export type Locale = 'en' | 'pl'

export interface ToolComponentProps {
  locale?: Locale
  isEink?: boolean
  theme?: string
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

/** Line ending style used when a document is exported. The editor itself always works with `\n`. */
export type Eol = 'lf' | 'crlf'

export interface EditorDoc {
  id: string
  /** File name including the extension, e.g. `main.ts`. Also used as the export file name. */
  name: string
  /** Language id from the registry in `languages.ts`. */
  language: string
  /** Document text, normalized to `\n` line endings. */
  content: string
  eol: Eol
}

export type TabSize = 2 | 4 | 8

export interface EditorSettings {
  fontSize: number
  wordWrap: boolean
  lineNumbers: boolean
  tabSize: TabSize
}

export interface SessionData {
  version: 1
  docs: EditorDoc[]
  activeId: string
  settings: EditorSettings
}

export interface DocStats {
  lines: number
  words: number
  chars: number
  bytes: number
}

export interface CursorInfo {
  line: number
  col: number
  selectedChars: number
}

export type ProblemSeverity = 'error' | 'warning'

/** A problem found in the document, expressed as document offsets plus a human readable position. */
export interface Problem {
  from: number
  to: number
  line: number
  col: number
  severity: ProblemSeverity
  message: string
}

export type SideTab = 'problems' | 'preview' | 'image'
