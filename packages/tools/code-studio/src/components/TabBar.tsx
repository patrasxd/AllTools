import React from 'react'
import type { EditorDoc } from '../types'

interface TabBarProps {
  docs: EditorDoc[]
  activeId: string
  label: string
  closeLabel: (name: string) => string
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function TabBar({ docs, activeId, label, closeLabel, onSelect, onClose }: TabBarProps) {
  return (
    <div className="cs-tabs" role="tablist" aria-label={label}>
      {docs.map((doc) => {
        const active = doc.id === activeId
        return (
          <div key={doc.id} role="presentation" className={`cs-tab${active ? ' cs-tab--active' : ''}`}>
            <button
              type="button"
              role="tab"
              aria-selected={active}
              className="cs-tab__label"
              title={doc.name}
              onClick={() => onSelect(doc.id)}
            >
              {doc.name}
            </button>
            <button
              type="button"
              className="cs-tab__close"
              aria-label={closeLabel(doc.name)}
              onClick={() => onClose(doc.id)}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
