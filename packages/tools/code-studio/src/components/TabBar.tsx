import React from 'react'
import { CloseIcon, IconButton, PlusIcon } from '@all/ui'
import type { EditorDoc } from '../types'

interface TabBarProps {
  docs: EditorDoc[]
  activeId: string
  label: string
  closeLabel: (name: string) => string
  addLabel: string
  renameHint: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onAdd: () => void
  onRename: (id: string) => void
}

/** Document tabs. Double-click (or F2) renames a tab; the close button shows on hover and on the active tab. */
export function TabBar({
  docs,
  activeId,
  label,
  closeLabel,
  addLabel,
  renameHint,
  onSelect,
  onClose,
  onAdd,
  onRename,
}: TabBarProps) {
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
              aria-keyshortcuts="F2"
              className="cs-tab__label"
              title={`${doc.name}\n${renameHint}`}
              onClick={() => onSelect(doc.id)}
              onDoubleClick={() => onRename(doc.id)}
              onKeyDown={(event) => {
                if (event.key === 'F2') {
                  event.preventDefault()
                  onRename(doc.id)
                }
              }}
            >
              {doc.name}
            </button>
            <IconButton
              size="sm"
              variant="ghost"
              className="cs-tab__close"
              aria-label={closeLabel(doc.name)}
              title={closeLabel(doc.name)}
              icon={<CloseIcon />}
              onClick={() => onClose(doc.id)}
            />
          </div>
        )
      })}
      <IconButton
        size="sm"
        variant="ghost"
        className="cs-tabs__add"
        aria-label={addLabel}
        title={addLabel}
        icon={<PlusIcon />}
        onClick={onAdd}
      />
    </div>
  )
}
