import React, { useEffect } from 'react'
import { IconX } from './icons'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  maxWidth?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  maxWidth = 'max-w-md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="tool-modal-backdrop" onClick={onClose}>
      <div
        className={`tool-modal-content ${maxWidth} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tool-modal-header">
          {title && <h3 className="tool-modal-title">{title}</h3>}
          <button
            onClick={onClose}
            className="tool-modal-close"
            aria-label="Close modal"
          >
            <IconX size={18} />
          </button>
        </div>
        <div className="tool-modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}
