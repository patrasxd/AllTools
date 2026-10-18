import React from 'react'
import {
  AlignLeftIcon,
  CodeIcon,
  DownloadIcon,
  EyeIcon,
  FilePlusIcon,
  FolderOpenIcon,
  IconButton,
  SearchIcon,
  SettingsIcon,
  ToolbarGroup,
} from '@all/ui'
import type { getTranslations } from '../i18n'

interface TopBarProps {
  t: ReturnType<typeof getTranslations>
  canFormat: boolean
  formatting: boolean
  isJson: boolean
  panelOpen: boolean
  onNew: () => void
  onOpen: () => void
  onExport: () => void
  onFind: () => void
  onFormat: () => void
  onMinify: () => void
  onTogglePanel: () => void
  onSettings: () => void
}

/** Slim icon toolbar. Every button has a tooltip (with its shortcut) and an accessible name. */
export function TopBar({
  t,
  canFormat,
  formatting,
  isJson,
  panelOpen,
  onNew,
  onOpen,
  onExport,
  onFind,
  onFormat,
  onMinify,
  onTogglePanel,
  onSettings,
}: TopBarProps) {
  return (
    <div className="cs-topbar" role="toolbar" aria-label={t.toolbarLabel}>
      <ToolbarGroup label={t.groupFile}>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={t.newTab}
          title={t.tipNew}
          icon={<FilePlusIcon />}
          onClick={onNew}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={t.open}
          title={t.tipOpen}
          icon={<FolderOpenIcon />}
          onClick={onOpen}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={t.exportFile}
          title={t.tipExport}
          aria-keyshortcuts="Control+S"
          icon={<DownloadIcon />}
          onClick={onExport}
        />
      </ToolbarGroup>

      <ToolbarGroup label={t.groupEdit}>
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={t.find}
          title={t.tipFind}
          aria-keyshortcuts="Control+F"
          icon={<SearchIcon />}
          onClick={onFind}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={t.format}
          title={canFormat ? t.tipFormat : t.formatUnavailable}
          aria-keyshortcuts="Shift+Alt+F"
          icon={<AlignLeftIcon />}
          disabled={!canFormat || formatting}
          onClick={onFormat}
        />
        {isJson && (
          <IconButton
            size="sm"
            variant="ghost"
            aria-label={t.minify}
            title={t.tipMinify}
            icon={<CodeIcon />}
            onClick={onMinify}
          />
        )}
      </ToolbarGroup>

      <span className="cs-topbar__spacer" aria-hidden="true" />

      <ToolbarGroup label={t.groupView}>
        <IconButton
          size="sm"
          variant={panelOpen ? 'secondary' : 'ghost'}
          aria-label={t.panelToggle}
          aria-pressed={panelOpen}
          title={t.tipPanel}
          icon={<EyeIcon />}
          onClick={onTogglePanel}
        />
        <IconButton
          size="sm"
          variant="ghost"
          aria-label={t.settings}
          title={t.tipSettings}
          icon={<SettingsIcon />}
          onClick={onSettings}
        />
      </ToolbarGroup>
    </div>
  )
}
