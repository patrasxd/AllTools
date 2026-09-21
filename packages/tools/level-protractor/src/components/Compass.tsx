import React, { useState, useEffect } from 'react'
import { Badge } from '@all/ui'
import {
  normalizeHeading,
  getCardinalDirection,
  CARDINALS,
} from '../utils/sensorUtils'
import { levelTranslations, type Locale } from '../i18n'

export interface CompassProps {
  locale?: Locale
  isEink?: boolean
  isFrozen?: boolean
  onHeadingChange?: (heading: number, direction: string) => void
}

export function Compass({
  locale = 'en',
  isEink = false,
  isFrozen = false,
  onHeadingChange,
}: CompassProps) {
  const t = levelTranslations[locale] || levelTranslations.en
  const [heading, setHeading] = useState<number>(0)
  const [hasSensor, setHasSensor] = useState<boolean | null>(null)

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
      } else {
        return
      }

      const normalized = normalizeHeading(deg)
      setHeading(normalized)
      const dirInfo = getCardinalDirection(normalized)
      if (onHeadingChange) onHeadingChange(normalized, dirInfo.code)
      setHasSensor(true)
    }

    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true)
    } else {
      setHasSensor(false)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true)
      }
    }
  }, [isFrozen, onHeadingChange])

  const cardinalInfo = getCardinalDirection(heading)

  // Simulation slider for desktop/laptop testing without gyroscope
  const handleManualRotate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    setHeading(val)
    if (onHeadingChange) onHeadingChange(val, getCardinalDirection(val).code)
  }

  const roseTransformStyle = isEink
    ? { transform: `rotate(${-heading}deg)`, transition: 'none' }
    : { transform: `rotate(${-heading}deg)` }

  return (
    <div className={`compass-container ${isEink ? 'compass-container--eink' : ''}`}>
      {/* 1. Digital Heading Display with AllUI Badge */}
      <div className="compass-digital-display" aria-live="polite">
        <div className="compass-heading-number">
          <span className="compass-degree-val">{heading}°</span>
          <Badge
            variant={cardinalInfo.code === 'N' ? 'danger' : 'default'}
            size="md"
            className={`compass-cardinal-badge ${cardinalInfo.code === 'N' ? 'compass-cardinal-badge--north' : ''}`}
          >
            {cardinalInfo.code}
          </Badge>
        </div>
        <span className="compass-sub-label">
          {t.cardinals[cardinalInfo.code as keyof typeof t.cardinals] || cardinalInfo.en} · {t.status.magneticHeading}
        </span>
      </div>

      {/* 2. Analog Compass Rose Dial */}
      <div
        className="compass-dial-wrap"
        role="img"
        aria-label={`Compass showing ${heading} degrees ${cardinalInfo.code}`}
      >
        <div className="compass-rose" style={roseTransformStyle}>
          {/* Degree Ticks (every 15 degrees) */}
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

          {/* Cardinal Labels (N, NE, E, SE, S, SW, W, NW) */}
          {CARDINALS.map((card) => (
            <div
              key={card.deg}
              className={`compass-cardinal-point ${
                card.deg === 0 ? 'compass-cardinal-point--north' : ''
              }`}
              style={{
                transform: `rotate(${card.deg}deg) translateY(-88px) rotate(-${card.deg}deg)`,
              }}
            >
              {card.code}
            </div>
          ))}

          {/* Magnetic Needle */}
          <div className="compass-needle">
            <div className="compass-needle-north" />
            <div className="compass-needle-south" />
            <div className="compass-needle-pivot" />
          </div>
        </div>

        {/* Center Crosshair & Outer Fixed Index Pointer */}
        <div className="compass-fixed-pointer" aria-hidden="true" />
      </div>

      {/* 3. Desktop Manual Rotation Slider (fallback when sensor not available) */}
      {hasSensor === false && (
        <div className="compass-fallback-row">
          <span className="compass-fallback-label">
            {t.controls.manualDialNoSensor}
          </span>
          <input
            type="range"
            min="0"
            max="359"
            value={heading}
            onChange={handleManualRotate}
            className="compass-manual-slider"
            aria-label="Manual heading adjustment"
          />
        </div>
      )}
    </div>
  )
}
