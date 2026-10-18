import React from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { CodeStudio } from '../CodeStudio'
import { IMAGE_OPTIONS_KEY } from '../components/ImagePanel'
import { SESSION_STORAGE_KEY, createDefaultSession, createDoc, serializeSession } from '../utils/documentEngine'

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
  const view = EditorView.findFromDOM(document.querySelector('.cm-editor') as HTMLElement)
  if (!view) throw new Error('editor view not found')
  return view
}

const editorText = () => getView().state.doc.toString()

function seed(name: string, content: string) {
  const session = createDefaultSession()
  session.docs = [createDoc([], { id: 'seed', name, content })]
  session.activeId = 'seed'
  session.settings.panelOpen = true
  localStorage.setItem(SESSION_STORAGE_KEY, serializeSession(session)!)
}

/** The Problems / Preview / Image switch is the shared segmented control (buttons with aria-pressed). */
function sideTab(name: string, group = 'Side panel') {
  return within(screen.getByRole('group', { name: group })).queryByRole('button', { name })
}

/** Lets the debounced linter and deferred preview finish inside act(), so late updates do not leak out of a test. */
async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450))
  })
}

function select(from: number, to: number) {
  act(() => {
    getView().dispatch({ selection: { anchor: from, head: to } })
  })
}

/** jsdom has no canvas: provide just enough for measuring, painting and PNG export. */
function installCanvasMock() {
  const gradient = { addColorStop: vi.fn() }
  const context = {
    scale: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    rect: vi.fn(),
    roundRect: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    measureText: () => ({ width: 8 }),
    createLinearGradient: () => gradient,
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => context) as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (callback: BlobCallback) {
    callback(new Blob(['png-bytes'], { type: 'image/png' }))
  })
  let counter = 0
  const created: Blob[] = []
  Object.assign(URL, {
    createObjectURL: vi.fn((blob: Blob) => {
      created.push(blob)
      return `blob:test-${++counter}`
    }),
    revokeObjectURL: vi.fn(),
  })
  return { context, created }
}

function captureDownloads() {
  const names: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    names.push(this.download)
  })
  return names
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (globalThis as { ClipboardItem?: unknown }).ClipboardItem
})

describe('Format and Minify', () => {
  it('disables Format for languages without a formatter', () => {
    render(<CodeStudio locale="en" />)
    const button = screen.getByRole('button', { name: 'Format' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'No formatter for this language')
  })

  it('formats the document in one undoable step', async () => {
    seed('app.js', 'const a={b:1};function f(x){return x+1}')
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Format' }))
    await waitFor(() => expect(editorText()).toBe('const a = { b: 1 };\nfunction f(x) {\n  return x + 1;\n}\n'))

    act(() => {
      // Ctrl+Z equivalent through the editor's history
      const view = getView()
      view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    })
    await waitFor(() => expect(editorText()).toBe('const a={b:1};function f(x){return x+1}'))
  })

  it('formats with the selected tab size', async () => {
    seed(
      'data.json',
      '{"a":{"b":1,"c":"a long string to make prettier break this object onto several lines","d":[1,2,3]}}',
    )
    render(<CodeStudio locale="en" />)
    fireEvent.change(screen.getByLabelText('Tab size'), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Format' }))
    await waitFor(() => expect(editorText()).toContain('\n    "a"'))
  })

  it('reports invalid code and leaves the text alone', async () => {
    seed('broken.js', 'function (')
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Format' }))
    expect(await screen.findByText(/^Could not format:/)).toBeInTheDocument()
    expect(editorText()).toBe('function (')
  })

  it('minifies JSON, and only offers it for JSON', async () => {
    seed('data.json', '{\n  "a": [1, 2],\n  "b": null\n}')
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Minify' }))
    await waitFor(() => expect(editorText()).toBe('{"a":[1,2],"b":null}'))

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'javascript' } })
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Minify' })).toBeNull())
  })

  it('does not minify invalid JSON', async () => {
    seed('data.json', '{"a":')
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Minify' }))
    expect(await screen.findByText(/^Could not format:/)).toBeInTheDocument()
    expect(editorText()).toBe('{"a":')
  })
})

describe('Markdown', () => {
  it('opens with the preview for Markdown documents only', async () => {
    seed('notes.md', '# Hello\n\nSome **bold** text')
    render(<CodeStudio locale="en" />)
    expect(
      within(screen.getByRole('group', { name: 'Side panel' })).getByRole('button', { name: 'Preview', pressed: true }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Hello' })).toBeInTheDocument()
    expect(within(document.querySelector('.cs-md') as HTMLElement).getByText('bold').tagName).toBe('STRONG')

    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'plaintext' } })
    await waitFor(() => expect(sideTab('Preview')).toBeNull())
    expect(
      within(screen.getByRole('group', { name: 'Side panel' })).getByRole('button', {
        name: 'Problems',
        pressed: true,
      }),
    ).toBeInTheDocument()
  })

  it('updates the preview while typing', async () => {
    seed('notes.md', '# One')
    render(<CodeStudio locale="en" />)
    await screen.findByRole('heading', { name: 'One' })
    act(() => {
      const view = getView()
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: '# Two' } })
    })
    expect(await screen.findByRole('heading', { name: 'Two' }, { timeout: 2000 })).toBeInTheDocument()
  })

  it('sanitizes the preview', async () => {
    seed('evil.md', 'hello\n\n<script>window.__pwned = true</script>\n\n<img src=x onerror="window.__pwned = true">')
    render(<CodeStudio locale="en" />)
    await waitFor(() => expect(document.querySelector('.cs-md')?.textContent).toContain('hello'))
    expect(document.querySelector('.cs-md script')).toBeNull()
    expect(document.querySelector('.cs-md [onerror]')).toBeNull()
    expect((window as { __pwned?: boolean }).__pwned).toBeUndefined()
  })

  it('shows the formatting toolbar only for Markdown', () => {
    seed('notes.md', 'text')
    const { unmount } = render(<CodeStudio locale="en" />)
    expect(screen.getByRole('toolbar', { name: 'Markdown formatting' })).toBeInTheDocument()
    unmount()

    seed('code.js', 'text')
    render(<CodeStudio locale="en" />)
    expect(screen.queryByRole('toolbar', { name: 'Markdown formatting' })).toBeNull()
  })

  it('inserts syntax around the selection with toolbar buttons', async () => {
    seed('notes.md', 'make this bold')
    render(<CodeStudio locale="en" />)
    select(10, 14)
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(editorText()).toBe('make this **bold**')
    // the new text stays selected, so a second click toggles it off again
    fireEvent.click(screen.getByRole('button', { name: 'Bold' }))
    expect(editorText()).toBe('make this bold')
    await settle()
  })

  it('inserts block syntax at the cursor', async () => {
    seed('notes.md', 'item one\nitem two')
    render(<CodeStudio locale="en" />)
    select(0, 17)
    fireEvent.click(screen.getByRole('button', { name: 'Numbered list' }))
    expect(editorText()).toBe('1. item one\n2. item two')
    fireEvent.click(screen.getByRole('button', { name: 'Table' }))
    expect(editorText()).toContain('| --- | --- | --- |')
    await settle()
  })

  it('undoes a toolbar action in one step', async () => {
    seed('notes.md', 'word')
    render(<CodeStudio locale="en" />)
    select(0, 4)
    fireEvent.click(screen.getByRole('button', { name: 'Italic' }))
    expect(editorText()).toBe('*word*')
    act(() => {
      getView().contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))
    })
    expect(editorText()).toBe('word')
    await settle()
  })

  it('switches between the side panels', async () => {
    seed('notes.md', '# T')
    render(<CodeStudio locale="en" />)
    fireEvent.click(sideTab('Image')!)
    expect(sideTab('Image')).toHaveAttribute('aria-pressed', 'true')
    expect(sideTab('Preview')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(sideTab('Preview')!)
    expect(sideTab('Preview')).toHaveAttribute('aria-pressed', 'true')
    await settle()
  })
})

describe('Code as image', () => {
  async function openImageTab() {
    fireEvent.click(sideTab('Image')!)
    return await screen.findByRole('img', { name: 'Preview of the code image' }, { timeout: 3000 })
  }

  it('shows a preview rendered on this device', async () => {
    installCanvasMock()
    seed('main.js', 'const answer = 42')
    render(<CodeStudio locale="en" />)
    const preview = await openImageTab()
    expect(preview.getAttribute('src')).toMatch(/^blob:test-/)
  })

  it('asks for code when there is nothing to draw', async () => {
    installCanvasMock()
    render(<CodeStudio locale="en" />)
    fireEvent.click(screen.getByRole('button', { name: 'Side panel' }))
    fireEvent.click(sideTab('Image')!)
    expect(
      await screen.findByText('Write or select some code to preview it as an image.', undefined, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled()
  })

  it('refuses very long snippets', async () => {
    installCanvasMock()
    seed('long.txt', Array.from({ length: 450 }, (_, i) => `line ${i}`).join('\n'))
    render(<CodeStudio locale="en" />)
    fireEvent.click(sideTab('Image')!)
    expect(
      await screen.findByText(/Too many lines for an image \(limit 400\)/, undefined, { timeout: 3000 }),
    ).toBeInTheDocument()
  })

  it('downloads a PNG named after the file', async () => {
    const { created } = installCanvasMock()
    const downloads = captureDownloads()
    seed('main.js', 'const answer = 42')
    render(<CodeStudio locale="en" />)
    await openImageTab()

    fireEvent.click(screen.getByRole('button', { name: 'Download PNG' }))
    await waitFor(() => expect(downloads).toEqual(['main.png']))
    expect(created.at(-1)!.type).toBe('image/png')
  })

  it('downloads an SVG with the highlighted code', async () => {
    const { created } = installCanvasMock()
    const downloads = captureDownloads()
    seed('main.js', 'const a = "<b>"')
    render(<CodeStudio locale="en" />)
    await openImageTab()

    fireEvent.click(screen.getByRole('button', { name: 'Download SVG' }))
    await waitFor(() => expect(downloads).toEqual(['main.svg']))
    const svg = await created.at(-1)!.text()
    expect(svg.startsWith('<svg')).toBe(true)
    expect(svg).toContain('>const<')
    expect(svg).toContain('&lt;b&gt;')
    expect(svg).not.toContain('<b>')
  })

  it('uses only the selection, keeping its line numbers', async () => {
    const { created } = installCanvasMock()
    captureDownloads()
    seed('main.js', 'let first = 1\nlet second = 2\nlet third = 3')
    render(<CodeStudio locale="en" />)
    select(14, 27) // "let second = 2"
    fireEvent.click(sideTab('Image')!)
    await screen.findByRole('img', { name: 'Preview of the code image' }, { timeout: 3000 })

    fireEvent.click(screen.getByRole('switch', { name: 'Line numbers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Download SVG' }))
    await waitFor(() => expect(created.length).toBeGreaterThan(0))
    await waitFor(async () => expect(await created.at(-1)!.text()).toContain('<svg'))
    const svg = await created.at(-1)!.text()
    expect(svg).toContain('second')
    expect(svg).not.toContain('first')
    expect(svg).not.toContain('third')
    expect(svg).toContain('>2<')
  })

  it('can draw the whole document instead of the selection', async () => {
    const { created } = installCanvasMock()
    captureDownloads()
    seed('main.js', 'let first = 1\nlet second = 2')
    render(<CodeStudio locale="en" />)
    select(14, 27)
    fireEvent.click(sideTab('Image')!)
    await screen.findByRole('img', { name: 'Preview of the code image' }, { timeout: 3000 })
    fireEvent.click(screen.getByRole('switch', { name: /Only the selection/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Download SVG' }))
    await waitFor(async () => expect(await created.at(-1)!.text()).toContain('first'))
  })

  it('copies the PNG to the clipboard', async () => {
    installCanvasMock()
    const write = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { write }, configurable: true })
    ;(globalThis as { ClipboardItem?: unknown }).ClipboardItem = class {
      constructor(public items: Record<string, unknown>) {}
    }
    seed('main.js', 'const answer = 42')
    render(<CodeStudio locale="en" />)
    await openImageTab()

    fireEvent.click(screen.getByRole('button', { name: 'Copy image' }))
    expect(await screen.findByText('Image copied to the clipboard.')).toBeInTheDocument()
    const item = write.mock.calls[0][0][0] as { items: Record<string, Promise<Blob>> }
    expect(Object.keys(item.items)).toEqual(['image/png'])
    expect((await item.items['image/png']).type).toBe('image/png')
  })

  it('explains when the browser cannot copy images', async () => {
    installCanvasMock()
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    seed('main.js', 'const answer = 42')
    render(<CodeStudio locale="en" />)
    await openImageTab()
    fireEvent.click(screen.getByRole('button', { name: 'Copy image' }))
    expect(await screen.findByText(/cannot copy images/)).toBeInTheDocument()
  })

  it('remembers the options', async () => {
    installCanvasMock()
    seed('main.js', 'const answer = 42')
    const { unmount } = render(<CodeStudio locale="en" />)
    await openImageTab()
    fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'mono' } })
    fireEvent.change(screen.getByLabelText('Scale'), { target: { value: '3' } })
    expect(JSON.parse(localStorage.getItem(IMAGE_OPTIONS_KEY)!)).toMatchObject({ theme: 'mono', scale: 3 })
    unmount()

    render(<CodeStudio locale="en" />)
    fireEvent.click(sideTab('Image')!)
    expect((screen.getByLabelText('Theme') as HTMLSelectElement).value).toBe('mono')
    expect((screen.getByLabelText('Scale') as HTMLSelectElement).value).toBe('3')
  })

  it('disables the outer background when there is no frame', async () => {
    installCanvasMock()
    seed('main.js', 'x')
    render(<CodeStudio locale="en" />)
    await openImageTab()
    fireEvent.change(screen.getByLabelText('Frame'), { target: { value: '0' } })
    expect(screen.getByLabelText('Background')).toBeDisabled()
  })

  it('is available in Polish', async () => {
    installCanvasMock()
    seed('main.js', 'x')
    render(<CodeStudio locale="pl" />)
    fireEvent.click(sideTab('Obraz', 'Panel boczny')!)
    expect(await screen.findByRole('img', { name: 'Podgląd obrazu z kodem' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pobierz PNG' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Formatuj' })).toBeInTheDocument()
    const panel = screen.getByRole('region', { name: 'Kod jako obraz' })
    expect(within(panel).getByLabelText('Motyw')).toBeInTheDocument()
  })
})
