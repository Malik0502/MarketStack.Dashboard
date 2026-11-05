import i18n, { type BackendModule } from 'i18next'
import { initReactI18next } from 'react-i18next'
import { LANGUAGE_KEY, languages, preferredLanguage, readPreference, resolveLanguage, writePreference, type Language } from '@/lib/preferences'
import type { resources as TranslationResources } from './resources'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: typeof TranslationResources.de
  }
}

const loaders = {
  de: () => import('./locales/de'), en: () => import('./locales/en'),
  fr: () => import('./locales/fr'), tr: () => import('./locales/tr'),
}
const loaded = new Map<Language, Promise<unknown>>()
function loadLanguage(language: Language) {
  let pending = loaded.get(language)
  if (!pending) {
    pending = loaders[language]().then(module => module.default).catch(error => { loaded.delete(language); throw error })
    loaded.set(language, pending)
  }
  return pending
}
const backend: BackendModule = {
  type: 'backend', init() {},
  read(language, namespace, callback) {
    void loadLanguage(resolveLanguage(language)).then(data => {
      callback(null, (data as Record<string, object>)[namespace])
    }, error => callback(error, false))
  },
}
const initialLanguage = resolveLanguage(readPreference(LANGUAGE_KEY) ?? preferredLanguage(globalThis.navigator?.languages ?? [globalThis.navigator?.language ?? 'de']))
await i18n.use(backend).use(initReactI18next).init({
  lng: initialLanguage, supportedLngs: [...languages], fallbackLng: 'de',
  ns: ['common', 'navigation', 'dashboard', 'user'], defaultNS: 'common',
  interpolation: { escapeValue: false }, initAsync: false,
})

function syncDocument() {
  if (typeof document === 'undefined') return
  document.documentElement.lang = resolveLanguage(i18n.resolvedLanguage)
  document.title = i18n.t('appTitle')
  document.querySelector('meta[name="description"]')?.setAttribute('content', i18n.t('description'))
}
syncDocument()
i18n.on('languageChanged', syncDocument)

let revision = 0
export async function changeLanguage(language: string) {
  const current = ++revision, resolved = resolveLanguage(language)
  await loadLanguage(resolved)
  await i18n.loadLanguages(resolved)
  if (current !== revision) return
  await i18n.changeLanguage(resolved)
  writePreference(LANGUAGE_KEY, resolved)
}

export default i18n
