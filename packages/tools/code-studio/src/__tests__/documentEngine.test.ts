import { describe, it, expect } from 'vitest'
import {
  DEFAULT_SETTINGS,
  MAX_SESSION_CHARS,
  applyEol,
  createDefaultSession,
  createDoc,
  createDocFromFile,
  detectEol,
  docStats,
  getExtension,
  getMimeType,
  nextUntitledName,
  normalizeEol,
  parseSession,
  positionToLineCol,
  removeDoc,
  renameDoc,
  sanitizeFileName,
  sanitizeSettings,
  serializeSession,
  uniqueName,
  updateDoc,
} from '../utils/documentEngine'
import type { EditorDoc } from '../types'

let counter = 0
const nextId = () => `id-${++counter}`

function makeDoc(name: string, content = '', extra: Partial<EditorDoc> = {}): EditorDoc {
  return createDoc([], { name, content, ...extra }, nextId)
}

describe('line endings', () => {
  it('normalizes CRLF and lone CR to LF', () => {
    expect(normalizeEol('a\r\nb\rc\nd')).toBe('a\nb\nc\nd')
  })

  it('detects the dominant line ending', () => {
    expect(detectEol('a\r\nb\r\nc')).toBe('crlf')
    expect(detectEol('a\nb\nc')).toBe('lf')
    expect(detectEol('a\r\nb\nc\nd')).toBe('lf')
    expect(detectEol('no breaks')).toBe('lf')
  })

  it('applies the requested ending without doubling carriage returns', () => {
    expect(applyEol('a\nb', 'crlf')).toBe('a\r\nb')
    expect(applyEol('a\r\nb', 'crlf')).toBe('a\r\nb')
    expect(applyEol('a\r\nb', 'lf')).toBe('a\nb')
  })
})

describe('file names', () => {
  it('strips characters that are not allowed in file names', () => {
    expect(sanitizeFileName('a/b\\c:d*e?.txt')).toBe('abcde.txt')
    expect(sanitizeFileName('   ')).toBe('untitled.txt')
    expect(sanitizeFileName('..')).toBe('untitled.txt')
    expect(sanitizeFileName('', 'fallback.md')).toBe('fallback.md')
  })

  it('reads extensions in lower case', () => {
    expect(getExtension('Main.TS')).toBe('ts')
    expect(getExtension('archive.tar.gz')).toBe('gz')
    expect(getExtension('Makefile')).toBe('')
    expect(getExtension('.gitignore')).toBe('')
  })

  it('keeps names unique across tabs', () => {
    const docs = [makeDoc('a.ts'), makeDoc('a (2).ts')]
    expect(uniqueName(docs, 'b.ts')).toBe('b.ts')
    expect(uniqueName(docs, 'A.ts')).toBe('A (3).ts')
    expect(uniqueName([makeDoc('notes')], 'notes')).toBe('notes (2)')
  })

  it('ignores the renamed tab itself when checking for duplicates', () => {
    const docs = [makeDoc('a.ts', '', { id: 'x' })]
    expect(uniqueName(docs, 'a.ts', 'x')).toBe('a.ts')
  })

  it('numbers untitled documents with the lowest free number', () => {
    const docs = [makeDoc('untitled-1.txt'), makeDoc('untitled-3.txt')]
    expect(nextUntitledName(docs)).toBe('untitled-2.txt')
    expect(nextUntitledName(docs, 'md')).toBe('untitled-1.md')
  })

  it('maps known extensions to a mime type and defaults to text', () => {
    expect(getMimeType('data.json')).toBe('application/json;charset=utf-8')
    expect(getMimeType('page.html')).toBe('text/html;charset=utf-8')
    expect(getMimeType('script.weird')).toBe('text/plain;charset=utf-8')
  })
})

describe('documents', () => {
  it('creates a document with a detected language and normalized content', () => {
    const doc = createDoc([], { name: 'main.py', content: 'print(1)\r\n' }, nextId)
    expect(doc.language).toBe('python')
    expect(doc.content).toBe('print(1)\n')
    expect(doc.eol).toBe('lf')
  })

  it('falls back to plain text for unknown extensions or unknown language ids', () => {
    expect(createDoc([], { name: 'file.unknown' }, nextId).language).toBe('plaintext')
    expect(createDoc([], { name: 'x.ts', language: 'klingon' }, nextId).language).toBe('typescript')
  })

  it('keeps the line ending style of imported files', () => {
    const doc = createDocFromFile([], 'win.txt', 'a\r\nb\r\n')
    expect(doc.eol).toBe('crlf')
    expect(doc.content).toBe('a\nb\n')
  })

  it('renames a document and re-detects its language from the new extension', () => {
    const doc = makeDoc('a.txt', '', { id: 'x' })
    const [renamed] = renameDoc([doc], 'x', 'a.json')
    expect(renamed.name).toBe('a.json')
    expect(renamed.language).toBe('json')
  })

  it('keeps a manually chosen language when the new name has no known extension', () => {
    const doc = makeDoc('a.ts', '', { id: 'x' })
    const [renamed] = renameDoc([doc], 'x', 'Makefile')
    expect(renamed.language).toBe('typescript')
  })

  it('updates only the targeted document', () => {
    const a = makeDoc('a.txt', '', { id: 'a' })
    const b = makeDoc('b.txt', '', { id: 'b' })
    const [first, second] = updateDoc([a, b], 'b', { content: 'changed' })
    expect(first.content).toBe('')
    expect(second.content).toBe('changed')
  })

  it('activates a neighbour when the active tab is closed', () => {
    const docs = [
      makeDoc('a.txt', '', { id: 'a' }),
      makeDoc('b.txt', '', { id: 'b' }),
      makeDoc('c.txt', '', { id: 'c' }),
    ]
    expect(removeDoc(docs, 'b', 'b', nextId).activeId).toBe('c')
    expect(removeDoc(docs, 'c', 'c', nextId).activeId).toBe('b')
    expect(removeDoc(docs, 'a', 'c', nextId).activeId).toBe('a')
  })

  it('never leaves the workspace without a tab', () => {
    const only = makeDoc('a.txt', 'text', { id: 'a' })
    const result = removeDoc([only], 'a', 'a', nextId)
    expect(result.docs).toHaveLength(1)
    expect(result.docs[0].id).not.toBe('a')
    expect(result.docs[0].content).toBe('')
    expect(result.activeId).toBe(result.docs[0].id)
  })

  it('ignores removal of unknown ids', () => {
    const docs = [makeDoc('a.txt', '', { id: 'a' })]
    expect(removeDoc(docs, 'a', 'missing', nextId)).toEqual({ docs, activeId: 'a' })
  })
})

describe('docStats', () => {
  it('counts lines, words, characters and bytes', () => {
    expect(docStats('')).toEqual({ lines: 1, words: 0, chars: 0, bytes: 0 })
    expect(docStats('hello world\nsecond')).toEqual({ lines: 2, words: 3, chars: 18, bytes: 18 })
  })

  it('counts bytes as UTF-8, not UTF-16 units', () => {
    expect(docStats('zażółć').bytes).toBe(10)
    expect(docStats('zażółć').chars).toBe(6)
  })
})

describe('positionToLineCol', () => {
  it('converts offsets to one-based lines and columns', () => {
    const text = 'ab\ncde\nf'
    expect(positionToLineCol(text, 0)).toEqual({ line: 1, col: 1 })
    expect(positionToLineCol(text, 2)).toEqual({ line: 1, col: 3 })
    expect(positionToLineCol(text, 3)).toEqual({ line: 2, col: 1 })
    expect(positionToLineCol(text, 7)).toEqual({ line: 3, col: 1 })
  })

  it('clamps offsets outside the text', () => {
    expect(positionToLineCol('ab', -5)).toEqual({ line: 1, col: 1 })
    expect(positionToLineCol('ab', 99)).toEqual({ line: 1, col: 3 })
  })
})

describe('settings', () => {
  it('falls back to defaults for missing or invalid values', () => {
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(sanitizeSettings({ fontSize: 'big', wordWrap: 'yes', tabSize: 3 })).toEqual(DEFAULT_SETTINGS)
  })

  it('clamps the font size and keeps valid values', () => {
    expect(sanitizeSettings({ fontSize: 2 }).fontSize).toBe(10)
    expect(sanitizeSettings({ fontSize: 99 }).fontSize).toBe(28)
    expect(
      sanitizeSettings({ fontSize: 16.4, wordWrap: true, lineNumbers: false, tabSize: 4, ruler: 100, panelOpen: true }),
    ).toEqual({
      fontSize: 16,
      wordWrap: true,
      lineNumbers: false,
      tabSize: 4,
      ruler: 100,
      panelOpen: true,
    })
  })

  it('accepts only the known ruler columns and defaults to a ruler at 80', () => {
    expect(DEFAULT_SETTINGS.ruler).toBe(80)
    expect(sanitizeSettings({ ruler: 0 }).ruler).toBe(0)
    expect(sanitizeSettings({ ruler: 120 }).ruler).toBe(120)
    expect(sanitizeSettings({ ruler: 77 }).ruler).toBe(80)
    expect(sanitizeSettings({ ruler: '80' }).ruler).toBe(80)
  })

  it('keeps the side panel closed unless asked', () => {
    expect(DEFAULT_SETTINGS.panelOpen).toBe(false)
    expect(sanitizeSettings({ panelOpen: 'yes' }).panelOpen).toBe(false)
    expect(sanitizeSettings({ panelOpen: true }).panelOpen).toBe(true)
  })

  it('upgrades sessions saved before the ruler and panel settings existed', () => {
    const raw = JSON.stringify({
      version: 1,
      activeId: 'a',
      settings: { fontSize: 16, wordWrap: true, lineNumbers: true, tabSize: 4 },
      docs: [{ id: 'a', name: 'a.txt', content: '', language: 'plaintext', eol: 'lf' }],
    })
    expect(parseSession(raw)!.settings).toEqual({ ...DEFAULT_SETTINGS, fontSize: 16, wordWrap: true, tabSize: 4 })
  })
})

describe('session', () => {
  it('round-trips through serialize and parse', () => {
    const session = createDefaultSession(nextId)
    session.docs.push(createDoc(session.docs, { name: 'a.json', content: '{}', eol: 'crlf' }, nextId))
    session.activeId = session.docs[1].id
    const restored = parseSession(serializeSession(session))
    expect(restored).toEqual(session)
  })

  it('rejects empty, corrupt or foreign data', () => {
    expect(parseSession(null)).toBeNull()
    expect(parseSession('')).toBeNull()
    expect(parseSession('{nope')).toBeNull()
    expect(parseSession(JSON.stringify({ version: 2, docs: [] }))).toBeNull()
    expect(parseSession(JSON.stringify({ version: 1, docs: [] }))).toBeNull()
    expect(parseSession(JSON.stringify({ version: 1, docs: [{ id: 1 }] }))).toBeNull()
  })

  it('repairs partially valid data', () => {
    const raw = JSON.stringify({
      version: 1,
      activeId: 'missing',
      settings: { fontSize: 500 },
      docs: [
        { id: 'a', name: 'bad/name.ts', content: 'x\r\ny', language: 'klingon', eol: 'weird' },
        { id: 'a', name: 'duplicate.txt', content: '' },
        { nope: true },
      ],
    })
    const session = parseSession(raw)!
    expect(session.docs).toHaveLength(1)
    expect(session.docs[0]).toEqual({ id: 'a', name: 'badname.ts', content: 'x\ny', language: 'typescript', eol: 'lf' })
    expect(session.activeId).toBe('a')
    expect(session.settings.fontSize).toBe(28)
  })

  it('refuses to serialize sessions that are too large for localStorage', () => {
    const session = createDefaultSession(nextId)
    session.docs[0].content = 'x'.repeat(MAX_SESSION_CHARS + 1)
    expect(serializeSession(session)).toBeNull()
  })
})
