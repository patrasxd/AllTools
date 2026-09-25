import React from 'react'

export interface NeedleGaugeProps {
  cents: number // -50 to +50
  isInTune: boolean
  hasAudio: boolean
  isEink?: boolean
  flatLabel?: string
  sharpLabel?: string
  inTuneLabel?: string
  waitingLabel?: string
}

export const NeedleGauge: React.FC<NeedleGaugeProps> = ({
  cents,
  isInTune,
  hasAudio,
  isEink = false,
  flatLabel = '♭ FLAT',
  sharpLabel = 'SHARP ♯',
  inTuneLabel = '✦ IN TUNE ✦',
  waitingLabel = 'WAITING FOR SOUND',
}) => {
  // Map cents (-50 to +50) to degrees (-45deg to +45deg)
  const clampedCents = Math.max(-50, Math.min(50, Math.round(cents)))
  const angle = hasAudio ? (clampedCents / 50) * 45 : 0

  const ticks = [-50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50]

  const statusText = hasAudio
    ? isInTune
      ? inTuneLabel
      : `${clampedCents > 0 ? `+${clampedCents}` : clampedCents} ct`
    : waitingLabel

  return (
    <div
      className={`tuner-gauge-wrapper ${isEink ? 'tuner-gauge-wrapper--eink' : ''}`}
      role="meter"
      aria-label="Tuning meter"
      aria-valuenow={hasAudio ? clampedCents : 0}
      aria-valuemin={-50}
      aria-valuemax={50}
      aria-valuetext={statusText}
    >
      <svg viewBox="0 0 300 165" className="tuner-gauge-svg" aria-hidden="true">
        {/* Background Arc */}
        <path
          d="M 30 150 A 120 120 0 0 1 270 150"
          fill="none"
          stroke="var(--border-2, rgba(255,255,255,0.12))"
          strokeWidth="2.5"
          strokeDasharray="4 3"
        />

        {/* Center Target In-Tune Zone Arc (-4 to +4 cents) */}
        <path
          d="M 142 30.5 A 120 120 0 0 1 158 30.5"
          fill="none"
          stroke={isInTune && hasAudio ? 'var(--color-success, #10b981)' : 'var(--border, rgba(255,255,255,0.2))'}
          strokeWidth="6"
          strokeLinecap="round"
          className={isInTune && hasAudio ? 'tuner-target-zone--active' : ''}
        />

        {/* Tick Marks */}
        {ticks.map((t) => {
          const tickAngle = (t / 50) * 45 * (Math.PI / 180) - Math.PI / 2
          const cx = 150
          const cy = 150
          const rOuter = 120
          const rInner = t === 0 ? 98 : t % 20 === 0 ? 106 : 112

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
                stroke={
                  isCenter
                    ? isInTune && hasAudio
                      ? 'var(--color-success, #10b981)'
                      : 'var(--text)'
                    : 'var(--text-muted)'
                }
                strokeWidth={isCenter ? 3 : 1.5}
                strokeLinecap="round"
              />
              {t % 25 === 0 && (
                <text
                  x={cx + (rInner - 12) * Math.cos(tickAngle)}
                  y={cy + (rInner - 12) * Math.sin(tickAngle) + 4}
                  fill="var(--text-dim)"
                  fontSize="9.5"
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
          className={`tuner-gauge-needle ${
            !hasAudio ? 'tuner-gauge-needle--idle' : ''
          } ${isEink ? 'tuner-gauge-needle--eink' : ''}`}
          transform={`rotate(${angle} 150 150)`}
        >
          <line
            x1="150"
            y1="150"
            x2="150"
            y2="30"
            stroke={isInTune && hasAudio ? 'var(--color-success, #10b981)' : 'var(--text)'}
            strokeWidth={isInTune && hasAudio ? '3' : '2'}
            strokeLinecap="round"
          />
          <polygon
            points="150,20 145,34 155,34"
            fill={isInTune && hasAudio ? 'var(--color-success, #10b981)' : 'var(--text)'}
          />
          <circle
            cx="150"
            cy="150"
            r="7"
            fill="var(--surface)"
            stroke={isInTune && hasAudio ? 'var(--color-success, #10b981)' : 'var(--text)'}
            strokeWidth="3"
          />
        </g>
      </svg>

      {/* Cents indicator & In Tune badge */}
      <div className="tuner-gauge-footer">
        <span className="tuner-gauge-label">{flatLabel}</span>
        <span className={`tuner-status-badge ${hasAudio && isInTune ? 'tuner-status-badge--in-tune' : ''}`}>
          {statusText}
        </span>
        <span className="tuner-gauge-label">{sharpLabel}</span>
      </div>
    </div>
  )
}
