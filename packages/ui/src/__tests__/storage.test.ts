import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { safeGetItem, safeSetItem, safeRemoveItem, safeGetJSON, safeSetJSON } from '../storage'

describe('safe storage helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reads and writes strings', () => {
    expect(safeGetItem('k')).toBeNull()
    expect(safeSetItem('k', 'v')).toBe(true)
    expect(safeGetItem('k')).toBe('v')
  })

  it('removes items', () => {
    safeSetItem('k', 'v')
    safeRemoveItem('k')
    expect(safeGetItem('k')).toBeNull()
  })

  it('reads and writes JSON with a fallback', () => {
    expect(safeGetJSON('j', { a: 1 })).toEqual({ a: 1 })
    expect(safeSetJSON('j', { a: 2 })).toBe(true)
    expect(safeGetJSON('j', { a: 1 })).toEqual({ a: 2 })
  })

  it('returns the fallback for invalid JSON', () => {
    localStorage.setItem('bad', '{not json')
    expect(safeGetJSON('bad', [1])).toEqual([1])
  })

  it('never throws when storage is unavailable or full', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('full')
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(safeGetItem('k')).toBeNull()
    expect(safeSetItem('k', 'v')).toBe(false)
    expect(() => safeRemoveItem('k')).not.toThrow()
    expect(safeGetJSON('k', 5)).toBe(5)
    expect(safeSetJSON('k', { a: 1 })).toBe(false)
  })
})
