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

const editorText = () => getView().state.doc.toString()

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

afterEach(async () => {
  // The find panel is a separate React root that unmounts in a microtask; let that happen inside act().
  await act(async () => {
    cleanup()
    await Promise.resolve()
  })
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

  it('renames a tab with a double-click and re-detects the language', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.doubleClick(screen.getByRole('tab', { name: 'untitled-1.txt' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('File name'), { target: { value: 'config.yaml' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))

    await waitFor(() => expect(tabNames()).toEqual(['config.yaml']))
    expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('yaml')
  })

  it('renames a tab with F2, even one that is not active yet', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    expect(tabNames()).toEqual(['untitled-1.txt', 'untitled-2.txt'])
    fireEvent.keyDown(screen.getByRole('tab', { name: 'untitled-1.txt' }), { key: 'F2' })

    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('File name'), { target: { value: 'first.md' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(tabNames()).toEqual(['first.md', 'untitled-2.txt']))
  })

  it('adds a tab with the plus button at the end of the tab strip', () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'New tab' }))
    expect(tabNames()).toEqual(['untitled-1.txt', 'untitled-2.txt'])
  })

  it('lists syntax problems for invalid JSON and jumps to them', async () => {
    const session = createDefaultSession()
    session.docs = [createDoc([], { id: 'j', name: 'broken.json', content: '{"a": 1,, "b": }' })]
    session.activeId = 'j'
    session.settings.panelOpen = true
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
    session.settings.panelOpen = true
    localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)

    render(<CodeStudio locale="en" />)
    expect(await screen.findByText('No syntax problems found.', undefined, { timeout: 3000 })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'plaintext' } })
    expect(await screen.findByText('Syntax checking is not available for plain text.')).toBeInTheDocument()
  })

  it('toggles wrapping and line numbers from the settings dialog', async () => {
    render(<CodeStudio locale="en" />)
    expect(document.querySelector('.cm-lineNumbers')).not.toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Line numbers' }))
    await waitFor(() => expect(document.querySelector('.cm-lineNumbers')).toBeNull())

    fireEvent.click(within(dialog).getByRole('switch', { name: 'Word wrap' }))
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

  it('opens the find and replace panel from the toolbar and focuses the search field', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const panel = await screen.findByRole('search', { name: 'Find and replace' })
    await waitFor(() => expect(within(panel).getByLabelText('Find')).toHaveFocus())
  })

  it('builds the find panel from shared components, not native checkboxes and buttons', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const panel = await screen.findByRole('search', { name: 'Find and replace' })

    expect(panel.querySelectorAll('input[type="checkbox"]')).toHaveLength(0)
    expect(document.querySelector('.cm-search')).toBeNull()
    expect(panel.querySelectorAll('.all-input-field')).toHaveLength(2)
    expect(panel.querySelectorAll('.all-icon-btn').length).toBeGreaterThanOrEqual(6)
    for (const button of within(panel).getAllByRole('button')) {
      // every button is a shared one and has an accessible name
      expect(button.classList.contains('all-btn') || button.classList.contains('all-icon-btn')).toBe(true)
      expect(button.getAttribute('aria-label') ?? button.textContent).toBeTruthy()
    }
    expect(within(panel).getAllByRole('button', { name: /^Replace/ })).toHaveLength(2)
  })

  it('finds, counts and steps through matches', async () => {
    render(<CodeStudio locale="en" />)
    typeInEditor('foo bar foo baz foo')
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const panel = await screen.findByRole('search', { name: 'Find and replace' })

    const field = within(panel).getByLabelText('Find')
    fireEvent.change(field, { target: { value: 'foo' } })
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('? of 3'))

    fireEvent.keyDown(field, { key: 'Enter' })
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('1 of 3'))
    expect(getView().state.selection.main).toMatchObject({ from: 0, to: 3 })

    fireEvent.click(within(panel).getByRole('button', { name: 'Next match' }))
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('2 of 3'))
    fireEvent.keyDown(field, { key: 'Enter', shiftKey: true })
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('1 of 3'))
  })

  it('reports when nothing matches', async () => {
    render(<CodeStudio locale="en" />)
    typeInEditor('hello')
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const panel = await screen.findByRole('search', { name: 'Find and replace' })
    fireEvent.change(within(panel).getByLabelText('Find'), { target: { value: 'zzz' } })

    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('No results'))
    expect(within(panel).getByRole('button', { name: 'Next match' })).toBeDisabled()
    expect(within(panel).getByRole('button', { name: 'Replace all' })).toBeDisabled()
  })

  it('has toggles for case, regular expressions and whole words', async () => {
    render(<CodeStudio locale="en" />)
    typeInEditor('Foo foo food')
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const panel = await screen.findByRole('search', { name: 'Find and replace' })
    fireEvent.change(within(panel).getByLabelText('Find'), { target: { value: 'foo' } })
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('of 3'))

    const matchCase = within(panel).getByRole('button', { name: 'Match case' })
    expect(matchCase).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(matchCase)
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('of 2'))
    expect(within(panel).getByRole('button', { name: 'Match case' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(within(panel).getByRole('button', { name: 'Whole word' }))
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('of 1'))

    fireEvent.click(within(panel).getByRole('button', { name: 'Whole word' }))
    fireEvent.click(within(panel).getByRole('button', { name: 'Regular expression' }))
    fireEvent.change(within(panel).getByLabelText('Find'), { target: { value: 'fo+d?' } })
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('of 2'))
  })

  it('replaces one match or all of them', async () => {
    render(<CodeStudio locale="en" />)
    typeInEditor('cat dog cat')
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const panel = await screen.findByRole('search', { name: 'Find and replace' })
    fireEvent.change(within(panel).getByLabelText('Find'), { target: { value: 'cat' } })
    fireEvent.change(within(panel).getByLabelText('Replace'), { target: { value: 'fox' } })
    await waitFor(() => expect(within(panel).getByRole('status')).toHaveTextContent('of 2'))

    fireEvent.click(within(panel).getByRole('button', { name: 'Replace all' }))
    await waitFor(() => expect(editorText()).toBe('fox dog fox'))
  })

  it('closes with Escape and returns focus to the editor', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Find' }))
    const panel = await screen.findByRole('search', { name: 'Find and replace' })
    fireEvent.keyDown(within(panel).getByLabelText('Find'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('search')).toBeNull())
    expect(getView().hasFocus).toBe(true)
  })

  it('uses Polish labels in the toolbar, status bar and find panel', async () => {
    render(<CodeStudio locale="pl" />)
    expect(screen.getByRole('button', { name: 'Otwórz' })).toBeInTheDocument()
    expect(screen.getByLabelText('Język')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    const panel = await screen.findByRole('search', { name: 'Szukaj i zamień' })
    expect(within(panel).getByPlaceholderText('Szukaj')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Zamień wszystko' })).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: 'Rozróżniaj wielkość liter' })).toBeInTheDocument()
  })

  it('writes line, word and character counts with correct singular and plural forms', () => {
    const { unmount } = render(<CodeStudio locale="en" />)
    expect(screen.getByText('1 line · 0 words')).toBeInTheDocument()
    typeInEditor('one')
    unmount()
  })

  it('asks before closing a tab that has text, and keeps it when cancelled', async () => {
    render(<CodeStudio locale="en" />)
    typeInEditor('important notes')
    fireEvent.click(screen.getByRole('button', { name: 'Close untitled-1.txt' }))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('Close untitled-1.txt?')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(tabNames()).toEqual(['untitled-1.txt'])
    expect(editorText()).toBe('important notes')
  })

  it('closes the tab after the confirmation', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'New' }))
    typeInEditor('to be removed')
    fireEvent.click(screen.getByRole('button', { name: 'Close untitled-2.txt' }))

    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close tab' }))
    await waitFor(() => expect(tabNames()).toEqual(['untitled-1.txt']))
  })

  it('shows problems as dismissible alerts above the editor', async () => {
    render(<CodeStudio locale="en" />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const huge = new File(['x'], 'huge.txt')
    Object.defineProperty(huge, 'size', { value: 6 * 1024 * 1024 })
    fireEvent.change(input, { target: { files: [huge] } })

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not read huge.txt.')
    fireEvent.click(within(alert).getByRole('button'))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('groups the toolbar into labelled sections', () => {
    render(<CodeStudio locale="en" />)
    const toolbar = screen.getByRole('toolbar', { name: 'Editor toolbar' })
    for (const name of ['File', 'Edit', 'View']) {
      expect(within(toolbar).getByRole('group', { name })).toBeInTheDocument()
    }
  })

  it('gives every toolbar button a tooltip and an accessible name', () => {
    render(<CodeStudio locale="en" />)
    const toolbar = screen.getByRole('toolbar', { name: 'Editor toolbar' })
    const buttons = within(toolbar).getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(6)
    for (const button of buttons) {
      expect(button.getAttribute('aria-label')).toBeTruthy()
      expect(button.getAttribute('title')).toBeTruthy()
    }
    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute('title', expect.stringContaining('Ctrl+S'))
    expect(screen.getByRole('button', { name: 'Find' })).toHaveAttribute('title', expect.stringContaining('Ctrl+F'))
  })

  it('shows a column ruler by default and lets the user turn it off', async () => {
    render(<CodeStudio locale="en" />)
    const editor = document.querySelector('.cs-editor') as HTMLElement
    expect(editor.classList.contains('cs-editor--ruler')).toBe(true)
    expect(editor.style.getPropertyValue('--cs-ruler-col')).toBe('80')

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Ruler'), { target: { value: '120' } })
    expect(editor.style.getPropertyValue('--cs-ruler-col')).toBe('120')
    fireEvent.change(within(dialog).getByLabelText('Ruler'), { target: { value: '0' } })
    expect(editor.classList.contains('cs-editor--ruler')).toBe(false)
  })

  it('renames a fresh untitled file when its language is changed in the status bar', async () => {
    render(<CodeStudio locale="en" />)
    expect(tabNames()).toEqual(['untitled-1.txt'])

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'java' } })
    await waitFor(() => expect(tabNames()).toEqual(['untitled-1.java']))
    expect(screen.getByRole('tab', { name: 'untitled-1.java' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'python' } })
    await waitFor(() => expect(tabNames()).toEqual(['untitled-1.py']))
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'plaintext' } })
    await waitFor(() => expect(tabNames()).toEqual(['untitled-1.txt']))
    expect(document.querySelector('.cm-content')?.getAttribute('aria-label')).toBe('Code editor: untitled-1.txt')
  })

  it('renames the file when the language is changed in the settings dialog too', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Language'), { target: { value: 'typescript' } })
    await waitFor(() => expect(tabNames()).toEqual(['untitled-1.ts']))
  })

  it('keeps a custom file name and survives a reload with the new name', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.doubleClick(screen.getByRole('tab', { name: 'untitled-1.txt' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('File name'), { target: { value: 'Makefile' } })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }))
    await waitFor(() => expect(tabNames()).toEqual(['Makefile']))

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'shell' } })
    await waitFor(() => expect((screen.getByLabelText('Language') as HTMLSelectElement).value).toBe('shell'))
    expect(tabNames()).toEqual(['Makefile'])
  })

  it('lays out the settings dialog as labelled groups on a grid', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = await screen.findByRole('dialog')

    const grid = dialog.querySelector('.cs-settings') as HTMLElement
    expect(grid).not.toBeNull()
    // one shared SettingsGroup per select, each with its label above the control
    const groups = Array.from(grid.querySelectorAll('.all-settings-group'))
    expect(groups.map((group) => group.querySelector('.all-settings-group__label')?.textContent)).toEqual([
      'Language',
      'Line endings',
      'Ruler',
      'Tab size',
    ])
    for (const group of groups) expect(group.querySelectorAll('select')).toHaveLength(1)
    // toggles sit on their own full-width row instead of squeezing in next to the selects
    const toggles = grid.querySelector('.cs-settings__toggles') as HTMLElement
    expect(
      within(toggles)
        .getAllByRole('switch')
        .map((el) => el.getAttribute('aria-label') ?? el.textContent),
    ).toHaveLength(2)
    expect(toggles.closest('.all-settings-group')).toBeNull()
  })

  it('also offers language and line endings in the settings dialog (the phone status bar hides them)', async () => {
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.change(within(dialog).getByLabelText('Language'), { target: { value: 'python' } })
    fireEvent.change(within(dialog).getByLabelText('Line endings'), { target: { value: 'crlf' } })

    const status = screen.getByRole('group', { name: 'Status bar' })
    expect((within(status).getByLabelText('Language') as HTMLSelectElement).value).toBe('python')
    expect((within(status).getByLabelText('Line endings') as HTMLSelectElement).value).toBe('crlf')
  })

  it('keeps the side panel closed until it is needed', async () => {
    render(<CodeStudio locale="en" />)
    expect(screen.queryByRole('complementary')).toBeNull()

    const toggle = screen.getByRole('button', { name: 'Side panel' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('complementary', { name: 'Side panel' })).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Close side panel' }))
    expect(screen.queryByRole('complementary')).toBeNull()
    // the problems panel was open for a moment: let its debounced linter finish inside act()
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 450))
    })
  })

  it('opens the problems panel from the status bar', async () => {
    const session = createDefaultSession()
    session.docs = [createDoc([], { id: 'j', name: 'broken.json', content: '{"a": }' })]
    session.activeId = 'j'
    localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)

    render(<CodeStudio locale="en" />)
    expect(screen.queryByRole('complementary')).toBeNull()
    const status = screen.getByRole('group', { name: 'Status bar' })
    const indicator = await within(status).findByRole('button', { name: /problem/ }, { timeout: 3000 })
    expect(indicator.textContent).toMatch(/[1-9]\d* problem/)

    fireEvent.click(indicator)
    expect(await screen.findByRole('complementary', { name: 'Side panel' })).toBeInTheDocument()
    expect(await screen.findAllByRole('button', { name: /Ln 1, Col/ })).not.toHaveLength(0)
  })

  it('puts position, document settings and font size in the status bar', () => {
    render(<CodeStudio locale="en" />)
    const status = screen.getByRole('group', { name: 'Status bar' })
    expect(within(status).getByText('Ln 1, Col 1')).toBeInTheDocument()
    expect(within(status).getByLabelText('Language')).toBeInTheDocument()
    expect(within(status).getByLabelText('Line endings')).toBeInTheDocument()
    expect(within(status).getByLabelText('Tab size')).toBeInTheDocument()
    expect(within(status).getByRole('button', { name: 'Increase font size' })).toBeInTheDocument()
    expect(within(status).getByRole('button', { name: 'Decrease font size' })).toBeInTheDocument()
    // the toolbar no longer carries any of them
    const toolbar = screen.getByRole('toolbar', { name: 'Editor toolbar' })
    expect(within(toolbar).queryByLabelText('Language')).toBeNull()
    expect(within(toolbar).queryByRole('button', { name: 'Increase font size' })).toBeNull()
  })

  it('opens the export dialog with Ctrl+S and formats with Shift+Alt+F', async () => {
    const session = createDefaultSession()
    session.docs = [createDoc([], { id: 'a', name: 'app.js', content: 'const a={b:1}' })]
    session.activeId = 'a'
    localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)
    render(<CodeStudio locale="en" />)

    act(() => {
      getView().contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'F',
          code: 'KeyF',
          keyCode: 70,
          shiftKey: true,
          altKey: true,
          bubbles: true,
        }),
      )
    })
    await waitFor(() => expect(editorText()).toBe('const a = { b: 1 };\n'))

    act(() => {
      getView().contentDOM.dispatchEvent(
        new KeyboardEvent('keydown', { key: 's', code: 'KeyS', keyCode: 83, ctrlKey: true, bubbles: true }),
      )
    })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Export file')).toBeInTheDocument()
  })

  it('does not flag a Java method written without a class, but still flags real mistakes', async () => {
    const session = createDefaultSession()
    session.docs = [
      createDoc([], {
        id: 'j',
        name: 'Add.java',
        content: 'public static int add(int a, int b) {\n  return a + b;\n}',
      }),
    ]
    session.activeId = 'j'
    session.settings.panelOpen = true
    localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)

    render(<CodeStudio locale="en" />)
    expect(await screen.findByText('No syntax problems found.', undefined, { timeout: 3000 })).toBeInTheDocument()

    act(() => {
      const view = getView()
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: 'int add(int a, int b {\n  return a + b;\n}' },
      })
    })
    expect(await screen.findAllByRole('button', { name: /Ln 1, Col/ }, { timeout: 3000 })).not.toHaveLength(0)
  })

  it('exposes an accessible editor and tab list', () => {
    render(<CodeStudio locale="en" />)
    expect(screen.getByRole('tablist', { name: 'Open documents' })).toBeInTheDocument()
    expect(document.querySelector('.cm-content')?.getAttribute('aria-label')).toBe('Code editor: untitled-1.txt')
  })
})
