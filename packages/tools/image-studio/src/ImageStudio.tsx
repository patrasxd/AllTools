import React, { useState, useEffect, useRef, useId, useMemo, useCallback } from 'react'
import {
  BoardLayout,
  Button,
  PillGroup,
  StatsHeader,
  ControlsBar,
  Toggle,
  Input,
  DownloadIcon,
  CopyIcon,
  UploadIcon,
  CheckIcon,
  PhotoIcon,
} from '@all/ui'
import type {
  ImageFormat,
  AspectRatioPreset,
  WatermarkConfig,
  ResizeConfig,
  CompressionConfig,
  VectorizeConfig,
  VectorizeMode,
  VectorizeSmoothing,
  BgRemovalConfig,
} from './types'
import { loadFileToImage, renderProcessedCanvas, exportCompressedBlob, calculateDimensions } from './utils/imageEngine'
import { extractImageDataFromSource } from './utils/vectorEngine'
import { useVectorizeWorker } from './utils/useVectorizeWorker'
import { imageStudioTranslations } from './i18n'
import './styles/image-studio.css'

export interface ToolComponentProps {
  locale?: 'en' | 'pl'
  setHeader?: (header: React.ReactNode) => void
  isEink?: boolean
  theme?: string
  isDirty?: boolean
  setIsDirty?: (dirty: boolean) => void
  onSave?: (data: unknown) => void
}

function ClipboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  )
}

function PipetteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="m19 11-4-4" />
      <path d="m2 22 5.5-1.5L21.1 6.9a2.1 2.1 0 0 0 0-3l-1-1a2.1 2.1 0 0 0-3 0L3.5 16.5 2 22" />
      <path d="m18 8 2 2" />
    </svg>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function ImageStudio({ locale = 'en', setHeader, isEink = false, setIsDirty }: ToolComponentProps) {
  const t = imageStudioTranslations[locale] || imageStudioTranslations.en
  const fileInputId = useId()

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
    return false
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const motionEnabled = !isEink && !prefersReducedMotion

  // ─── Image State ────────────────────────────────────────────
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null)
  const [originalFileName, setOriginalFileName] = useState<string>('photo')
  const [originalBytes, setOriginalBytes] = useState<number>(0)
  const [outputBytes, setOutputBytes] = useState<number>(0)
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null)
  const [outputDataUrl, setOutputDataUrl] = useState<string>('')
  const [outputDimensions, setOutputDimensions] = useState<{ w: number; h: number }>({ w: 0, h: 0 })
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [copied, setCopied] = useState<boolean>(false)
  const [showOriginal, setShowOriginal] = useState<boolean>(false)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // ─── Active Tool Tab ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'crop' | 'remove-bg' | 'watermark' | 'format' | 'vectorize'>('crop')

  // ─── Background Removal State ───────────────────────────────
  const [bgRemoval, setBgRemoval] = useState<BgRemovalConfig>({
    enabled: false,
    color: '#ffffff',
    tolerance: 20,
    mode: 'contiguous',
    feather: 1,
  })
  const [isPickingColor, setIsPickingColor] = useState<boolean>(false)
  const [vectorInputDataUrl, setVectorInputDataUrl] = useState<string>('')

  // ─── Vectorization State ────────────────────────────────────
  const [vectorConfig, setVectorConfig] = useState<VectorizeConfig>({
    mode: 'color',
    numberOfColors: 16,
    bwThreshold: 128,
    speckleFilter: 4,
    smoothing: 'high',
    rightAngleEnhance: false,
    lineFilter: false,
  })
  const [vectorViewMode, setVectorViewMode] = useState<'split' | 'vector' | 'original'>('split')
  const [copiedSvg, setCopiedSvg] = useState<boolean>(false)
  const [vectorSvgBlobUrl, setVectorSvgBlobUrl] = useState<string>('')

  const { isVectorizing, vectorResult, error: vectorError, runVectorize } = useVectorizeWorker()

  // ─── Configs ────────────────────────────────────────────────
  const [resize, setResize] = useState<ResizeConfig>({
    preset: 'original',
    customWidth: 1200,
    customHeight: 800,
    lockAspect: true,
    cropMode: 'cover',
    crop: {
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      showPassportGuide: true,
    },
  })

  const [watermark, setWatermark] = useState<WatermarkConfig>({
    enabled: false,
    text: t.defaultWatermarkText,
    opacity: 0.4,
    fontSize: 32,
    mode: 'diagonal-single',
    color: '#ffffff',
  })

  const [format, setFormat] = useState<ImageFormat>('image/jpeg')
  const [compression, setCompression] = useState<CompressionConfig>({
    quality: 85,
    targetMaxKb: null,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const dragStartRef = useRef<{
    x: number
    y: number
    rectWidth: number
    rectHeight: number
    startOffsetX: number
    startOffsetY: number
  } | null>(null)

  // ─── Synchronize Stats to Top AppHeader (near hamburger menu) ───
  useEffect(() => {
    if (!setHeader) return

    if (!loadedImage) {
      setHeader(
        <StatsHeader
          items={[
            { key: 'status', label: t.labelStatus, value: t.statusReady },
            { key: 'heic', label: 'HEIC', value: t.statusSupported },
          ]}
        />,
      )
      return () => {
        setHeader(null)
      }
    }

    if (activeTab === 'vectorize') {
      setHeader(
        <StatsHeader
          items={[
            {
              key: 'size',
              label: t.labelSize,
              value: vectorResult ? formatBytes(vectorResult.sizeBytes) : '—',
            },
            {
              key: 'format',
              label: t.labelFormat,
              value: 'SVG',
            },
            {
              key: 'dim',
              label: t.labelDims,
              value: `${outputDimensions.w > 0 ? outputDimensions.w : loadedImage.naturalWidth}×${
                outputDimensions.h > 0 ? outputDimensions.h : loadedImage.naturalHeight
              }px`,
            },
          ]}
        />,
      )
      return () => {
        setHeader(null)
      }
    }

    const saved =
      originalBytes > 0 && outputBytes > 0 ? Math.round(((originalBytes - outputBytes) / originalBytes) * 100) : 0

    setHeader(
      <StatsHeader
        items={[
          {
            key: 'size',
            label: t.labelSize,
            value: `${formatBytes(outputBytes)}${saved > 0 ? ` (-${saved}%)` : ''}`,
          },
          {
            key: 'format',
            label: t.labelFormat,
            value: format.replace('image/', '').toUpperCase(),
          },
          {
            key: 'dim',
            label: t.labelDims,
            value: `${outputDimensions.w}×${outputDimensions.h}px`,
          },
        ]}
      />,
    )

    return () => {
      setHeader(null)
    }
  }, [setHeader, t, loadedImage, originalBytes, outputBytes, format, outputDimensions, activeTab, vectorResult])

  // ─── Track Unsaved Edits / Navigation Guard ─────────────────
  useEffect(() => {
    setIsDirty?.(loadedImage !== null || isLoading || isVectorizing)
  }, [loadedImage, isLoading, isVectorizing, setIsDirty])

  // ─── Instant 60fps Live Preview Render ──────────────────────
  // Draws immediately to the preview canvas without triggering compression encoding or loading spinner
  useEffect(() => {
    if (!loadedImage || !previewCanvasRef.current) return
    const canvas = previewCanvasRef.current

    if (showOriginal) {
      // Draw un-cropped, un-watermarked original photograph
      const origW = loadedImage.naturalWidth
      const origH = loadedImage.naturalHeight
      if (canvas.width !== origW) canvas.width = origW
      if (canvas.height !== origH) canvas.height = origH
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, origW, origH)
        ctx.drawImage(loadedImage, 0, 0)
      }
      setOutputDimensions({ w: origW, h: origH })
      return
    }

    const processed = renderProcessedCanvas(loadedImage, resize, watermark, bgRemoval)
    if (canvas.width !== processed.width) canvas.width = processed.width
    if (canvas.height !== processed.height) canvas.height = processed.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(processed, 0, 0)
    }
    setOutputDimensions({ w: processed.width, h: processed.height })
  }, [loadedImage, resize, watermark, bgRemoval, showOriginal, activeTab])

  // ─── Debounced Compression & Export Pipeline ────────────────
  // Runs in background after changes stop so dragging remains buttery smooth
  useEffect(() => {
    if (!loadedImage || !previewCanvasRef.current) return
    if (isDragging) return // Do not run expensive encoding while user is actively dragging

    const timer = setTimeout(async () => {
      try {
        const { blob, sizeBytes, dataUrl } = await exportCompressedBlob(
          previewCanvasRef.current!,
          format,
          compression.quality,
          compression.targetMaxKb,
        )
        setOutputBlob(blob)
        setOutputBytes(sizeBytes)
        setOutputDataUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return dataUrl
        })
      } catch (err) {
        console.error('Compression export error:', err)
      }
    }, 180)

    return () => clearTimeout(timer)
  }, [loadedImage, resize, watermark, bgRemoval, format, compression, isDragging, activeTab])

  // ─── Debounced Vectorization Pipeline (Unified Single Image) ─
  // Uses cropped, background-removed, watermarked image rather than raw source photograph
  useEffect(() => {
    if (!loadedImage || activeTab !== 'vectorize') return

    const timer = setTimeout(() => {
      try {
        const processedForVector = renderProcessedCanvas(loadedImage, resize, watermark, bgRemoval)
        setVectorInputDataUrl(processedForVector.toDataURL())
        const sourceData = extractImageDataFromSource(processedForVector, 2000)
        runVectorize(sourceData, vectorConfig)
      } catch (err) {
        console.error('Vectorization extraction error:', err)
      }
    }, 220)

    return () => clearTimeout(timer)
  }, [loadedImage, activeTab, vectorConfig, resize, watermark, bgRemoval, runVectorize])

  // ─── Synchronize Vector SVG Blob URL for Safe Display ────────
  useEffect(() => {
    if (!vectorResult?.svg) {
      setVectorSvgBlobUrl('')
      return
    }
    const blob = new Blob([vectorResult.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    setVectorSvgBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [vectorResult?.svg])

  // ─── Natural Drag-to-Pan (Inverted Offset for 1:1 motion) ───
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!loadedImage) return
    const container = e.currentTarget as HTMLElement
    const rect = container.getBoundingClientRect()
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      rectWidth: rect.width,
      rectHeight: rect.height,
      startOffsetX: resize.crop.offsetX,
      startOffsetY: resize.crop.offsetY,
    }
    setIsDragging(true)
    container.setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return

    const { x, y, rectWidth, rectHeight, startOffsetX, startOffsetY } = dragStartRef.current
    const dx = e.clientX - x
    const dy = e.clientY - y

    // Natural panning: moving cursor right (dx > 0) pulls the photo right (decreases offset)
    const sensitivity = 2.0
    const deltaNormalizedX = (dx / (rectWidth || 1)) * sensitivity
    const deltaNormalizedY = (dy / (rectHeight || 1)) * sensitivity

    const newOffsetX = Math.max(-1, Math.min(1, startOffsetX - deltaNormalizedX))
    const newOffsetY = Math.max(-1, Math.min(1, startOffsetY - deltaNormalizedY))

    setResize((r) => ({
      ...r,
      crop: {
        ...r.crop,
        offsetX: newOffsetX,
        offsetY: newOffsetY,
      },
    }))
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false)
      dragStartRef.current = null
      try {
        const container = e.currentTarget as HTMLElement
        container.releasePointerCapture(e.pointerId)
      } catch {
        // Pointer was already released
      }
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const zoomStep = e.deltaY < 0 ? 0.1 : -0.1
    setResize((r) => {
      const nextZoom = Math.max(1, Math.min(3.5, Number((r.crop.zoom + zoomStep).toFixed(2))))
      return {
        ...r,
        crop: {
          ...r.crop,
          zoom: nextZoom,
        },
      }
    })
  }

  // ─── Click on Canvas to Sample Background Color ────────────
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!loadedImage || !previewCanvasRef.current) return
    if (activeTab !== 'remove-bg' && !isPickingColor) return

    const canvas = previewCanvasRef.current
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const canvasX = (e.clientX - rect.left) * scaleX
    const canvasY = (e.clientY - rect.top) * scaleY

    const { srcX, srcY, srcW, srcH } = calculateDimensions(loadedImage.naturalWidth, loadedImage.naturalHeight, resize)
    const imgX = Math.max(0, Math.min(loadedImage.naturalWidth - 1, Math.floor(srcX + (canvasX / canvas.width) * srcW)))
    const imgY = Math.max(0, Math.min(loadedImage.naturalHeight - 1, Math.floor(srcY + (canvasY / canvas.height) * srcH)))

    // Sample pristine RGB pixel from loadedImage to avoid picking already transparent pixels
    const sampleCanvas = document.createElement('canvas')
    sampleCanvas.width = 1
    sampleCanvas.height = 1
    const sCtx = sampleCanvas.getContext('2d')
    if (sCtx) {
      sCtx.drawImage(loadedImage, imgX, imgY, 1, 1, 0, 0, 1, 1)
      const pixel = sCtx.getImageData(0, 0, 1, 1).data
      const hex =
        '#' +
        [pixel[0], pixel[1], pixel[2]]
          .map((c) => c.toString(16).padStart(2, '0'))
          .join('')
      setBgRemoval((b) => ({ ...b, color: hex, enabled: true }))
      if (format === 'image/jpeg') {
        setFormat('image/png')
      }
      setIsPickingColor(false)
    }
  }

  // ─── File Load Handlers ─────────────────────────────────────
  const handleFileSelect = useCallback(
    async (file: File) => {
      setIsLoading(true)
      try {
        const baseName = file.name.replace(/\.[^/.]+$/, '')
        setOriginalFileName(baseName)

        const { image, sizeBytes } = await loadFileToImage(file)
        setLoadedImage(image)
        setOriginalBytes(sizeBytes)
        setOutputDimensions({ w: image.naturalWidth, h: image.naturalHeight })
        setResize((r) => ({
          ...r,
          preset: 'original',
          customWidth: image.naturalWidth,
          customHeight: image.naturalHeight,
          crop: {
            offsetX: 0,
            offsetY: 0,
            zoom: 1,
            showPassportGuide: true,
          },
        }))
        setBgRemoval({
          enabled: false,
          color: '#ffffff',
          tolerance: 20,
          mode: 'contiguous',
          feather: 1,
        })
        setIsPickingColor(false)
      } catch (err) {
        console.error('Failed to load image:', err)
        alert(t.loadError)
      } finally {
        setIsLoading(false)
      }
    },
    [t.loadError],
  )

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imgType = item.types.find((type) => type.startsWith('image/'))
          if (imgType) {
            const blob = await item.getType(imgType)
            const ext = imgType.split('/')[1] || 'png'
            const file = new File([blob], `clipboard_${Date.now()}.${ext}`, { type: imgType })
            await handleFileSelect(file)
            return
          }
        }
      }
      alert(t.noClipboardImage)
    } catch (err) {
      console.warn('Clipboard read error:', err)
      alert(t.clipboardError)
    }
  }, [handleFileSelect, t.noClipboardImage, t.clipboardError])

  // Global paste handler (Ctrl+V)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      const files = e.clipboardData?.files

      let imageFile: File | null = null

      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.startsWith('image/')) {
            const blob = item.getAsFile()
            if (blob) {
              const ext = item.type.split('/')[1] || 'png'
              imageFile =
                blob instanceof File ? blob : new File([blob], `pasted_${Date.now()}.${ext}`, { type: item.type })
              break
            }
          }
        }
      }

      if (!imageFile && files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const f = files[i]
          if (f.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp|gif|svg|heic|heif)$/i.test(f.name)) {
            imageFile = f
            break
          }
        }
      }

      if (imageFile) {
        e.preventDefault()
        handleFileSelect(imageFile)
      }
    }

    window.addEventListener('paste', handleGlobalPaste)
    document.addEventListener('paste', handleGlobalPaste)
    return () => {
      window.removeEventListener('paste', handleGlobalPaste)
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [handleFileSelect])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  // ─── Export Actions ─────────────────────────────────────────
  const handleDownload = () => {
    if (!outputBlob) return
    const url = URL.createObjectURL(outputBlob)
    const ext = format === 'image/jpeg' ? 'jpg' : format.replace('image/', '')
    const a = document.createElement('a')
    a.href = url
    a.download = `${originalFileName}_edited.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleDownloadSvg = () => {
    if (!vectorResult?.svg) return
    const blob = new Blob([vectorResult.svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${originalFileName}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleCopy = async () => {
    if (!outputBlob) return
    try {
      if (format === 'image/png') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': outputBlob })])
      } else {
        const canvas = document.createElement('canvas')
        canvas.width = outputDimensions.w
        canvas.height = outputDimensions.h
        const ctx = canvas.getContext('2d')
        const img = new Image()
        img.src = outputDataUrl || (previewCanvasRef.current ? previewCanvasRef.current.toDataURL() : '')
        await new Promise((res) => {
          img.onload = res
        })
        ctx?.drawImage(img, 0, 0)
        canvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
          }
        }, 'image/png')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Clipboard write error:', err)
      handleDownload()
    }
  }

  const handleCopySvg = async () => {
    if (!vectorResult?.svg) return
    try {
      await navigator.clipboard.writeText(vectorResult.svg)
      setCopiedSvg(true)
      setTimeout(() => setCopiedSvg(false), 2000)
    } catch (err) {
      console.warn('Clipboard SVG copy error:', err)
      handleDownloadSvg()
    }
  }

  const loadDemoImage = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 800
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1200, 800)
      grad.addColorStop(0, '#1e293b')
      grad.addColorStop(1, '#0f172a')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 1200, 800)

      ctx.fillStyle = '#38bdf8'
      ctx.font = 'bold 50px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('AllTools Image Studio', 600, 360)

      ctx.fillStyle = '#94a3b8'
      ctx.font = '26px sans-serif'
      ctx.fillText('Demo Photograph (1200x800)', 600, 430)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'sample_demo.jpg', { type: 'image/jpeg' })
            handleFileSelect(file)
          }
        },
        'image/jpeg',
        0.95,
      )
    }
  }


  // ─── Status Title & Stats Computation ───────────────────────
  const statusTitle = useMemo(() => {
    if (!loadedImage) return t.titleUpload
    switch (activeTab) {
      case 'crop':
        return t.titleCrop
      case 'remove-bg':
        return t.titleRemoveBg
      case 'watermark':
        return t.titleWatermark
      case 'format':
        return t.titleFormat
      case 'vectorize':
        return t.titleVectorize
      default:
        return ''
    }
  }, [loadedImage, activeTab, t])

  return (
    <div className={`img-root ${isEink ? 'is-eink' : ''}`.trim()}>
      {/* Hidden File Input */}
      <input
        id={fileInputId}
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*,.heic,.heif"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0])
          }
        }}
      />

      <BoardLayout
        variant="wide"
        align="center"
        board={
          <div className="img-stage">
            {/* Top Status Badge */}
            <div className="img-badge-row">
              <span className="img-status-badge">{statusTitle}</span>
            </div>

            {/* Main Card (Matches pdf-editor-card exactly) */}
            <div className="img-editor-card">
              {!loadedImage ? (
                /* ─── UPLOAD DROP ZONE (matches pdf-dropzone) ─── */
                <div
                  className="img-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  aria-label={t.dropTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                  }}
                >
                  <div className="img-drop-icon">
                    <PhotoIcon width={40} height={40} />
                  </div>
                  <div className="img-drop-title">{t.dropTitle}</div>
                  <div className="img-drop-sub">{t.dropSubtitle}</div>
                  <div className="img-drop-actions" onClick={(e) => e.stopPropagation()}>
                    <Button
                      id="img-browse-btn"
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      icon={<UploadIcon />}
                    >
                      {t.browseFiles}
                    </Button>
                    <Button
                      id="img-paste-btn"
                      variant="secondary"
                      size="sm"
                      onClick={handlePasteFromClipboard}
                      icon={<ClipboardIcon />}
                    >
                      {t.fromClipboard}
                    </Button>
                    <Button id="img-demo-btn" variant="secondary" size="sm" onClick={loadDemoImage}>
                      {t.demoImage}
                    </Button>
                  </div>
                </div>
              ) : (
                /* ─── ACTIVE EDITOR: Toolbar + 2-Column Workspace ─── */
                <>
                  {/* Card Header Toolbar (matches pdf-toolbar) */}
                  <div className="img-toolbar">
                    <span className="img-toolbar-filename" title={originalFileName}>
                      {originalFileName}
                    </span>
                    <div className="img-toolbar-actions">
                      {activeTab === 'vectorize' ? (
                        <PillGroup<'vector' | 'split' | 'original'>
                          size="sm"
                          options={[
                            { value: 'vector', label: t.previewVector },
                            { value: 'split', label: t.compareSideBySide },
                            { value: 'original', label: t.previewOriginal },
                          ]}
                          value={vectorViewMode}
                          onChange={setVectorViewMode}
                        />
                      ) : (
                        <Button
                          id="img-original-toggle-btn"
                          variant={showOriginal ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => setShowOriginal((v) => !v)}
                          title={showOriginal ? t.showEdited : t.holdForOriginal}
                        >
                          {showOriginal ? t.showEdited : t.original}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="img-editor-grid">
                    {/* Left Column: Interactive Canvas Viewport */}
                    <div className="img-preview-box">
                      {/* Raster Canvas Viewport (Crop, Remove BG, Watermark, Format) - preserved in DOM */}
                      <div
                        className={`img-canvas-wrap${isDragging ? ' img-canvas-wrap--dragging' : ''}${
                          activeTab === 'remove-bg' || isPickingColor ? ' img-canvas-wrap--picking' : ''
                        }`}
                        style={{ display: activeTab === 'vectorize' ? 'none' : 'flex' }}
                        onPointerDown={activeTab === 'crop' ? handlePointerDown : undefined}
                        onPointerMove={activeTab === 'crop' ? handlePointerMove : undefined}
                        onPointerUp={activeTab === 'crop' ? handlePointerUp : undefined}
                        onPointerCancel={activeTab === 'crop' ? handlePointerUp : undefined}
                        onWheel={activeTab === 'crop' ? handleWheel : undefined}
                        onClick={handleCanvasClick}
                      >
                        <div
                          className="img-framed-container img-checkerboard"
                          style={{
                            aspectRatio:
                              outputDimensions.w > 0 && outputDimensions.h > 0
                                ? `${outputDimensions.w} / ${outputDimensions.h}`
                                : undefined,
                          }}
                        >
                          <canvas ref={previewCanvasRef} className="img-preview-canvas" />

                          {/* Rule of Thirds Grid Overlay */}
                          {!showOriginal && activeTab === 'crop' && (
                            <div className="img-crop-grid-overlay">
                              <div className="img-grid-line img-grid-line--h1" />
                              <div className="img-grid-line img-grid-line--h2" />
                              <div className="img-grid-line img-grid-line--v1" />
                              <div className="img-grid-line img-grid-line--v2" />
                            </div>
                          )}

                          {/* Biometric Passport / ID Guide Overlay (7:9 standard 35×45mm format) */}
                          {!showOriginal && resize.preset === 'id-photo' && resize.crop.showPassportGuide && (
                            <div className="img-passport-overlay" title={t.passportGuide}>
                              <svg
                                className="img-passport-svg"
                                viewBox="0 0 350 450"
                                preserveAspectRatio="xMidYMid meet"
                              >
                                <defs>
                                  <mask id="id-photo-mask">
                                    <rect width="350" height="450" fill="white" />
                                    <ellipse cx="175" cy="200" rx="88" ry="118" fill="black" />
                                  </mask>
                                </defs>

                                {/* Dim outer framing slightly to highlight biometric face area */}
                                <rect
                                  width="350"
                                  height="450"
                                  fill="rgba(0, 0, 0, 0.15)"
                                  mask="url(#id-photo-mask)"
                                />

                                {/* Central Head & Chin Biometric Oval (standard 70-80% height coverage) */}
                                <ellipse
                                  cx="175"
                                  cy="200"
                                  rx="88"
                                  ry="118"
                                  fill="none"
                                  stroke="rgba(255, 255, 255, 0.85)"
                                  strokeWidth="2"
                                  strokeDasharray="6 4"
                                />

                                {/* Central Vertical Alignment Axis */}
                                <line
                                  x1="175"
                                  y1="50"
                                  x2="175"
                                  y2="350"
                                  stroke="rgba(255, 255, 255, 0.4)"
                                  strokeWidth="1.5"
                                  strokeDasharray="3 3"
                                />

                                {/* Crown / Top of Head Guideline */}
                                <line
                                  x1="105"
                                  y1="82"
                                  x2="245"
                                  y2="82"
                                  stroke="rgba(255, 255, 255, 0.65)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 3"
                                />
                                <text
                                  x="175"
                                  y="75"
                                  textAnchor="middle"
                                  fill="rgba(255, 255, 255, 0.8)"
                                  fontSize="11"
                                  fontFamily="system-ui, -apple-system, sans-serif"
                                  letterSpacing="0.5"
                                >
                                  {t.guideTopOfHead}
                                </text>

                                {/* Eye Level Line with Target Ticks */}
                                <line
                                  x1="75"
                                  y1="190"
                                  x2="275"
                                  y2="190"
                                  stroke="rgba(56, 189, 248, 0.85)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 3"
                                />
                                <line
                                  x1="125"
                                  y1="184"
                                  x2="125"
                                  y2="196"
                                  stroke="rgba(56, 189, 248, 0.95)"
                                  strokeWidth="1.5"
                                />
                                <line
                                  x1="225"
                                  y1="184"
                                  x2="225"
                                  y2="196"
                                  stroke="rgba(56, 189, 248, 0.95)"
                                  strokeWidth="1.5"
                                />
                                <text
                                  x="175"
                                  y="184"
                                  textAnchor="middle"
                                  fill="rgba(56, 189, 248, 0.95)"
                                  fontSize="11"
                                  fontWeight="600"
                                  fontFamily="system-ui, -apple-system, sans-serif"
                                  letterSpacing="0.5"
                                >
                                  {t.guideEyeLevel}
                                </text>

                                {/* Chin Limit Guideline */}
                                <line
                                  x1="115"
                                  y1="318"
                                  x2="235"
                                  y2="318"
                                  stroke="rgba(255, 255, 255, 0.65)"
                                  strokeWidth="1.5"
                                  strokeDasharray="4 3"
                                />
                                <text
                                  x="175"
                                  y="334"
                                  textAnchor="middle"
                                  fill="rgba(255, 255, 255, 0.8)"
                                  fontSize="11"
                                  fontFamily="system-ui, -apple-system, sans-serif"
                                  letterSpacing="0.5"
                                >
                                  {t.guideChin}
                                </text>

                                {/* Shoulder Arch Guidelines */}
                                <path
                                  d="M 50 440 C 95 395 135 375 175 375 C 215 375 255 395 300 440"
                                  fill="none"
                                  stroke="rgba(255, 255, 255, 0.45)"
                                  strokeWidth="1.5"
                                  strokeDasharray="5 4"
                                />
                              </svg>
                            </div>
                          )}
                        </div>

                        {isLoading && (
                          <div className="img-loading-overlay" role="status" aria-label={t.processing}>
                            {motionEnabled ? (
                              <span className="img-loading-spinner" aria-hidden="true" />
                            ) : (
                              <span className="img-loading-static" aria-hidden="true">
                                ⏳
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Vector SVG Viewport (Vectorize) */}
                      {activeTab === 'vectorize' && (
                        <div className="img-vector-container">
                          {vectorViewMode === 'split' ? (
                            <div className="img-vector-split">
                              {/* Left: Original Raster */}
                              <div className="img-vector-pane">
                                <div className="img-vector-pane-header">
                                  <span>{t.previewOriginal}</span>
                                </div>
                                <div className="img-vector-pane-body img-checkerboard">
                                  <img
                                    src={vectorInputDataUrl || loadedImage.src}
                                    alt={t.previewOriginal}
                                    className="img-vector-preview-img"
                                  />
                                </div>
                              </div>

                              {/* Right: Traced SVG */}
                              <div className="img-vector-pane">
                                <div className="img-vector-pane-header">
                                  <span>{t.previewVector}</span>
                                </div>
                                <div className="img-vector-pane-body img-checkerboard">
                                  {vectorSvgBlobUrl ? (
                                    <img
                                      src={vectorSvgBlobUrl}
                                      alt={t.previewVector}
                                      className="img-vector-preview-img"
                                    />
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : vectorViewMode === 'vector' ? (
                            <div className="img-vector-single img-checkerboard">
                              {vectorSvgBlobUrl ? (
                                <img
                                  src={vectorSvgBlobUrl}
                                  alt={t.previewVector}
                                  className="img-vector-preview-img"
                                />
                              ) : null}
                            </div>
                          ) : (
                            <div className="img-vector-single img-checkerboard">
                              <img
                                src={vectorInputDataUrl || loadedImage.src}
                                alt={t.previewOriginal}
                                className="img-vector-preview-img"
                              />
                            </div>
                          )}

                          {isVectorizing && (
                            <div className="img-loading-overlay" role="status" aria-label={t.vectorizing}>
                              {motionEnabled ? (
                                <span className="img-loading-spinner" aria-hidden="true" />
                              ) : (
                                <span className="img-loading-static" aria-hidden="true">
                                  ⏳
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Context Settings Panel */}
                    <div className="img-context-panel">
                      {/* TAB 1: CROP & ASPECT RATIO */}
                      {activeTab === 'crop' && (
                        <div className="img-tab-content">
                          {/* Aspect Ratio Presets using clean button grid */}
                          <div className="img-panel-group">
                            <label className="img-panel-label">{t.aspectRatio}</label>
                            <div className="img-preset-grid">
                              {[
                                { value: 'original' as AspectRatioPreset, label: t.presetOriginal },
                                { value: 'id-photo' as AspectRatioPreset, label: t.presetIdPhoto },
                                { value: '1:1' as AspectRatioPreset, label: t.presetSquare },
                                { value: '4:3' as AspectRatioPreset, label: t.presetFourThree },
                                { value: '16:9' as AspectRatioPreset, label: t.presetSixteenNine },
                                { value: '3:2' as AspectRatioPreset, label: t.presetThreeTwo },
                              ].map((p) => (
                                <Button
                                  key={p.value}
                                  variant={resize.preset === p.value ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => setResize((r) => ({ ...r, preset: p.value }))}
                                >
                                  {p.label}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {/* Zoom Level Slider */}
                          <div className="img-panel-group">
                            <div className="img-panel-label-row">
                              <label htmlFor="img-zoom-slider" className="img-panel-label">
                                {t.zoom}
                              </label>
                              <span className="img-panel-badge">{resize.crop.zoom.toFixed(1)}×</span>
                            </div>
                            <input
                              id="img-zoom-slider"
                              type="range"
                              min="1"
                              max="3.5"
                              step="0.05"
                              value={resize.crop.zoom}
                              onChange={(e) =>
                                setResize((r) => ({
                                  ...r,
                                  crop: { ...r.crop, zoom: Number(e.target.value) },
                                }))
                              }
                              className="img-slider"
                              aria-label={t.zoom}
                            />
                            <div className="img-slider-hints">
                              <span>1.0×</span>
                              <span>3.5×</span>
                            </div>
                          </div>

                          {/* Action Buttons: Center and Reset */}
                          <div className="img-actions-row">
                            <Button
                              id="img-crop-center-btn"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setResize((r) => ({
                                  ...r,
                                  crop: { ...r.crop, offsetX: 0, offsetY: 0 },
                                }))
                              }
                            >
                              {t.centerCrop}
                            </Button>
                            <Button
                              id="img-crop-reset-zoom-btn"
                              variant="secondary"
                              size="sm"
                              onClick={() =>
                                setResize((r) => ({
                                  ...r,
                                  crop: { ...r.crop, offsetX: 0, offsetY: 0, zoom: 1 },
                                }))
                              }
                            >
                              {t.resetZoom}
                            </Button>
                          </div>

                          {/* Biometric Face Guide Toggle for ID Photo */}
                          {resize.preset === 'id-photo' && (
                            <div className="img-panel-group">
                              <Toggle
                                id="img-passport-guide-toggle"
                                checked={resize.crop.showPassportGuide}
                                onChange={(checked) =>
                                  setResize((r) => ({
                                    ...r,
                                    crop: { ...r.crop, showPassportGuide: checked },
                                  }))
                                }
                                label={t.passportGuide}
                              />
                            </div>
                          )}

                          {/* Clean guidance text without emojis */}
                          <p className="img-help-text">{t.dragHint}</p>
                        </div>
                      )}

                      {/* TAB 2: REMOVE BACKGROUND & TRANSPARENCY */}
                      {activeTab === 'remove-bg' && (
                        <div className="img-tab-content">
                          {/* Polished Enable/Disable Banner Card */}
                          <div className="img-feature-toggle-card">
                            <div className="img-feature-toggle-info">
                              <span className="img-feature-toggle-title">{t.removeBgEnableLabel}</span>
                              <span className="img-feature-toggle-desc">{t.removeBgEnableDesc}</span>
                            </div>
                            <Toggle
                              id="img-bgremoval-toggle"
                              checked={bgRemoval.enabled}
                              onChange={(checked) => {
                                setBgRemoval((b) => ({ ...b, enabled: checked }))
                                if (checked && format === 'image/jpeg') {
                                  setFormat('image/png')
                                }
                              }}
                              aria-label={t.removeBgEnableLabel}
                            />
                          </div>

                          {/* Feature Options (dimmed when background removal is inactive) */}
                          <div
                            className={`img-feature-body ${!bgRemoval.enabled ? 'img-feature-body--disabled' : ''}`}
                          >
                            {/* Color Sampling & Pipette */}
                            <div className="img-panel-group">
                              <label className="img-panel-label">{t.bgColorLabel}</label>

                              {/* Prominent Eyedropper Action Button */}
                              <Button
                                id="img-pick-color-btn"
                                variant={isPickingColor ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setIsPickingColor((v) => !v)}
                                icon={<PipetteIcon />}
                                style={{ width: '100%', marginBottom: '0.6rem' }}
                              >
                                {isPickingColor ? t.pickingColor : t.pickFromImage}
                              </Button>

                              {/* Native Color Picker & Hex Swatch */}
                              <div className="img-color-picker-row" style={{ marginBottom: '0.6rem' }}>
                                <input
                                  id="img-bgremoval-color"
                                  type="color"
                                  value={bgRemoval.color}
                                  onChange={(e) => {
                                    setBgRemoval((b) => ({ ...b, color: e.target.value, enabled: true }))
                                    if (format === 'image/jpeg') setFormat('image/png')
                                  }}
                                  className="img-color-input"
                                  aria-label={t.bgColorLabel}
                                />
                                <span className="img-color-hex-text">{bgRemoval.color.toUpperCase()}</span>
                              </div>

                              {/* Balanced 4-Column Common Color Swatches */}
                              <div className="img-grid-4">
                                {[
                                  { color: '#ffffff', label: t.presetWhite },
                                  { color: '#000000', label: t.presetBlack },
                                  { color: '#00ff00', label: 'Green' },
                                  { color: '#f3f4f6', label: 'Gray' },
                                ].map((p) => (
                                  <Button
                                    key={p.color}
                                    variant={
                                      bgRemoval.color.toLowerCase() === p.color.toLowerCase() ? 'primary' : 'secondary'
                                    }
                                    size="sm"
                                    onClick={() => {
                                      setBgRemoval((b) => ({ ...b, color: p.color, enabled: true }))
                                      if (format === 'image/jpeg') setFormat('image/png')
                                    }}
                                  >
                                    {p.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Removal Scope: Balanced 2-Column Grid */}
                            <div className="img-panel-group">
                              <label className="img-panel-label">{t.bgScope}</label>
                              <div className="img-grid-2">
                                <Button
                                  variant={bgRemoval.mode === 'contiguous' ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => setBgRemoval((b) => ({ ...b, mode: 'contiguous', enabled: true }))}
                                >
                                  {t.scopeContiguous}
                                </Button>
                                <Button
                                  variant={bgRemoval.mode === 'all' ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => setBgRemoval((b) => ({ ...b, mode: 'all', enabled: true }))}
                                >
                                  {t.scopeAll}
                                </Button>
                              </div>
                            </div>

                            {/* Tolerance Slider */}
                            <div className="img-panel-group">
                              <div className="img-panel-label-row">
                                <label htmlFor="img-tolerance-slider" className="img-panel-label">
                                  {t.tolerance}
                                </label>
                                <span className="img-panel-badge">{bgRemoval.tolerance}%</span>
                              </div>
                              <input
                                id="img-tolerance-slider"
                                type="range"
                                min="1"
                                max="100"
                                step="1"
                                value={bgRemoval.tolerance}
                                onChange={(e) =>
                                  setBgRemoval((b) => ({ ...b, tolerance: Number(e.target.value), enabled: true }))
                                }
                                className="img-slider"
                                aria-label={t.tolerance}
                              />
                              <div className="img-slider-hints">
                                <span>1%</span>
                                <span>100%</span>
                              </div>
                            </div>

                            {/* Feather / Edge Softening Slider */}
                            <div className="img-panel-group">
                              <div className="img-panel-label-row">
                                <label htmlFor="img-feather-slider" className="img-panel-label">
                                  {t.feather}
                                </label>
                                <span className="img-panel-badge">{bgRemoval.feather}px</span>
                              </div>
                              <input
                                id="img-feather-slider"
                                type="range"
                                min="0"
                                max="4"
                                step="1"
                                value={bgRemoval.feather}
                                onChange={(e) =>
                                  setBgRemoval((b) => ({ ...b, feather: Number(e.target.value), enabled: true }))
                                }
                                className="img-slider"
                                aria-label={t.feather}
                              />
                              <div className="img-slider-hints">
                                <span>0px</span>
                                <span>4px</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: WATERMARK & PROTECTION */}
                      {activeTab === 'watermark' && (
                        <div className="img-tab-content">
                          {/* Polished Enable/Disable Banner Card */}
                          <div className="img-feature-toggle-card">
                            <div className="img-feature-toggle-info">
                              <span className="img-feature-toggle-title">{t.watermarkEnableLabel}</span>
                              <span className="img-feature-toggle-desc">{t.watermarkEnableDesc}</span>
                            </div>
                            <Toggle
                              id="img-watermark-toggle"
                              checked={watermark.enabled}
                              onChange={(checked) => setWatermark((w) => ({ ...w, enabled: checked }))}
                              aria-label={t.watermarkEnableLabel}
                            />
                          </div>

                          {/* Feature Options (dimmed when watermark is inactive) */}
                          <div className={`img-feature-body ${!watermark.enabled ? 'img-feature-body--disabled' : ''}`}>
                            <div className="img-panel-group">
                              <Input
                                id="img-watermark-text"
                                label={t.watermarkTextLabel}
                                value={watermark.text}
                                onChange={(e) => setWatermark((w) => ({ ...w, text: e.target.value, enabled: true }))}
                                placeholder={t.watermarkPlaceholder}
                                fullWidth
                              />
                            </div>

                            <div className="img-panel-group">
                              <label className="img-panel-label">{t.layoutPattern}</label>
                              <div className="img-preset-grid">
                                {[
                                  { value: 'diagonal-single' as const, label: t.patternDiagonal },
                                  { value: 'diagonal-repeat' as const, label: t.patternRepeat },
                                  { value: 'bottom-right' as const, label: t.patternCorner },
                                ].map((m) => (
                                  <Button
                                    key={m.value}
                                    variant={watermark.mode === m.value ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setWatermark((w) => ({ ...w, mode: m.value, enabled: true }))}
                                  >
                                    {m.label}
                                  </Button>
                                ))}
                              </div>
                            </div>

                            {/* Compact Sliders Grid */}
                            <div className="img-slider-grid">
                              <div className="img-panel-group">
                                <div className="img-panel-label-row">
                                  <label htmlFor="img-watermark-opacity" className="img-panel-label">
                                    {t.opacity}
                                  </label>
                                  <span className="img-panel-badge">{Math.round(watermark.opacity * 100)}%</span>
                                </div>
                                <input
                                  id="img-watermark-opacity"
                                  type="range"
                                  min="0.1"
                                  max="0.9"
                                  step="0.05"
                                  value={watermark.opacity}
                                  onChange={(e) =>
                                    setWatermark((w) => ({ ...w, opacity: Number(e.target.value), enabled: true }))
                                  }
                                  className="img-slider"
                                />
                              </div>

                              <div className="img-panel-group">
                                <div className="img-panel-label-row">
                                  <label htmlFor="img-watermark-fontsize" className="img-panel-label">
                                    {t.fontSize}
                                  </label>
                                  <span className="img-panel-badge">{watermark.fontSize}px</span>
                                </div>
                                <input
                                  id="img-watermark-fontsize"
                                  type="range"
                                  min="16"
                                  max="72"
                                  step="2"
                                  value={watermark.fontSize}
                                  onChange={(e) =>
                                    setWatermark((w) => ({ ...w, fontSize: Number(e.target.value), enabled: true }))
                                  }
                                  className="img-slider"
                                />
                              </div>
                            </div>

                            {/* Simple Color Picker */}
                            <div className="img-panel-group">
                              <label htmlFor="img-watermark-color" className="img-panel-label">
                                {t.textColor}
                              </label>
                              <div className="img-color-picker-row">
                                <input
                                  id="img-watermark-color"
                                  type="color"
                                  value={watermark.color}
                                  onChange={(e) =>
                                    setWatermark((w) => ({ ...w, color: e.target.value, enabled: true }))
                                  }
                                  className="img-color-input"
                                  aria-label={t.textColor}
                                />
                                <span className="img-color-hex-text">{watermark.color.toUpperCase()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* TAB 3: FORMAT & COMPRESSION */}
                      {activeTab === 'format' && (
                        <div className="img-tab-content">
                          <div className="img-panel-group">
                            <label className="img-panel-label">{t.outputFormat}</label>
                            <div className="img-format-grid">
                              {(['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as ImageFormat[]).map((fmt) => (
                                <Button
                                  key={fmt}
                                  variant={format === fmt ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() => setFormat(fmt)}
                                >
                                  {fmt.replace('image/', '').toUpperCase()}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {format !== 'image/png' && (
                            <div className="img-panel-group">
                              <div className="img-panel-label-row">
                                <label htmlFor="img-quality-slider" className="img-panel-label">
                                  {t.quality}
                                </label>
                                <span className="img-panel-badge">{compression.quality}%</span>
                              </div>
                              <input
                                id="img-quality-slider"
                                type="range"
                                min="10"
                                max="100"
                                step="1"
                                value={compression.quality}
                                onChange={(e) =>
                                  setCompression((c) => ({
                                    ...c,
                                    quality: Number(e.target.value),
                                    targetMaxKb: null,
                                  }))
                                }
                                className="img-slider"
                              />
                              <div className="img-slider-hints">
                                <span>10%</span>
                                <span>100%</span>
                              </div>
                            </div>
                          )}

                          <div className="img-panel-group">
                            <label className="img-panel-label">{t.targetFileSize}</label>
                            <div className="img-budget-grid">
                              {[
                                { value: 'none', label: t.budgetNone },
                                { value: 200, label: '≤ 200 KB' },
                                { value: 500, label: '≤ 500 KB' },
                                { value: 1000, label: '≤ 1 MB' },
                                { value: 2000, label: '≤ 2 MB' },
                              ].map((b) => (
                                <Button
                                  key={String(b.value)}
                                  variant={(compression.targetMaxKb ?? 'none') === b.value ? 'primary' : 'secondary'}
                                  size="sm"
                                  onClick={() =>
                                    setCompression((c) => ({
                                      ...c,
                                      targetMaxKb: b.value === 'none' ? null : (b.value as number),
                                    }))
                                  }
                                >
                                  {b.label}
                                </Button>
                              ))}
                            </div>
                            <p className="img-help-text">{t.budgetHint}</p>
                          </div>
                        </div>
                      )}

                      {/* TAB 4: VECTORIZE TO SVG */}
                      {activeTab === 'vectorize' && (
                        <div className="img-tab-content">
                          {/* Mode: Color vs B&W */}
                          <div className="img-panel-group">
                            <label className="img-panel-label">{t.vectorMode}</label>
                            <div className="img-preset-grid">
                              <Button
                                variant={vectorConfig.mode === 'color' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setVectorConfig((v) => ({ ...v, mode: 'color' }))}
                              >
                                {t.modeColor}
                              </Button>
                              <Button
                                variant={vectorConfig.mode === 'bw' ? 'primary' : 'secondary'}
                                size="sm"
                                onClick={() => setVectorConfig((v) => ({ ...v, mode: 'bw' }))}
                              >
                                {t.modeBW}
                              </Button>
                            </div>
                          </div>

                          {/* Color mode options */}
                          {vectorConfig.mode === 'color' ? (
                            <div className="img-panel-group">
                              <div className="img-panel-label-row">
                                <label className="img-panel-label">{t.colorCount}</label>
                                <span className="img-panel-badge">{vectorConfig.numberOfColors}</span>
                              </div>
                              <div className="img-preset-grid">
                                {[2, 4, 8, 16, 32, 64].map((c) => (
                                  <Button
                                    key={c}
                                    variant={vectorConfig.numberOfColors === c ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setVectorConfig((v) => ({ ...v, numberOfColors: c }))}
                                  >
                                    {c}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="img-panel-group">
                              <div className="img-panel-label-row">
                                <label htmlFor="img-vector-bw-thresh" className="img-panel-label">
                                  {t.bwThreshold}
                                </label>
                                <span className="img-panel-badge">{vectorConfig.bwThreshold}</span>
                              </div>
                              <input
                                id="img-vector-bw-thresh"
                                type="range"
                                min="10"
                                max="240"
                                step="2"
                                value={vectorConfig.bwThreshold}
                                onChange={(e) =>
                                  setVectorConfig((v) => ({ ...v, bwThreshold: Number(e.target.value) }))
                                }
                                className="img-slider"
                              />
                              <div className="img-slider-hints">
                                <span>10</span>
                                <span>240</span>
                              </div>
                            </div>
                          )}



                          {vectorError && (
                            <div className="img-help-text" style={{ color: 'var(--all-danger, #ef4444)' }}>
                              {vectorError}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        }
        controls={
          loadedImage ? (
            <ControlsBar>
              <PillGroup<'crop' | 'remove-bg' | 'watermark' | 'format' | 'vectorize'>
                size="sm"
                options={[
                  { value: 'crop', label: t.cropTab },
                  { value: 'remove-bg', label: t.removeBgTab },
                  { value: 'watermark', label: t.watermarkTab },
                  { value: 'format', label: t.formatTab },
                  { value: 'vectorize', label: t.vectorizeTab },
                ]}
                value={activeTab}
                onChange={setActiveTab}
              />

              <Button
                id="img-download-btn"
                variant="primary"
                size="sm"
                onClick={activeTab === 'vectorize' ? handleDownloadSvg : handleDownload}
                icon={<DownloadIcon />}
                disabled={activeTab === 'vectorize' ? isVectorizing || !vectorResult : isLoading}
              >
                {activeTab === 'vectorize' ? t.downloadSvg : t.download}
              </Button>

              <Button
                id="img-copy-btn"
                variant="secondary"
                size="sm"
                onClick={activeTab === 'vectorize' ? handleCopySvg : handleCopy}
                icon={
                  activeTab === 'vectorize' ? (
                    copiedSvg ? (
                      <CheckIcon />
                    ) : (
                      <CopyIcon />
                    )
                  ) : copied ? (
                    <CheckIcon />
                  ) : (
                    <CopyIcon />
                  )
                }
                disabled={activeTab === 'vectorize' ? isVectorizing || !vectorResult : isLoading}
              >
                {activeTab === 'vectorize' ? (copiedSvg ? t.copiedSvg : t.copySvg) : copied ? t.copied : t.copy}
              </Button>

              <Button
                id="img-change-file-btn"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                icon={<UploadIcon />}
                title={t.newImage}
              >
                {t.newImage}
              </Button>
            </ControlsBar>
          ) : undefined
        }
      />
    </div>
  )
}

export default ImageStudio
