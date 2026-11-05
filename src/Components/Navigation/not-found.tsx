import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { AppHeader } from './app-header'

export function NotFound() {
  const { t } = useTranslation()
  return <><AppHeader title={t('notFoundTitle')} /><section className="dashboard-page py-16">
    <h1 className="text-2xl font-semibold">{t('notFoundTitle')}</h1>
    <p className="my-4 text-sm text-muted-foreground">{t('notFoundDescription')}</p>
    <Link to="/" className="text-sm font-medium text-primary underline underline-offset-4">{t('backHome')}</Link>
  </section></>
}
