import React, { useState, useEffect, useRef, useId, useCallback, useMemo } from 'react'
import {
  BoardLayout,
  Button,
  PillGroup,
  StatsHeader,
  ControlsBar,
  Dialog,
  Select,
  Input,
  Badge,
  DownloadIcon,
  UploadIcon,
  RestartIcon,
  CheckIcon,
  TrashIcon,
} from '@all/ui'
import type {
  GuidedStep,
  PdfFileItem,
  PdfPageItem,
  SignaturePosition,
  SignatureFont,
  EditableImageItem,
  DocumentFilter,
  Point2D,
} from './types'
import { pdfSuiteTranslations } from './i18n'
import { loadPdfInfo, mergePdfs, extractAndRotatePages, imagesToPdf, signPdf } from './utils/pdfEngine'
import { loadImageElement, rotateCanvas, applyDocumentFilter, processEditableImage } from './utils/imageEngine'
import './styles/pdf-suite.css'

export interface ToolComponentProps {
  locale?: 'en' | 'pl'
  setHeader?: (header: React.ReactNode) => void
  isEink?: boolean
  theme?: string
  onSave?: (data: unknown) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Trims transparent whitespace margins from a canvas so the exported signature
 * is tightly bounded to the actual ink strokes, preventing displacement.
 */
function trimCanvas(canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas.toDataURL('image/png')
  const width = canvas.width
  const height = canvas.height
  const imgData = ctx.getImageData(0, 0, width, height)
  const data = imgData.data

  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  let hasPixels = false

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 15) {
        hasPixels = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  if (!hasPixels) {
    return canvas.toDataURL('image/png')
  }

  const pad = 12
  minX = Math.max(0, minX - pad)
  minY = Math.max(0, minY - pad)
  maxX = Math.min(width, maxX + pad)
  maxY = Math.min(height, maxY + pad)

  const trimWidth = maxX - minX
  const trimHeight = maxY - minY

  const trimmedCanvas = document.createElement('canvas')
  trimmedCanvas.width = trimWidth
  trimmedCanvas.height = trimHeight
  const trimmedCtx = trimmedCanvas.getContext('2d')
  if (!trimmedCtx) return canvas.toDataURL('image/png')

  trimmedCtx.drawImage(canvas, minX, minY, trimWidth, trimHeight, 0, 0, trimWidth, trimHeight)
  return trimmedCanvas.toDataURL('image/png')
}

export const SIGNATURE_FONT_CONFIG: Record<SignatureFont, { family: string; fontSpec: string }> = {
  'dancing-script': { family: 'Dancing Script', fontSpec: "'Dancing Script', cursive" },
  caveat: { family: 'Caveat', fontSpec: "'Caveat', cursive" },
  calligraphy: { family: 'Great Vibes', fontSpec: "'Great Vibes', cursive" },
  cursive: { family: 'Sacramento', fontSpec: "'Sacramento', cursive" },
}

/**
 * Renders a typed signature to a transparent PNG with dynamic measurement & padding.
 * Awaits document.fonts.load() before drawing to ensure the web font is fully loaded
 * and does not fall back to generic cursive.
 */
export async function renderTypedSignaturePng(text: string, font: SignatureFont): Promise<string> {
  const label = text.trim() || 'Signature'
  const config = SIGNATURE_FONT_CONFIG[font] || { family: 'cursive', fontSpec: 'cursive' }
  const baseFontSize = 72

  // Await font loading before measuring or drawing on canvas
  if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.load === 'function') {
    try {
      await document.fonts.load(`${baseFontSize}px "${config.family}"`, label)
    } catch {
      // Graceful fallback if font loading fails or is unsupported
    }
  }

  const offscreen = document.createElement('canvas')
  const ctx = offscreen.getContext('2d')
  if (!ctx) return ''

  const fontName = config.fontSpec

  // High resolution base font size for crisp, unclipped signature
  ctx.font = `${baseFontSize}px ${fontName}`
  const metrics = ctx.measureText(label)
  const textWidth = Math.ceil(metrics.width) || 300

  // Set canvas dimensions with generous padding so glyph ascenders/descenders never clip
  const paddingX = 60
  const paddingY = 40
  offscreen.width = Math.max(400, textWidth + paddingX * 2)
  offscreen.height = Math.max(160, Math.ceil(baseFontSize * 2) + paddingY * 2)

  // Clear and redraw with font setting on resized canvas
  ctx.clearRect(0, 0, offscreen.width, offscreen.height)
  ctx.font = `${baseFontSize}px ${fontName}`
  ctx.fillStyle = '#111111'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, offscreen.width / 2, offscreen.height / 2)

  return trimCanvas(offscreen)
}

export function PdfSuite({ locale = 'en', setHeader, isEink = false, theme }: ToolComponentProps) {
  const t = pdfSuiteTranslations[locale] || pdfSuiteTranslations.en
  const fileInputId = useId()

  const [step, setStep] = useState<GuidedStep>('upload')
  const [pdfFiles, setPdfFiles] = useState<PdfFileItem[]>([])
  const [pdfPages, setPdfPages] = useState<PdfPageItem[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false)
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null)

  // Signature modal state
  const [isSignOpen, setIsSignOpen] = useState<boolean>(false)
  const [sigStep, setSigStep] = useState<'create' | 'place'>('create')
  const [signMode, setSignMode] = useState<'draw' | 'type'>('draw')
  const [typedName, setTypedName] = useState<string>('John Doe')
  const [selectedFont, setSelectedFont] = useState<SignatureFont>('dancing-script')
  const [targetPageChoice, setTargetPageChoice] = useState<string>('1')
  const [sigPosition, setSigPosition] = useState<SignaturePosition>('bottom-right')
  const [sigScale, setSigScale] = useState<number | string>(100)
  const [boxWidthPercent, setBoxWidthPercent] = useState<number>(32)
  const [boxHeightPercent, setBoxHeightPercent] = useState<number>(12)
  const [customCoords, setCustomCoords] = useState<{ xPercent: number; yPercent: number }>({
    xPercent: 80,
    yPercent: 90,
  })
  const [isDraggingSig, setIsDraggingSig] = useState<boolean>(false)
  const [isResizingSig, setIsResizingSig] = useState<boolean>(false)
  const [drawSigDataUrl, setDrawSigDataUrl] = useState<string>('')
  const [typedSigDataUrl, setTypedSigDataUrl] = useState<string>('')
  const [isDrawing, setIsDrawing] = useState<boolean>(false)

  // Editable Images (Images to PDF & Document Scanner)
  const [editableImages, setEditableImages] = useState<EditableImageItem[]>([])
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [activePinIndex, setActivePinIndex] = useState<number | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgWrapperRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  // ─── Top StatsHeader Sync ───────────────────────────────────
  useEffect(() => {
    if (!setHeader) return

    let items: { key: string; label: string; value: string | number }[] = []

    if (step === 'upload') {
      items = [
        { key: 'step', label: t.labelStep, value: '1 / 3' },
        { key: 'mode', label: 'WORKFLOW', value: t.stepUpload.toUpperCase() },
      ]
    } else if (step === 'merge_files') {
      const totalSize = pdfFiles.reduce((acc, f) => acc + f.sizeBytes, 0)
      items = [
        { key: 'files', label: t.labelFiles, value: pdfFiles.length },
        { key: 'size', label: t.labelSize, value: formatBytes(totalSize) },
        { key: 'step', label: t.labelStep, value: '2 / 3' },
      ]
    } else if (step === 'edit_pages') {
      const selectedCount = pdfPages.filter((p) => p.selected).length
      items = [
        { key: 'pages', label: t.labelPages, value: `${selectedCount}/${pdfPages.length}` },
        { key: 'files', label: t.labelFiles, value: pdfFiles.length },
        { key: 'step', label: t.labelStep, value: '3 / 3' },
      ]
    } else {
      const activeImg = editableImages[activeImageIndex]
      items = [
        { key: 'imgs', label: t.labelImages, value: editableImages.length },
        { key: 'page', label: t.labelPages, value: `${activeImageIndex + 1}/${editableImages.length}` },
        { key: 'filter', label: 'FILTER', value: (activeImg?.filter || 'COLOR').toUpperCase() },
      ]
    }

    setHeader(<StatsHeader items={items} />)

    return () => {
      setHeader(null)
    }
  }, [setHeader, t, step, pdfFiles, pdfPages, editableImages, activeImageIndex])

  // ─── File Upload Handler (Guided Flow) ───────────────────────
  const handleFilesAdded = async (files: FileList | File[]) => {
    setIsLoading(true)
    try {
      const newPdfFiles: PdfFileItem[] = []
      let newPages: PdfPageItem[] = []
      const newImages: File[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
          const info = await loadPdfInfo(file)
          newPdfFiles.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            sizeBytes: file.size,
            pageCount: info.pageCount,
            file,
          })
          newPages = [...newPages, ...info.pages]
        } else if (file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic)$/i.test(file.name)) {
          newImages.push(file)
        }
      }

      if (step === 'images' && newImages.length > 0) {
        const items: EditableImageItem[] = []
        for (let i = 0; i < newImages.length; i++) {
          const file = newImages[i]
          const url = URL.createObjectURL(file)
          const img = await loadImageElement(url)
          const naturalW = img.naturalWidth || 1200
          const naturalH = img.naturalHeight || 800
          items.push({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            sizeBytes: file.size,
            file,
            originalUrl: url,
            width: naturalW,
            height: naturalH,
            rotation: 0,
            filter: 'original',
            corners: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 },
              { x: 0, y: 1 },
            ],
            previewUrl: url,
          })
        }
        setEditableImages((prev) => [...prev, ...items])
        setImageFiles((prev) => [...prev, ...newImages])
        return
      }

      if (newImages.length > 0 && newPdfFiles.length === 0 && pdfFiles.length === 0) {
        const items: EditableImageItem[] = []
        for (let i = 0; i < newImages.length; i++) {
          const file = newImages[i]
          const url = URL.createObjectURL(file)
          const img = await loadImageElement(url)
          const naturalW = img.naturalWidth || 1200
          const naturalH = img.naturalHeight || 800
          items.push({
            id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
            name: file.name,
            sizeBytes: file.size,
            file,
            originalUrl: url,
            width: naturalW,
            height: naturalH,
            rotation: 0,
            filter: 'original',
            corners: [
              { x: 0, y: 0 },
              { x: 1, y: 0 },
              { x: 1, y: 1 },
              { x: 0, y: 1 },
            ],
            previewUrl: url,
          })
        }
        setEditableImages(items)
        setImageFiles(newImages)
        setActiveImageIndex(0)
        setStep('images')
      } else {
        const combinedFiles = [...pdfFiles, ...newPdfFiles]
        const combinedPages = [...pdfPages, ...newPages]
        setPdfFiles(combinedFiles)
        setPdfPages(combinedPages)

        // Guided workflow branch:
        // If 2+ files are queued, route user to reorder/merge them first
        if (combinedFiles.length >= 2 && step !== 'edit_pages') {
          setStep('merge_files')
        } else {
          setStep('edit_pages')
        }
      }
    } catch {
      alert(t.errorReading)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Live Canvas Preview Render (for Edit Images) ────────────
  useEffect(() => {
    if (step !== 'images' || editableImages.length === 0 || !previewCanvasRef.current) return
    const activeItem = editableImages[activeImageIndex]
    if (!activeItem) return

    let isCancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (isCancelled || !previewCanvasRef.current) return
      const canvas = previewCanvasRef.current

      const naturalW = img.naturalWidth || activeItem.width || 1200
      const naturalH = img.naturalHeight || activeItem.height || 800

      // Sync activeItem width and height if they differed from natural image
      if (activeItem.width !== naturalW || activeItem.height !== naturalH) {
        setEditableImages((prev) => {
          const updated = [...prev]
          if (updated[activeImageIndex]) {
            updated[activeImageIndex] = {
              ...updated[activeImageIndex],
              width: naturalW,
              height: naturalH,
            }
          }
          return updated
        })
      }

      // Offscreen canvas for rotation and filter preview
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = naturalW
      tempCanvas.height = naturalH
      const tCtx = tempCanvas.getContext('2d')
      if (tCtx) {
        tCtx.drawImage(img, 0, 0, naturalW, naturalH)
      }

      const rotated = rotateCanvas(tempCanvas, activeItem.rotation)
      const filtered = applyDocumentFilter(rotated, activeItem.filter)

      canvas.width = filtered.width
      canvas.height = filtered.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(filtered, 0, 0)
      }
    }
    img.src = activeItem.originalUrl

    return () => {
      isCancelled = true
    }
  }, [step, editableImages, activeImageIndex])

  // ─── 4-Corner Perspective Pin Interaction ───────────────────
  const handlePinPointerDown = (e: React.PointerEvent, pinIdx: number) => {
    e.stopPropagation()
    e.preventDefault()
    setActivePinIndex(pinIdx)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {}
  }

  const handlePinPointerMove = (e: React.PointerEvent) => {
    if (activePinIndex === null || !imgWrapperRef.current) return
    const rect = imgWrapperRef.current.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return

    const normX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const normY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))

    setEditableImages((prev) => {
      const updated = [...prev]
      const curr = updated[activeImageIndex]
      if (!curr) return prev
      const newCorners = [...curr.corners] as [Point2D, Point2D, Point2D, Point2D]
      newCorners[activePinIndex] = {
        x: Number(normX.toFixed(3)),
        y: Number(normY.toFixed(3)),
      }
      updated[activeImageIndex] = {
        ...curr,
        corners: newCorners,
      }
      return updated
    })
  }

  const handlePinPointerUp = (e: React.PointerEvent) => {
    if (activePinIndex !== null) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {}
      setActivePinIndex(null)
    }
  }

  // ─── Active Image Controls ──────────────────────────────────
  const setFilterForActive = (filter: DocumentFilter) => {
    setEditableImages((prev) => {
      const updated = [...prev]
      if (updated[activeImageIndex]) {
        updated[activeImageIndex] = { ...updated[activeImageIndex], filter }
      }
      return updated
    })
  }

  const rotateActiveImage = () => {
    setEditableImages((prev) => {
      const updated = [...prev]
      const curr = updated[activeImageIndex]
      if (curr) {
        updated[activeImageIndex] = {
          ...curr,
          rotation: (curr.rotation + 90) % 360,
        }
      }
      return updated
    })
  }

  const resetCornersActive = () => {
    setEditableImages((prev) => {
      const updated = [...prev]
      if (updated[activeImageIndex]) {
        updated[activeImageIndex] = {
          ...updated[activeImageIndex],
          corners: [
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 1, y: 1 },
            { x: 0, y: 1 },
          ],
        }
      }
      return updated
    })
  }

  const moveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= editableImages.length || fromIdx === toIdx) return
    setEditableImages((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIdx, 1)
      updated.splice(toIdx, 0, moved)
      return updated
    })
    setActiveImageIndex(toIdx)
  }

  const deleteImage = (idx: number) => {
    setEditableImages((prev) => {
      const updated = prev.filter((_, i) => i !== idx)
      if (updated.length === 0) {
        setStep('upload')
      }
      return updated
    })
    setActiveImageIndex((curr) => Math.max(0, Math.min(curr, editableImages.length - 2)))
  }

  // ─── Convert Edited Images to PDF & Transition to Edit PDF ──
  const handleContinueToPdf = async () => {
    if (editableImages.length === 0) return
    setIsLoading(true)
    setGeneratingPdf(true)
    try {
      const processedFiles: File[] = []
      for (let i = 0; i < editableImages.length; i++) {
        const item = editableImages[i]
        const blob = await processEditableImage(item)
        const file = new File([blob], `scanned_page_${i + 1}.jpg`, { type: 'image/jpeg' })
        processedFiles.push(file)
      }

      const pdfBlob = await imagesToPdf(processedFiles)
      const pdfFile = new File([pdfBlob], 'scanned_document.pdf', { type: 'application/pdf' })
      const info = await loadPdfInfo(pdfFile)

      setPdfFiles([
        {
          id: `${Date.now()}-scanned`,
          name: 'scanned_document.pdf',
          sizeBytes: pdfBlob.size,
          pageCount: info.pageCount,
          file: pdfFile,
        },
      ])
      setPdfPages(info.pages)
      setStep('edit_pages')
    } catch (err) {
      console.error('Error generating PDF from scanned images:', err)
      alert(t.errorGenerating)
    } finally {
      setIsLoading(false)
      setGeneratingPdf(false)
    }
  }

  // ─── Merge Multiple Files & Transition to Page Workspace ─────
  const handleMergeFiles = async () => {
    if (pdfFiles.length < 2) {
      setStep('edit_pages')
      return
    }
    setIsLoading(true)
    try {
      const mergedBlob = await mergePdfs(pdfFiles.map((f) => f.file))
      const mergedFile = new File([mergedBlob], 'merged_document.pdf', { type: 'application/pdf' })
      const info = await loadPdfInfo(mergedFile)

      setPdfFiles([
        {
          id: `${Date.now()}-merged`,
          name: 'merged_document.pdf',
          sizeBytes: mergedBlob.size,
          pageCount: info.pageCount,
          file: mergedFile,
        },
      ])
      setPdfPages(info.pages)
      setStep('edit_pages')
    } catch {
      alert(t.errorGenerating)
    } finally {
      setIsLoading(false)
    }
  }

  // Demo sample PDF
  const loadDemoPdf = async () => {
    setIsLoading(true)
    try {
      const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      const font = await doc.embedFont(StandardFonts.HelveticaBold)
      const fontRegular = await doc.embedFont(StandardFonts.Helvetica)

      // Page 1
      const page1 = doc.addPage([595, 842])
      page1.drawText('AllTools PDF Suite — Document Demo', { x: 50, y: 760, size: 20, font, color: rgb(0.1, 0.1, 0.1) })
      page1.drawText('Page 1: Overview & Executive Summary', {
        x: 50,
        y: 720,
        size: 14,
        font: fontRegular,
        color: rgb(0.3, 0.3, 0.3),
      })

      // Page 2
      const page2 = doc.addPage([595, 842])
      page2.drawText('Page 2: Specifications & Project Roadmap', {
        x: 50,
        y: 760,
        size: 18,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })

      // Page 3
      const page3 = doc.addPage([595, 842])
      page3.drawText('Page 3: Signatures & Verification Clause', {
        x: 50,
        y: 760,
        size: 18,
        font,
        color: rgb(0.1, 0.1, 0.1),
      })
      page3.drawText('Sign here at the bottom to verify document integrity.', {
        x: 50,
        y: 720,
        size: 12,
        font: fontRegular,
        color: rgb(0.4, 0.4, 0.4),
      })

      const pdfBytes = await doc.save()
      const demoFile = new File([pdfBytes.buffer as ArrayBuffer], 'sample_document.pdf', { type: 'application/pdf' })
      handleFilesAdded([demoFile])
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Export Action ──────────────────────────────────────────
  const handleExport = async () => {
    setIsLoading(true)
    try {
      let finalBlob: Blob | null = null
      let exportFileName = 'document_processed.pdf'

      if (step === 'images') {
        if (imageFiles.length === 0) return
        finalBlob = await imagesToPdf(imageFiles)
        exportFileName = 'images_converted.pdf'
      } else if (pdfFiles.length === 1 && pdfPages.length > 0) {
        const sourceFile = pdfFiles[0].file
        const pagesToExport = pdfPages
          .filter((p) => p.selected)
          .map((p) => ({ pageIndex: p.pageIndex, rotation: p.rotation }))

        if (pagesToExport.length === 0) {
          alert(t.selectAtLeastOnePage)
          return
        }

        finalBlob = await extractAndRotatePages(sourceFile, pagesToExport)
        exportFileName = `${pdfFiles[0].name.replace(/\.pdf$/i, '')}_edited.pdf`
      } else if (pdfFiles.length > 1) {
        finalBlob = await mergePdfs(pdfFiles.map((f) => f.file))
        exportFileName = 'merged_documents.pdf'
      }

      if (finalBlob) {
        const url = URL.createObjectURL(finalBlob)
        const link = document.createElement('a')
        link.href = url
        link.download = exportFileName
        link.click()
        URL.revokeObjectURL(url)

        setDownloadSuccess(true)
        setTimeout(() => setDownloadSuccess(false), 2500)
      }
    } catch {
      alert(t.errorGenerating)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setPdfFiles([])
    setPdfPages([])
    setImageFiles([])
    setEditableImages([])
    setActiveImageIndex(0)
    setStep('upload')
  }

  // ─── Page Manipulation ──────────────────────────────────────
  const movePage = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pdfPages.length || fromIndex === toIndex) return
    setPdfPages((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }

  const moveFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= pdfFiles.length || fromIndex === toIndex) return
    setPdfFiles((prev) => {
      const updated = [...prev]
      const [moved] = updated.splice(fromIndex, 1)
      updated.splice(toIndex, 0, moved)
      return updated
    })
  }

  const togglePageSelection = (id: string) => {
    setPdfPages((prev) => prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p)))
  }

  const rotatePage = (id: string) => {
    setPdfPages((prev) => prev.map((p) => (p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p)))
  }

  const rotateAllPages = () => {
    setPdfPages((prev) => prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 })))
  }

  const allSelected = pdfPages.length > 0 && pdfPages.every((p) => p.selected)

  const selectAllPages = (selected: boolean) => {
    setPdfPages((prev) => prev.map((p) => ({ ...p, selected })))
  }

  // ─── Interactive Signature Pad ──────────────────────────────
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCanvasCoords(canvas, e)
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#000000'
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  // Pixel-accurate canvas coordinates accounting for CSS scaling vs internal buffer
  const getCanvasCoords = (canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const { x, y } = getCanvasCoords(canvas, e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false)
      if (sigCanvasRef.current) {
        setDrawSigDataUrl(trimCanvas(sigCanvasRef.current))
      }
    }
  }

  const clearCanvas = () => {
    const canvas = sigCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setDrawSigDataUrl('')
  }

  const numericScale = typeof sigScale === 'number' ? sigScale : parseInt(sigScale, 10) || 100
  const effectiveScale = Math.max(10, Math.min(500, numericScale))

  const halfW = Math.max(1, Math.round(boxWidthPercent / 2))
  const halfH = Math.max(1, Math.round(boxHeightPercent / 2))

  const handleScaleChange = (valStr: string) => {
    if (valStr === '') {
      setSigScale('')
      return
    }
    const val = parseInt(valStr, 10)
    if (!isNaN(val)) {
      const clamped = Math.max(10, Math.min(500, val))
      setSigScale(clamped)
      setBoxWidthPercent(Math.max(10, Math.min(95, Math.round(32 * (clamped / 100)))))
      setBoxHeightPercent(Math.max(4, Math.min(60, Math.round(12 * (clamped / 100)))))
    }
  }

  // Preset position selector (clamped safely inside margins to prevent overflow)
  const handleSelectPreset = (pos: SignaturePosition) => {
    setSigPosition(pos)
    const margin = 3
    if (pos === 'bottom-right') setCustomCoords({ xPercent: 100 - halfW - margin, yPercent: 100 - halfH - margin })
    else if (pos === 'bottom-left') setCustomCoords({ xPercent: halfW + margin, yPercent: 100 - halfH - margin })
    else if (pos === 'bottom-center') setCustomCoords({ xPercent: 50, yPercent: 100 - halfH - margin })
    else if (pos === 'top-right') setCustomCoords({ xPercent: 100 - halfW - margin, yPercent: halfH + margin })
    else if (pos === 'center') setCustomCoords({ xPercent: 50, yPercent: 50 })
  }

  // Manual interactive click / drag handler on document preview (safely clamped so box never overflows paper edges)
  const handlePlacementPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return
      const rect = viewportRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const minX = halfW + 1
      const maxX = 100 - halfW - 1
      const minY = halfH + 1
      const maxY = 100 - halfH - 1
      const xPercent = Math.max(minX, Math.min(maxX, Math.round((x / rect.width) * 100)))
      const yPercent = Math.max(minY, Math.min(maxY, Math.round((y / rect.height) * 100)))
      setCustomCoords({ xPercent, yPercent })
      setSigPosition('custom')
    },
    [halfW, halfH],
  )

  // Interactive resize handle dragging (resizes both the blue box and text proportionally)
  const handleResizePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return
      const rect = viewportRef.current.getBoundingClientRect()
      const pointerX = e.clientX - rect.left
      const pointerY = e.clientY - rect.top

      // Center of the signature box in pixels
      const centerX = (customCoords.xPercent / 100) * rect.width
      const centerY = (customCoords.yPercent / 100) * rect.height

      // Distance from center to pointer
      const distX = Math.abs(pointerX - centerX)
      const distY = Math.abs(pointerY - centerY)

      const newW = Math.max(10, Math.min(95, Math.round(((distX * 2) / rect.width) * 100)))
      const newH = Math.max(4, Math.min(60, Math.round(((distY * 2) / rect.height) * 100)))

      setBoxWidthPercent(newW)
      setBoxHeightPercent(newH)
      setSigScale(Math.round((newW / 32) * 100))
      setSigPosition('custom')
    },
    [customCoords.xPercent, customCoords.yPercent],
  )

  const resolvedPageIndex = useMemo(() => {
    const pageCount = pdfPages.length
    if (pageCount === 0) return 0
    const parsed = parseInt(targetPageChoice, 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= pageCount) {
      return parsed - 1
    }
    return Math.max(0, pageCount - 1)
  }, [targetPageChoice, pdfPages.length])

  const targetPageThumbnail = pdfPages[resolvedPageIndex]?.thumbnailUrl
  const currentPageAspectRatio = pdfPages[resolvedPageIndex]?.aspectRatio || 1 / 1.414

  // Re-render typed signature once font is loaded
  useEffect(() => {
    let isMounted = true
    renderTypedSignaturePng(typedName, selectedFont).then((url) => {
      if (isMounted) {
        setTypedSigDataUrl(url)
      }
    })

    if (typeof document !== 'undefined' && document.fonts && 'ready' in document.fonts) {
      document.fonts.ready.then(() => {
        if (isMounted) {
          renderTypedSignaturePng(typedName, selectedFont).then((url) => {
            if (isMounted) {
              setTypedSigDataUrl(url)
            }
          })
        }
      })
    }

    return () => {
      isMounted = false
    }
  }, [typedName, selectedFont])

  const activeSignatureDataUrl = useMemo(() => {
    if (signMode === 'draw') {
      return drawSigDataUrl || (sigCanvasRef.current ? trimCanvas(sigCanvasRef.current) : '')
    }
    return typedSigDataUrl
  }, [signMode, drawSigDataUrl, typedSigDataUrl])

  const handleProceedToPlacement = async () => {
    if (signMode === 'draw' && sigCanvasRef.current) {
      setDrawSigDataUrl(trimCanvas(sigCanvasRef.current))
    } else if (signMode === 'type') {
      const url = await renderTypedSignaturePng(typedName, selectedFont)
      setTypedSigDataUrl(url)
    }
    setSigStep('place')
  }

  const handleApplySignature = async () => {
    if (pdfFiles.length === 0) return
    setIsLoading(true)
    try {
      let signatureDataUrl = ''

      if (signMode === 'draw') {
        signatureDataUrl = drawSigDataUrl || (sigCanvasRef.current ? trimCanvas(sigCanvasRef.current) : '')
        if (!signatureDataUrl) return
      } else {
        signatureDataUrl = await renderTypedSignaturePng(typedName, selectedFont)
      }

      // Determine target page index (0-indexed)
      const pageIdx = resolvedPageIndex

      const sourceFile = pdfFiles[0].file
      const signedBlob = await signPdf(
        sourceFile,
        signatureDataUrl,
        pageIdx,
        sigPosition,
        {
          xPercent: customCoords.xPercent,
          yPercent: customCoords.yPercent,
          widthPercent: boxWidthPercent,
          heightPercent: boxHeightPercent,
        },
        1,
      )
      const signedFile = new File([signedBlob], `${pdfFiles[0].name.replace(/\.pdf$/i, '')}_signed.pdf`, {
        type: 'application/pdf',
      })

      const info = await loadPdfInfo(signedFile)
      setPdfFiles([
        {
          id: `${Date.now()}-signed`,
          name: signedFile.name,
          sizeBytes: signedBlob.size,
          pageCount: info.pageCount,
          file: signedFile,
        },
      ])
      setPdfPages(info.pages)
      setIsSignOpen(false)
      setSigStep('create')
    } catch (err) {
      console.error(err)
      alert(t.errorGenerating)
    } finally {
      setIsLoading(false)
    }
  }

  const statusTitle = useMemo(() => {
    if (step === 'upload') return t.titleUpload
    if (step === 'merge_files') return t.titleMerge
    if (step === 'images') return t.titleEditImages
    return t.titleOrganize
  }, [step, t])

  return (
    <div className={`pdf-root ${isEink ? 'is-eink' : ''}`.trim()}>
      {/* Hidden File Input */}
      <input
        id={fileInputId}
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept={step === 'images' ? 'image/*,.heic' : '.pdf,application/pdf,image/*'}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesAdded(e.target.files)
          }
        }}
      />

      <BoardLayout
        variant="wide"
        align="center"
        board={
          <div className="pdf-stage">
            {/* Top Status Badge */}
            <div className="pdf-badge-row">
              <span className="pdf-status-badge">{statusTitle}</span>
            </div>

            {/* Main Area */}
            <div className="pdf-editor-card">
              {/* ─── STEP 1: UPLOAD DROPZONE ─── */}
              {step === 'upload' && (
                <div
                  className="pdf-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFilesAdded(e.dataTransfer.files)
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="pdf-drop-icon">
                    <UploadIcon width="40" height="40" />
                  </div>
                  <div className="pdf-drop-title">{t.dropTitle}</div>
                  <div className="pdf-drop-sub">{t.dropSubtitle}</div>
                  <div className="pdf-drop-actions" onClick={(e) => e.stopPropagation()}>
                    <Button
                      id="pdf-browse-btn"
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      icon={<UploadIcon />}
                    >
                      {t.browseFiles}
                    </Button>
                    <Button id="pdf-demo-btn" variant="secondary" size="sm" onClick={loadDemoPdf}>
                      {t.demoDocument}
                    </Button>
                  </div>
                </div>
              )}

              {/* ─── STEP 2: MULTI-FILE MERGE ORDER ─── */}
              {step === 'merge_files' && (
                <>
                  <div className="pdf-toolbar">
                    <span className="pdf-toolbar-info">
                      {pdfFiles.length} {t.labelFiles.toLowerCase()} · {t.mergeQueueTitle}
                    </span>
                    <div className="pdf-toolbar-actions">
                      <Button
                        id="pdf-add-more-merge-btn"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t.addMore}
                      </Button>
                    </div>
                  </div>

                  <div className="pdf-items-container">
                    <div className="pdf-file-list">
                      {pdfFiles.map((file, idx) => (
                        <div key={file.id} className="pdf-file-row">
                          <div className="pdf-file-left">
                            <div className="pdf-file-arrows">
                              <button
                                type="button"
                                className="pdf-arrow-btn"
                                disabled={idx === 0}
                                onClick={() => moveFile(idx, idx - 1)}
                                title={t.moveUp}
                              >
                                ▲
                              </button>
                              <button
                                type="button"
                                className="pdf-arrow-btn"
                                disabled={idx === pdfFiles.length - 1}
                                onClick={() => moveFile(idx, idx + 1)}
                                title={t.moveDown}
                              >
                                ▼
                              </button>
                            </div>
                            <span className="pdf-file-index">{idx + 1}</span>
                            <div className="pdf-file-meta">
                              <span className="pdf-file-name">{file.name}</span>
                              <span className="pdf-file-sub">
                                {file.pageCount} {t.pagesCount} · {formatBytes(file.sizeBytes)}
                              </span>
                            </div>
                          </div>
                          <div className="pdf-file-right">
                            <button
                              type="button"
                              className="pdf-arrow-btn"
                              onClick={() => {
                                const rem = pdfFiles.filter((f) => f.id !== file.id)
                                setPdfFiles(rem)
                                if (rem.length <= 1) setStep(rem.length === 1 ? 'edit_pages' : 'upload')
                              }}
                              title={t.remove}
                            >
                              <TrashIcon />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── STEP 3: VISUAL PAGE GRID (REORDER, ROTATE, SIGN) ─── */}
              {step === 'edit_pages' && (
                <>
                  <div className="pdf-toolbar pdf-toolbar--center">
                    <div className="pdf-toolbar-actions pdf-toolbar-actions--grid">
                      <Button
                        id="pdf-select-all-btn"
                        variant="secondary"
                        size="sm"
                        onClick={() => selectAllPages(!allSelected)}
                      >
                        {allSelected ? t.deselectAll : t.selectAll}
                      </Button>
                      <Button id="pdf-rotate-all-btn" variant="secondary" size="sm" onClick={rotateAllPages}>
                        {t.rotateAll90}
                      </Button>
                      <Button
                        id="pdf-sign-dialog-btn"
                        variant="secondary"
                        size="sm"
                        onClick={() => setIsSignOpen(true)}
                      >
                        {t.signDocument}
                      </Button>
                      <Button
                        id="pdf-add-more-pages-btn"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t.addMore}
                      </Button>
                    </div>
                  </div>

                  <div className="pdf-items-container">
                    <div className="pdf-page-grid">
                      {pdfPages.map((page, idx) => (
                        <div
                          key={page.id}
                          draggable
                          onDragStart={() => setDraggedPageIndex(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (draggedPageIndex !== null && draggedPageIndex !== idx) {
                              movePage(draggedPageIndex, idx)
                              setDraggedPageIndex(null)
                            }
                          }}
                          className={`pdf-page-card ${page.selected ? 'pdf-page-card--selected' : 'pdf-page-card--deselected'}`}
                          onClick={() => togglePageSelection(page.id)}
                          title={t.dragHint}
                        >
                          <div className="pdf-page-preview-box">
                            {page.thumbnailUrl ? (
                              <img
                                src={page.thumbnailUrl}
                                alt={`${t.pagePrefix} ${page.displayNumber}`}
                                className="pdf-page-real-thumb"
                                style={{ transform: `rotate(${page.rotation}deg)` }}
                                draggable={false}
                              />
                            ) : (
                              <div
                                className="pdf-page-fallback-sheet"
                                style={{ transform: `rotate(${page.rotation}deg)` }}
                              >
                                {page.displayNumber}
                              </div>
                            )}
                          </div>

                          <div className="pdf-page-footer">
                            <div className="pdf-page-reorder-nav">
                              <button
                                type="button"
                                className="pdf-page-mini-arrow"
                                disabled={idx === 0}
                                draggable={false}
                                onDragStart={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  movePage(idx, idx - 1)
                                }}
                                title={t.moveLeft}
                              >
                                ◀
                              </button>
                              <span className="pdf-page-num-label">
                                {t.pagePrefix} {page.displayNumber}
                              </span>
                              <button
                                type="button"
                                className="pdf-page-mini-arrow"
                                disabled={idx === pdfPages.length - 1}
                                draggable={false}
                                onDragStart={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  movePage(idx, idx + 1)
                                }}
                                title={t.moveRight}
                              >
                                ▶
                              </button>
                            </div>

                            <button
                              type="button"
                              className="pdf-page-rotate-btn"
                              draggable={false}
                              onDragStart={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation()
                                rotatePage(page.id)
                              }}
                              title={t.rotatePage90}
                            >
                              ↻
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ─── STEP: EDIT IMAGES & DOCUMENT SCANNER ─── */}
              {step === 'images' && (
                <div className="pdf-images-workspace">
                  {/* Thumbnail Strip for all image pages */}
                  <div className="pdf-img-strip-wrap">
                    <div className="pdf-img-strip">
                      {editableImages.map((imgItem, idx) => (
                        <div
                          key={imgItem.id}
                          className={`pdf-img-thumb-card ${activeImageIndex === idx ? 'pdf-img-thumb-card--active' : ''}`}
                          onClick={() => setActiveImageIndex(idx)}
                          title={`${t.editImagePage} ${idx + 1}`}
                        >
                          <img src={imgItem.originalUrl} alt={imgItem.name} className="pdf-img-thumb-img" />
                          <span className="pdf-img-thumb-badge">{idx + 1}</span>
                          <button
                            type="button"
                            className="pdf-img-thumb-delete"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteImage(idx)
                            }}
                            title={t.remove}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pdf-toolbar-actions">
                      <Button
                        id="pdf-add-more-imgs-btn"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {t.addMore}
                      </Button>
                    </div>
                  </div>

                  {/* Main Large Editor Area */}
                  {(() => {
                    const activeItem = editableImages[activeImageIndex]
                    const isRotated90 = activeItem ? activeItem.rotation === 90 || activeItem.rotation === 270 : false
                    const displayW = activeItem ? (isRotated90 ? activeItem.height : activeItem.width) : 800
                    const displayH = activeItem ? (isRotated90 ? activeItem.width : activeItem.height) : 600

                    return (
                      <div className="pdf-img-stage-area">
                        <div className="pdf-img-viewport">
                          <div
                            className="pdf-img-wrapper"
                            ref={imgWrapperRef}
                            style={{
                              aspectRatio: `${displayW} / ${displayH}`,
                            }}
                          >
                            <canvas ref={previewCanvasRef} className="pdf-img-preview-canvas" />

                            {activeItem && (
                              <svg className="pdf-perspective-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <polygon
                                  points={`${activeItem.corners[0].x * 100},${activeItem.corners[0].y * 100} ${activeItem.corners[1].x * 100},${activeItem.corners[1].y * 100} ${activeItem.corners[2].x * 100},${activeItem.corners[2].y * 100} ${activeItem.corners[3].x * 100},${activeItem.corners[3].y * 100}`}
                                  fill="rgba(59, 130, 246, 0.16)"
                                  stroke="var(--all-text, #fff)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 2"
                                  vectorEffect="non-scaling-stroke"
                                />
                              </svg>
                            )}

                            {activeItem &&
                              activeItem.corners.map((corner, pinIdx) => (
                                <div
                                  key={pinIdx}
                                  className={`pdf-corner-pin ${activePinIndex === pinIdx ? 'pdf-corner-pin--dragging' : ''}`}
                                  style={{
                                    left: `${corner.x * 100}%`,
                                    top: `${corner.y * 100}%`,
                                  }}
                                  onPointerDown={(e) => handlePinPointerDown(e, pinIdx)}
                                  onPointerMove={handlePinPointerMove}
                                  onPointerUp={handlePinPointerUp}
                                  title={`Corner ${pinIdx + 1}`}
                                />
                              ))}
                          </div>
                        </div>

                        <p className="pdf-img-hint-text">{t.perspectiveHint}</p>

                        {/* Filter, Rotation & Perspective Controls Toolbar */}
                        <div className="pdf-img-edit-bar">
                          <div className="pdf-img-filters-group">
                            <Button
                              variant={activeItem?.filter === 'original' ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => setFilterForActive('original')}
                            >
                              {t.filterOriginal}
                            </Button>
                            <Button
                              variant={activeItem?.filter === 'bw' ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => setFilterForActive('bw')}
                            >
                              {t.filterBw}
                            </Button>
                            <Button
                              variant={activeItem?.filter === 'grayscale' ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => setFilterForActive('grayscale')}
                            >
                              {t.filterGrayscale}
                            </Button>
                            <Button
                              variant={activeItem?.filter === 'contrast' ? 'primary' : 'secondary'}
                              size="sm"
                              onClick={() => setFilterForActive('contrast')}
                            >
                              {t.filterContrast}
                            </Button>
                          </div>

                          <div className="pdf-img-actions-group">
                            <Button variant="secondary" size="sm" onClick={rotateActiveImage} title={t.rotatePage90}>
                              ↻ 90°
                            </Button>
                            <Button variant="secondary" size="sm" onClick={resetCornersActive} title={t.resetCorners}>
                              {t.resetCorners}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={activeImageIndex === 0}
                              onClick={() => moveImage(activeImageIndex, activeImageIndex - 1)}
                              title={t.moveLeft}
                            >
                              ◀
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={activeImageIndex === editableImages.length - 1}
                              onClick={() => moveImage(activeImageIndex, activeImageIndex + 1)}
                              title={t.moveRight}
                            >
                              ▶
                            </Button>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        }
        controls={
          step !== 'upload' ? (
            <ControlsBar>
              {/* Step navigation & actions */}
              {step === 'merge_files' && (
                <Button
                  id="pdf-merge-continue-btn"
                  variant="primary"
                  size="sm"
                  onClick={handleMergeFiles}
                  disabled={isLoading}
                >
                  {t.mergeAndContinue} →
                </Button>
              )}

              {step === 'images' && (
                <Button
                  id="pdf-images-continue-btn"
                  variant="primary"
                  size="sm"
                  onClick={handleContinueToPdf}
                  disabled={isLoading || editableImages.length === 0}
                >
                  {generatingPdf ? t.generatingPdf : `${t.continueToEditPdf} →`}
                </Button>
              )}

              {step === 'edit_pages' && (
                <Button
                  id="pdf-export-btn"
                  variant="primary"
                  size="sm"
                  onClick={handleExport}
                  icon={downloadSuccess ? <CheckIcon /> : <DownloadIcon />}
                  disabled={isLoading}
                >
                  {downloadSuccess ? t.downloaded : isLoading ? t.exporting : t.exportPdf}
                </Button>
              )}

              <Button
                id="pdf-reset-btn"
                variant="secondary"
                size="sm"
                onClick={handleReset}
                icon={<RestartIcon />}
                title={t.reset}
              >
                {t.reset}
              </Button>
            </ControlsBar>
          ) : undefined
        }
      />

      {/* ─── SIGNATURE DIALOG MODAL ─────────────────────────────── */}
      <Dialog
        open={isSignOpen}
        onClose={() => {
          setIsSignOpen(false)
          setSigStep('create')
        }}
        title={sigStep === 'create' ? t.createSignatureTitle : t.placeSignatureTitle}
        maxWidth="md"
        footer={
          sigStep === 'create' ? (
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
              <Button
                id="sig-clear-btn"
                variant="ghost"
                size="sm"
                onClick={clearCanvas}
                disabled={signMode === 'draw' ? !drawSigDataUrl && !sigCanvasRef.current : !typedName}
              >
                {t.clearSignature}
              </Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button id="sig-cancel-btn" variant="secondary" size="sm" onClick={() => setIsSignOpen(false)}>
                  {t.cancel}
                </Button>
                <Button
                  id="sig-proceed-btn"
                  variant="primary"
                  size="sm"
                  onClick={handleProceedToPlacement}
                  disabled={signMode === 'draw' ? !drawSigDataUrl && !sigCanvasRef.current : !typedName.trim()}
                >
                  {t.nextStepPlacement}
                </Button>
              </div>
            </div>
          ) : (
            <div
              style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}
            >
              <Button id="sig-back-btn" variant="secondary" size="sm" onClick={() => setSigStep('create')}>
                {t.backToSignature}
              </Button>
              <Button
                id="sig-apply-btn"
                variant="primary"
                size="sm"
                onClick={handleApplySignature}
                disabled={isLoading}
              >
                {t.applySignature}
              </Button>
            </div>
          )
        }
      >
        <div className="pdf-signature-modal">
          {/* ─── STEP 1: CREATE SIGNATURE ─── */}
          {sigStep === 'create' && (
            <>
              {/* Centered Mode Selector */}
              <div className="pdf-signature-header-pills">
                <PillGroup<'draw' | 'type'>
                  size="sm"
                  options={[
                    { value: 'draw', label: t.signModeDraw, id: 'sig-mode-draw' },
                    { value: 'type', label: t.signModeType, id: 'sig-mode-type' },
                  ]}
                  value={signMode}
                  onChange={(m) => setSignMode(m)}
                />
              </div>

              {/* DRAW MODE: Canvas */}
              {signMode === 'draw' && (
                <div className="pdf-signature-canvas-wrap">
                  <canvas
                    ref={sigCanvasRef}
                    width={600}
                    height={160}
                    className="pdf-signature-canvas"
                    onPointerDown={startDrawing}
                    onPointerMove={draw}
                    onPointerUp={stopDrawing}
                    onPointerLeave={stopDrawing}
                  />
                  <span className="pdf-signature-draw-hint">{t.drawHint}</span>
                </div>
              )}

              {/* TYPE MODE: Handwriting Fonts */}
              {signMode === 'type' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <Input
                    value={typedName}
                    onChange={(e) => setTypedName(e.target.value)}
                    placeholder={t.typeNamePlaceholder}
                    fullWidth
                  />

                  <label className="pdf-sig-select-label">{t.chooseStyle}</label>
                  <div className="pdf-font-styles-grid">
                    <div
                      className={`pdf-font-card font-style-dancingscript ${selectedFont === 'dancing-script' ? 'pdf-font-card--active' : ''}`}
                      onClick={() => setSelectedFont('dancing-script')}
                    >
                      {typedName || 'Signature'}
                    </div>
                    <div
                      className={`pdf-font-card font-style-caveat ${selectedFont === 'caveat' ? 'pdf-font-card--active' : ''}`}
                      onClick={() => setSelectedFont('caveat')}
                    >
                      {typedName || 'Signature'}
                    </div>
                    <div
                      className={`pdf-font-card font-style-greatvibes ${selectedFont === 'calligraphy' ? 'pdf-font-card--active' : ''}`}
                      onClick={() => setSelectedFont('calligraphy')}
                    >
                      {typedName || 'Signature'}
                    </div>
                    <div
                      className={`pdf-font-card font-style-sacramento ${selectedFont === 'cursive' ? 'pdf-font-card--active' : ''}`}
                      onClick={() => setSelectedFont('cursive')}
                    >
                      {typedName || 'Signature'}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ─── STEP 2: PLACE ON DOCUMENT ─── */}
          {sigStep === 'place' && (
            <>
              {/* Target Page, Position, Box Size & Text Size Selections */}
              <div className="pdf-placement-header">
                <Select
                  label={t.targetPage}
                  value={targetPageChoice}
                  onChange={(e) => setTargetPageChoice(e.target.value)}
                  options={pdfPages.map((_, i) => ({
                    value: (i + 1).toString(),
                    label: `${t.pageNumber} ${i + 1}`,
                  }))}
                  fullWidth
                />

                <Input
                  label={t.scaleLabel}
                  type="number"
                  min={10}
                  max={500}
                  step={5}
                  value={sigScale}
                  onChange={(e) => handleScaleChange(e.target.value)}
                  onBlur={() => {
                    if (sigScale === '' || (typeof sigScale !== 'number' && isNaN(parseInt(sigScale, 10)))) {
                      setSigScale(100)
                      setBoxWidthPercent(32)
                      setBoxHeightPercent(12)
                    }
                  }}
                  fullWidth
                />
              </div>

              <span className="pdf-placement-hint">
                {t.manualPlacementHint} • {t.resizeBoxHint}
              </span>

              {/* Centered Document Page with Real Page Format & Proportions */}
              <div className="pdf-placement-stage">
                <div
                  ref={viewportRef}
                  className="pdf-placement-viewport"
                  style={{
                    aspectRatio: `${currentPageAspectRatio}`,
                  }}
                  onPointerDown={(e) => {
                    handlePlacementPointer(e)
                    setIsDraggingSig(true)
                  }}
                  onPointerMove={(e) => {
                    if (isResizingSig) {
                      handleResizePointer(e)
                    } else if (isDraggingSig) {
                      handlePlacementPointer(e)
                    }
                  }}
                  onPointerUp={() => {
                    setIsDraggingSig(false)
                    setIsResizingSig(false)
                  }}
                  onPointerLeave={() => {
                    setIsDraggingSig(false)
                    setIsResizingSig(false)
                  }}
                >
                  {targetPageThumbnail ? (
                    <img
                      src={targetPageThumbnail}
                      alt={`Page ${resolvedPageIndex + 1}`}
                      className="pdf-placement-page-img"
                    />
                  ) : (
                    <div className="pdf-placement-page-fallback">
                      <span>
                        {t.pageNumber} {resolvedPageIndex + 1}
                      </span>
                      <span style={{ fontSize: '0.65rem', marginTop: '4px' }}>{t.dragToMoveHint}</span>
                    </div>
                  )}

                  {/* Draggable & Resizable Signature Overlay Box (Safely clamped inside paper) */}
                  <div
                    className={`pdf-placement-sig-box ${isDraggingSig ? 'is-dragging' : ''} ${isResizingSig ? 'is-resizing' : ''}`}
                    style={{
                      left: `${customCoords.xPercent}%`,
                      top: `${customCoords.yPercent}%`,
                      width: `${boxWidthPercent}%`,
                      height: `${boxHeightPercent}%`,
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setIsDraggingSig(true)
                    }}
                  >
                    {activeSignatureDataUrl ? (
                      <img src={activeSignatureDataUrl} alt="Signature" className="pdf-placement-sig-preview" />
                    ) : (
                      <span className="pdf-placement-sig-fallback">{typedName || 'Signature'}</span>
                    )}

                    {/* Interactive Corner Resize Handle */}
                    <div
                      className="pdf-sig-resize-handle"
                      title={t.resizeBoxHint}
                      onPointerDown={(e) => {
                        e.stopPropagation()
                        setIsResizingSig(true)
                      }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Dialog>
    </div>
  )
}
export default PdfSuite
