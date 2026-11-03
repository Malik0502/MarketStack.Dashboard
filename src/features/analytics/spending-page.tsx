import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarRange, History, ListChecks, TicketPercent } from 'lucide-react'
import { DashboardCard, EmptyState } from '@/features/dashboard/components/dashboard-card'
import { KpiCard } from '@/features/dashboard/components/kpi-card'
import { useFormat } from '@/i18n/format'
import { analytics, validRange } from './data-source'
import { useAnalytics } from './use-analytics'
import { useAnalyticsFilters } from './use-filters'
import { AnalyticsLayout, AnalyticsNote, AnalyticsState } from './components/analytics-layout'
import { AnalyticsFilters } from './components/filters'
import { BarList } from './components/bar-list'
import { TimeSeriesChart } from './components/charts'
import { CardInfo } from './components/card-info'
import { merchantLabel } from './format'

export function SpendingPage() {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const format = useFormat()
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters()
  const load = useCallback((signal: AbortSignal) => analytics.spending(query, signal), [query])
  const result = useAnalytics(load, `spending:${JSON.stringify(query)}`, scenario, validRange(query))
  const data = result.data
  return <AnalyticsLayout page="spending" scenario={scenario} onScenario={setScenario} loading={result.status === 'loading' || catalog.status === 'loading'}
    filters={<AnalyticsFilters query={query} update={update} catalog={catalog.data} group />}>
    <AnalyticsState status={catalog.status === 'error' ? 'error' : result.status} retry={() => { setScenario('ready'); result.retry(); catalog.retry() }} invalid={!validRange(query)}>
      {data && (data.comparison.current === 0 ? <EmptyState message={t('noResults')} /> : <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={`${t('purchases')} · ${t('currentPeriod')}`} value={format.number(data.comparison.current)} detail={t('frequencyComparison')} icon={CalendarRange} change={null} loading={false} />
          <KpiCard title={t('previousPeriod')} value={data.comparison.previous === null ? null : format.number(data.comparison.previous)} detail={data.comparison.change === null ? t('noComparison') : format.percent(data.comparison.change)} icon={History} loading={false} />
          <KpiCard title={t('promotionPositions')} value={format.number(data.promotions.positions)} detail={t('promotionNote')} icon={ListChecks} loading={false} />
          <KpiCard title={t('promotionShare')} value={format.percent(data.promotions.share)} detail={`${format.number(data.promotions.purchases)} · ${t('promotionPurchases')}`} icon={TicketPercent} loading={false} />
        </div>
        <AnalyticsNote>{t('allocationNote')}</AnalyticsNote>
        <div className="dashboard-grid">
          <DashboardCard title={t('categories')} className="lg:col-span-6">
            <BarList rows={data.categories.map(row => ({ id: row.key, label: row.key === 'untagged' ? t('untagged') : row.label, value: row.expenses, detail: format.percent(row.share) }))} format={format.money} />
          </DashboardCard>
          <DashboardCard title={t('merchants')} className="lg:col-span-6">
            <BarList rows={data.merchants.map(row => ({ id: row.id, label: merchantLabel(row), value: row.expenses,
              detail: format.percent(data.merchants.reduce((sum, item) => sum + item.expenses, 0) > 0 ? row.expenses / data.merchants.reduce((sum, item) => sum + item.expenses, 0) * 100 : 0) }))} format={format.money} />
          </DashboardCard>
          <DashboardCard title={t('weekdays')} className="lg:col-span-6">
            <BarList rows={data.weekdays.map(row => ({ id: row.weekday, label: format.weekday(row.weekday), value: row.purchases,
              detail: `${t('averagePurchase')}: ${row.averageExpense === null ? t('missing') : format.money(row.averageExpense)}` }))} format={format.number} />
          </DashboardCard>
          <DashboardCard title={t('frequency')} action={<CardInfo topic="frequency" />} className="lg:col-span-6">
            <TimeSeriesChart title={t('frequency')} format={format.number} series={[
              { id: 'purchases', label: t('purchases'), points: data.frequency.map(row => ({ date: row.month, value: row.purchases })) },
              { id: 'promotions', label: t('promotionPurchases'), points: data.frequency.map(row => ({ date: row.month, value: row.promotionPurchases })) },
            ]} />
          </DashboardCard>
        </div>
        <section aria-label={t('specials')}>
          <h2 className="mb-3 mt-6 text-xs font-semibold">{t('specials')}</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(['expensive', 'cheapest', 'positions', 'units'] as const).map(key => {
              const row = data.highlights[key]
              return <DashboardCard key={key} title={t(key === 'positions' ? 'mostPositions' : key === 'units' ? 'mostUnits' : key)}>
                {row ? <div className="space-y-2 text-xs">
                  <p className="text-2xl font-semibold tabular-nums">{format.money(row.expenses)}</p>
                  <p className="font-medium">{row.merchant.chain} · {row.merchant.name}</p>
                  <p className="text-muted-foreground">{format.date(row.purchasedAt)}</p>
                  <p>{format.number(row.positions)} · {t('positions')}</p>
                  <p>{format.number(row.distinctProducts)} · {t('distinctProducts')}</p>
                  {row.quantity !== null && <p>{format.number(row.quantity, 3)} · {row.unit ? t(row.unit) : t('unknownUnit')}</p>}
                </div> : <p className="text-xs text-muted-foreground">{t('missing')}</p>}
              </DashboardCard>
            })}
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">{t('unitsScope')}</p>
        </section>
      </div>)}
    </AnalyticsState>
  </AnalyticsLayout>
}
