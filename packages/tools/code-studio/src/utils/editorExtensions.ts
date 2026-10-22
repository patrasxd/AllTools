import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentLess, indentMore } from '@codemirror/commands'
import {
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  ensureSyntaxTree,
  indentUnit,
  language,
  syntaxHighlighting,
  syntaxTree,
} from '@codemirror/language'
import { lintGutter, linter, type Diagnostic } from '@codemirror/lint'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import type { EditorSettings, Problem } from '../types'
import { createFindPanel, type FindLabels } from '../components/FindPanel'
import { buildProblems, findSyntaxErrorsForLanguage, type ProblemMessages } from './lintEngine'

/**
 * Highlight classes instead of inline colors: every theme (dark, light, e-ink) styles
 * the `cs-tok-*` classes in `code-studio.css`, so token colors follow the app theme.
 */
export const highlightStyle = HighlightStyle.define([
  {
    tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.operatorKeyword, t.definitionKeyword],
    class: 'cs-tok-keyword',
  },
  { tag: [t.string, t.special(t.string), t.character, t.inserted], class: 'cs-tok-string' },
  { tag: [t.regexp, t.escape], class: 'cs-tok-regexp' },
  { tag: [t.number, t.bool, t.null, t.atom, t.self], class: 'cs-tok-number' },
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], class: 'cs-tok-comment' },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], class: 'cs-tok-function' },
  { tag: [t.typeName, t.className, t.namespace, t.annotation], class: 'cs-tok-type' },
  { tag: [t.propertyName, t.attributeName, t.labelName], class: 'cs-tok-property' },
  { tag: [t.tagName, t.angleBracket], class: 'cs-tok-tag' },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], class: 'cs-tok-definition' },
  { tag: [t.operator, t.punctuation, t.separator, t.bracket, t.derefOperator], class: 'cs-tok-punct' },
  { tag: [t.meta, t.processingInstruction, t.documentMeta], class: 'cs-tok-meta' },
  { tag: t.heading, class: 'cs-tok-heading' },
  { tag: t.strong, class: 'cs-tok-strong' },
  { tag: t.emphasis, class: 'cs-tok-emphasis' },
  { tag: [t.link, t.url], class: 'cs-tok-link' },
  { tag: [t.quote, t.contentSeparator], class: 'cs-tok-quote' },
  { tag: t.monospace, class: 'cs-tok-code' },
  { tag: t.strikethrough, class: 'cs-tok-strike' },
  { tag: t.invalid, class: 'cs-tok-invalid' },
])

/** Settings-dependent extensions; they live in a Compartment so they can change without recreating the editor. */
export function settingsExtensions(settings: EditorSettings): Extension {
  return [
    settings.wordWrap ? EditorView.lineWrapping : [],
    settings.lineNumbers ? [lineNumbers(), highlightActiveLineGutter(), foldGutter()] : [],
    EditorState.tabSize.of(settings.tabSize),
    indentUnit.of(' '.repeat(settings.tabSize)),
  ]
}

export interface BaseExtensionOptions {
  /** Returns true while "Tab moves focus" mode is on, so Tab is left to the browser. */
  isTabFocusMode: () => boolean
  toggleTabFocusMode: () => void
  onFormat: () => void
  onSave: () => void
  /** Texts of the find and replace panel, read when the panel opens. */
  getFindLabels: () => FindLabels
}

/** Locale and accessibility dependent extensions (search panel wording, editor label), kept in a Compartment. */
export function metaExtensions(ariaLabel: string, phrases: Record<string, string>): Extension {
  return [
    EditorState.phrases.of(phrases),
    EditorView.contentAttributes.of({ 'aria-label': ariaLabel, spellcheck: 'false', autocapitalize: 'off' }),
  ]
}

export function baseExtensions(options: BaseExtensionOptions): Extension[] {
  return [
    history(),
    drawSelection(),
    highlightSpecialChars(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    rectangularSelection(),
    crosshairCursor(),
    syntaxHighlighting(highlightStyle),
    search({ createPanel: (view) => createFindPanel(view, options.getFindLabels) }),
    EditorState.allowMultipleSelections.of(true),
    keymap.of([
      {
        key: 'Mod-m',
        preventDefault: true,
        run: () => {
          options.toggleTabFocusMode()
          return true
        },
      },
      {
        key: 'Shift-Alt-f',
        preventDefault: true,
        run: () => {
          options.onFormat()
          return true
        },
      },
      {
        key: 'Mod-s',
        preventDefault: true,
        run: () => {
          options.onSave()
          return true
        },
      },
      { key: 'Tab', run: (view) => !options.isTabFocusMode() && indentMore(view) },
      { key: 'Shift-Tab', run: (view) => !options.isTabFocusMode() && indentLess(view) },
      ...closeBracketsKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      ...defaultKeymap,
    ]),
  ]
}

export interface LintOptions {
  getLanguageId: () => string
  getMessages: () => ProblemMessages
  onProblems: (problems: Problem[]) => void
}

/** Underlines parser errors in the editor and reports the same list to the Problems panel. */
export function lintExtensions(options: LintOptions): Extension[] {
  return [
    linter(
      (view) => {
        const text = view.state.doc.toString()
        const tree = ensureSyntaxTree(view.state, view.state.doc.length, 150) ?? syntaxTree(view.state)
        const grammar = view.state.facet(language)
        const ranges = findSyntaxErrorsForLanguage(text, tree, options.getLanguageId(), (source) =>
          grammar ? grammar.parser.parse(source) : null,
        )
        const problems = buildProblems(text, ranges, options.getLanguageId(), options.getMessages())
        options.onProblems(problems)
        return problems.map<Diagnostic>((problem) => ({
          from: problem.from,
          to: problem.to,
          severity: problem.severity,
          message: problem.message,
        }))
      },
      { delay: 350 },
    ),
    lintGutter(),
  ]
}
