import { useContext, useEffect, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PreferenceControls } from './preference-controls'
import { PageContext } from './page-context'

export function AppHeader({ title, documentTitle = title, children }: { title: string; documentTitle?: string; children?: ReactNode }) {
  const { t } = useTranslation('navigation')
  const { t: common } = useTranslation()
  const announce = useContext(PageContext)
  const fullTitle = common('pageTitle', { page: documentTitle })
  useEffect(() => { announce(fullTitle) }, [announce, fullTitle])
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
