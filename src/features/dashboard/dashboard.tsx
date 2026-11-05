import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { CardHeadingContext } from './components/card-heading-context'
import { Activity, CalendarDays, ReceiptText, ShoppingBag, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardCard } from './components/dashboard-card'
import { DashboardHeading, DashboardTopBar, DataHelp, DataNotice } from './components/dashboard-header'
import { KpiCard } from './components/kpi-card'
import { ExpenseChart } from './components/expense-chart'
import { MonthlyInsight, ShoppingInsights } from './components/insight-cards'
import { HistoryTable } from './components/history-table'
import { useDashboard } from './use-dashboard'
import { useFormat } from './format'
import { selectHistoryWindow } from './selectors'
import { buildHistoryCsv } from './csv'

export function Dashboard() {
  const { t } = useTranslation(['dashboard', 'common'])
  const format = useFormat()
  const { data, demo, setDemo, loading, refresh } = useDashboard()
  const search = useSearch({ from: '__root__' })
  const navigate = useNavigate()
  const range = search.range ?? '12', series = search.series ?? 'expenses'
  const setRange = (range: '6' | '12' | 'all') => void navigate({ to: '/', resetScroll: false, viewTransition: false, search: previous => ({ ...previous, range }) })
  const setSeries = (series: 'expenses' | 'taxes') => void navigate({ to: '/', resetScroll: false, viewTransition: false, search: previous => ({ ...previous, series }) })
  const [help, setHelp] = useState(false)
  const { metrics } = data
  const { months, expenses, taxes } = selectHistoryWindow(data, range)
  const chartData = series === 'expenses' ? expenses : taxes
  const available = chartData?.filter(point => point.expense !== null) ?? []
  const chartTotal = available.length ? available.reduce((sum, point) => sum + point.expense!, 0) : null
  const canExport = [...(expenses ?? []), ...(taxes ?? [])].some(point => point.expense !== null)
  const metric = (value: number | null, currency = true) => value === null ? null : currency ? format.money(value) : format.number(value)
  const period = months.length ? t(range === 'all' ? 'analysis.allPeriod' : 'analysis.period', {
    start: format.month(months[0], true), end: format.month(months[months.length - 1], true),
  }) : t('analysis.noPeriod')

  function exportCsv() {
    if (!canExport) return
    const csv = buildHistoryCsv(months, expenses, taxes,
      [t('common:month'), t('csv.expenses'), t('csv.taxes')], format.decimal)
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `marketstack-${demo ? 'MOCK-' : ''}${t('csv.filename')}.csv`
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return <>
    <DashboardTopBar demo={demo} loading={loading} errors={data.errors.length} help={help} onHelp={() => setHelp(!help)} />
    <div className="dashboard-page">
      <DashboardHeading loading={loading} demo={demo} canExport={canExport} onRefresh={refresh} onExport={exportCsv} />
      {help && <DataHelp onClose={() => setHelp(false)} />}
      <DataNotice demo={demo} loading={loading} errors={data.errors.length} onDemo={setDemo} />

      <CardHeadingContext value="h3"><section aria-label={t('kpi.label')}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold">{t('kpi.section')}</h2>
          <span className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" />{t('kpi.scope')}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard title={t('kpi.total')} value={metric(metrics.totalExpense)} detail={t('kpi.weekly')} icon={Wallet} change={metrics.expenseChange} accent loading={loading} />
          <KpiCard title={t('kpi.purchases')} value={metric(metrics.purchases, false)} detail={t('kpi.receipts')} icon={ReceiptText} loading={loading} />
          <KpiCard title={t('kpi.average')} value={metric(metrics.averagePurchase)} detail={t('kpi.perPurchase')} icon={ShoppingBag} loading={loading} />
          <KpiCard title={t('kpi.tax')} value={metric(metrics.totalTax)} detail={t('kpi.weekly')} icon={Activity} change={metrics.taxChange} loading={loading} />
        </div>
      </section>

      <section className="mt-7" aria-label={t('analysis.label')}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold">{t('analysis.title')}</h2>
          <div className="range-control" role="group" aria-label={t('analysis.range')}>
            {(['6', '12', 'all'] as const).map(value => <button key={value} aria-pressed={range === value} onClick={() => setRange(value)}>
              {t(value === '6' ? 'analysis.last6' : value === '12' ? 'analysis.last12' : 'analysis.all')}
            </button>)}
          </div>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{period}</p>
        <div className="dashboard-grid">
          <DashboardCard title={t('analysis.chartTitle')} eyebrow={t('analysis.eyebrow')} className="lg:col-span-8"
            action={<div className="series-control" role="group" aria-label={t('analysis.series')}>
              <button aria-pressed={series === 'expenses'} onClick={() => setSeries('expenses')}>{t('common:expenses')}</button>
              <button aria-pressed={series === 'taxes'} onClick={() => setSeries('taxes')}>{t('common:taxes')}</button>
            </div>}>
            <div className="mb-4 mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[28px] font-medium tracking-[-0.02em] tabular-nums">{loading || chartTotal === null ? t('common:unavailableValue') : format.money(chartTotal)}</p>
              <span className="text-xs text-muted-foreground">{t('analysis.summary', { count: months.length, available: loading ? 0 : available.length })}</span>
            </div>
            <p className="mb-2 text-xs text-muted-foreground">{t('analysis.partialSum')}</p>
            <ExpenseChart data={chartData} loading={loading} tax={series === 'taxes'} />
          </DashboardCard>
          <ShoppingInsights metrics={metrics} loading={loading} />
          <div className="min-w-0 lg:col-span-8">
            <DashboardCard title={t('table.title')} eyebrow={t('table.eyebrow')}
              action={<span className="text-xs text-muted-foreground">EUR</span>}
              contentClassName="table-scroll max-h-[330px] overflow-auto">
              <HistoryTable expenses={expenses} taxes={taxes} loading={loading} />
            </DashboardCard>
          </div>
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
            <MonthlyInsight expenses={loading ? null : data.expenses} />
            <div className="info-note flex items-start gap-3 rounded-xl border p-4">
              <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-primary" />
              <div><p className="text-xs font-medium">{t('note.title')}</p><p className="mt-2 text-xs leading-relaxed">{t('note.body')}</p></div>
            </div>
          </div>
        </div>
      </section>
      </CardHeadingContext><footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs text-muted-foreground">
        <span>MarketStack <span className="mx-1.5 text-border">/</span> {t('footer.description')}</span>
        <div className="flex items-center gap-3">
          <span>{demo ? t('demo.footer') : data.updatedAt ? t('footer.updated', { time: format.time(data.updatedAt) }) : t('footer.noData')}</span>
          {!demo && <button onClick={() => setDemo(true)} className="underline underline-offset-4 hover:text-foreground">{t('demo.toggle')}</button>}
        </div>
      </footer>
    </div>
  </>
}
