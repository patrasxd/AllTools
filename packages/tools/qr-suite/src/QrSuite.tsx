import React, { useState, useEffect, useRef, useCallback } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import {
  PillGroup,
  StatsHeader,
  GameButton,
  ControlsBar,
  IconDownload,
  IconCopy,
  IconCheck,
  IconCamera,
  IconUpload,
  IconSwitchCamera,
} from '@alltools/ui'
import './styles/qr-suite.css'
import { qrSuiteTranslations } from './i18n'

export interface ToolComponentProps {
  locale: 'en' | 'pl'
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

type QrMode = 'generate' | 'scan'
type PayloadType = 'url' | 'wifi' | 'text' | 'contact'

export function QrSuite({ locale = 'en', setHeader }: ToolComponentProps) {
  const t = qrSuiteTranslations[locale] || qrSuiteTranslations.en
  const [activeMode, setActiveMode] = useState<QrMode>('generate')
  const [payloadType, setPayloadType] = useState<PayloadType>('url')
  const [inputValue, setInputValue] = useState<string>('https://google.com')
  const [wifiSsid, setWifiSsid] = useState<string>('Home_Wi-Fi')
  const [wifiPass, setWifiPass] = useState<string>('bezpiecznehaslo123')
  const [contactName, setContactName] = useState<string>('Jan Kowalski')
  const [contactPhone, setContactPhone] = useState<string>('+48 500 000 000')
  const [copied, setCopied] = useState<boolean>(false)

  // Scanner state
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [scannedResult, setScannedResult] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Multi-camera and zoom state
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('alltools:qr-camera-id')
    } catch {
      return null
    }
  })
  const [zoomCapabilities, setZoomCapabilities] = useState<{ min: number; max: number; step: number } | null>(null)
  const [currentZoom, setCurrentZoom] = useState<number>(1)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const getPayload = (): string => {
    if (payloadType === 'url') return inputValue
    if (payloadType === 'text') return inputValue
    if (payloadType === 'wifi') return `WIFI:T:WPA;S:${wifiSsid};P:${wifiPass};;`
    if (payloadType === 'contact') return `BEGIN:VCARD\nVERSION:3.0\nFN:${contactName}\nTEL:${contactPhone}\nEND:VCARD`
    return inputValue
  }

  const payload = getPayload()

  // Render QR Code to Canvas
  useEffect(() => {
    if (activeMode !== 'generate' || !canvasRef.current || !payload) return
    QRCode.toCanvas(
      canvasRef.current,
      payload,
      {
        width: 160,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      },
      (err) => {
        if (err) console.error(err)
      }
    )
  }, [activeMode, payload])

  // Camera name formatting helper
  const formatCameraName = (dev: MediaDeviceInfo, index: number): string => {
    const label = (dev.label || '').toLowerCase()
    if (label.includes('front') || label.includes('przedni') || label.includes('user') || label.includes('facing front')) {
      return t.frontCamera
    }
    if (label.includes('ultra') || label.includes('0.5') || label.includes('szerok')) {
      return t.ultraWide
    }
    if (label.includes('tele') || label.includes('2x') || label.includes('3x') || label.includes('zoom')) {
      return t.telephoto
    }
    if (
      label.includes('main') ||
      label.includes('główny') ||
      label.includes('1x') ||
      label.includes('wide') ||
      label.includes('camera2 0') ||
      label.includes('back 0')
    ) {
      return t.mainCamera
    }
    if (dev.label) {
      return dev.label.replace(/\(.*\)/, '').trim() || dev.label
    }
    return t.cameraIndex(index + 1)
  }

  const activeDevice = videoDevices.find((d) => d.deviceId === selectedDeviceId)
  const activeDeviceLabel = activeDevice
    ? formatCameraName(activeDevice, videoDevices.indexOf(activeDevice))
    : t.cameraLabel

  // Sync StatsHeader to shell top title bar
  useEffect(() => {
    if (!setHeader) return
    if (activeMode === 'generate') {
      setHeader(
        <StatsHeader
          label={t.qrGenerator}
          items={[
            { key: 'type', label: t.type, value: payloadType.toUpperCase() },
            { key: 'len', label: t.chars, value: payload.length },
          ]}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          label={t.qrScanner}
          items={[
            { key: 'status', label: t.camera, value: isScanning ? (videoDevices.length > 1 ? activeDeviceLabel : 'ON') : 'OFF' },
            { key: 'found', label: t.scan, value: scannedResult ? 'OK' : '—' },
          ]}
        />
      )
    }
  }, [setHeader, activeMode, payloadType, payload.length, isScanning, scannedResult, t, videoDevices.length, activeDeviceLabel])

  // Decode QR from Image file / blob
  const decodeImageBlob = useCallback((blob: Blob) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const src = e.target?.result as string
      if (!src) return
      const img = new Image()
      img.onload = () => {
        const offscreenCanvas = document.createElement('canvas')
        offscreenCanvas.width = img.width
        offscreenCanvas.height = img.height
        const ctx = offscreenCanvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0, img.width, img.height)
          const imgData = ctx.getImageData(0, 0, img.width, img.height)
          const code = jsQR(imgData.data, imgData.width, imgData.height)
          if (code && code.data) {
            setScannedResult(code.data)
            setScanError(null)
            setActiveMode('scan')
          } else {
            setScanError(t.noQrFound)
            setTimeout(() => setScanError(null), 3000)
          }
        }
      }
      img.src = src
    }
    reader.readAsDataURL(blob)
  }, [locale])

  // Global paste handler (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile()
          if (file) {
            decodeImageBlob(file)
            e.preventDefault()
            break
          }
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [decodeImageBlob])

  // Camera scan helpers
  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const startCamera = async (targetDeviceId?: string) => {
    try {
      setScanError(null)
      const deviceIdToUse = targetDeviceId !== undefined ? targetDeviceId : selectedDeviceId

      let stream: MediaStream
      try {
        if (deviceIdToUse) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceIdToUse },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          })
        } else {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          })
        }
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
      }

      streamRef.current = stream
      const track = stream.getVideoTracks()[0]

      // Zoom capability detection
      if (track) {
        try {
          const caps = (track.getCapabilities?.() as { zoom?: { min: number; max: number; step?: number } }) || {}
          if (caps.zoom && typeof caps.zoom.min === 'number' && typeof caps.zoom.max === 'number' && caps.zoom.max > caps.zoom.min) {
            setZoomCapabilities({
              min: caps.zoom.min,
              max: caps.zoom.max,
              step: caps.zoom.step || 0.1,
            })
            const settings = track.getSettings?.() as { zoom?: number }
            setCurrentZoom(settings?.zoom || caps.zoom.min || 1)
          } else {
            setZoomCapabilities(null)
          }
        } catch {
          setZoomCapabilities(null)
        }
      }

      // Enumerate available video inputs
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const vInputs = devices.filter((d) => d.kind === 'videoinput')
        setVideoDevices(vInputs)

        const settings = track?.getSettings?.()
        const activeId = settings?.deviceId || deviceIdToUse || (vInputs[0]?.deviceId ?? null)
        if (activeId) {
          setSelectedDeviceId(activeId)
          try {
            localStorage.setItem('alltools:qr-camera-id', activeId)
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        setIsScanning(true)
        scanLoop()
      }
    } catch (err) {
      console.error('Camera startup error:', err)
      setIsScanning(false)
      setScanError(t.cameraAccessDenied)
    }
  }

  const switchCamera = () => {
    if (videoDevices.length <= 1) return
    const currentIndex = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId)
    const nextIndex = (currentIndex + 1) % videoDevices.length
    const nextDev = videoDevices[nextIndex]
    if (nextDev) {
      stopCamera()
      startCamera(nextDev.deviceId)
    }
  }

  const applyZoom = async (zoomValue: number) => {
    if (!streamRef.current || !zoomCapabilities) return
    const track = streamRef.current.getVideoTracks()[0]
    if (!track) return
    try {
      const clamped = Math.min(Math.max(zoomValue, zoomCapabilities.min), zoomCapabilities.max)
      await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ zoom: clamped }],
      })
      setCurrentZoom(clamped)
    } catch (err) {
      console.error('Zoom constraint error:', err)
    }
  }

  const scanLoop = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanLoop)
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imgData.data, imgData.width, imgData.height)
      if (code && code.data) {
        setScannedResult(code.data)
        stopCamera()
        return
      }
    }
    animRef.current = requestAnimationFrame(scanLoop)
  }

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const downloadPng = () => {
    if (!canvasRef.current) return
    const link = document.createElement('a')
    link.download = `qrcode-${Date.now()}.png`
    link.href = canvasRef.current.toDataURL('image/png')
    link.click()
  }

  const copyToClipboard = () => {
    if (!canvasRef.current) return
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        try {
          navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          navigator.clipboard.writeText(payload)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }
      }
    })
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      decodeImageBlob(file)
    }
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      decodeImageBlob(file)
    }
  }

  const modeOptions = [
    { value: 'generate' as const, label: t.generator },
    { value: 'scan' as const, label: t.scanner },
  ]

  const payloadOptions = [
    { value: 'url' as const, label: 'URL' },
    { value: 'wifi' as const, label: 'Wi-Fi' },
    { value: 'text' as const, label: t.text },
    { value: 'contact' as const, label: t.vCard },
  ]

  return (
    <div className="qr-root">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* 1. Status Block (Top) */}
      <div className="qr-status">
        <div className="qr-status-text">
          {activeMode === 'generate'
            ? t.qrCodeReady
            : isScanning
            ? t.scanningInProgress
            : scanError
            ? scanError
            : scannedResult
            ? t.qrCodeDetected
            : t.pasteOrCamera}
        </div>
        <div className="qr-status-sub">
          {activeMode === 'generate'
            ? `${payloadType.toUpperCase()} · ${t.charsCount(payload.length)}`
            : isScanning
            ? (videoDevices.length > 1
                ? t.activeCamera(activeDeviceLabel)
                : t.pointCamera)
            : t.scanHint}
        </div>
      </div>

      {/* 2. Main Viewport (Center) */}
      <div className="qr-center-area">
        {activeMode === 'generate' ? (
          <div className="qr-generator-view">
            {/* Payload Type Selector */}
            <PillGroup
              options={payloadOptions}
              value={payloadType}
              onChange={setPayloadType}
            />

            {/* Input fields */}
            <div className="qr-input-group">
              {payloadType === 'wifi' ? (
                <div className="qr-input-row">
                  <input
                    type="text"
                    className="qr-input"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="Nazwa Wi-Fi (SSID)"
                  />
                  <input
                    type="text"
                    className="qr-input"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    placeholder="Hasło"
                  />
                </div>
              ) : payloadType === 'contact' ? (
                <div className="qr-input-row">
                  <input
                    type="text"
                    className="qr-input"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Imię i nazwisko"
                  />
                  <input
                    type="text"
                    className="qr-input"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="Telefon"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  className="qr-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={payloadType === 'url' ? 'https://twojadomena.pl' : 'Wpisz dowolny tekst...'}
                />
              )}
            </div>

            {/* QR Canvas Frame */}
            <div className="qr-canvas-card">
              <canvas ref={canvasRef} className="qr-canvas-element" />
            </div>
          </div>
        ) : (
          <div className="qr-scanner-view">
            {/* Camera / Dropzone Viewfinder */}
            <div
              className={`qr-viewfinder ${isScanning ? 'qr-viewfinder--active' : ''}`}
              onClick={() => {
                if (!isScanning && fileInputRef.current) {
                  fileInputRef.current.click()
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <video
                ref={videoRef}
                className="qr-viewfinder-video"
                style={{ display: isScanning ? 'block' : 'none' }}
              />

              {/* Viewfinder Corner Reticles */}
              <div className="qr-reticle">
                <div className="qr-reticle-corner qr-reticle-tl" />
                <div className="qr-reticle-corner qr-reticle-tr" />
                <div className="qr-reticle-corner qr-reticle-bl" />
                <div className="qr-reticle-corner qr-reticle-br" />
                {isScanning && <div className="qr-scan-laser" />}
              </div>

              {/* Viewfinder Overlays when scanning */}
              {isScanning && (
                <>
                  {videoDevices.length > 1 && (
                    <div className="qr-viewfinder-overlay">
                      <button
                        type="button"
                        className="qr-cam-badge"
                        onClick={(e) => {
                          e.stopPropagation()
                          switchCamera()
                        }}
                        title={t.switchCameraAria}
                      >
                        <IconSwitchCamera size={12} />
                        <span>{activeDeviceLabel}</span>
                      </button>
                    </div>
                  )}

                  {zoomCapabilities && zoomCapabilities.max >= 1.5 && (
                    <div className="qr-zoom-toolbar" onClick={(e) => e.stopPropagation()}>
                      {[1, 2, ...(zoomCapabilities.max >= 3 ? [3] : [])].map((z) => {
                        const isActive = Math.abs(currentZoom - z) < 0.2
                        return (
                          <button
                            key={z}
                            type="button"
                            className={`qr-zoom-btn ${isActive ? 'qr-zoom-btn--active' : ''}`}
                            onClick={() => applyZoom(z)}
                          >
                            {z}x
                          </button>
                        )
                      })}
                    </div>
                  )}
                </>
              )}

              {!isScanning && (
                <div className="qr-dropzone-content">
                  <IconUpload size={28} className="qr-dropzone-icon" />
                  <div className="qr-dropzone-title">
                    {t.selectOrDrop}
                  </div>
                  <div className="qr-dropzone-cue">Ctrl + V</div>
                </div>
              )}
            </div>

            {/* Scanned Result Card */}
            {scannedResult && (
              <div className="qr-scanned-card">
                <div className="qr-scanned-label">{t.detectedContent}</div>
                <div className="qr-scanned-content">{scannedResult}</div>
                <div className="qr-scanned-actions">
                  <GameButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(scannedResult)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                  >
                    {copied ? t.copied : t.copy}
                  </GameButton>
                  {scannedResult.startsWith('http://') || scannedResult.startsWith('https://') ? (
                    <a
                      href={scannedResult}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="game-btn game-btn--sm game-btn--primary"
                    >
                      {t.openLink}
                    </a>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Controls Bar (Bottom - Fixed Width Twin to Stopwatch) */}
      <div className="qr-controls-container">
        <ControlsBar>
          {activeMode === 'generate' ? (
            <>
              <GameButton variant="primary" size="md" onClick={downloadPng} icon={<IconDownload size={14} />}>
                {t.downloadPng}
              </GameButton>
              <GameButton variant="secondary" size="md" onClick={copyToClipboard} icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                {copied ? t.copiedExclamation : t.copy}
              </GameButton>
            </>
          ) : (
            <>
              <GameButton
                variant="secondary"
                size="md"
                onClick={() => fileInputRef.current?.click()}
                icon={<IconUpload size={14} />}
              >
                {t.uploadFile}
              </GameButton>
              {isScanning && videoDevices.length > 1 && (
                <GameButton
                  variant="secondary"
                  size="md"
                  onClick={switchCamera}
                  icon={<IconSwitchCamera size={14} />}
                >
                  {t.switchCam}
                </GameButton>
              )}
              <GameButton
                variant={isScanning ? 'danger' : 'primary'}
                size="md"
                onClick={isScanning ? stopCamera : () => startCamera()}
                icon={<IconCamera size={14} />}
              >
                {isScanning ? t.stop : t.start}
              </GameButton>
            </>
          )}

          {/* Mode Switcher Pills */}
          <PillGroup
            options={modeOptions}
            value={activeMode}
            onChange={(m) => {
              stopCamera()
              setActiveMode(m)
            }}
          />
        </ControlsBar>
      </div>
    </div>
  )
}
