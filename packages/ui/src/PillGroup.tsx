import React from 'react'

export interface PillOption<T = string> {
  value: T
  label: string
  id?: string
  icon?: React.ReactNode
}

export interface PillGroupProps<T = string> {
  label?: string
  options: PillOption<T>[]
  value: T
  onChange: (val: T) => void
  size?: 'sm' | 'md'
  className?: string
}

export function PillGroup<T = string>({
  label,
  options,
  value,
  onChange,
  className = '',
}: PillGroupProps<T>) {
  return (
    <div className={`game-pill-group ${className}`.trim()} role="group" aria-label={label}>
      {options.map(opt => {
        const isActive = opt.value === value
        return (
          <button
            key={String(opt.value)}
            type="button"
            id={opt.id || `pill-btn-${String(opt.value)}`}
            className={`game-pill-btn ${isActive ? 'game-pill-btn--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.icon && <span style={{ marginRight: '0.25rem', display: 'inline-flex', verticalAlign: 'middle' }}>{opt.icon}</span>}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
