import React from 'react'

export interface ModeOption<T = string> {
  value: T
  title: string
  desc: string
  icon: React.ReactNode
}

export interface ModeSelectProps<T = string> {
  label: string
  options: ModeOption<T>[]
  onSelect: (value: T) => void
}

export function ModeSelect<T = string>({
  label,
  options,
  onSelect,
}: ModeSelectProps<T>) {
  return (
    <div className="game-mode-select">
      <p className="game-mode-label">{label}</p>
      <div className="game-mode-options">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className="game-mode-card"
            onClick={() => onSelect(opt.value)}
          >
            <div className="game-mode-icon">{opt.icon}</div>
            <div className="game-mode-title">{opt.title}</div>
            <div className="game-mode-desc">{opt.desc}</div>
          </button>
        ))}
      </div>
    </div>
  )
}
