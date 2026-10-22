import { describe, it, expect } from 'vitest'
import {
  LANGUAGES,
  PLAIN_TEXT_ID,
  defaultExtension,
  detectLanguage,
  getLanguage,
  isKnownLanguage,
  languageForExtension,
  loadLanguageExtension,
} from '../languages'

describe('language registry', () => {
  it('has unique ids and no extension claimed twice', () => {
    const ids = LANGUAGES.map((lang) => lang.id)
    expect(new Set(ids).size).toBe(ids.length)
    const extensions = LANGUAGES.flatMap((lang) => lang.extensions)
    expect(new Set(extensions).size).toBe(extensions.length)
  })

  it('detects languages from file names', () => {
    expect(detectLanguage('main.ts')).toBe('typescript')
    expect(detectLanguage('App.TSX')).toBe('typescript')
    expect(detectLanguage('script.mjs')).toBe('javascript')
    expect(detectLanguage('data.json')).toBe('json')
    expect(detectLanguage('README.md')).toBe('markdown')
    expect(detectLanguage('query.sql')).toBe('sql')
    expect(detectLanguage('Program.cs')).toBe('csharp')
    expect(detectLanguage('archive.tar.sh')).toBe('shell')
  })

  it('uses plain text when there is no usable extension', () => {
    expect(detectLanguage('Makefile')).toBe(PLAIN_TEXT_ID)
    expect(detectLanguage('file.')).toBe(PLAIN_TEXT_ID)
    expect(detectLanguage('file.unknown')).toBe(PLAIN_TEXT_ID)
    expect(detectLanguage('')).toBe(PLAIN_TEXT_ID)
  })

  it('resolves unknown ids to plain text', () => {
    expect(getLanguage('nope').id).toBe(PLAIN_TEXT_ID)
    expect(isKnownLanguage('nope')).toBe(false)
    expect(isKnownLanguage('python')).toBe(true)
  })

  it('exposes a default extension for each language', () => {
    expect(defaultExtension('typescript')).toBe('ts')
    expect(defaultExtension(PLAIN_TEXT_ID)).toBe('txt')
  })

  it('knows which language an extension belongs to', () => {
    expect(languageForExtension('java')).toBe('java')
    expect(languageForExtension('JSX')).toBe('javascript')
    expect(languageForExtension('txt')).toBe(PLAIN_TEXT_ID)
    expect(languageForExtension('weird')).toBeUndefined()
  })

  it('picks a sensible default extension for every language', () => {
    const defaults = Object.fromEntries(LANGUAGES.map((lang) => [lang.id, defaultExtension(lang.id)]))
    expect(defaults).toMatchObject({
      plaintext: 'txt',
      javascript: 'js',
      typescript: 'ts',
      json: 'json',
      html: 'html',
      css: 'css',
      markdown: 'md',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      csharp: 'cs',
      go: 'go',
      rust: 'rs',
      php: 'php',
      sql: 'sql',
      yaml: 'yaml',
      xml: 'xml',
      shell: 'sh',
    })
    // choosing a language and then detecting it from the new name gives the same language back
    for (const lang of LANGUAGES) expect(detectLanguage(`file.${defaultExtension(lang.id)}`)).toBe(lang.id)
  })

  it('loads the grammar of every language', async () => {
    for (const lang of LANGUAGES) {
      await expect(loadLanguageExtension(lang.id)).resolves.toBeDefined()
    }
  })

  it('returns the same promise for repeated loads of one language', () => {
    expect(loadLanguageExtension('json')).toBe(loadLanguageExtension('json'))
  })
})
