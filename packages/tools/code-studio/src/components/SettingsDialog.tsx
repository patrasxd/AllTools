import React from 'react'
import { Button, Dialog, Select, SettingsGroup, Toggle } from '@all/ui'
import { LANGUAGES } from '../languages'
import type { EditorDoc, EditorSettings, Eol, Ruler, TabSize } from '../types'
import type { getTranslations } from '../i18n'

interface SettingsDialogProps {
  open: boolean
  t: ReturnType<typeof getTranslations>
  settings: EditorSettings
  doc: EditorDoc
  onChange: (patch: Partial<EditorSettings>) => void
  onLanguage: (language: string) => void
  onEol: (eol: Eol) => void
  onClose: () => void
}

/** Rarely changed editor options live here, so the toolbar stays small. */
export function SettingsDialog({ open, t, settings, doc, onChange, onLanguage, onEol, onClose }: SettingsDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.settingsTitle}
      maxWidth="sm"
      footer={
        <Button variant="primary" onClick={onClose}>
          {t.closeDialog}
        </Button>
      }
    >
      <SettingsGroup label={t.settingsDocument}>
        <Select
          density="compact"
          label={t.language}
          fullWidth
          value={doc.language}
          options={LANGUAGES.map((lang) => ({ value: lang.id, label: lang.label }))}
          onChange={(event) => onLanguage(event.target.value)}
        />
        <Select
          density="compact"
          label={t.lineEnding}
          fullWidth
          value={doc.eol}
          options={[
            { value: 'lf', label: t.eolLf },
            { value: 'crlf', label: t.eolCrlf },
          ]}
          onChange={(event) => onEol(event.target.value as Eol)}
        />
      </SettingsGroup>

      <SettingsGroup label={t.settingsDisplay}>
        <Toggle label={t.wrap} checked={settings.wordWrap} onChange={(checked) => onChange({ wordWrap: checked })} />
        <Toggle
          label={t.lineNumbers}
          checked={settings.lineNumbers}
          onChange={(checked) => onChange({ lineNumbers: checked })}
        />
        <Select
          density="compact"
          label={t.settingsRuler}
          fullWidth
          value={settings.ruler}
          options={[
            { value: 0, label: t.rulerOff },
            { value: 80, label: t.rulerAt(80) },
            { value: 100, label: t.rulerAt(100) },
            { value: 120, label: t.rulerAt(120) },
          ]}
          onChange={(event) => onChange({ ruler: Number(event.target.value) as Ruler })}
        />
        <Select
          density="compact"
          label={t.tabSize}
          fullWidth
          value={settings.tabSize}
          options={[2, 4, 8].map((size) => ({ value: size, label: t.tabSizeOption(size) }))}
          onChange={(event) => onChange({ tabSize: Number(event.target.value) as TabSize })}
        />
      </SettingsGroup>
    </Dialog>
  )
}
