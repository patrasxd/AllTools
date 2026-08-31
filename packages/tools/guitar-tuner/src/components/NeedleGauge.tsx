import React from 'react'

export interface NeedleGaugeProps {
  cents: number // -50 to +50
  isInTune: boolean
  hasAudio: boolean
}

export const NeedleGauge: React.FC<NeedleGaugeProps> = ({
  cents,
  isInTune,
  hasAudio,
}) => {
  // Map cents (-50 to +50) to degrees (-45deg to +45deg)
  const clampedCents = Math.max(-50, Math.min(50, cents))
  const angle = hasAudio ? (clampedCents / 50) * 45 : 0

  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]

  return (
    <div className="tuner-gauge-wrapper">
      <svg
        viewBox="0 0 300 180"
        className="tuner-gauge-svg"
      >
        {/* Main Arc */}
        <path
          d="M 30 160 A 130 130 0 0 1 270 160"
          fill="none"
          stroke="var(--border-2)"
          strokeWidth="2.5"
          strokeDasharray="4 3"
        />

        {/* Center Target Zone Arc */}
        <path
          d="M 140 31 A 130 130 0 0 1 160 31"
          fill="none"
          stroke={isInTune && hasAudio ? 'var(--text)' : 'var(--border-2)'}
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Tick Marks */}
        {ticks.map((t) => {
          const tickAngle = (t / 50) * 45 * (Math.PI / 180) - Math.PI / 2
          const cx = 150
          const cy = 160
          const rOuter = 130
          const rInner = t === 0 ? 105 : t % 20 === 0 ? 115 : 122

          const x1 = cx + rOuter * Math.cos(tickAngle)
          const y1 = cy + rOuter * Math.sin(tickAngle)
          const x2 = cx + rInner * Math.cos(tickAngle)
          const y2 = cy + rInner * Math.sin(tickAngle)

          const isCenter = t === 0

          return (
            <g key={t}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isCenter ? 'var(--text)' : 'var(--text-muted)'}
                strokeWidth={isCenter ? 3 : 1.5}
                strokeLinecap="round"
              />
              {t % 25 === 0 && (
                <text
                  x={cx + (rInner - 12) * Math.cos(tickAngle)}
                  y={cy + (rInner - 12) * Math.sin(tickAngle) + 4}
                  fill="var(--text-dim)"
                  fontSize="10"
                  fontFamily="var(--font-mono)"
                  textAnchor="middle"
                >
                  {t > 0 ? `+${t}` : t}
                </text>
              )}
            </g>
          )
        })}

        {/* Needle */}
        <g
          className={hasAudio ? 'tuner-gauge-needle' : 'tuner-gauge-needle tuner-gauge-needle--idle'}
          transform={`rotate(${angle} 150 160)`}
        >
          <line
            x1="150"
            y1="160"
            x2="150"
            y2="30"
            stroke="var(--text)"
            strokeWidth={isInTune && hasAudio ? '3' : '2'}
            strokeLinecap="round"
          />
          <polygon
            points="150,22 146,35 154,35"
            fill="var(--text)"
          />
          <circle
            cx="150"
            cy="160"
            r="7"
            fill="var(--surface)"
            stroke="var(--text)"
            strokeWidth="3"
          />
        </g>
      </svg>

      {/* Cents indicator & In Tune badge */}
      <div className="tuner-gauge-footer">
        <span className="tuner-gauge-label">♭ FLAT</span>
        <span className={`tuner-status-badge ${hasAudio && isInTune ? 'tuner-status-badge--in-tune' : ''}`}>
          {hasAudio ? (isInTune ? '✦ IN TUNE ✦' : `${clampedCents > 0 ? `+${clampedCents}` : clampedCents} ct`) : 'WAITING FOR SOUND'}
        </span>
        <span className="tuner-gauge-label">SHARP ♯</span>
      </div>
    </div>
  )
}
