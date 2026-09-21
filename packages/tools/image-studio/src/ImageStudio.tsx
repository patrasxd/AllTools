import React, { useState, useEffect, useRef, useId, useMemo } from 'react'
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
  RestartIcon,
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
} from './types'
import {
  loadFileToImage,
  renderProcessedCanvas,
  exportCompressedBlob,
} from './utils/imageEngine'
import { imageStudioTranslations } from './i18n'
import './styles/image-studio.css'

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

export function ImageStudio({ locale = 'en', setHeader, isEink = false }: ToolComponentProps) {
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
  const [activeTab, setActiveTab] = useState<'crop' | 'watermark' | 'format'>('crop')

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
    text: locale === 'pl' ? 'KOPIA DLA BANKU' : 'CONFIDENTIAL COPY',
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
        />
      )
      return () => {
        setHeader(null)
      }
    }

    const saved =
      originalBytes > 0 && outputBytes > 0
        ? Math.round(((originalBytes - outputBytes) / originalBytes) * 100)
        : 0

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
      />
    )

    return () => {
      setHeader(null)
    }
  }, [setHeader, t, loadedImage, originalBytes, outputBytes, format, outputDimensions])

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

    const processed = renderProcessedCanvas(loadedImage, resize, watermark)
    if (canvas.width !== processed.width) canvas.width = processed.width
    if (canvas.height !== processed.height) canvas.height = processed.height
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(processed, 0, 0)
    }
    setOutputDimensions({ w: processed.width, h: processed.height })
  }, [loadedImage, resize, watermark, showOriginal])

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
          compression.targetMaxKb
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
  }, [loadedImage, resize, watermark, format, compression, isDragging])

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

  // ─── File Load Handlers ─────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '')
      setOriginalFileName(baseName)

      const { image, sizeBytes } = await loadFileToImage(file)
      setLoadedImage(image)
      setOriginalBytes(sizeBytes)
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
    } catch (err) {
      console.error('Failed to load image:', err)
      alert(t.loadError)
    } finally {
      setIsLoading(false)
    }
  }

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
        await new Promise((res) => { img.onload = res })
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

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'sample_demo.jpg', { type: 'image/jpeg' })
          handleFileSelect(file)
        }
      }, 'image/jpeg', 0.95)
    }
  }

  const resetAll = () => {
    setWatermark({
      enabled: false,
      text: locale === 'pl' ? 'KOPIA DLA BANKU' : 'CONFIDENTIAL COPY',
      opacity: 0.4,
      fontSize: 32,
      mode: 'diagonal-single',
      color: '#ffffff',
    })
    setResize({
      preset: 'original',
      customWidth: loadedImage?.naturalWidth || 1200,
      customHeight: loadedImage?.naturalHeight || 800,
      lockAspect: true,
      cropMode: 'cover',
      crop: { offsetX: 0, offsetY: 0, zoom: 1, showPassportGuide: true },
    })
    setFormat('image/jpeg')
    setCompression({ quality: 85, targetMaxKb: null })
  }

  // ─── Status Title & Stats Computation ───────────────────────
  const statusTitle = useMemo(() => {
    if (!loadedImage) return t.titleUpload
    switch (activeTab) {
      case 'crop':
        return t.titleCrop
      case 'watermark':
        return t.titleWatermark
      case 'format':
        return t.titleFormat
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
                  <div className="img-drop-title">
                    {t.dropTitle}
                  </div>
                  <div className="img-drop-sub">
                    {t.dropSubtitle}
                  </div>
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
                      id="img-demo-btn"
                      variant="secondary"
                      size="sm"
                      onClick={loadDemoImage}
                    >
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
                      <Button
                        id="img-original-toggle-btn"
                        variant={showOriginal ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setShowOriginal((v) => !v)}
                        title={showOriginal ? t.showEdited : t.holdForOriginal}
                      >
                        {showOriginal ? t.showEdited : t.original}
                      </Button>
                    </div>
                  </div>

                  <div className="img-editor-grid">
                    {/* Left Column: Interactive Canvas Viewport */}
                    <div className="img-preview-box">
                      <div
                        className={`img-canvas-wrap${isDragging ? ' img-canvas-wrap--dragging' : ''}`}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onWheel={handleWheel}
                      >
                        <div className="img-framed-container">
                          <canvas
                            ref={previewCanvasRef}
                            className="img-preview-canvas"
                          />

                          {/* Rule of Thirds Grid Overlay */}
                          {!showOriginal && activeTab === 'crop' && (
                            <div className="img-crop-grid-overlay">
                              <div className="img-grid-line img-grid-line--h1" />
                              <div className="img-grid-line img-grid-line--h2" />
                              <div className="img-grid-line img-grid-line--v1" />
                              <div className="img-grid-line img-grid-line--v2" />
                            </div>
                          )}

                          {/* Biometric Passport / ID Guide Overlay */}
                          {!showOriginal && resize.preset === 'id-photo' && resize.crop.showPassportGuide && (
                            <div className="img-passport-overlay" title={t.passportGuide}>
                              <svg className="img-passport-svg" viewBox="0 0 100 128" preserveAspectRatio="none">
                                <ellipse cx="50" cy="52" rx="28" ry="36" fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1.5" strokeDasharray="3 3" />
                                <line x1="20" y1="48" x2="80" y2="48" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="2 2" />
                                <line x1="30" y1="74" x2="70" y2="74" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="2 2" />
                              </svg>
                            </div>
                          )}
                        </div>

                        {isLoading && (
                          <div className="img-loading-overlay" role="status" aria-label={t.processing}>
                            {motionEnabled ? (
                              <span className="img-loading-spinner" aria-hidden="true" />
                            ) : (
                              <span className="img-loading-static" aria-hidden="true">⏳</span>
                            )}
                          </div>
                        )}
                      </div>
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
                              <label htmlFor="img-zoom-slider" className="img-panel-label">{t.zoom}</label>
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
                          <p className="img-help-text">
                            {t.dragHint}
                          </p>
                        </div>
                      )}

                      {/* TAB 2: WATERMARK & PROTECTION */}
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
                                  onChange={(e) => setWatermark((w) => ({ ...w, opacity: Number(e.target.value), enabled: true }))}
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
                                  onChange={(e) => setWatermark((w) => ({ ...w, fontSize: Number(e.target.value), enabled: true }))}
                                  className="img-slider"
                                />
                              </div>
                            </div>

                            {/* Simple Color Picker */}
                            <div className="img-panel-group">
                              <label htmlFor="img-watermark-color" className="img-panel-label">{t.textColor}</label>
                              <div className="img-color-picker-row">
                                <input
                                  id="img-watermark-color"
                                  type="color"
                                  value={watermark.color}
                                  onChange={(e) => setWatermark((w) => ({ ...w, color: e.target.value, enabled: true }))}
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
                            <label className="img-panel-label">
                              {t.targetFileSize}
                            </label>
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
                            <p className="img-help-text">
                              {t.budgetHint}
                            </p>
                          </div>
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
              <PillGroup<'crop' | 'watermark' | 'format'>
                size="sm"
                options={[
                  { value: 'crop', label: t.cropTab },
                  { value: 'watermark', label: t.watermarkTab },
                  { value: 'format', label: t.formatTab },
                ]}
                value={activeTab}
                onChange={setActiveTab}
              />

              <Button
                id="img-download-btn"
                variant="primary"
                size="sm"
                onClick={handleDownload}
                icon={<DownloadIcon />}
                disabled={isLoading}
              >
                {t.download}
              </Button>

              <Button
                id="img-copy-btn"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                icon={copied ? <CheckIcon /> : <CopyIcon />}
                disabled={isLoading}
              >
                {copied ? t.copied : t.copy}
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

              <Button
                id="img-reset-btn"
                variant="ghost"
                size="sm"
                onClick={resetAll}
                icon={<RestartIcon />}
                title={t.reset}
              >
                {t.reset}
              </Button>
            </ControlsBar>
          ) : undefined
        }
      />
    </div>
  )
}

export default ImageStudio
