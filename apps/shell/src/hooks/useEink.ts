import { useState, useEffect } from 'react'

const EINK_KEY = 'alltools:eink'

export function useEink() {
  const [isEink, setIsEinkState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(EINK_KEY) === 'true'
    } catch {
      return false
    }
  })

  const setIsEink = (next: boolean) => {
    setIsEinkState(next)
    try {
      localStorage.setItem(EINK_KEY, next ? 'true' : 'false')
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    const root = document.documentElement
    if (isEink) {
      root.setAttribute('data-eink', 'true')
    } else {
      root.removeAttribute('data-eink')
    }
  }, [isEink])

  return { isEink, setIsEink }
}
