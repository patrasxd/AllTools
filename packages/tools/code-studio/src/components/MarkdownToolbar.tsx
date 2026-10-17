import React from 'react'
import type { MarkdownCommandId } from '../utils/markdownCommands'
import type { getTranslations } from '../i18n'

interface MarkdownToolbarProps {
  t: ReturnType<typeof getTranslations>
  onCommand: (id: MarkdownCommandId) => void
}

const GROUPS: { id: MarkdownCommandId; glyph: string; className?: string }[][] = [
  [
    { id: 'bold', glyph: 'B', className: 'cs-md-btn--bold' },
    { id: 'italic', glyph: 'I', className: 'cs-md-btn--italic' },
    { id: 'strike', glyph: 'S', className: 'cs-md-btn--strike' },
    { id: 'code', glyph: '</>' },
  ],
  [
    { id: 'h1', glyph: 'H1' },
    { id: 'h2', glyph: 'H2' },
    { id: 'h3', glyph: 'H3' },
  ],
  [
    { id: 'quote', glyph: '❝' },
    { id: 'bullet', glyph: '•' },
    { id: 'numbered', glyph: '1.' },
    { id: 'task', glyph: '☑' },
  ],
  [
    { id: 'link', glyph: 'Link' },
    { id: 'image', glyph: 'Img' },
    { id: 'codeBlock', glyph: '{ }' },
    { id: 'table', glyph: '▦' },
    { id: 'rule', glyph: '—' },
  ],
]

/** Buttons that insert Markdown syntax at the cursor or around the selection. */
export function MarkdownToolbar({ t, onCommand }: MarkdownToolbarProps) {
  return (
    <div className="cs-md-toolbar" role="toolbar" aria-label={t.mdToolbarAria}>
      {GROUPS.map((group) => (
        <div className="cs-md-toolbar__group" key={group[0].id} role="group">
          {group.map(({ id, glyph, className }) => (
            <button
              key={id}
              type="button"
              className={`cs-md-btn${className ? ` ${className}` : ''}`}
              aria-label={t.md[id]}
              title={t.md[id]}
              onClick={() => onCommand(id)}
            >
              {glyph}
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
