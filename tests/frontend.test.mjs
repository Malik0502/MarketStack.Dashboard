import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'

let server, url, cacheModule, charts, validation, model, preferences
before(async () => {
  server = await createServer({ cacheDir: 'node_modules/.vite-frontend-tests', server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  url = await server.ssrLoadModule('/src/lib/url-state.ts')
  cacheModule = await server.ssrLoadModule('/src/features/analytics/resource-cache.ts')
  charts = await server.ssrLoadModule('/src/features/analytics/chart-model.ts')
  validation = await server.ssrLoadModule('/src/features/analytics/validate-payload.ts')
  model = await server.ssrLoadModule('/src/features/analytics/mock/analytics.ts')
  preferences = await server.ssrLoadModule('/src/lib/preferences.ts')
})
after(async () => { await server?.close() })
const flush = () => new Promise(resolve => setImmediate(resolve))

test('URL state retains valid filters and independently named tables, rejecting malformed values', () => {
  const result = url.parseFrontendSearch({ from: '2024-02-29', to: '2026-10-31', groupBy: 'chain', productId: '3', tagId: '2', unit: 'kg', page: '2', range: 'all', series: 'taxes',
    tables: { 'price-increases': { page: 2, pageSize: 0, sort: 'last', direction: 'asc' }, 'price-decreases': { page: 3, pageSize: 25 } } })
  assert.equal(result.from, '2024-02-29')
  assert.equal(result.productId, 3)
  assert.equal(result.tables['price-increases'].pageSize, 0)
  assert.equal(result.tables['price-decreases'].page, 3)
  assert.deepEqual(url.parseFrontendSearch({ from: '2026-02-30', to: '2026-01-01', productId: true, page: -2, storeId: {}, groupBy: 'other', unit: 'g', range: 'bad', series: 'bad', tables: [] }), {})
  assert.equal(url.parseFrontendSearch({ tables: { valid: { pageSize: null, page: Infinity } } }).tables.valid.pageSize, undefined)
})

test('shared cache deduplicates requests and retains fresh results after releasing consumers', async () => {
  const cache = cacheModule.createResourceCache()
  let calls = 0, resolve
  const loader = () => { calls++; return new Promise(done => { resolve = done }) }
  const first = cache.acquire('catalog:', loader), second = cache.acquire('catalog:', loader)
  await flush()
  assert.equal(calls, 1)
  first(); resolve({ products: [] }); await flush()
  assert.equal(cache.snapshot('catalog:').status, 'ready')
  second()
  const third = cache.acquire('catalog:', loader)
  await flush()
  assert.equal(calls, 1)
  third(); cache.clear()
})

test('cache cancels the last abandoned request and ignores a stale completion after retry', async () => {
  const cache = cacheModule.createResourceCache()
  let signal, resolveOld
  const release = cache.acquire('race', input => { signal = input; return new Promise(resolve => { resolveOld = resolve }) })
  await flush()
  cache.refresh('race', async () => 'new')
  await flush()
  assert.equal(signal.aborted, true)
  resolveOld('old'); await flush()
  assert.equal(cache.snapshot('race').data, 'new')
  release()
  let abandoned
  const leave = cache.acquire('abandoned', input => { abandoned = input; return new Promise(() => {}) })
  await flush(); leave(); await flush()
  assert.equal(abandoned.aborted, true)
  assert.equal(cache.snapshot('abandoned').status, 'loading')
  cache.clear()
})

test('cache retries failures and survives immediate StrictMode-style reacquisition', async () => {
  const cache = cacheModule.createResourceCache()
  let calls = 0
  const loader = async () => { calls++; throw new Error('offline') }
  const first = cache.acquire('failure', loader); first()
  const second = cache.acquire('failure', loader)
  await flush()
  assert.equal(calls, 1)
  assert.equal(cache.snapshot('failure').status, 'error')
  cache.refresh('failure', async () => 0); await flush()
  assert.equal(cache.snapshot('failure').data, 0)
  second(); cache.clear()
})

test('runtime validation accepts every complete documented mock DTO and rejects nested corruption', () => {
  const query = { from: '2025-01-01', to: '2026-10-31', productId: 1 }
  const values = { catalog: model.getCatalog(), spending: model.getSpending(query), prices: model.getPrices(query), products: model.getProducts(query), product: model.getProduct(1, query), stores: model.getStores(query) }
  for (const [resource, value] of Object.entries(values)) assert.doesNotThrow(() => validation.assertPayload(resource, value))
  const badCatalog = structuredClone(values.catalog); badCatalog.products[0].tags = [{ id: 1, name: 7 }]
  assert.throws(() => validation.assertPayload('catalog', badCatalog))
  const badPrice = structuredClone(values.prices); badPrice.series[0].points[0].date = '2026-02-30T10:00:00Z'
  assert.throws(() => validation.assertPayload('prices', badPrice))
  badPrice.series[0].points[0].date = '2026-01-01T24:00:00Z'
  assert.throws(() => validation.assertPayload('prices', badPrice))
  const nonFinite = structuredClone(values.products); nonFinite.rows[0].expenses = Infinity
  assert.throws(() => validation.assertPayload('products', nonFinite))
  const missing = structuredClone(values.product); delete missing.recentPurchases[0].merchant
  assert.throws(() => validation.assertPayload('product', missing))
})

test('API URL configuration accepts deployment paths and rejects malformed or credential-bearing origins', async () => {
  const { resolveApiUrl } = await server.ssrLoadModule('/src/common/config/constants.ts')
  assert.equal(resolveApiUrl('/api/'), '/api')
  assert.equal(resolveApiUrl(undefined), 'https://localhost:7065/api')
  assert.equal(resolveApiUrl('https://example.test/api///'), 'https://example.test/api')
  for (const value of ['', '//example.test/api', 'javascript:alert(1)', 'https://', 'https://user:secret@example.test/api', '/api?token=secret']) assert.throws(() => resolveApiUrl(value))
})

test('expired cache entries revalidate on acquisition without polling', async () => {
  const cache = cacheModule.createResourceCache()
  const original = Date.now
  let now = original(), calls = 0
  Date.now = () => now
  try {
    const load = async () => ++calls
    const release = cache.acquire('catalog:', load); await flush(); release()
    now += 300001
    assert.equal(calls, 1)
    const second = cache.acquire('catalog:', load); await flush()
    assert.equal(calls, 2)
    assert.equal(cache.snapshot('catalog:').data, 2)
    second()
  } finally { Date.now = original; cache.clear() }
})

test('render sampling preserves extrema and endpoints without changing the original data', () => {
  const data = Array.from({ length: 10000 }, (_, index) => ({ index, value: Math.sin(index) }))
  data[5678].value = 1000; data[4321].value = -1000
  const copy = structuredClone(data), sampled = charts.sampleExtrema(data, point => point.value)
  assert.ok(sampled.length <= 600)
  assert.equal(sampled[0], data[0]); assert.equal(sampled.at(-1), data.at(-1))
  assert.ok(sampled.includes(data[5678])); assert.ok(sampled.includes(data[4321]))
  assert.deepEqual(data, copy)
  assert.equal(charts.nearestIndex([{ time: 1 }, { time: 10 }, { time: 100 }], 12, point => point.time), 1)
  assert.equal(charts.chartKeyIndex('End', 0, data.length), 9999)
  assert.equal(charts.chartKeyIndex('ArrowLeft', 0, 10), 0)
})

test('language negotiation checks the full preference list and mock reference date is independent of fixture initialization', async () => {
  assert.equal(preferences.preferredLanguage(['es-ES', 'tr-TR', 'en-GB']), 'tr')
  assert.equal(preferences.preferredLanguage(['es']), 'de')
  const { analyticsReferenceDate } = await server.ssrLoadModule('/src/features/analytics/data-source.ts')
  const { coverage } = await server.ssrLoadModule('/src/features/analytics/mock/fixtures.ts')
  assert.equal(analyticsReferenceDate(), coverage.to)
})
