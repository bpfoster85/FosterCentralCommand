import { useLayoutEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'sky-theme'

const applyTheme = (theme: Theme) => {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

/**
 * Persists the user's light/dark preference in localStorage and applies
 * a `data-theme="dark"` attribute to `<html>` so CSS can react to it.
 * Uses `useLayoutEffect` so the attribute is set before the first paint,
 * preventing a flash of the wrong theme on reload.
 */
export const useTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const toggle = () => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Silently ignore storage errors (e.g. private browsing quota)
      }
      return next
    })
  }

  return [theme, toggle]
}
