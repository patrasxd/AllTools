import type { KeyboardEvent } from 'react'

/**
 * Keyboard handler that triggers `handler` on Enter or Space.
 * Use together with `role="button"` and `tabIndex={0}` on non-button elements
 * that react to clicks. It ignores keys pressed on nested controls.
 */
export function onKeyActivate(handler: () => void) {
  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler()
    }
  }
}
