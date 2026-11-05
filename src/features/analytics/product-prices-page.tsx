import { useCallback } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { addTransitionType, startTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { analytics, analyticsKey, validRange } from './data-source'
import { useAnalytics } from './use-analytics'
import { useAnalyticsFilters } from './use-filters'
import { AnalyticsFilters, StoreFilter } from './components/filters'
import { AnalyticsLayout, AnalyticsState } from './components/analytics-layout'
import { ProductPriceAnalysis } from './components/product-price-analysis'

export function ProductPricesPage({ productId }: { productId: number }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const navigate = useNavigate()
  const { query, update, catalog, scenario, setScenario } = useAnalyticsFilters()
  const load = useCallback((signal: AbortSignal) => analytics.prices({ ...query, productId }, signal), [query, productId])
  const result = useAnalytics(load, analyticsKey('prices', { ...query, productId }), scenario, validRange(query))
  const productName = result.data?.product?.name ?? catalog.data?.products.find(product => product.id === productId)?.name
    ?? t('priceProduct.fallbackName', { id: productId })
  return <AnalyticsLayout page="prices" title={t('priceProduct.title', { product: productName })} sharedIdentity={Boolean(result.data?.product)}
    loading={result.status === 'loading' || catalog.status === 'loading'}
    description={t('priceProduct.description')} scenario={scenario} onScenario={setScenario}
    filters={<AnalyticsFilters query={query} update={update} catalog={catalog.data} activeExtras={Number(Boolean(query.storeId))}><StoreFilter query={query} update={update} catalog={catalog.data} /></AnalyticsFilters>}>
    <Link to="/prices" search={{ productId, from: query.from, to: query.to, storeId: query.storeId }}
      onClick={event => {
        if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
        event.preventDefault()
        startTransition(() => { addTransitionType('nav-back'); void navigate({ to: '/prices', search: { productId, from: query.from, to: query.to, storeId: query.storeId }, viewTransition: { types: ['nav-back'] } }) })
      }}
      className="mb-5 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-medium text-primary hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <ArrowLeft className="size-4" aria-hidden="true" />{t('priceProduct.back')}
    </Link>
    <AnalyticsState status={!validRange(query) ? 'invalid' : catalog.status === 'error' ? 'error' : result.status}
      retry={() => { setScenario('ready'); result.retry(); catalog.retry() }}>
      {result.data && <ProductPriceAnalysis data={result.data} />}
    </AnalyticsState>
  </AnalyticsLayout>
}
