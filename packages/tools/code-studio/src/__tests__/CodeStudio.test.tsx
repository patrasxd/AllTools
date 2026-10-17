import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { CodeStudio } from '../CodeStudio'
import { SESSION_STORAGE_KEY, createDefaultSession, createDoc, serializeSession } from '../utils/documentEngine'

// jsdom has no layout engine: CodeMirror needs these measuring APIs to exist.
beforeAll(() => {
  const emptyRects = () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList
  const rect = () =>
    ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) }) as DOMRect
  Range.prototype.getClientRects = emptyRects
  Range.prototype.getBoundingClientRect = rect
  Element.prototype.scrollIntoView = vi.fn()
})

function getView(): EditorView {
  const dom = document.querySelector('.cm-editor') as HTMLElement
  const view = EditorView.findFromDOM(dom)
  if (!view) throw new Error('editor view not found')
  return view
}

function typeInEditor(text: string) {
  const view = getView()
  act(() => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } })
  })
}

function tabNames(): string[] {
  return screen
    .getAllByRole('tab')
    .filter((el) => el.classList.contains('cs-tab__label'))
    .map((el) => el.textContent ?? '')
}

function stored() {
  return JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY) ?? 'null')
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('CodeStudio', () => {
  it('starts with one empty document and an editor', async () => {
    render(<CodeStudio locale="en" />)
    expect(tabNames()).toEqual(['untitled-1.txt'])
    expect(document.querySelector('.cm-content')).not.toBeNull()
    expect(getView().state.doc.toString()).toBe('')
    expect(screen.getByText('Ln 1, Col 1')).toBeInTheDocument()
  })

  it('opens and closes tabs, and never closes the last one', () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    expect(tabNames()).toEqual(['untitled-1.txt', 'untitled-2.txt'])

    fireEvent.click(screen.getByRole('button', { name: 'Close untitled-2.txt' }))
    expect(tabNames()).toEqual(['untitled-1.txt'])

    fireEvent.click(screen.getByRole('button', { name: 'Close untitled-1.txt' }))
    expect(tabNames()).toHaveLength(1)
  })

  it('keeps the content of each tab when switching', async () => {
    render(<CodeStudio locale="en" />)
    typeInEditor('first document')
    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    expect(getView().state.doc.toString()).toBe('')
    typeInEditor('second document')

    fireEvent.click(screen.getByRole('tab', { name: 'untitled-1.txt' }))
    expect(getView().state.doc.toString()).toBe('first document')
    fireEvent.click(screen.getByRole('tab', { name: 'untitled-2.txt' }))
    expect(getView().state.doc.toString()).toBe('second document')
  })

  it('persists documents to local storage and restores them', async () => {
    vi.useFakeTimers()
    const { unmount } = render(<CodeStudio locale="en" />)
    typeInEditor('const answer = 42')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500)
    })
    expect(stored().docs[0].content).toBe('const answer = 42')
    unmount()
    vi.useRealTimers()

    render(<CodeStudio locale="en" />)
    expect(getView().state.doc.toString()).toBe('const answer = 42')
  })

  it('saves pending edits when the tool is closed', () => {
    const { unmount } = render(<CodeStudio locale="en" />)
    typeInEditor('unsaved edit')
    unmount()
    expect(stored().docs[0].content).toBe('unsaved edit')
  })

  it('restores a saved session with several tabs and settings', () => {
    const session = createDefaultSession()
    session.docs = [
      createDoc([], { id: 'a', name: 'app.ts', content: 'let x = 1' }),
      createDoc([], { id: 'b', name: 'data.json', content: '{"ok": true}' }),
    ]
    session.activeId = 'b'
    session.settings.fontSize = 18
    localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)

    render(<CodeStudio locale="en" />)
    expect(tabNames()).toEqual(['app.ts', 'data.json'])
    expect(getView().state.doc.toString()).toBe('{"ok": true}')
    expect(screen.getByText('18px')).toBeInTheDocument()
    expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('json')
  })

  it('opens files from disk as new tabs and detects their language and line endings', async () => {
    render(<CodeStudio locale="en" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['def run():\r\n    return 1\r\n'], 'script.py', { type: 'text/x-python' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(tabNames()).toContain('script.py'))
    expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('python')
    expect((screen.getByLabelText('Line endings') as HTMLSelectElement).value).toBe('crlf')
    expect(getView().state.doc.toString()).toBe('def run():\n    return 1\n')
  })

  it('exports the active document with the chosen name and line endings', async () => {
    const createObjectURL = vi.fn(() => 'blob:test')
    const revokeObjectURL = vi.fn()
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<CodeStudio locale="en" />)
    typeInEditor('line one\nline two')
    fireEvent.change(screen.getByLabelText('Line endings'), { target: { value: 'crlf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Export' }))

    const dialog = await screen.findByRole('dialog')
    const field = within(dialog).getByLabelText('File name') as HTMLInputElement
    fireEvent.change(field, { target: { value: 'notes.custom' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Download' }))

    expect(click).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0][0] as unknown as Blob
    expect(blob.type).toBe('text/plain;charset=utf-8')
    expect(await blob.text()).toBe('line one\r\nline two')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('renames a tab and re-detects the language', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('File name'), { target: { value: 'config.yaml' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(tabNames()).toEqual(['config.yaml']))
    expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('yaml')
  })

  it('lists syntax problems for invalid JSON and jumps to them', async () => {
    const session = createDefaultSession()
    session.docs = [createDoc([], { id: 'j', name: 'broken.json', content: '{"a": 1,, "b": }' })]
    session.activeId = 'j'
    localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)

    render(<CodeStudio locale="en" />)
    const problem = await screen.findAllByRole('button', { name: /Ln 1, Col/ }, { timeout: 3000 })
    expect(problem.length).toBeGreaterThan(0)

    fireEvent.click(problem[0])
    const selection = getView().state.selection.main
    expect(selection.to).toBeGreaterThan(selection.from)
  })

  it('shows a clean state for valid code and for plain text', async () => {
    const session = createDefaultSession()
    session.docs = [createDoc([], { id: 'j', name: 'ok.json', content: '{"a": 1}' })]
    session.activeId = 'j'
    localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)

    render(<CodeStudio locale="en" />)
    expect(await screen.findByText('No syntax problems found.', undefined, { timeout: 3000 })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'plaintext' } })
    expect(await screen.findByText('Syntax checking is not available for plain text.')).toBeInTheDocument()
  })

  it('toggles wrapping and line numbers', async () => {
    render(<CodeStudio locale="en" />)
    expect(document.querySelector('.cm-lineNumbers')).not.toBeNull()
    const lines = screen.getByRole('button', { name: 'Lines' })
    fireEvent.click(lines)
    await waitFor(() => expect(document.querySelector('.cm-lineNumbers')).toBeNull())
    expect(lines).toHaveAttribute('aria-pressed', 'false')

    const wrap = screen.getByRole('button', { name: 'Wrap' })
    fireEvent.click(wrap)
    await waitFor(() => expect(document.querySelector('.cm-lineWrapping')).not.toBeNull())
  })

  it('changes and limits the font size', async () => {
    render(<CodeStudio locale="en" />)
    const larger = screen.getByRole('button', { name: 'Increase font size' })
    fireEvent.click(larger)
    expect(screen.getByText('15px')).toBeInTheDocument()
    expect((document.querySelector('.cs-editor') as HTMLElement).style.getPropertyValue('--cs-font-size')).toBe('15px')
    for (let i = 0; i < 30; i++) fireEvent.click(larger)
    expect(screen.getByText('28px')).toBeInTheDocument()
    expect(larger).toBeDisabled()
    // let the debounced linter finish inside act()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450))
    })
  })

  it('opens the search panel from the toolbar', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    await waitFor(() => expect(document.querySelector('.cm-search')).not.toBeNull())
  })

  it('uses Polish labels and search wording', async () => {
    render(<CodeStudio locale="pl" />)
    expect(screen.getByRole('button', { name: 'Otwórz' })).toBeInTheDocument()
    expect(screen.getByLabelText('Język')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    await waitFor(() => expect(document.querySelector('.cm-search')).not.toBeNull())
    expect(document.querySelector('.cm-search input[name="search"]')?.getAttribute('placeholder')).toBe('Szukaj')
  })

  it('exposes an accessible editor and tab list', () => {
    render(<CodeStudio locale="en" />)
    expect(screen.getByRole('tablist', { name: 'Open documents' })).toBeInTheDocument()
    expect(document.querySelector('.cm-content')?.getAttribute('aria-label')).toBe('Code editor: untitled-1.txt')
  })
})
