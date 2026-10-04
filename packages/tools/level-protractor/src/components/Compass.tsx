import React, { useState, useEffect, useRef } from 'react'
import { Badge, Button } from '@all/ui'
import {
  angleDelta,
  smoothHeading,
  normalizeHeading,
  getCardinalDirection,
  CARDINALS,
  requiresOrientationPermission,
  requestOrientationPermission,
} from '../utils/sensorUtils'
import { levelTranslations, type Locale } from '../i18n'

/** Low-pass factor per sensor event (0..1). Lower = steadier but slower to follow. */
const HEADING_SMOOTHING = 0.2
/** Minimum heading change (degrees) before the display is updated. */
const HEADING_HYSTERESIS_DEG = 1

export interface CompassProps {
  locale?: Locale
  isEink?: boolean
  isFrozen?: boolean
  sensorPermissionGranted?: boolean
  onHeadingChange?: (heading: number, direction: string) => void
  onPermissionGranted?: () => void
}

export function Compass({
  locale = 'en',
  isEink = false,
  isFrozen = false,
  sensorPermissionGranted = false,
  onHeadingChange,
  onPermissionGranted,
}: CompassProps) {
  const t = levelTranslations[locale] || levelTranslations.en
  const [heading, setHeading] = useState<number>(0)
  const [visualAngle, setVisualAngle] = useState<number>(0)
  const [hasSensor, setHasSensor] = useState<boolean | null>(null)
  const [internalPermissionGranted, setInternalPermissionGranted] = useState<boolean>(sensorPermissionGranted)

  const needsPermission = requiresOrientationPermission()
  const isGranted = sensorPermissionGranted || internalPermissionGranted
  const isPermitted = !needsPermission || isGranted

  useEffect(() => {
    if (sensorPermissionGranted) {
      setInternalPermissionGranted(true)
    }
  }, [sensorPermissionGranted])

  const handleEnableCompass = async () => {
    const res = await requestOrientationPermission()
    if (res === 'granted') {
      setInternalPermissionGranted(true)
      onPermissionGranted?.()
    }
  }

  // Track continuous unwrapped angle to prevent 360° spin at 0°/360° meridian
  const visualAngleRef = useRef<number>(0)
  const hasReceivedEventRef = useRef<boolean>(false)

  // The parent usually passes an inline callback. Keep it in a ref so the sensor subscription below
  // is NOT torn down and recreated on every heading update (which used to reset the source
  // detection state and let relative events leak through, making the heading flip between values).
  const onHeadingChangeRef = useRef(onHeadingChange)
  useEffect(() => {
    onHeadingChangeRef.current = onHeadingChange
  }, [onHeadingChange])

  useEffect(() => {
    if (isFrozen) return
    if (!isPermitted) return

    // Low-pass state (circular) and last value pushed to the UI.
    let smoothed: number | null = null
    let published: number | null = null

    const getScreenAngle = (): number =>
      typeof window !== 'undefined'
        ? (window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0)
        : 0

    const processHeading = (rawHeading: number) => {
      // Raw magnetometer readings are noisy; smooth them along the shortest arc.
      smoothed = smoothed === null ? rawHeading : smoothHeading(smoothed, rawHeading, HEADING_SMOOTHING)

      // Hysteresis: ignore sub-degree jitter so the number and the dial stay readable.
      if (published !== null && Math.abs(angleDelta(published, smoothed)) < HEADING_HYSTERESIS_DEG) {
        return
      }
      published = smoothed
      const trueHeading = normalizeHeading(smoothed)

      // Smooth unwrapping to avoid 359° -> 1° reverse spin
      if (!hasReceivedEventRef.current) {
        visualAngleRef.current = smoothed
        hasReceivedEventRef.current = true
      } else {
        visualAngleRef.current += angleDelta(visualAngleRef.current % 360, smoothed)
      }

      setHeading(trueHeading)
      setVisualAngle(visualAngleRef.current)
      setHasSensor(true)
      onHeadingChangeRef.current?.(trueHeading, getCardinalDirection(trueHeading).code)
    }

    // Only absolute (north-referenced) sources are valid for a compass:
    //  - iOS Safari: webkitCompassHeading (calibrated magnetic heading)
    //  - Android Chrome/Samsung: `deviceorientationabsolute`
    //  - any `deviceorientation` event that is flagged absolute (e.g. Firefox)
    // Plain `deviceorientation` on Chrome/Android is RELATIVE to an arbitrary start direction, so it is ignored.
    const handleOrientation = (e: DeviceOrientationEvent, isAbsoluteEventType: boolean) => {
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
      if (typeof webkitHeading === 'number' && !isNaN(webkitHeading) && webkitHeading >= 0) {
        processHeading(webkitHeading)
        return
      }

      if (!isAbsoluteEventType && e.absolute !== true) return
      if (e.alpha === null || e.alpha === undefined || isNaN(e.alpha)) return

      // alpha is the counter-clockwise rotation around Z from North; compass heading is clockwise.
      processHeading(360 - e.alpha + getScreenAngle())
    }

    const handleAbsolute = (e: Event) => handleOrientation(e as DeviceOrientationEvent, true)
    const handleStandard = (e: Event) => handleOrientation(e as DeviceOrientationEvent, false)

    window.addEventListener('deviceorientationabsolute', handleAbsolute, true)
    window.addEventListener('deviceorientation', handleStandard, true)

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsolute, true)
      window.removeEventListener('deviceorientation', handleStandard, true)
    }
  }, [isFrozen, isPermitted])

  const cardinalInfo = getCardinalDirection(heading)

  // Simulation slider for desktop/laptop testing without gyroscope
  const handleManualRotate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10)
    let diff = val - (visualAngleRef.current % 360)
    diff = ((((diff + 180) % 360) + 360) % 360) - 180
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
        <div
          className={`compass-rose ${needsPermission && !isGranted ? 'compass-rose--permission-needed' : ''}`}
          style={roseTransformStyle}
        >
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
              className={`compass-cardinal-point ${card.deg === 0 ? 'compass-cardinal-point--north' : ''}`}
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

        {/* Prominent Enable Compass CTA when iOS permission is required */}
        {needsPermission && !isGranted && (
          <div className="compass-permission-overlay">
            <div className="compass-permission-card">
              <span className="compass-permission-icon" aria-hidden="true">
                🧭
              </span>
              <span className="compass-permission-title">{t.permission.enableCompass}</span>
              <p className="compass-permission-desc">{t.permission.enableCompassDesc}</p>
              <Button
                id="compass-enable-permission-btn"
                variant="primary"
                size="sm"
                onClick={handleEnableCompass}
                className="compass-permission-btn"
              >
                {t.permission.enableCompass}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Desktop Manual Rotation Slider (fallback when sensor not available) */}
      {(hasSensor === false || (!needsPermission && hasSensor === null)) && (
        <div className="compass-fallback-row">
          <span className="compass-fallback-label">{t.controls.manualDialNoSensor}</span>
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
