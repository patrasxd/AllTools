import React, { useState, useEffect } from 'react'
import {
  PillGroup,
  StatsHeader,
  GameButton,
  ControlsBar,
  IconPlus,
  IconCheck,
  IconTrash,
  IconCopy,
} from '@alltools/ui'
import './styles/quick-notes.css'
import { quickNotesTranslations } from './i18n'

export interface ToolComponentProps {
  locale: 'en' | 'pl'
  setHeader?: (content: React.ReactNode) => void
  onSave?: (data: unknown) => void
}

export interface CheckItem {
  id: string
  text: string
  completed: boolean
}

export interface NoteList {
  id: string
  title: string
  category: string
  items: CheckItem[]
}

const DEFAULT_LISTS: NoteList[] = [
  {
    id: 'shopping',
    title: 'Lista zakupów',
    category: 'shopping',
    items: [],
  },
  {
    id: 'todos',
    title: 'Do zrobienia',
    category: 'todos',
    items: [],
  },
  {
    id: 'ideas',
    title: 'Pomysły',
    category: 'ideas',
    items: [],
  },
]

export function QuickNotes({ locale = 'en', setHeader }: ToolComponentProps) {
  const t = quickNotesTranslations[locale] || quickNotesTranslations.en
  const [lists, setLists] = useState<NoteList[]>(() => {
    try {
      const saved = localStorage.getItem('alltools:quick-notes:v2:lists')
      return saved ? JSON.parse(saved) : DEFAULT_LISTS
    } catch {
      return DEFAULT_LISTS
    }
  })

  const [activeCategoryId, setActiveCategoryId] = useState<string>('shopping')
  const [newItemText, setNewItemText] = useState<string>('')
  const [copied, setCopied] = useState<boolean>(false)

  const activeList = lists.find((l) => l.category === activeCategoryId) || lists[0]

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem('alltools:quick-notes:v2:lists', JSON.stringify(lists))
    } catch {
      // Ignore
    }
  }, [lists])

  // Count items
  const completedCount = activeList ? activeList.items.filter((i) => i.completed).length : 0
  const totalCount = activeList ? activeList.items.length : 0

  // Header stats injection
  useEffect(() => {
    if (!setHeader) return
    setHeader(
      <StatsHeader
        label={t.taskList}
        items={[
          {
            key: 'progress',
            label: t.progress,
            value: `${completedCount}/${totalCount}`,
            className: completedCount === totalCount && totalCount > 0 ? 'text-text font-bold' : 'text-text-muted',
          },
          {
            key: 'cat',
            label: t.cat,
            value: activeList ? activeList.category.toUpperCase() : '—',
          },
        ]}
      />
    )
  }, [setHeader, completedCount, totalCount, activeList, t])

  const toggleItem = (itemId: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== activeList.id) return l
        return {
          ...l,
          items: l.items.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i)),
        }
      })
    )
  }

  const addItem = () => {
    if (!newItemText.trim()) return
    const newItem: CheckItem = {
      id: 'it_' + Date.now(),
      text: newItemText.trim(),
      completed: false,
    }
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== activeList.id) return l
        return { ...l, items: [newItem, ...l.items] }
      })
    )
    setNewItemText('')
  }

  const deleteItem = (itemId: string) => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== activeList.id) return l
        return { ...l, items: l.items.filter((i) => i.id !== itemId) }
      })
    )
  }

  const clearCompleted = () => {
    setLists((prev) =>
      prev.map((l) => {
        if (l.id !== activeList.id) return l
        return { ...l, items: l.items.filter((i) => !i.completed) }
      })
    )
  }

  const copyList = () => {
    if (!activeList) return
    const text = activeList.items.map((i) => `${i.completed ? '[x]' : '[ ]'} ${i.text}`).join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categoryOptions = [
    { value: 'shopping', label: t.shopping },
    { value: 'todos', label: t.todos },
    { value: 'ideas', label: t.ideas },
  ]

  const categoryTitle =
    activeCategoryId === 'shopping'
      ? t.shoppingList
      : activeCategoryId === 'todos'
      ? t.todoChecklist
      : t.quickIdeas

  return (
    <div className="notes-root">
      {/* 1. Status Block (Top) */}
      <div className="notes-status">
        <div className="notes-status-text">{categoryTitle}</div>
        <div className="notes-status-sub">
          {totalCount === 0
            ? t.noItemsYet
            : completedCount === totalCount
            ? t.allDone
            : t.completedOf(completedCount, totalCount)}
        </div>
      </div>

      {/* 2. Main Viewport Area (Center - Form & Scrollable Checklist) */}
      <div className="notes-center-area">
        {/* Add Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addItem()
          }}
          className="notes-add-form"
        >
          <input
            type="text"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            placeholder={t.addPlaceholder}
            className="notes-add-input"
          />
          <button type="submit" className="game-btn game-btn--primary">
            <IconPlus size={14} />
          </button>
        </form>

        {/* Scrollable checklist items */}
        <div className="notes-list-container">
          {activeList && activeList.items.length > 0 ? (
            activeList.items.map((item) => (
              <div key={item.id} className="notes-item">
                <label className="notes-item-label">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleItem(item.id)}
                    className="notes-item-checkbox"
                  />
                  <span
                    className={`notes-item-text ${
                      item.completed ? 'notes-item-text--completed' : ''
                    }`}
                  >
                    {item.text}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => deleteItem(item.id)}
                  className="notes-item-del-btn"
                  title={t.deleteAria}
                >
                  <IconTrash size={12} />
                </button>
              </div>
            ))
          ) : (
            <div className="notes-empty-state">
              {t.emptyState}
            </div>
          )}
        </div>
      </div>

      {/* 3. Controls Bar (Bottom - Fixed Width Twin to Stopwatch) */}
      <div className="notes-controls-container">
        <ControlsBar>
          {completedCount > 0 && (
            <GameButton variant="secondary" size="md" onClick={clearCompleted}>
              {t.clearDone}
            </GameButton>
          )}
          <GameButton
            variant="secondary"
            size="md"
            onClick={copyList}
            icon={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
          >
            {copied ? t.copied : t.copy}
          </GameButton>

          {/* Mode Switcher Pills (matching Stopwatch STOPER | INTERWAŁY) */}
          <PillGroup
            options={categoryOptions}
            value={activeCategoryId}
            onChange={setActiveCategoryId}
          />
        </ControlsBar>
      </div>
    </div>
  )
}
