import { describe, it, expect } from 'vitest'
import { MARKDOWN_COMMANDS, type EditResult, type MarkdownCommandId } from '../utils/markdownCommands'

/**
 * Applies a command to `text` with the selection written as «...» and shows the result the same way.
 * (Square brackets are not usable as markers: Markdown links and task lists need them.)
 */
function run(id: MarkdownCommandId, marked: string): string {
  const from = marked.indexOf('«')
  const to = marked.indexOf('»') - 1
  const text = marked.replace('«', '').replace('»', '')
  const result: EditResult = MARKDOWN_COMMANDS[id]({ text, from, to })
  const next = text.slice(0, result.from) + result.insert + text.slice(result.to)
  return `${next.slice(0, result.selectFrom)}«${next.slice(result.selectFrom, result.selectTo)}»${next.slice(result.selectTo)}`
}

describe('inline commands', () => {
  it('wraps the selection and keeps it selected', () => {
    expect(run('bold', 'say «hello» now')).toBe('say **«hello»** now')
    expect(run('italic', 'say «hello» now')).toBe('say *«hello»* now')
    expect(run('strike', '«old»')).toBe('~~«old»~~')
    expect(run('code', 'use «npm» here')).toBe('use `«npm»` here')
  })

  it('inserts a placeholder when nothing is selected', () => {
    expect(run('bold', 'a «» b')).toBe('a **«bold text»** b')
    expect(run('code', '«»')).toBe('`«code»`')
  })

  it('toggles off when the markers surround the selection', () => {
    expect(run('bold', 'say **«hello»** now')).toBe('say «hello» now')
    expect(run('italic', '*«x»*')).toBe('«x»')
  })

  it('toggles off when the selection includes the markers', () => {
    expect(run('bold', 'say «**hello**» now')).toBe('say «hello» now')
  })

  it('does not treat bold markers as italic markers', () => {
    expect(run('italic', '**«bold»**')).toBe('***«bold»***')
    expect(run('italic', '«**bold**»')).toBe('*«**bold**»*')
  })
})

describe('line commands', () => {
  it('turns lines into headings and removes the heading again', () => {
    expect(run('h2', '«title»')).toBe('«## title»')
    expect(run('h2', '«## title»')).toBe('«title»')
  })

  it('replaces a different heading level', () => {
    expect(run('h1', '«### title»')).toBe('«# title»')
    expect(run('h3', '«# title»')).toBe('«### title»')
  })

  it('works on the line containing the caret', () => {
    expect(run('h1', 'one\ntw«»o\nthree')).toBe('one\n«# two»\nthree')
  })

  it('formats every selected line and skips blank lines', () => {
    expect(run('bullet', '«a\n\nb»')).toBe('«- a\n\n- b»')
    expect(run('quote', '«a\nb»')).toBe('«> a\n> b»')
  })

  it('numbers ordered lists sequentially', () => {
    expect(run('numbered', '«a\nb\nc»')).toBe('«1. a\n2. b\n3. c»')
  })

  it('toggles lists off when every line already has the prefix', () => {
    expect(run('bullet', '«- a\n- b»')).toBe('«a\nb»')
    expect(run('numbered', '«1. a\n2. b»')).toBe('«a\nb»')
    expect(run('task', '«- [ ] a\n- [x] b»')).toBe('«a\nb»')
    expect(run('quote', '«> a\n> b»')).toBe('«a\nb»')
  })

  it('converts between list kinds instead of stacking prefixes', () => {
    expect(run('numbered', '«- a\n- b»')).toBe('«1. a\n2. b»')
    expect(run('bullet', '«1. a\n2. b»')).toBe('«- a\n- b»')
    expect(run('task', '«- a»')).toBe('«- [ ] a»')
    expect(run('bullet', '«- [ ] a»')).toBe('«- a»')
  })

  it('does not include the next line when the selection ends at a line break', () => {
    expect(run('bullet', '«a\n»b')).toBe('«- a»\nb')
  })
})

describe('insert commands', () => {
  it('creates a link around the selection and selects the address', () => {
    expect(run('link', 'see «docs» page')).toBe('see [docs](«https://») page')
  })

  it('creates an image the same way', () => {
    expect(run('image', '«logo»')).toBe('![logo](«https://»)')
  })

  it('uses a placeholder label when nothing is selected', () => {
    expect(run('link', '«»')).toBe('[link text](«https://»)')
  })

  it('wraps a selection in a fenced code block', () => {
    expect(run('codeBlock', '«x = 1»')).toBe('```\n«x = 1»\n```')
  })

  it('starts the code block on its own line', () => {
    expect(run('codeBlock', 'text «x» more')).toBe('text \n```\n«x»\n```\n more')
  })

  it('inserts a table template and selects the first header', () => {
    const out = run('table', '«»')
    expect(out.startsWith('| «Column 1» | Column 2 | Column 3 |')).toBe(true)
    expect(out).toContain('| --- | --- | --- |')
  })

  it('separates the table from a preceding paragraph', () => {
    expect(run('table', 'intro«»').startsWith('intro\n\n| «Column 1»')).toBe(true)
  })

  it('inserts a horizontal rule with a blank line before it, so the previous line does not become a heading', () => {
    expect(run('rule', 'a\n«»b')).toBe('a\n\n---\n«»b')
    expect(run('rule', 'a«»')).toBe('a\n\n---\n«»')
    expect(run('rule', 'a\n\n«»b')).toBe('a\n\n---\n«»b')
  })
})
