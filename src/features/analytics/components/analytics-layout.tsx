import { useCallback, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FlaskConical, RefreshCw } from 'lucide-react'
import { AppHeader } from '@/Components/Navigation/app-header'
import { Button } from '@/Components/ui/button'
import { EmptyState } from '@/features/dashboard/components/dashboard-card'
import { analyticsSource } from '../data-source'
import type { AnalyticsStatus, Scenario } from '../types'

const stateMessages: Record<Exclude<AnalyticsStatus, 'ready' | 'error'>, 'invalidRange' | 'loading' | 'empty' | 'noResults'> = {
  invalid: 'invalidRange', loading: 'loading', empty: 'empty', noResults: 'noResults', disabled: 'noResults',
}

export function AnalyticsLayout({ page, scenario, onScenario, filters, children, title, description, loading = false, sharedIdentity = false }: {
  page: 'spending' | 'prices' | 'products' | 'stores'
  scenario: Scenario; onScenario: (value: Scenario) => void; filters: ReactNode; children: ReactNode
  title?: string; description?: string
  loading?: boolean
  sharedIdentity?: boolean
}) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const { t: nav } = useTranslation('navigation')
  const layoutRef = useCallback((node: HTMLDivElement | null) => {
    const header = node?.querySelector<HTMLElement>('.app-header')
    const content = node?.querySelector<HTMLElement>('.analytics-content')
    if (!node || !header) return
    // The header wraps on narrow screens and can change height with language/zoom.
    // Keep this measurement local to analytics so Home's layout is unaffected.
    const measure = () => {
      const headerHeight = header.getBoundingClientRect().height
      const contentHeight = content && node.dataset.loading !== 'true' ? content.getBoundingClientRect().height : null
      node.style.setProperty('--analytics-header-height', `${headerHeight}px`)
      if (contentHeight !== null) node.style.setProperty('--analytics-content-height', `${contentHeight}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    if (content) observer.observe(content)
    return () => observer.disconnect()
  }, [])
  return <div ref={layoutRef} className="analytics-layout" data-loading={loading || undefined}>
    <AppHeader title={nav(page)} documentTitle={title ?? t(`${page}Title`)} />
    <div className="dashboard-page">
      <div className="mb-7"><p className="eyebrow mb-2.5">{t('eyebrow')}</p>
        <h1 style={{ viewTransitionName: sharedIdentity ? 'price-product-identity' : undefined }} className="text-[28px] font-medium tracking-[-0.02em] sm:text-[32px]">{title ?? t(`${page}Title`)}</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">{description ?? t(`${page}Description`)}</p>
      </div>
      {analyticsSource === 'mock' && <div className="data-notice notice-demo mb-5">
        <FlaskConical className="size-4 shrink-0" />
        <div className="flex-1"><strong>{t('mockLabel')}</strong><p className="mt-1 text-xs leading-relaxed">{t('mockNotice')}</p></div>
        <label className="analytics-field">{t('preview')}
          <select value={scenario} onChange={event => onScenario(event.target.value as Scenario)}>
            {(['ready', 'loading', 'empty', 'error', 'noResults'] as const).map(value => <option key={value} value={value}>{t(`state_${value}`)}</option>)}
          </select>
        </label>
      </div>}
      {filters}
      <div className="analytics-content">{children}</div>
    </div>
  </div>
}

export function AnalyticsState({ status, retry, children }: {
  status: AnalyticsStatus; retry: () => void; children: ReactNode
}) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  if (status === 'ready') return <>{children}</>
  if (status === 'error') return <div className="rounded-xl border bg-card p-8 text-center" role="alert">
    <p className="mb-4 text-sm text-muted-foreground">{t('error')}</p>
    <Button variant="outline" className="rounded-lg" onClick={retry}><RefreshCw />{t('retry')}</Button>
  </div>
  return <EmptyState message={t(stateMessages[status])} />
}

export function AnalyticsNote({ children }: { children: ReactNode }) {
  return <p className="info-note rounded-xl border p-4 text-xs leading-relaxed">{children}</p>
}
