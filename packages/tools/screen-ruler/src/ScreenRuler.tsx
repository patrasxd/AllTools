import React, { useState, useEffect, useRef, useCallback } from 'react'
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
const CARD_WIDTH_MM = 85.60
const CARD_HEIGHT_MM = 53.98

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

  // Calibration slider value (width of on-screen card in pixels)
  const [cardWidthPx, setCardWidthPx] = useState<number>(() => {
    return Math.round(pixelsPerMm * CARD_WIDTH_MM)
  })

  // Measurement unit
  const [unit, setUnit] = useState<'cm' | 'inch'>('cm')

  // Measured position in pixels from the left of the ruler box
  const [measuredPx, setMeasuredPx] = useState<number>(180)
  const [isDragging, setIsDragging] = useState<boolean>(false)

  const scaleBoxRef = useRef<HTMLDivElement | null>(null)

  // Save calibration
  const saveCalibration = () => {
    const ppm = cardWidthPx / CARD_WIDTH_MM
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
  const measuredMm = pixelsPerMm > 0 ? measuredPx / pixelsPerMm : 0
  const measuredCm = measuredMm / 10
  const measuredInches = measuredMm / 25.4
  const estimatedDpi = Math.round(pixelsPerMm * 25.4)

  // Header stats injection
  useEffect(() => {
    if (!setHeader) return
    if (!isCalibrated) {
      setHeader(
        <StatsHeader
          label={locale === 'pl' ? 'KALIBRACJA EKRANU' : 'SCREEN CALIBRATION'}
          items={[
            { key: 'card', label: 'WZORZEC', value: '85.6 MM' },
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
  }, [setHeader, isCalibrated, unit, measuredCm, measuredInches, estimatedDpi, locale])

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

  const cardHeightPx = Math.round(cardWidthPx * (CARD_HEIGHT_MM / CARD_WIDTH_MM))

  const unitOptions = [
    { value: 'cm' as const, label: 'Centymetry (cm)' },
    { value: 'inch' as const, label: 'Cale (in)' },
  ]

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
            ? (locale === 'pl' ? 'Dopasuj rozmiar ramki do karty płatniczej' : 'Adjust frame size to match your ID/Credit card')
            : (locale === 'pl' ? `Skalibrowano: ${estimatedDpi} DPI · Dotknij, aby zmierzyć` : `Calibrated: ${estimatedDpi} DPI · Touch & drag to measure`)}
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
              }}
            >
              <div className="ruler-card-chip" />
              <div className="ruler-card-text">
                {locale === 'pl' ? 'Dowód osobisty / Karta płatnicza' : 'ID Card / Credit Card'}
              </div>
              <div className="ruler-card-dim">85.60 mm × 53.98 mm</div>
            </div>

            {/* Slider to adjust on-screen size */}
            <div className="ruler-calib-slider-row">
              <button
                type="button"
                className="game-btn game-btn--sm"
                onClick={() => setCardWidthPx((prev) => Math.max(150, prev - 2))}
              >
                -
              </button>
              <input
                type="range"
                min="200"
                max="480"
                step="1"
                value={cardWidthPx}
                onChange={(e) => setCardWidthPx(parseInt(e.target.value, 10))}
                className="ruler-calib-slider"
              />
              <button
                type="button"
                className="game-btn game-btn--sm"
                onClick={() => setCardWidthPx((prev) => Math.min(500, prev + 2))}
              >
                +
              </button>
            </div>
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
            <GameButton variant="primary" size="md" onClick={saveCalibration}>
              {locale === 'pl' ? 'Zatwierdź kalibrację' : 'Save Calibration'}
            </GameButton>
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
