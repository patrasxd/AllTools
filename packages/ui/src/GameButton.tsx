import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export interface GameButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  children?: ReactNode
  fullWidth?: boolean
}

export interface ToolButtonProps extends GameButtonProps {}

const ToolButtonBase = forwardRef<HTMLButtonElement, GameButtonProps>(function ToolButtonBase(
  {
    variant = 'secondary',
    size = 'md',
    icon,
    children,
    fullWidth = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const variantClass = variant === 'primary' ? 'game-btn--primary' : variant === 'ghost' ? 'game-btn--ghost' : variant === 'danger' ? 'game-btn--danger' : ''
  const sizeClass = size === 'sm' ? 'game-btn--sm' : size === 'lg' ? 'game-btn--lg' : ''
  const fullWidthClass = fullWidth ? 'w-full game-btn--full' : ''

  return (
    <button
      ref={ref}
      type={type}
      className={`tool-btn game-btn ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`.trim()}
      {...props}
    >
      {icon && <span className="game-btn-icon tool-btn-icon" aria-hidden="true">{icon}</span>}
      {children && <span className="game-btn-text tool-btn-text">{children}</span>}
    </button>
  )
})

export const ToolButton = ToolButtonBase
export const GameButton = ToolButtonBase
