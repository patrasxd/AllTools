/**
 * Safe wrappers around localStorage.
 *
 * Storage can be unavailable (private mode, blocked by the browser) or full.
 * None of these functions ever throw: reads return `null` (or the fallback)
 * and writes report success with a boolean, so callers can fall back to
 * defaults without wrapping every call in try/catch.
 */

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Storage unavailable: nothing to remove
  }
}

/** Reads and parses a JSON value. Returns `fallback` when missing, unreadable or invalid. */
export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key)
  if (raw === null) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** Serializes and stores a JSON value. Returns false when it could not be saved. */
export function safeSetJSON(key: string, value: unknown): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value))
  } catch {
    return false
  }
}
