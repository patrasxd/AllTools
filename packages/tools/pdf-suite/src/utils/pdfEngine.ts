import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import type { PdfPageItem, SignaturePosition } from '../types'

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
export async function renderPdfThumbnails(
  file: File
): Promise<{ url: string; aspectRatio: number }[]> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) })
    const pdf = await loadingTask.promise
    const thumbnails: { url: string; aspectRatio: number }[] = []

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      // High-resolution rendering (scale 1.5) for crystal-clear document preview
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      const aspect = viewport.width / viewport.height

      if (context) {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, canvas.width, canvas.height)
        await (page.render as any)({ canvasContext: context, viewport, canvas }).promise
        thumbnails.push({
          url: canvas.toDataURL('image/jpeg', 0.95),
          aspectRatio: aspect,
        })
      } else {
        thumbnails.push({ url: '', aspectRatio: 1 / 1.414 })
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

  // Generate high-resolution page thumbnails with real aspect ratios
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
      thumbnailUrl: thumbnails[i]?.url || undefined,
      aspectRatio: thumbnails[i]?.aspectRatio || 1 / 1.414,
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

/**
 * Embeds a PNG signature into a specific page of a PDF document.
 * Supports presets ('bottom-right', 'bottom-left', 'bottom-center', 'top-right', 'center')
 * as well as custom/manual (xPercent, yPercent) percentage coordinates on the page.
 */
export async function signPdf(
  file: File | Blob,
  signatureDataUrl: string,
  targetPageIndex: number = 0,
  position: SignaturePosition = 'bottom-right',
  customCoordinates?: { xPercent: number; yPercent: number },
  scale: number = 1
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })

  // Extract raw base64 PNG bytes
  const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '')
  const binaryString = atob(base64Data)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  const pngImage = await pdfDoc.embedPng(bytes)
  const pageCount = pdfDoc.getPageCount()
  const safeIndex = Math.max(0, Math.min(targetPageIndex, pageCount - 1))
  const page = pdfDoc.getPage(safeIndex)

  const { width: pageWidth, height: pageHeight } = page.getSize()

  // Proportional signature bounding box scaled by user factor
  const aspect = pngImage.width / pngImage.height
  const maxW = 170 * scale
  const maxH = 70 * scale
  let sigWidth = maxW
  let sigHeight = sigWidth / aspect
  if (sigHeight > maxH) {
    sigHeight = maxH
    sigWidth = sigHeight * aspect
  }

  let x = pageWidth - sigWidth - 45 // default bottom-right
  let y = 45 // 45 points margin from bottom edge

  if (position === 'custom' && customCoordinates) {
    // Convert 0..100 percentage from top-left (screen) to PDF coordinates (origin at bottom-left)
    const centerX = (customCoordinates.xPercent / 100) * pageWidth
    const centerY = (customCoordinates.yPercent / 100) * pageHeight
    x = centerX - (sigWidth / 2)
    y = pageHeight - centerY - (sigHeight / 2)
  } else if (position === 'bottom-left') {
    x = 45
    y = 45
  } else if (position === 'bottom-center') {
    x = (pageWidth - sigWidth) / 2
    y = 45
  } else if (position === 'top-right') {
    x = pageWidth - sigWidth - 45
    y = pageHeight - sigHeight - 45
  } else if (position === 'center') {
    x = (pageWidth - sigWidth) / 2
    y = (pageHeight - sigHeight) / 2
  }

  // Safety clamp within page boundaries
  x = Math.max(5, Math.min(x, pageWidth - sigWidth - 5))
  y = Math.max(5, Math.min(y, pageHeight - sigHeight - 5))

  page.drawImage(pngImage, {
    x,
    y,
    width: sigWidth,
    height: sigHeight,
  })

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}
