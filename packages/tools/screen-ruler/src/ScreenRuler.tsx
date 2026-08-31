import React, { useState, useEffect, useRef } from 'react'
import {
  PillGroup,
  StatsHeader,
  GameButton,
  ControlsBar,
} from '@alltools/ui'
import './styles/screen-ruler.css'

export interface ToolComponentProps {
  locale: 'en' | 'pl'
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

// ISO/IEC 7810 ID-1 standard dimensions in millimeters
const CARD_LONG_MM = 85.60
const CARD_SHORT_MM = 53.98

export function ScreenRuler({ locale = 'en', setHeader }: ToolComponentProps) {
  // Calibration: pixels per millimeter (default ~96 DPI = 3.78 ppm)
  const [pixelsPerMm, setPixelsPerMm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:ruler:ppm')
      return saved ? parseFloat(saved) : 3.78
    } catch {
      return 3.78
    }
  })

  const [isCalibrated, setIsCalibrated] = useState<boolean>(() => {
    try {
      return localStorage.getItem('alltools:ruler:calibrated') === 'true'
    } catch {
      return false
    }
  })

  // Card orientation for calibration (landscape vs portrait)
  const [cardOrientation, setCardOrientation] = useState<'landscape' | 'portrait'>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 500) {
      return 'portrait'
    }
    return 'landscape'
  })

  const targetWidthMm = cardOrientation === 'landscape' ? CARD_LONG_MM : CARD_SHORT_MM
  const targetHeightMm = cardOrientation === 'landscape' ? CARD_SHORT_MM : CARD_LONG_MM

  // Calibration slider value (width of on-screen card in pixels)
  const [cardWidthPx, setCardWidthPx] = useState<number>(() => {
    const initTarget = (typeof window !== 'undefined' && window.innerWidth < 500) ? CARD_SHORT_MM : CARD_LONG_MM
    return Math.round(pixelsPerMm * initTarget)
  })

  const handleOrientationChange = (orient: 'landscape' | 'portrait') => {
    setCardOrientation(orient)
    const newTarget = orient === 'landscape' ? CARD_LONG_MM : CARD_SHORT_MM
    setCardWidthPx(Math.round(pixelsPerMm * newTarget))
  }

  // Measurement unit
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm')

  // Workspace element & measured dimensions
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  })

  // Caliper position in pixels from the bottom-right corner (0, 0)
  const [caliperPx, setCaliperPx] = useState<{ x: number; y: number }>({ x: 220, y: 160 })
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Track workspace size dynamically
  useEffect(() => {
    const updateSize = () => {
      if (workspaceRef.current) {
        const rect = workspaceRef.current.getBoundingClientRect()
        if (rect.width > 20 && rect.height > 20) {
          setDims({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          })
        }
      }
    }

    updateSize()
    const timer = setTimeout(updateSize, 30)
    window.addEventListener('resize', updateSize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', updateSize)
    }
  }, [isCalibrated])

  // Save calibration
  const saveCalibration = () => {
    const ppm = cardWidthPx / targetWidthMm
    setPixelsPerMm(ppm)
    setIsCalibrated(true)
    try {
      localStorage.setItem('alltools:ruler:ppm', String(ppm))
      localStorage.setItem('alltools:ruler:calibrated', 'true')
    } catch {
      // Ignore
    }
  }

  const startRecalibration = () => {
    setIsCalibrated(false)
  }

  // Calculated values
  const currentPpm = isCalibrated ? pixelsPerMm : (cardWidthPx / targetWidthMm)
  const measuredMmX = currentPpm > 0 ? caliperPx.x / currentPpm : 0
  const measuredMmY = currentPpm > 0 ? caliperPx.y / currentPpm : 0

  const measuredCmX = measuredMmX / 10
  const measuredCmY = measuredMmY / 10
  const measuredInX = measuredMmX / 25.4
  const measuredInY = measuredMmY / 25.4

  const diagMm = Math.sqrt(measuredMmX * measuredMmX + measuredMmY * measuredMmY)
  const diagCm = diagMm / 10
  const diagIn = diagMm / 25.4

  const estimatedDpi = Math.round(currentPpm * 25.4)

  // Sync StatsHeader (Single source of truth for stats)
  useEffect(() => {
    if (!setHeader) return
    if (!isCalibrated) {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'KALIBRACJA EKRANU' : 'SCREEN CALIBRATION'}
          items={[
            {
              key: 'card',
              label: locale === 'pl' ? 'WZORZEC' : 'STANDARD',
              value: `${targetWidthMm.toFixed(1)} MM`,
            },
            { key: 'dpi', label: 'EST. DPI', value: estimatedDpi },
          ]}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'LINIJKA KĄTOWA 2D' : '2D CORNER RULER'}
          items={[
            {
              key: 'x',
              label: locale === 'pl' ? 'SZEROKOŚĆ (X)' : 'WIDTH (X)',
              value: unit === 'cm' ? `${measuredCmX.toFixed(2)} CM` : `${measuredInX.toFixed(2)} IN`,
            },
            {
              key: 'y',
              label: locale === 'pl' ? 'WYSOKOŚĆ (Y)' : 'HEIGHT (Y)',
              value: unit === 'cm' ? `${measuredCmY.toFixed(2)} CM` : `${measuredInY.toFixed(2)} IN`,
            },
            {
              key: 'diag',
              label: locale === 'pl' ? 'PRZEKĄTNA' : 'DIAGONAL',
              value: unit === 'cm' ? `${diagCm.toFixed(2)} CM` : `${diagIn.toFixed(2)} IN`,
            },
          ]}
        />
      )
    }
  }, [setHeader, isCalibrated, unit, measuredCmX, measuredCmY, diagCm, measuredInX, measuredInY, diagIn, estimatedDpi, targetWidthMm, locale])

  // Touch & drag pointer tracking
  const updatePointer = (clientX: number, clientY: number) => {
    if (!workspaceRef.current) return
    const rect = workspaceRef.current.getBoundingClientRect()
    // Distance from the right edge
    const distRight = Math.max(0, Math.min(rect.width, rect.right - clientX))
    // Distance from the bottom edge
    const distBottom = Math.max(0, Math.min(rect.height, rect.bottom - clientY))
    setCaliperPx({ x: distRight, y: distBottom })
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true)
    updatePointer(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    updatePointer(e.clientX, e.clientY)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const cardHeightPx = Math.round(cardWidthPx * (targetHeightMm / targetWidthMm))

  const orientationOptions = [
    { value: 'landscape' as const, label: locale === 'pl' ? 'Poziomo (85.6 mm)' : 'Horizontal (85.6 mm)' },
    { value: 'portrait' as const, label: locale === 'pl' ? 'Pionowo (54.0 mm)' : 'Vertical (54.0 mm)' },
  ]

  const unitOptions = [
    { value: 'cm' as const, label: locale === 'pl' ? 'Centymetry (cm)' : 'Centimeters (cm)' },
    { value: 'inch' as const, label: locale === 'pl' ? 'Cale (in)' : 'Inches (in)' },
  ]

  const sliderMin = cardOrientation === 'landscape' ? 180 : 120
  const sliderMax = cardOrientation === 'landscape' ? 440 : 260

  // Ruler visual parameters
  const rulerSize = 60
  const maxMmX = Math.max(1, Math.floor((dims.width - rulerSize) / currentPpm))
  const maxMmY = Math.max(1, Math.floor((dims.height - rulerSize) / currentPpm))

  const laserX = Math.max(0, Math.min(dims.width - rulerSize, dims.width - caliperPx.x))
  const laserY = Math.max(0, Math.min(dims.height - rulerSize, dims.height - caliperPx.y))

  return (
    <div className="ruler-root">
      {!isCalibrated ? (
        /* ── 1. Calibration Screen ── */
        <div className="ruler-calib-container">
          <div className="ruler-calib-status">
            <div className="ruler-calib-status-text">
              {locale === 'pl' ? 'Przyłóż kartę do ekranu' : 'Place payment card / ID on screen'}
            </div>
            <div className="ruler-calib-status-sub">
              {locale === 'pl'
                ? `Dopasuj szerokość (${targetWidthMm.toFixed(1)} mm) do fizycznej karty`
                : `Adjust width (${targetWidthMm.toFixed(1)} mm) to match physical card`}
            </div>
          </div>

          <div className="ruler-calib-center">
            {/* Realistic Credit Card Outline */}
            <div
              className="ruler-card-outline"
              style={{
                width: `${cardWidthPx}px`,
                height: `${cardHeightPx}px`,
                aspectRatio: `${targetWidthMm} / ${targetHeightMm}`,
              }}
            >
              <div className="ruler-card-top-row">
                <div className="ruler-card-chip" />
                <svg className="ruler-card-contactless" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                  <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                  <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                </svg>
                <div className="ruler-card-issuer">
                  <div className="ruler-card-issuer-circle" />
                  <div className="ruler-card-issuer-circle" />
                </div>
              </div>

              <div className="ruler-card-center-row">
                <div className="ruler-card-title">
                  {locale === 'pl' ? 'Karta płatnicza / Dowód' : 'Payment Card / ID'}
                </div>
                <div className="ruler-card-dots">•••• •••• •••• ••••</div>
              </div>

              <div className="ruler-card-bottom-row">
                <span>ISO/IEC 7810</span>
                <span>{targetWidthMm.toFixed(1)} × {targetHeightMm.toFixed(1)} mm</span>
              </div>
            </div>

            {/* Slider */}
            <div className="ruler-calib-slider-row">
              <button
                type="button"
                className="game-btn game-btn--sm"
                onClick={() => setCardWidthPx((prev) => Math.max(sliderMin, prev - 2))}
              >
                -
              </button>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step="1"
                value={cardWidthPx}
                onChange={(e) => setCardWidthPx(parseInt(e.target.value, 10))}
                className="ruler-calib-slider"
              />
              <button
                type="button"
                className="game-btn game-btn--sm"
                onClick={() => setCardWidthPx((prev) => Math.min(sliderMax, prev + 2))}
              >
                +
              </button>
            </div>

            {/* Rotate Button */}
            <button
              type="button"
              className="ruler-rotate-btn"
              onClick={() => handleOrientationChange(cardOrientation === 'landscape' ? 'portrait' : 'landscape')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>
                {locale === 'pl'
                  ? (cardOrientation === 'landscape' ? 'Obróć pionowo (54.0 mm)' : 'Obróć poziomo (85.6 mm)')
                  : (cardOrientation === 'landscape' ? 'Rotate vertical (54.0 mm)' : 'Rotate horizontal (85.6 mm)')}
              </span>
            </button>
          </div>

          <div className="ruler-controls-container">
            <ControlsBar>
              <GameButton variant="primary" size="md" onClick={saveCalibration}>
                {locale === 'pl' ? 'Zatwierdź kalibrację' : 'Save Calibration'}
              </GameButton>
              <PillGroup
                options={orientationOptions}
                value={cardOrientation}
                onChange={handleOrientationChange}
              />
            </ControlsBar>
          </div>
        </div>
      ) : (
        /* ── 2. Real Physical 2D Ruler Workspace ── */
        <div
          ref={workspaceRef}
          className="ruler-workspace"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Top Actions Bar (Inside Workspace) */}
          <div className="ruler-top-bar container">
            <button
              type="button"
              className="game-btn game-btn--sm"
              onClick={startRecalibration}
            >
              {locale === 'pl' ? 'Kalibruj ponownie' : 'Recalibrate'}
            </button>

            <PillGroup
              options={unitOptions}
              value={unit}
              onChange={setUnit}
            />
          </div>

          {/* Master SVG Canvas */}
          <svg className="ruler-master-svg" viewBox={`0 0 ${dims.width} ${dims.height}`}>
            {/* Background Area */}
            <rect width={dims.width} height={dims.height} fill="#09090b" />

            {/* Bottom Ruler Band (Horizontal) */}
            <rect
              x={0}
              y={dims.height - rulerSize}
              width={dims.width}
              height={rulerSize}
              fill="#18181b"
              stroke="#ffffff"
              strokeWidth={1.5}
            />

            {/* Right Ruler Band (Vertical) */}
            <rect
              x={dims.width - rulerSize}
              y={0}
              width={rulerSize}
              height={dims.height}
              fill="#18181b"
              stroke="#ffffff"
              strokeWidth={1.5}
            />

            {/* Corner Junction Block (0,0) */}
            <rect
              x={dims.width - rulerSize}
              y={dims.height - rulerSize}
              width={rulerSize}
              height={rulerSize}
              fill="#27272a"
              stroke="#ffffff"
              strokeWidth={1.5}
            />
            <text
              x={dims.width - rulerSize / 2}
              y={dims.height - rulerSize / 2 + 4}
              fill="#ffffff"
              fontSize="12"
              fontFamily="var(--font-mono)"
              fontWeight="bold"
              textAnchor="middle"
            >
              0,0
            </text>

            {/* 1. BOTTOM RULER TICKS (Horizontal from right 0 to left) */}
            {Array.from({ length: maxMmX + 1 }).map((_, mm) => {
              const x = dims.width - rulerSize - mm * currentPpm
              if (x < 0) return null
              const isCm = mm % 10 === 0
              const isHalfCm = mm % 5 === 0
              const tickH = isCm ? 28 : isHalfCm ? 18 : 10

              return (
                <g key={`bx_${mm}`}>
                  <line
                    x1={x}
                    y1={dims.height - rulerSize}
                    x2={x}
                    y2={dims.height - rulerSize + tickH}
                    stroke={isCm ? '#ffffff' : isHalfCm ? '#a1a1aa' : '#52525b'}
                    strokeWidth={isCm ? 2 : 1}
                  />
                  {isCm && (
                    <text
                      x={x}
                      y={dims.height - 14}
                      fill="#ffffff"
                      fontSize="12"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {mm / 10}
                    </text>
                  )}
                </g>
              )
            })}

            {/* 2. RIGHT RULER TICKS (Vertical from bottom 0 to top) */}
            {Array.from({ length: maxMmY + 1 }).map((_, mm) => {
              const y = dims.height - rulerSize - mm * currentPpm
              if (y < 0) return null
              const isCm = mm % 10 === 0
              const isHalfCm = mm % 5 === 0
              const tickW = isCm ? 28 : isHalfCm ? 18 : 10

              return (
                <g key={`ry_${mm}`}>
                  <line
                    x1={dims.width - rulerSize}
                    y1={y}
                    x2={dims.width - rulerSize + tickW}
                    y2={y}
                    stroke={isCm ? '#ffffff' : isHalfCm ? '#a1a1aa' : '#52525b'}
                    strokeWidth={isCm ? 2 : 1}
                  />
                  {isCm && (
                    <text
                      x={dims.width - 14}
                      y={y + 4}
                      fill="#ffffff"
                      fontSize="12"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {mm / 10}
                    </text>
                  )}
                </g>
              )
            })}

            {/* 3. CALIPER LASER CROSSHAIRS */}
            <line
              x1={0}
              y1={laserY}
              x2={dims.width - rulerSize}
              y2={laserY}
              stroke="#ffffff"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            <line
              x1={laserX}
              y1={0}
              x2={laserX}
              y2={dims.height - rulerSize}
              stroke="#ffffff"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />

            {/* Crosshair Target Reticle */}
            <circle
              cx={laserX}
              cy={laserY}
              r={14}
              fill="rgba(0, 0, 0, 0.6)"
              stroke="#ffffff"
              strokeWidth={2}
            />
            <line
              x1={laserX - 8}
              y1={laserY}
              x2={laserX + 8}
              y2={laserY}
              stroke="#ffffff"
              strokeWidth={2}
            />
            <line
              x1={laserX}
              y1={laserY - 8}
              x2={laserX}
              y2={laserY + 8}
              stroke="#ffffff"
              strokeWidth={2}
            />
          </svg>
        </div>
      )}
    </div>
  )
}
