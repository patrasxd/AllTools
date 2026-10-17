import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  DownloadIcon,
  PlusIcon,
  Select,
  SplitWorkspaceLayout,
  UploadIcon,
  safeGetItem,
  safeSetItem,
} from '@all/ui'
import type { CursorInfo, EditorDoc, EditorSettings, Eol, Problem, SideTab, TabSize } from './types'
import type { ToolComponentProps } from './types'
import { getTranslations } from './i18n'
import { LANGUAGES, PLAIN_TEXT_ID, getLanguage } from './languages'
import {
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  SESSION_STORAGE_KEY,
  applyEol,
  createDefaultSession,
  createDoc,
  createDocFromFile,
  docStats,
  getMimeType,
  parseSession,
  removeDoc,
  renameDoc,
  sanitizeFileName,
  serializeSession,
  updateDoc,
} from './utils/documentEngine'
import { downloadTextFile, readFileText } from './utils/fileUtils'
import { EditorPane, type EditorPaneHandle } from './components/EditorPane'
import { TabBar } from './components/TabBar'
import { ProblemsPanel } from './components/ProblemsPanel'
import { SidePanel } from './components/SidePanel'
import { MarkdownPreview } from './components/MarkdownPreview'
import { MarkdownToolbar } from './components/MarkdownToolbar'
import { ImagePanel } from './components/ImagePanel'
import { formatCode, isFormattable, minifyJson } from './utils/formatEngine'
import { MARKDOWN_COMMANDS, type MarkdownCommandId } from './utils/markdownCommands'
import { NameDialog } from './components/NameDialog'
import './styles/code-studio.css'

/** Files above this size are skipped: they would not fit the local session and make the editor sluggish. */
const MAX_FILE_BYTES = 5 * 1024 * 1024
const SAVE_DELAY_MS = 400

type DialogKind = 'export' | 'rename' | null

function sameProblems(a: Problem[], b: Problem[]): boolean {
  return (
    a.length === b.length && a.every((p, i) => p.from === b[i].from && p.to === b[i].to && p.message === b[i].message)
  )
}

export function CodeStudio({ locale = 'en' }: ToolComponentProps) {
  const t = getTranslations(locale)

  const [initial] = useState(() => parseSession(safeGetItem(SESSION_STORAGE_KEY)) ?? createDefaultSession())
  const [docs, setDocs] = useState<EditorDoc[]>(initial.docs)
  const [activeId, setActiveId] = useState(initial.activeId)
  const [settings, setSettings] = useState<EditorSettings>(initial.settings)
  const [problems, setProblems] = useState<Problem[]>([])
  const [cursor, setCursor] = useState<CursorInfo>({ line: 1, col: 1, selectedChars: 0 })
  const [tabFocusMode, setTabFocusMode] = useState(false)
  const [dialog, setDialog] = useState<DialogKind>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [storageFull, setStorageFull] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [panel, setPanel] = useState<'input' | 'output'>('input')
  const [sideTab, setSideTab] = useState<SideTab>('problems')
  const [formatError, setFormatError] = useState<string | null>(null)
  const [formatting, setFormatting] = useState(false)

  const editorRef = useRef<EditorPaneHandle>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const dropRef = useRef<HTMLDivElement>(null)

  // Latest values for the debounced save and the unmount flush.
  const docsRef = useRef(docs)
  const activeIdRef = useRef(activeId)
  const settingsRef = useRef(settings)

  const commitDocs = useCallback((next: EditorDoc[]) => {
    docsRef.current = next
    setDocs(next)
  }, [])

  const commitActive = useCallback((id: string) => {
    activeIdRef.current = id
    setActiveId(id)
  }, [])

  const activeDoc = docs.find((doc) => doc.id === activeId) ?? docs[0]
  const languageDef = getLanguage(activeDoc.language)
  const isPlainText = activeDoc.language === PLAIN_TEXT_ID
  const isMarkdown = activeDoc.language === 'markdown'
  const isJson = activeDoc.language === 'json'
  const canFormat = isFormattable(activeDoc.language)

  const stats = useMemo(() => docStats(activeDoc.content), [activeDoc.content])

  // Markdown documents open with the preview; leaving Markdown drops back to Problems.
  useEffect(() => {
    setSideTab((prev) => (isMarkdown ? 'preview' : prev === 'preview' ? 'problems' : prev))
  }, [activeDoc.id, isMarkdown])

  useEffect(() => {
    setFormatError(null)
  }, [activeDoc.id, activeDoc.content])

  // ─── Persistence ───

  const saveNow = useCallback(() => {
    const serialized = serializeSession({
      version: 1,
      docs: docsRef.current,
      activeId: activeIdRef.current,
      settings: settingsRef.current,
    })
    const saved = serialized !== null && safeSetItem(SESSION_STORAGE_KEY, serialized)
    setStorageFull(!saved)
  }, [])

  useEffect(() => {
    settingsRef.current = settings
    const timer = setTimeout(saveNow, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [docs, activeId, settings, saveNow])

  // Flush pending edits and save when leaving the tool or closing the page.
  useLayoutEffect(() => {
    const persist = () => {
      editorRef.current?.flush()
      saveNow()
    }
    window.addEventListener('pagehide', persist)
    return () => {
      window.removeEventListener('pagehide', persist)
      persist()
    }
  }, [saveNow])

  // ─── Document actions ───

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      const current = docsRef.current.find((doc) => doc.id === id)
      if (!current || current.content === content) return
      commitDocs(updateDoc(docsRef.current, id, { content }))
    },
    [commitDocs],
  )

  const handleNew = () => {
    editorRef.current?.flush()
    const doc = createDoc(docsRef.current)
    commitDocs([...docsRef.current, doc])
    commitActive(doc.id)
    setProblems([])
    setPanel('input')
  }

  const handleSelect = (id: string) => {
    if (id === activeIdRef.current) return
    editorRef.current?.flush()
    setProblems([])
    commitActive(id)
  }

  const handleClose = (id: string) => {
    if (id === activeIdRef.current) editorRef.current?.flush()
    const result = removeDoc(docsRef.current, activeIdRef.current, id)
    if (result.activeId !== activeIdRef.current) setProblems([])
    commitDocs(result.docs)
    commitActive(result.activeId)
  }

  const openFiles = async (files: FileList | File[]) => {
    editorRef.current?.flush()
    let next = docsRef.current
    let lastId: string | null = null
    let failed: string | null = null

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_BYTES) {
        failed = file.name
        continue
      }
      try {
        const text = await readFileText(file)
        const doc = createDocFromFile(next, file.name, text)
        next = [...next, doc]
        lastId = doc.id
      } catch {
        failed = file.name
      }
    }

    setNotice(failed ? t.readError(failed) : null)
    if (lastId) {
      commitDocs(next)
      commitActive(lastId)
      setProblems([])
      setPanel('input')
    }
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) void openFiles(files)
    event.target.value = ''
  }

  const handleExport = (fileName: string) => {
    editorRef.current?.flush()
    const name = sanitizeFileName(fileName, activeDoc.name)
    const text = editorRef.current?.getText() ?? activeDoc.content
    downloadTextFile(name, applyEol(text, activeDoc.eol), getMimeType(name))
    setDialog(null)
  }

  const handleRename = (newName: string) => {
    commitDocs(renameDoc(docsRef.current, activeDoc.id, newName))
    setDialog(null)
    editorRef.current?.focus()
  }

  const handleLanguage = (language: string) => {
    commitDocs(updateDoc(docsRef.current, activeDoc.id, { language }))
  }

  const handleEol = (eol: Eol) => {
    commitDocs(updateDoc(docsRef.current, activeDoc.id, { eol }))
  }

  const handleFormat = async () => {
    if (!canFormat || formatting) return
    editorRef.current?.flush()
    const text = editorRef.current?.getText() ?? activeDoc.content
    setFormatting(true)
    const result = await formatCode(text, activeDoc.language, { tabSize: settings.tabSize, fileName: activeDoc.name })
    setFormatting(false)
    if (result.ok) {
      editorRef.current?.replaceAll(result.text)
    } else {
      setFormatError(t.formatError(result.message))
    }
  }

  const handleMinify = () => {
    editorRef.current?.flush()
    const text = editorRef.current?.getText() ?? activeDoc.content
    const minified = minifyJson(text)
    if (minified === null) {
      setFormatError(t.formatError(t.syntaxError))
      return
    }
    editorRef.current?.replaceAll(minified)
  }

  const handleMarkdownCommand = (id: MarkdownCommandId) => {
    editorRef.current?.applyEdit(MARKDOWN_COMMANDS[id])
  }

  const getSelection = useCallback(() => editorRef.current?.getSelection() ?? null, [])

  const handleProblems = useCallback((next: Problem[]) => {
    // The linter reports after every edit; keep the previous array when nothing changed to avoid re-renders.
    setProblems((prev) => (sameProblems(prev, next) ? prev : next))
  }, [])

  const changeSettings = (patch: Partial<EditorSettings>) => setSettings((prev) => ({ ...prev, ...patch }))

  const handleProblemSelect = (problem: Problem) => {
    setPanel('input')
    editorRef.current?.jumpTo(problem.from, problem.to)
  }

  // ─── Drag and drop (native listeners keep the JSX free of non-interactive event handlers) ───

  const openFilesRef = useRef(openFiles)
  openFilesRef.current = openFiles

  useEffect(() => {
    const zone = dropRef.current
    if (!zone) return undefined
    const hasFiles = (event: DragEvent) => Array.from(event.dataTransfer?.types ?? []).includes('Files')

    const onDragEnter = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepthRef.current += 1
      setDragging(true)
    }
    const onDragOver = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault()
    }
    const onDragLeave = (event: DragEvent) => {
      if (!hasFiles(event)) return
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
      if (dragDepthRef.current === 0) setDragging(false)
    }
    const onDrop = (event: DragEvent) => {
      if (!hasFiles(event)) return
      event.preventDefault()
      dragDepthRef.current = 0
      setDragging(false)
      const files = event.dataTransfer?.files
      if (files && files.length > 0) void openFilesRef.current(files)
    }

    zone.addEventListener('dragenter', onDragEnter)
    zone.addEventListener('dragover', onDragOver)
    zone.addEventListener('dragleave', onDragLeave)
    zone.addEventListener('drop', onDrop)
    return () => {
      zone.removeEventListener('dragenter', onDragEnter)
      zone.removeEventListener('dragover', onDragOver)
      zone.removeEventListener('dragleave', onDragLeave)
      zone.removeEventListener('drop', onDrop)
    }
  }, [])

  const messages = useMemo(() => ({ syntaxError: t.syntaxError, invalidJson: t.invalidJson }), [t])
  const phrases = t.cmPhrases

  // ─── Render ───

  const toolbar = (
    <div className="cs-toolbar" role="toolbar" aria-label={t.toolbarLabel}>
      <div className="cs-toolbar__group">
        <Button size="sm" variant="secondary" icon={<PlusIcon />} onClick={handleNew}>
          {t.newTab}
        </Button>
        <Button size="sm" variant="secondary" icon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
          {t.open}
        </Button>
        <Button size="sm" variant="secondary" icon={<DownloadIcon />} onClick={() => setDialog('export')}>
          {t.exportFile}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDialog('rename')}>
          {t.rename}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => editorRef.current?.openFind()}>
          {t.find}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleFormat}
          disabled={!canFormat || formatting}
          title={canFormat ? undefined : t.formatUnavailable}
        >
          {t.format}
        </Button>
        {isJson && (
          <Button size="sm" variant="ghost" onClick={handleMinify}>
            {t.minify}
          </Button>
        )}
      </div>

      <div className="cs-toolbar__group">
        <Select
          aria-label={t.language}
          className="cs-select"
          value={activeDoc.language}
          options={LANGUAGES.map((lang) => ({ value: lang.id, label: lang.label }))}
          onChange={(event) => handleLanguage(event.target.value)}
        />
        <Select
          aria-label={t.lineEnding}
          className="cs-select cs-select--narrow"
          value={activeDoc.eol}
          options={[
            { value: 'lf', label: t.eolLf },
            { value: 'crlf', label: t.eolCrlf },
          ]}
          onChange={(event) => handleEol(event.target.value as Eol)}
        />
        <Select
          aria-label={t.tabSize}
          className="cs-select cs-select--tiny"
          value={settings.tabSize}
          options={[2, 4, 8].map((size) => ({ value: size, label: `⇥ ${size}` }))}
          onChange={(event) => changeSettings({ tabSize: Number(event.target.value) as TabSize })}
        />
        <Button
          size="sm"
          variant={settings.wordWrap ? 'primary' : 'secondary'}
          aria-pressed={settings.wordWrap}
          onClick={() => changeSettings({ wordWrap: !settings.wordWrap })}
        >
          {t.wrap}
        </Button>
        <Button
          size="sm"
          variant={settings.lineNumbers ? 'primary' : 'secondary'}
          aria-pressed={settings.lineNumbers}
          onClick={() => changeSettings({ lineNumbers: !settings.lineNumbers })}
        >
          {t.lineNumbers}
        </Button>
        <div className="cs-font-size" role="group" aria-label={t.fontSize(settings.fontSize)}>
          <Button
            size="sm"
            variant="secondary"
            aria-label={t.fontSmaller}
            disabled={settings.fontSize <= MIN_FONT_SIZE}
            onClick={() => changeSettings({ fontSize: settings.fontSize - 1 })}
          >
            A−
          </Button>
          <span className="cs-font-size__value" aria-live="polite">
            {t.fontSize(settings.fontSize)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            aria-label={t.fontLarger}
            disabled={settings.fontSize >= MAX_FONT_SIZE}
            onClick={() => changeSettings({ fontSize: settings.fontSize + 1 })}
          >
            A+
          </Button>
        </div>
      </div>
    </div>
  )

  const inputPane = (
    <div ref={dropRef} className={`cs-input-pane${dragging ? ' cs-input-pane--dragging' : ''}`}>
      <TabBar
        docs={docs}
        activeId={activeDoc.id}
        label={t.tabsAria}
        closeLabel={t.closeTab}
        onSelect={handleSelect}
        onClose={handleClose}
      />
      {isMarkdown && <MarkdownToolbar t={t} onCommand={handleMarkdownCommand} />}
      <EditorPane
        ref={editorRef}
        doc={activeDoc}
        settings={settings}
        ariaLabel={t.editorAria(activeDoc.name)}
        phrases={phrases}
        messages={messages}
        onChange={handleContentChange}
        onCursor={setCursor}
        onProblems={handleProblems}
        onTabFocusModeChange={setTabFocusMode}
        onLanguageError={() => setNotice(t.languageLoadError)}
      />
      {dragging && (
        <div className="cs-dropzone" aria-hidden="true">
          {t.dropHint}
        </div>
      )}
    </div>
  )

  const statusBar = (
    <div className="cs-status" role="status">
      <span>{t.lnCol(cursor.line, cursor.col)}</span>
      {cursor.selectedChars > 0 && <span>{t.selected(cursor.selectedChars)}</span>}
      <span>{t.statLines(stats.lines)}</span>
      <span>{t.statWords(stats.words)}</span>
      <span>{t.statChars(stats.chars)}</span>
      <span>{t.statBytes(stats.bytes)}</span>
      <span>{languageDef.label}</span>
      <span>{activeDoc.eol === 'crlf' ? 'CRLF' : 'LF'}</span>
      {tabFocusMode && <span className="cs-status__flag">{t.tabFocusOn}</span>}
      {storageFull && (
        <span className="cs-status__flag" role="alert">
          {t.storageFull}
        </span>
      )}
      {formatError && (
        <span className="cs-status__flag" role="alert">
          {formatError}
        </span>
      )}
      {notice && (
        <span className="cs-status__flag" role="alert">
          {notice}
        </span>
      )}
    </div>
  )

  const sideTabs: { id: SideTab; label: string }[] = [
    {
      id: 'problems',
      label: problems.length > 0 && !isPlainText ? `${t.tabProblems} (${problems.length})` : t.tabProblems,
    },
    ...(isMarkdown ? [{ id: 'preview' as const, label: t.tabPreview }] : []),
    { id: 'image', label: t.tabImage },
  ]
  const activeSideTab: SideTab = sideTabs.some((tab) => tab.id === sideTab) ? sideTab : 'problems'

  const sidePanel = (
    <SidePanel tabs={sideTabs} active={activeSideTab} ariaLabel={t.sidePanelAria} onChange={setSideTab}>
      {activeSideTab === 'problems' && (
        <ProblemsPanel problems={problems} isPlainText={isPlainText} t={t} onSelect={handleProblemSelect} />
      )}
      {activeSideTab === 'preview' && <MarkdownPreview source={activeDoc.content} t={t} />}
      {activeSideTab === 'image' && (
        <ImagePanel
          t={t}
          docName={activeDoc.name}
          language={activeDoc.language}
          content={activeDoc.content}
          tabSize={settings.tabSize}
          cursor={cursor}
          getSelection={getSelection}
        />
      )}
    </SidePanel>
  )

  return (
    <>
      <SplitWorkspaceLayout
        className="cs-layout"
        toolbar={toolbar}
        inputPane={inputPane}
        outputPane={sidePanel}
        statusBar={statusBar}
        inputLabel={t.editorTab}
        outputLabel={problems.length > 0 && !isPlainText ? `${t.sidePanelTab} (${problems.length})` : t.sidePanelTab}
        activeTab={panel}
        onTabChange={setPanel}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      <NameDialog
        open={dialog === 'export'}
        title={t.exportTitle}
        description={t.exportDescription}
        fieldLabel={t.fileName}
        initialValue={activeDoc.name}
        confirmLabel={t.download}
        cancelLabel={t.cancel}
        onConfirm={handleExport}
        onClose={() => setDialog(null)}
      />
      <NameDialog
        open={dialog === 'rename'}
        title={t.renameTitle}
        fieldLabel={t.fileName}
        initialValue={activeDoc.name}
        confirmLabel={t.apply}
        cancelLabel={t.cancel}
        onConfirm={handleRename}
        onClose={() => setDialog(null)}
      />
    </>
  )
}
