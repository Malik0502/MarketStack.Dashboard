import { useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { DashboardCard } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'
import { analytics, validRange } from './data-source'
import { useAnalytics } from './use-analytics'
import { useAnalyticsFilters } from './use-filters'
import { AnalyticsLayout, AnalyticsState } from './components/analytics-layout'
import { AnalyticsFilters, ProductPicker } from './components/filters'
import { DataTable, type Column } from './components/data-table'
import { ProductPriceAnalysis } from './components/product-price-analysis'
import { CardInfo } from './components/card-info'
import type { PriceRanking } from './types'
import type { PriceFilterSearch } from './price-route-search'

export function PricesPage({ selectedProductId, onProductChange, initialFilters }: { selectedProductId?: number; onProductChange: (id: number) => void; initialFilters?: PriceFilterSearch }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const format = useFormat()
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters(initialFilters)
  const productId = selectedProductId ?? catalog.data?.products[0]?.id
  const load = useCallback((signal: AbortSignal) => analytics.prices({ ...query, productId }, signal), [query, productId])
  const result = useAnalytics(load, `prices:${JSON.stringify(query)}:${productId}`, scenario, validRange(query) && productId !== undefined)
  const data = result.data
  const status = catalog.status === 'loading' ? 'loading' : catalog.status === 'error' ? 'error' : result.status
  const columns: Column<PriceRanking>[] = [
    { key: 'product', title: t('product'), render: row => <Link to="/prices/$productId" params={{ productId: String(row.productId) }} search={{ from: query.from, to: query.to, storeId: query.storeId }} className="font-medium text-primary hover:underline">{row.productName}</Link>, sortValue: row => row.productName },
    { key: 'store', title: t('merchant'), render: row => row.storeName, sortValue: row => row.storeName },
    { key: 'previous', title: t('previous'), render: row => format.money(row.previous), sortValue: row => row.previous, numeric: true },
    { key: 'last', title: t('last'), render: row => format.money(row.last), sortValue: row => row.last, numeric: true },
    { key: 'difference', title: t('change'), render: row => <span className={row.difference > 0 ? 'trend-up' : 'trend-down'}>{format.money(row.difference)}</span>, sortValue: row => row.difference, numeric: true },
    { key: 'percentage', title: t('changePercent'), render: row => row.percentage === null ? t('missing') : format.percent(row.percentage), sortValue: row => row.percentage, numeric: true },
    { key: 'dates', title: t('lastDate'), render: row => <span title={format.date(row.previousAt)}>{format.date(row.lastAt)}</span>, sortValue: row => row.lastAt },
  ]
  return <AnalyticsLayout page="prices" scenario={scenario} onScenario={setScenario} loading={status === 'loading'}
    filters={<AnalyticsFilters query={query} update={update} catalog={catalog.data} store />}>
    <div className="space-y-8">
      <section aria-labelledby="prices-product-heading" aria-describedby="prices-product-scope" className="rounded-xl border bg-muted/20 p-4 sm:p-6">
        <header className="mb-5">
          <h2 id="prices-product-heading" className="text-lg font-semibold tracking-tight">{t('priceSections.productTitle')}</h2>
          <p id="prices-product-scope" className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">{t('priceSections.productDescription')}</p>
        </header>
        <ProductPicker value={productId} selectedName={data?.product?.name ?? catalog.data?.products.find(item => item.id === productId)?.name} onChange={onProductChange} />
        <AnalyticsState status={status} retry={() => { setScenario('ready'); result.retry(); catalog.retry() }} invalid={!validRange(query)}>
          {data && <ProductPriceAnalysis data={data} />}
        </AnalyticsState>
      </section>
      {data && <section aria-labelledby="prices-rankings-heading" aria-describedby="prices-rankings-scope" className="space-y-4 border-t pt-6">
        <header>
          <h2 id="prices-rankings-heading" className="text-lg font-semibold tracking-tight">{t('priceSections.rankingsTitle')}</h2>
          <p id="prices-rankings-scope" className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">{t('priceSections.rankingsDescription')}</p>
        </header>
        <p className="text-[11px] text-muted-foreground">{t('rankingsNote')}</p>
        <div className="space-y-4">
          <DashboardCard title={t('increases')}><DataTable resetKey={JSON.stringify(query)} caption={t('increases')} rows={data.increases} columns={columns} rowKey={row => `${row.productId}:${row.storeId}`} /></DashboardCard>
          <DashboardCard title={t('decreases')}><DataTable resetKey={JSON.stringify(query)} caption={t('decreases')} rows={data.decreases} columns={columns} rowKey={row => `${row.productId}:${row.storeId}`} /></DashboardCard>
          <DashboardCard title={t('stability')} action={<CardInfo topic="stability" />}>
            <p className="mb-4 text-[11px] text-muted-foreground">{t('stabilityNote')}</p>
            <DataTable resetKey={JSON.stringify(query)} caption={t('stability')} rows={data.stability} emptyMessage={t('insufficient')} initialSort={{ key: 'cv', direction: 'desc' }} rowKey={row => `${row.productId}:${row.storeId}`}
              columns={[columns[0], columns[1],
                { key: 'count', title: t('observations'), render: row => format.number(row.stats.count), sortValue: row => row.stats.count, numeric: true },
                { key: 'std', title: t('standardDeviation'), render: row => format.money(row.stats.standardDeviation), sortValue: row => row.stats.standardDeviation, numeric: true },
                { key: 'cv', title: t('cv'), render: row => row.stats.coefficientOfVariation === null ? t('missing') : format.percent(row.stats.coefficientOfVariation), sortValue: row => row.stats.coefficientOfVariation, numeric: true },
              ]} />
          </DashboardCard>
        </div>
      </section>}
    </div>
  </AnalyticsLayout>
}
