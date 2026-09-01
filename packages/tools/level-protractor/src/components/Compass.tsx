import React, { useState, useEffect } from 'react'

export interface CompassProps {
  locale?: 'en' | 'pl'
  isFrozen?: boolean
  onHeadingChange?: (heading: number, direction: string) => void
}

const CARDINALS = [
  { deg: 0, labelEn: 'N', labelPl: 'N' },
  { deg: 45, labelEn: 'NE', labelPl: 'NE' },
  { deg: 90, labelEn: 'E', labelPl: 'E' },
  { deg: 135, labelEn: 'SE', labelPl: 'SE' },
  { deg: 180, labelEn: 'S', labelPl: 'S' },
  { deg: 225, labelEn: 'SW', labelPl: 'SW' },
  { deg: 270, labelEn: 'W', labelPl: 'W' },
  { deg: 315, labelEn: 'NW', labelPl: 'NW' },
]

function getCardinalDirection(deg: number): string {
  const normalized = (deg % 360 + 360) % 360
  const index = Math.round(normalized / 45) % 8
  return CARDINALS[index].labelEn
}

export function Compass({ locale = 'en', isFrozen = false, onHeadingChange }: CompassProps) {
  const isPl = locale === 'pl'
  const [heading, setHeading] = useState<number>(0)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)

  useEffect(() => {
    if (isFrozen) return

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let deg = 0
      // iOS Safari webkitCompassHeading
      if ((e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading !== undefined) {
        deg = (e as unknown as { webkitCompassHeading: number }).webkitCompassHeading
      } else if (e.alpha !== null) {
        // Android / Chrome: alpha is compass heading (0 = North when absolute)
        deg = (360 - e.alpha) % 360
      }

      const rounded = Math.round(deg)
      setHeading(rounded)
      const dir = getCardinalDirection(rounded)
      if (onHeadingChange) onHeadingChange(rounded, dir)
      setHasPermission(true)
    }

    if (window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true)
    } else {
      setHasPermission(false)
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [isFrozen, onHeadingChange])

  const cardinal = getCardinalDirection(heading)

  // Simulation slider for desktop testing without gyroscope
  const handleManualRotate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    setHeading(val)
    if (onHeadingChange) onHeadingChange(val, getCardinalDirection(val))
  }

  return (
    <div className="compass-container">
      {/* 1. Digital Heading Display */}
      <div className="compass-digital-display">
        <div className="compass-heading-number">
          <span>{heading}°</span>
          <span className="compass-cardinal-badge">{cardinal}</span>
        </div>
        <span className="compass-sub-label">
          {isPl ? 'Kierunek magnetyczny' : 'Magnetic Heading'}
        </span>
      </div>

      {/* 2. Analog Compass Rose Dial */}
      <div className="compass-dial-wrap">
        <div
          className="compass-rose"
          style={{ transform: `rotate(${-heading}deg)` }}
        >
          {/* Degree Ticks */}
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = i * 15
            const isMajor = angle % 45 === 0
            return (
              <div
                key={angle}
                className={`compass-tick ${isMajor ? 'compass-tick--major' : ''}`}
                style={{ transform: `rotate(${angle}deg)` }}
              />
            )
          })}

          {/* Cardinal Labels */}
          {CARDINALS.map((card) => (
            <div
              key={card.deg}
              className={`compass-cardinal-point ${card.deg === 0 ? 'compass-cardinal-point--north' : ''}`}
              style={{
                transform: `rotate(${card.deg}deg) translateY(-88px) rotate(-${card.deg}deg)`,
              }}
            >
              {card.labelEn}
            </div>
          ))}

          {/* Magnetic Needle */}
          <div className="compass-needle">
            <div className="compass-needle-north" />
            <div className="compass-needle-south" />
            <div className="compass-needle-pivot" />
          </div>
        </div>

        {/* Center Crosshair & Outer Index Pointer */}
        <div className="compass-fixed-pointer" />
      </div>

      {/* 3. Desktop Manual Rotation Slider (For devices without gyroscope) */}
      {hasPermission === false && (
        <div className="compass-fallback-row">
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
            {isPl ? 'Ręczny obrót (brak czujnika):' : 'Manual Dial:'}
          </span>
          <input
            type="range"
            min="0"
            max="359"
            value={heading}
            onChange={handleManualRotate}
            style={{ width: '140px', accentColor: 'var(--text)' }}
          />
        </div>
      )}
    </div>
  )
}
