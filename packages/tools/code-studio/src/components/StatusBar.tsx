import React from 'react'
import { Select } from '@all/ui'
import { LANGUAGES } from '../languages'
import { MAX_FONT_SIZE, MIN_FONT_SIZE } from '../utils/documentEngine'
import type { CursorInfo, DocStats, EditorDoc, EditorSettings, Eol, TabSize } from '../types'
import type { getTranslations } from '../i18n'

interface StatusBarProps {
  t: ReturnType<typeof getTranslations>
  doc: EditorDoc
  settings: EditorSettings
  cursor: CursorInfo
  stats: DocStats
  problemCount: number
  showProblems: boolean
  tabFocusMode: boolean
  onProblems: () => void
  onLanguage: (language: string) => void
  onEol: (eol: Eol) => void
  onTabSize: (size: TabSize) => void
  onFontSize: (size: number) => void
}

/** VS Code style status bar: position and problems on the left, document and view settings on the right. */
export function StatusBar({
  t,
  doc,
  settings,
  cursor,
  stats,
  problemCount,
  showProblems,
  tabFocusMode,
  onProblems,
  onLanguage,
  onEol,
  onTabSize,
  onFontSize,
}: StatusBarProps) {
  const statsTip = [
    t.statLines(stats.lines),
    t.statWords(stats.words),
    t.statChars(stats.chars),
    t.statBytes(stats.bytes),
  ].join(' · ')

  return (
    <div className="cs-status" role="group" aria-label={t.statusBarAria}>
      <div className="cs-status__side">
        {showProblems && (
          <button
            type="button"
            className={`cs-status__item cs-status__item--button${problemCount > 0 ? ' cs-status__item--danger' : ''}`}
            title={t.problemsStatusTip}
            aria-label={t.problemsStatus(problemCount)}
            onClick={onProblems}
          >
            <span aria-hidden="true">{problemCount > 0 ? '⊗' : '✓'}</span>
            {/* Narrow screens show only the count; wide screens show the full wording. */}
            <span aria-hidden="true" className="cs-status__count">
              {problemCount > 0 ? ` ${problemCount}` : ''}
            </span>
            <span aria-hidden="true" className="cs-status__long">
              {` ${t.problemsStatus(problemCount)}`}
            </span>
          </button>
        )}
        <span className="cs-status__item">{t.lnCol(cursor.line, cursor.col)}</span>
        {cursor.selectedChars > 0 && <span className="cs-status__item">{t.selected(cursor.selectedChars)}</span>}
        <span className="cs-status__item cs-status__item--stats" title={statsTip}>
          {t.statLines(stats.lines)} · {t.statWords(stats.words)}
        </span>
        {tabFocusMode && <span className="cs-status__item cs-status__item--warning">{t.tabFocusOn}</span>}
      </div>

      <div className="cs-status__side">
        <Select
          density="compact"
          aria-label={t.tabSize}
          className="cs-status__select cs-status__select--indent"
          value={settings.tabSize}
          options={[2, 4, 8].map((size) => ({ value: size, label: t.tabSizeOption(size) }))}
          onChange={(event) => onTabSize(Number(event.target.value) as TabSize)}
        />
        <Select
          density="compact"
          aria-label={t.lineEnding}
          className="cs-status__select cs-status__select--eol"
          value={doc.eol}
          options={[
            { value: 'lf', label: 'LF' },
            { value: 'crlf', label: 'CRLF' },
          ]}
          onChange={(event) => onEol(event.target.value as Eol)}
        />
        <Select
          density="compact"
          aria-label={t.language}
          className="cs-status__select cs-status__select--language"
          value={doc.language}
          options={LANGUAGES.map((lang) => ({ value: lang.id, label: lang.label }))}
          onChange={(event) => onLanguage(event.target.value)}
        />

        <span className="cs-status__zoom" role="group" aria-label={t.fontSizeValue}>
          <button
            type="button"
            className="cs-status__zoom-btn"
            aria-label={t.fontSmaller}
            title={t.fontSmaller}
            disabled={settings.fontSize <= MIN_FONT_SIZE}
            onClick={() => onFontSize(settings.fontSize - 1)}
          >
            −
          </button>
          <span className="cs-status__zoom-value" aria-live="polite">
            {t.fontSize(settings.fontSize)}
          </span>
          <button
            type="button"
            className="cs-status__zoom-btn"
            aria-label={t.fontLarger}
            title={t.fontLarger}
            disabled={settings.fontSize >= MAX_FONT_SIZE}
            onClick={() => onFontSize(settings.fontSize + 1)}
          >
            +
          </button>
        </span>
      </div>
    </div>
  )
}
