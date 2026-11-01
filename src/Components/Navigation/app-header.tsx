import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PreferenceControls } from './preference-controls'

export function AppHeader({ title, children }: { title: string; children?: ReactNode }) {
  const { t } = useTranslation('navigation')
  return <header className="app-header">
    <span className="header-page-title text-xs font-medium">{title}</span>
    <div className="header-actions">
      {children}
      <PreferenceControls />
      <Link to="/user" activeOptions={{ exact: true }} className="header-user-link"
        aria-label={t('user')} title={t('user')}>
        <UserRound className="size-[18px]" strokeWidth={1.7} />
      </Link>
    </div>
  </header>
}
