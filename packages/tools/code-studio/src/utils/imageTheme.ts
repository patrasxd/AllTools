import { TOKEN_CLASSES, type ImageTheme, type ImageThemeId, type TokenClass, type TokenStyle } from './imageEngine'

/**
 * Image themes are built from the shared design tokens (`--all-*`) and the editor's syntax variables (`--cs-*`),
 * so exported images use exactly the colors the app uses, and no color literal lives in this file.
 * Each export theme maps to an app theme: dark -> dark, light -> light, black & white -> e-ink light.
 */
export const THEME_ATTRIBUTE: Record<ImageThemeId, string> = {
  dark: 'dark',
  light: 'light',
  mono: 'e-ink-light',
}

/** Turns a CSS color expression (it may use `var()` and `color-mix()`) into a concrete color. */
export type ColorResolver = (expression: string) => string

/** Syntax token -> the CSS variable that colors it in the editor (see `code-studio.css`). */
const SYNTAX_VARIABLE: Partial<Record<TokenClass, string>> = {
  keyword: '--cs-keyword',
  string: '--cs-string',
  regexp: '--cs-regexp',
  number: '--cs-number',
  comment: '--cs-comment',
  function: '--cs-function',
  type: '--cs-type',
  property: '--cs-property',
  tag: '--cs-tag',
  punct: '--cs-punct',
  meta: '--cs-meta',
  heading: '--cs-heading',
  link: '--cs-link',
  invalid: '--cs-invalid',
  quote: '--cs-comment',
  code: '--cs-string',
}

type StyleFlags = Pick<TokenStyle, 'bold' | 'italic' | 'underline'>

const COLOR_FLAGS: Partial<Record<TokenClass, StyleFlags>> = {
  comment: { italic: true },
  heading: { bold: true },
  strong: { bold: true },
  emphasis: { italic: true },
  link: { underline: true },
  quote: { italic: true },
  invalid: { underline: true },
}

/** Without color, token kinds are told apart by weight, slant and underline (print and e-ink friendly). */
const MONO_FLAGS: Partial<Record<TokenClass, StyleFlags>> = {
  keyword: { bold: true },
  string: { italic: true },
  comment: { italic: true },
  function: { bold: true, italic: true },
  type: { underline: true },
  tag: { bold: true },
  heading: { bold: true, underline: true },
  strong: { bold: true },
  emphasis: { italic: true },
  link: { underline: true },
  quote: { italic: true },
  invalid: { underline: true },
}

export function buildImageTheme(id: ImageThemeId, resolve: ColorResolver): ImageTheme {
  const flags = id === 'mono' ? MONO_FLAGS : COLOR_FLAGS
  const tokens: ImageTheme['tokens'] = {}

  for (const token of TOKEN_CLASSES) {
    const variable = SYNTAX_VARIABLE[token]
    const style: TokenStyle = { ...flags[token] }
    if (variable) style.color = resolve(`var(${variable})`)
    if (Object.keys(style).length > 0) tokens[token] = style
  }

  return {
    id,
    background: resolve('var(--all-surface)'),
    foreground: resolve('var(--all-text)'),
    lineNumber: resolve('var(--all-text-dim)'),
    border: resolve('var(--all-border-2)'),
    chrome:
      id === 'mono'
        ? [resolve('var(--all-text)'), resolve('var(--all-text-dim)'), resolve('var(--all-text-muted)')]
        : [resolve('var(--all-danger)'), resolve('var(--all-warning)'), resolve('var(--all-success)')],
    outer: {
      solid: resolve('var(--all-surface-2)'),
      gradient:
        id === 'mono'
          ? { from: resolve('var(--all-surface-2)'), to: resolve('var(--all-text-muted)') }
          : { from: resolve('var(--all-info)'), to: resolve('var(--all-success)') },
    },
    tokens,
  }
}

/**
 * Resolves colors in the browser: a hidden probe element carries the app theme's `data-theme` attribute, so the
 * stylesheet computes the tokens for that theme whatever theme the page itself is showing.
 */
export function resolveImageTheme(id: ImageThemeId): ImageTheme {
  if (typeof document === 'undefined') throw new Error('Theme resolution needs a document')

  const wrapper = document.createElement('div')
  wrapper.setAttribute('data-theme', THEME_ATTRIBUTE[id])
  if (id === 'mono') wrapper.setAttribute('data-eink', 'true')
  wrapper.setAttribute('aria-hidden', 'true')
  wrapper.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden'
  const probe = document.createElement('div')
  probe.className = 'cs-layout'
  wrapper.appendChild(probe)
  document.body.appendChild(wrapper)

  try {
    return buildImageTheme(id, (expression) => {
      probe.style.color = ''
      probe.style.color = expression
      // Environments without a CSS engine (tests) report nothing; `currentColor` is still a valid fill.
      return getComputedStyle(probe).color || 'currentColor'
    })
  } finally {
    wrapper.remove()
  }
}
