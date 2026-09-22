import React from 'react'
import { NotesIcon } from '@all/ui'

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
  icon: <NotesIcon width="24" height="24" strokeWidth="1.5" />,
  category: 'productivity' as const,
  tags: {
    en: ['Productivity'],
    pl: ['Produktywność'],
  },
}
