import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { Button, CloseIcon, IconButton, Input } from '@all/ui'
import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  setSearchQuery,
} from '@codemirror/search'
import type { EditorView, Panel } from '@codemirror/view'
import { countMatches } from '../utils/findEngine'
import type { getTranslations } from '../i18n'

export type FindLabels = ReturnType<typeof getTranslations>['search']

interface FindPanelProps {
  view: EditorView
  labels: FindLabels
  query: SearchQuery
}

function FindPanel({ view, labels, query }: FindPanelProps) {
  // The field text is local state, so typing never fights with the asynchronous re-render from the editor.
  const [search, setSearch] = useState(query.search)
  const [replace, setReplace] = useState(query.replace)

  useEffect(() => setSearch(query.search), [query.search])
  useEffect(() => setReplace(query.replace), [query.replace])

  const update = (
    patch: Partial<{ search: string; replace: string; caseSensitive: boolean; regexp: boolean; wholeWord: boolean }>,
  ) => {
    view.dispatch({
      effects: setSearchQuery.of(
        new SearchQuery({
          search,
          replace,
          caseSensitive: query.caseSensitive,
          regexp: query.regexp,
          wholeWord: query.wholeWord,
          ...patch,
        }),
      ),
    })
  }

  const close = () => {
    closeSearchPanel(view)
    view.focus()
  }

  const { total, current, capped } = countMatches(view.state, query)
  const hasQuery = search !== ''
  const noResults = hasQuery && total === 0

  const onFindKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      if (event.shiftKey) findPrevious(view)
      else findNext(view)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const onReplaceKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      replaceNext(view)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  const toggle = (label: string, glyph: string, active: boolean, onClick: () => void) => (
    <IconButton
      size="sm"
      variant={active ? 'secondary' : 'ghost'}
      aria-label={label}
      aria-pressed={active}
      title={label}
      icon={
        <span className="cs-glyph" aria-hidden="true">
          {glyph}
        </span>
      }
      onClick={onClick}
    />
  )

  return (
    <div className="cs-find" role="search" aria-label={labels.title}>
      <div className="cs-find__row">
        <Input
          density="compact"
          className="cs-find__input"
          aria-label={labels.find}
          placeholder={labels.find}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            update({ search: event.target.value })
          }}
          onKeyDown={onFindKeyDown}
          autoComplete="off"
          spellCheck={false}
          data-find-field=""
          // CodeMirror focuses the element carrying this attribute when the panel opens
          {...{ 'main-field': 'true' }}
        />
        {toggle(labels.matchCase, 'Aa', query.caseSensitive, () => update({ caseSensitive: !query.caseSensitive }))}
        {toggle(labels.regexp, '.*', query.regexp, () => update({ regexp: !query.regexp }))}
        {toggle(labels.wholeWord, 'ab', query.wholeWord, () => update({ wholeWord: !query.wholeWord }))}
        <span className={`cs-find__count${noResults ? ' cs-find__count--empty' : ''}`} role="status">
          {noResults ? labels.noResults : hasQuery ? labels.results(current, total, capped) : ''}
        </span>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={labels.previous}
          title={`${labels.previous} (Shift+Enter)`}
          disabled={total === 0}
          icon={
            <span className="cs-glyph" aria-hidden="true">
              ↑
            </span>
          }
          onClick={() => findPrevious(view)}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={labels.next}
          title={`${labels.next} (Enter)`}
          disabled={total === 0}
          icon={
            <span className="cs-glyph" aria-hidden="true">
              ↓
            </span>
          }
          onClick={() => findNext(view)}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={labels.close}
          title={`${labels.close} (Esc)`}
          icon={<CloseIcon />}
          onClick={close}
        />
      </div>

      <div className="cs-find__row">
        <Input
          density="compact"
          className="cs-find__input"
          aria-label={labels.replace}
          placeholder={labels.replace}
          value={replace}
          onChange={(event) => {
            setReplace(event.target.value)
            update({ replace: event.target.value })
          }}
          onKeyDown={onReplaceKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <Button size="sm" variant="secondary" disabled={total === 0} onClick={() => replaceNext(view)}>
          {labels.replaceOne}
        </Button>
        <Button size="sm" variant="secondary" disabled={total === 0} onClick={() => replaceAll(view)}>
          {labels.replaceAll}
        </Button>
      </div>
    </div>
  )
}

/**
 * Replaces CodeMirror's built-in search panel (native inputs and checkboxes) with one built from the shared
 * AllUI components. It reads and writes the editor's own search state, so every search command keeps working.
 */
export function createFindPanel(view: EditorView, getLabels: () => FindLabels): Panel {
  const dom = document.createElement('div')
  dom.className = 'cs-find-host'
  const root = createRoot(dom)

  const render = (sync: boolean) => {
    const element = <FindPanel view={view} labels={getLabels()} query={getSearchQuery(view.state)} />
    if (sync) flushSync(() => root.render(element))
    else root.render(element)
  }

  render(true)

  return {
    dom,
    top: false,
    mount() {
      const field = dom.querySelector<HTMLInputElement>('input[data-find-field]')
      field?.focus()
      field?.select()
    },
    update(update) {
      // Re-render only for changes that affect the panel; lint and other editor updates are skipped.
      const searchChanged = update.transactions.some((tr) => tr.effects.some((effect) => effect.is(setSearchQuery)))
      if (update.docChanged || update.selectionSet || searchChanged) render(false)
    },
    destroy() {
      // Unmount after the editor finished updating, never in the middle of it.
      queueMicrotask(() => root.unmount())
    },
  }
}
