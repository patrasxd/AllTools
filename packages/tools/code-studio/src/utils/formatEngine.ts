import type { TabSize } from '../types'

export type FormatResult = { ok: true; text: string } | { ok: false; message: string }

type PluginLoader = () => Promise<unknown>

const plugins = {
  babel: () => import('prettier/plugins/babel'),
  estree: () => import('prettier/plugins/estree'),
  typescript: () => import('prettier/plugins/typescript'),
  postcss: () => import('prettier/plugins/postcss'),
  html: () => import('prettier/plugins/html'),
  markdown: () => import('prettier/plugins/markdown'),
  yaml: () => import('prettier/plugins/yaml'),
} satisfies Record<string, PluginLoader>

interface PrettierTarget {
  parser: string
  plugins: PluginLoader[]
}

/** Which Prettier parser (and plugins) formats a language. SQL uses a separate formatter. */
function prettierTarget(languageId: string, fileName: string): PrettierTarget | null {
  switch (languageId) {
    case 'javascript':
      return { parser: 'babel', plugins: [plugins.babel, plugins.estree] }
    case 'typescript':
      return { parser: 'typescript', plugins: [plugins.typescript, plugins.estree] }
    case 'json':
      return { parser: 'json', plugins: [plugins.babel, plugins.estree] }
    case 'css': {
      const ext = fileName.slice(fileName.lastIndexOf('.') + 1).toLowerCase()
      const parser = ext === 'scss' ? 'scss' : ext === 'less' ? 'less' : 'css'
      return { parser, plugins: [plugins.postcss] }
    }
    case 'html':
      return { parser: 'html', plugins: [plugins.html, plugins.postcss, plugins.babel, plugins.estree] }
    case 'markdown':
      return { parser: 'markdown', plugins: [plugins.markdown] }
    case 'yaml':
      return { parser: 'yaml', plugins: [plugins.yaml] }
    default:
      return null
  }
}

/** Languages the Format button can handle. Everything else keeps the button disabled. */
export function isFormattable(languageId: string): boolean {
  return languageId === 'sql' || prettierTarget(languageId, '') !== null
}

function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  // Prettier appends a code frame after the first line; the first line is what a user needs.
  return raw.split('\n')[0].trim() || 'Formatting failed'
}

/**
 * Formats code in the browser. Parsers are loaded on demand, so the cost is only paid by people who click Format.
 * Invalid code is never changed: the result carries the parser message instead.
 */
export async function formatCode(
  text: string,
  languageId: string,
  options: { tabSize: TabSize; fileName?: string },
): Promise<FormatResult> {
  try {
    if (languageId === 'sql') {
      const { format } = await import('sql-formatter')
      return { ok: true, text: format(text, { tabWidth: options.tabSize, keywordCase: 'upper' }) }
    }

    const target = prettierTarget(languageId, options.fileName ?? '')
    if (!target) return { ok: false, message: 'Unsupported language' }

    const [{ format }, ...loaded] = await Promise.all([
      import('prettier/standalone'),
      ...target.plugins.map((load) => load()),
    ])
    const formatted = await format(text, {
      parser: target.parser,
      plugins: loaded as never[],
      tabWidth: options.tabSize,
      useTabs: false,
    })
    return { ok: true, text: formatted }
  } catch (error) {
    return { ok: false, message: errorMessage(error) }
  }
}

/** Collapses JSON to a single line. Returns `null` when the text is not valid JSON. */
export function minifyJson(text: string): string | null {
  try {
    return JSON.stringify(JSON.parse(text))
  } catch {
    return null
  }
}
