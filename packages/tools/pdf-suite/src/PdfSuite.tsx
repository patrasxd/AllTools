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
} from './types'
import { pdfSuiteTranslations } from './i18n'
import {
  loadPdfInfo,
  mergePdfs,
  extractAndRotatePages,
  imagesToPdf,
  signPdf,
} from './utils/pdfEngine'
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
  const [customCoords, setCustomCoords] = useState<{ xPercent: number; yPercent: number }>({ xPercent: 82, yPercent: 91 })
  const [isDraggingSig, setIsDraggingSig] = useState<boolean>(false)
  const [drawSigDataUrl, setDrawSigDataUrl] = useState<string>('')
  const [isDrawing, setIsDrawing] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const sigCanvasRef = useRef<HTMLCanvasElement>(null)

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
      items = [
        { key: 'imgs', label: t.labelImages, value: imageFiles.length },
        { key: 'fmt', label: 'PDF', value: 'A4' },
      ]
    }

    setHeader(
      <StatsHeader
        items={items}
      />
    )

    return () => {
      setHeader(null)
    }
  }, [setHeader, t, step, pdfFiles, pdfPages, imageFiles])

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

      if (newImages.length > 0 && newPdfFiles.length === 0 && pdfFiles.length === 0) {
        setImageFiles((prev) => [...prev, ...newImages])
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
      page1.drawText('Page 1: Overview & Executive Summary', { x: 50, y: 720, size: 14, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })

      // Page 2
      const page2 = doc.addPage([595, 842])
      page2.drawText('Page 2: Specifications & Project Roadmap', { x: 50, y: 760, size: 18, font, color: rgb(0.1, 0.1, 0.1) })

      // Page 3
      const page3 = doc.addPage([595, 842])
      page3.drawText('Page 3: Signatures & Verification Clause', { x: 50, y: 760, size: 18, font, color: rgb(0.1, 0.1, 0.1) })
      page3.drawText('Sign here at the bottom to verify document integrity.', { x: 50, y: 720, size: 12, font: fontRegular, color: rgb(0.4, 0.4, 0.4) })

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
    setPdfPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    )
  }

  const rotatePage = (id: string) => {
    setPdfPages((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
      )
    )
  }

  const rotateAllPages = () => {
    setPdfPages((prev) =>
      prev.map((p) => ({ ...p, rotation: (p.rotation + 90) % 360 }))
    )
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

  const numericScale = typeof sigScale === 'number' ? sigScale : (parseInt(sigScale, 10) || 1)
  const effectiveScale = Math.max(1, Math.min(500, numericScale))
  const boxWidthPercent = Math.max(1, Math.round(28 * (effectiveScale / 100)))
  const boxHeightPercent = Math.max(1, Math.round(10 * (effectiveScale / 100)))
  const halfW = Math.max(1, Math.round(boxWidthPercent / 2))
  const halfH = Math.max(1, Math.round(boxHeightPercent / 2))

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
  const handlePlacementPointer = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const minX = halfW + 2
    const maxX = 100 - halfW - 2
    const minY = halfH + 2
    const maxY = 100 - halfH - 2
    const xPercent = Math.max(minX, Math.min(maxX, Math.round((x / rect.width) * 100)))
    const yPercent = Math.max(minY, Math.min(maxY, Math.round((y / rect.height) * 100)))
    setCustomCoords({ xPercent, yPercent })
    setSigPosition('custom')
  }, [halfW, halfH])

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

  // Render typed signature to transparent PNG
  const renderTypedSignaturePng = (text: string, font: SignatureFont): string => {
    const offscreen = document.createElement('canvas')
    offscreen.width = 600
    offscreen.height = 200
    const ctx = offscreen.getContext('2d')
    if (!ctx) return ''

    let fontName = 'cursive'
    if (font === 'dancing-script') fontName = "'Dancing Script', cursive"
    else if (font === 'caveat') fontName = "'Caveat', cursive"
    else if (font === 'calligraphy') fontName = "'Great Vibes', cursive"
    else if (font === 'cursive') fontName = "'Sacramento', cursive"

    ctx.clearRect(0, 0, offscreen.width, offscreen.height)
    ctx.font = `60px ${fontName}`
    ctx.fillStyle = '#111111'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text || 'Signature', offscreen.width / 2, offscreen.height / 2)

    return trimCanvas(offscreen)
  }

  const handleProceedToPlacement = () => {
    if (signMode === 'draw' && sigCanvasRef.current) {
      setDrawSigDataUrl(trimCanvas(sigCanvasRef.current))
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
        signatureDataUrl = renderTypedSignaturePng(typedName, selectedFont)
      }

      // Determine target page index (0-indexed)
      const pageIdx = resolvedPageIndex

      const sourceFile = pdfFiles[0].file
      const signedBlob = await signPdf(sourceFile, signatureDataUrl, pageIdx, sigPosition, customCoords, effectiveScale / 100)
      const signedFile = new File([signedBlob], `${pdfFiles[0].name.replace(/\.pdf$/i, '')}_signed.pdf`, { type: 'application/pdf' })

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
    if (step === 'images') return t.titleImages
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
                    <Button
                      id="pdf-demo-btn"
                      variant="secondary"
                      size="sm"
                      onClick={loadDemoPdf}
                    >
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
                      <Button
                        id="pdf-rotate-all-btn"
                        variant="secondary"
                        size="sm"
                        onClick={rotateAllPages}
                      >
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

              {/* ─── IMAGES TO PDF ─── */}
              {step === 'images' && (
                <>
                  <div className="pdf-toolbar">
                    <span className="pdf-toolbar-info">
                      {imageFiles.length} {t.labelImages.toLowerCase()}
                    </span>
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

                  <div className="pdf-items-container">
                    <div className="pdf-file-list">
                      {imageFiles.map((img, idx) => (
                        <div key={`${img.name}-${idx}`} className="pdf-file-row">
                          <div className="pdf-file-left">
                            <span className="pdf-file-index">{idx + 1}</span>
                            <div className="pdf-file-meta">
                              <span className="pdf-file-name">{img.name}</span>
                              <span className="pdf-file-sub">{formatBytes(img.size)}</span>
                            </div>
                          </div>
                          <div className="pdf-file-right">
                            <button
                              type="button"
                              className="pdf-arrow-btn"
                              onClick={() => {
                                const rem = imageFiles.filter((_, i) => i !== idx)
                                setImageFiles(rem)
                                if (rem.length === 0) setStep('upload')
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

              {(step === 'edit_pages' || step === 'images') && (
                <>
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
                </>
              )}
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
                <Button
                  id="sig-cancel-btn"
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsSignOpen(false)}
                >
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
            <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
              <Button
                id="sig-back-btn"
                variant="secondary"
                size="sm"
                onClick={() => setSigStep('create')}
              >
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
              {/* Target Page, Position & Scale Selections using AllUI Select */}
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

                <Select
                  label={t.positionLabel}
                  value={sigPosition}
                  onChange={(e) => handleSelectPreset(e.target.value as SignaturePosition)}
                  options={[
                    { value: 'bottom-right', label: t.positionBottomRight },
                    { value: 'bottom-left', label: t.positionBottomLeft },
                    { value: 'bottom-center', label: t.positionBottomCenter },
                    { value: 'top-right', label: t.positionTopRight },
                    { value: 'center', label: t.positionCenter },
                    { value: 'custom', label: t.positionCustom },
                  ]}
                  fullWidth
                />

                <Input
                  label={t.scaleLabel}
                  type="number"
                  min={1}
                  max={500}
                  step={1}
                  value={sigScale}
                  onChange={(e) => {
                    const valStr = e.target.value
                    if (valStr === '') {
                      setSigScale('')
                      return
                    }
                    const val = parseInt(valStr, 10)
                    if (!isNaN(val)) {
                      setSigScale(Math.max(1, Math.min(500, val)))
                    }
                  }}
                  onBlur={() => {
                    if (sigScale === '' || (typeof sigScale !== 'number' && isNaN(parseInt(sigScale, 10)))) {
                      setSigScale(100)
                    }
                  }}
                  fullWidth
                />
              </div>

              <span className="pdf-placement-hint">{t.manualPlacementHint}</span>

              {/* Centered Document Page with Real Page Format & Proportions */}
              <div className="pdf-placement-stage">
                <div
                  className="pdf-placement-viewport"
                  style={{
                    aspectRatio: `${currentPageAspectRatio}`,
                  }}
                  onPointerDown={(e) => {
                    handlePlacementPointer(e)
                    setIsDraggingSig(true)
                  }}
                  onPointerMove={(e) => {
                    if (isDraggingSig) {
                      handlePlacementPointer(e)
                    }
                  }}
                  onPointerUp={() => setIsDraggingSig(false)}
                  onPointerLeave={() => setIsDraggingSig(false)}
                >
                  {targetPageThumbnail ? (
                    <img
                      src={targetPageThumbnail}
                      alt={`Page ${resolvedPageIndex + 1}`}
                      className="pdf-placement-page-img"
                    />
                  ) : (
                    <div className="pdf-placement-page-fallback">
                      <span>{t.pageNumber} {resolvedPageIndex + 1}</span>
                      <span style={{ fontSize: '0.65rem', marginTop: '4px' }}>{t.dragToMoveHint}</span>
                    </div>
                  )}

                  {/* Draggable Signature Overlay Box (Safely clamped inside paper) */}
                  <div
                    className={`pdf-placement-sig-box ${isDraggingSig ? 'is-dragging' : ''}`}
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
                    {signMode === 'draw' ? (
                      drawSigDataUrl ? (
                        <img
                          src={drawSigDataUrl}
                          alt="Signature"
                          className="pdf-placement-sig-preview"
                        />
                      ) : (
                        <span className="pdf-placement-sig-text" style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                          Signature
                        </span>
                      )
                    ) : (
                      <span
                        className={`pdf-placement-sig-text ${
                          selectedFont === 'dancing-script'
                            ? 'font-style-dancingscript'
                            : selectedFont === 'caveat'
                            ? 'font-style-caveat'
                            : selectedFont === 'calligraphy'
                            ? 'font-style-greatvibes'
                            : 'font-style-sacramento'
                        }`}
                      >
                        {typedName || 'Signature'}
                      </span>
                    )}
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
