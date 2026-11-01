import { Outlet } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import NavBar from './navbar'

export function AppLayout() {
  const { t } = useTranslation()
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">{t('skipContent')}</a>
    <NavBar />
    <main id="main-content" className="app-main" tabIndex={-1}><Outlet /></main>
  </div>
}
