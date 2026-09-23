import React, { useEffect, useState } from 'react'
import { Badge, Button } from '@all/ui'
import {
  calculateEdgeLevel,
  type PhoneOrientation,
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
  targetAngle: number
  setTargetAngle: (angle: number) => void
  forcedEdge?: PhoneOrientation
  setForcedEdge: (edge: PhoneOrientation) => void
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
  targetAngle,
  setTargetAngle,
  forcedEdge,
  setForcedEdge,
  onEdgeStatsChange,
  showSimulationSliders,
}) => {
  const t = levelTranslations[locale] || levelTranslations.en
  const [hasOrientationSensor, setHasOrientationSensor] = useState<boolean | null>(null)

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

  // Calculate Edge Level state
  const edgeResult = calculateEdgeLevel(
    pitch,
    roll,
    calibratedPitch,
    calibratedRoll,
    tolerance,
    targetAngle,
    forcedEdge
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
    edgeResult.isTargetMatch,
    edgeResult.orientation,
    onEdgeStatsChange,
  ])

  // Active orientation name
  const edgeLabel = (() => {
    switch (edgeResult.orientation) {
      case 'landscape-right':
        return t.edge.rightEdge
      case 'landscape-left':
        return t.edge.leftEdge
      case 'portrait-inverted':
        return t.edge.topEdge
      case 'portrait':
      default:
        return t.edge.bottomEdge
    }
  })()

  // Target angle presets
  const TARGET_PRESETS = [0, 30, 45, 90]

  // Vial deviation from target angle (capped to +-15 deg max bubble displacement)
  const maxVialAngle = 15
  const deviation = edgeResult.absAngle - targetAngle
  const normalizedDisplacement = Math.max(-1, Math.min(1, deviation / maxVialAngle))

  // Bubble position inside 260px vial: center is 130px, max travel +-85px
  const vialLength = 260
  const vialThickness = 48
  const vialCenter = vialLength / 2
  const maxTravel = 82
  const bubblePosition = vialCenter + normalizedDisplacement * maxTravel

  const isMatched = targetAngle === 0 ? edgeResult.isLevel : edgeResult.isTargetMatch
  const isVerticalVial =
    edgeResult.orientation === 'landscape-right' || edgeResult.orientation === 'landscape-left'

  const shouldShowSliders = showSimulationSliders ?? (hasOrientationSensor === false)

  // Handle manual tilt adjustment for desktop testing
  const handleManualAngle = (targetDeg: number) => {
    // Set appropriate pitch/roll to match targetDeg given current edge
    switch (edgeResult.orientation) {
      case 'landscape-right':
        setPitch(targetDeg + calibratedPitch)
        setRoll(85 + calibratedRoll)
        break
      case 'landscape-left':
        setPitch(-targetDeg + calibratedPitch)
        setRoll(-85 + calibratedRoll)
        break
      case 'portrait-inverted':
        setRoll(-targetDeg + calibratedRoll)
        setPitch(-85 + calibratedPitch)
        break
      case 'portrait':
      default:
        setRoll(targetDeg + calibratedRoll)
        setPitch(85 + calibratedPitch)
        break
    }
  }

  // Ruler tick marks (representing millimeters and centimeters along the edge)
  const renderRulerTicks = () => {
    const ticks = []
    const totalTicks = 35 // 35 tick marks
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

  return (
    <div
      className={`level-tubular-view ${isEink ? 'level-tubular-view--eink' : ''} level-tubular-view--${edgeResult.orientation}`}
    >
      {/* Dynamic Digital Readout with Degree, Slope % & Match Badge */}
      <div className="level-digital-readout">
        <div className="level-degrees-row">
          <span className="level-degree-num">{edgeResult.absAngle.toFixed(1)}°</span>

          {/* Slope / Grade Percentage Badge */}
          <div className="level-slope-pill" title={`${t.edge.grade}: ${edgeResult.slopePercent}%`}>
            <span className="level-slope-label">{t.edge.slope}</span>
            <span className="level-slope-val">
              {edgeResult.slopePercent >= 999 ? '∞' : `${edgeResult.slopePercent.toFixed(1)}%`}
            </span>
          </div>

          {/* Level or Target Match Badge */}
          <Badge
            variant={isMatched ? 'success' : 'warning'}
            dot
            size="md"
            className="level-status-pill-badge"
          >
            {isMatched
              ? targetAngle === 0
                ? t.headers.levelStatus
                : `${t.edge.targetAngle} ${targetAngle}°`
              : t.headers.tiltStatus}
          </Badge>
        </div>

        {/* Descriptive Status Line */}
        <div className="level-sub-desc-row">
          <span className="level-edge-tag">{edgeLabel}</span>
          <span className="level-sub-desc">
            {isMatched
              ? targetAngle === 0
                ? t.status.perfectLevel
                : `${t.edge.angleMatch} (${targetAngle.toFixed(1)}°)`
              : targetAngle > 0
              ? `Δ ${Math.abs(deviation).toFixed(1)}° ${deviation > 0 ? '(+)' : '(-)'} ${t.edge.targetAngle}`
              : t.status.tiltDetected}
          </span>
        </div>
      </div>

      {/* Target Angle Presets (0°, 30°, 45°, 90°) */}
      <div className="level-target-presets-bar">
        <span className="level-target-label">{t.edge.targetAngle}:</span>
        <div className="level-target-buttons">
          {TARGET_PRESETS.map((deg) => (
            <button
              key={deg}
              type="button"
              className={`level-target-preset-btn ${targetAngle === deg ? 'level-target-preset-btn--active' : ''}`}
              onClick={() => setTargetAngle(deg)}
            >
              {deg === 0 ? '0° (Level)' : deg === 90 ? '90° (Plumb)' : `${deg}°`}
            </button>
          ))}
        </div>
      </div>

      {/* Physical Spirit Level Ruler Body */}
      <div
        className={`level-ruler-instrument-body ${isMatched ? 'level-ruler-instrument-body--matched' : ''}`}
      >
        {/* Active Resting Edge Ruler Graduation Ticks */}
        <div
          className={`level-ruler-scale level-ruler-scale--${edgeResult.orientation}`}
          aria-hidden="true"
        >
          {renderRulerTicks()}
        </div>

        {/* Tubular Glass Vial Container */}
        <div
          className={`level-vial-wrapper ${isVerticalVial ? 'level-vial-wrapper--vertical' : ''}`}
        >
          <svg
            viewBox={isVerticalVial ? `0 0 ${vialThickness} ${vialLength}` : `0 0 ${vialLength} ${vialThickness}`}
            className="level-vial-svg"
            role="img"
            aria-label={`Tubular Spirit Level: ${edgeResult.absAngle}° angle, ${edgeResult.slopePercent}% slope`}
          >
            <defs>
              {/* Vial Liquid Gradient */}
              <linearGradient
                id="liquidGrad"
                x1="0"
                y1="0"
                x2={isVerticalVial ? '1' : '0'}
                y2={isVerticalVial ? '0' : '1'}
              >
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

              {/* Glass Tube Highlight Gradient */}
              <linearGradient
                id="glassHighlight"
                x1="0"
                y1="0"
                x2={isVerticalVial ? '1' : '0'}
                y2={isVerticalVial ? '0' : '1'}
              >
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
                <stop offset="25%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="75%" stopColor="#000000" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Vial Outer Frame / Body */}
            {isVerticalVial ? (
              <rect
                x="4"
                y="4"
                width={vialThickness - 8}
                height={vialLength - 8}
                rx={18}
                ry={18}
                fill="url(#liquidGrad)"
                stroke={isMatched ? '#10b981' : 'var(--all-border-2, rgba(255,255,255,0.3))'}
                strokeWidth="2.5"
              />
            ) : (
              <rect
                x="4"
                y="4"
                width={vialLength - 8}
                height={vialThickness - 8}
                rx={18}
                ry={18}
                fill="url(#liquidGrad)"
                stroke={isMatched ? '#10b981' : 'var(--all-border-2, rgba(255,255,255,0.3))'}
                strokeWidth="2.5"
              />
            )}

            {/* Glass Tube Highlight Overlay */}
            {isVerticalVial ? (
              <rect
                x="4"
                y="4"
                width={vialThickness - 8}
                height={vialLength - 8}
                rx={18}
                ry={18}
                fill="url(#glassHighlight)"
              />
            ) : (
              <rect
                x="4"
                y="4"
                width={vialLength - 8}
                height={vialThickness - 8}
                rx={18}
                ry={18}
                fill="url(#glassHighlight)"
              />
            )}

            {/* Reference Graduation Marks along the Tube */}
            {!isVerticalVial ? (
              <>
                {/* Secondary Reference Marks (-10°, -5°, +5°, +10°) */}
                <line x1={vialCenter - 54} y1="8" x2={vialCenter - 54} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1={vialCenter - 27} y1="8" x2={vialCenter - 27} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1={vialCenter + 27} y1="8" x2={vialCenter + 27} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1={vialCenter + 54} y1="8" x2={vialCenter + 54} y2="40" stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Target Center Level Pair of Lines */}
                <line x1={vialCenter - 14} y1="6" x2={vialCenter - 14} y2="42" stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />
                <line x1={vialCenter + 14} y1="6" x2={vialCenter + 14} y2="42" stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />

                {/* Floating Tubular Liquid Bubble */}
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
                {/* Bubble inner highlight reflection */}
                <circle
                  cx={bubblePosition - 3}
                  cy="17"
                  r="3.5"
                  fill="#ffffff"
                  style={isEink ? undefined : { transition: 'cx 60ms ease-out' }}
                />
              </>
            ) : (
              <>
                {/* Vertical Vial Reference Marks */}
                <line x1="8" y1={vialCenter - 54} x2="40" y2={vialCenter - 54} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="8" y1={vialCenter - 27} x2="40" y2={vialCenter - 27} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="8" y1={vialCenter + 27} x2="40" y2={vialCenter + 27} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />
                <line x1="8" y1={vialCenter + 54} x2="40" y2={vialCenter + 54} stroke="rgba(0,0,0,0.35)" strokeWidth="1.5" strokeDasharray="3 3" />

                {/* Vertical Center Pair */}
                <line x1="6" y1={vialCenter - 14} x2="42" y2={vialCenter - 14} stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />
                <line x1="6" y1={vialCenter + 14} x2="42" y2={vialCenter + 14} stroke={isMatched ? '#ffffff' : '#000000'} strokeWidth="2.5" />

                {/* Vertical Floating Bubble */}
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
              </>
            )}
          </svg>
        </div>

        {/* Edge Indicator Badge */}
        <div className="level-ruler-edge-tag">
          <span>{edgeLabel}</span>
        </div>
      </div>

      {/* Edge Selector Pills */}
      <div className="level-edge-selector-row">
        <button
          type="button"
          className={`level-edge-btn ${!forcedEdge || forcedEdge === 'flat' ? 'level-edge-btn--active' : ''}`}
          onClick={() => setForcedEdge('flat')}
        >
          {t.edge.auto}
        </button>
        <button
          type="button"
          className={`level-edge-btn ${forcedEdge === 'portrait' ? 'level-edge-btn--active' : ''}`}
          onClick={() => setForcedEdge('portrait')}
        >
          {t.edge.bottomEdge}
        </button>
        <button
          type="button"
          className={`level-edge-btn ${forcedEdge === 'landscape-right' ? 'level-edge-btn--active' : ''}`}
          onClick={() => setForcedEdge('landscape-right')}
        >
          {t.edge.rightEdge}
        </button>
        <button
          type="button"
          className={`level-edge-btn ${forcedEdge === 'landscape-left' ? 'level-edge-btn--active' : ''}`}
          onClick={() => setForcedEdge('landscape-left')}
        >
          {t.edge.leftEdge}
        </button>
        <button
          type="button"
          className={`level-edge-btn ${forcedEdge === 'portrait-inverted' ? 'level-edge-btn--active' : ''}`}
          onClick={() => setForcedEdge('portrait-inverted')}
        >
          {t.edge.topEdge}
        </button>
      </div>

      {/* Manual Tilt Simulation / Desktop Testing Bar */}
      {shouldShowSliders && (
        <div className="level-tubular-sliders">
          <div className="level-slider-item">
            <div className="level-slider-header">
              <span className="level-slider-label">{t.edge.tiltSlider}</span>
              <span className="level-slider-val">{edgeResult.absAngle.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="90"
              step="0.5"
              value={edgeResult.absAngle}
              onChange={(e) => handleManualAngle(parseFloat(e.target.value))}
              className="level-slider-input"
              aria-label="Tilt angle simulation slider"
            />
          </div>

          {/* Quick jump angle buttons */}
          <div className="level-quick-angles">
            {[0, 15, 30, 45, 60, 90].map((deg) => (
              <Button
                key={deg}
                variant={Math.abs(edgeResult.absAngle - deg) <= 0.5 ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => handleManualAngle(deg)}
              >
                {deg}°
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
