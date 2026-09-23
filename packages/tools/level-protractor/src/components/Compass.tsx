import React, { useState, useEffect, useRef } from 'react'
import { Badge, Button } from '@all/ui'
import {
  normalizeHeading,
  getCardinalDirection,
  CARDINALS,
  requiresOrientationPermission,
  requestOrientationPermission,
} from '../utils/sensorUtils'
import { levelTranslations, type Locale } from '../i18n'

export interface CompassProps {
  locale?: Locale
  isEink?: boolean
  isFrozen?: boolean
  sensorPermissionGranted?: boolean
  onHeadingChange?: (heading: number, direction: string) => void
}

export function Compass({
  locale = 'en',
  isEink = false,
  isFrozen = false,
  sensorPermissionGranted = false,
  onHeadingChange,
}: CompassProps) {
  const t = levelTranslations[locale] || levelTranslations.en
  const [heading, setHeading] = useState<number>(0)
  const [visualAngle, setVisualAngle] = useState<number>(0)
  const [hasSensor, setHasSensor] = useState<boolean | null>(null)
  const needsPermission = requiresOrientationPermission()
  const isPermitted = !needsPermission || sensorPermissionGranted

  // Track continuous unwrapped angle to prevent 360° spin at 0°/360° meridian
  const visualAngleRef = useRef<number>(0)
  const hasReceivedEventRef = useRef<boolean>(false)

  useEffect(() => {
    if (isFrozen) return
    if (!isPermitted) return

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let rawHeading: number | null = null

      // 1. iOS: webkitCompassHeading is pre-calibrated to magnetic north by iOS CoreLocation
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
      if (typeof webkitHeading === 'number' && !isNaN(webkitHeading) && webkitHeading >= 0) {
        rawHeading = webkitHeading
      } else if (e.alpha !== null && !isNaN(e.alpha)) {
        // 2. Android: DeviceOrientationEvent (specifically from deviceorientationabsolute)
        const alpha = e.alpha
        const beta = e.beta ?? 0
        const gamma = e.gamma ?? 0

        // If phone is tilted in hand (> 10 deg), apply 3D tilt compensation
        if (Math.abs(beta) > 10 || Math.abs(gamma) > 10) {
          const degToRad = Math.PI / 180
          const a = alpha * degToRad
          const b = beta * degToRad
          const g = gamma * degToRad

          const cA = Math.cos(a)
          const sA = Math.sin(a)
          const cB = Math.cos(b)
          const sB = Math.sin(b)
          const cG = Math.cos(g)
          const sG = Math.sin(g)

          // Vector pointing along top edge of phone projected onto horizontal Earth plane
          const Vx = -cA * sG * sB - sA * cG
          const Vy = -sA * sG * sB + cA * cG

          let h = Math.atan2(Vx, Vy) * (180 / Math.PI)
          if (h < 0) h += 360
          rawHeading = h
        } else {
          // Flat on surface
          rawHeading = (360 - alpha) % 360
        }
      }

      if (rawHeading === null) return

      // Adjust for screen orientation (landscape vs portrait)
      const screenAngle =
        typeof window !== 'undefined'
          ? (window.screen?.orientation?.angle ??
              (window as unknown as { orientation?: number }).orientation ??
              0)
          : 0

      const trueHeading = normalizeHeading(rawHeading + screenAngle)

      // Smooth unwrapping to avoid 359° -> 1° reverse spin
      if (!hasReceivedEventRef.current) {
        visualAngleRef.current = trueHeading
        hasReceivedEventRef.current = true
      } else {
        let diff = trueHeading - (visualAngleRef.current % 360)
        // Normalize diff to [-180, 180]
        diff = (((diff + 180) % 360) + 360) % 360 - 180
        visualAngleRef.current += diff
      }

      setHeading(trueHeading)
      setVisualAngle(visualAngleRef.current)
      setHasSensor(true)

      const dirInfo = getCardinalDirection(trueHeading)
      if (onHeadingChange) {
        onHeadingChange(trueHeading, dirInfo.code)
      }
    }

    // Register listeners: prioritize deviceorientationabsolute for Android Chrome
    const hasAbsolute = 'ondeviceorientationabsolute' in window
    if (hasAbsolute) {
      window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true)
    }
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', handleOrientation, true)
    }

    return () => {
      if (hasAbsolute) {
        window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true)
      }
    }
  }, [isFrozen, onHeadingChange, isPermitted])

  const cardinalInfo = getCardinalDirection(heading)

  // Simulation slider for desktop/laptop testing without gyroscope
  const handleManualRotate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    let diff = val - (visualAngleRef.current % 360)
    diff = (((diff + 180) % 360) + 360) % 360 - 180
    visualAngleRef.current += diff
    setVisualAngle(visualAngleRef.current)
    setHeading(val)
    if (onHeadingChange) onHeadingChange(val, getCardinalDirection(val).code)
  }

  const roseTransformStyle = isEink
    ? { transform: `rotate(${-visualAngle}deg)`, transition: 'none' }
    : { transform: `rotate(${-visualAngle}deg)` }

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
      {(hasSensor === false || (!needsPermission && hasSensor === null)) && (
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
