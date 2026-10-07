import { describe, it, expect } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { mergePdfs, assemblePdfFromPages, imagesToPdf, signPdf } from '../utils/pdfEngine'

// Helper to create a minimal in-memory PDF Document for testing
async function createMockPdf(pageCount: number = 1, text: string = 'Test', width: number = 400): Promise<File> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([width, 600 + i])
    page.drawText(`${text} Page ${i + 1}`)
  }
  const bytes = await doc.save()
  return new File([bytes.buffer as ArrayBuffer], `mock_${pageCount}p.pdf`, { type: 'application/pdf' })
}

// Minimal 1x1 transparent PNG data URL for signature testing
const MOCK_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('PDF Suite pdfEngine', () => {
  describe('mergePdfs', () => {
    it('merges two separate PDFs into a single document with combined pages', async () => {
      const file1 = await createMockPdf(2, 'Doc 1')
      const file2 = await createMockPdf(3, 'Doc 2')

      const mergedBlob = await mergePdfs([file1, file2])
      expect(mergedBlob).toBeInstanceOf(Blob)
      expect(mergedBlob.type).toBe('application/pdf')

      const mergedArrayBuffer = await mergedBlob.arrayBuffer()
      const mergedDoc = await PDFDocument.load(mergedArrayBuffer)
      expect(mergedDoc.getPageCount()).toBe(5)
    })
  })

  describe('assemblePdfFromPages', () => {
    // Every mock page has a unique size: width = file width, height = 600 + page index.
    async function pageSizes(blob: Blob): Promise<Array<[number, number]>> {
      const doc = await PDFDocument.load(await blob.arrayBuffer())
      return doc.getPages().map((p) => [p.getWidth(), p.getHeight()] as [number, number])
    }

    it('extracts only the given pages, in the given order, with custom rotation', async () => {
      const source = await createMockPdf(4, 'Source')
      const result = await assemblePdfFromPages({ a: source }, [
        { fileId: 'a', pageIndex: 2, rotation: 180 },
        { fileId: 'a', pageIndex: 0, rotation: 90 },
      ])
      const doc = await PDFDocument.load(await result.arrayBuffer())

      expect(doc.getPageCount()).toBe(2)
      expect(doc.getPage(0).getHeight()).toBe(602) // original page 3
      expect(doc.getPage(0).getRotation().angle).toBe(180)
      expect(doc.getPage(1).getHeight()).toBe(600) // original page 1
      expect(doc.getPage(1).getRotation().angle).toBe(90)
    })

    it('combines pages from several source files, keeping only the requested ones', async () => {
      const a = await createMockPdf(3, 'A', 400)
      const b = await createMockPdf(2, 'B', 500)
      const result = await assemblePdfFromPages({ a, b }, [
        { fileId: 'b', pageIndex: 1, rotation: 0 },
        { fileId: 'a', pageIndex: 0, rotation: 0 },
        { fileId: 'a', pageIndex: 2, rotation: 270 },
        { fileId: 'b', pageIndex: 0, rotation: 0 },
      ])

      expect(await pageSizes(result)).toEqual([
        [500, 601],
        [400, 600],
        [400, 602],
        [500, 600],
      ])
      const doc = await PDFDocument.load(await result.arrayBuffer())
      expect(doc.getPage(2).getRotation().angle).toBe(270)
    })

    it('does not include pages that are not listed (deselected pages are dropped)', async () => {
      const a = await createMockPdf(5, 'A')
      const result = await assemblePdfFromPages({ a }, [{ fileId: 'a', pageIndex: 3, rotation: 0 }])
      expect(await pageSizes(result)).toEqual([[400, 603]])
    })

    it('throws a clear error when a source file is missing', async () => {
      await expect(assemblePdfFromPages({}, [{ fileId: 'ghost', pageIndex: 0, rotation: 0 }])).rejects.toThrow(/ghost/)
    })
  })

  describe('imagesToPdf', () => {
    it('converts PNG image files to pages in a new PDF document', async () => {
      // 1x1 PNG bytes
      const base64Png =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const binaryString = atob(base64Png)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const imgFile = new File([bytes], 'test.png', { type: 'image/png' })

      const pdfBlob = await imagesToPdf([imgFile])
      const buffer = await pdfBlob.arrayBuffer()
      const doc = await PDFDocument.load(buffer)
      expect(doc.getPageCount()).toBe(1)
    })
  })

  describe('signPdf', () => {
    it('embeds signature PNG onto target page with preset position', async () => {
      const sourcePdf = await createMockPdf(2, 'Contract')
      const signedBlob = await signPdf(sourcePdf, MOCK_PNG_DATA_URL, 1, 'bottom-right')

      expect(signedBlob).toBeInstanceOf(Blob)
      const buffer = await signedBlob.arrayBuffer()
      const doc = await PDFDocument.load(buffer)
      expect(doc.getPageCount()).toBe(2)
    })

    it('embeds signature PNG with custom manual percentage coordinates', async () => {
      const sourcePdf = await createMockPdf(3, 'MultiPageContract')
      const signedBlob = await signPdf(sourcePdf, MOCK_PNG_DATA_URL, 2, 'custom', { xPercent: 42, yPercent: 65 })

      expect(signedBlob).toBeInstanceOf(Blob)
      const buffer = await signedBlob.arrayBuffer()
      const doc = await PDFDocument.load(buffer)
      expect(doc.getPageCount()).toBe(3)
    })

    it('embeds signature PNG with custom box dimensions and scale', async () => {
      const sourcePdf = await createMockPdf(1, 'SinglePageDoc')
      const signedBlob = await signPdf(
        sourcePdf,
        MOCK_PNG_DATA_URL,
        0,
        'custom',
        { xPercent: 50, yPercent: 50, widthPercent: 40, heightPercent: 15 },
        1.2,
      )

      expect(signedBlob).toBeInstanceOf(Blob)
      const buffer = await signedBlob.arrayBuffer()
      const doc = await PDFDocument.load(buffer)
      expect(doc.getPageCount()).toBe(1)
    })
  })
})
