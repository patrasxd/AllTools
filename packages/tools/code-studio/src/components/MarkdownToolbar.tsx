import React from 'react'
import { CodeIcon, HorizontalRuleIcon, IconButton, ListIcon, ListOrderedIcon, QuoteIcon, ToolbarGroup } from '@all/ui'
import type { MarkdownCommandId } from '../utils/markdownCommands'
import type { getTranslations } from '../i18n'

interface MarkdownToolbarProps {
  t: ReturnType<typeof getTranslations>
  onCommand: (id: MarkdownCommandId) => void
}

interface Entry {
  id: MarkdownCommandId
  /** Shared icon when AllUI has one; otherwise a short text glyph. */
  icon: React.ReactNode
}

const glyph = (text: string, className = '') => (
  <span className={`cs-glyph ${className}`.trim()} aria-hidden="true">
    {text}
  </span>
)

type GroupKey = 'mdGroupText' | 'mdGroupHeading' | 'mdGroupBlock' | 'mdGroupInsert'

const GROUPS: { key: GroupKey; entries: Entry[] }[] = [
  {
    key: 'mdGroupText',
    entries: [
      { id: 'bold', icon: glyph('B', 'cs-glyph--bold') },
      { id: 'italic', icon: glyph('I', 'cs-glyph--italic') },
      { id: 'strike', icon: glyph('S', 'cs-glyph--strike') },
      { id: 'code', icon: <CodeIcon /> },
    ],
  },
  {
    key: 'mdGroupHeading',
    entries: [
      { id: 'h1', icon: glyph('H1') },
      { id: 'h2', icon: glyph('H2') },
      { id: 'h3', icon: glyph('H3') },
    ],
  },
  {
    key: 'mdGroupBlock',
    entries: [
      { id: 'quote', icon: <QuoteIcon /> },
      { id: 'bullet', icon: <ListIcon /> },
      { id: 'numbered', icon: <ListOrderedIcon /> },
      { id: 'task', icon: glyph('☑') },
    ],
  },
  {
    key: 'mdGroupInsert',
    entries: [
      { id: 'link', icon: glyph('Link') },
      { id: 'image', icon: glyph('Img') },
      { id: 'codeBlock', icon: glyph('{ }') },
      { id: 'table', icon: glyph('▦') },
      { id: 'rule', icon: <HorizontalRuleIcon /> },
    ],
  },
]

/** Buttons that insert Markdown syntax at the cursor or around the selection. */
export function MarkdownToolbar({ t, onCommand }: MarkdownToolbarProps) {
  return (
    <div className="cs-md-toolbar" role="toolbar" aria-label={t.mdToolbarAria}>
      {GROUPS.map((group) => (
        <ToolbarGroup key={group.key} label={t[group.key]}>
          {group.entries.map(({ id, icon }) => (
            <IconButton
              key={id}
              size="sm"
              variant="ghost"
              aria-label={t.md[id]}
              title={t.md[id]}
              icon={icon}
              onClick={() => onCommand(id)}
            />
          ))}
        </ToolbarGroup>
      ))}
    </div>
  )
}
