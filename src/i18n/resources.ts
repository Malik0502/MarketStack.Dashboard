// Complete resources for contract tests and TypeScript. Runtime loading is split by language.
import deCommon from './locales/de/common.json'
import deNavigation from './locales/de/navigation.json'
import deDashboard from './locales/de/dashboard.json'
import deUser from './locales/de/user.json'
import enCommon from './locales/en/common.json'
import enNavigation from './locales/en/navigation.json'
import enDashboard from './locales/en/dashboard.json'
import enUser from './locales/en/user.json'
import frCommon from './locales/fr/common.json'
import frNavigation from './locales/fr/navigation.json'
import frDashboard from './locales/fr/dashboard.json'
import frUser from './locales/fr/user.json'
import trCommon from './locales/tr/common.json'
import trNavigation from './locales/tr/navigation.json'
import trDashboard from './locales/tr/dashboard.json'
import trUser from './locales/tr/user.json'

export const resources = {
  de: { common: deCommon, navigation: deNavigation, dashboard: deDashboard, user: deUser },
  en: { common: enCommon, navigation: enNavigation, dashboard: enDashboard, user: enUser },
  fr: { common: frCommon, navigation: frNavigation, dashboard: frDashboard, user: frUser },
  tr: { common: trCommon, navigation: trNavigation, dashboard: trDashboard, user: trUser },
}
