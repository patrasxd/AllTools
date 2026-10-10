import { PDFDocument, degrees } from 'pdf-lib'
import * as pdfjsLib from 'pdfjs-dist'
import type { PdfPageItem, SignaturePosition, SignatureCoordinates } from '../types'

// Set worker source for offline PDF.js rendering using standard URL resolution
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
} catch {
  // The worker URL may not resolve outside a browser (e.g. in tests)
}

/**
 * Renders small JPEG thumbnails for each page of a PDF document using PDF.js.
 */
export async function renderPdfThumbnails(file: File): Promise<{ url: string; aspectRatio: number }[]> {
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
 * Renders one page of a PDF at a size suited for full-screen viewing (longest side ~ `maxSide` px).
 * Returns null when rendering is unavailable, so callers can fall back to the page thumbnail.
 */
export async function renderPdfPagePreview(
  file: File,
  pageIndex: number,
  maxSide: number = 2000,
): Promise<string | null> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
    const page = await pdf.getPage(pageIndex + 1)
    const base = page.getViewport({ scale: 1 })
    const scale = Math.min(4, maxSide / Math.max(base.width, base.height))
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return null
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    await (page.render as any)({ canvasContext: context, viewport, canvas }).promise
    return canvas.toDataURL('image/jpeg', 0.92)
  } catch (err) {
    console.warn('PDF.js page preview rendering error:', err)
    return null
  }
}

/**
 * Reads basic PDF structure and returns page count and page descriptor list with thumbnails.
 */
export async function loadPdfInfo(
  file: File,
  fileId: string = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
): Promise<{ pageCount: number; pages: PdfPageItem[] }> {
  const arrayBuffer = await file.arrayBuffer()
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true })
  const pageCount = pdfDoc.getPageCount()

  // Generate high-resolution page thumbnails with real aspect ratios
  const thumbnails = await renderPdfThumbnails(file)

  const pages: PdfPageItem[] = []

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

export interface PageExportRef {
  /** Id of the source file (PdfFileItem.id) the page comes from. */
  fileId: string
  /** 0-indexed page in that source file. */
  pageIndex: number
  /** Final rotation to apply (0, 90, 180, 270). */
  rotation: number
}

/**
 * Builds a PDF from exactly the given pages, in the given order, each with its own rotation.
 * Pages may come from several source files; every source is parsed only once.
 */
export async function assemblePdfFromPages(sources: Record<string, File>, pages: PageExportRef[]): Promise<Blob> {
  const newPdf = await PDFDocument.create()
  const loaded = new Map<string, PDFDocument>()

  const getSource = async (fileId: string): Promise<PDFDocument> => {
    const cached = loaded.get(fileId)
    if (cached) return cached
    const file = sources[fileId]
    if (!file) throw new Error(`Missing source file for page (fileId: ${fileId})`)
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
    loaded.set(fileId, doc)
    return doc
  }

  // Copy consecutive pages of the same source in one call so shared resources (fonts, images) are not duplicated.
  let i = 0
  while (i < pages.length) {
    let j = i
    while (j + 1 < pages.length && pages[j + 1].fileId === pages[i].fileId) j++
    const run = pages.slice(i, j + 1)
    const copied = await newPdf.copyPages(
      await getSource(run[0].fileId),
      run.map((p) => p.pageIndex),
    )
    copied.forEach((page, k) => {
      page.setRotation(degrees(run[k].rotation || 0))
      newPdf.addPage(page)
    })
    i = j + 1
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
  customCoordinates?: SignatureCoordinates,
  scale: number = 1,
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

  // Proportional signature bounding box based on box dimensions and scale
  const aspect = pngImage.width / pngImage.height
  let maxW = 170
  let maxH = 70
  if (customCoordinates?.widthPercent && customCoordinates?.heightPercent) {
    maxW = (customCoordinates.widthPercent / 100) * pageWidth
    maxH = (customCoordinates.heightPercent / 100) * pageHeight
  }
  maxW *= scale
  maxH *= scale

  let sigWidth = maxW
  let sigHeight = sigWidth / aspect
  if (sigHeight > maxH) {
    sigHeight = maxH
    sigWidth = sigHeight * aspect
  }

  let x = pageWidth - sigWidth - 45 // default bottom-right
  let y = 45 // 45 points margin from bottom edge

  if (customCoordinates) {
    // Convert 0..100 percentage from top-left (screen) to PDF coordinates (origin at bottom-left)
    const centerX = (customCoordinates.xPercent / 100) * pageWidth
    const centerY = (customCoordinates.yPercent / 100) * pageHeight
    x = centerX - sigWidth / 2
    y = pageHeight - centerY - sigHeight / 2
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
