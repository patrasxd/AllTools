import React, { useEffect, useState } from 'react'
import { Badge } from '@all/ui'
import { calculateCalibratedTilt, type TiltResult } from '../utils/sensorUtils'
import { levelTranslations, type Locale } from '../i18n'

export interface BubbleLevelProps {
  locale?: Locale
  isEink?: boolean
  onStatsChange?: (stats: TiltResult) => void
  calibratedPitch: number
  calibratedRoll: number
  setPitch: React.Dispatch<React.SetStateAction<number>>
  setRoll: React.Dispatch<React.SetStateAction<number>>
  pitch: number
  roll: number
  tolerance?: number
  showSimulationSliders?: boolean
}

export const BubbleLevel: React.FC<BubbleLevelProps> = ({
  locale = 'en',
  isEink = false,
  onStatsChange,
  calibratedPitch,
  calibratedRoll,
  pitch,
  roll,
  setPitch,
  setRoll,
  tolerance = 0.5,
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

  const tilt = calculateCalibratedTilt(pitch, roll, calibratedPitch, calibratedRoll, tolerance)

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange(tilt)
    }
  }, [tilt.pitch, tilt.roll, tilt.isLevel, onStatsChange])

  // Calculate bubble offset within max angle bounds (max +-20 deg)
  const maxAngle = 20
  const normalizedX = Math.max(-1, Math.min(1, tilt.roll / maxAngle))
  const normalizedY = Math.max(-1, Math.min(1, tilt.pitch / maxAngle))

  const bubbleRadius = 66
  const bubbleX = 90 + normalizedX * bubbleRadius
  const bubbleY = 90 + normalizedY * bubbleRadius

  const transitionStyle = isEink ? undefined : { transition: 'cx 70ms ease-out, cy 70ms ease-out' }

  // Show manual sliders on desktop without sensor or when explicit
  const shouldShowSliders = showSimulationSliders ?? hasOrientationSensor === false

  return (
    <div className={`level-view-wrapper ${isEink ? 'level-view-wrapper--eink' : ''}`}>
      {/* Dynamic Digital Readout with AllUI Badge */}
      <div className="level-digital-readout">
        <div className="level-degrees-row">
          <span className="level-degree-num">{Math.abs(tilt.roll).toFixed(1)}°</span>
          <span className="level-degree-separator">×</span>
          <span className="level-degree-num">{Math.abs(tilt.pitch).toFixed(1)}°</span>
          <Badge variant={tilt.isLevel ? 'success' : 'warning'} dot size="md" className="level-status-pill-badge">
            {tilt.isLevel ? t.headers.levelStatus : t.headers.tiltStatus}
          </Badge>
        </div>
        <span className="level-sub-desc">{tilt.isLevel ? t.status.perfectLevel : t.status.tiltDetected}</span>
      </div>

      {/* Bullseye SVG Dial */}
      <div
        className="level-dial-card"
        role="img"
        aria-label={`Bubble level: ${tilt.roll}° roll, ${tilt.pitch}° pitch, ${tilt.isLevel ? 'level' : 'tilt'}`}
      >
        <svg viewBox="0 0 180 180" className="level-dial-svg" aria-hidden="true">
          {/* Dial Background Gradient & Outer Border */}
          <circle
            cx="90"
            cy="90"
            r="85"
            fill="var(--all-surface, rgba(255,255,255,0.03))"
            stroke="var(--all-border-2, rgba(255,255,255,0.25))"
            strokeWidth="2.5"
          />

          {/* Reference Rings at 15°, 10°, 5° */}
          <circle
            cx="90"
            cy="90"
            r="66"
            fill="none"
            stroke="var(--all-border, rgba(255,255,255,0.12))"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <circle
            cx="90"
            cy="90"
            r="44"
            fill="none"
            stroke="var(--all-border, rgba(255,255,255,0.12))"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <circle
            cx="90"
            cy="90"
            r="22"
            fill="none"
            stroke="var(--all-border, rgba(255,255,255,0.15))"
            strokeWidth="1"
          />

          {/* Target Center Level Ring */}
          <circle
            cx="90"
            cy="90"
            r="16"
            fill="none"
            stroke={tilt.isLevel ? 'var(--color-success, #10b981)' : 'var(--all-border-2, rgba(255,255,255,0.3))'}
            strokeWidth={tilt.isLevel ? '3' : '1.5'}
            className={tilt.isLevel ? 'level-center-ring--level' : ''}
          />

          {/* Crosshairs */}
          <line x1="12" y1="90" x2="168" y2="90" stroke="var(--all-border, rgba(255,255,255,0.15))" strokeWidth="1" />
          <line x1="90" y1="12" x2="90" y2="168" stroke="var(--all-border, rgba(255,255,255,0.15))" strokeWidth="1" />

          {/* Center Crosshair Pip */}
          <circle cx="90" cy="90" r="2" fill="var(--all-text-muted, #71717a)" />

          {/* Floating Liquid Bubble */}
          <circle
            cx={bubbleX}
            cy={bubbleY}
            r="14"
            fill={tilt.isLevel ? 'var(--color-success, #10b981)' : 'var(--all-surface-2, rgba(255,255,255,0.15))'}
            stroke="var(--all-text, #ffffff)"
            strokeWidth="2"
            className={tilt.isLevel ? 'level-bubble--level' : ''}
            style={transitionStyle}
          />
          {/* Specular Highlight */}
          <circle
            cx={bubbleX - 4}
            cy={bubbleY - 4}
            r="4"
            fill="#ffffff"
            fillOpacity={tilt.isLevel ? 0.9 : 0.7}
            style={transitionStyle}
          />
        </svg>
      </div>

      {/* Manual tilt adjustment sliders (desktop fallback) */}
      {shouldShowSliders && (
        <div className="level-sliders-row">
          <div className="level-slider-item">
            <span className="level-slider-label">Roll: {tilt.roll.toFixed(1)}°</span>
            <input
              type="range"
              min="-25"
              max="25"
              step="0.5"
              value={roll}
              onChange={(e) => setRoll(parseFloat(e.target.value))}
              className="level-slider-input"
              aria-label="Manual Roll Adjustment"
            />
          </div>
          <div className="level-slider-item">
            <span className="level-slider-label">Pitch: {tilt.pitch.toFixed(1)}°</span>
            <input
              type="range"
              min="-25"
              max="25"
              step="0.5"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="level-slider-input"
              aria-label="Manual Pitch Adjustment"
            />
          </div>
        </div>
      )}
    </div>
  )
}
