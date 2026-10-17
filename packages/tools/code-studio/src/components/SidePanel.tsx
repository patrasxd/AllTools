import React, { useId } from 'react'
import type { SideTab } from '../types'

interface SidePanelProps {
  tabs: { id: SideTab; label: string }[]
  active: SideTab
  ariaLabel: string
  onChange: (tab: SideTab) => void
  children: React.ReactNode
}

/** Tabbed container for the Problems, Preview and Image panels. */
export function SidePanel({ tabs, active, ariaLabel, onChange, children }: SidePanelProps) {
  const baseId = useId()

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const offset = event.key === 'ArrowRight' ? 1 : -1
    const next = tabs[(index + offset + tabs.length) % tabs.length]
    onChange(next.id)
    document.getElementById(`${baseId}-tab-${next.id}`)?.focus()
  }

  return (
    <div className="cs-side">
      <div className="cs-side__tabs" role="tablist" aria-label={ariaLabel}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${baseId}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={tab.id === active}
            aria-controls={`${baseId}-panel`}
            tabIndex={tab.id === active ? 0 : -1}
            className={`cs-side__tab${tab.id === active ? ' cs-side__tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
        className="cs-side__panel"
      >
        {children}
      </div>
    </div>
  )
}
