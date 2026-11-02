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
import type { AnalyticsQuery } from './types'

export function ProductsPage() {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const format = useFormat()
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters()
  const [selected, setSelected] = useState<number | null>(null)
  const load = useCallback((signal: AbortSignal) => analytics.products(query, signal), [query])
  const result = useAnalytics(load, `products:${JSON.stringify(query)}`, scenario, validRange(query))
  const data = result.data
  return <AnalyticsLayout page="products" catalog={catalog.data} scenario={scenario} onScenario={setScenario}
    filters={<div className="space-y-3">
      <AnalyticsFilters query={query} update={update} catalog={catalog.data} tags quantities />
      <div className="flex flex-wrap gap-3">
        <label className="analytics-field flex-1">{t('search')}<input type="search" value={query.search ?? ''} onChange={event => update({ search: event.target.value })} /></label>
        <label className="analytics-field">{t('sortBy')}<select value={query.sortBy} onChange={event => update({ sortBy: event.target.value as AnalyticsQuery['sortBy'] })}>
          <option value="expenses">{t('itemExpenses')}</option><option value="purchases">{t('purchases')}</option><option value="name">{t('name')}</option>
        </select></label>
        <label className="analytics-field">{t('sortDirection')}<select value={query.sortDirection} onChange={event => update({ sortDirection: event.target.value as 'asc' | 'desc' })}>
          <option value="desc">{t('descending')}</option><option value="asc">{t('ascending')}</option>
        </select></label>
      </div>
    </div>}>
    <AnalyticsState status={catalog.status === 'error' ? 'error' : result.status} retry={() => { setScenario('ready'); result.retry(); catalog.retry() }} invalid={!validRange(query)}>
      {data && (data.totalProducts === 0 ? <EmptyState message={t('noResults')} /> : <div className="space-y-4">
        <AnalyticsNote>{t('allocationNote')}</AnalyticsNote>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <DashboardCard title={t('totalProducts')}><p className="text-2xl font-semibold">{format.number(data.totalProducts)}</p></DashboardCard>
          <DashboardCard title={t('itemExpenses')}><p className="text-2xl font-semibold">{format.money(data.totalExpenses)}</p></DashboardCard>
          <DashboardCard title={t('abcOverview')}><div className="flex justify-between gap-3">{data.classes.map(row => <div key={row.abc}><strong className="text-primary">{row.abc}</strong><p className="mt-1 text-xs">{format.number(row.products)} · {format.percent(row.share)}</p></div>)}</div></DashboardCard>
        </div>
        <div className="dashboard-grid">
          <DashboardCard title={t('topExpenses')} className="lg:col-span-6">
            <BarList rows={data.topExpenses.map(row => ({ id: row.id, label: row.name, value: row.expenses, detail: format.percent(row.share) }))} format={format.money} onSelect={id => setSelected(Number(id))} />
          </DashboardCard>
          <DashboardCard title={t('topFrequency')} className="lg:col-span-6">
            <BarList rows={data.topFrequency.map(row => ({ id: row.id, label: row.name, value: row.purchases }))} format={format.number} onSelect={id => setSelected(Number(id))} />
          </DashboardCard>
          <DashboardCard title={t('pareto')} className="lg:col-span-8"><ParetoChart points={data.pareto} /></DashboardCard>
          <DashboardCard title={t('promotionProducts')} className="lg:col-span-4">
            <BarList rows={data.topPromotions.map(row => ({ id: row.id, label: row.name, value: row.promotionPositions }))} format={format.number} onSelect={id => setSelected(Number(id))} />
            <p className="mt-4 text-[11px] text-muted-foreground">{t('promotionNote')}</p>
          </DashboardCard>
        </div>
        <DashboardCard title={t('tags')}>
          <p className="mb-4 text-[11px] text-muted-foreground">{t('tagNote')}</p>
          <DataTable caption={t('tags')} rows={data.tags} rowKey={row => row.id} columns={[
            { key: 'name', title: t('tag'), render: row => <button className="text-primary hover:underline" onClick={() => update({ tagId: row.id })}>{row.name}</button>, sortValue: row => row.name },
            { key: 'products', title: t('tagProducts'), render: row => format.number(row.products), sortValue: row => row.products, numeric: true },
            { key: 'purchases', title: t('purchases'), render: row => format.number(row.purchases), sortValue: row => row.purchases, numeric: true },
            { key: 'expenses', title: t('itemExpenses'), render: row => format.money(row.expenses), sortValue: row => row.expenses, numeric: true },
            { key: 'share', title: t('share'), render: row => format.percent(row.share), sortValue: row => row.share, numeric: true },
          ]} />
        </DashboardCard>
        <DashboardCard title={t('quantities')}>
          <p className="mb-4 text-[11px] text-muted-foreground">{t('quantityNote')}</p>
          {query.unit ? <BarList rows={data.quantities.map(row => ({ id: row.id, label: row.name, value: row.quantity, detail: row.unit ? t(row.unit) : t('unknownUnit') }))} format={value => format.number(value, 3)} onSelect={id => setSelected(Number(id))} /> : <EmptyState message={t('selectUnit')} />}
        </DashboardCard>
        <DashboardCard title={t('productList')}>
          <DataTable caption={t('productList')} rows={data.rows} rowKey={row => row.id} columns={[
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
