import { memo, type ReactNode } from 'react'

export interface ControlsBarProps {
  children: ReactNode
  className?: string
}

export const ControlsBar = memo(function ControlsBar({
  children,
  className = '',
}: ControlsBarProps) {
  return (
    <div className={`game-controls-bar ${className}`.trim()}>
      {children}
    </div>
  )
})
