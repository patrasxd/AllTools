import { describe, expect, it } from 'vitest'
import { EditorSelection, EditorState } from '@codemirror/state'
import { SearchQuery } from '@codemirror/search'
import { MATCH_LIMIT, countMatches } from '../utils/findEngine'

const state = (doc: string, selection?: { from: number; to: number }) =>
  EditorState.create({ doc, selection: selection ? EditorSelection.single(selection.from, selection.to) : undefined })

describe('countMatches', () => {
  it('counts nothing for an empty or invalid query', () => {
    expect(countMatches(state('abc'), new SearchQuery({ search: '' }))).toEqual({ total: 0, current: 0, capped: false })
    expect(countMatches(state('abc'), new SearchQuery({ search: '(', regexp: true }))).toEqual({
      total: 0,
      current: 0,
      capped: false,
    })
  })

  it('counts matches and honours case sensitivity', () => {
    const doc = state('Foo foo FOO')
    expect(countMatches(doc, new SearchQuery({ search: 'foo' })).total).toBe(3)
    expect(countMatches(doc, new SearchQuery({ search: 'foo', caseSensitive: true })).total).toBe(1)
  })

  it('honours whole words and regular expressions', () => {
    const doc = state('foo food foo')
    expect(countMatches(doc, new SearchQuery({ search: 'foo', wholeWord: true })).total).toBe(2)
    expect(countMatches(doc, new SearchQuery({ search: 'fo+d?', regexp: true })).total).toBe(3)
  })

  it('tells which match is selected', () => {
    const query = new SearchQuery({ search: 'ab' })
    expect(countMatches(state('ab ab ab', { from: 3, to: 5 }), query).current).toBe(2)
    expect(countMatches(state('ab ab ab', { from: 0, to: 0 }), query).current).toBe(0)
    expect(countMatches(state('ab ab ab', { from: 3, to: 4 }), query).current).toBe(0)
  })

  it('stops counting at the limit', () => {
    const doc = state('a'.repeat(MATCH_LIMIT + 50))
    expect(countMatches(doc, new SearchQuery({ search: 'a' }))).toMatchObject({ total: MATCH_LIMIT, capped: true })
    expect(countMatches(doc, new SearchQuery({ search: 'a' }), 10)).toMatchObject({ total: 10, capped: true })
  })

  it('is not capped when everything was counted', () => {
    expect(countMatches(state('a a a'), new SearchQuery({ search: 'a' }))).toMatchObject({ total: 3, capped: false })
  })
})
