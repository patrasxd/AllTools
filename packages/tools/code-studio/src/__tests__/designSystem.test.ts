import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Keeps Code Studio aligned with the shared design system (AllUI):
 * semantic tokens only, tokens that exist, and shared form controls instead of raw ones.
 */
const SRC = resolve(__dirname, '..')
const ALLUI_SRC = resolve(__dirname, '../../../../../AllUI/src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const sourceFiles = walk(SRC).filter((file) => /\.(css|ts|tsx)$/.test(file) && !file.includes('__tests__'))
const read = (file: string) => readFileSync(file, 'utf8')

describe('design system alignment', () => {
  it('has no color literals in application code', () => {
    const offenders: string[] = []
    for (const file of sourceFiles) {
      read(file)
        .split('\n')
        .forEach((line, index) => {
          if (/#[0-9a-fA-F]{3,8}\b/.test(line) || /\brgba?\(/.test(line) || /\bhsla?\(/.test(line)) {
            offenders.push(`${file.replace(SRC, '')}:${index + 1}: ${line.trim()}`)
          }
        })
    }
    expect(offenders).toEqual([])
  })

  it('only uses design tokens that AllUI defines', () => {
    const defined = new Set<string>()
    for (const file of walk(join(ALLUI_SRC, 'tokens')).filter((f) => f.endsWith('.css'))) {
      for (const match of read(file).matchAll(/^\s*(--all-[a-z0-9-]+)\s*:/gm)) defined.add(match[1])
    }
    expect(defined.size).toBeGreaterThan(20)

    const unknown = new Set<string>()
    for (const file of sourceFiles.filter((f) => f.endsWith('.css'))) {
      for (const match of read(file).matchAll(/var\((--all-[a-z0-9-]+)/g)) {
        if (!defined.has(match[1])) unknown.add(match[1])
      }
    }
    expect([...unknown]).toEqual([])
  })

  it('uses shared controls instead of raw form elements', () => {
    const raw: string[] = []
    for (const file of sourceFiles.filter((f) => f.endsWith('.tsx'))) {
      const lines = read(file).split('\n')
      lines.forEach((line, index) => {
        // The hidden file picker has no shared equivalent; its `type="file"` may sit on a following line.
        const isFilePicker = lines.slice(index, index + 4).some((next) => next.includes('type="file"'))
        if (/<(input|select|textarea)\b/.test(line) && !isFilePicker) raw.push(`${file.replace(SRC, '')}:${index + 1}`)
      })
    }
    expect(raw).toEqual([])
  })

  it('takes shared UI from the public entry point only', () => {
    const deepImports = sourceFiles
      .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
      .filter((file) => /from '@all\/ui\/(?!theme|tokens|templates|icons)/.test(read(file)))
    expect(deepImports).toEqual([])
  })
})
