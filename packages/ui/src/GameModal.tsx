import React from 'react'

export interface GameModalProps {
  isOpen: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  children?: React.ReactNode
}

export function GameModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  children,
}: GameModalProps) {
  if (!isOpen) return null

  return (
    <div className="game-modal-overlay" onClick={onCancel}>
      <div className="game-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="game-modal-title">{title}</h3>
        {description && <p className="game-modal-desc">{description}</p>}
        {children}
        <div className="game-modal-actions">
          <button type="button" className="game-modal-btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className="game-modal-btn game-modal-btn--primary"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
