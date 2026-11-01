import { ArrowDownToLine, ArrowRight, CircleAlert, CircleHelp, FlaskConical, RefreshCw, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/Components/ui/button'
import { AppHeader } from '@/Components/Navigation/app-header'

export function DashboardTopBar({ demo, loading, errors, help, onHelp }: {
  demo: boolean; loading: boolean; errors: number; help: boolean; onHelp: () => void
}) {
  const { t } = useTranslation(['dashboard', 'navigation'])
  const status = demo ? 'demo' : loading ? 'connecting' : errors ? 'limited' : 'connected'
  return <AppHeader title={t('navigation:overview')}>
    <div className="header-dashboard-status flex items-center gap-2">
      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground" role="status">
        <span className={`status-dot size-1.5 rounded-full ${loading ? 'animate-pulse' : ''}`}
          data-state={demo || errors ? 'warning' : loading ? 'loading' : 'connected'} />
        {t(`status.${status}`)}
      </span>
      <Button variant="ghost" size="icon-sm" aria-label={t('help.label')} aria-expanded={help} aria-controls="data-help" onClick={onHelp}>
        <CircleHelp />
      </Button>
    </div>
  </AppHeader>
}

export function DashboardHeading({ loading, demo, canExport, onRefresh, onExport }: {
  loading: boolean; demo: boolean; canExport: boolean; onRefresh: () => void; onExport: () => void
}) {
  const { t } = useTranslation(['dashboard', 'common'])
  return <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
    <div>
      <p className="eyebrow mb-2.5">{t('hero.eyebrow')}</p>
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.045em] sm:text-[32px]">
        {t('hero.title')}<span className="text-primary">.</span>
      </h1>
      <p className="mt-2 text-[13px] text-muted-foreground">{t('hero.subtitle')}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="rounded-lg bg-card" disabled={loading || demo} onClick={onRefresh}>
        <RefreshCw className={loading ? 'animate-spin' : ''} />{t('common:refresh')}
      </Button>
      <Button className="rounded-lg" onClick={onExport} disabled={loading || !canExport}>
        <ArrowDownToLine />{t('common:export')}
      </Button>
    </div>
  </div>
}

export function DataHelp({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation(['dashboard', 'common'])
  return <section id="data-help" className="mb-5 rounded-xl border bg-card p-4 text-xs leading-relaxed text-muted-foreground">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="font-semibold text-foreground">{t('help.title')}</h2>
      <Button variant="ghost" size="icon-xs" aria-label={t('common:close')} onClick={onClose}><X /></Button>
    </div>
    {t('help.body')}
  </section>
}

export function DataNotice({ demo, loading, errors, onDemo }: {
  demo: boolean; loading: boolean; errors: number; onDemo: (demo: boolean) => void
}) {
  const { t } = useTranslation('dashboard')
  if (demo) return <div className="data-notice notice-demo mb-5" role="status">
    <FlaskConical className="size-4 shrink-0" />
    <div className="flex-1"><strong>{t('demo.title')}</strong><span className="mt-1 block text-[11px]">{t('demo.description')}</span></div>
    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => onDemo(false)}>{t('demo.back')}</Button>
  </div>
  if (loading || !errors) return null
  return <div className="data-notice mb-5" role="status">
    <CircleAlert className="size-4 shrink-0" />
    <div className="flex-1">
      <strong>{t(errors === 10 ? 'error.offline' : 'error.partial')}</strong>
      <span className="mt-1 block text-[11px] text-muted-foreground">{t('error.requests', { count: errors })}</span>
    </div>
    <Button variant="outline" size="sm" className="rounded-lg" onClick={() => onDemo(true)}>{t('demo.view')}<ArrowRight /></Button>
  </div>
}
