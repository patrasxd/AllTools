import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import type { PdfPageItem } from '../types'

// Set worker source for offline PDF.js rendering using standard URL resolution
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
} catch {}

/**
 * Renders small JPEG thumbnails for each page of a PDF document using PDF.js.
 */
export async function renderPdfThumbnails(file: File): Promise<string[]> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
    const pdf = await loadingTask.promise
    const thumbnails: string[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const viewport = page.getViewport({ scale: 0.35 })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      if (context) {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        await (page.render as any)({ canvasContext: context, viewport, canvas }).promise
        thumbnails.push(canvas.toDataURL('image/jpeg', 0.85))
      } else {
        thumbnails.push('')
      }
    }
    return thumbnails
  } catch (err) {
    console.warn('PDF.js thumbnail rendering error:', err)
    return []
  }
}

/**
 * Reads basic PDF structure and returns page count and page descriptor list with thumbnails.
 */
export async function loadPdfInfo(
  file: File
): Promise<{ pageCount: number; pages: PdfPageItem[] }> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const pageCount = pdfDoc.getPageCount()

  // Generate real page thumbnails
  const thumbnails = await renderPdfThumbnails(file)

  const pages: PdfPageItem[] = []
  const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  for (let i = 0; i < pageCount; i++) {
    const page = pdfDoc.getPage(i)
    const existingRotation = page.getRotation().angle || 0

    pages.push({
      id: `${fileId}-p${i}`,
      fileId,
      fileName: file.name,
      pageIndex: i,
      displayNumber: i + 1,
      rotation: existingRotation,
      selected: true,
      thumbnailUrl: thumbnails[i] || undefined,
    })
  }

  return { pageCount, pages }
}

/**
 * Merges multiple PDF files into a single PDF blob.
 */
export async function mergePdfs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create()

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer()
    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
    const pageIndices = pdfDoc.getPageIndices()
    const copiedPages = await mergedPdf.copyPages(pdfDoc, pageIndices)

    for (const page of copiedPages) {
      mergedPdf.addPage(page)
    }
  }

  const mergedBytes = await mergedPdf.save()
  return new Blob([mergedBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}

/**
 * Extracts selected pages from a PDF and applies custom rotation to each in specified order.
 */
export async function extractAndRotatePages(
  file: File,
  pagesToExport: { pageIndex: number; rotation: number }[]
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const sourcePdf = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const newPdf = await PDFDocument.create()

  const indicesToCopy = pagesToExport.map((p) => p.pageIndex)
  const copiedPages = await newPdf.copyPages(sourcePdf, indicesToCopy)

  for (let i = 0; i < copiedPages.length; i++) {
    const page = copiedPages[i]
    const targetRotation = pagesToExport[i]?.rotation || 0
    page.setRotation(degrees(targetRotation))
    newPdf.addPage(page)
  }

  const pdfBytes = await newPdf.save()
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}

/**
 * Converts a list of image files (JPG, PNG) into a multi-page PDF document.
 */
export async function imagesToPdf(imageFiles: File[]): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()

  for (const file of imageFiles) {
    const imageBytes = await file.arrayBuffer()
    let embeddedImage

    if (file.type === 'image/png' || /\.png$/i.test(file.name)) {
      embeddedImage = await pdfDoc.embedPng(imageBytes)
    } else {
      embeddedImage = await pdfDoc.embedJpg(imageBytes)
    }

    const { width, height } = embeddedImage
    const page = pdfDoc.addPage([width, height])
    page.drawImage(embeddedImage, {
      x: 0,
      y: 0,
      width,
      height,
    })
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}
