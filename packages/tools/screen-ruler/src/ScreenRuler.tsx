import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  BoardLayout,
  FullBleedLayout,
  Button,
  Slider,
  PillGroup,
  StatsHeader,
  ControlsBar,
  RotateCcwIcon,
} from '@all/ui'
import type {
  ToolComponentProps,
  Locale,
  MeasurementUnit,
  CardOrientation,
  CaliperPosition,
  WorkspaceDimensions,
} from './types'
import {
  CARD_LONG_MM,
  CARD_SHORT_MM,
  RULER_STORAGE_KEY_PPM,
  RULER_STORAGE_KEY_CALIBRATED,
  getInitialPpm,
  calculatePpm,
  calculateCardHeightPx,
  calculateMeasurements,
  formatMeasurement,
  clampPointer,
  clampLaser,
  generateTickMarks,
} from './utils/rulerMath'
import { screenRulerTranslations } from './i18n'
import './styles/screen-ruler.css'

export function ScreenRuler({ locale = 'en', setHeader, isEink = false, theme }: ToolComponentProps) {
  const t = screenRulerTranslations[locale as Locale] || screenRulerTranslations.en

  // Theme detection
  const isDark = theme
    ? theme === 'dark' || theme === 'e-ink-dark'
    : typeof document !== 'undefined'
      ? (document.documentElement.getAttribute('data-theme')?.includes('dark') ?? true)
      : true

  const themeClass = useMemo(() => {
    if (isEink) {
      return theme === 'e-ink-dark' ? 'ruler-root--eink ruler-root--eink-dark' : 'ruler-root--eink'
    }
    return isDark ? 'ruler-root--dark' : 'ruler-root--light'
  }, [isEink, isDark, theme])

  // Calibration state: pixels per millimeter
  const [pixelsPerMm, setPixelsPerMm] = useState<number>(getInitialPpm)

  const [isCalibrated, setIsCalibrated] = useState<boolean>(() => {
    try {
      return localStorage.getItem(RULER_STORAGE_KEY_CALIBRATED) === 'true'
    } catch {
      return false
    }
  })

  // Card orientation for calibration (landscape vs portrait)
  const [cardOrientation, setCardOrientation] = useState<CardOrientation>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'portrait'
    }
    return 'landscape'
  })

  const targetWidthMm = cardOrientation === 'landscape' ? CARD_LONG_MM : CARD_SHORT_MM
  const targetHeightMm = cardOrientation === 'landscape' ? CARD_SHORT_MM : CARD_LONG_MM

  // Calibration slider value (width of on-screen card in pixels)
  const [cardWidthPx, setCardWidthPx] = useState<number>(() => {
    const initTarget = typeof window !== 'undefined' && window.innerWidth < 640 ? CARD_SHORT_MM : CARD_LONG_MM
    return Math.round(getInitialPpm() * initTarget)
  })

  const handleOrientationChange = useCallback(
    (orient: string) => {
      const nextOrient = orient as CardOrientation
      if (nextOrient === cardOrientation) return

      // Preserve the active PPM calibrated so far by the user
      const currentActivePpm = cardWidthPx / targetWidthMm
      setCardOrientation(nextOrient)
      const newTarget = nextOrient === 'landscape' ? CARD_LONG_MM : CARD_SHORT_MM
      const nextWidth = Math.round(currentActivePpm * newTarget)
      setCardWidthPx(nextWidth)
      setPixelsPerMm(currentActivePpm)
    },
    [cardOrientation, cardWidthPx, targetWidthMm],
  )

  // Measurement unit
  const [unit, setUnit] = useState<MeasurementUnit>('cm')

  // Workspace element & measured dimensions
  const workspaceRef = useRef<HTMLDivElement | null>(null)
  const [dims, setDims] = useState<WorkspaceDimensions>({
    width: typeof window !== 'undefined' ? window.innerWidth : 800,
    height: typeof window !== 'undefined' ? window.innerHeight : 600,
  })

  // Caliper position in pixels from bottom-right corner (0, 0)
  const [caliperPx, setCaliperPx] = useState<CaliperPosition>({ x: 220, y: 160 })
  const [isDragging, setIsDragging] = useState<boolean>(false)

  // Track workspace size dynamically via ResizeObserver
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

    let resizeObserver: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && workspaceRef.current) {
      resizeObserver = new ResizeObserver(() => {
        updateSize()
      })
      resizeObserver.observe(workspaceRef.current)
    }

    window.addEventListener('resize', updateSize)
    window.addEventListener('orientationchange', updateSize)

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
      window.removeEventListener('resize', updateSize)
      window.removeEventListener('orientationchange', updateSize)
    }
  }, [isCalibrated])

  // Save calibration
  const saveCalibration = useCallback(() => {
    const ppm = calculatePpm(cardWidthPx, targetWidthMm)
    setPixelsPerMm(ppm)
    setIsCalibrated(true)
    try {
      localStorage.setItem(RULER_STORAGE_KEY_PPM, String(ppm))
      localStorage.setItem(RULER_STORAGE_KEY_CALIBRATED, 'true')
    } catch {
      // Ignore storage errors
    }
  }, [cardWidthPx, targetWidthMm])

  const startRecalibration = useCallback(() => {
    setIsCalibrated(false)
  }, [])

  // Calculated values
  const currentPpm = isCalibrated ? pixelsPerMm : calculatePpm(cardWidthPx, targetWidthMm)
  const measurements = useMemo(() => calculateMeasurements(caliperPx, currentPpm), [caliperPx, currentPpm])

  // Sync StatsHeader (Single source of truth for stats)
  useEffect(() => {
    if (!setHeader) return

    if (!isCalibrated) {
      setHeader(
        <StatsHeader
          items={[
            {
              key: 'card',
              label: t.standard,
              value: `${targetWidthMm.toFixed(1)} MM`,
            },
            {
              key: 'dpi',
              label: 'EST. DPI',
              value: measurements.estimatedDpi,
            },
          ]}
        />,
      )
    } else {
      setHeader(
        <StatsHeader
          items={[
            {
              key: 'x',
              label: t.widthX,
              value: formatMeasurement(unit === 'cm' ? measurements.cmX : measurements.inX, unit),
            },
            {
              key: 'y',
              label: t.heightY,
              value: formatMeasurement(unit === 'cm' ? measurements.cmY : measurements.inY, unit),
            },
            {
              key: 'diag',
              label: t.diagonal,
              value: formatMeasurement(unit === 'cm' ? measurements.diagCm : measurements.diagIn, unit),
            },
          ]}
        />,
      )
    }
  }, [setHeader, isCalibrated, unit, measurements, targetWidthMm, t])

  // Pointer tracking for caliper dragging
  const updatePointer = useCallback((clientX: number, clientY: number) => {
    if (!workspaceRef.current) return
    const rect = workspaceRef.current.getBoundingClientRect()
    const newPos = clampPointer(clientX, clientY, rect)
    setCaliperPx(newPos)
  }, [])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setIsDragging(true)
      updatePointer(e.clientX, e.clientY)
      e.currentTarget.setPointerCapture?.(e.pointerId)
    },
    [updatePointer],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return
      updatePointer(e.clientX, e.clientY)
    },
    [isDragging, updatePointer],
  )

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false)
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId)
    } catch {
      // Ignore if not captured
    }
  }, [])

  // Keyboard accessibility for fine caliper control
  const rulerSize = 60
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const stepMm = e.shiftKey ? 10 : 1
      const stepPx = Math.max(1, Math.round(stepMm * currentPpm))

      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setCaliperPx((prev) => ({
          ...prev,
          x: Math.min(dims.width - rulerSize, prev.x + stepPx),
        }))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setCaliperPx((prev) => ({
          ...prev,
          x: Math.max(0, prev.x - stepPx),
        }))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setCaliperPx((prev) => ({
          ...prev,
          y: Math.min(dims.height - rulerSize, prev.y + stepPx),
        }))
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setCaliperPx((prev) => ({
          ...prev,
          y: Math.max(0, prev.y - stepPx),
        }))
      }
    },
    [currentPpm, dims.width, dims.height, rulerSize],
  )

  const cardHeightPx = calculateCardHeightPx(cardWidthPx, targetWidthMm, targetHeightMm)

  const orientationOptions = useMemo(
    () => [
      { value: 'landscape', label: t.optHorizontal },
      { value: 'portrait', label: t.optVertical },
    ],
    [t.optHorizontal, t.optVertical],
  )

  const unitOptions = useMemo(
    () => [
      { value: 'cm', label: t.optCm },
      { value: 'inch', label: t.optInch },
    ],
    [t.optCm, t.optInch],
  )

  const sliderMin = cardOrientation === 'landscape' ? 240 : 150
  const sliderMax = cardOrientation === 'landscape' ? 580 : 380

  // Ruler visual parameters
  const maxMmX = Math.max(1, Math.floor((dims.width - rulerSize) / currentPpm))
  const maxMmY = Math.max(1, Math.floor((dims.height - rulerSize) / currentPpm))

  const ticksX = useMemo(
    () => generateTickMarks(maxMmX, currentPpm, rulerSize, dims.width),
    [maxMmX, currentPpm, rulerSize, dims.width],
  )

  const ticksY = useMemo(
    () => generateTickMarks(maxMmY, currentPpm, rulerSize, dims.height),
    [maxMmY, currentPpm, rulerSize, dims.height],
  )

  const { laserX, laserY } = useMemo(() => clampLaser(caliperPx, dims, rulerSize), [caliperPx, dims, rulerSize])

  return (
    <div className={`ruler-root ${themeClass}`}>
      {!isCalibrated ? (
        /* ── 1. Calibration Screen (FullBleed Canvas with Hovering Card) ── */
        <FullBleedLayout
          className="ruler-fullbleed"
          floatingToolbar={
            <div className="ruler-calib-floating-status">
              <h2 className="ruler-calib-status-text">{t.placeCard}</h2>
              <div className="ruler-calib-status-sub">{t.adjustWidth(targetWidthMm.toFixed(1))}</div>
            </div>
          }
          footer={
            <div className="ruler-calib-footer">
              <div className="ruler-calib-slider-row">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCardWidthPx((prev) => Math.max(sliderMin, prev - 2))}
                  aria-label="Decrease width"
                >
                  -
                </Button>
                <div className="ruler-calib-slider-wrap">
                  <Slider
                    min={sliderMin}
                    max={sliderMax}
                    step={1}
                    value={cardWidthPx}
                    onChange={(val) => setCardWidthPx(Math.round(val))}
                    aria-label={t.adjustWidth(targetWidthMm.toFixed(1))}
                    fullWidth
                  />
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCardWidthPx((prev) => Math.min(sliderMax, prev + 2))}
                  aria-label="Increase width"
                >
                  +
                </Button>
              </div>

              <ControlsBar>
                <Button variant="primary" size="sm" onClick={saveCalibration}>
                  {t.saveCalibration}
                </Button>
                <PillGroup
                  size="sm"
                  options={orientationOptions}
                  value={cardOrientation}
                  onChange={handleOrientationChange}
                />
              </ControlsBar>
            </div>
          }
        >
          <div className="ruler-calib-canvas">
            {/* Realistic Credit Card Outline Hovering at Actual Size */}
            <div
              className="ruler-card-outline"
              style={{
                width: `${cardWidthPx}px`,
                height: `${cardHeightPx}px`,
                aspectRatio: `${targetWidthMm} / ${targetHeightMm}`,
              }}
              role="img"
              aria-label={`${t.cardTitle} (${targetWidthMm.toFixed(1)} x ${targetHeightMm.toFixed(1)} mm)`}
            >
              <div className="ruler-card-top-row">
                <div className="ruler-card-chip" />
                <svg
                  className="ruler-card-contactless"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
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
                <div className="ruler-card-title">{t.cardTitle}</div>
                <div className="ruler-card-dots">•••• •••• •••• ••••</div>
              </div>

              <div className="ruler-card-bottom-row">
                <span>ISO/IEC 7810</span>
                <span>
                  {targetWidthMm.toFixed(1)} × {targetHeightMm.toFixed(1)} mm
                </span>
              </div>
            </div>
          </div>
        </FullBleedLayout>
      ) : (
        /* ── 2. Real Physical 2D Ruler Workspace with FullBleedLayout ── */
        <FullBleedLayout
          className="ruler-fullbleed"
          floatingToolbar={
            <div className="ruler-top-bar-inner">
              <Button variant="secondary" size="sm" onClick={startRecalibration} aria-label={t.recalibrate}>
                {t.recalibrate}
              </Button>
              <PillGroup
                size="sm"
                options={unitOptions}
                value={unit}
                onChange={(val) => setUnit(val as MeasurementUnit)}
              />
            </div>
          }
        >
          <div
            ref={workspaceRef}
            className="ruler-workspace"
            tabIndex={0}
            role="application"
            aria-label={`${t.cornerRuler2d}: X ${formatMeasurement(measurements.cmX, 'cm')}, Y ${formatMeasurement(measurements.cmY, 'cm')}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onKeyDown={handleKeyDown}
          >
            {/* Master SVG Canvas */}
            <svg className="ruler-master-svg" viewBox={`0 0 ${dims.width} ${dims.height}`} aria-hidden="true">
              {/* Background Area */}
              <rect width={dims.width} height={dims.height} fill="var(--ruler-bg)" />

              {/* Bottom Ruler Band (Horizontal) */}
              <rect
                x={0}
                y={dims.height - rulerSize}
                width={dims.width}
                height={rulerSize}
                fill="var(--ruler-band-bg)"
                stroke="var(--ruler-band-stroke)"
                strokeWidth={1.5}
              />

              {/* Right Ruler Band (Vertical) */}
              <rect
                x={dims.width - rulerSize}
                y={0}
                width={rulerSize}
                height={dims.height}
                fill="var(--ruler-band-bg)"
                stroke="var(--ruler-band-stroke)"
                strokeWidth={1.5}
              />

              {/* Corner Junction Block (0,0) */}
              <rect
                x={dims.width - rulerSize}
                y={dims.height - rulerSize}
                width={rulerSize}
                height={rulerSize}
                fill="var(--ruler-corner-bg)"
                stroke="var(--ruler-band-stroke)"
                strokeWidth={1.5}
              />
              <text
                x={dims.width - rulerSize / 2}
                y={dims.height - rulerSize / 2 + 4}
                fill="var(--ruler-text)"
                fontSize="12"
                fontFamily="var(--all-font-mono, monospace)"
                fontWeight="bold"
                textAnchor="middle"
              >
                0,0
              </text>

              {/* 1. BOTTOM RULER TICKS (Horizontal from right 0 to left) */}
              {ticksX.map((tick) => (
                <g key={`bx_${tick.mm}`}>
                  <line
                    x1={tick.coord}
                    y1={dims.height - rulerSize}
                    x2={tick.coord}
                    y2={dims.height - rulerSize + tick.tickLength}
                    stroke={
                      tick.isCm
                        ? 'var(--ruler-tick-cm)'
                        : tick.isHalfCm
                          ? 'var(--ruler-tick-half)'
                          : 'var(--ruler-tick-mm)'
                    }
                    strokeWidth={tick.isCm ? 2 : 1}
                  />
                  {tick.label && (
                    <text
                      x={tick.coord}
                      y={dims.height - 14}
                      fill="var(--ruler-text)"
                      fontSize="12"
                      fontFamily="var(--all-font-mono, monospace)"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {tick.label}
                    </text>
                  )}
                </g>
              ))}

              {/* 2. RIGHT RULER TICKS (Vertical from bottom 0 to top) */}
              {ticksY.map((tick) => (
                <g key={`ry_${tick.mm}`}>
                  <line
                    x1={dims.width - rulerSize}
                    y1={tick.coord}
                    x2={dims.width - rulerSize + tick.tickLength}
                    y2={tick.coord}
                    stroke={
                      tick.isCm
                        ? 'var(--ruler-tick-cm)'
                        : tick.isHalfCm
                          ? 'var(--ruler-tick-half)'
                          : 'var(--ruler-tick-mm)'
                    }
                    strokeWidth={tick.isCm ? 2 : 1}
                  />
                  {tick.label && (
                    <text
                      x={dims.width - 14}
                      y={tick.coord + 4}
                      fill="var(--ruler-text)"
                      fontSize="12"
                      fontFamily="var(--all-font-mono, monospace)"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {tick.label}
                    </text>
                  )}
                </g>
              ))}

              {/* 3. CALIPER LASER CROSSHAIRS */}
              <line
                x1={0}
                y1={laserY}
                x2={dims.width - rulerSize}
                y2={laserY}
                stroke="var(--ruler-laser)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <line
                x1={laserX}
                y1={0}
                x2={laserX}
                y2={dims.height - rulerSize}
                stroke="var(--ruler-laser)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />

              {/* Crosshair Target Reticle */}
              <circle
                cx={laserX}
                cy={laserY}
                r={14}
                fill="var(--ruler-reticle-bg)"
                stroke="var(--ruler-reticle-stroke)"
                strokeWidth={2}
              />
              <line
                x1={laserX - 8}
                y1={laserY}
                x2={laserX + 8}
                y2={laserY}
                stroke="var(--ruler-reticle-stroke)"
                strokeWidth={2}
              />
              <line
                x1={laserX}
                y1={laserY - 8}
                x2={laserX}
                y2={laserY + 8}
                stroke="var(--ruler-reticle-stroke)"
                strokeWidth={2}
              />
            </svg>
          </div>
        </FullBleedLayout>
      )}
    </div>
  )
}
