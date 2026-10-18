import type { Tree } from '@lezer/common'
import { positionToLineCol } from './documentEngine'
import type { Problem } from '../types'

export interface SyntaxRange {
  from: number
  to: number
}

const MAX_PROBLEMS = 100

/**
 * Collects the error nodes the Lezer parser produced while recovering from invalid input.
 * Zero-width error nodes are widened to one character so they stay visible in the editor.
 */
export function findSyntaxErrors(tree: Tree, docLength: number): SyntaxRange[] {
  const ranges: SyntaxRange[] = []
  tree.iterate({
    enter: (node) => {
      if (ranges.length >= MAX_PROBLEMS) return false
      if (!node.type.isError) return undefined
      let { from, to } = node
      if (from === to) {
        if (to < docLength) to += 1
        else if (from > 0) from -= 1
      }
      const last = ranges[ranges.length - 1]
      if (!last || from >= last.to) ranges.push({ from, to })
      return undefined
    },
  })
  return ranges
}

/**
 * Some grammars only accept code inside a container (Java methods must live in a class), yet people paste and
 * write loose snippets in an editor. For those languages a snippet without any type declaration is also checked
 * wrapped in a container, so a bare method is not reported as an error at its `(`.
 */
export const SNIPPET_WRAPPERS: Record<string, { prefix: string; suffix: string }> = {
  java: { prefix: 'class Snippet {\n', suffix: '\n}' },
}

const TYPE_DECLARATION = /\b(class|interface|enum|record)\s+[A-Za-z_]/

export type TreeParser = (text: string) => Tree | null | undefined

/**
 * Finds syntax errors for a language, with snippet tolerance (see `SNIPPET_WRAPPERS`).
 * Whichever reading, as written or wrapped, has fewer errors wins; real mistakes are still reported.
 */
export function findSyntaxErrorsForLanguage(
  text: string,
  tree: Tree,
  languageId: string,
  parse: TreeParser,
): SyntaxRange[] {
  const direct = findSyntaxErrors(tree, text.length)
  const wrapper = SNIPPET_WRAPPERS[languageId]
  if (direct.length === 0 || !wrapper || TYPE_DECLARATION.test(text)) return direct

  const wrapped = `${wrapper.prefix}${text}${wrapper.suffix}`
  const wrappedTree = parse(wrapped)
  if (!wrappedTree) return direct

  const shift = wrapper.prefix.length
  const mapped = findSyntaxErrors(wrappedTree, wrapped.length)
    .map((range) => ({ from: range.from - shift, to: range.to - shift }))
    .filter((range) => range.to > 0 && range.from < text.length)
    .map((range) => ({ from: Math.max(0, range.from), to: Math.min(text.length, range.to) }))
    .filter((range) => range.to > range.from)

  return mapped.length < direct.length ? mapped : direct
}

export interface JsonError {
  message: string
  /** Offset reported by the engine, when it reports one. */
  position: number | null
}

/** Strict JSON check. The message comes from the browser, so its wording varies between engines. */
export function validateJson(text: string): JsonError | null {
  if (text.trim() === '') return null
  try {
    JSON.parse(text)
    return null
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const match = /position (\d+)/.exec(message)
    return { message, position: match ? Number(match[1]) : null }
  }
}

export interface ProblemMessages {
  syntaxError: string
  invalidJson: (detail: string) => string
}

/**
 * Turns parser errors (and, for JSON, strict validation) into a list of problems with line and column.
 * `languageId` decides whether the extra JSON check runs.
 */
export function buildProblems(
  text: string,
  syntaxRanges: SyntaxRange[],
  languageId: string,
  messages: ProblemMessages,
): Problem[] {
  const problems: Problem[] = syntaxRanges.map((range) => ({
    ...range,
    ...positionToLineCol(text, range.from),
    severity: 'error',
    message: messages.syntaxError,
  }))

  if (languageId === 'json') {
    const jsonError = validateJson(text)
    if (jsonError) {
      if (problems.length > 0) {
        problems[0] = { ...problems[0], message: messages.invalidJson(jsonError.message) }
      } else {
        const from = Math.min(jsonError.position ?? 0, Math.max(text.length - 1, 0))
        const to = Math.min(from + 1, text.length)
        problems.push({
          from,
          to,
          ...positionToLineCol(text, from),
          severity: 'error',
          message: messages.invalidJson(jsonError.message),
        })
      }
    }
  }

  return problems.slice(0, MAX_PROBLEMS)
}
