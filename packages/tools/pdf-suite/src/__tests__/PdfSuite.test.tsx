import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import type { PdfPageItem } from '../types'

// The PDF engine (pdf-lib / pdf.js) is mocked: these tests verify what the UI asks it to build.
const engine = vi.hoisted(() => ({
  loadPdfInfo: vi.fn(),
  mergePdfs: vi.fn(),
  assemblePdfFromPages: vi.fn(),
  renderPdfThumbnails: vi.fn(),
  renderPdfPagePreview: vi.fn(),
  imagesToPdf: vi.fn(),
  signPdf: vi.fn(),
}))
vi.mock('../utils/pdfEngine', () => engine)

import { PdfSuite } from '../PdfSuite'

function makePdf(name: string): File {
  return new File([new Uint8Array([37, 80, 68, 70])], name, { type: 'application/pdf' })
}

function makePages(fileName: string, fileId: string, count: number): PdfPageItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${fileId}-p${i}`,
    fileId,
    fileName,
    pageIndex: i,
    displayNumber: i + 1,
    rotation: 0,
    selected: true,
    thumbnailUrl: `data:image/jpeg;base64,thumb-${fileName}-${i}`,
    aspectRatio: 1 / 1.414,
  }))
}

async function addFiles(files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  expect(input).not.toBeNull()
  fireEvent.change(input, { target: { files } })
}

function pageCards(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.pdf-page-card'))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(window, 'alert').mockImplementation(() => {})

  // loadPdfInfo gets the id the UI assigned to the file, and must use it on every page
  engine.loadPdfInfo.mockImplementation(async (file: File, fileId: string) => ({
    pageCount: 3,
    pages: makePages(file.name, fileId, 3),
  }))
  engine.assemblePdfFromPages.mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
  engine.renderPdfThumbnails.mockResolvedValue([])
  engine.renderPdfPagePreview.mockResolvedValue(null)

  URL.createObjectURL = vi.fn(() => 'blob:mock')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})

describe('PdfSuite: demo removal', () => {
  it('does not offer a demo document on the upload screen', () => {
    render(<PdfSuite locale="en" />)
    expect(document.getElementById('pdf-browse-btn')).not.toBeNull()
    expect(document.getElementById('pdf-demo-btn')).toBeNull()
    expect(screen.queryByText(/demo/i)).toBeNull()
  })
})

describe('PdfSuite: export only selected pages', () => {
  it('exports only the selected pages, in grid order', async () => {
    render(<PdfSuite locale="en" />)
    await addFiles([makePdf('doc.pdf')])
    await waitFor(() => expect(pageCards()).toHaveLength(3))

    fireEvent.click(pageCards()[1]) // deselect page 2
    expect(pageCards()[1].className).toContain('pdf-page-card--deselected')

    fireEvent.click(document.getElementById('pdf-export-btn')!)
    await waitFor(() => expect(engine.assemblePdfFromPages).toHaveBeenCalledTimes(1))

    const [sources, pages] = engine.assemblePdfFromPages.mock.calls[0]
    expect(pages.map((p: { pageIndex: number }) => p.pageIndex)).toEqual([0, 2])
    // every exported page must point at a source file that was handed over
    for (const p of pages as Array<{ fileId: string }>) expect(sources[p.fileId]).toBeInstanceOf(File)
  })

  it('exports only the selected pages when pages from several files are loaded ("Add more")', async () => {
    render(<PdfSuite locale="en" />)
    await addFiles([makePdf('first.pdf')])
    await waitFor(() => expect(pageCards()).toHaveLength(3))

    await addFiles([makePdf('second.pdf')])
    await waitFor(() => expect(pageCards()).toHaveLength(6))

    // keep only page 1 of the first file and page 3 of the second file
    const cards = pageCards()
    ;[1, 2, 3, 4].forEach((i) => fireEvent.click(cards[i]))
    expect(pageCards().filter((c) => c.className.includes('pdf-page-card--selected'))).toHaveLength(2)

    fireEvent.click(document.getElementById('pdf-export-btn')!)
    await waitFor(() => expect(engine.assemblePdfFromPages).toHaveBeenCalledTimes(1))

    const [sources, pages] = engine.assemblePdfFromPages.mock.calls[0] as [
      Record<string, File>,
      Array<{ fileId: string; pageIndex: number }>,
    ]
    expect(pages).toHaveLength(2)
    expect(pages.map((p) => p.pageIndex)).toEqual([0, 2])
    expect(sources[pages[0].fileId].name).toBe('first.pdf')
    expect(sources[pages[1].fileId].name).toBe('second.pdf')
    // the old behaviour merged whole files and ignored the selection
    expect(engine.mergePdfs).not.toHaveBeenCalled()
  })

  it('applies rotation and page order to the export', async () => {
    render(<PdfSuite locale="en" />)
    await addFiles([makePdf('doc.pdf')])
    await waitFor(() => expect(pageCards()).toHaveLength(3))

    // rotate page 1 by 90° and move it one place to the right
    const first = pageCards()[0]
    fireEvent.click(within(first).getByTitle(/rotate/i))
    fireEvent.click(within(first).getByTitle(/move right/i))

    fireEvent.click(document.getElementById('pdf-export-btn')!)
    await waitFor(() => expect(engine.assemblePdfFromPages).toHaveBeenCalled())

    const pages = engine.assemblePdfFromPages.mock.calls[0][1] as Array<{ pageIndex: number; rotation: number }>
    expect(pages.map((p) => p.pageIndex)).toEqual([1, 0, 2])
    expect(pages.map((p) => p.rotation)).toEqual([0, 90, 0])
  })

  it('refuses to export when nothing is selected', async () => {
    render(<PdfSuite locale="en" />)
    await addFiles([makePdf('doc.pdf')])
    await waitFor(() => expect(pageCards()).toHaveLength(3))

    fireEvent.click(document.getElementById('pdf-select-all-btn')!) // deselect all
    fireEvent.click(document.getElementById('pdf-export-btn')!)

    await waitFor(() => expect(window.alert).toHaveBeenCalled())
    expect(engine.assemblePdfFromPages).not.toHaveBeenCalled()
  })
})

describe('PdfSuite: full-screen page preview', () => {
  async function openEditor() {
    render(<PdfSuite locale="en" />)
    await addFiles([makePdf('doc.pdf')])
    await waitFor(() => expect(pageCards()).toHaveLength(3))
  }

  it('opens a preview for the clicked page without toggling its selection', async () => {
    await openEditor()
    const card = pageCards()[1]
    fireEvent.click(within(card).getByTitle('Full screen preview'))

    const image = (await screen.findByRole('dialog')).querySelector('#pdf-preview-image') as HTMLImageElement
    expect(image.getAttribute('src')).toContain('thumb-doc.pdf-1')
    expect(screen.getByRole('dialog').textContent).toContain('Page 2 / 3')
    // opening the preview must not change the selection
    expect(pageCards()[1].className).toContain('pdf-page-card--selected')
  })

  it('navigates between pages with the buttons and arrow keys, and stops at the ends', async () => {
    await openEditor()
    fireEvent.click(within(pageCards()[0]).getByTitle('Full screen preview'))
    const dialog = await screen.findByRole('dialog')

    expect(dialog.textContent).toContain('Page 1 / 3')
    expect((document.getElementById('pdf-preview-prev-btn') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(document.getElementById('pdf-preview-next-btn')!)
    expect(screen.getByRole('dialog').textContent).toContain('Page 2 / 3')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByRole('dialog').textContent).toContain('Page 3 / 3')
    expect((document.getElementById('pdf-preview-next-btn') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog').textContent).toContain('Page 2 / 3')
  })

  it('can include/exclude the previewed page and closes with Escape', async () => {
    await openEditor()
    fireEvent.click(within(pageCards()[2]).getByTitle('Full screen preview'))
    await screen.findByRole('dialog')

    fireEvent.click(document.getElementById('pdf-preview-toggle-btn')!)
    expect(pageCards()[2].className).toContain('pdf-page-card--deselected')
    expect(document.getElementById('pdf-preview-toggle-btn')!.textContent).toContain('Include in PDF')

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('swaps in the sharper render when it is ready', async () => {
    engine.renderPdfPagePreview.mockResolvedValue('data:image/jpeg;base64,HIRES')
    await openEditor()
    fireEvent.click(within(pageCards()[0]).getByTitle('Full screen preview'))

    await waitFor(() => {
      const img = document.getElementById('pdf-preview-image') as HTMLImageElement
      expect(img.getAttribute('src')).toBe('data:image/jpeg;base64,HIRES')
    })
  })
})

describe('PdfSuite: signing keeps the page selection', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'fonts', {
      value: { load: vi.fn().mockResolvedValue([]), ready: Promise.resolve(), check: vi.fn().mockReturnValue(true) },
      configurable: true,
      writable: true,
    })
    HTMLCanvasElement.prototype.getContext = vi.fn().mockImplementation(() => ({
      fillStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn().mockReturnValue({ width: 150 }),
      getImageData: vi.fn((_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4).fill(255),
        width: w,
        height: h,
      })),
      createImageData: vi.fn((w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
      })),
      putImageData: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,AAAA')
    engine.signPdf.mockResolvedValue(new Blob(['signed'], { type: 'application/pdf' }))
  })

  it('signs the page chosen in the grid and leaves deselected pages deselected', async () => {
    render(<PdfSuite locale="en" />)
    await addFiles([makePdf('doc.pdf')])
    await waitFor(() => expect(pageCards()).toHaveLength(3))

    fireEvent.click(pageCards()[1]) // deselect page 2

    fireEvent.click(document.getElementById('pdf-sign-dialog-btn')!)
    fireEvent.click(await screen.findByRole('button', { name: /type/i }))
    fireEvent.click(document.getElementById('sig-proceed-btn')!)
    const applyBtn = await waitFor(() => {
      const el = document.getElementById('sig-apply-btn')
      expect(el).not.toBeNull()
      return el as HTMLElement
    })
    fireEvent.click(applyBtn)

    await waitFor(() => expect(engine.signPdf).toHaveBeenCalledTimes(1))
    // default target is page 1: signed in its own source file, at that file's page index 0
    expect(engine.signPdf.mock.calls[0][0].name).toBe('doc.pdf')
    expect(engine.signPdf.mock.calls[0][2]).toBe(0)

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    // the selection survives the signing (it used to be reset to "everything selected")
    const classes = pageCards().map((c) => c.className)
    expect(classes[0]).toContain('pdf-page-card--selected')
    expect(classes[1]).toContain('pdf-page-card--deselected')
    expect(classes[2]).toContain('pdf-page-card--selected')

    fireEvent.click(document.getElementById('pdf-export-btn')!)
    await waitFor(() => expect(engine.assemblePdfFromPages).toHaveBeenCalled())
    const [sources, pages] = engine.assemblePdfFromPages.mock.calls[0] as [
      Record<string, File>,
      Array<{ fileId: string; pageIndex: number }>,
    ]
    expect(pages.map((p) => p.pageIndex)).toEqual([0, 2])
    // export uses the signed file
    expect(sources[pages[0].fileId].name).toBe('doc_signed.pdf')
  })
})
