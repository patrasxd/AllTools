import React, { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'
import {
  ToolButton,
  IconCamera,
  IconCopy,
  IconCheck,
  IconTrash,
} from '@alltools/ui'

export interface QrScannerProps {
  locale: 'en' | 'pl'
}

export interface ScanResult {
  text: string
  timestamp: number
}

export const QrScanner: React.FC<QrScannerProps> = ({ locale }) => {
  const [isScanning, setIsScanning] = useState<boolean>(false)
  const [scannedResult, setScannedResult] = useState<string | null>(null)
  const [copied, setCopied] = useState<boolean>(false)
  const [history, setHistory] = useState<ScanResult[]>(() => {
    try {
      const saved = localStorage.getItem('alltools:qr-history')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number | null>(null)

  const saveHistory = (text: string) => {
    const updated = [{ text, timestamp: Date.now() }, ...history.filter((h) => h.text !== text)].slice(0, 10)
    setHistory(updated)
    try {
      localStorage.setItem('alltools:qr-history', JSON.stringify(updated))
    } catch {
      // Ignore
    }
  }

  const stopCamera = useCallback(() => {
    if (animRef.current) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }, [])

  const startCamera = async () => {
    try {
      setErrorMsg(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
        setIsScanning(true)
        scanFrame()
      }
    } catch (err) {
      console.error('Camera error:', err)
      setIsScanning(false)
      setErrorMsg(
        locale === 'pl'
          ? 'Brak dostępu do kamery. Sprawdź uprawnienia w przeglądarce.'
          : 'Camera access denied. Please allow camera permissions.'
      )
    }
  }

  const scanFrame = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animRef.current = requestAnimationFrame(scanFrame)
      return
    }

    const canvas = canvasRef.current || document.createElement('canvas')
    canvasRef.current = canvas
    const ctx = canvas.getContext('2d', { willReadFrequently: true })

    if (ctx && videoRef.current.videoWidth > 0) {
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      })

      if (code && code.data) {
        setScannedResult(code.data)
        saveHistory(code.data)
        stopCamera()
        return
      }
    }

    animRef.current = requestAnimationFrame(scanFrame)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imgData.data, imgData.width, imgData.height)
          if (code && code.data) {
            setScannedResult(code.data)
            saveHistory(code.data)
            setErrorMsg(null)
          } else {
            setErrorMsg(
              locale === 'pl'
                ? 'Nie znaleziono kodu QR na wybranym obrazie.'
                : 'No QR code found in the selected image.'
            )
          }
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const copyResult = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const clearHistory = () => {
    setHistory([])
    localStorage.removeItem('alltools:qr-history')
  }

  const isUrl = (str: string) => /^https?:\/\//i.test(str)

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const t = {
    startScan: locale === 'pl' ? 'Uruchom skaner kamerą' : 'Start Camera Scanner',
    stopScan: locale === 'pl' ? 'Zatrzymaj kamerę' : 'Stop Camera',
    uploadImage: locale === 'pl' ? 'Wczytaj plik z kodem QR' : 'Upload QR Code Image',
    scanResult: locale === 'pl' ? 'Odczytana zawartość:' : 'Scanned Result:',
    openLink: locale === 'pl' ? 'Otwórz link' : 'Open Link',
    copy: locale === 'pl' ? 'Kopiuj' : 'Copy Text',
    copied: locale === 'pl' ? 'Skopiowano!' : 'Copied!',
    history: locale === 'pl' ? 'Historia skanowania' : 'Scan History',
    clearHistory: locale === 'pl' ? 'Wyczyść historię' : 'Clear History',
    noHistory: locale === 'pl' ? 'Brak zapisanych skanów' : 'No previous scans',
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto items-center">
      {/* Video Viewfinder / Scanner Box */}
      <div className="relative w-full aspect-square max-w-[320px] rounded-lg overflow-hidden border-2 border-border bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${isScanning ? 'block' : 'hidden'}`}
        />

        {!isScanning && (
          <div className="flex flex-col items-center gap-3 p-6 text-center text-text-dim">
            <IconCamera size={48} className="opacity-40" />
            <span className="text-xs">{t.uploadImage}</span>
            <label className="cursor-pointer px-3 py-1.5 rounded border border-border bg-surface text-text text-xs hover:border-text transition-all">
              {t.uploadImage}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        )}

        {/* Viewfinder Target & Animated Laser Line */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="relative w-full h-full border-2 border-white/60 rounded">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-bounce" />
            </div>
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2 w-full justify-center">
        <ToolButton
          variant={isScanning ? 'danger' : 'primary'}
          size="md"
          onClick={isScanning ? stopCamera : startCamera}
          icon={<IconCamera size={16} />}
        >
          {isScanning ? t.stopScan : t.startScan}
        </ToolButton>
      </div>

      {errorMsg && (
        <div className="p-3 text-xs text-center border border-border rounded bg-surface-2 text-text-dim w-full">
          {errorMsg}
        </div>
      )}

      {/* Scanned Result Card */}
      {scannedResult && (
        <div className="w-full p-4 rounded-lg border border-border bg-surface flex flex-col gap-3">
          <span className="text-xs font-mono text-text-dim">{t.scanResult}</span>
          <div className="p-3 rounded bg-surface-2 font-mono text-sm break-all select-all border border-border-2">
            {scannedResult}
          </div>
          <div className="flex gap-2">
            <ToolButton
              variant="secondary"
              size="sm"
              onClick={() => copyResult(scannedResult)}
              icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
            >
              {copied ? t.copied : t.copy}
            </ToolButton>
            {isUrl(scannedResult) && (
              <a
                href={scannedResult}
                target="_blank"
                rel="noreferrer noopener"
                className="tool-btn tool-btn-primary tool-btn-sm"
              >
                {t.openLink} ↗
              </a>
            )}
          </div>
        </div>
      )}

      {/* History List */}
      {history.length > 0 && (
        <div className="w-full flex flex-col gap-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-dim uppercase tracking-wider">{t.history}</span>
            <button
              onClick={clearHistory}
              className="text-[11px] text-text-muted hover:text-text flex items-center gap-1"
            >
              <IconTrash size={12} /> {t.clearHistory}
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {history.map((h, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded border border-border bg-surface text-xs"
              >
                <span className="font-mono truncate max-w-[220px]">{h.text}</span>
                <button
                  onClick={() => copyResult(h.text)}
                  className="p-1 hover:text-text text-text-muted"
                  title="Copy"
                >
                  <IconCopy size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
