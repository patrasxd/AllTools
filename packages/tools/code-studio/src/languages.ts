import { StreamLanguage, type StreamParser } from '@codemirror/language'
import type { Extension } from '@codemirror/state'

export interface LanguageDef {
  id: string
  label: string
  /** Lower-case file extensions without the dot. */
  extensions: string[]
  /** Lazy loader, so every grammar lands in its own chunk. Plain text has none. */
  load?: () => Promise<Extension>
}

const legacy = async (load: () => Promise<StreamParser<unknown>>): Promise<Extension> =>
  StreamLanguage.define(await load())

export const PLAIN_TEXT_ID = 'plaintext'

export const LANGUAGES: LanguageDef[] = [
  { id: PLAIN_TEXT_ID, label: 'Plain text', extensions: ['txt', 'text', 'log', 'ini', 'cfg', 'conf', 'env'] },
  {
    id: 'javascript',
    label: 'JavaScript',
    extensions: ['js', 'mjs', 'cjs', 'jsx'],
    load: async () => (await import('@codemirror/lang-javascript')).javascript({ jsx: true }),
  },
  {
    id: 'typescript',
    label: 'TypeScript',
    extensions: ['ts', 'mts', 'cts', 'tsx'],
    load: async () => (await import('@codemirror/lang-javascript')).javascript({ jsx: true, typescript: true }),
  },
  {
    id: 'json',
    label: 'JSON',
    extensions: ['json', 'jsonc', 'webmanifest', 'map'],
    load: async () => (await import('@codemirror/lang-json')).json(),
  },
  {
    id: 'html',
    label: 'HTML',
    extensions: ['html', 'htm', 'xhtml', 'vue'],
    load: async () => (await import('@codemirror/lang-html')).html(),
  },
  {
    id: 'css',
    label: 'CSS',
    extensions: ['css', 'scss', 'less'],
    load: async () => (await import('@codemirror/lang-css')).css(),
  },
  {
    id: 'markdown',
    label: 'Markdown',
    extensions: ['md', 'markdown', 'mdx'],
    load: async () => (await import('@codemirror/lang-markdown')).markdown(),
  },
  {
    id: 'python',
    label: 'Python',
    extensions: ['py', 'pyw', 'pyi'],
    load: async () => (await import('@codemirror/lang-python')).python(),
  },
  {
    id: 'java',
    label: 'Java',
    extensions: ['java'],
    load: async () => (await import('@codemirror/lang-java')).java(),
  },
  {
    id: 'cpp',
    label: 'C / C++',
    extensions: ['c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hh', 'hxx'],
    load: async () => (await import('@codemirror/lang-cpp')).cpp(),
  },
  {
    id: 'csharp',
    label: 'C#',
    extensions: ['cs', 'csx'],
    load: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/clike')).csharp),
  },
  {
    id: 'go',
    label: 'Go',
    extensions: ['go'],
    load: async () => (await import('@codemirror/lang-go')).go(),
  },
  {
    id: 'rust',
    label: 'Rust',
    extensions: ['rs'],
    load: async () => (await import('@codemirror/lang-rust')).rust(),
  },
  {
    id: 'php',
    label: 'PHP',
    extensions: ['php', 'phtml'],
    load: async () => (await import('@codemirror/lang-php')).php(),
  },
  {
    id: 'sql',
    label: 'SQL',
    extensions: ['sql'],
    load: async () => (await import('@codemirror/lang-sql')).sql(),
  },
  {
    id: 'yaml',
    label: 'YAML',
    extensions: ['yml', 'yaml'],
    load: async () => (await import('@codemirror/lang-yaml')).yaml(),
  },
  {
    id: 'xml',
    label: 'XML',
    extensions: ['xml', 'svg', 'xsd', 'xsl', 'xslt', 'rss', 'plist'],
    load: async () => (await import('@codemirror/lang-xml')).xml(),
  },
  {
    id: 'shell',
    label: 'Shell',
    extensions: ['sh', 'bash', 'zsh'],
    load: () => legacy(async () => (await import('@codemirror/legacy-modes/mode/shell')).shell),
  },
]

const BY_ID = new Map(LANGUAGES.map((lang) => [lang.id, lang]))
const BY_EXTENSION = new Map<string, string>()
for (const lang of LANGUAGES) {
  for (const ext of lang.extensions) BY_EXTENSION.set(ext, lang.id)
}

export function getLanguage(id: string): LanguageDef {
  return BY_ID.get(id) ?? BY_ID.get(PLAIN_TEXT_ID)!
}

export function isKnownLanguage(id: string): boolean {
  return BY_ID.has(id)
}

/** Picks a language from a file name; unknown or missing extensions give plain text. */
export function detectLanguage(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot <= 0 && !fileName.startsWith('.')) return PLAIN_TEXT_ID
  const ext = fileName.slice(dot + 1).toLowerCase()
  return BY_EXTENSION.get(ext) ?? PLAIN_TEXT_ID
}

/** Default extension used when a new document is created for a language. */
export function defaultExtension(languageId: string): string {
  return getLanguage(languageId).extensions[0]
}

const cache = new Map<string, Promise<Extension>>()

/** Loads (once) the CodeMirror extension for a language id. Plain text resolves to an empty extension. */
export function loadLanguageExtension(languageId: string): Promise<Extension> {
  const lang = getLanguage(languageId)
  if (!lang.load) return Promise.resolve([])
  let pending = cache.get(lang.id)
  if (!pending) {
    pending = lang.load().catch((error) => {
      cache.delete(lang.id)
      throw error
    })
    cache.set(lang.id, pending)
  }
  return pending
}
