import React from 'react'
import { CloseIcon, IconButton, PillGroup } from '@all/ui'
import type { SideTab } from '../types'

interface SidePanelProps {
  tabs: { id: SideTab; label: string }[]
  active: SideTab
  ariaLabel: string
  closeLabel: string
  onChange: (tab: SideTab) => void
  onClose: () => void
  children: React.ReactNode
}

/** Switches between the Problems, Preview and Image panels with the shared segmented control. */
export function SidePanel({ tabs, active, ariaLabel, closeLabel, onChange, onClose, children }: SidePanelProps) {
  return (
    <div className="cs-side">
      <div className="cs-side__header">
        <PillGroup<SideTab>
          label={ariaLabel}
          className="cs-side__switch"
          size="sm"
          value={active}
          options={tabs.map((tab) => ({ value: tab.id, label: tab.label, id: `cs-side-${tab.id}` }))}
          onChange={onChange}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={closeLabel}
          title={closeLabel}
          icon={<CloseIcon />}
          onClick={onClose}
        />
      </div>
      <div className="cs-side__panel">{children}</div>
    </div>
  )
}
