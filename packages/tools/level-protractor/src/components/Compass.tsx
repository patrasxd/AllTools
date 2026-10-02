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

  useEffect(() => {
    if (isFrozen) return
    if (!isPermitted) return

    let hasReceivedAbsolute = false

    const processHeading = (trueHeading: number) => {
      // Smooth unwrapping to avoid 359° -> 1° reverse spin
      if (!hasReceivedEventRef.current) {
        visualAngleRef.current = trueHeading
        hasReceivedEventRef.current = true
      } else {
        let diff = trueHeading - (visualAngleRef.current % 360)
        // Normalize diff to [-180, 180]
        diff = ((((diff + 180) % 360) + 360) % 360) - 180
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

    const handleOrientationEvent = (e: DeviceOrientationEvent) => {
      // 1. iOS Safari: webkitCompassHeading is calibrated to magnetic North directly by CoreLocation
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
      if (typeof webkitHeading === 'number' && !isNaN(webkitHeading) && webkitHeading >= 0) {
        // webkitCompassHeading is already orientation-compensated by iOS CoreLocation
        processHeading(normalizeHeading(webkitHeading))
        return
      }

      // 2. Android / W3C: DeviceOrientationEvent / deviceorientationabsolute
      if (e.alpha !== null && !isNaN(e.alpha)) {
        const screenAngle =
          typeof window !== 'undefined'
            ? (window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0)
            : 0

        // In W3C specification, alpha is the rotation angle around Z (counter-clockwise from North).
        // Clockwise compass heading is: (360 - alpha + screenAngle) % 360.
        const trueHeading = normalizeHeading(360 - e.alpha + screenAngle)
        processHeading(trueHeading)
      }
    }

    // Android deviceorientationabsolute listener
    const handleAbsoluteOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null && !isNaN(e.alpha)) {
        hasReceivedAbsolute = true
        handleOrientationEvent(e)
      }
    }

    // Standard deviceorientation listener (iOS or fallback)
    const handleStandardOrientation = (e: DeviceOrientationEvent) => {
      const webkitHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading
      const isIos = typeof webkitHeading === 'number' && !isNaN(webkitHeading) && webkitHeading >= 0

      // If we are already receiving absolute orientation on Android, ignore relative events
      if (hasReceivedAbsolute && !isIos) {
        return
      }
      handleOrientationEvent(e)
    }

    // Generic Sensor API fallback (Chrome on Android)
    let sensorInstance: any = null
    if (typeof window !== 'undefined' && 'AbsoluteOrientationSensor' in window) {
      try {
        const SensorClass = (window as unknown as { AbsoluteOrientationSensor: any }).AbsoluteOrientationSensor
        const sensor = new SensorClass({ frequency: 60 })
        sensorInstance = sensor
        sensor.addEventListener('reading', () => {
          const q = sensor.quaternion
          if (q && q.length === 4) {
            hasReceivedAbsolute = true
            const [x, y, z, w] = q
            // Yaw from quaternion
            const siny_cosp = 2 * (w * z + x * y)
            const cosy_cosp = 1 - 2 * (y * y + z * z)
            const yawDeg = Math.atan2(siny_cosp, cosy_cosp) * (180 / Math.PI)
            const screenAngle =
              typeof window !== 'undefined'
                ? (window.screen?.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0)
                : 0
            const heading = normalizeHeading(360 - yawDeg + screenAngle)
            processHeading(heading)
          }
        })
        sensor.start()
      } catch {}
    }

    window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as EventListener, true)
    if (typeof window !== 'undefined') {
      window.addEventListener('deviceorientation', handleStandardOrientation, true)
    }

    return () => {
      window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as EventListener, true)
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleStandardOrientation, true)
      }
      if (sensorInstance) {
        try {
          sensorInstance.stop()
        } catch {}
      }
    }
  }, [isFrozen, onHeadingChange, isPermitted])

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
