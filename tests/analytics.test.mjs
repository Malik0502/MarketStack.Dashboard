import { after, afterEach, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createServer } from 'vite'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let server, model, fixtures, source
const originalFetch = globalThis.fetch
const query = { from: '2025-11-01', to: '2026-10-31', productId: 12, groupBy: 'store', page: 1, pageSize: 10 }
const single = { ...query, from: '2026-10-02', to: '2026-10-02' }
const sum = values => values.reduce((total, value) => total + value, 0)
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} != ${expected}`)

before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom',
    cacheDir: 'node_modules/.vite-analytics-tests', optimizeDeps: { noDiscovery: true, include: [] } })
  model = await server.ssrLoadModule('/src/features/analytics/mock/analytics.ts')
  fixtures = await server.ssrLoadModule('/src/features/analytics/mock/fixtures.ts')
  source = await server.ssrLoadModule('/src/features/analytics/data-source.ts')
})
afterEach(() => { globalThis.fetch = originalFetch })
after(async () => { await server?.close() })

test('fixtures cover 24 months, multiple chains/units and receipts with and without promotions', () => {
  assert.equal(new Set(fixtures.receipts.map(row => row.purchasedAt.slice(0, 7))).size, 24)
  assert.equal(new Set(fixtures.stores.map(row => row.chain)).size, 3)
  assert.equal(new Set(fixtures.products.map(row => row.unit)).size, 2)
  assert.ok(fixtures.receipts.some(row => row.items.some(item => item.promotionId)))
  assert.ok(fixtures.receipts.some(row => row.items.every(item => !item.promotionId)))
  assert.ok(new Set(model.getProducts({ ...query, pageSize: 50 }).rows.map(row => row.purchases)).size > 1)
  for (const row of fixtures.receipts) close(row.gross, sum(row.items.map(item => fixtures.roundMoney(item.price * item.quantity))))
})

test('mock projections are deterministic and do not mutate the fixture graph', () => {
  const snapshot = structuredClone({ products: fixtures.products, receipts: fixtures.receipts, stores: fixtures.stores })
  for (const method of ['getSpending', 'getPrices', 'getProducts', 'getStores']) {
    assert.deepEqual(model[method](query), model[method](query))
  }
  model.getProduct(12, query)
  assert.deepEqual({ products: fixtures.products, receipts: fixtures.receipts, stores: fixtures.stores }, snapshot)
})

test('receipt counts, weekly distribution, monthly frequency and merchant totals reconcile', () => {
  const result = model.getSpending(query)
  assert.equal(result.frequency.length, 12)
  assert.deepEqual(result.frequency.map(row => row.month), [...result.frequency.map(row => row.month)].sort())
  assert.equal(sum(result.frequency.map(row => row.purchases)), result.comparison.current)
  assert.equal(sum(result.weekdays.map(row => row.purchases)), result.comparison.current)
  assert.equal(sum(result.merchants.map(row => row.purchases)), result.comparison.current)
  const receipts = fixtures.receipts.filter(row => row.purchasedAt.slice(0, 10) >= query.from && row.purchasedAt.slice(0, 10) <= query.to)
  close(sum(result.merchants.map(row => row.expenses)), sum(receipts.map(row => row.gross)))
})

test('multi-tag values are allocated once and untagged spending remains visible', () => {
  const spending = model.getSpending(query), products = model.getProducts({ ...query, pageSize: 50 })
  close(sum(spending.categories.map(row => row.expenses)), products.totalExpenses)
  close(sum(spending.categories.map(row => row.share)), 100)
  assert.ok(spending.categories.some(row => row.key === 'untagged' && row.expenses > 0))
  const tag = model.getProducts({ ...query, tagId: 4, pageSize: 50 })
  assert.ok(tag.rows.every(row => row.tags.some(item => item.id === 4)))
  assert.ok(tag.tags.some(row => row.id === 2)) // Coffee has two tags; both retain their allocation.
})

test('promotion metrics count positions and distinct receipts, never purchased units', () => {
  const result = model.getSpending(query)
  const receipts = fixtures.receipts.filter(row => row.purchasedAt.slice(0, 10) >= query.from && row.purchasedAt.slice(0, 10) <= query.to)
  const promoted = receipts.flatMap(row => row.items.filter(item => item.promotionId))
  assert.equal(result.promotions.positions, promoted.length)
  assert.equal(result.promotions.purchases, receipts.filter(row => row.items.some(item => item.promotionId)).length)
  close(result.promotions.share, result.promotions.purchases / receipts.length * 100)
  assert.notEqual(result.promotions.positions, sum(promoted.map(item => item.quantity)))
})

test('notable receipts distinguish line count, product count and comparable piece quantities', () => {
  const result = model.getSpending(query)
  assert.ok(result.highlights.expensive.expenses >= result.highlights.cheapest.expenses)
  const maxLines = result.highlights.positions
  assert.equal(maxLines.positions, fixtures.receipts.find(row => row.id === maxLines.id).items.length)
  const units = result.highlights.units, receipt = fixtures.receipts.find(row => row.id === units.id)
  assert.equal(units.unit, 'piece')
  assert.ok(receipt.items.every(item => fixtures.products.find(product => product.id === item.productId).unit === 'piece'))
  close(units.quantity, sum(receipt.items.map(item => item.quantity)))
})

test('date filters include the complete UTC end date and preserve real zero denominators', () => {
  const one = model.getSpending(single)
  assert.equal(one.comparison.current, 1)
  assert.equal(one.comparison.previous, 0)
  assert.equal(one.comparison.change, null)
  assert.equal(one.weekdays.find(row => row.purchases).weekday, 5)
  assert.equal(one.weekdays.filter(row => !row.purchases).every(row => row.averageExpense === null), true)
  const earliest = model.getSpending({ ...query, from: fixtures.coverage.from })
  assert.equal(earliest.comparison.previous, null)
  for (const date of ['2026-02-30', 'invalid', '']) assert.equal(source.validRange({ ...query, from: date }), false)
  assert.equal(source.validRange({ ...query, from: '2026-11-01', to: '2026-10-01' }), false)
  assert.equal(source.validRange({ ...query, from: '2000-01-01' }), true) // Max must include older imported data too.
  assert.equal(source.validRange({ ...query, from: '2024-02-29' }), true)
})

test('analytics period presets use inclusive UTC days, calendar boundaries and complete coverage', async () => {
  const { analyticsPeriods, analyticsPeriodRange } = await server.ssrLoadModule('/src/features/analytics/date-periods.ts')
  assert.deepEqual(analyticsPeriods, ['week', 'month', 'ytd', 'year', 'max'])
  const end = '2026-11-03'
  assert.deepEqual(analyticsPeriodRange('week', end), { from: '2026-10-28', to: end })
  assert.deepEqual(analyticsPeriodRange('month', end), { from: '2026-10-04', to: end })
  assert.deepEqual(analyticsPeriodRange('ytd', end), { from: '2026-01-01', to: end })
  assert.deepEqual(analyticsPeriodRange('year', end), { from: '2025-11-04', to: end })
  assert.deepEqual(analyticsPeriodRange('month', '2026-03-31'), { from: '2026-03-01', to: '2026-03-31' })
  assert.deepEqual(analyticsPeriodRange('month', '2024-03-31'), { from: '2024-03-01', to: '2024-03-31' })
  assert.deepEqual(analyticsPeriodRange('year', '2024-02-29'), { from: '2023-03-01', to: '2024-02-29' })
  assert.deepEqual(analyticsPeriodRange('week', '2026-01-01'), { from: '2025-12-26', to: '2026-01-01' })
  assert.deepEqual(analyticsPeriodRange('ytd', '2026-01-01'), { from: '2026-01-01', to: '2026-01-01' })
  assert.equal(analyticsPeriodRange('max', end), null)
  assert.equal(analyticsPeriodRange('max', end, { from: '2027-01-01', to: '2027-01-31' }), null)
  const max = analyticsPeriodRange('max', end, { from: '2000-01-01', to: '2026-10-01' })
  assert.deepEqual(max, { from: '2000-01-01', to: end })
  assert.ok(source.validRange(max))
  assert.deepEqual(analyticsPeriodRange('max', fixtures.coverage.to, fixtures.coverage), fixtures.coverage)
  const defaults = source.defaultAnalyticsQuery()
  assert.deepEqual({ from: defaults.from, to: defaults.to }, analyticsPeriodRange('year', source.analyticsReferenceDate()))
  for (const language of ['de', 'en', 'fr', 'tr']) {
    const resources = JSON.parse(await readFile(new URL(`../src/i18n/locales/${language}/dashboard.json`, import.meta.url), 'utf8')).analytics.period
    assert.ok(resources.label.length)
    for (const period of analyticsPeriods) {
      assert.ok(resources[period].short.length)
      assert.ok(resources[period].label.length)
    }
  }
})

test('compact filter bar starts collapsed with a localized summary and persistent controls', async () => {
  const { default: i18n } = await server.ssrLoadModule('/src/i18n/index.ts')
  const { AnalyticsFilters, StoreFilter } = await server.ssrLoadModule('/src/features/analytics/components/filters.tsx')
  const previousLanguage = i18n.language
  try {
    for (const language of ['de', 'en', 'fr', 'tr']) {
      await i18n.changeLanguage(language)
      const html = renderToStaticMarkup(createElement(AnalyticsFilters, {
        query: { ...query, storeId: 'north-centre' }, update: () => {}, catalog: model.getCatalog(), activeExtras: 1,
        children: createElement(StoreFilter, { query: { ...query, storeId: 'north-centre' }, update: () => {}, catalog: model.getCatalog() }),
      }))
      assert.match(html, /<details[^>]*analytics-sticky-filters/)
      assert.doesNotMatch(html, /<details[^>]*\sopen(?:[=>\s])/)
      const summary = html.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)[1]
      assert.ok(summary.includes({ de: 'Filter', en: 'Filters', fr: 'Filtres', tr: 'Filtreler' }[language]))
      assert.ok(summary.includes({ de: '1J', en: '1Y', fr: '1A', tr: '1Y' }[language]))
      assert.ok(summary.includes({ de: 'Ein zusätzlicher Filter aktiv', en: 'One additional filter active', fr: 'Un filtre supplémentaire actif', tr: 'Bir ek filtre etkin' }[language]))
      assert.ok(!summary.includes('<select'))
      const panelId = html.match(/aria-controls="([^"]+)"/)[1]
      assert.ok(html.includes(`id="${panelId}"`))
      assert.equal([...html.matchAll(/aria-pressed=/g)].length, 5)
      assert.ok(html.includes('<select'))
    }
  } finally { await i18n.changeLanguage(previousLanguage) }
})

test('product details, purchase counts and rankings describe the same complete data', () => {
  const result = model.getProducts({ ...query, pageSize: 50 })
  for (const row of result.rows) {
    const detail = model.getProduct(row.id, query)
    assert.deepEqual(detail.product, row)
    const raw = fixtures.receipts.filter(receipt => receipt.purchasedAt.slice(0, 10) >= query.from && receipt.purchasedAt.slice(0, 10) <= query.to)
      .filter(receipt => receipt.items.some(item => item.productId === row.id))
    assert.equal(row.purchases, new Set(raw.map(receipt => receipt.id)).size)
    assert.equal(detail.recentPurchases.length, raw.flatMap(receipt => receipt.items.filter(item => item.productId === row.id)).length)
    assert.equal(new Set(detail.recentPurchases.map(item => item.lineId)).size, detail.recentPurchases.length)
    close(detail.priceStats.count, model.getPrices({ ...query, productId: row.id }).stats.count)
    const observations = raw.flatMap(receipt => receipt.items.filter(item => item.productId === row.id))
    assert.equal(detail.priceStats.count, observations.length)
    close(detail.priceStats.average, sum(observations.map(item => item.price)) / observations.length)
  }
})

test('local table pagination reaches every row, clamps pages and supports showing all', async () => {
  const { paginateRows } = await server.ssrLoadModule('/src/features/analytics/table-pagination.ts')
  const rows = Array.from({ length: 57 }, (_, index) => ({ id: index + 1 }))
  const snapshot = structuredClone(rows)
  const visited = Array.from({ length: 6 }, (_, index) => paginateRows(rows, index + 1, 10).rows).flat()
  assert.deepEqual(visited, rows)
  assert.deepEqual(rows, snapshot)
  assert.equal(paginateRows(rows, 999, 10).page, 6)
  assert.equal(paginateRows(rows, -1, 10).page, 1)
  assert.deepEqual(paginateRows(rows, 1, 0).rows, rows)
  assert.equal(paginateRows(rows, 1, 25).totalPages, 3)
  assert.equal(paginateRows(rows, 6, 10).from, 51)
  assert.equal(paginateRows(rows, 6, 10).to, 57)
  assert.equal(paginateRows([], 10, 10).from, 0)
  assert.equal(paginateRows([], 10, 10).to, 0)
  // Sorting the full collection before pagination must expose its global extremes.
  assert.equal(paginateRows([...rows].reverse(), 1, 10).rows[0].id, 57)
})

test('table sources no longer truncate price rankings, historical differences or purchase history', () => {
  const productCount = fixtures.products.length, receiptCount = fixtures.receipts.length
  try {
    // Exceed all previous ranking limits, independently of the normal fixture size.
    for (let index = 0; index < 30; index++) {
      const id = 1000 + index
      fixtures.products.push({ ...fixtures.products[0], id, name: `Pagination ${id}`, comparisonKey: `TEST-${id}` })
      for (let storeIndex = 0; storeIndex < 2; storeIndex++) {
        for (let observation = 0; observation < 3; observation++) {
          const receiptId = 10000 + index * 10 + storeIndex * 3 + observation
          const price = storeIndex === 0 ? 2 + observation : 5 - observation
          fixtures.receipts.push({ id: receiptId, purchasedAt: `2026-01-0${observation + 1}T10:00:00.000Z`, storeId: fixtures.stores[storeIndex].id,
            gross: price, items: [{ id: receiptId, productId: id, quantity: 1, price, promotionId: null }] })
        }
      }
    }
    const prices = model.getPrices(query), stores = model.getStores(query)
    assert.equal(prices.increases.filter(row => row.productId >= 1000).length, 30)
    assert.equal(prices.decreases.filter(row => row.productId >= 1000).length, 30)
    assert.equal(prices.stability.filter(row => row.productId >= 1000).length, 60)
    assert.equal(stores.differences.filter(row => row.productId >= 1000).length, 30)
    const detail = model.getProduct(12, query)
    assert.ok(detail.recentPurchases.length > 10)
  } finally {
    fixtures.products.splice(productCount)
    fixtures.receipts.splice(receiptCount)
  }
})

test('pagination and sorting do not recalculate ABC classes, shares or global promotion rankings', () => {
  const first = model.getProducts({ ...query, pageSize: 3 })
  const second = model.getProducts({ ...query, pageSize: 3, page: 2, sortBy: 'name', sortDirection: 'asc' })
  assert.deepEqual(first.pareto, second.pareto)
  assert.deepEqual(first.classes, second.classes)
  assert.deepEqual(first.topPromotions, second.topPromotions)
  close(sum(first.classes.map(row => row.expenses)), first.totalExpenses)
  close(first.pareto.at(-1).cumulativeShare, 100)
  for (let index = 1; index < first.pareto.length; index++) assert.ok(first.pareto[index].cumulativeShare >= first.pareto[index - 1].cumulativeShare)
})

test('quantity ranking requires a homogeneous verified unit and tag filters do not duplicate totals', () => {
  assert.deepEqual(model.getProducts(query).quantities, [])
  for (const unit of ['piece', 'kg']) {
    const result = model.getProducts({ ...query, unit, pageSize: 50 })
    assert.ok(result.quantities.length > 0)
    assert.ok(result.rows.every(row => row.unit === unit))
    assert.ok(result.quantities.every(row => row.unit === unit))
    for (let index = 1; index < result.quantities.length; index++) assert.ok(result.quantities[index].quantity <= result.quantities[index - 1].quantity)
  }
})

test('price statistics handle empty, single, even-count and zero-mean observation sets', () => {
  const points = prices => prices.map((price, index) => ({ price, date: `2026-01-${String(index + 1).padStart(2, '0')}T10:00:00Z`, id: index }))
  assert.equal(model.priceStats([]), null)
  assert.equal(model.priceStats(points([2])).standardDeviation, 0)
  const result = model.priceStats(points([1, 2, 3, 4]))
  assert.equal(result.median, 2.5)
  assert.equal(result.average, 2.5)
  close(result.standardDeviation, Math.sqrt(1.25))
  assert.equal(result.last, 4)
  assert.equal(model.priceStats(points([0, 0])).coefficientOfVariation, null)
})

test('product price navigation preserves valid date/store context and rejects malformed date ranges', async () => {
  const { parsePriceFilterSearch } = await server.ssrLoadModule('/src/features/analytics/price-route-search.ts')
  assert.deepEqual(parsePriceFilterSearch({ from: query.from, to: query.to, storeId: 'north-centre', unknown: 'ignored' }),
    { from: query.from, to: query.to, storeId: 'north-centre' })
  assert.deepEqual(parsePriceFilterSearch({ from: '2026-02-30', to: query.to }), {})
  assert.deepEqual(parsePriceFilterSearch({ from: query.to, to: query.from }), {})
  assert.deepEqual(parsePriceFilterSearch({ from: query.from, storeId: 12 }), {})
  assert.deepEqual(parsePriceFilterSearch({ storeId: '' }), {})
})

test('price product selection affects only the individual analysis, while period/store filters remain global', () => {
  const first = model.getPrices({ ...query, productId: 1 })
  const second = model.getPrices({ ...query, productId: 2 })
  assert.notDeepEqual(first.product, second.product)
  assert.notDeepEqual(first.series, second.series)
  for (const key of ['increases', 'decreases', 'stability']) assert.deepEqual(first[key], second[key])
  const storeId = fixtures.stores[0].id
  const filtered = model.getPrices({ ...query, productId: 1, storeId })
  assert.ok(filtered.series.every(row => row.storeId === storeId))
  for (const key of ['increases', 'decreases', 'stability']) {
    assert.ok(filtered[key].every(row => row.storeId === storeId))
  }
})

test('price changes remain within verified product/branch groups and stability has sufficient observations', () => {
  const result = model.getPrices(query)
  assert.ok(result.increases.length && result.decreases.length && result.stability.length)
  for (const row of [...result.increases, ...result.decreases]) {
    assert.equal(row.comparisonKey, fixtures.products.find(product => product.id === row.productId).comparisonKey)
    assert.ok(row.previousAt < row.lastAt)
    close(row.difference, fixtures.roundMoney(row.last - row.previous))
    if (row.previous > 0) close(row.percentage, (row.last - row.previous) / row.previous * 100)
  }
  assert.ok(result.stability.every(row => row.stats.count >= 3 && row.stats.coefficientOfVariation !== null))
  const allStability = fixtures.stores.flatMap(store => model.getPrices({ ...query, storeId: store.id }).stability)
    .sort((a, b) => a.stats.coefficientOfVariation - b.stats.coefficientOfVariation)
  for (const extreme of [allStability[0], allStability.at(-1)]) {
    assert.ok(result.stability.some(row => row.productId === extreme.productId && row.storeId === extreme.storeId))
  }
  assert.ok(result.increases.every(row => row.difference > 0))
  assert.ok(result.decreases.every(row => row.difference < 0))
  const filtered = model.getPrices({ ...query, storeId: fixtures.stores[0].id })
  assert.ok(filtered.series.every(row => row.storeId === fixtures.stores[0].id))
  assert.ok(filtered.increases.every(row => row.storeId === fixtures.stores[0].id))
})

test('store and chain groupings reconcile receipts without summing distinct product counts', () => {
  const store = model.getStores(query), chain = model.getStores({ ...query, groupBy: 'chain' })
  close(sum(store.merchants.map(row => row.expenses)), sum(chain.merchants.map(row => row.expenses)))
  assert.equal(sum(store.merchants.map(row => row.purchases)), sum(chain.merchants.map(row => row.purchases)))
  assert.equal(store.merchants.length, 4)
  assert.equal(chain.merchants.length, 3)
  for (const row of chain.merchants) {
    close(row.averagePurchase, row.expenses / row.purchases)
    assert.ok(row.distinctProducts <= sum(store.merchants.filter(item => item.chain === row.chain).map(item => item.distinctProducts)))
  }
})

test('historical gaps contain observed prices/dates, positive differences and verified pack identity', () => {
  const result = model.getStores(query)
  assert.ok(result.differences.length > 0)
  for (const row of result.differences) {
    assert.notEqual(row.baseline.id, row.alternative.id)
    assert.ok(row.comparisonKey)
    assert.ok(row.difference > 0)
    close(row.difference, fixtures.roundMoney(row.baselinePrice - row.alternativePrice))
    close(row.percentage, (row.baselinePrice - row.alternativePrice) / row.baselinePrice * 100)
    assert.ok(Date.parse(row.baselineAt) && Date.parse(row.alternativeAt))
  }
})

test('unknown units or unverified identities never create price comparisons', () => {
  const product = fixtures.products[0], original = { unit: product.unit, comparisonKey: product.comparisonKey }
  try {
    for (const patch of [{ unit: null, comparisonKey: original.comparisonKey }, { unit: original.unit, comparisonKey: null }]) {
      Object.assign(product, patch)
      const price = model.getPrices({ ...query, productId: product.id })
      assert.equal(price.stats, null)
      assert.deepEqual(price.series, [])
      assert.ok(price.increases.every(row => row.productId !== product.id))
      assert.ok(model.getStores(query).differences.every(row => row.productId !== product.id))
      const detail = model.getProduct(product.id, query)
      assert.ok(detail.product.purchases > 0)
      assert.ok(detail.recentPurchases.length > 0)
      assert.equal(detail.priceStats, null)
    }
  } finally { Object.assign(product, original) }
})

test('empty filters and unknown selections produce explicit empty results without fabricated observations', () => {
  const empty = { ...query, from: '2027-01-01', to: '2027-01-31' }
  assert.equal(model.getSpending(empty).highlights.expensive, null)
  assert.equal(model.getProducts(empty).totalProducts, 0)
  assert.equal(model.getPrices(empty).stats, null)
  assert.deepEqual(model.getStores(empty).differences, [])
  assert.equal(model.getProduct(999, query).product, null)
  assert.deepEqual(model.getCatalog('no-such-product').products, [])
})

test('API adapter sends only endpoint-specific filters and never falls back silently', async () => {
  let called
  globalThis.fetch = async (url, options) => {
    called = { url: new URL(url), signal: options.signal }
    return new Response(JSON.stringify({ success: true, data: model.getPrices(query) }))
  }
  const controller = new AbortController()
  const result = await source.apiAnalytics.prices({ ...query, tagId: 1, search: 'ignored', page: 2 }, controller.signal)
  assert.equal(called.url.pathname, '/api/analytics/prices')
  assert.deepEqual([...called.url.searchParams.keys()].sort(), ['from', 'to', 'productId'].sort())
  assert.equal(called.signal, controller.signal)
  assert.deepEqual(result, model.getPrices(query))
  globalThis.fetch = async () => new Response('<html>error</html>', { status: 500 })
  await assert.rejects(source.apiAnalytics.prices(query, controller.signal))
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, data: {} }))
  await assert.rejects(source.apiAnalytics.prices(query, controller.signal))
  controller.abort()
  await assert.rejects(source.mockAnalytics.products(query, controller.signal))
})

test('tag search and deletion handle large catalogs without changing fixture data', async () => {
  const { findTags, removeTag } = await server.ssrLoadModule('/src/features/admin/tags.ts')
  const catalog = { tags: Array.from({ length: 100 }, (_, id) => ({ id, name: `Tag ${id}` })), products: [{ id: 1, name: 'Milk', tagIds: [1, 99] }, { id: 2, name: 'Tea', tagIds: [1] }] }
  const before = structuredClone(catalog)
  assert.deepEqual(findTags(catalog.tags, '  TAG 99 '), [{ id: 99, name: 'Tag 99' }])
  assert.deepEqual(removeTag(catalog, 1).products.map(product => product.tagIds), [[99], []])
  assert.equal(removeTag(catalog, 1).tags.length, 99)
  assert.deepEqual(catalog, before)
})

const schema = JSON.parse(await readFile(new URL('../docs/analytics-api.schema.json', import.meta.url), 'utf8'))
function validate(value, rule, path = '$') {
  if (rule.$ref) return validate(value, schema.$defs[rule.$ref.split('/').at(-1)], path)
  if (rule.anyOf) {
    const valid = rule.anyOf.some(candidate => { try { validate(value, candidate, path); return true } catch { return false } })
    assert.ok(valid, `${path}: no matching schema`)
  }
  if ('const' in rule) assert.equal(value, rule.const, path)
  if (rule.enum) assert.ok(rule.enum.includes(value), `${path}: enum`)
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type]
    assert.ok(types.some(type => type === 'null' ? value === null : type === 'array' ? Array.isArray(value) : type === 'integer' ? Number.isInteger(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : typeof value === type), `${path}: type`)
  }
  if (typeof value === 'number') {
    assert.ok(Number.isFinite(value), path)
    if (rule.minimum !== undefined) assert.ok(value >= rule.minimum, path)
    if (rule.maximum !== undefined) assert.ok(value <= rule.maximum, path)
  }
  if (typeof value === 'string' && rule.pattern) assert.match(value, new RegExp(rule.pattern), path)
  if (typeof value === 'string' && rule.format) assert.ok(Number.isFinite(Date.parse(value)), `${path}: date`)
  if (Array.isArray(value) && rule.items) value.forEach((item, index) => validate(item, rule.items, `${path}[${index}]`))
  if (value && typeof value === 'object' && !Array.isArray(value) && rule.properties) {
    for (const key of rule.required ?? []) assert.ok(key in value, `${path}.${key}: required`)
    for (const [key, entry] of Object.entries(value)) {
      if (rule.additionalProperties === false) assert.ok(key in rule.properties, `${path}.${key}: unexpected`)
      if (rule.properties[key]) validate(entry, rule.properties[key], `${path}.${key}`)
    }
  }
}

test('all mock DTOs satisfy the complete documented JSON schemas, including empty results', () => {
  const methods = { Catalog: () => model.getCatalog(), SpendingData: model.getSpending, PricesData: model.getPrices,
    ProductsData: model.getProducts, ProductDetail: q => model.getProduct(12, q), StoresData: model.getStores }
  for (const [name, method] of Object.entries(methods)) {
    for (const q of [query, single, { ...query, from: '2027-01-01', to: '2027-01-31' }]) validate(method(q), schema.$defs[name], name)
  }
})

test('documented schemas declare exactly the fields of each frontend DTO, including inherited fields', async () => {
  const file = ts.createSourceFile('types.ts', await readFile(new URL('../src/features/analytics/types.ts', import.meta.url), 'utf8'), ts.ScriptTarget.Latest, true)
  const interfaces = new Map(file.statements.filter(ts.isInterfaceDeclaration).map(node => [node.name.text, node]))
  const fields = name => {
    const node = interfaces.get(name)
    const parents = (node.heritageClauses ?? []).flatMap(clause => clause.types.flatMap(type => fields(type.expression.getText(file))))
    return [...parents, ...node.members.map(member => member.name.getText(file))]
  }
  for (const name of ['DateRange', 'Tag', 'Merchant', 'Product', 'Catalog', 'Distribution', 'MerchantSummary', 'ReceiptHighlight', 'SpendingData', 'PriceStats', 'PricePoint', 'PriceSeries', 'PriceRanking', 'PricesData', 'ProductStats', 'TagStats', 'ParetoPoint', 'ProductsData', 'ProductPurchase', 'ProductDetail', 'MerchantPrice', 'HistoricalDifference', 'StoresData']) {
    assert.deepEqual(Object.keys(schema.$defs[name].properties).sort(), fields(name).sort(), name)
  }
})

test('analytics card explanations cover every wired topic in all four languages', async () => {
  const pages = await Promise.all(['spending', 'products', 'prices'].map(page => readFile(new URL(`../src/features/analytics/${page}-page.tsx`, import.meta.url), 'utf8')))
  const topics = pages.flatMap(page => [...page.matchAll(/<CardInfo topic="([^"]+)"/g)].map(match => match[1]))
  assert.deepEqual([...topics].sort(), ['frequency', 'topExpenses', 'topFrequency', 'totalProducts', 'itemExpenses', 'abcOverview', 'pareto', 'promotionProducts', 'tags', 'quantities', 'stability'].sort())
  for (const language of ['de', 'en', 'fr', 'tr']) {
    const resources = JSON.parse(await readFile(new URL(`../src/i18n/locales/${language}/dashboard.json`, import.meta.url), 'utf8')).analytics
    for (const key of ['open', 'close', 'calculation']) assert.ok(resources.cardInfo[key].length > 0)
    assert.ok(resources.cardInfo.open.includes('{{title}}'))
    for (const count of [1, 8]) {
      const label = resources.abcDisplay[count === 1 ? 'products_one' : 'products_other']
      assert.ok(label.includes('{{value}}'))
    }
    assert.ok(resources.abcDisplay.share.includes('{{value}}'))
    for (const topic of topics) {
      assert.equal(typeof resources[topic], 'string')
      for (const field of ['description', 'calculation', 'note']) {
        assert.ok(resources.cardInfo[topic][field].length > 40, `${language}: ${topic}.${field}`)
      }
    }
  }
})

test('API implementation guide orders pages, lists shared dependencies and resolves schema links', async () => {
  const text = await readFile(new URL('../docs/analytics-api-requirements.md', import.meta.url), 'utf8')
  const phases = [...text.matchAll(/^## (\d)\. (.+)$/gm)]
  assert.deepEqual(phases.map(match => match[0]), ['## 0. Administration: tags', '## 1. Spending', '## 2. Prices', '## 3. Products', '## 4. Stores'])
  const admin = text.slice(phases[0].index, phases[1].index)
  assert.ok(admin.includes('POST /api/admin/tags'))
  assert.ok(admin.includes('PUT /api/admin/products/{id}/tags'))
  phases.shift()
  const endpoints = ['spending', 'prices', 'products', 'stores']
  for (let index = 0; index < phases.length; index++) {
    const section = text.slice(phases[index].index, phases[index + 1]?.index ?? text.indexOf('## Shared transport'))
    assert.ok(section.includes('GET /api/analytics/catalog'), endpoints[index])
    assert.ok(section.includes(`GET /api/analytics/${endpoints[index]}`), endpoints[index])
    assert.ok(section.includes('- [ ]'), endpoints[index])
    if (index === 2) assert.ok(section.includes('GET /api/analytics/products/{id}'))
  }
  const links = [...text.matchAll(/\]\(analytics-api\.schema\.json#(\/[^)]+)\)/g)]
  assert.ok(links.length > 50)
  for (const [, pointer] of links) {
    let target = schema
    for (const segment of pointer.slice(1).split('/')) {
      const key = decodeURIComponent(segment).replace(/~1/g, '/').replace(/~0/g, '~')
      assert.ok(target && Object.hasOwn(target, key), pointer)
      target = target[key]
    }
  }
})

test('every endpoint example in the central API document validates and matches the deterministic mock source', async () => {
  const text = await readFile(new URL('../docs/analytics-api-requirements.md', import.meta.url), 'utf8')
  const examples = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)].map(match => JSON.parse(match[1]))
  const names = new Set()
  for (const example of examples) {
    if (example.success === false) { validate(example, schema.$defs.FailureEnvelope); continue }
    if (example.data && !Object.keys(example.data).length) continue // Envelope illustration only.
    if (!example.data) {
      const name = 'baseline' in example ? 'HistoricalDifference' : 'PriceRanking'
      validate(example, schema.$defs[name])
      assert.deepEqual(example, name === 'HistoricalDifference' ? model.getStores(query).differences[0] : model.getPrices(query).increases[0])
      continue
    }
    const value = example.data
    let name, expected
    if ('coverage' in value) { name = 'Catalog'; expected = model.getCatalog('Milk') }
    else if ('comparison' in value) { name = 'SpendingData'; expected = model.getSpending(single) }
    else if ('topExpenses' in value) { name = 'ProductsData'; expected = model.getProducts({ ...single, search: 'Dark', sortBy: 'expenses', sortDirection: 'desc' }) }
    else if ('recentPurchases' in value) { name = 'ProductDetail'; expected = model.getProduct(12, single) }
    else if ('differences' in value) { name = 'StoresData'; expected = model.getStores(single) }
    else { name = 'PricesData'; expected = model.getPrices(single) }
    names.add(name)
    validate(value, schema.$defs[name])
    assert.deepEqual(value, expected, name)
  }
  assert.equal(names.size, 6)
})
