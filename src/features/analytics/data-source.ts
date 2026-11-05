import { apiFetch } from '@/api/apiClient'
import type { AnalyticsDataSource, AnalyticsQuery } from './types'
import { analyticsPeriodRange } from './date-periods'
import { assertPayload } from './validate-payload'
export { validRange } from './date-range'

// This flag affects only new analytics pages. Existing Home services are independent.
export const analyticsSource = import.meta.env.VITE_ANALYTICS_SOURCE === 'api' ? 'api' : 'mock'

function queryString(query: object) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value))
  return params.toString()
}

type Resource = 'catalog' | 'spending' | 'prices' | 'products' | 'product' | 'stores'

export function analyticsParams(resource: Resource, query: AnalyticsQuery): object {
  const common = { from: query.from, to: query.to }
  switch (resource) {
    case 'spending': return { ...common, groupBy: query.groupBy }
    case 'prices': return { ...common, productId: query.productId, storeId: query.storeId }
    case 'products': return { ...common, tagId: query.tagId, unit: query.unit, search: query.search, page: query.page, pageSize: query.pageSize, sortBy: query.sortBy, sortDirection: query.sortDirection }
    case 'product': return { ...common, tagId: query.tagId, unit: query.unit, search: query.search }
    case 'stores': return { ...common, groupBy: query.groupBy, productId: query.productId }
    default: return {}
  }
}

export function analyticsKey(resource: Resource, query: AnalyticsQuery, productId?: number) {
  return `${resource}:${productId ?? ''}:${JSON.stringify(analyticsParams(resource, query))}`
}

async function request<T>(resource: Resource, path: string, query: object, signal: AbortSignal): Promise<T> {
  const result = await apiFetch<T>(`${path}?${queryString(query)}`, { signal })
  if (result.success !== true || result.data == null) throw new Error('Analytics request failed')
  assertPayload(resource, result.data)
  return result.data
}

export const apiAnalytics: AnalyticsDataSource = {
  catalog: (search, signal) => request('catalog', '/analytics/catalog', { search, limit: 50 }, signal),
  spending: (query, signal) => request('spending', '/analytics/spending', analyticsParams('spending', query), signal),
  prices: (query, signal) => request('prices', '/analytics/prices', analyticsParams('prices', query), signal),
  products: (query, signal) => request('products', '/analytics/products', analyticsParams('products', query), signal),
  product: (id, query, signal) => request('product', `/analytics/products/${id}`, analyticsParams('product', query), signal),
  stores: (query, signal) => request('stores', '/analytics/stores', analyticsParams('stores', query), signal),
}

async function mockResult<T>(create: (mock: typeof import('./mock/analytics')) => T, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  const mock = await import('./mock/analytics')
  signal.throwIfAborted()
  return create(mock)
}

export const mockAnalytics: AnalyticsDataSource = {
  catalog: (search, signal) => mockResult(mock => mock.getCatalog(search), signal),
  spending: (query, signal) => mockResult(mock => mock.getSpending(query), signal),
  prices: (query, signal) => mockResult(mock => mock.getPrices(query), signal),
  products: (query, signal) => mockResult(mock => mock.getProducts(query), signal),
  product: (id, query, signal) => mockResult(mock => mock.getProduct(id, query), signal),
  stores: (query, signal) => mockResult(mock => mock.getStores(query), signal),
}

export const analytics: AnalyticsDataSource = import.meta.env.VITE_ANALYTICS_SOURCE === 'api' ? apiAnalytics : mockAnalytics

export function analyticsReferenceDate(): string {
  // Kept independent of side-effectful mock initialization; checked against fixtures in tests.
  return import.meta.env.VITE_ANALYTICS_SOURCE === 'api' ? new Date().toISOString().slice(0, 10) : '2026-10-31'
}

export function defaultAnalyticsQuery(): AnalyticsQuery {
  const range = analyticsPeriodRange('year', analyticsReferenceDate())!
  return { ...range, groupBy: 'store', page: 1, pageSize: 10, sortBy: 'expenses', sortDirection: 'desc' }
}
