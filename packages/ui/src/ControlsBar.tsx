import React from 'react'
import { ControlsBar as SharedControlsBar, type ControlsBarProps } from '@all/ui'

export type { ControlsBarProps }

export const ControlsBar = React.forwardRef<HTMLDivElement, ControlsBarProps>(function ControlsBar(
  { className = '', ...props },
  ref
) {
  return (
    <SharedControlsBar
      ref={ref}
      className={`game-controls-bar ${className}`.trim()}
      {...props}
    />
  )
})

export default ControlsBar
