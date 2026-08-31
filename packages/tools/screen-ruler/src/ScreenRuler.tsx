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

// Standard ID-1 card size in millimeters
const CARD_LONG_MM = 85.60
const CARD_SHORT_MM = 53.98

export function ScreenRuler({ locale = 'en', setHeader }: ToolComponentProps) {
  // Calibration: pixels per millimeter
  const [pixelsPerMm, setPixelsPerMm] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('alltools:ruler:ppm')
      return saved ? parseFloat(saved) : 3.78 // ~96 DPI default
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

  // When card orientation changes, recalculate initial cardWidthPx
  const handleOrientationChange = (orient: 'landscape' | 'portrait') => {
    setCardOrientation(orient)
    const newTarget = orient === 'landscape' ? CARD_LONG_MM : CARD_SHORT_MM
    setCardWidthPx(Math.round(pixelsPerMm * newTarget))
  }

  // Measurement unit
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm')

  // Measured position in pixels from the left of the ruler box
  const [measuredPx, setMeasuredPx] = useState<number>(180)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const scaleBoxRef = useRef<HTMLDivElement | null>(null)

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

  // Calculated measurements
  const currentPpm = isCalibrated ? pixelsPerMm : (cardWidthPx / targetWidthMm)
  const measuredMm = pixelsPerMm > 0 ? measuredPx / pixelsPerMm : 0
  const measuredCm = measuredMm / 10
  const measuredInches = measuredMm / 25.4
  const estimatedDpi = Math.round(currentPpm * 25.4)

  // Header stats injection
  useEffect(() => {
    if (!setHeader) return
    if (!isCalibrated) {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'KALIBRACJA EKRANU' : 'SCREEN CALIBRATION'}
          items={[
            {
              key: 'card',
              label: locale === 'pl' ? 'SZEROKOŚĆ' : 'WIDTH',
              value: `${targetWidthMm.toFixed(1)} MM`,
            },
            { key: 'dpi', label: 'EST. DPI', value: estimatedDpi },
          ]}
        />
      )
    } else {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'POMIAR EKRANOWY' : 'ON-SCREEN MEASURE'}
          items={[
            {
              key: 'val',
              label: unit.toUpperCase(),
              value: unit === 'cm' ? `${measuredCm.toFixed(2)} CM` : `${measuredInches.toFixed(2)} IN`,
            },
            { key: 'dpi', label: 'DPI', value: estimatedDpi },
          ]}
        />
      )
    }
  }, [setHeader, isCalibrated, unit, measuredCm, measuredInches, estimatedDpi, targetWidthMm, locale])

  // Ruler pointer handling
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!scaleBoxRef.current) return
    setIsDragging(true)
    const rect = scaleBoxRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    setMeasuredPx(x)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !scaleBoxRef.current) return
    const rect = scaleBoxRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left))
    setMeasuredPx(x)
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
    { value: 'cm' as const, label: 'Centymetry (cm)' },
    { value: 'inch' as const, label: 'Cale (in)' },
  ]

  const sliderMin = cardOrientation === 'landscape' ? 180 : 110
  const sliderMax = cardOrientation === 'landscape' ? 480 : 340

  return (
    <div className="ruler-root">
      {/* 1. Status Block (Top) */}
      <div className="ruler-status">
        <div className="ruler-status-text">
          {!isCalibrated
            ? (locale === 'pl' ? 'Przyłóż kartę do ekranu' : 'Place card on screen')
            : unit === 'cm'
            ? `${measuredCm.toFixed(2)} cm (${measuredMm.toFixed(1)} mm)`
            : `${measuredInches.toFixed(2)} in (${(measuredInches * 16).toFixed(1)}/16")`}
        </div>
        <div className="ruler-status-sub">
          {!isCalibrated
            ? (locale === 'pl'
              ? `Dopasuj szerokość (${targetWidthMm.toFixed(1)} mm) do fizycznej karty`
              : `Adjust width (${targetWidthMm.toFixed(1)} mm) to match physical card`)
            : (locale === 'pl'
              ? `Skalibrowano: ${estimatedDpi} DPI · Dotknij, aby zmierzyć`
              : `Calibrated: ${estimatedDpi} DPI · Touch & drag to measure`)}
        </div>
      </div>

      {/* 2. Main Viewport Area (Center) */}
      <div className="ruler-center-area">
        {!isCalibrated ? (
          <div className="ruler-calib-view">
            {/* Target Card Visual */}
            <div
              className="ruler-card-outline"
              style={{
                width: `${cardWidthPx}px`,
                height: `${cardHeightPx}px`,
                maxHeight: 'min(240px, calc(100vh - 360px))',
              }}
            >
              <div className="ruler-card-chip" />
              <div className="ruler-card-text">
                {locale === 'pl' ? 'Karta płatnicza / Dowód' : 'Payment Card / ID'}
              </div>
              <div className="ruler-card-dim">
                {targetWidthMm.toFixed(1)} mm × {targetHeightMm.toFixed(1)} mm
              </div>
            </div>

            {/* Slider to adjust on-screen size */}
            <div className="ruler-calib-slider-row">
              <button
                type="button"
                className="game-btn game-btn--sm"
                onClick={() => setCardWidthPx((prev) => Math.max(sliderMin, prev - 2))}
                aria-label="Decrease width"
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
                aria-label="Increase width"
              >
                +
              </button>
            </div>

            {/* Quick Rotate Button for Mobile */}
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
                  ? (cardOrientation === 'landscape' ? 'Obróć pionowo (na telefon)' : 'Obróć poziomo (na komputer)')
                  : (cardOrientation === 'landscape' ? 'Rotate vertical (for phone)' : 'Rotate horizontal (for desktop)')}
              </span>
            </button>
          </div>
        ) : (
          <div className="ruler-measure-view">
            {/* Measurement Readout */}
            <div className="ruler-readout-pill">
              {unit === 'cm' ? measuredCm.toFixed(2) : measuredInches.toFixed(2)}
              <span className="ruler-readout-unit">{unit === 'cm' ? 'cm' : 'in'}</span>
            </div>

            {/* Interactive Caliper Ruler Scale */}
            <div
              ref={scaleBoxRef}
              className="ruler-scale-box"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Ruler SVG Graphics */}
              <svg className="ruler-scale-svg">
                {/* Metric scale on top (0 - 30cm) */}
                {Array.from({ length: 60 }).map((_, mm) => {
                  const x = mm * 5 * pixelsPerMm
                  const isCm = mm % 2 === 0
                  const isMajor = mm % 10 === 0
                  const height = isMajor ? 28 : isCm ? 18 : 10

                  return (
                    <g key={`m_${mm}`}>
                      <line
                        x1={x}
                        y1={0}
                        x2={x}
                        y2={height}
                        stroke={isMajor ? 'var(--text)' : 'var(--text-muted)'}
                        strokeWidth={isMajor ? 1.5 : 1}
                      />
                      {isMajor && (
                        <text
                          x={x + 3}
                          y={38}
                          fill="var(--text-dim)"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                        >
                          {mm / 2}
                        </text>
                      )}
                    </g>
                  )
                })}

                {/* Imperial scale on bottom (0 - 12in) */}
                {Array.from({ length: 96 }).map((_, sixteenth) => {
                  const mm = (sixteenth / 16) * 25.4
                  const x = mm * pixelsPerMm
                  const isInch = sixteenth % 16 === 0
                  const isHalf = sixteenth % 8 === 0
                  const isQuarter = sixteenth % 4 === 0
                  const height = isInch ? 28 : isHalf ? 20 : isQuarter ? 14 : 8

                  return (
                    <g key={`i_${sixteenth}`}>
                      <line
                        x1={x}
                        y1={180}
                        x2={x}
                        y2={180 - height}
                        stroke={isInch ? 'var(--text)' : 'var(--text-muted)'}
                        strokeWidth={isInch ? 1.5 : 1}
                      />
                      {isInch && (
                        <text
                          x={x + 3}
                          y={145}
                          fill="var(--text-dim)"
                          fontSize="9"
                          fontFamily="var(--font-mono)"
                        >
                          {sixteenth / 16}"
                        </text>
                      )}
                    </g>
                  )
                })}
              </svg>

              {/* Moveable Caliper Indicator */}
              <div
                className="ruler-caliper-line"
                style={{ transform: `translateX(${measuredPx}px)` }}
              >
                <div className="ruler-caliper-handle">↔</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Controls Bar (Bottom - Fixed Width Twin to Stopwatch) */}
      <div className="ruler-controls-container">
        <ControlsBar>
          {!isCalibrated ? (
            <>
              <GameButton variant="primary" size="md" onClick={saveCalibration}>
                {locale === 'pl' ? 'Zatwierdź kalibrację' : 'Save Calibration'}
              </GameButton>

              {/* Orientation Pills */}
              <PillGroup
                options={orientationOptions}
                value={cardOrientation}
                onChange={handleOrientationChange}
              />
            </>
          ) : (
            <>
              <GameButton variant="secondary" size="md" onClick={startRecalibration}>
                {locale === 'pl' ? 'Kalibruj ponownie' : 'Recalibrate'}
              </GameButton>

              {/* Unit Switcher Pills */}
              <PillGroup
                options={unitOptions}
                value={unit}
                onChange={setUnit}
              />
            </>
          )}
        </ControlsBar>
      </div>
    </div>
  )
}
