import { useEffect, useState, type ReactNode } from 'react'
import { readPreference, resolveTheme, THEME_KEY, writePreference, type Theme } from '@/lib/preferences'
import { ThemeContext } from './theme-context'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<Theme>(() => resolveTheme(
    readPreference(THEME_KEY), window.matchMedia('(prefers-color-scheme: dark)').matches,
  ))

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
    const color = getComputedStyle(document.documentElement).getPropertyValue('--sidebar').trim()
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => updateTheme(resolveTheme(readPreference(THEME_KEY), media.matches))
    const onStorage = (event: StorageEvent) => { if (event.key === THEME_KEY || event.key === null) sync() }
    media.addEventListener('change', sync)
    window.addEventListener('storage', onStorage)
    return () => { media.removeEventListener('change', sync); window.removeEventListener('storage', onStorage) }
  }, [])

  function setTheme(value: Theme) {
    writePreference(THEME_KEY, value)
    updateTheme(value)
  }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
