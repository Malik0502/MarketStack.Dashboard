export const THEME_KEY = 'marketstack.theme'
export const LANGUAGE_KEY = 'marketstack.language'

export function readPreference(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

export function writePreference(key: string, value: string): void {
  // Private browsing and disabled storage must not break the application.
  try { localStorage.setItem(key, value) } catch { /* In-memory preference still works. */ }
}

export type Theme = 'light' | 'dark'
export function resolveTheme(saved: string | null, systemDark: boolean): Theme {
  return saved === 'light' || saved === 'dark' ? saved : systemDark ? 'dark' : 'light'
}

export const languages = ['de', 'en', 'fr'] as const
export type Language = typeof languages[number]
export function resolveLanguage(value: string | null | undefined): Language {
  const base = value?.toLowerCase().split(/[-_]/)[0]
  return languages.find(language => language === base) ?? 'de'
}
