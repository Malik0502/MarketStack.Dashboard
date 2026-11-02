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
import { TimeSeriesChart } from './components/charts'
import { DataTable, type Column } from './components/data-table'
import { PriceStatistics } from './components/price-statistics'
import type { PriceRanking } from './types'

export function PricesPage({ selectedProductId, onProductChange }: { selectedProductId?: number; onProductChange: (id: number) => void }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const format = useFormat()
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters()
  const productId = selectedProductId ?? catalog.data?.products[0]?.id
  const load = useCallback((signal: AbortSignal) => analytics.prices({ ...query, productId }, signal), [query, productId])
  const result = useAnalytics(load, `prices:${JSON.stringify(query)}:${productId}`, scenario, validRange(query) && productId !== undefined)
  const data = result.data
  const columns: Column<PriceRanking>[] = [
    { key: 'product', title: t('product'), render: row => <Link to="/prices" search={{ productId: row.productId }} className="font-medium text-primary hover:underline">{row.productName}</Link>, sortValue: row => row.productName },
    { key: 'store', title: t('merchant'), render: row => row.storeName, sortValue: row => row.storeName },
    { key: 'previous', title: t('previous'), render: row => format.money(row.previous), sortValue: row => row.previous, numeric: true },
    { key: 'last', title: t('last'), render: row => format.money(row.last), sortValue: row => row.last, numeric: true },
    { key: 'difference', title: t('change'), render: row => <span className={row.difference > 0 ? 'trend-up' : 'trend-down'}>{format.money(row.difference)}</span>, sortValue: row => row.difference, numeric: true },
    { key: 'percentage', title: t('changePercent'), render: row => row.percentage === null ? t('missing') : format.percent(row.percentage), sortValue: row => row.percentage, numeric: true },
    { key: 'dates', title: t('lastDate'), render: row => <span title={format.date(row.previousAt)}>{format.date(row.lastAt)}</span>, sortValue: row => row.lastAt },
  ]
  return <AnalyticsLayout page="prices" catalog={catalog.data} scenario={scenario} onScenario={setScenario}
    filters={<AnalyticsFilters query={query} update={update} catalog={catalog.data} store />}>
    <ProductPicker value={productId} selectedName={data?.product?.name ?? catalog.data?.products.find(item => item.id === productId)?.name} onChange={onProductChange} />
    <AnalyticsState status={catalog.status === 'loading' ? 'loading' : catalog.status === 'error' ? 'error' : result.status} retry={() => { setScenario('ready'); result.retry(); catalog.retry() }} invalid={!validRange(query)}>
      {data && <div className="space-y-4">
        <AnalyticsNote>{t('historicalNote')}</AnalyticsNote>
        <PriceStatistics stats={data.stats} />
        <DashboardCard title={`${t('priceHistory')}${data.product ? ` · ${data.product.name}` : ''}`}>
          {data.series.length ? <TimeSeriesChart title={t('priceHistory')} format={format.money} series={data.series.map(series => ({ id: series.storeId, label: series.label, points: series.points.map(point => ({ date: point.date, value: point.price })) }))} /> : <EmptyState message={t('insufficient')} />}
          {data.historyTruncated && <p className="mt-3 text-xs text-muted-foreground">{t('truncated')}</p>}
        </DashboardCard>
        <p className="text-[11px] text-muted-foreground">{t('rankingsNote')}</p>
        <div className="space-y-4">
          <DashboardCard title={t('increases')}><DataTable caption={t('increases')} rows={data.increases} columns={columns} rowKey={row => `${row.productId}:${row.storeId}`} /></DashboardCard>
          <DashboardCard title={t('decreases')}><DataTable caption={t('decreases')} rows={data.decreases} columns={columns} rowKey={row => `${row.productId}:${row.storeId}`} /></DashboardCard>
          <DashboardCard title={t('stability')}>
            <p className="mb-4 text-[11px] text-muted-foreground">{t('stabilityNote')}</p>
            <DataTable caption={t('stability')} rows={data.stability} emptyMessage={t('insufficient')} initialSort={{ key: 'cv', direction: 'desc' }} rowKey={row => `${row.productId}:${row.storeId}`}
              columns={[columns[0], columns[1],
                { key: 'count', title: t('observations'), render: row => format.number(row.stats.count), sortValue: row => row.stats.count, numeric: true },
                { key: 'std', title: t('standardDeviation'), render: row => format.money(row.stats.standardDeviation), sortValue: row => row.stats.standardDeviation, numeric: true },
                { key: 'cv', title: t('cv'), render: row => row.stats.coefficientOfVariation === null ? t('missing') : format.percent(row.stats.coefficientOfVariation), sortValue: row => row.stats.coefficientOfVariation, numeric: true },
              ]} />
          </DashboardCard>
        </div>
      </div>}
    </AnalyticsState>
  </AnalyticsLayout>
}
