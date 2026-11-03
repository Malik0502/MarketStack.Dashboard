import { useCallback } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { analytics, validRange } from './data-source'
import { useAnalytics } from './use-analytics'
import { useAnalyticsFilters } from './use-filters'
import { AnalyticsFilters } from './components/filters'
import { AnalyticsLayout, AnalyticsState } from './components/analytics-layout'
import { ProductPriceAnalysis } from './components/product-price-analysis'
import type { PriceFilterSearch } from './price-route-search'

export function ProductPricesPage({ productId, initialFilters }: { productId: number; initialFilters: PriceFilterSearch }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters(initialFilters)
  const load = useCallback((signal: AbortSignal) => analytics.prices({ ...query, productId }, signal), [query, productId])
  const result = useAnalytics(load, `product-prices:${productId}:${JSON.stringify(query)}`, scenario, validRange(query))
  const productName = result.data?.product?.name ?? catalog.data?.products.find(product => product.id === productId)?.name
    ?? t('priceProduct.fallbackName', { id: productId })
  return <AnalyticsLayout page="prices" title={t('priceProduct.title', { product: productName })}
    loading={result.status === 'loading' || catalog.status === 'loading'}
    description={t('priceProduct.description')} scenario={scenario} onScenario={setScenario}
    filters={<AnalyticsFilters query={query} update={update} catalog={catalog.data} store />}>
    <Link to="/prices" search={{ productId, from: query.from, to: query.to, storeId: query.storeId }}
      className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <ArrowLeft className="size-4" aria-hidden="true" />{t('priceProduct.back')}
    </Link>
    <AnalyticsState status={catalog.status === 'error' ? 'error' : result.status} invalid={!validRange(query)}
      retry={() => { setScenario('ready'); result.retry(); catalog.retry() }}>
      {result.data && <ProductPriceAnalysis data={result.data} />}
    </AnalyticsState>
  </AnalyticsLayout>
}
