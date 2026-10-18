import { afterEach, describe, expect, it } from 'vitest'
import { TOKEN_CLASSES } from '../utils/imageEngine'
import { THEME_ATTRIBUTE, buildImageTheme, resolveImageTheme } from '../utils/imageTheme'

const resolve = (expression: string) => `<${expression}>`

afterEach(() => {
  document.body.innerHTML = ''
})

describe('buildImageTheme', () => {
  it('builds every color from the shared design tokens', () => {
    const theme = buildImageTheme('dark', resolve)
    expect(theme.background).toBe('<var(--all-surface)>')
    expect(theme.foreground).toBe('<var(--all-text)>')
    expect(theme.lineNumber).toBe('<var(--all-text-dim)>')
    expect(theme.border).toBe('<var(--all-border-2)>')
    expect(theme.chrome).toEqual(['<var(--all-danger)>', '<var(--all-warning)>', '<var(--all-success)>'])
    expect(theme.outer.solid).toBe('<var(--all-surface-2)>')
    expect(theme.outer.gradient).toEqual({ from: '<var(--all-info)>', to: '<var(--all-success)>' })
  })

  it('reads syntax colors from the editor variables', () => {
    const { tokens } = buildImageTheme('light', resolve)
    expect(tokens.keyword?.color).toBe('<var(--cs-keyword)>')
    expect(tokens.string?.color).toBe('<var(--cs-string)>')
    expect(tokens.comment).toEqual({ color: '<var(--cs-comment)>', italic: true })
    expect(tokens.link).toEqual({ color: '<var(--cs-link)>', underline: true })
    expect(tokens.strong).toEqual({ bold: true })
  })

  it('uses weight, slant and underline in the black & white theme', () => {
    const { tokens, chrome } = buildImageTheme('mono', resolve)
    expect(tokens.keyword).toMatchObject({ bold: true })
    expect(tokens.string).toMatchObject({ italic: true })
    expect(tokens.type).toMatchObject({ underline: true })
    expect(chrome).toEqual(['<var(--all-text)>', '<var(--all-text-dim)>', '<var(--all-text-muted)>'])
  })

  it('covers token classes that have a color or a style', () => {
    const { tokens } = buildImageTheme('dark', resolve)
    const styled = TOKEN_CLASSES.filter((token) => tokens[token])
    expect(styled).toEqual(
      expect.arrayContaining(['keyword', 'string', 'number', 'comment', 'function', 'type', 'tag']),
    )
  })

  it('maps export themes onto the app themes', () => {
    expect(THEME_ATTRIBUTE).toEqual({ dark: 'dark', light: 'light', mono: 'e-ink-light' })
  })
})

describe('resolveImageTheme', () => {
  it('always returns drawable colors and leaves no probe element behind', () => {
    const theme = resolveImageTheme('mono')
    for (const color of [theme.background, theme.foreground, theme.lineNumber, theme.border, ...theme.chrome]) {
      expect(typeof color).toBe('string')
      expect(color).not.toBe('')
    }
    expect(document.body.children).toHaveLength(0)
  })
})
