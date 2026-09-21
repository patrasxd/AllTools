import React, { useRef, useCallback, useEffect } from 'react'
import { Button, Badge } from '@all/ui'
import { calculateAngleBetween, type ProtractorAngleResult } from '../utils/sensorUtils'
import { levelTranslations, type Locale } from '../i18n'

export interface ProtractorProps {
  locale?: Locale
  isEink?: boolean
  onStatsChange?: (stats: ProtractorAngleResult) => void
  arm1Angle: number
  arm2Angle: number
  setArm1Angle: React.Dispatch<React.SetStateAction<number>>
  setArm2Angle: React.Dispatch<React.SetStateAction<number>>
  activeArm: 1 | 2 | null
  setActiveArm: React.Dispatch<React.SetStateAction<1 | 2 | null>>
  isFrozen: boolean
}

export const Protractor: React.FC<ProtractorProps> = ({
  locale = 'en',
  isEink = false,
  onStatsChange,
  arm1Angle,
  arm2Angle,
  setArm1Angle,
  setArm2Angle,
  activeArm,
  setActiveArm,
  isFrozen,
}) => {
  const t = levelTranslations[locale] || levelTranslations.en
  const svgRef = useRef<SVGSVGElement | null>(null)

  const angleResult = calculateAngleBetween(arm1Angle, arm2Angle)

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange(angleResult)
    }
  }, [angleResult.angle, angleResult.rad, angleResult.supplementary, onStatsChange])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!activeArm || isFrozen || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy

      let deg = (Math.atan2(dy, dx) * 180) / Math.PI
      if (deg < 0) deg += 360

      if (activeArm === 1) {
        setArm1Angle(Math.round(deg))
      } else {
        setArm2Angle(Math.round(deg))
      }
    },
    [activeArm, isFrozen, setArm1Angle, setArm2Angle]
  )

  const handlePointerUp = useCallback(() => {
    setActiveArm(null)
  }, [setActiveArm])

  const adjustAngle = (delta: number) => {
    if (isFrozen) return
    setArm2Angle((prev) => ((prev + delta) % 360 + 360) % 360)
  }

  const cx = 130
  const cy = 130
  const arm1Rad = (arm1Angle * Math.PI) / 180
  const arm2Rad = (arm2Angle * Math.PI) / 180
  const armLength = 110

  const arm1X = cx + armLength * Math.cos(arm1Rad)
  const arm1Y = cy + armLength * Math.sin(arm1Rad)
  const arm2X = cx + armLength * Math.cos(arm2Rad)
  const arm2Y = cy + armLength * Math.sin(arm2Rad)

  // Generate 360 degree ticks
  const ticks = []
  for (let d = 0; d < 360; d += 10) {
    const rad = (d * Math.PI) / 180
    const isMajor = d % 30 === 0
    const rOuter = 115
    const rInner = isMajor ? 100 : 106

    const x1 = cx + rOuter * Math.cos(rad)
    const y1 = cy + rOuter * Math.sin(rad)
    const x2 = cx + rInner * Math.cos(rad)
    const y2 = cy + rInner * Math.sin(rad)

    ticks.push({
      deg: d,
      x1,
      y1,
      x2,
      y2,
      isMajor,
      labelX: cx + 90 * Math.cos(rad),
      labelY: cy + 90 * Math.sin(rad) + 3,
    })
  }

  const angleClassification =
    angleResult.angle < 90
      ? t.status.acuteAngle
      : angleResult.angle === 90
      ? t.status.rightAngle
      : t.status.obtuseAngle

  return (
    <div className={`protractor-view-wrapper ${isEink ? 'protractor-view-wrapper--eink' : ''}`}>
      {/* Digital Readout with AllUI Badge */}
      <div className="protractor-digital-readout">
        <div className="protractor-angle-row">
          <span className="protractor-angle-number">{angleResult.angle.toFixed(1)}°</span>
          <Badge
            variant={isFrozen ? 'warning' : 'accent'}
            size="md"
            className="protractor-status-badge"
          >
            {isFrozen ? t.status.angleLocked : angleClassification}
          </Badge>
        </div>
        <span className="protractor-sub-desc">
          RAD: {angleResult.rad.toFixed(3)} · 180°-θ: {angleResult.supplementary.toFixed(1)}°
        </span>
      </div>

      {/* SVG Protractor */}
      <div
        className="protractor-dial-card"
        role="region"
        aria-label={`Protractor: ${angleResult.angle} degrees`}
      >
        <svg
          ref={svgRef}
          viewBox="0 0 260 260"
          className="protractor-dial-svg"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-hidden="true"
        >
          {/* Outer dial */}
          <circle
            cx="130"
            cy="130"
            r="120"
            fill="var(--all-surface, rgba(255,255,255,0.03))"
            stroke="var(--all-border-2, rgba(255,255,255,0.25))"
            strokeWidth="2.5"
          />
          <circle
            cx="130"
            cy="130"
            r="35"
            fill="none"
            stroke="var(--all-border, rgba(255,255,255,0.12))"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {ticks.map((t) => (
            <g key={t.deg}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.isMajor ? 'var(--all-text, #ffffff)' : 'var(--all-text-muted, #a1a1aa)'}
                strokeWidth={t.isMajor ? 1.5 : 1}
              />
              {t.isMajor && (
                <text
                  x={t.labelX}
                  y={t.labelY}
                  fill="var(--all-text-dim, #71717a)"
                  fontSize="8"
                  fontFamily="var(--all-font-mono, monospace)"
                  textAnchor="middle"
                >
                  {t.deg}°
                </text>
              )}
            </g>
          ))}

          {/* Sector Arc showing angle between arms */}
          <path
            d={`M ${cx} ${cy} L ${arm1X} ${arm1Y} A ${armLength} ${armLength} 0 ${
              angleResult.angle > 180 ? 1 : 0
            } 1 ${arm2X} ${arm2Y} Z`}
            fill="var(--all-text, #ffffff)"
            fillOpacity={isEink ? '0.2' : '0.12'}
          />

          {/* Base Arm */}
          <line
            x1={cx}
            y1={cy}
            x2={arm1X}
            y2={arm1Y}
            stroke="var(--all-text-dim, #71717a)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle
            cx={arm1X}
            cy={arm1Y}
            r="11"
            fill="var(--all-surface, rgba(0,0,0,0.5))"
            stroke="var(--all-text-dim, #71717a)"
            strokeWidth="2.5"
            className="protractor-handle-node"
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveArm(1)
            }}
          />

          {/* Measuring Arm */}
          <line
            x1={cx}
            y1={cy}
            x2={arm2X}
            y2={arm2Y}
            stroke="var(--all-text, #ffffff)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle
            cx={arm2X}
            cy={arm2Y}
            r="12"
            fill="var(--all-text, #ffffff)"
            stroke="var(--all-bg, #000000)"
            strokeWidth="2.5"
            className="protractor-handle-node"
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveArm(2)
            }}
          />

          {/* Center Pivot Point */}
          <circle
            cx="130"
            cy="130"
            r="5"
            fill="var(--all-surface, #000000)"
            stroke="var(--all-text, #ffffff)"
            strokeWidth="2.5"
          />
        </svg>
      </div>

      {/* Fine-Tuning Degrees Row */}
      <div className="protractor-fine-tune-row" role="group" aria-label="Angle fine-tuning">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => adjustAngle(-5)}
          disabled={isFrozen}
          title="-5 degrees"
        >
          -5°
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => adjustAngle(-1)}
          disabled={isFrozen}
          title="-1 degree"
        >
          -1°
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => adjustAngle(1)}
          disabled={isFrozen}
          title="+1 degree"
        >
          +1°
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => adjustAngle(5)}
          disabled={isFrozen}
          title="+5 degrees"
        >
          +5°
        </Button>
      </div>
    </div>
  )
}
