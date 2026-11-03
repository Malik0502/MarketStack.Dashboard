import { Languages, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/Components/ui/button'
import { useTheme } from '@/theme/theme-context'
import { changeLanguage } from '@/i18n'
import { languages, resolveLanguage } from '@/lib/preferences'

const languageNames = { de: 'german', en: 'english', fr: 'french' } as const

export function PreferenceControls() {
  const { t, i18n } = useTranslation('navigation')
  const { theme, setTheme } = useTheme()
  const label = t(theme === 'dark' ? 'switchLight' : 'switchDark')

  return <div className="preference-controls" role="group" aria-label={t('preferences')}>
    <Button variant="ghost" className="theme-switch rounded-lg" aria-label={label} title={label}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
      <span className="preference-text">{t(theme === 'dark' ? 'light' : 'dark')}</span>
    </Button>
    <label className="language-control">
      <Languages className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('language')}</span>
      <select aria-label={t('language')} value={resolveLanguage(i18n.resolvedLanguage)}
        onChange={event => void changeLanguage(event.target.value)}>
        {languages.map(language => <option key={language} value={language}>{t(languageNames[language])}</option>)}
      </select>
    </label>
  </div>
}
