import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/Components/ui/button'
import { DashboardCard, EmptyState } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'
import { analytics, validRange } from './data-source'
import { useAnalytics } from './use-analytics'
import { useAnalyticsFilters } from './use-filters'
import { AnalyticsLayout, AnalyticsNote, AnalyticsState } from './components/analytics-layout'
import { AnalyticsFilters } from './components/filters'
import { BarList } from './components/bar-list'
import { DataTable } from './components/data-table'
import { ParetoChart } from './components/charts'
import { ProductDrawer } from './components/product-drawer'
import { CardInfo } from './components/card-info'

export function ProductsPage() {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const format = useFormat()
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters()
  const [selected, setSelected] = useState<number | null>(null)
  const load = useCallback((signal: AbortSignal) => analytics.products(query, signal), [query])
  const result = useAnalytics(load, `products:${JSON.stringify(query)}`, scenario, validRange(query))
  const data = result.data
  return <AnalyticsLayout page="products" scenario={scenario} onScenario={setScenario} loading={result.status === 'loading' || catalog.status === 'loading'}
    filters={<AnalyticsFilters query={query} update={update} catalog={catalog.data} tags quantities />}>
    <AnalyticsState status={catalog.status === 'error' ? 'error' : result.status} retry={() => { setScenario('ready'); result.retry(); catalog.retry() }} invalid={!validRange(query)}>
      {data && (data.totalProducts === 0 ? <EmptyState message={t('noResults')} /> : <div className="space-y-4">
        <AnalyticsNote>{t('allocationNote')}</AnalyticsNote>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <DashboardCard title={t('totalProducts')} action={<CardInfo topic="totalProducts" />}><p className="text-2xl font-semibold">{format.number(data.totalProducts)}</p></DashboardCard>
          <DashboardCard title={t('itemExpenses')} action={<CardInfo topic="itemExpenses" />}><p className="text-2xl font-semibold">{format.money(data.totalExpenses)}</p></DashboardCard>
          <DashboardCard title={t('abcOverview')} action={<CardInfo topic="abcOverview" />} className="sm:col-span-2">
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{t('abcDisplay.purpose')}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{data.classes.map(row => <div key={row.abc} className="rounded-lg border p-3">
              <p className="text-xs font-semibold"><span className="text-primary">{row.abc}</span> · {t(`abcDisplay.${row.abc}`)}</p>
              <p className="mt-2 text-sm font-semibold">{t('abcDisplay.products', { count: row.products, value: format.number(row.products) })}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t('abcDisplay.share', { value: format.percent(row.share) })}</p>
              <p className="mt-1 text-xs tabular-nums">{format.money(row.expenses)}</p>
            </div>)}</div>
          </DashboardCard>
        </div>
        <div className="dashboard-grid">
          <DashboardCard title={t('topExpenses')} action={<CardInfo topic="topExpenses" />} className="lg:col-span-6">
            <BarList rows={data.topExpenses.map(row => ({ id: row.id, label: row.name, value: row.expenses, detail: format.percent(row.share) }))} format={format.money} onSelect={id => setSelected(Number(id))} />
          </DashboardCard>
          <DashboardCard title={t('topFrequency')} action={<CardInfo topic="topFrequency" />} className="lg:col-span-6">
            <BarList rows={data.topFrequency.map(row => ({ id: row.id, label: row.name, value: row.purchases }))} format={format.number} onSelect={id => setSelected(Number(id))} />
          </DashboardCard>
          <DashboardCard title={t('pareto')} action={<CardInfo topic="pareto" />} className="lg:col-span-8"><ParetoChart points={data.pareto} /></DashboardCard>
          <DashboardCard title={t('promotionProducts')} action={<CardInfo topic="promotionProducts" />} className="lg:col-span-4">
            <BarList rows={data.topPromotions.map(row => ({ id: row.id, label: row.name, value: row.promotionPositions }))} format={format.number} onSelect={id => setSelected(Number(id))} />
            <p className="mt-4 text-[11px] text-muted-foreground">{t('promotionNote')}</p>
          </DashboardCard>
        </div>
        <DashboardCard title={t('tags')} action={<CardInfo topic="tags" />}>
          <p className="mb-4 text-[11px] text-muted-foreground">{t('tagNote')}</p>
          <DataTable resetKey={JSON.stringify(query)} caption={t('tags')} rows={data.tags} rowKey={row => row.id} columns={[
            { key: 'name', title: t('tag'), render: row => <button className="text-primary hover:underline" onClick={() => update({ tagId: row.id })}>{row.name}</button>, sortValue: row => row.name },
            { key: 'products', title: t('tagProducts'), render: row => format.number(row.products), sortValue: row => row.products, numeric: true },
            { key: 'purchases', title: t('purchases'), render: row => format.number(row.purchases), sortValue: row => row.purchases, numeric: true },
            { key: 'expenses', title: t('itemExpenses'), render: row => format.money(row.expenses), sortValue: row => row.expenses, numeric: true },
            { key: 'share', title: t('share'), render: row => format.percent(row.share), sortValue: row => row.share, numeric: true },
          ]} />
        </DashboardCard>
        <DashboardCard title={t('quantities')} action={<CardInfo topic="quantities" />}>
          <p className="mb-4 text-[11px] text-muted-foreground">{t('quantityNote')}</p>
          {query.unit ? <BarList rows={data.quantities.map(row => ({ id: row.id, label: row.name, value: row.quantity, detail: row.unit ? t(row.unit) : t('unknownUnit') }))} format={value => format.number(value, 3)} onSelect={id => setSelected(Number(id))} /> : <EmptyState message={t('selectUnit')} />}
        </DashboardCard>
        <DashboardCard title={t('productList')}>
          <DataTable paginate={false} caption={t('productList')} rows={data.rows} rowKey={row => row.id} columns={[
            { key: 'name', title: t('product'), render: row => <button className="font-medium text-primary hover:underline" onClick={() => setSelected(row.id)}>{row.name}</button> },
            { key: 'expenses', title: t('itemExpenses'), render: row => format.money(row.expenses), numeric: true },
            { key: 'purchases', title: t('purchases'), render: row => format.number(row.purchases), numeric: true },
            { key: 'quantity', title: t('quantity'), render: row => `${format.number(row.quantity, 3)} ${row.unit ? t(row.unit) : t('unknownUnit')}`, numeric: true },
            { key: 'share', title: t('share'), render: row => format.percent(row.share), numeric: true },
            { key: 'abc', title: t('abc'), render: row => row.abc },
          ]} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{t('page', { page: data.page, pages: Math.max(1, data.totalPages) })}</span>
            <div className="flex gap-2"><Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => update({ page: data.page - 1 })}>{t('previousPage')}</Button><Button variant="outline" size="sm" disabled={data.page >= data.totalPages} onClick={() => update({ page: data.page + 1 })}>{t('nextPage')}</Button></div>
          </div>
        </DashboardCard>
      </div>)}
    </AnalyticsState>
    <ProductDrawer productId={selected} query={query} onClose={() => setSelected(null)} />
  </AnalyticsLayout>
}
