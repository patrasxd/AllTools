import React from 'react'
import { IconNotes } from '@alltools/ui'

export const metadata = {
  slug: 'quick-notes',
  name: {
    en: 'Quick Notes & Checklist',
    pl: 'Szybkie Notatki & Zakupy',
  },
  description: {
    en: 'Minimalist notes and shopping checklist with tagging, pinning, search, and local offline persistence.',
    pl: 'Minimalistyczne notatki i listy zakupów z tagowaniem, przypinaniem i zapisem offline.',
  },
  icon: <IconNotes size={24} strokeWidth={1.5} />,
  category: 'productivity' as const,
  tags: {
    en: ['notes', 'checklist', 'todo', 'shopping', 'keep'],
    pl: ['notatki', 'lista', 'zakupy', 'zadania', 'todo', 'keep'],
  },
}
