import { useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DashboardCard, EmptyState } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'
import { analytics, validRange } from './data-source'
import { useAnalytics } from './use-analytics'
import { useAnalyticsFilters } from './use-filters'
import { AnalyticsLayout, AnalyticsNote, AnalyticsState } from './components/analytics-layout'
import { AnalyticsFilters, ProductPicker } from './components/filters'
import { BarList } from './components/bar-list'
import { DataTable } from './components/data-table'
import { merchantLabel } from './format'

export function StoresPage() {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const format = useFormat()
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters()
  const productId = query.productId ?? catalog.data?.products[0]?.id
  const load = useCallback((signal: AbortSignal) => analytics.stores({ ...query, productId }, signal), [query, productId])
  const result = useAnalytics(load, `stores:${JSON.stringify(query)}:${productId}`, scenario, validRange(query))
  const data = result.data
  return <AnalyticsLayout page="stores" catalog={catalog.data} scenario={scenario} onScenario={setScenario} loading={result.status === 'loading' || catalog.status === 'loading'}
    filters={<AnalyticsFilters query={query} update={update} catalog={catalog.data} group />}>
    <AnalyticsState status={catalog.status === 'error' ? 'error' : result.status} retry={() => { setScenario('ready'); result.retry(); catalog.retry() }} invalid={!validRange(query)}>
      {data && (data.merchants.length === 0 ? <EmptyState message={t('noResults')} /> : <div className="space-y-4">
        <AnalyticsNote>{t('noMerchantRanking')}</AnalyticsNote>
        <div className="dashboard-grid">
          <DashboardCard title={t('storePurchases')} className="lg:col-span-6"><BarList rows={data.merchants.map(row => ({ id: row.id, label: merchantLabel(row), value: row.purchases }))} format={format.number} /></DashboardCard>
          <DashboardCard title={t('storeAverage')} className="lg:col-span-6"><BarList rows={data.merchants.filter(row => row.averagePurchase !== null).map(row => ({ id: row.id, label: merchantLabel(row), value: row.averagePurchase! }))} format={format.money} /></DashboardCard>
        </div>
        <DashboardCard title={t('storeOverview')}>
          <DataTable resetKey={JSON.stringify(query)} caption={t('storeOverview')} rows={data.merchants} rowKey={row => row.id} columns={[
            { key: 'name', title: t('merchant'), render: row => row.name, sortValue: row => row.name },
            { key: 'chain', title: t('chain'), render: row => row.chain, sortValue: row => row.chain },
            { key: 'purchases', title: t('purchases'), render: row => format.number(row.purchases), sortValue: row => row.purchases, numeric: true },
            { key: 'expenses', title: t('expenses'), render: row => format.money(row.expenses), sortValue: row => row.expenses, numeric: true },
            { key: 'average', title: t('averagePurchase'), render: row => row.averagePurchase === null ? t('missing') : format.money(row.averagePurchase), sortValue: row => row.averagePurchase, numeric: true },
            { key: 'positions', title: t('positions'), render: row => format.number(row.positions), sortValue: row => row.positions, numeric: true },
            { key: 'products', title: t('distinctProducts'), render: row => format.number(row.distinctProducts), sortValue: row => row.distinctProducts, numeric: true },
            { key: 'promotions', title: t('promotionShare'), render: row => `${format.percent(row.promotionShare)} (${format.number(row.promotionPurchases)})`, sortValue: row => row.promotionShare, numeric: true },
          ]} />
        </DashboardCard>
        <ProductPicker value={productId} selectedName={data.product?.name ?? catalog.data?.products.find(item => item.id === productId)?.name} onChange={id => update({ productId: id })} />
        <AnalyticsNote>{t('historicalNote')}</AnalyticsNote>
        <DashboardCard title={`${t('productComparison')}${data.product ? ` · ${data.product.name}` : ''}`}>
          <DataTable resetKey={JSON.stringify(query)} caption={t('productComparison')} rows={data.prices} emptyMessage={t('insufficient')} rowKey={row => row.merchant.id} columns={[
            { key: 'store', title: t('merchant'), render: row => `${row.merchant.chain} · ${row.merchant.name}`, sortValue: row => row.merchant.name },
            { key: 'last', title: t('last'), render: row => format.money(row.last), sortValue: row => row.last, numeric: true },
            { key: 'date', title: t('lastDate'), render: row => format.date(row.lastAt), sortValue: row => row.lastAt },
            { key: 'average', title: t('mean'), render: row => format.money(row.average), sortValue: row => row.average, numeric: true },
            { key: 'min', title: t('lowestObserved'), render: row => format.money(row.min), sortValue: row => row.min, numeric: true },
            { key: 'minAt', title: t('minimumDate'), render: row => format.date(row.minAt), sortValue: row => row.minAt },
            { key: 'count', title: t('observations'), render: row => format.number(row.count), sortValue: row => row.count, numeric: true },
          ]} />
        </DashboardCard>
        <DashboardCard title={t('differences')}>
          <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground">{t('historicalDifferencesNote')}</p>
          <DataTable resetKey={JSON.stringify(query)} caption={t('differences')} rows={data.differences} rowKey={row => row.productId} initialSort={{ key: 'difference', direction: 'desc' }} columns={[
            { key: 'product', title: t('product'), render: row => <Link to="/prices/$productId" params={{ productId: String(row.productId) }} search={{ from: query.from, to: query.to }} className="font-medium text-primary hover:underline">{row.productName}</Link>, sortValue: row => row.productName },
            { key: 'baseline', title: t('baseline'), render: row => <span>{row.baseline.chain} · {row.baseline.name}<span className="mt-1 block text-[10px] text-muted-foreground">{format.date(row.baselineAt)}</span></span> },
            { key: 'alternative', title: t('alternative'), render: row => <span>{row.alternative.chain} · {row.alternative.name}<span className="mt-1 block text-[10px] text-muted-foreground">{format.date(row.alternativeAt)}</span></span> },
            { key: 'price', title: t('baselinePrice'), render: row => format.money(row.baselinePrice), sortValue: row => row.baselinePrice, numeric: true },
            { key: 'alternativePrice', title: t('alternativePrice'), render: row => format.money(row.alternativePrice), sortValue: row => row.alternativePrice, numeric: true },
            { key: 'difference', title: t('difference'), render: row => format.money(row.difference), sortValue: row => row.difference, numeric: true },
            { key: 'percent', title: t('differencePercent'), render: row => row.percentage === null ? t('missing') : format.percent(row.percentage), sortValue: row => row.percentage, numeric: true },
          ]} />
        </DashboardCard>
      </div>)}
    </AnalyticsState>
  </AnalyticsLayout>
}
