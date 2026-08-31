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
} from '@alltools/ui'
import './styles/qr-suite.css'

export interface ToolComponentProps {
  locale: 'en' | 'pl'
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

type QrMode = 'generate' | 'scan'
type PayloadType = 'url' | 'wifi' | 'text' | 'contact'

export function QrSuite({ locale = 'en', setHeader }: ToolComponentProps) {
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

  // Sync StatsHeader to shell top title bar
  useEffect(() => {
    if (!setHeader) return
    if (activeMode === 'generate') {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'GENERATOR QR' : 'QR GENERATOR'}
          items={[
            { key: 'type', label: 'TYP', value: payloadType.toUpperCase() },
            { key: 'len', label: 'ZNAKI', value: payload.length },
          ]}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'SKANER QR' : 'QR SCANNER'}
          items={[
            { key: 'status', label: 'KAMERA', value: isScanning ? 'ON' : 'OFF' },
            { key: 'found', label: 'ODCZYT', value: scannedResult ? 'OK' : '—' },
          ]}
        />
      )
    }
  }, [setHeader, activeMode, payloadType, payload.length, isScanning, scannedResult, locale])

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
            setScanError(locale === 'pl' ? 'Nie znaleziono kodu QR w tym obrazie' : 'No QR code found in image')
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        setIsScanning(true)
        scanLoop()
      }
    } catch {
      setIsScanning(false)
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
    { value: 'generate' as const, label: locale === 'pl' ? 'Generator' : 'Generator' },
    { value: 'scan' as const, label: locale === 'pl' ? 'Skaner' : 'Scanner' },
  ]

  const payloadOptions = [
    { value: 'url' as const, label: 'URL' },
    { value: 'wifi' as const, label: 'Wi-Fi' },
    { value: 'text' as const, label: locale === 'pl' ? 'Tekst' : 'Text' },
    { value: 'contact' as const, label: locale === 'pl' ? 'vCard' : 'vCard' },
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
            ? (locale === 'pl' ? 'Kod QR gotowy' : 'QR Code ready')
            : isScanning
            ? (locale === 'pl' ? 'Skanowanie w toku...' : 'Scanning in progress...')
            : scanError
            ? scanError
            : scannedResult
            ? (locale === 'pl' ? 'Odczytano kod QR' : 'QR Code detected')
            : (locale === 'pl' ? 'Wklej plik lub włącz aparat' : 'Paste file or start camera')}
        </div>
        <div className="qr-status-sub">
          {activeMode === 'generate'
            ? `${payloadType.toUpperCase()} · ${payload.length} ${locale === 'pl' ? 'znaków' : 'chars'}`
            : isScanning
            ? (locale === 'pl' ? 'Skieruj aparat na kod' : 'Point camera at code')
            : (locale === 'pl' ? 'Obsługuje Ctrl+V, upuszczenie pliku i aparat' : 'Supports Ctrl+V, drag & drop, and camera')}
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

              {!isScanning && (
                <div className="qr-dropzone-content">
                  <IconUpload size={28} className="qr-dropzone-icon" />
                  <div className="qr-dropzone-title">
                    {locale === 'pl' ? 'Wybierz plik lub upuść tutaj' : 'Select file or drop here'}
                  </div>
                  <div className="qr-dropzone-cue">Ctrl + V</div>
                </div>
              )}
            </div>

            {/* Scanned Result Card */}
            {scannedResult && (
              <div className="qr-scanned-card">
                <div className="qr-scanned-label">{locale === 'pl' ? 'Odczytana zawartość' : 'Detected Content'}</div>
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
                    {copied ? (locale === 'pl' ? 'Skopiowano' : 'Copied') : (locale === 'pl' ? 'Kopiuj' : 'Copy')}
                  </GameButton>
                  {scannedResult.startsWith('http://') || scannedResult.startsWith('https://') ? (
                    <a
                      href={scannedResult}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="game-btn game-btn--sm game-btn--primary"
                    >
                      {locale === 'pl' ? 'Otwórz link ↗' : 'Open Link ↗'}
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
                {locale === 'pl' ? 'Pobierz PNG' : 'Download PNG'}
              </GameButton>
              <GameButton variant="secondary" size="md" onClick={copyToClipboard} icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}>
                {copied ? (locale === 'pl' ? 'Skopiowano!' : 'Copied!') : (locale === 'pl' ? 'Kopiuj' : 'Copy')}
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
                {locale === 'pl' ? 'Wybierz plik' : 'Upload File'}
              </GameButton>
              <GameButton
                variant={isScanning ? 'danger' : 'primary'}
                size="md"
                onClick={isScanning ? stopCamera : startCamera}
                icon={<IconCamera size={14} />}
              >
                {isScanning ? (locale === 'pl' ? 'Zatrzymaj' : 'Stop') : (locale === 'pl' ? 'Aparat' : 'Camera')}
              </GameButton>
            </>
          )}

          {/* Mode Switcher Pills (matching Stopwatch STOPER | INTERWAŁY) */}
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
