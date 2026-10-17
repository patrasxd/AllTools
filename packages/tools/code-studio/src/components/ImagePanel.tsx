import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Button, DownloadIcon, CopyIcon, Select, Toggle, safeGetItem, safeSetItem } from '@all/ui'
import { loadLanguageExtension } from '../languages'
import type { CursorInfo } from '../types'
import type { getTranslations } from '../i18n'
import { highlightToSpans } from '../utils/highlightSpans'
import {
  MAX_IMAGE_LINES,
  buildTokenLines,
  ensureFontsLoaded,
  fitScale,
  layoutImage,
  layoutToSvg,
  measureCharWidth,
  renderPng,
  sanitizeImageOptions,
  type ImageLayout,
  type ImageOptions,
  type ImageScale,
  type ImageThemeId,
  type OuterBackground,
} from '../utils/imageEngine'
import { downloadBlob, downloadTextFile } from '../utils/fileUtils'

export const IMAGE_OPTIONS_KEY = 'alltools:code-studio:v1:image-options'
const PREVIEW_DELAY_MS = 300

interface ImagePanelProps {
  t: ReturnType<typeof getTranslations>
  docName: string
  language: string
  content: string
  tabSize: number
  cursor: CursorInfo
  getSelection: () => { text: string; startLine: number } | null
}

type Prepared = { layout: ImageLayout } | { error: 'empty' | 'tooMany' | 'failed' }

function loadOptions(): ImageOptions {
  try {
    const raw = safeGetItem(IMAGE_OPTIONS_KEY)
    return sanitizeImageOptions(raw ? JSON.parse(raw) : null)
  } catch {
    return sanitizeImageOptions(null)
  }
}

const baseName = (name: string) => {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}

export function ImagePanel({ t, docName, language, content, tabSize, cursor, getSelection }: ImagePanelProps) {
  const [options, setOptions] = useState<ImageOptions>(loadOptions)
  const [useSelection, setUseSelection] = useState(true)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [message, setMessage] = useState<{ kind: 'info' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const requestRef = useRef(0)
  const urlRef = useRef<string | null>(null)

  const patch = (change: Partial<ImageOptions>) => {
    setOptions((prev) => {
      const next = { ...prev, ...change }
      safeSetItem(IMAGE_OPTIONS_KEY, JSON.stringify(next))
      return next
    })
  }

  const selectionInfo = cursor.selectedChars > 0 ? getSelection() : null
  const selectionLines = selectionInfo ? selectionInfo.text.split('\n').length : 0

  /** Turns the document (or selection) into a drawable layout. Shared by the preview and every export. */
  const prepare = useCallback(async (): Promise<Prepared> => {
    const selection = useSelection ? getSelection() : null
    const text = selection?.text ?? content
    if (text.trim() === '') return { error: 'empty' }
    if (text.split('\n').length > MAX_IMAGE_LINES) return { error: 'tooMany' }
    try {
      await ensureFontsLoaded(options.fontSize)
      const extension = await loadLanguageExtension(language)
      const spans = highlightToSpans(text, extension)
      const lines = buildTokenLines(text, spans, tabSize)
      const layout = layoutImage({
        lines,
        options,
        charWidth: measureCharWidth(options.fontSize),
        startLine: selection?.startLine ?? 1,
        fallbackTitle: docName,
      })
      return { layout }
    } catch {
      return { error: 'failed' }
    }
  }, [useSelection, getSelection, content, language, tabSize, options, docName])

  const errorText = useCallback(
    (error: 'empty' | 'tooMany' | 'tooLarge' | 'failed') =>
      error === 'empty'
        ? t.imageEmpty
        : error === 'tooMany'
          ? t.imageTooMany(MAX_IMAGE_LINES)
          : error === 'tooLarge'
            ? t.imageTooLarge
            : t.imageFailed,
    [t],
  )

  const setPreview = (url: string | null) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    urlRef.current = url
    setPreviewUrl(url)
  }

  // Live preview, rendered with the same code path as the exported PNG (at 1x).
  useEffect(() => {
    const request = ++requestRef.current
    const timer = setTimeout(async () => {
      const prepared = await prepare()
      if (request !== requestRef.current) return
      if ('error' in prepared) {
        setPreview(null)
        setMessage({ kind: prepared.error === 'empty' ? 'info' : 'error', text: errorText(prepared.error) })
        return
      }
      if (fitScale(prepared.layout, 1) === null) {
        setPreview(null)
        setMessage({ kind: 'error', text: errorText('tooLarge') })
        return
      }
      try {
        const blob = await renderPng(prepared.layout, 1)
        if (request !== requestRef.current) return
        setPreview(URL.createObjectURL(blob))
        setMessage(null)
      } catch {
        if (request === requestRef.current) {
          setPreview(null)
          setMessage({ kind: 'error', text: errorText('failed') })
        }
      }
    }, PREVIEW_DELAY_MS)
    return () => clearTimeout(timer)
  }, [prepare, cursor.selectedChars, cursor.line, cursor.col, errorText])

  useEffect(
    () => () => {
      requestRef.current += 1
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    },
    [],
  )

  /** Prepares the layout and a scale that fits the browser's canvas limit, or reports why it cannot. */
  const prepareForExport = async (): Promise<{ layout: ImageLayout; scale: ImageScale } | null> => {
    const prepared = await prepare()
    if ('error' in prepared) {
      setMessage({ kind: 'error', text: errorText(prepared.error) })
      return null
    }
    const scale = fitScale(prepared.layout, options.scale)
    if (scale === null) {
      setMessage({ kind: 'error', text: errorText('tooLarge') })
      return null
    }
    return { layout: prepared.layout, scale }
  }

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch {
      setMessage({ kind: 'error', text: errorText('failed') })
    } finally {
      setBusy(false)
    }
  }

  const handleDownloadPng = () =>
    run(async () => {
      const ready = await prepareForExport()
      if (!ready) return
      downloadBlob(`${baseName(docName)}.png`, await renderPng(ready.layout, ready.scale))
      setMessage(null)
    })

  const handleDownloadSvg = () =>
    run(async () => {
      const ready = await prepareForExport()
      if (!ready) return
      downloadTextFile(`${baseName(docName)}.svg`, layoutToSvg(ready.layout), 'image/svg+xml;charset=utf-8')
      setMessage(null)
    })

  const handleCopy = () =>
    run(async () => {
      if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
        setMessage({ kind: 'error', text: t.imageClipboardUnsupported })
        return
      }
      const ready = await prepareForExport()
      if (!ready) return
      try {
        // Passing a promise keeps the user gesture valid in Safari while the PNG is rendered.
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': renderPng(ready.layout, ready.scale) })])
        setMessage({ kind: 'info', text: t.imageCopied })
      } catch {
        setMessage({ kind: 'error', text: t.imageCopyFailed })
      }
    })

  const themeOptions = [
    { value: 'dark', label: t.themeDark },
    { value: 'light', label: t.themeLight },
    { value: 'mono', label: t.themeMono },
  ]

  return (
    <section className="cs-image" aria-label={t.imageTitle}>
      <div className="cs-image__preview" aria-live="polite">
        {previewUrl ? (
          <img src={previewUrl} alt={t.imagePreviewAlt} />
        ) : (
          <p className="cs-problems__empty">{message?.text ?? t.imageEmpty}</p>
        )}
      </div>

      {message && previewUrl && (
        <p
          className={`cs-image__message cs-image__message--${message.kind}`}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}

      <div className="cs-image__actions">
        <Button size="sm" variant="primary" icon={<CopyIcon />} onClick={handleCopy} disabled={busy || !previewUrl}>
          {t.imageCopy}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<DownloadIcon />}
          onClick={handleDownloadPng}
          disabled={busy || !previewUrl}
        >
          {t.imageDownloadPng}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          icon={<DownloadIcon />}
          onClick={handleDownloadSvg}
          disabled={busy || !previewUrl}
        >
          {t.imageDownloadSvg}
        </Button>
      </div>

      <div className="cs-image__form">
        <Toggle
          label={
            selectionLines > 0
              ? `${t.imageUseSelection} (${t.imageSelectionInfo(selectionLines)})`
              : t.imageUseSelection
          }
          checked={useSelection}
          onChange={setUseSelection}
        />

        <div className="cs-image__grid">
          <Select
            label={t.imageTheme}
            value={options.theme}
            options={themeOptions}
            onChange={(event) => patch({ theme: event.target.value as ImageThemeId })}
          />
          <Select
            label={t.imageFontSize}
            value={options.fontSize}
            options={[12, 14, 16, 18, 20].map((size) => ({ value: size, label: `${size}px` }))}
            onChange={(event) => patch({ fontSize: Number(event.target.value) })}
          />
          <Select
            label={t.imagePadding}
            value={options.padding}
            options={[8, 16, 24, 32, 48, 64].map((size) => ({ value: size, label: `${size}px` }))}
            onChange={(event) => patch({ padding: Number(event.target.value) })}
          />
          <Select
            label={t.imageScale}
            value={options.scale}
            options={[1, 2, 3].map((scale) => ({ value: scale, label: `${scale}×` }))}
            onChange={(event) => patch({ scale: Number(event.target.value) as ImageScale })}
          />
          <Select
            label={t.imageFrame}
            value={options.outerPadding}
            options={[
              { value: 0, label: t.frameNone },
              { value: 16, label: '16px' },
              { value: 32, label: '32px' },
              { value: 48, label: '48px' },
              { value: 64, label: '64px' },
            ]}
            onChange={(event) => patch({ outerPadding: Number(event.target.value) })}
          />
          <Select
            label={t.imageBackground}
            value={options.outer}
            disabled={options.outerPadding === 0}
            options={[
              { value: 'gradient', label: t.bgGradient },
              { value: 'solid', label: t.bgSolid },
              { value: 'transparent', label: t.bgTransparent },
            ]}
            onChange={(event) => patch({ outer: event.target.value as OuterBackground })}
          />
        </div>

        <Toggle
          label={t.imageLineNumbers}
          checked={options.lineNumbers}
          onChange={(checked) => patch({ lineNumbers: checked })}
        />
        <Toggle
          label={t.imageWindow}
          checked={options.windowChrome}
          onChange={(checked) => patch({ windowChrome: checked })}
        />

        <label className="cs-field-label" htmlFor="cs-image-title">
          {t.imageTitleField}
        </label>
        <input
          id="cs-image-title"
          className="cs-field"
          value={options.title}
          maxLength={80}
          placeholder={docName}
          onChange={(event) => patch({ title: event.target.value })}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <p className="cs-problems__note">{t.imageNote}</p>
    </section>
  )
}
