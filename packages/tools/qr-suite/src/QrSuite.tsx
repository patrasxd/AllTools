import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import {
  BoardLayout,
  Card,
  PillGroup,
  StatsHeader,
  Button,
  ControlsBar,
  DownloadIcon,
  CopyIcon,
  CheckIcon,
  CameraIcon,
  UploadIcon,
  SwitchCameraIcon,
  ExternalLinkIcon,
} from '@all/ui'
import type {
  ToolComponentProps,
  Locale,
  QrMode,
  PayloadType,
  CameraLabels,
  ZoomCapabilities,
} from './types'
import {
  generatePayload,
  formatCameraName,
  clampZoom,
  isWebUrl,
} from './utils/qrPayload'
import { qrSuiteTranslations } from './i18n'
import './styles/qr-suite.css'

export function QrSuite({
  locale = 'en',
  setHeader,
  isEink = false,
}: ToolComponentProps) {
  const t = qrSuiteTranslations[locale as Locale] || qrSuiteTranslations.en

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
  const [zoomCapabilities, setZoomCapabilities] = useState<ZoomCapabilities | null>(null)
  const [currentZoom, setCurrentZoom] = useState<number>(1)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const cameraLabels: CameraLabels = useMemo(
    () => ({
      frontCamera: t.frontCamera,
      ultraWide: t.ultraWide,
      telephoto: t.telephoto,
      mainCamera: t.mainCamera,
      cameraLabel: t.cameraLabel,
      cameraIndex: t.cameraIndex,
    }),
    [t]
  )

  const payload = useMemo(
    () =>
      generatePayload(payloadType, {
        urlValue: inputValue,
        textValue: inputValue,
        wifiSsid,
        wifiPass,
        contactName,
        contactPhone,
      }),
    [payloadType, inputValue, wifiSsid, wifiPass, contactName, contactPhone]
  )

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
        if (err) console.error('QRCode canvas error:', err)
      }
    )
  }, [activeMode, payload])

  const activeDevice = videoDevices.find((d) => d.deviceId === selectedDeviceId)
  const activeDeviceLabel = activeDevice
    ? formatCameraName(activeDevice, videoDevices.indexOf(activeDevice), cameraLabels)
    : t.cameraLabel

  // Sync StatsHeader to shell navbar
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
            {
              key: 'status',
              label: t.camera,
              value: isScanning ? (videoDevices.length > 1 ? activeDeviceLabel : 'ON') : 'OFF',
            },
            { key: 'found', label: t.scan, value: scannedResult ? 'OK' : '—' },
          ]}
        />
      )
    }
  }, [
    setHeader,
    activeMode,
    payloadType,
    payload.length,
    isScanning,
    scannedResult,
    t,
    videoDevices.length,
    activeDeviceLabel,
  ])

  // Decode QR from Image file / blob
  const decodeImageBlob = useCallback(
    (blob: Blob) => {
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
    },
    [t.noQrFound]
  )

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
  const stopCamera = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }, [])

  const scanLoop = useCallback(() => {
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
  }, [stopCamera])

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
      const clamped = clampZoom(zoomValue, zoomCapabilities.min, zoomCapabilities.max)
      await (track as MediaStreamTrack & { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
        advanced: [{ zoom: clamped }],
      })
      setCurrentZoom(clamped)
    } catch (err) {
      console.error('Zoom constraint error:', err)
    }
  }

  // Safe camera release on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

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

  const modeOptions = useMemo(
    () => [
      { value: 'generate' as const, label: t.generator },
      { value: 'scan' as const, label: t.scanner },
    ],
    [t.generator, t.scanner]
  )

  const payloadOptions = useMemo(
    () => [
      { value: 'url' as const, label: 'URL' },
      { value: 'wifi' as const, label: 'Wi-Fi' },
      { value: 'text' as const, label: t.text },
      { value: 'contact' as const, label: t.vCard },
    ],
    [t.text, t.vCard]
  )

  const statusTitle =
    activeMode === 'generate'
      ? t.qrCodeReady
      : isScanning
      ? t.scanningInProgress
      : scanError
      ? scanError
      : scannedResult
      ? t.qrCodeDetected
      : t.pasteOrCamera

  const statusSubtitle =
    activeMode === 'generate'
      ? `${payloadType.toUpperCase()} · ${t.charsCount(payload.length)}`
      : isScanning
      ? videoDevices.length > 1
        ? t.activeCamera(activeDeviceLabel)
        : t.pointCamera
      : t.scanHint

  return (
    <div className={`qr-root ${isEink ? 'is-eink' : ''}`}>
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      <BoardLayout
        variant="wide"
        align="center"
        allowDpadToggle={false}
        board={
          <div className="qr-stage">
            {/* 1. Status Block */}
            <div className="qr-status">
              <h2 className="qr-status-text">{statusTitle}</h2>
              <div className="qr-status-sub">{statusSubtitle}</div>
            </div>

            {/* 2. Main Instrument Card */}
            <Card variant="outlined" padding="md" className="qr-card">
              {activeMode === 'generate' ? (
                <div className="qr-generator-view">
                  {/* Payload Type Selector */}
                  <PillGroup
                    size="sm"
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
                          placeholder={t.ssid}
                          aria-label={t.ssid}
                        />
                        <input
                          type="text"
                          className="qr-input"
                          value={wifiPass}
                          onChange={(e) => setWifiPass(e.target.value)}
                          placeholder={t.password}
                          aria-label={t.password}
                        />
                      </div>
                    ) : payloadType === 'contact' ? (
                      <div className="qr-input-row">
                        <input
                          type="text"
                          className="qr-input"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          placeholder={t.name}
                          aria-label={t.name}
                        />
                        <input
                          type="text"
                          className="qr-input"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder={t.phone}
                          aria-label={t.phone}
                        />
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="qr-input"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={payloadType === 'url' ? t.enterUrl : t.enterText}
                        aria-label={payloadType === 'url' ? t.enterUrl : t.enterText}
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
                    role="region"
                    aria-label="QR scanner viewfinder"
                  >
                    <video
                      ref={videoRef}
                      className="qr-viewfinder-video"
                      style={{ display: isScanning ? 'block' : 'none' }}
                    />

                    {/* Viewfinder Corner Reticles */}
                    <div className="qr-reticle" aria-hidden="true">
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
                              aria-label={t.switchCameraAria}
                            >
                              <SwitchCameraIcon width={12} height={12} />
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
                                  aria-label={`Zoom ${z}x`}
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
                        <UploadIcon width={28} height={28} className="qr-dropzone-icon" />
                        <div className="qr-dropzone-title">{t.selectOrDrop}</div>
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
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
                          onClick={() => {
                            navigator.clipboard.writeText(scannedResult)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          }}
                        >
                          {copied ? t.copied : t.copy}
                        </Button>
                        {isWebUrl(scannedResult) && (
                          <a
                            href={scannedResult}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="all-btn all-btn--primary all-btn--sm qr-open-link-btn"
                          >
                            <ExternalLinkIcon width={14} height={14} style={{ marginRight: '0.35rem' }} />
                            {t.openLink}
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        }
        controls={
          <ControlsBar>
            {activeMode === 'generate' ? (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={downloadPng}
                  icon={<DownloadIcon width={14} height={14} />}
                >
                  {t.downloadPng}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={copyToClipboard}
                  icon={copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
                >
                  {copied ? t.copiedExclamation : t.copy}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  icon={<UploadIcon width={14} height={14} />}
                >
                  {t.uploadFile}
                </Button>
                {isScanning && videoDevices.length > 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={switchCamera}
                    icon={<SwitchCameraIcon width={14} height={14} />}
                  >
                    {t.switchCam}
                  </Button>
                )}
                <Button
                  variant={isScanning ? 'danger' : 'primary'}
                  size="sm"
                  onClick={isScanning ? stopCamera : () => startCamera()}
                  icon={<CameraIcon width={14} height={14} />}
                >
                  {isScanning ? t.stop : t.start}
                </Button>
              </>
            )}

            {/* Mode Switcher Pills */}
            <PillGroup
              size="sm"
              options={modeOptions}
              value={activeMode}
              onChange={(m) => {
                stopCamera()
                setActiveMode(m)
              }}
            />
          </ControlsBar>
        }
      />
    </div>
  )
}
