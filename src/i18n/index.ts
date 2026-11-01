import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LANGUAGE_KEY, readPreference, resolveLanguage, writePreference } from '@/lib/preferences'
import deCommon from './locales/de/common.json'
import deNavigation from './locales/de/navigation.json'
import deDashboard from './locales/de/dashboard.json'
import enCommon from './locales/en/common.json'
import enNavigation from './locales/en/navigation.json'
import enDashboard from './locales/en/dashboard.json'
import deUser from './locales/de/user.json'
import enUser from './locales/en/user.json'

export const resources = {
  de: { common: deCommon, navigation: deNavigation, dashboard: deDashboard, user: deUser },
  en: { common: enCommon, navigation: enNavigation, dashboard: enDashboard, user: enUser },
}

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof resources.de
  }
}

const initialLanguage = resolveLanguage(readPreference(LANGUAGE_KEY) ?? globalThis.navigator?.language)
void i18n.use(initReactI18next).init({
  resources, lng: initialLanguage, supportedLngs: ['de', 'en'], fallbackLng: 'de',
  defaultNS: 'common', interpolation: { escapeValue: false }, initAsync: false,
})

function syncDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = resolveLanguage(i18n.resolvedLanguage)
  document.title = i18n.t('appTitle')
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('description'))
}
syncDocument()
i18n.on('languageChanged', syncDocument)

export function changeLanguage(language: string) {
  const resolved = resolveLanguage(language)
  writePreference(LANGUAGE_KEY, resolved)
  return i18n.changeLanguage(resolved)
}

export default i18n
