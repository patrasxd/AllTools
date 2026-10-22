import { PLAIN_TEXT_ID, defaultExtension, detectLanguage, isKnownLanguage, languageForExtension } from '../languages'
import type { DocStats, EditorDoc, EditorSettings, Eol, Ruler, SessionData, TabSize } from '../types'

export const SESSION_STORAGE_KEY = 'alltools:code-studio:v1:session'

/** localStorage is usually capped at ~5 MB (UTF-16), so the persisted session stays well below that. */
export const MAX_SESSION_CHARS = 2_000_000

export const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  wordWrap: false,
  lineNumbers: true,
  tabSize: 2,
  ruler: 80,
  panelOpen: false,
}

export const MIN_FONT_SIZE = 10
export const MAX_FONT_SIZE = 28

const TAB_SIZES: TabSize[] = [2, 4, 8]
export const RULERS: Ruler[] = [0, 80, 100, 120]

// ─── Line endings ───

/** Converts any mix of `\r\n`, `\r` and `\n` to `\n`. */
export function normalizeEol(text: string): string {
  return text.replace(/\r\n?/g, '\n')
}

/** Returns `crlf` when most line breaks in the text are `\r\n`, otherwise `lf`. */
export function detectEol(text: string): Eol {
  const crlf = (text.match(/\r\n/g) ?? []).length
  const lf = (text.match(/\n/g) ?? []).length - crlf
  return crlf > lf ? 'crlf' : 'lf'
}

export function applyEol(text: string, eol: Eol): string {
  const normalized = normalizeEol(text)
  return eol === 'crlf' ? normalized.replace(/\n/g, '\r\n') : normalized
}

// ─── File names ───

// eslint-disable-next-line no-control-regex
const FORBIDDEN_NAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g

export function sanitizeFileName(name: string, fallback = 'untitled.txt'): string {
  const cleaned = name.replace(FORBIDDEN_NAME_CHARS, '').trim().replace(/^\.+$/, '')
  return cleaned || fallback
}

export function getExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** Returns `name`, or `name (2)`, `name (3)`... when another tab already uses it. */
export function uniqueName(docs: EditorDoc[], name: string, ignoreId?: string): string {
  const taken = new Set(docs.filter((doc) => doc.id !== ignoreId).map((doc) => doc.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const ext = dot > 0 ? name.slice(dot) : ''
  for (let i = 2; ; i++) {
    const candidate = `${base} (${i})${ext}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}

export function nextUntitledName(docs: EditorDoc[], extension = 'txt'): string {
  const taken = new Set(docs.map((doc) => doc.name.toLowerCase()))
  for (let i = 1; ; i++) {
    const candidate = `untitled-${i}.${extension}`
    if (!taken.has(candidate)) return candidate
  }
}

const MIME_BY_EXTENSION: Record<string, string> = {
  json: 'application/json',
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  mjs: 'text/javascript',
  xml: 'application/xml',
  svg: 'image/svg+xml',
  md: 'text/markdown',
  yml: 'application/yaml',
  yaml: 'application/yaml',
}

export function getMimeType(fileName: string): string {
  return `${MIME_BY_EXTENSION[getExtension(fileName)] ?? 'text/plain'};charset=utf-8`
}

// ─── Documents ───

let idCounter = 0
export function createId(): string {
  idCounter += 1
  return `doc-${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

export function createDoc(
  docs: EditorDoc[],
  init: Partial<EditorDoc> = {},
  idFactory: () => string = createId,
): EditorDoc {
  const name = uniqueName(docs, sanitizeFileName(init.name ?? nextUntitledName(docs)))
  const content = normalizeEol(init.content ?? '')
  return {
    id: init.id ?? idFactory(),
    name,
    language: init.language && isKnownLanguage(init.language) ? init.language : detectLanguage(name),
    content,
    eol: init.eol ?? 'lf',
  }
}

/** Builds a document from an imported file, keeping its line ending style for a faithful export. */
export function createDocFromFile(docs: EditorDoc[], fileName: string, rawText: string): EditorDoc {
  return createDoc(docs, { name: fileName, content: rawText, eol: detectEol(rawText) })
}

export function renameDoc(docs: EditorDoc[], id: string, newName: string): EditorDoc[] {
  return docs.map((doc) => {
    if (doc.id !== id) return doc
    const name = uniqueName(docs, sanitizeFileName(newName, doc.name), id)
    const detected = detectLanguage(name)
    return { ...doc, name, language: detected === PLAIN_TEXT_ID ? doc.language : detected }
  })
}

/**
 * Chooses the file name a document gets when its language is changed by hand.
 * The extension follows the language when it currently belongs to a different language (`untitled-1.txt` becomes
 * `untitled-1.java`). It is kept when it already fits the language (`App.jsx` stays for JavaScript), and files
 * without an extension or with one the editor does not know are left alone, so a custom name is never overwritten.
 */
export function nameForLanguage(docs: EditorDoc[], doc: EditorDoc, language: string): string {
  const dot = doc.name.lastIndexOf('.')
  if (dot <= 0) return doc.name
  const current = languageForExtension(doc.name.slice(dot + 1))
  if (current === undefined || current === language) return doc.name
  return uniqueName(docs, `${doc.name.slice(0, dot)}.${defaultExtension(language)}`, doc.id)
}

/** Switches a document to another language and updates its extension accordingly (see `nameForLanguage`). */
export function setDocLanguage(docs: EditorDoc[], id: string, language: string): EditorDoc[] {
  if (!isKnownLanguage(language)) return docs
  return docs.map((doc) => (doc.id === id ? { ...doc, language, name: nameForLanguage(docs, doc, language) } : doc))
}

export function updateDoc(docs: EditorDoc[], id: string, patch: Partial<Omit<EditorDoc, 'id'>>): EditorDoc[] {
  return docs.map((doc) => (doc.id === id ? { ...doc, ...patch } : doc))
}

/** Removes a tab and tells which tab should become active. The workspace never ends up without a tab. */
export function removeDoc(
  docs: EditorDoc[],
  activeId: string,
  id: string,
  idFactory: () => string = createId,
): { docs: EditorDoc[]; activeId: string } {
  const index = docs.findIndex((doc) => doc.id === id)
  if (index === -1) return { docs, activeId }
  const remaining = docs.filter((doc) => doc.id !== id)
  if (remaining.length === 0) {
    const fresh = createDoc([], {}, idFactory)
    return { docs: [fresh], activeId: fresh.id }
  }
  if (activeId !== id) return { docs: remaining, activeId }
  return { docs: remaining, activeId: remaining[Math.min(index, remaining.length - 1)].id }
}

export function docStats(text: string): DocStats {
  const chars = text.length
  const lines = text.length === 0 ? 1 : text.split('\n').length
  const trimmed = text.trim()
  const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length
  const bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(text).length : chars
  return { lines, words, chars, bytes }
}

export function positionToLineCol(text: string, position: number): { line: number; col: number } {
  const clamped = Math.max(0, Math.min(position, text.length))
  const before = text.slice(0, clamped)
  const line = before.split('\n').length
  const col = clamped - (before.lastIndexOf('\n') + 1) + 1
  return { line, col }
}

// ─── Settings & session ───

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function sanitizeSettings(input: unknown): EditorSettings {
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<EditorSettings>
  const fontSize =
    typeof raw.fontSize === 'number' && Number.isFinite(raw.fontSize) ? raw.fontSize : DEFAULT_SETTINGS.fontSize
  return {
    fontSize: clamp(Math.round(fontSize), MIN_FONT_SIZE, MAX_FONT_SIZE),
    wordWrap: typeof raw.wordWrap === 'boolean' ? raw.wordWrap : DEFAULT_SETTINGS.wordWrap,
    lineNumbers: typeof raw.lineNumbers === 'boolean' ? raw.lineNumbers : DEFAULT_SETTINGS.lineNumbers,
    tabSize: TAB_SIZES.includes(raw.tabSize as TabSize) ? (raw.tabSize as TabSize) : DEFAULT_SETTINGS.tabSize,
    ruler: RULERS.includes(raw.ruler as Ruler) ? (raw.ruler as Ruler) : DEFAULT_SETTINGS.ruler,
    panelOpen: typeof raw.panelOpen === 'boolean' ? raw.panelOpen : DEFAULT_SETTINGS.panelOpen,
  }
}

export function createDefaultSession(idFactory: () => string = createId): SessionData {
  const doc = createDoc([], {}, idFactory)
  return { version: 1, docs: [doc], activeId: doc.id, settings: { ...DEFAULT_SETTINGS } }
}

function isDocLike(value: unknown): value is EditorDoc {
  if (!value || typeof value !== 'object') return false
  const doc = value as Record<string, unknown>
  return typeof doc.id === 'string' && typeof doc.name === 'string' && typeof doc.content === 'string'
}

/** Restores a saved session. Returns `null` when there is nothing usable, so callers can start fresh. */
export function parseSession(raw: string | null): SessionData | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as Partial<SessionData>
    if (!data || data.version !== 1 || !Array.isArray(data.docs)) return null
    const seen = new Set<string>()
    const docs: EditorDoc[] = []
    for (const candidate of data.docs) {
      if (!isDocLike(candidate) || seen.has(candidate.id)) continue
      seen.add(candidate.id)
      const name = sanitizeFileName(candidate.name)
      docs.push({
        id: candidate.id,
        name,
        language: isKnownLanguage(candidate.language) ? candidate.language : detectLanguage(name),
        content: normalizeEol(candidate.content),
        eol: candidate.eol === 'crlf' ? 'crlf' : 'lf',
      })
    }
    if (docs.length === 0) return null
    const activeId = docs.some((doc) => doc.id === data.activeId) ? (data.activeId as string) : docs[0].id
    return { version: 1, docs, activeId, settings: sanitizeSettings(data.settings) }
  } catch {
    return null
  }
}

export function sessionSize(session: SessionData): number {
  return session.docs.reduce((total, doc) => total + doc.content.length, 0)
}

/** Serializes the session, or returns `null` when it is too large to keep in localStorage. */
export function serializeSession(session: SessionData): string | null {
  if (sessionSize(session) > MAX_SESSION_CHARS) return null
  return JSON.stringify(session)
}
