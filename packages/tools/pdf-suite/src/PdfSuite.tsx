import React, { useState, useEffect, useRef, useId } from 'react'
import {
  GameButton,
  PillGroup,
  StatsHeader,
  ControlsBar,
  IconDownload,
  IconRotateCcw,
  IconUpload,
  IconCheck,
  IconFileText,
  IconRotateCw,
  IconTrash,
} from '@alltools/ui'
import type { PdfMode, PdfFileItem, PdfPageItem } from './types'
import {
  loadPdfInfo,
  mergePdfs,
  extractAndRotatePages,
  imagesToPdf,
} from './utils/pdfEngine'
import './styles/pdf-suite.css'

export interface ToolComponentProps {
  locale?: 'en' | 'pl'
  setHeader?: (header: React.ReactNode) => void
  isEink?: boolean
  onSave?: (data: unknown) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function PdfSuite({ locale = 'en', setHeader }: ToolComponentProps) {
  const isPl = locale === 'pl'
  const fileInputId = useId()

  const [activeMode, setActiveMode] = useState<PdfMode>('merge')
  const [pdfFiles, setPdfFiles] = useState<PdfFileItem[]>([])
  const [pdfPages, setPdfPages] = useState<PdfPageItem[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false)
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Top StatsHeader Sync ───────────────────────────────────
  useEffect(() => {
    if (!setHeader) return

    let items: { key: string; label: string; value: string | number }[] = []

    if (activeMode === 'merge') {
      const totalSize = pdfFiles.reduce((acc, f) => acc + f.sizeBytes, 0)
      items = [
        { key: 'files', label: isPl ? 'PLIKI' : 'FILES', value: pdfFiles.length },
        { key: 'size', label: isPl ? 'WAGA' : 'SIZE', value: formatBytes(totalSize) },
      ]
    } else if (activeMode === 'split' || activeMode === 'rotate') {
      const selectedCount = pdfPages.filter((p) => p.selected).length
      items = [
        { key: 'pages', label: isPl ? 'STRONY' : 'PAGES', value: `${selectedCount}/${pdfPages.length}` },
        { key: 'mode', label: isPl ? 'OPERACJA' : 'ACTION', value: activeMode === 'split' ? (isPl ? 'UKŁAD' : 'REORDER') : (isPl ? 'OBRÓT' : 'ROTATE') },
      ]
    } else {
      items = [
        { key: 'imgs', label: isPl ? 'ZDJĘCIA' : 'IMAGES', value: imageFiles.length },
        { key: 'fmt', label: 'PDF', value: 'A4' },
      ]
    }

    setHeader(
      <StatsHeader
        label={
          activeMode === 'merge'
            ? (isPl ? 'ŁĄCZENIE PDF' : 'MERGE PDF')
            : activeMode === 'split'
            ? (isPl ? 'KOLEJNOŚĆ & DZIELENIE' : 'REORDER & SPLIT')
            : activeMode === 'rotate'
            ? (isPl ? 'OBRACANIE PDF' : 'ROTATE PDF')
            : (isPl ? 'ZDJĘCIA DO PDF' : 'IMAGES TO PDF')
        }
        items={items}
      />
    )
  }, [setHeader, isPl, activeMode, pdfFiles, pdfPages, imageFiles])

  // ─── File Upload Handler ────────────────────────────────────
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

      if (activeMode === 'images' || (newImages.length > 0 && newPdfFiles.length === 0)) {
        setImageFiles((prev) => [...prev, ...newImages])
        if (activeMode !== 'images') setActiveMode('images')
      } else {
        setPdfFiles((prev) => [...prev, ...newPdfFiles])
        setPdfPages((prev) => [...prev, ...newPages])
      }
    } catch (err) {
      alert(isPl ? 'Błąd podczas odczytu pliku PDF' : 'Failed to read PDF file')
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
      page1.drawText('Page 1: Overview & Summary Report', { x: 50, y: 720, size: 14, font: fontRegular, color: rgb(0.3, 0.3, 0.3) })

      // Page 2
      const page2 = doc.addPage([595, 842])
      page2.drawText('Page 2: Detailed Data Sheet', { x: 50, y: 760, size: 18, font, color: rgb(0.1, 0.1, 0.1) })

      // Page 3
      const page3 = doc.addPage([595, 842])
      page3.drawText('Page 3: Signatures & Verification', { x: 50, y: 760, size: 18, font, color: rgb(0.1, 0.1, 0.1) })

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

      if (activeMode === 'merge') {
        if (pdfFiles.length === 0) return
        finalBlob = await mergePdfs(pdfFiles.map((f) => f.file))
        exportFileName = 'merged_documents.pdf'
      } else if (activeMode === 'split' || activeMode === 'rotate') {
        if (pdfFiles.length === 0 || pdfPages.length === 0) return
        const sourceFile = pdfFiles[0].file
        const pagesToExport = pdfPages
          .filter((p) => p.selected)
          .map((p) => ({ pageIndex: p.pageIndex, rotation: p.rotation }))

        if (pagesToExport.length === 0) {
          alert(isPl ? 'Zaznacz co najmniej jedną stronę' : 'Select at least one page')
          return
        }

        finalBlob = await extractAndRotatePages(sourceFile, pagesToExport)
        exportFileName = `${pdfFiles[0].name.replace(/\.pdf$/i, '')}_edited.pdf`
      } else if (activeMode === 'images') {
        if (imageFiles.length === 0) return
        finalBlob = await imagesToPdf(imageFiles)
        exportFileName = 'images_converted.pdf'
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
    } catch (err) {
      console.error('PDF export failed:', err)
      alert(isPl ? 'Błąd podczas generowania pliku PDF' : 'Failed to generate PDF document')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setPdfFiles([])
    setPdfPages([])
    setImageFiles([])
  }

  // ─── Page Reordering & Manipulation Helpers ─────────────────
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

  const selectAllPages = (selected: boolean) => {
    setPdfPages((prev) => prev.map((p) => ({ ...p, selected })))
  }

  const modeOptions = [
    { value: 'merge' as const, label: isPl ? 'Łączenie' : 'Merge' },
    { value: 'split' as const, label: isPl ? 'Kolejność' : 'Reorder' },
    { value: 'rotate' as const, label: isPl ? 'Obracanie' : 'Rotate' },
    { value: 'images' as const, label: isPl ? 'Zdjęcia' : 'Images' },
  ]

  const hasContent =
    activeMode === 'images' ? imageFiles.length > 0 : pdfFiles.length > 0

  return (
    <div className="pdf-root">
      {/* Hidden File Input */}
      <input
        id={fileInputId}
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept={activeMode === 'images' ? 'image/*,.heic' : '.pdf,application/pdf'}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesAdded(e.target.files)
          }
        }}
      />

      {/* 1. Header Title */}
      <div className="pdf-status">
        <div className="pdf-status-text">
          {activeMode === 'merge'
            ? (isPl ? 'Łączenie plików PDF' : 'Merge PDF Documents')
            : activeMode === 'split'
            ? (isPl ? 'Kolejność stron i dzielenie' : 'Reorder & Split Pages')
            : activeMode === 'rotate'
            ? (isPl ? 'Obracanie stron PDF' : 'Rotate PDF Pages')
            : (isPl ? 'Zdjęcia do pliku PDF' : 'Images to PDF Document')}
        </div>
      </div>

      {/* 2. Main Viewport */}
      <div className="pdf-center-area">
        {!hasContent ? (
          /* ─── UPLOAD DROP ZONE ─── */
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
              <IconFileText size={36} />
            </div>
            <div className="pdf-drop-title">
              {isPl ? 'Wybierz lub upuść pliki PDF' : 'Drop or browse PDF files'}
            </div>
            <div className="pdf-drop-sub">
              {isPl
                ? '100% lokalnie w przeglądarce, bez wysyłania do chmury'
                : '100% private & client-side, zero cloud upload'}
            </div>
            <div className="pdf-drop-actions" onClick={(e) => e.stopPropagation()}>
              <GameButton
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                icon={<IconUpload size={14} />}
              >
                {isPl ? 'Wybierz pliki' : 'Browse Files'}
              </GameButton>
              <GameButton variant="secondary" size="md" onClick={loadDemoPdf}>
                {isPl ? 'Dokument demo' : 'Demo PDF'}
              </GameButton>
            </div>
          </div>
        ) : (
          /* ─── ACTIVE PDF WORKSPACE ─── */
          <div className="pdf-editor-card">
            {/* Quick Action Toolbar */}
            <div className="pdf-toolbar">
              <span className="pdf-toolbar-info">
                {activeMode === 'merge'
                  ? `${pdfFiles.length} ${isPl ? 'plików' : 'files'}`
                  : activeMode === 'images'
                  ? `${imageFiles.length} ${isPl ? 'zdjęć' : 'images'}`
                  : `${pdfPages.filter((p) => p.selected).length}/${pdfPages.length} ${isPl ? 'stron' : 'pages'}`}
              </span>

              <div className="pdf-toolbar-btns">
                {(activeMode === 'split' || activeMode === 'rotate') && (
                  <>
                    <button
                      type="button"
                      className="pdf-tool-link"
                      onClick={() => selectAllPages(true)}
                    >
                      {isPl ? 'Wszystkie' : 'All'}
                    </button>
                    <button
                      type="button"
                      className="pdf-tool-link"
                      onClick={rotateAllPages}
                    >
                      {isPl ? 'Obróć 90°' : 'Rotate 90°'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="pdf-tool-link"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isPl ? '+ Dodaj' : '+ Add'}
                </button>
              </div>
            </div>

            {/* Scrollable Items Container */}
            <div className="pdf-items-container">
              {/* MODE: MERGE (List of PDF files with reorder/remove) */}
              {activeMode === 'merge' && (
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
                            title={isPl ? 'W górę' : 'Move up'}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="pdf-arrow-btn"
                            disabled={idx === pdfFiles.length - 1}
                            onClick={() => moveFile(idx, idx + 1)}
                            title={isPl ? 'W dół' : 'Move down'}
                          >
                            ▼
                          </button>
                        </div>
                        <span className="pdf-file-index">{idx + 1}</span>
                        <div className="pdf-file-meta">
                          <span className="pdf-file-name">{file.name}</span>
                          <span className="pdf-file-sub">
                            {file.pageCount} {isPl ? 'stron' : 'pages'} · {formatBytes(file.sizeBytes)}
                          </span>
                        </div>
                      </div>
                      <div className="pdf-file-right">
                        <button
                          type="button"
                          className="pdf-icon-btn"
                          onClick={() => setPdfFiles((prev) => prev.filter((f) => f.id !== file.id))}
                          title={isPl ? 'Usuń z listy' : 'Remove'}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MODE: SPLIT / ROTATE / REORDER (Grid of visual page thumbnails) */}
              {(activeMode === 'split' || activeMode === 'rotate') && (
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
                      className={`pdf-page-card ${page.selected ? 'pdf-page-card--selected' : ''}`}
                      onClick={() => togglePageSelection(page.id)}
                      title={isPl ? 'Przeciągnij, aby zmienić kolejność' : 'Drag to reorder'}
                    >
                      <div className="pdf-page-preview-box">
                        {page.thumbnailUrl ? (
                          <img
                            src={page.thumbnailUrl}
                            alt={`Page ${page.displayNumber}`}
                            className="pdf-page-real-thumb"
                            style={{ transform: `rotate(${page.rotation}deg)` }}
                            draggable={false}
                          />
                        ) : (
                          <div
                            className="pdf-page-sheet"
                            style={{ transform: `rotate(${page.rotation}deg)` }}
                          >
                            <div className="pdf-sheet-header">
                              <span className="pdf-sheet-bar" />
                              <span className="pdf-sheet-bar" />
                            </div>
                            <div className="pdf-sheet-body">
                              <span className="pdf-sheet-line" />
                              <span className="pdf-sheet-line" />
                              <span className="pdf-sheet-line" />
                            </div>
                            <span className="pdf-sheet-num">{page.displayNumber}</span>
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
                            title={isPl ? 'Przesuń w lewo' : 'Move left'}
                          >
                            ◀
                          </button>
                          <span className="pdf-page-num-label">
                            {isPl ? 'Str.' : 'P.'} {page.displayNumber}
                          </span>
                          <button
                            type="button"
                            className="pdf-page-mini-arrow"
                            disabled={idx === pdfPages.length - 1}
                            onClick={(e) => {
                              e.stopPropagation()
                              movePage(idx, idx + 1)
                            }}
                            title={isPl ? 'Przesuń w prawo' : 'Move right'}
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
                          title={isPl ? 'Obróć o 90°' : 'Rotate 90°'}
                        >
                          <IconRotateCw size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MODE: IMAGES TO PDF */}
              {activeMode === 'images' && (
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
                          className="pdf-icon-btn"
                          onClick={() => setImageFiles((prev) => prev.filter((_, i) => i !== idx))}
                          title={isPl ? 'Usuń' : 'Remove'}
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Controls Bar */}
      <div className="pdf-controls-container">
        <ControlsBar>
          <PillGroup
            options={modeOptions}
            value={activeMode}
            onChange={(m) => setActiveMode(m)}
          />

          {hasContent && (
            <>
              <GameButton
                variant="primary"
                size="md"
                onClick={handleExport}
                icon={downloadSuccess ? <IconCheck size={14} /> : <IconDownload size={14} />}
                disabled={isLoading}
              >
                {downloadSuccess
                  ? (isPl ? 'Pobrano' : 'Downloaded')
                  : activeMode === 'merge'
                  ? (isPl ? 'Scal PDF' : 'Merge')
                  : activeMode === 'split'
                  ? (isPl ? 'Zapisz układ' : 'Save PDF')
                  : activeMode === 'rotate'
                  ? (isPl ? 'Zapisz obrót' : 'Save')
                  : (isPl ? 'Stwórz PDF' : 'Create PDF')}
              </GameButton>

              <GameButton
                variant="ghost"
                size="md"
                onClick={handleReset}
                icon={<IconRotateCcw size={14} />}
              >
                {isPl ? 'Reset' : 'Reset'}
              </GameButton>
            </>
          )}
        </ControlsBar>
      </div>
    </div>
  )
}
