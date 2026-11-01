import { Languages, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/Components/ui/button'
import { useTheme } from '@/theme/theme-context'
import { changeLanguage } from '@/i18n'
import { resolveLanguage } from '@/lib/preferences'

export function PreferenceControls() {
  const { t, i18n } = useTranslation('navigation')
  const languageT = i18n.getFixedT('en', 'navigation')
  const { theme, setTheme } = useTheme()
  const label = t(theme === 'dark' ? 'switchLight' : 'switchDark')

  return <div className="preference-controls" role="group" aria-label={t('preferences')}>
    <Button variant="ghost" className="theme-switch rounded-lg" aria-label={label} title={label}
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
      <span className="preference-text">{t(theme === 'dark' ? 'light' : 'dark')}</span>
    </Button>
    <label className="language-control" lang="en">
      <Languages className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">{languageT('language')}</span>
      <select aria-label={languageT('language')} value={resolveLanguage(i18n.resolvedLanguage)}
        onChange={event => void changeLanguage(event.target.value)}>
        <option value="de">{languageT('german')}</option>
        <option value="en">{languageT('english')}</option>
      </select>
    </label>
  </div>
}
