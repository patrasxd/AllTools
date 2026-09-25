import { describe, it, expect } from 'vitest'
import {
  DEFAULT_LISTS,
  loadNotesFromStorage,
  addItem,
  toggleItem,
  deleteItem,
  clearCompleted,
  formatListForClipboard,
  getCounts,
} from '../utils/notesEngine'
import type { NoteList } from '../types'

describe('notesEngine', () => {
  describe('loadNotesFromStorage', () => {
    it('returns default lists when input is null, empty or invalid JSON', () => {
      expect(loadNotesFromStorage(null)).toEqual(DEFAULT_LISTS)
      expect(loadNotesFromStorage('')).toEqual(DEFAULT_LISTS)
      expect(loadNotesFromStorage('{invalid}')).toEqual(DEFAULT_LISTS)
      expect(loadNotesFromStorage('[]')).toEqual(DEFAULT_LISTS)
    })

    it('returns parsed array when valid JSON is provided', () => {
      const custom: NoteList[] = [{ id: 'custom', title: 'Custom', category: 'shopping', items: [] }]
      expect(loadNotesFromStorage(JSON.stringify(custom))).toEqual(custom)
    })
  })

  describe('addItem', () => {
    it('adds new item at the top of the matching category list', () => {
      const lists = [...DEFAULT_LISTS]
      const updated = addItem(lists, 'shopping', 'Milk', () => 'id_1')
      const shoppingList = updated.find((l) => l.category === 'shopping')
      expect(shoppingList?.items).toHaveLength(1)
      expect(shoppingList?.items[0]).toEqual({
        id: 'id_1',
        text: 'Milk',
        completed: false,
      })
    })

    it('ignores empty or whitespace-only items', () => {
      const lists = [...DEFAULT_LISTS]
      const updated = addItem(lists, 'shopping', '   ')
      expect(updated).toEqual(lists)
    })
  })

  describe('toggleItem', () => {
    it('toggles completion status of a specified item', () => {
      const initial: NoteList[] = [
        {
          id: 'shopping',
          title: 'Shopping',
          category: 'shopping',
          items: [{ id: 'it_1', text: 'Apples', completed: false }],
        },
      ]

      const toggled = toggleItem(initial, 'shopping', 'it_1')
      expect(toggled[0].items[0].completed).toBe(true)

      const toggledBack = toggleItem(toggled, 'shopping', 'it_1')
      expect(toggledBack[0].items[0].completed).toBe(false)
    })
  })

  describe('deleteItem', () => {
    it('removes item with given id from list', () => {
      const initial: NoteList[] = [
        {
          id: 'todos',
          title: 'Todos',
          category: 'todos',
          items: [
            { id: '1', text: 'Task 1', completed: false },
            { id: '2', text: 'Task 2', completed: true },
          ],
        },
      ]

      const updated = deleteItem(initial, 'todos', '1')
      expect(updated[0].items).toHaveLength(1)
      expect(updated[0].items[0].id).toBe('2')
    })
  })

  describe('clearCompleted', () => {
    it('removes all completed items in category', () => {
      const initial: NoteList[] = [
        {
          id: 'ideas',
          title: 'Ideas',
          category: 'ideas',
          items: [
            { id: '1', text: 'Idea 1', completed: true },
            { id: '2', text: 'Idea 2', completed: false },
            { id: '3', text: 'Idea 3', completed: true },
          ],
        },
      ]

      const cleared = clearCompleted(initial, 'ideas')
      expect(cleared[0].items).toHaveLength(1)
      expect(cleared[0].items[0].id).toBe('2')
    })
  })

  describe('formatListForClipboard', () => {
    it('formats items into markdown checklist lines', () => {
      const items = [
        { id: '1', text: 'Eggs', completed: false },
        { id: '2', text: 'Bread', completed: true },
      ]
      expect(formatListForClipboard(items)).toBe('[ ] Eggs\n[x] Bread')
    })

    it('returns empty string for empty list', () => {
      expect(formatListForClipboard([])).toBe('')
    })
  })

  describe('getCounts', () => {
    it('calculates total and completed counts accurately', () => {
      expect(getCounts([])).toEqual({ completedCount: 0, totalCount: 0 })
      expect(
        getCounts([
          { id: '1', text: 'A', completed: true },
          { id: '2', text: 'B', completed: false },
          { id: '3', text: 'C', completed: true },
        ]),
      ).toEqual({ completedCount: 2, totalCount: 3 })
    })
  })
})
