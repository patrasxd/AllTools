import React, { useRef, useCallback, useEffect } from 'react'

export interface ProtractorProps {
  locale: 'en' | 'pl'
  onStatsChange?: (stats: { angle: number; rad: number }) => void
  arm1Angle: number
  arm2Angle: number
  setArm1Angle: React.Dispatch<React.SetStateAction<number>>
  setArm2Angle: React.Dispatch<React.SetStateAction<number>>
  activeArm: 1 | 2 | null
  setActiveArm: React.Dispatch<React.SetStateAction<1 | 2 | null>>
  isFrozen: boolean
}

export const Protractor: React.FC<ProtractorProps> = ({
  onStatsChange,
  arm1Angle,
  arm2Angle,
  setArm1Angle,
  setArm2Angle,
  activeArm,
  setActiveArm,
  isFrozen,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null)

  const rawDiff = Math.abs(arm2Angle - arm1Angle) % 360
  const angleBetween = rawDiff > 180 ? 360 - rawDiff : rawDiff
  const radians = (angleBetween * Math.PI) / 180

  useEffect(() => {
    if (onStatsChange) {
      onStatsChange({ angle: angleBetween, rad: radians })
    }
  }, [angleBetween, radians, onStatsChange])

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
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
  }, [activeArm, isFrozen, setArm1Angle, setArm2Angle])

  const handlePointerUp = useCallback(() => {
    setActiveArm(null)
  }, [setActiveArm])

  const adjustAngle = (delta: number) => {
    if (isFrozen) return
    setArm2Angle((prev) => (prev + delta + 360) % 360)
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', width: '100%' }}>
      {/* SVG Protractor */}
      <div className="protractor-dial-card">
        <svg
          ref={svgRef}
          viewBox="0 0 260 260"
          className="protractor-dial-svg"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <circle cx="130" cy="130" r="120" fill="var(--surface)" stroke="var(--border-2)" strokeWidth="2.5" />
          <circle cx="130" cy="130" r="35" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />

          {ticks.map((t) => (
            <g key={t.deg}>
              <line
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke={t.isMajor ? 'var(--text)' : 'var(--text-muted)'}
                strokeWidth={t.isMajor ? 1.5 : 1}
              />
              {t.isMajor && (
                <text
                  x={t.labelX}
                  y={t.labelY}
                  fill="var(--text-dim)"
                  fontSize="8"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {t.deg}°
                </text>
              )}
            </g>
          ))}

          {/* Sector Arc */}
          <path
            d={`M ${cx} ${cy} L ${arm1X} ${arm1Y} A ${armLength} ${armLength} 0 ${angleBetween > 180 ? 1 : 0} 1 ${arm2X} ${arm2Y} Z`}
            fill="var(--text)"
            fillOpacity="0.12"
          />

          {/* Base Arm */}
          <line x1={cx} y1={cy} x2={arm1X} y2={arm1Y} stroke="var(--text-dim)" strokeWidth="2.5" strokeLinecap="round" />
          <circle
            cx={arm1X}
            cy={arm1Y}
            r="10"
            fill="var(--surface)"
            stroke="var(--text-dim)"
            strokeWidth="2.5"
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveArm(1)
            }}
          />

          {/* Measuring Arm */}
          <line x1={cx} y1={cy} x2={arm2X} y2={arm2Y} stroke="var(--text)" strokeWidth="3" strokeLinecap="round" />
          <circle
            cx={arm2X}
            cy={arm2Y}
            r="11"
            fill="var(--text)"
            stroke="var(--bg)"
            strokeWidth="2.5"
            style={{ cursor: 'grab' }}
            onPointerDown={(e) => {
              e.stopPropagation()
              setActiveArm(2)
            }}
          />

          <circle cx="130" cy="130" r="5" fill="var(--surface)" stroke="var(--text)" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Fine-Tuning Degrees Buttons */}
      <div className="protractor-fine-tune-row">
        <button type="button" className="game-btn game-btn--sm" onClick={() => adjustAngle(-5)}>-5°</button>
        <button type="button" className="game-btn game-btn--sm" onClick={() => adjustAngle(-1)}>-1°</button>
        <button type="button" className="game-btn game-btn--sm" onClick={() => adjustAngle(1)}>+1°</button>
        <button type="button" className="game-btn game-btn--sm" onClick={() => adjustAngle(5)}>+5°</button>
      </div>
    </div>
  )
}
