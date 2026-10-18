import React, { useDeferredValue, useMemo } from 'react'
import { Text } from '@all/ui'
import { renderMarkdown } from '../utils/markdownEngine'
import type { getTranslations } from '../i18n'

interface MarkdownPreviewProps {
  source: string
  t: ReturnType<typeof getTranslations>
}

export function MarkdownPreview({ source, t }: MarkdownPreviewProps) {
  const deferred = useDeferredValue(source)
  // `renderMarkdown` sanitizes the HTML (scripts, handlers, styles and remote images are removed).
  const html = useMemo(() => (deferred.trim() === '' ? '' : renderMarkdown(deferred)), [deferred])

  return (
    <section className="cs-preview" aria-label={t.previewTitle}>
      {html === '' ? (
        <Text variant="dim">{t.previewEmpty}</Text>
      ) : (
        <article className="cs-md" dangerouslySetInnerHTML={{ __html: html }} />
      )}
      <Text variant="caption" className="cs-note">
        {t.previewNote}
      </Text>
    </section>
  )
}
