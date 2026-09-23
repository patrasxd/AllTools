import React, { useEffect, useState, useMemo } from 'react'
import { Badge, Button, PillGroup } from '@all/ui'
import {
  calculateEdgeLevel,
  type EdgeLevelResult,
} from '../utils/sensorUtils'
import { levelTranslations, type Locale } from '../i18n'

export interface TubularLevelProps {
  locale?: Locale
  isEink?: boolean
  calibratedPitch: number
  calibratedRoll: number
  pitch: number
  roll: number
  setPitch: React.Dispatch<React.SetStateAction<number>>
  setRoll: React.Dispatch<React.SetStateAction<number>>
  tolerance?: number
  onEdgeStatsChange?: (stats: EdgeLevelResult) => void
  showSimulationSliders?: boolean
}

export const TubularLevel: React.FC<TubularLevelProps> = ({
  locale = 'en',
  isEink = false,
  calibratedPitch,
  calibratedRoll,
  pitch,
  roll,
  setPitch,
  setRoll,
  tolerance = 0.5,
  onEdgeStatsChange,
  showSimulationSliders,
}) => {
  const t = levelTranslations[locale] || levelTranslations.en
  const [hasOrientationSensor, setHasOrientationSensor] = useState<boolean | null>(null)

  // Edge selection: user selects Bottom Edge (horizontal) or Left Edge (vertical)
  const [selectedEdge, setSelectedEdge] = useState<'bottom' | 'left'>(() => {
    try {
      const saved = localStorage.getItem('alltools:level:selectedEdge')
      if (saved === 'bottom' || saved === 'left') return saved
    } catch {}
    return 'bottom'
  })

  useEffect(() => {
    try {
      localStorage.setItem('alltools:level:selectedEdge', selectedEdge)
    } catch {}
  }, [selectedEdge])

  const edgeOptions = useMemo(
    () => [
      { value: 'bottom', label: t.edge.bottomEdge, id: 'edge-bottom' },
      { value: 'left', label: t.edge.leftEdge, id: 'edge-left' },
    ],
    [t.edge]
  )

  const isVertical = selectedEdge === 'left'

  // Orientation event listener
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        setPitch(e.beta)
        setRoll(e.gamma)
        setHasOrientationSensor(true)
      }
    }

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation)
    } else {
      setHasOrientationSensor(false)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }
  }, [setPitch, setRoll])

  // Calculate Edge Level state with explicit edge orientation
  const edgeResult = calculateEdgeLevel(
    pitch,
    roll,
    calibratedPitch,
    calibratedRoll,
    tolerance,
    0,
    isVertical ? 'landscape-left' : 'portrait'
  )

  useEffect(() => {
    if (onEdgeStatsChange) {
      onEdgeStatsChange(edgeResult)
    }
  }, [
    edgeResult.angle,
    edgeResult.absAngle,
    edgeResult.slopePercent,
    edgeResult.isLevel,
    edgeResult.orientation,
    onEdgeStatsChange,
  ])

  // Vial deviation from 0° (capped to +-15 deg max bubble displacement)
  const maxVialAngle = 15
  const deviation = edgeResult.angle
  const normalizedDisplacement = Math.max(-1, Math.min(1, deviation / maxVialAngle))

  // Bubble position inside 260px vial: center is 130px, max travel +-82px
  const vialLength = 260
  const vialThickness = 48
  const vialCenter = vialLength / 2
  const maxTravel = 82

  // For horizontal (bottom edge): positive angle moves right (+)
  // For vertical (left edge): positive tilt rises to top (- y direction)
  const bubblePosition = isVertical
    ? vialCenter - normalizedDisplacement * maxTravel
    : vialCenter + normalizedDisplacement * maxTravel

  const isMatched = edgeResult.isLevel
  const shouldShowSliders = showSimulationSliders ?? (hasOrientationSensor === false)

  // Handle manual tilt adjustment for desktop testing
  const handleManualAngle = (targetDeg: number) => {
    if (isVertical) {
      setPitch(-targetDeg + calibratedPitch)
      setRoll(-85 + calibratedRoll)
    } else {
      setRoll(targetDeg + calibratedRoll)
      setPitch(85 + calibratedPitch)
    }
  }

  // Horizontal ruler tick marks (along bottom edge)
  const renderHorizontalRulerTicks = () => {
    const ticks = []
    const totalTicks = 35
    for (let i = 0; i <= totalTicks; i++) {
      const isCm = i % 5 === 0
      const isHalfCm = i % 5 === 2.5
      ticks.push(
        <div
          key={i}
          className={`level-ruler-tick ${isCm ? 'level-ruler-tick--major' : isHalfCm ? 'level-ruler-tick--medium' : ''}`}
        >
          {isCm && <span className="level-ruler-num">{i / 5}</span>}
        </div>
      )
    }
    return ticks
  }

  // Vertical ruler tick marks (along left edge)
  const renderVerticalRulerTicks = () => {
    const ticks = []
    const totalTicks = 35
    for (let i = 0; i <= totalTicks; i++) {
      const isCm = i % 5 === 0
      const isHalfCm = i % 5 === 2.5
      ticks.push(
        <div
          key={i}
          className={`level-ruler-tick-v ${isCm ? 'level-ruler-tick-v--major' : isHalfCm ? 'level-ruler-tick-v--medium' : ''}`}
        >
          {isCm && <span className="level-ruler-num-v">{i / 5}</span>}
        </div>
      )
    }
    return ticks
  }

  return (
    <div
      className={`level-tubular-view ${isEink ? 'level-tubular-view--eink' : ''} level-tubular-view--${selectedEdge}`}
    >
      {/* Edge Selector Pills: Bottom Edge & Left Edge */}
      <div className="level-edge-selector-bar">
        <PillGroup
          size="sm"
          options={edgeOptions}
          value={selectedEdge}
          onChange={(val) => setSelectedEdge(val as 'bottom' | 'left')}
        />
      </div>

      {/* Clean Digital Readout */}
      <div className="level-digital-readout">
        <div className="level-degrees-row">
          <span className="level-degree-num">{edgeResult.absAngle.toFixed(1)}°</span>

          {/* Level Badge */}
          <Badge
            variant={isMatched ? 'success' : 'warning'}
            dot
            size="md"
            className="level-status-pill-badge"
          >
            {isMatched ? t.headers.levelStatus : t.headers.tiltStatus}
          </Badge>
        </div>

        {/* Slope Indicator when tilted */}
        {edgeResult.slopePercent > 0 && edgeResult.slopePercent < 999 && (
          <div className="level-sub-desc-row">
            <span className="level-sub-desc">
              {t.edge.slope}: {edgeResult.slopePercent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Physical Spirit Level Ruler Body - adjusts orientation based on selected edge */}
      <div
        className={`level-ruler-instrument-body ${isVertical ? 'level-ruler-instrument-body--vertical' : 'level-ruler-instrument-body--horizontal'} ${isMatched ? 'level-ruler-instrument-body--matched' : ''}`}
      >
        {isVertical ? (
          <>
            {/* Left Edge Vertical Ruler Scale */}
            <div className="level-ruler-scale--vertical" aria-hidden="true">
              {renderVerticalRulerTicks()}
            </div>

            {/* Vertical Vial Container */}
            <div className="level-vial-wrapper level-vial-wrapper--vertical">
              <svg
                viewBox={`0 0 ${vialThickness} ${vialLength}`}
                className="level-vial-svg"
                role="img"
                aria-label={`Vertical Spirit Level: ${edgeResult.absAngle}° angle`}
              >
                <defs>
                  <linearGradient id="liquidGradV" x1="0" y1="0" x2="1" y2="0">
                    <stop
                      offset="0%"
                      stopColor={isMatched ? '#059669' : 'var(--all-accent, #38bdf8)'}
                      stopOpacity="0.85"
                    />
                    <stop
                      offset="50%"
                      stopColor={isMatched ? '#10b981' : 'var(--color-primary-light, #7dd3fc)'}
                      stopOpacity="0.95"
                    />
                    <stop
                      offset="100%"
                      stopColor={isMatched ? '#047857' : 'var(--all-accent, #0284c7)'}
                      stopOpacity="0.9"
                    />
                  </linearGradient>

                  <linearGradient id="glassHighlightV" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                    <stop offset="25%" stopColor="#ffffff" stopOpacity="0.1" />
                    <stop offset="75%" stopColor="#000000" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Vial Outer Frame */}
                <rect
                  x="4"
                  y="4"
                  width={vialThickness - 8}
                  height={vialLength - 8}
                  rx={18}
                  ry={18}
                  fill="url(#liquidGradV)"
                  stroke={isMatched ? '#10b981' : 'var(--all-border-2, rgba(255,255,255,0.3))'}
                  strokeWidth="2.5"
                />

                {/* Glass Tube Highlight */}
                <rect
                  x="4"
                  y="4"
                  width={vialThickness - 8}
                  height={vialLength - 8}
                  rx={18}
                  ry={18}
                  fill="url(#glassHighlightV)"
                />

                {/* Graduation Marks */}
                <line x1="8" y1={vialCenter - 54} x2="40" y2={vialCenter - 54} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="8" y1={vialCenter - 27} x2="40" y2={vialCenter - 27} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="8" y1={vialCenter + 27} x2="40" y2={vialCenter + 27} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="8" y1={vialCenter + 54} x2="40" y2={vialCenter + 54} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Target Center Level Pair of Lines */}
                <line x1="6" y1={vialCenter - 14} x2="42" y2={vialCenter - 14} stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />
                <line x1="6" y1={vialCenter + 14} x2="42" y2={vialCenter + 14} stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />

                {/* Floating Tubular Liquid Bubble (moves vertically) */}
                <rect
                  x="9"
                  y={bubblePosition - 13}
                  width="30"
                  height="26"
                  rx="12"
                  ry="12"
                  fill="#ffffff"
                  fillOpacity="0.92"
                  stroke={isMatched ? '#059669' : '#0284c7'}
                  strokeWidth="1.5"
                  className={isMatched ? 'level-tubular-bubble--matched' : ''}
                  style={isEink ? undefined : { transition: 'y 60ms ease-out' }}
                />
                <circle
                  cx="17"
                  cy={bubblePosition - 3}
                  r="3.5"
                  fill="#ffffff"
                  style={isEink ? undefined : { transition: 'cy 60ms ease-out' }}
                />
              </svg>
            </div>
          </>
        ) : (
          <>
            {/* Bottom Edge Horizontal Ruler Scale */}
            <div className="level-ruler-scale" aria-hidden="true">
              {renderHorizontalRulerTicks()}
            </div>

            {/* Horizontal Vial Container */}
            <div className="level-vial-wrapper">
              <svg
                viewBox={`0 0 ${vialLength} ${vialThickness}`}
                className="level-vial-svg"
                role="img"
                aria-label={`Horizontal Spirit Level: ${edgeResult.absAngle}° angle`}
              >
                <defs>
                  <linearGradient id="liquidGradH" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isMatched ? '#059669' : 'var(--all-accent, #38bdf8)'}
                      stopOpacity="0.85"
                    />
                    <stop
                      offset="50%"
                      stopColor={isMatched ? '#10b981' : 'var(--color-primary-light, #7dd3fc)'}
                      stopOpacity="0.95"
                    />
                    <stop
                      offset="100%"
                      stopColor={isMatched ? '#047857' : 'var(--all-accent, #0284c7)'}
                      stopOpacity="0.9"
                    />
                  </linearGradient>

                  <linearGradient id="glassHighlightH" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                    <stop offset="25%" stopColor="#ffffff" stopOpacity="0.1" />
                    <stop offset="75%" stopColor="#000000" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Vial Outer Frame */}
                <rect
                  x="4"
                  y="4"
                  width={vialLength - 8}
                  height={vialThickness - 8}
                  rx={18}
                  ry={18}
                  fill="url(#liquidGradH)"
                  stroke={isMatched ? '#10b981' : 'var(--all-border-2, rgba(255,255,255,0.3))'}
                  strokeWidth="2.5"
                />

                {/* Glass Tube Highlight */}
                <rect
                  x="4"
                  y="4"
                  width={vialLength - 8}
                  height={vialThickness - 8}
                  rx={18}
                  ry={18}
                  fill="url(#glassHighlightH)"
                />

                {/* Reference Marks */}
                <line x1={vialCenter - 54} y1="8" x2={vialCenter - 54} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1={vialCenter - 27} y1="8" x2={vialCenter - 27} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1={vialCenter + 27} y1="8" x2={vialCenter + 27} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1={vialCenter + 54} y1="8" x2={vialCenter + 54} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Target Center Level Pair of Lines */}
                <line x1={vialCenter - 14} y1="6" x2={vialCenter - 14} y2="42" stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />
                <line x1={vialCenter + 14} y1="6" x2={vialCenter + 14} y2="42" stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />

                {/* Floating Tubular Liquid Bubble (moves horizontally) */}
                <rect
                  x={bubblePosition - 13}
                  y="9"
                  width="26"
                  height="30"
                  rx="12"
                  ry="12"
                  fill="#ffffff"
                  fillOpacity="0.92"
                  stroke={isMatched ? '#059669' : '#0284c7'}
                  strokeWidth="1.5"
                  className={isMatched ? 'level-tubular-bubble--matched' : ''}
                  style={isEink ? undefined : { transition: 'x 60ms ease-out' }}
                />
                <circle
                  cx={bubblePosition - 3}
                  cy="17"
                  r="3.5"
                  fill="#ffffff"
                  style={isEink ? undefined : { transition: 'cx 60ms ease-out' }}
                />
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Manual Tilt Simulation / Desktop Testing Bar */}
      {shouldShowSliders && (
        <div className="level-tubular-sliders">
          <div className="level-slider-item">
            <div className="level-slider-header">
              <span className="level-slider-label">{t.edge.tiltSlider}</span>
              <span className="level-slider-val">
                {edgeResult.angle > 0 ? `+${edgeResult.angle.toFixed(1)}°` : `${edgeResult.angle.toFixed(1)}°`}
              </span>
            </div>
            <input
              type="range"
              min="-20"
              max="20"
              step="0.5"
              value={edgeResult.angle}
              onChange={(e) => handleManualAngle(parseFloat(e.target.value))}
              className="level-slider-input"
              aria-label="Tilt angle simulation slider"
            />
          </div>

          {/* Quick jump angle buttons */}
          <div className="level-quick-angles">
            {[-15, -5, 0, 5, 15].map((deg) => (
              <Button
                key={deg}
                variant={Math.abs(edgeResult.angle - deg) <= 0.5 ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleManualAngle(deg)}
              >
                {deg > 0 ? `+${deg}°` : `${deg}°`}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
