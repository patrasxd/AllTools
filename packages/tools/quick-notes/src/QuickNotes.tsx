import React, { useState, useEffect, useCallback } from 'react'
import {
  BoardLayout,
  Card,
  PillGroup,
  StatsHeader,
  Button,
  ControlsBar,
  PlusIcon,
  TrashIcon,
  CopyIcon,
  CheckIcon,
} from '@all/ui'
import type { ToolComponentProps, NoteList, Category } from './types'
import {
  DEFAULT_LISTS,
  loadNotesFromStorage,
  addItem,
  toggleItem,
  deleteItem,
  clearCompleted,
  formatListForClipboard,
  getCounts,
} from './utils/notesEngine'
import { quickNotesTranslations } from './i18n'
import './styles/quick-notes.css'

export function QuickNotes({ locale = 'en', isEink = false, setHeader }: ToolComponentProps) {
  const t = quickNotesTranslations[locale] || quickNotesTranslations.en

  const [lists, setLists] = useState<NoteList[]>(() => {
    try {
      const saved = localStorage.getItem('alltools:quick-notes:v2:lists')
      return loadNotesFromStorage(saved, DEFAULT_LISTS)
    } catch {
      return DEFAULT_LISTS
    }
  })

  const [activeCategoryId, setActiveCategoryId] = useState<Category>('shopping')
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
  const { completedCount, totalCount } = getCounts(activeList ? activeList.items : [])

  // Header stats injection
  const renderHeader = useCallback(() => {
    if (!setHeader) return
    setHeader(
      <StatsHeader
        items={[
          {
            key: 'progress',
            label: t.progress,
            value: `${completedCount}/${totalCount}`,
          },
          {
            key: 'cat',
            label: t.cat,
            value: activeList ? activeList.category.toUpperCase() : '—',
          },
        ]}
      />,
    )
  }, [setHeader, completedCount, totalCount, activeList, t])

  useEffect(() => {
    renderHeader()
  }, [renderHeader])

  useEffect(() => {
    return () => setHeader?.(null)
  }, [setHeader])

  const handleToggleItem = (itemId: string) => {
    setLists((prev) => toggleItem(prev, activeCategoryId, itemId))
  }

  const handleAddItem = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!newItemText.trim()) return
    setLists((prev) => addItem(prev, activeCategoryId, newItemText))
    setNewItemText('')
  }

  const handleDeleteItem = (itemId: string) => {
    setLists((prev) => deleteItem(prev, activeCategoryId, itemId))
  }

  const handleClearCompleted = () => {
    setLists((prev) => clearCompleted(prev, activeCategoryId))
  }

  const handleCopyList = () => {
    if (!activeList || activeList.items.length === 0) return
    const text = formatListForClipboard(activeList.items)
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const categoryOptions = [
    { value: 'shopping' as const, label: t.shopping },
    { value: 'todos' as const, label: t.todos },
    { value: 'ideas' as const, label: t.ideas },
  ]

  const categoryTitle =
    activeCategoryId === 'shopping' ? t.shoppingList : activeCategoryId === 'todos' ? t.todoChecklist : t.quickIdeas

  return (
    <div className={`notes-root ${isEink ? 'notes-root--eink' : ''}`}>
      <BoardLayout
        variant="wide"
        align="center"
        hud={
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
        }
        board={
          <Card variant="outlined" className="notes-card">
            {/* Add Input Bar */}
            <form onSubmit={handleAddItem} className="notes-add-form">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder={t.addPlaceholder}
                className="notes-add-input"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={<PlusIcon width="14" height="14" />}
                aria-label={t.addPlaceholder}
              />
            </form>

            {/* Scrollable checklist items */}
            <div className="notes-list-container">
              {activeList && activeList.items.length > 0 ? (
                activeList.items.map((item) => (
                  <div key={item.id} className={`notes-item ${item.completed ? 'notes-item--completed' : ''}`}>
                    <label className="notes-item-label">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleItem(item.id)}
                        className="notes-item-checkbox"
                      />
                      <span className={`notes-item-text ${item.completed ? 'notes-item-text--completed' : ''}`}>
                        {item.text}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="notes-item-del-btn"
                      title={t.deleteAria}
                      aria-label={`${t.deleteAria}: ${item.text}`}
                    >
                      <TrashIcon width="13" height="13" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="notes-empty-state">{t.emptyState}</div>
              )}
            </div>
          </Card>
        }
        controls={
          <ControlsBar className="notes-controls">
            {completedCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleClearCompleted}>
                {t.clearDone}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyList}
              disabled={!activeList || activeList.items.length === 0}
              icon={copied ? <CheckIcon width="14" height="14" /> : <CopyIcon width="14" height="14" />}
            >
              {copied ? t.copied : t.copy}
            </Button>
            <PillGroup options={categoryOptions} value={activeCategoryId} onChange={setActiveCategoryId} size="sm" />
          </ControlsBar>
        }
      />
    </div>
  )
}

export default QuickNotes
