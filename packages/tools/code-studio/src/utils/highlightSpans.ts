import { ensureSyntaxTree } from '@codemirror/language'
import { EditorState, type Extension } from '@codemirror/state'
import { highlightTree } from '@lezer/highlight'
import { highlightStyle } from './editorExtensions'
import type { TokenSpan } from './imageEngine'

/**
 * Runs the same grammar and highlight style the editor uses over a piece of text, without any DOM.
 * Plain text (no language extension) simply has no spans.
 */
export function highlightToSpans(text: string, language: Extension): TokenSpan[] {
  const state = EditorState.create({ doc: text, extensions: [language] })
  const tree = ensureSyntaxTree(state, state.doc.length, 5000)
  if (!tree) return []
  const spans: TokenSpan[] = []
  highlightTree(tree, highlightStyle, (from, to, classes) => {
    spans.push({ from, to, classes })
  })
  return spans
}
