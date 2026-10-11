import { describe, it, expect, vi } from 'vitest'
import type { KeyboardEvent } from 'react'
import { onKeyActivate } from '../a11y'

function keyEvent(key: string, sameTarget = true) {
  const el = {}
  const preventDefault = vi.fn()
  const e = {
    key,
    target: el,
    currentTarget: sameTarget ? el : {},
    preventDefault,
  } as unknown as KeyboardEvent<HTMLElement>
  return { e, preventDefault }
}

describe('onKeyActivate', () => {
  it('calls the handler on Enter and Space and prevents default', () => {
    const handler = vi.fn()
    const onKeyDown = onKeyActivate(handler)
    const enter = keyEvent('Enter')
    const space = keyEvent(' ')
    onKeyDown(enter.e)
    onKeyDown(space.e)
    expect(handler).toHaveBeenCalledTimes(2)
    expect(enter.preventDefault).toHaveBeenCalled()
    expect(space.preventDefault).toHaveBeenCalled()
  })

  it('ignores other keys', () => {
    const handler = vi.fn()
    onKeyActivate(handler)(keyEvent('a').e)
    onKeyActivate(handler)(keyEvent('Tab').e)
    expect(handler).not.toHaveBeenCalled()
  })

  it('ignores key presses that come from nested controls', () => {
    const handler = vi.fn()
    onKeyActivate(handler)(keyEvent('Enter', false).e)
    expect(handler).not.toHaveBeenCalled()
  })
})
