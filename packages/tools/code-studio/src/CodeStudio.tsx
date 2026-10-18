import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Alert, ConfirmDialog, safeGetItem, safeSetItem } from '@all/ui'
import type { CursorInfo, EditorDoc, EditorSettings, Eol, Problem, SideTab } from './types'
import type { ToolComponentProps } from './types'
import { getTranslations } from './i18n'
import { PLAIN_TEXT_ID } from './languages'
import {
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
import { TopBar } from './components/TopBar'
import { StatusBar } from './components/StatusBar'
import { SettingsDialog } from './components/SettingsDialog'
import './styles/code-studio.css'

/** Files above this size are skipped: they would not fit the local session and make the editor sluggish. */
const MAX_FILE_BYTES = 5 * 1024 * 1024
const SAVE_DELAY_MS = 400

type DialogKind = 'export' | 'rename' | 'settings' | null

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
  const [pendingClose, setPendingClose] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [storageFull, setStorageFull] = useState(false)
  const [dragging, setDragging] = useState(false)
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
  const isPlainText = activeDoc.language === PLAIN_TEXT_ID
  const isMarkdown = activeDoc.language === 'markdown'
  const isJson = activeDoc.language === 'json'
  const canFormat = isFormattable(activeDoc.language)

  const stats = useMemo(() => docStats(activeDoc.content), [activeDoc.content])

  // Markdown documents open with the preview; leaving Markdown drops back to Problems.
  useEffect(() => {
    setSideTab((prev) => (isMarkdown ? 'preview' : prev === 'preview' ? 'problems' : prev))
    if (isMarkdown) setSettings((prev) => (prev.panelOpen ? prev : { ...prev, panelOpen: true }))
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
  }

  const handleSelect = (id: string) => {
    if (id === activeIdRef.current) return
    editorRef.current?.flush()
    setProblems([])
    commitActive(id)
  }

  const closeDoc = (id: string) => {
    if (id === activeIdRef.current) editorRef.current?.flush()
    const result = removeDoc(docsRef.current, activeIdRef.current, id)
    if (result.activeId !== activeIdRef.current) setProblems([])
    commitDocs(result.docs)
    commitActive(result.activeId)
  }

  /** Closing a tab with text in it asks first: the text lives only on this device. */
  const handleClose = (id: string) => {
    const doc = docsRef.current.find((candidate) => candidate.id === id)
    const text =
      id === activeIdRef.current ? (editorRef.current?.getText() ?? doc?.content ?? '') : (doc?.content ?? '')
    if (text.trim() === '') closeDoc(id)
    else setPendingClose(id)
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

  const showProblemsInStatus = !isPlainText

  const handleProblemsStatus = () => {
    changeSettings({ panelOpen: true })
    setSideTab('problems')
  }

  const handleRenameRequest = (id: string) => {
    if (id !== activeIdRef.current) {
      editorRef.current?.flush()
      setProblems([])
      commitActive(id)
    }
    setDialog('rename')
  }

  const sideTabs: { id: SideTab; label: string }[] = [
    {
      id: 'problems',
      label: problems.length > 0 && !isPlainText ? `${t.tabProblems} (${problems.length})` : t.tabProblems,
    },
    ...(isMarkdown ? [{ id: 'preview' as const, label: t.tabPreview }] : []),
    { id: 'image', label: t.tabImage },
  ]
  const activeSideTab: SideTab = sideTabs.some((tab) => tab.id === sideTab) ? sideTab : 'problems'

  return (
    <div className="cs-layout cs-app">
      <TopBar
        t={t}
        canFormat={canFormat}
        formatting={formatting}
        isJson={isJson}
        panelOpen={settings.panelOpen}
        onNew={handleNew}
        onOpen={() => fileInputRef.current?.click()}
        onExport={() => setDialog('export')}
        onFind={() => editorRef.current?.openFind()}
        onFormat={handleFormat}
        onMinify={handleMinify}
        onTogglePanel={() => changeSettings({ panelOpen: !settings.panelOpen })}
        onSettings={() => setDialog('settings')}
      />

      <div className={`cs-workspace${settings.panelOpen ? ' cs-workspace--with-panel' : ''}`}>
        <section ref={dropRef} className={`cs-card${dragging ? ' cs-card--dragging' : ''}`} aria-label={t.editorTab}>
          <TabBar
            docs={docs}
            activeId={activeDoc.id}
            label={t.tabsAria}
            closeLabel={t.closeTab}
            addLabel={t.addTab}
            renameHint={t.tipTabRename}
            onSelect={handleSelect}
            onClose={handleClose}
            onAdd={handleNew}
            onRename={handleRenameRequest}
          />

          {(storageFull || formatError || notice) && (
            <div className="cs-alerts">
              {storageFull && <Alert variant="warning">{t.storageFull}</Alert>}
              {formatError && (
                <Alert variant="danger" onClose={() => setFormatError(null)}>
                  {formatError}
                </Alert>
              )}
              {notice && (
                <Alert variant="danger" onClose={() => setNotice(null)}>
                  {notice}
                </Alert>
              )}
            </div>
          )}

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
            onFormat={handleFormat}
            onSave={() => setDialog('export')}
          />

          <StatusBar
            t={t}
            doc={activeDoc}
            settings={settings}
            cursor={cursor}
            stats={stats}
            problemCount={problems.length}
            showProblems={showProblemsInStatus}
            tabFocusMode={tabFocusMode}
            onProblems={handleProblemsStatus}
            onLanguage={handleLanguage}
            onEol={handleEol}
            onTabSize={(tabSize) => changeSettings({ tabSize })}
            onFontSize={(fontSize) => changeSettings({ fontSize })}
          />

          {dragging && (
            <div className="cs-dropzone" aria-hidden="true">
              {t.dropHint}
            </div>
          )}
        </section>

        {settings.panelOpen && (
          <aside className="cs-panel" aria-label={t.sidePanelAria}>
            <SidePanel
              tabs={sideTabs}
              active={activeSideTab}
              ariaLabel={t.sidePanelAria}
              closeLabel={t.closePanel}
              onChange={setSideTab}
              onClose={() => changeSettings({ panelOpen: false })}
            >
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
          </aside>
        )}
      </div>

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
      <SettingsDialog
        open={dialog === 'settings'}
        t={t}
        settings={settings}
        doc={activeDoc}
        onChange={changeSettings}
        onLanguage={handleLanguage}
        onEol={handleEol}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={pendingClose !== null}
        title={t.closeConfirmTitle(docs.find((doc) => doc.id === pendingClose)?.name ?? '')}
        description={t.closeConfirmDescription}
        confirmLabel={t.closeConfirm}
        cancelLabel={t.cancel}
        confirmVariant="danger"
        maxWidth="sm"
        onClose={() => setPendingClose(null)}
        onConfirm={() => {
          if (pendingClose) closeDoc(pendingClose)
          setPendingClose(null)
        }}
      />
    </div>
  )
}
