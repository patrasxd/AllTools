import React from 'react'

export interface ToolButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'sketch'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  active?: boolean
  fullWidth?: boolean
}

export const ToolButton: React.FC<ToolButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  active = false,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-sans font-medium transition-all select-none cursor-pointer focus:outline-none'
  
  return (
    <button
      className={`tool-btn tool-btn-${variant} tool-btn-${size} ${active ? 'is-active' : ''} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="tool-btn-icon">{icon}</span>}
      {children && <span className="tool-btn-label">{children}</span>}
    </button>
  )
}
