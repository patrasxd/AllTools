import { memo, type ReactNode } from 'react'

export interface StatItem {
  key: string
  label: string
  value: ReactNode
  className?: string
}

interface StatsHeaderProps {
  label: string
  items: StatItem[]
  onReset?: () => void
  resetAriaLabel?: string
  resetId?: string
}

const ToolStatsHeaderComponent = memo(function ToolStatsHeaderComponent({
  label,
  items,
  onReset,
  resetAriaLabel = 'Reset stats',
  resetId,
}: StatsHeaderProps) {
  return (
    <div className="tool-stats-header game-stats-header">
      <p className="tool-stats-header-label game-stats-header-label">{label}</p>
      <div className="tool-stats-header-row game-stats-header-row">
        {items.map((item, idx) => (
          <span key={item.key} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.4rem' }}>
            {idx > 0 && <span className="tool-stats-header-sep game-stats-header-sep" aria-hidden="true">·</span>}
            <div className="tool-stats-header-item game-stats-header-item">
              <span className={`tool-stats-header-val game-stats-header-val ${item.className || ''}`}>{item.value}</span>
              <span className="tool-stats-header-key game-stats-header-key">{item.label}</span>
            </div>
          </span>
        ))}
        {onReset && (
          <button
            id={resetId}
            type="button"
            className="tool-stats-header-reset game-stats-header-reset"
            onClick={onReset}
            aria-label={resetAriaLabel}
            title={resetAriaLabel}
          >
            ↺
          </button>
        )}
      </div>
    </div>
  )
})

export const ToolStatsHeader = ToolStatsHeaderComponent
export const StatsHeader = ToolStatsHeaderComponent
