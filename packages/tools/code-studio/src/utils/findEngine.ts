import type { SearchQuery } from '@codemirror/search'
import type { EditorState } from '@codemirror/state'

export interface MatchInfo {
  /** Number of matches (counting stops at `limit`). */
  total: number
  /** 1-based index of the match that is currently selected, or 0 when the selection is not a match. */
  current: number
  /** True when there are more matches than were counted. */
  capped: boolean
}

export const MATCH_LIMIT = 1000

/** Counts matches of a search query and finds which one is selected, for the "3 of 12" label. */
export function countMatches(state: EditorState, query: SearchQuery, limit = MATCH_LIMIT): MatchInfo {
  if (!query.search || !query.valid) return { total: 0, current: 0, capped: false }

  const selection = state.selection.main
  const cursor = query.getCursor(state)
  let total = 0
  let current = 0
  let capped = false

  for (let step = cursor.next(); !step.done; step = cursor.next()) {
    if (total >= limit) {
      capped = true
      break
    }
    total += 1
    const { from, to } = step.value
    if (current === 0 && from === selection.from && to === selection.to) current = total
  }
  return { total, current, capped }
}
