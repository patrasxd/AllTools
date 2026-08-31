import React, { useState, useEffect } from 'react'

export interface BubbleLevelProps {
  locale: 'en' | 'pl'
  onStatsChange?: (stats: { pitch: number; roll: number; isLevel: boolean }) => void
  calibratedPitch: number
  calibratedRoll: number
  setPitch: React.Dispatch<React.SetStateAction<number>>
  setRoll: React.Dispatch<React.SetStateAction<number>>
  pitch: number
  roll: number
}

export const BubbleLevel: React.FC<BubbleLevelProps> = ({
  onStatsChange,
  calibratedPitch,
  calibratedRoll,
  pitch,
  roll,
  setPitch,
  setRoll,
}) => {
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta !== null && e.gamma !== null) {
        setPitch(e.beta)
        setRoll(e.gamma)
      }
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [setPitch, setRoll])

  const effectivePitch = pitch - calibratedPitch
  const effectiveRoll = roll - calibratedRoll
  const isLevel = Math.abs(effectivePitch) < 0.5 && Math.abs(effectiveRoll) < 0.5

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ pitch: effectivePitch, roll: effectiveRoll, isLevel })
    }
  }, [effectivePitch, effectiveRoll, isLevel, onStatsChange])

  const maxAngle = 20
  const normalizedX = Math.max(-1, Math.min(1, effectiveRoll / maxAngle))
  const normalizedY = Math.max(-1, Math.min(1, effectivePitch / maxAngle))

  const bubbleRadius = 65
  const bubbleX = 90 + normalizedX * bubbleRadius
  const bubbleY = 90 + normalizedY * bubbleRadius

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', width: '100%' }}>
      {/* Bullseye SVG Dial */}
      <div className="level-dial-card">
        <svg viewBox="0 0 180 180" className="level-dial-svg">
          <circle cx="90" cy="90" r="85" fill="var(--surface)" stroke="var(--border-2)" strokeWidth="2.5" />
          <circle cx="90" cy="90" r="60" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="90" cy="90" r="35" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="90" cy="90" r="16" fill="none" stroke={isLevel ? 'var(--text)' : 'var(--border-2)'} strokeWidth="2" />
          <line x1="15" y1="90" x2="165" y2="90" stroke="var(--border)" strokeWidth="1" />
          <line x1="90" y1="15" x2="90" y2="165" stroke="var(--border)" strokeWidth="1" />

          {/* Bubble */}
          <circle
            cx={bubbleX}
            cy={bubbleY}
            r="14"
            fill={isLevel ? 'var(--text)' : 'var(--surface-2)'}
            stroke="var(--text)"
            strokeWidth="2"
            style={{ transition: 'cx 80ms ease-out, cy 80ms ease-out' }}
          />
          <circle
            cx={bubbleX - 3}
            cy={bubbleY - 3}
            r="3"
            fill={isLevel ? 'var(--bg)' : 'var(--text-muted)'}
            style={{ transition: 'cx 80ms ease-out, cy 80ms ease-out' }}
          />
        </svg>
      </div>

      {/* Manual tilt adjustment for desktop testing */}
      <div className="level-sliders-row">
        <div className="level-slider-item">
          <span className="level-slider-label">Roll: {effectiveRoll.toFixed(1)}°</span>
          <input
            type="range"
            min="-30"
            max="30"
            step="0.5"
            value={roll}
            onChange={(e) => setRoll(parseFloat(e.target.value))}
            className="level-slider-input"
            title="Roll"
          />
        </div>
        <div className="level-slider-item">
          <span className="level-slider-label">Pitch: {effectivePitch.toFixed(1)}°</span>
          <input
            type="range"
            min="-30"
            max="30"
            step="0.5"
            value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
            className="level-slider-input"
            title="Pitch"
          />
        </div>
      </div>
    </div>
  )
}
