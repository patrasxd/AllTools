import { describe, it, expect } from 'vitest'
import { jsonLanguage } from '@codemirror/lang-json'
import { javascriptLanguage } from '@codemirror/lang-javascript'
import { buildProblems, findSyntaxErrors, validateJson } from '../utils/lintEngine'

const messages = {
  syntaxError: 'Syntax error',
  invalidJson: (detail: string) => `Invalid JSON: ${detail}`,
}

describe('findSyntaxErrors', () => {
  it('reports nothing for valid code', () => {
    const text = '{"a": [1, 2, {"b": null}]}'
    expect(findSyntaxErrors(jsonLanguage.parser.parse(text), text.length)).toEqual([])

    const js = 'const a = (x) => x + 1\nfunction f() { return a(2) }'
    expect(findSyntaxErrors(javascriptLanguage.parser.parse(js), js.length)).toEqual([])
  })

  it('finds error nodes in invalid JSON', () => {
    const text = '{"a": 1,, "b": }'
    const ranges = findSyntaxErrors(jsonLanguage.parser.parse(text), text.length)
    expect(ranges.length).toBeGreaterThan(0)
    for (const range of ranges) {
      expect(range.from).toBeGreaterThanOrEqual(0)
      expect(range.to).toBeLessThanOrEqual(text.length)
      expect(range.to).toBeGreaterThan(range.from)
    }
  })

  it('finds error nodes in invalid JavaScript', () => {
    const text = 'function ( {'
    const ranges = findSyntaxErrors(javascriptLanguage.parser.parse(text), text.length)
    expect(ranges.length).toBeGreaterThan(0)
  })

  it('returns non-overlapping ranges in document order', () => {
    const text = '{"a": 1,, "b": ,, }'
    const ranges = findSyntaxErrors(jsonLanguage.parser.parse(text), text.length)
    for (let i = 1; i < ranges.length; i++) {
      expect(ranges[i].from).toBeGreaterThanOrEqual(ranges[i - 1].to)
    }
  })
})

describe('validateJson', () => {
  it('accepts valid and empty input', () => {
    expect(validateJson('{"a": 1}')).toBeNull()
    expect(validateJson('[]')).toBeNull()
    expect(validateJson('   ')).toBeNull()
  })

  it('reports invalid input with a message', () => {
    const error = validateJson('{"a": }')
    expect(error).not.toBeNull()
    expect(error!.message.length).toBeGreaterThan(0)
  })

  it('extracts the error position when the engine reports one', () => {
    const error = validateJson('{"a": 1 "b": 2}')
    expect(error).not.toBeNull()
    if (error!.position !== null) expect(error!.position).toBeGreaterThan(0)
  })
})

describe('buildProblems', () => {
  it('adds line and column to syntax errors', () => {
    const text = 'a\nbcd'
    const problems = buildProblems(text, [{ from: 3, to: 4 }], 'javascript', messages)
    expect(problems).toEqual([{ from: 3, to: 4, line: 2, col: 2, severity: 'error', message: 'Syntax error' }])
  })

  it('does not run JSON validation for other languages', () => {
    expect(buildProblems('{"a": }', [], 'javascript', messages)).toEqual([])
  })

  it('enriches the first JSON problem with the engine message', () => {
    const text = '{"a": }'
    const [problem] = buildProblems(text, [{ from: 6, to: 7 }], 'json', messages)
    expect(problem.message.startsWith('Invalid JSON: ')).toBe(true)
    expect(problem.from).toBe(6)
  })

  it('reports invalid JSON even when the parser found no error node', () => {
    const text = '{"a": 1,}'
    const problems = buildProblems(text, [], 'json', messages)
    expect(problems).toHaveLength(1)
    expect(problems[0].message.startsWith('Invalid JSON: ')).toBe(true)
    expect(problems[0].from).toBeLessThan(text.length)
    expect(problems[0].to).toBeLessThanOrEqual(text.length)
  })

  it('stays empty for valid JSON', () => {
    expect(buildProblems('{"a": 1}', [], 'json', messages)).toEqual([])
  })
})
