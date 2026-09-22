import type { CheckItem, NoteList } from '../types'

export const DEFAULT_LISTS: NoteList[] = [
  {
    id: 'shopping',
    title: 'Shopping List',
    category: 'shopping',
    items: [],
  },
  {
    id: 'todos',
    title: 'To-do List',
    category: 'todos',
    items: [],
  },
  {
    id: 'ideas',
    title: 'Quick Ideas',
    category: 'ideas',
    items: [],
  },
]

export function loadNotesFromStorage(
  rawJson: string | null,
  fallback = DEFAULT_LISTS
): NoteList[] {
  if (!rawJson) return fallback
  try {
    const parsed = JSON.parse(rawJson)
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback
    return parsed
  } catch {
    return fallback
  }
}

export function addItem(
  lists: NoteList[],
  categoryId: string,
  text: string,
  generateId: () => string = () => `it_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
): NoteList[] {
  const trimmed = text.trim()
  if (!trimmed) return lists

  const newItem: CheckItem = {
    id: generateId(),
    text: trimmed,
    completed: false,
  }

  return lists.map((list) => {
    if (list.category !== categoryId && list.id !== categoryId) return list
    return {
      ...list,
      items: [newItem, ...list.items],
    }
  })
}

export function toggleItem(
  lists: NoteList[],
  categoryId: string,
  itemId: string
): NoteList[] {
  return lists.map((list) => {
    if (list.category !== categoryId && list.id !== categoryId) return list
    return {
      ...list,
      items: list.items.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      ),
    }
  })
}

export function deleteItem(
  lists: NoteList[],
  categoryId: string,
  itemId: string
): NoteList[] {
  return lists.map((list) => {
    if (list.category !== categoryId && list.id !== categoryId) return list
    return {
      ...list,
      items: list.items.filter((item) => item.id !== itemId),
    }
  })
}

export function clearCompleted(
  lists: NoteList[],
  categoryId: string
): NoteList[] {
  return lists.map((list) => {
    if (list.category !== categoryId && list.id !== categoryId) return list
    return {
      ...list,
      items: list.items.filter((item) => !item.completed),
    }
  })
}

export function formatListForClipboard(items: CheckItem[]): string {
  if (!items || items.length === 0) return ''
  return items.map((i) => `${i.completed ? '[x]' : '[ ]'} ${i.text}`).join('\n')
}

export function getCounts(items: CheckItem[]): {
  completedCount: number
  totalCount: number
} {
  const totalCount = items ? items.length : 0
  const completedCount = items ? items.filter((i) => i.completed).length : 0
  return { completedCount, totalCount }
}
