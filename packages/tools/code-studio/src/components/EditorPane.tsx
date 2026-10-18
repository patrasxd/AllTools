import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { forceLinting } from '@codemirror/lint'
import { openSearchPanel } from '@codemirror/search'
import { loadLanguageExtension } from '../languages'
import { baseExtensions, lintExtensions, metaExtensions, settingsExtensions } from '../utils/editorExtensions'
import type { ProblemMessages } from '../utils/lintEngine'
import type { MarkdownCommand } from '../utils/markdownCommands'
import type { CursorInfo, EditorDoc, EditorSettings, Problem } from '../types'

export interface EditorPaneHandle {
  /** Latest text of the active document, read straight from the editor. */
  getText: () => string
  /** Pushes pending edits to the parent immediately. */
  flush: () => void
  focus: () => void
  openFind: () => void
  jumpTo: (from: number, to: number) => void
  /** Replaces the whole document in one undoable step (used by Format and Minify). */
  replaceAll: (text: string) => void
  /** Runs a Markdown command on the current selection as one undoable step. */
  applyEdit: (command: MarkdownCommand) => void
  /** The selected text and the line it starts on, or `null` when nothing is selected. */
  getSelection: () => { text: string; startLine: number } | null
}

interface EditorPaneProps {
  doc: EditorDoc
  settings: EditorSettings
  ariaLabel: string
  phrases: Record<string, string>
  messages: ProblemMessages
  onChange: (id: string, content: string) => void
  onCursor: (info: CursorInfo) => void
  onProblems: (problems: Problem[]) => void
  onTabFocusModeChange: (enabled: boolean) => void
  onLanguageError: () => void
  /** Shift+Alt+F */
  onFormat: () => void
  /** Ctrl/Cmd+S */
  onSave: () => void
}

const SYNC_DELAY_MS = 200

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(function EditorPane(props, ref) {
  const { doc, settings, ariaLabel, phrases } = props

  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const statesRef = useRef(new Map<string, EditorState>())
  const activeIdRef = useRef(doc.id)
  const languageIdRef = useRef(doc.language)
  const settingsRef = useRef(settings)
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tabFocusModeRef = useRef(false)
  const languageComp = useRef(new Compartment())
  const settingsComp = useRef(new Compartment())
  const metaComp = useRef(new Compartment())

  // Always call the freshest callbacks without rebuilding editor states.
  const propsRef = useRef(props)
  propsRef.current = props
  settingsRef.current = settings

  const flush = useCallback(() => {
    if (syncTimerRef.current) {
      clearTimeout(syncTimerRef.current)
      syncTimerRef.current = null
    }
    const view = viewRef.current
    if (view) propsRef.current.onChange(activeIdRef.current, view.state.doc.toString())
  }, [])

  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(flush, SYNC_DELAY_MS)
  }, [flush])

  const createState = useCallback(
    (content: string): EditorState => {
      const extensions: Extension[] = [
        ...baseExtensions({
          onFormat: () => propsRef.current.onFormat(),
          onSave: () => propsRef.current.onSave(),
          isTabFocusMode: () => tabFocusModeRef.current,
          toggleTabFocusMode: () => {
            tabFocusModeRef.current = !tabFocusModeRef.current
            propsRef.current.onTabFocusModeChange(tabFocusModeRef.current)
          },
        }),
        ...lintExtensions({
          getLanguageId: () => languageIdRef.current,
          getMessages: () => propsRef.current.messages,
          onProblems: (problems) => propsRef.current.onProblems(problems),
        }),
        languageComp.current.of([]),
        settingsComp.current.of(settingsExtensions(settingsRef.current)),
        metaComp.current.of(metaExtensions(propsRef.current.ariaLabel, propsRef.current.phrases)),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) scheduleSync()
          if (update.docChanged || update.selectionSet) {
            const head = update.state.selection.main
            const line = update.state.doc.lineAt(head.head)
            propsRef.current.onCursor({
              line: line.number,
              col: head.head - line.from + 1,
              selectedChars: Math.abs(head.to - head.from),
            })
          }
        }),
      ]
      return EditorState.create({ doc: content, extensions })
    },
    [scheduleSync],
  )

  // Create the view once.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return undefined
    const view = new EditorView({ state: createState(doc.content), parent: host })
    viewRef.current = view
    const states = statesRef.current
    return () => {
      flush()
      view.destroy()
      viewRef.current = null
      states.clear()
    }
    // The view is created exactly once; later doc/settings changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch between documents while keeping undo history, selection and scroll position per tab.
  useEffect(() => {
    const view = viewRef.current
    if (!view || activeIdRef.current === doc.id) return
    flush()
    statesRef.current.set(activeIdRef.current, view.state)
    activeIdRef.current = doc.id
    languageIdRef.current = doc.language
    const restored = statesRef.current.get(doc.id) ?? createState(doc.content)
    view.setState(restored)
    view.dispatch({
      effects: [
        settingsComp.current.reconfigure(settingsExtensions(settingsRef.current)),
        metaComp.current.reconfigure(metaExtensions(propsRef.current.ariaLabel, propsRef.current.phrases)),
      ],
    })
    forceLinting(view)
    view.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id])

  // Load the grammar for the active language.
  useEffect(() => {
    languageIdRef.current = doc.language
    let cancelled = false
    loadLanguageExtension(doc.language)
      .then((extension) => {
        const view = viewRef.current
        if (cancelled || !view) return
        view.dispatch({ effects: languageComp.current.reconfigure(extension) })
        forceLinting(view)
      })
      .catch(() => {
        if (!cancelled) propsRef.current.onLanguageError()
      })
    return () => {
      cancelled = true
    }
  }, [doc.id, doc.language])

  // Apply settings to the active state.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: settingsComp.current.reconfigure(settingsExtensions(settings)) })
  }, [settings])

  // Keep the editor label and search wording in sync with the document name and locale.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: metaComp.current.reconfigure(metaExtensions(ariaLabel, phrases)) })
  }, [ariaLabel, phrases])

  // Reflect external content changes (for example an import into the active tab) without losing the cursor model.
  useEffect(() => {
    const view = viewRef.current
    if (!view || activeIdRef.current !== doc.id) return
    const current = view.state.doc.toString()
    if (current !== doc.content && !syncTimerRef.current) {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: doc.content } })
    }
  }, [doc.id, doc.content])

  useImperativeHandle(
    ref,
    () => ({
      getText: () => viewRef.current?.state.doc.toString() ?? '',
      flush,
      focus: () => viewRef.current?.focus(),
      openFind: () => {
        const view = viewRef.current
        if (view) {
          openSearchPanel(view)
          view.focus()
        }
      },
      replaceAll: (text) => {
        const view = viewRef.current
        if (!view || view.state.doc.toString() === text) return
        const head = Math.min(view.state.selection.main.head, text.length)
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: text },
          selection: { anchor: head },
          userEvent: 'input.format',
        })
        view.focus()
      },
      applyEdit: (command) => {
        const view = viewRef.current
        if (!view) return
        const { from, to } = view.state.selection.main
        const result = command({ text: view.state.doc.toString(), from, to })
        view.dispatch({
          changes: { from: result.from, to: result.to, insert: result.insert },
          selection: { anchor: result.selectFrom, head: result.selectTo },
          scrollIntoView: true,
          userEvent: 'input',
        })
        view.focus()
      },
      getSelection: () => {
        const view = viewRef.current
        if (!view) return null
        const { from, to } = view.state.selection.main
        if (from === to) return null
        return { text: view.state.sliceDoc(from, to), startLine: view.state.doc.lineAt(from).number }
      },
      jumpTo: (from, to) => {
        const view = viewRef.current
        if (!view) return
        const max = view.state.doc.length
        const anchor = Math.min(from, max)
        view.dispatch({
          selection: { anchor, head: Math.min(Math.max(to, anchor), max) },
          effects: EditorView.scrollIntoView(anchor, { y: 'center' }),
        })
        view.focus()
      },
    }),
    [flush],
  )

  return (
    <div
      className={`cs-editor${settings.ruler > 0 ? ' cs-editor--ruler' : ''}`}
      ref={hostRef}
      style={{
        ['--cs-font-size' as string]: `${settings.fontSize}px`,
        ['--cs-ruler-col' as string]: String(settings.ruler),
      }}
      data-language={doc.language}
    />
  )
})
