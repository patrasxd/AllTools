import React, { useState, useEffect, useRef, useCallback, useId } from 'react'
import {
  GameButton,
  PillGroup,
  StatsHeader,
  ControlsBar,
  IconDownload,
  IconCopy,
  IconRotateCcw,
  IconUpload,
  IconCheck,
  IconPhoto,
  IconCrop,
} from '@alltools/ui'
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
import './styles/image-studio.css'

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

export function ImageStudio({ locale = 'en', setHeader }: ToolComponentProps) {
  const isPl = locale === 'pl'
  const fileInputId = useId()

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
    text: isPl ? 'KOPIA DLA BANKU' : 'CONFIDENTIAL COPY',
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
  const dragStartRef = useRef<{ x: number; y: number; startOffsetX: number; startOffsetY: number } | null>(null)

  // ─── Render Engine Pipeline ─────────────────────────────────
  const processImage = useCallback(async () => {
    if (!loadedImage) return

    setIsLoading(true)
    try {
      const canvas = renderProcessedCanvas(loadedImage, resize, watermark)
      setOutputDimensions({ w: canvas.width, h: canvas.height })

      const { blob, sizeBytes, dataUrl } = await exportCompressedBlob(
        canvas,
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
      console.error('Processing error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [loadedImage, resize, watermark, format, compression])

  useEffect(() => {
    processImage()
  }, [processImage])

  // ─── Top StatsHeader Sync ───────────────────────────────────
  useEffect(() => {
    if (!setHeader) return

    if (!loadedImage) {
      setHeader(
        <StatsHeader
          label={isPl ? 'EDYTOR ZDJĘĆ' : 'IMAGE STUDIO'}
          items={[
            { key: 'status', label: isPl ? 'STATUS' : 'STATUS', value: isPl ? 'OCZEKIWANIE' : 'WAITING' },
            { key: 'heic', label: 'HEIC', value: isPl ? 'OBSŁUGIWANY' : 'SUPPORTED' },
          ]}
        />
      )
      return
    }

    const savedPercent =
      originalBytes > 0 && outputBytes > 0
        ? Math.round(((originalBytes - outputBytes) / originalBytes) * 100)
        : 0

    setHeader(
      <StatsHeader
        label={isPl ? 'EDYTOR ZDJĘĆ' : 'IMAGE STUDIO'}
        items={[
          {
            key: 'size',
            label: isPl ? 'WAGA' : 'SIZE',
            value: `${formatBytes(outputBytes)}${savedPercent > 0 ? ` (-${savedPercent}%)` : ''}`,
          },
          {
            key: 'format',
            label: 'FORMAT',
            value: format.replace('image/', '').toUpperCase(),
          },
          {
            key: 'dim',
            label: isPl ? 'WYMIARY' : 'DIMS',
            value: `${outputDimensions.w}×${outputDimensions.h}`,
          },
        ]}
      />
    )
  }, [setHeader, isPl, loadedImage, originalBytes, outputBytes, format, outputDimensions])

  // ─── Drag to Pan on Preview ─────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    if (showOriginal) return
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startOffsetX: resize.crop.offsetX,
      startOffsetY: resize.crop.offsetY,
    }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStartRef.current) return
    const deltaX = e.clientX - dragStartRef.current.x
    const deltaY = e.clientY - dragStartRef.current.y

    const sensitivity = 0.006 / (resize.crop.zoom || 1)
    const newOffsetX = Math.max(-1, Math.min(1, dragStartRef.current.startOffsetX - deltaX * sensitivity))
    const newOffsetY = Math.max(-1, Math.min(1, dragStartRef.current.startOffsetY - deltaY * sensitivity))

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
    setIsDragging(false)
    dragStartRef.current = null
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {}
  }

  const handleWheel = (e: React.WheelEvent) => {
    if (showOriginal) return
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1
    setResize((r) => ({
      ...r,
      crop: {
        ...r.crop,
        zoom: Math.max(1, Math.min(3.5, Number((r.crop.zoom + zoomDelta).toFixed(2)))),
      },
    }))
  }

  // ─── File Load & Demo ───────────────────────────────────────
  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    try {
      const { image, sizeBytes } = await loadFileToImage(file)
      setLoadedImage(image)
      setOriginalFileName(file.name.replace(/\.[^/.]+$/, ''))
      setOriginalBytes(sizeBytes)
      setResize((r) => ({
        ...r,
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
      alert(isPl ? 'Nie udało się wczytać pliku' : 'Failed to load image file')
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

  const handleDownload = () => {
    if (!outputBlob) return
    const ext = format === 'image/jpeg' ? 'jpg' : format.replace('image/', '')
    const link = document.createElement('a')
    link.href = outputDataUrl
    link.download = `${originalFileName}_edited.${ext}`
    link.click()
  }

  const handleCopy = async () => {
    if (!outputBlob) return
    try {
      if (format === 'image/png') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': outputBlob })])
      } else {
        const tempCanvas = renderProcessedCanvas(loadedImage!, resize, watermark)
        tempCanvas.toBlob(async (pngBlob) => {
          if (pngBlob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })])
          }
        }, 'image/png')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.warn('Clipboard write failed:', err)
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

  const tabOptions = [
    { value: 'crop' as const, label: isPl ? 'Kadr' : 'Crop' },
    { value: 'watermark' as const, label: isPl ? 'Znak' : 'Watermark' },
    { value: 'format' as const, label: isPl ? 'Format' : 'Format' },
  ]

  return (
    <div className="img-root">
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

      {/* 1. Header Title */}
      <div className="img-status">
        <div className="img-status-text">
          {loadedImage
            ? originalFileName
            : isPl
            ? 'Edytor Zdjęć & Konwerter'
            : 'Image Studio & Converter'}
        </div>
      </div>

      {/* 2. Main Center Viewport (Single-Screen Centered Column, Max-Width 400px) */}
      <div className="img-center-area">
        {!loadedImage ? (
          /* ─── UPLOAD DROP ZONE ─── */
          <div
            className="img-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="img-drop-icon">
              <IconPhoto size={36} />
            </div>
            <div className="img-drop-title">
              {isPl ? 'Wybierz lub upuść zdjęcie' : 'Drop or browse image'}
            </div>
            <div className="img-drop-sub">
              {isPl
                ? 'JPG, PNG, WebP, AVIF oraz HEIC z iPhone'
                : 'JPG, PNG, WebP, AVIF & iPhone HEIC'}
            </div>
            <div className="img-drop-actions" onClick={(e) => e.stopPropagation()}>
              <GameButton
                variant="primary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                icon={<IconUpload size={14} />}
              >
                {isPl ? 'Wybierz plik' : 'Browse File'}
              </GameButton>
              <GameButton variant="secondary" size="md" onClick={loadDemoImage}>
                {isPl ? 'Demo' : 'Demo Image'}
              </GameButton>
            </div>
          </div>
        ) : (
          /* ─── ACTIVE EDITOR CONTAINER ─── */
          <div className="img-editor-card">
            {/* Preview Box */}
            <div className="img-preview-box">
              <div className="img-preview-toolbar">
                <span className="img-badge-info">
                  {showOriginal ? (isPl ? 'ORYGINAŁ' : 'ORIGINAL') : `${outputDimensions.w}×${outputDimensions.h} px`}
                </span>
                <button
                  type="button"
                  className={`img-view-toggle ${showOriginal ? 'img-view-toggle--active' : ''}`}
                  onMouseDown={() => setShowOriginal(true)}
                  onMouseUp={() => setShowOriginal(false)}
                  onTouchStart={() => setShowOriginal(true)}
                  onTouchEnd={() => setShowOriginal(false)}
                  title={isPl ? 'Przytrzymaj, aby podejrzeć oryginał' : 'Hold to preview original'}
                >
                  {isPl ? 'Oryginał' : 'Original'}
                </button>
              </div>

              <div
                className={`img-canvas-wrap ${isDragging ? 'img-canvas-wrap--dragging' : ''}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onWheel={handleWheel}
              >
                {showOriginal && loadedImage ? (
                  <img
                    src={loadedImage.src}
                    alt="Original"
                    className="img-preview-element"
                    draggable={false}
                  />
                ) : (
                  outputDataUrl && (
                    <div className="img-framed-container">
                      <img
                        src={outputDataUrl}
                        alt="Processed Output"
                        className="img-preview-element"
                        draggable={false}
                      />

                      {/* Rule of Thirds Grid Overlay */}
                      {activeTab === 'crop' && (
                        <div className="img-crop-grid-overlay">
                          <div className="img-grid-line img-grid-line--h1" />
                          <div className="img-grid-line img-grid-line--h2" />
                          <div className="img-grid-line img-grid-line--v1" />
                          <div className="img-grid-line img-grid-line--v2" />
                        </div>
                      )}

                      {/* Biometric Passport / ID Guide Overlay */}
                      {resize.preset === 'id-photo' && resize.crop.showPassportGuide && (
                        <div className="img-passport-overlay" title={isPl ? 'Zarys biometryczny' : 'Biometric Guide'}>
                          <svg className="img-passport-svg" viewBox="0 0 100 128" preserveAspectRatio="none">
                            <ellipse cx="50" cy="52" rx="28" ry="36" fill="none" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1.5" strokeDasharray="3 3" />
                            <line x1="20" y1="48" x2="80" y2="48" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="2 2" />
                            <line x1="30" y1="74" x2="70" y2="74" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" strokeDasharray="2 2" />
                          </svg>
                        </div>
                      )}
                    </div>
                  )
                )}

                {isLoading && (
                  <div className="img-loading-overlay">
                    <span className="img-loading-spinner" />
                  </div>
                )}
              </div>
            </div>

            {/* Context Panel (Compact tab content fitting exact height) */}
            <div className="img-context-panel">
              {/* TAB 1: CROP & PRESETS */}
              {activeTab === 'crop' && (
                <div className="img-tab-content">
                  <div className="img-preset-bar">
                    {[
                      { id: 'original' as AspectRatioPreset, label: isPl ? 'Oryginał' : 'Original' },
                      { id: 'id-photo' as AspectRatioPreset, label: isPl ? 'Dowód (7:9)' : 'ID (7:9)' },
                      { id: '1:1' as AspectRatioPreset, label: '1:1' },
                      { id: '4:3' as AspectRatioPreset, label: '4:3' },
                      { id: '16:9' as AspectRatioPreset, label: '16:9' },
                      { id: '3:2' as AspectRatioPreset, label: '3:2' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`img-pill-btn ${resize.preset === p.id ? 'img-pill-btn--active' : ''}`}
                        onClick={() => setResize((r) => ({ ...r, preset: p.id }))}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="img-row-sliders">
                    <div className="img-field-slider">
                      <label className="img-slider-label">
                        <span>Zoom</span>
                        <span>{resize.crop.zoom.toFixed(1)}×</span>
                      </label>
                      <input
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
                        className="img-range"
                      />
                    </div>

                    <div className="img-field-slider">
                      <label className="img-slider-label">
                        <span>Pan X / Y</span>
                        <button
                          type="button"
                          className="img-text-link"
                          onClick={() =>
                            setResize((r) => ({
                              ...r,
                              crop: { ...r.crop, offsetX: 0, offsetY: 0, zoom: 1 },
                            }))
                          }
                        >
                          {isPl ? 'Środek' : 'Center'}
                        </button>
                      </label>
                      <input
                        type="range"
                        min="-1"
                        max="1"
                        step="0.02"
                        value={resize.crop.offsetY}
                        onChange={(e) =>
                          setResize((r) => ({
                            ...r,
                            crop: { ...r.crop, offsetY: Number(e.target.value) },
                          }))
                        }
                        className="img-range"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: WATERMARK */}
              {activeTab === 'watermark' && (
                <div className="img-tab-content">
                  <div className="img-watermark-row">
                    <input
                      type="text"
                      className="img-text-input"
                      value={watermark.text}
                      onChange={(e) => setWatermark((w) => ({ ...w, text: e.target.value, enabled: true }))}
                      placeholder={isPl ? 'Treść znaku...' : 'Watermark text...'}
                    />
                    <button
                      type="button"
                      className={`img-pill-btn ${watermark.enabled ? 'img-pill-btn--active' : ''}`}
                      onClick={() => setWatermark((w) => ({ ...w, enabled: !w.enabled }))}
                    >
                      {watermark.enabled ? (isPl ? 'Włączony' : 'Active') : (isPl ? 'Wyłączony' : 'Off')}
                    </button>
                  </div>

                  <div className="img-preset-bar">
                    {[
                      { mode: 'diagonal-single' as const, label: isPl ? 'Przekątna 1×' : 'Diagonal 1×' },
                      { mode: 'diagonal-repeat' as const, label: isPl ? 'Siatka' : 'Repeat Grid' },
                      { mode: 'bottom-right' as const, label: isPl ? 'Róg' : 'Corner' },
                    ].map((m) => (
                      <button
                        key={m.mode}
                        type="button"
                        className={`img-pill-btn ${watermark.mode === m.mode ? 'img-pill-btn--active' : ''}`}
                        onClick={() => setWatermark((w) => ({ ...w, mode: m.mode, enabled: true }))}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  <div className="img-field-slider">
                    <label className="img-slider-label">
                      <span>{isPl ? 'Przezroczystość' : 'Opacity'}</span>
                      <span>{Math.round(watermark.opacity * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={Math.round(watermark.opacity * 100)}
                      onChange={(e) =>
                        setWatermark((w) => ({ ...w, opacity: Number(e.target.value) / 100, enabled: true }))
                      }
                      className="img-range"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: FORMAT & SIZE LIMIT */}
              {activeTab === 'format' && (
                <div className="img-tab-content">
                  <div className="img-preset-bar">
                    {(
                      [
                        { id: 'image/jpeg' as ImageFormat, label: 'JPG' },
                        { id: 'image/png' as ImageFormat, label: 'PNG' },
                        { id: 'image/webp' as ImageFormat, label: 'WebP' },
                        { id: 'image/avif' as ImageFormat, label: 'AVIF' },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className={`img-pill-btn ${format === f.id ? 'img-pill-btn--active' : ''}`}
                        onClick={() => setFormat(f.id)}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div className="img-preset-bar">
                    {[
                      { kb: null, label: isPl ? 'Auto jakość' : 'Auto quality' },
                      { kb: 500, label: '< 500 KB' },
                      { kb: 1024, label: '< 1 MB' },
                      { kb: 2048, label: '< 2 MB' },
                    ].map((item) => (
                      <button
                        key={String(item.kb)}
                        type="button"
                        className={`img-pill-btn ${compression.targetMaxKb === item.kb ? 'img-pill-btn--active' : ''}`}
                        onClick={() => setCompression((c) => ({ ...c, targetMaxKb: item.kb }))}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {compression.targetMaxKb === null && (
                    <div className="img-field-slider">
                      <label className="img-slider-label">
                        <span>{isPl ? 'Jakość' : 'Quality'}</span>
                        <span>{compression.quality}%</span>
                      </label>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={compression.quality}
                        onChange={(e) =>
                          setCompression((c) => ({ ...c, quality: Number(e.target.value) }))
                        }
                        className="img-range"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Bottom Controls Bar (Fixed at bottom edge, exactly matching calc/stopwatch width) */}
      <div className="img-controls-container">
        <ControlsBar>
          {/* Mode Switcher Tabs (Consistent position on the left across views) */}
          {loadedImage && (
            <PillGroup
              options={tabOptions}
              value={activeTab}
              onChange={setActiveTab}
            />
          )}

          {loadedImage && (
            <>
              <GameButton
                variant="primary"
                size="md"
                onClick={handleDownload}
                icon={<IconDownload size={14} />}
              >
                {isPl ? 'Pobierz' : 'Download'}
              </GameButton>

              <GameButton
                variant="secondary"
                size="md"
                onClick={handleCopy}
                icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
              >
                {copied ? (isPl ? 'Skopiowano' : 'Copied') : (isPl ? 'Kopiuj' : 'Copy')}
              </GameButton>

              <GameButton
                variant="ghost"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                icon={<IconUpload size={14} />}
              >
                {isPl ? 'Zmień' : 'New'}
              </GameButton>

              <GameButton
                variant="ghost"
                size="md"
                onClick={() => {
                  setWatermark({
                    enabled: false,
                    text: isPl ? 'KOPIA DLA BANKU' : 'CONFIDENTIAL COPY',
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
                }}
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
