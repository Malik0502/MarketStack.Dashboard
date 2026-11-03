import { apiFetch } from '@/api/apiClient'
import type { AnalyticsDataSource, AnalyticsQuery } from './types'
import * as mock from './mock/analytics'
import { coverage } from './mock/fixtures'
import { analyticsPeriodRange } from './date-periods'

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

function assertPayload(resource: Resource, value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('Invalid analytics response')
  const record = value as Record<string, unknown>
  const arrays: Record<Resource, string[]> = {
    catalog: ['products', 'stores', 'tags', 'units'], spending: ['categories', 'merchants', 'weekdays', 'frequency'],
    prices: ['series', 'increases', 'decreases', 'stability'],
    products: ['rows', 'topExpenses', 'topFrequency', 'topPromotions', 'quantities', 'tags', 'pareto', 'classes'],
    product: ['recentPurchases'], stores: ['merchants', 'prices', 'differences'],
  }
  if (arrays[resource].some(key => !Array.isArray(record[key]))) throw new Error('Invalid analytics arrays')
  if (resource === 'spending' && (!record.comparison || !record.promotions || !record.highlights)) throw new Error('Missing spending aggregates')
  if (resource === 'products' && (!Number.isFinite(record.totalProducts) || !Number.isFinite(record.totalExpenses))) throw new Error('Invalid product totals')
}

async function request<T>(resource: Resource, path: string, query: object, signal: AbortSignal): Promise<T> {
  const result = await apiFetch<T>(`${path}?${queryString(query)}`, { signal })
  if (!result.success || result.data == null) throw new Error('Analytics request failed')
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

function mockResult<T>(create: () => T, signal: AbortSignal): Promise<T> {
  return Promise.resolve().then(() => {
    signal.throwIfAborted()
    return create()
  })
}

export const mockAnalytics: AnalyticsDataSource = {
  catalog: (search, signal) => mockResult(() => mock.getCatalog(search), signal),
  spending: (query, signal) => mockResult(() => mock.getSpending(query), signal),
  prices: (query, signal) => mockResult(() => mock.getPrices(query), signal),
  products: (query, signal) => mockResult(() => mock.getProducts(query), signal),
  product: (id, query, signal) => mockResult(() => mock.getProduct(id, query), signal),
  stores: (query, signal) => mockResult(() => mock.getStores(query), signal),
}

export const analytics: AnalyticsDataSource = analyticsSource === 'api' ? apiAnalytics : mockAnalytics

export function analyticsReferenceDate(): string {
  return analyticsSource === 'mock' ? coverage.to : new Date().toISOString().slice(0, 10)
}

export function defaultAnalyticsQuery(): AnalyticsQuery {
  const range = analyticsPeriodRange('year', analyticsReferenceDate())!
  return { ...range, groupBy: 'store', page: 1, pageSize: 10, sortBy: 'expenses', sortDirection: 'desc' }
}

export function validRange(query: AnalyticsQuery) {
  const validDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)
    && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date)
  return validDate(query.from) && validDate(query.to) && query.from <= query.to
}
