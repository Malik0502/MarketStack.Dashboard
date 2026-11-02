import type {
  AnalyticsQuery, Catalog, Distribution, HistoricalDifference, MerchantPrice,
  MerchantSummary, PriceRanking, PriceStats, PricesData, ProductDetail, ProductStats,
  ProductsData, ReceiptHighlight, SpendingData, StoresData, TagStats,
} from '../types'
import { coverage, products, receipts, roundMoney, stores, tags, type MockReceipt } from './fixtures'

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const share = (part: number, whole: number) => whole > 0 ? part / whole * 100 : 0
const range = (query: AnalyticsQuery) => ({ from: query.from, to: query.to })
const merchant = (id: string) => stores.find(store => store.id === id)!
const product = (id: number) => products.find(item => item.id === id)!
const hasPromotion = (receipt: MockReceipt) => receipt.items.some(item => item.promotionId !== null)
const lineExpense = (price: number, quantity: number) => roundMoney(price * quantity)

function selectedReceipts(query: AnalyticsQuery) {
  return receipts.filter(receipt => receipt.purchasedAt.slice(0, 10) >= query.from
    && receipt.purchasedAt.slice(0, 10) <= query.to && (!query.storeId || receipt.storeId === query.storeId))
}

function entries(query: AnalyticsQuery) {
  return selectedReceipts(query).flatMap(receipt => receipt.items.map(item => ({
    ...item, receipt, product: product(item.productId), merchant: merchant(receipt.storeId),
    expenses: lineExpense(item.price, item.quantity),
  }))).filter(entry => (!query.tagId || entry.product.tags.some(tag => tag.id === query.tagId))
    && (!query.unit || entry.product.unit === query.unit)
    && (!query.search || entry.product.name.toLowerCase().includes(query.search.toLowerCase())))
}

function summarizeMerchants(query: AnalyticsQuery): MerchantSummary[] {
  const groups = new Map<string, MockReceipt[]>()
  for (const receipt of selectedReceipts(query)) {
    const store = merchant(receipt.storeId)
    const id = query.groupBy === 'chain' ? `chain:${store.chain}` : store.id
    groups.set(id, [...(groups.get(id) ?? []), receipt])
  }
  return [...groups].map(([id, values]) => {
    const store = merchant(values[0].storeId)
    const expenses = roundMoney(sum(values.map(receipt => receipt.gross)))
    const promoted = values.filter(hasPromotion).length
    return {
      id, name: query.groupBy === 'chain' ? store.chain : store.name, chain: store.chain,
      purchases: values.length, expenses, averagePurchase: expenses / values.length,
      positions: sum(values.map(receipt => receipt.items.length)),
      distinctProducts: new Set(values.flatMap(receipt => receipt.items.map(item => item.productId))).size,
      promotionPurchases: promoted, promotionShare: share(promoted, values.length),
    }
  }).sort((a, b) => b.expenses - a.expenses)
}

function allocatedTags(query: AnalyticsQuery): TagStats[] {
  const values = entries(query)
  const total = sum(values.map(value => value.expenses))
  return tags.map(tag => {
    const tagged = values.filter(value => value.product.tags.some(candidate => candidate.id === tag.id))
    const expenses = sum(tagged.map(value => value.expenses / value.product.tags.length))
    return {
      ...tag, products: new Set(tagged.map(value => value.productId)).size,
      purchases: new Set(tagged.map(value => value.receipt.id)).size,
      expenses, share: share(expenses, total),
    }
  }).filter(tag => tag.products > 0).sort((a, b) => b.expenses - a.expenses)
}

function highlight(receipt: MockReceipt | undefined): ReceiptHighlight | null {
  if (!receipt) return null
  const units = new Set(receipt.items.map(item => product(item.productId).unit))
  return {
    id: receipt.id, purchasedAt: receipt.purchasedAt, merchant: merchant(receipt.storeId),
    expenses: receipt.gross, positions: receipt.items.length,
    distinctProducts: new Set(receipt.items.map(item => item.productId)).size,
    quantity: units.size === 1 ? sum(receipt.items.map(item => item.quantity)) : null,
    unit: units.size === 1 ? product(receipt.items[0].productId).unit : null,
  }
}

export function getCatalog(search = ''): Catalog {
  return {
    products: products.filter(item => item.name.toLowerCase().includes(search.toLowerCase())),
    stores, tags, units: ['piece', 'kg'], coverage, hasMore: false, nextCursor: null,
  }
}

export function getSpending(query: AnalyticsQuery): SpendingData {
  const values = selectedReceipts(query)
  const promoted = values.filter(hasPromotion).length
  const start = new Date(`${query.from}T00:00:00Z`)
  const end = new Date(`${query.to}T00:00:00Z`)
  const duration = end.getTime() - start.getTime() + 86400000
  const priorFrom = new Date(start.getTime() - duration).toISOString().slice(0, 10)
  const priorTo = new Date(start.getTime() - 86400000).toISOString().slice(0, 10)
  const previous = priorFrom >= coverage.from && priorTo <= coverage.to
    ? selectedReceipts({ ...query, from: priorFrom, to: priorTo }).length : null
  const frequency: SpendingData['frequency'] = []
  for (let year = start.getUTCFullYear(), month = start.getUTCMonth(); year * 12 + month <= end.getUTCFullYear() * 12 + end.getUTCMonth(); month++) {
    const date = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10)
    const inMonth = values.filter(receipt => receipt.purchasedAt.startsWith(date.slice(0, 7)))
    frequency.push({ month: date, purchases: inMonth.length, promotionPurchases: inMonth.filter(hasPromotion).length })
    // month may exceed 11: Date.UTC intentionally handles integer month indices.
  }
  const pieceReceipts = values.filter(receipt => receipt.items.every(item => product(item.productId).unit === 'piece'))
  const itemValues = entries(query)
  const untagged = sum(itemValues.filter(item => item.product.tags.length === 0).map(item => item.expenses))
  const categories: Distribution[] = allocatedTags(query).map(tag => ({ key: String(tag.id), label: tag.name, expenses: tag.expenses, share: tag.share }))
  if (untagged > 0) categories.push({ key: 'untagged', label: '', expenses: untagged, share: share(untagged, sum(itemValues.map(item => item.expenses))) })
  return {
    range: range(query), categories: categories.sort((a, b) => b.expenses - a.expenses),
    merchants: summarizeMerchants(query),
    weekdays: Array.from({ length: 7 }, (_, index) => {
      const weekday = index + 1
      const group = values.filter(receipt => ((new Date(receipt.purchasedAt).getUTCDay() + 6) % 7 + 1) === weekday)
      return { weekday, purchases: group.length, averageExpense: group.length ? sum(group.map(receipt => receipt.gross)) / group.length : null }
    }),
    frequency, comparison: { current: values.length, previous, change: previous ? (values.length - previous) / previous * 100 : null },
    promotions: { positions: sum(values.map(receipt => receipt.items.filter(item => item.promotionId !== null).length)), purchases: promoted, share: share(promoted, values.length) },
    highlights: {
      expensive: highlight([...values].sort((a, b) => b.gross - a.gross)[0]),
      cheapest: highlight([...values].sort((a, b) => a.gross - b.gross)[0]),
      positions: highlight([...values].sort((a, b) => b.items.length - a.items.length)[0]),
      units: highlight([...pieceReceipts].sort((a, b) => sum(b.items.map(item => item.quantity)) - sum(a.items.map(item => item.quantity)))[0]),
    },
  }
}

export function priceStats(values: { price: number; date: string; id: number }[]): PriceStats | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
  const prices = values.map(value => value.price).sort((a, b) => a - b)
  const average = sum(prices) / prices.length
  const variance = sum(prices.map(value => (value - average) ** 2)) / prices.length
  const middle = Math.floor(prices.length / 2)
  return {
    min: prices[0], max: prices.at(-1)!, average,
    median: prices.length % 2 ? prices[middle] : (prices[middle - 1] + prices[middle]) / 2,
    last: sorted.at(-1)!.price, lastAt: sorted.at(-1)!.date, count: prices.length,
    standardDeviation: Math.sqrt(variance), coefficientOfVariation: average > 0 ? Math.sqrt(variance) / average * 100 : null,
  }
}

function observed(query: AnalyticsQuery) {
  return entries({ ...query, tagId: undefined, unit: undefined, search: undefined })
    .filter(entry => entry.product.comparisonKey !== null && entry.product.unit !== null && entry.quantity > 0 && entry.price >= 0)
    .map(entry => ({ ...entry, date: entry.receipt.purchasedAt }))
}

function rankings(query: AnalyticsQuery): PriceRanking[] {
  const groups = new Map<string, ReturnType<typeof observed>>()
  for (const entry of observed(query)) {
    const key = `${entry.productId}:${entry.merchant.id}:${entry.product.comparisonKey}`
    groups.set(key, [...(groups.get(key) ?? []), entry])
  }
  return [...groups.values()].flatMap(group => {
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id)
    const first = sorted[0], last = sorted.at(-1)!
    if (new Set(group.map(entry => entry.receipt.id)).size < 2 || first.date === last.date) return []
    return [{
      productId: first.productId, productName: first.product.name, comparisonKey: first.product.comparisonKey!,
      storeId: first.merchant.id, storeName: `${first.merchant.chain} · ${first.merchant.name}`,
      previous: first.price, last: last.price, previousAt: first.date, lastAt: last.date,
      difference: roundMoney(last.price - first.price), percentage: first.price > 0 ? (last.price - first.price) / first.price * 100 : null,
      stats: priceStats(group)!,
    }]
  })
}

export function getPrices(query: AnalyticsQuery): PricesData {
  const selected = products.find(item => item.id === query.productId) ?? null
  const values = observed(query).filter(entry => entry.productId === query.productId)
  const grouped = stores.map(store => ({
    storeId: store.id, label: `${store.chain} · ${store.name}`,
    points: values.filter(entry => entry.merchant.id === store.id).sort((a, b) => a.date.localeCompare(b.date)).map(entry => ({ date: entry.date, price: entry.price, count: 1 })),
  })).filter(series => series.points.length)
  const ranks = rankings(query)
  const orderedStability = ranks.filter(item => item.stats.count >= 3 && item.stats.coefficientOfVariation !== null)
    .sort((a, b) => a.stats.coefficientOfVariation! - b.stats.coefficientOfVariation! || a.productId - b.productId || a.storeId.localeCompare(b.storeId))
  const stability = [...new Map([...orderedStability.slice(0, 15), ...orderedStability.slice(-15)]
    .map(item => [`${item.productId}:${item.storeId}`, item])).values()]
    .sort((a, b) => b.stats.coefficientOfVariation! - a.stats.coefficientOfVariation!)
  return {
    range: range(query), product: selected, stats: priceStats(values), series: grouped,
    increases: ranks.filter(item => item.difference > 0).sort((a, b) => (b.percentage ?? -Infinity) - (a.percentage ?? -Infinity)).slice(0, 20),
    decreases: ranks.filter(item => item.difference < 0).sort((a, b) => (a.percentage ?? Infinity) - (b.percentage ?? Infinity)).slice(0, 20),
    stability,
    historyTruncated: false,
  }
}

function allProductStats(query: AnalyticsQuery): ProductStats[] {
  const values = entries(query)
  const total = sum(values.map(value => value.expenses))
  const rows = products.flatMap(item => {
    const group = values.filter(value => value.productId === item.id)
    return group.length ? [{ ...item, purchases: new Set(group.map(value => value.receipt.id)).size,
      quantity: sum(group.map(value => value.quantity)), expenses: roundMoney(sum(group.map(value => value.expenses))),
      share: share(sum(group.map(value => value.expenses)), total), promotionPositions: group.filter(value => value.promotionId !== null).length,
      abc: 'C' as ProductStats['abc'],
    }] : []
  }).sort((a, b) => b.expenses - a.expenses || a.id - b.id)
  let cumulative = 0
  return rows.map(row => {
    const abc = cumulative < 80 ? 'A' : cumulative < 95 ? 'B' : 'C'
    cumulative += row.share
    return { ...row, abc }
  })
}

export function getProducts(query: AnalyticsQuery): ProductsData {
  const rows = allProductStats(query)
  const totalExpenses = roundMoney(sum(rows.map(row => row.expenses)))
  const sort = query.sortBy ?? 'expenses', direction = query.sortDirection === 'asc' ? 1 : -1
  const sorted = [...rows].sort((a, b) => direction * (sort === 'name' ? a.name.localeCompare(b.name) : a[sort] - b[sort]) || a.id - b.id)
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 10))
  const page = Math.max(1, query.page ?? 1)
  let cumulative = 0
  return {
    range: range(query), totalProducts: rows.length, totalExpenses,
    rows: sorted.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalPages: Math.ceil(rows.length / pageSize),
    topExpenses: rows.slice(0, 10), topFrequency: [...rows].sort((a, b) => b.purchases - a.purchases || a.id - b.id).slice(0, 10),
    topPromotions: [...rows].filter(row => row.promotionPositions > 0).sort((a, b) => b.promotionPositions - a.promotionPositions || a.id - b.id).slice(0, 10),
    // Never rank mixed units together. The UI selects one known unit first.
    quantities: query.unit ? [...rows].sort((a, b) => b.quantity - a.quantity).slice(0, 20) : [],
    tags: allocatedTags(query),
    pareto: rows.map(row => { cumulative += row.share; return { productId: row.id, name: row.name, expenses: row.expenses, cumulativeShare: Math.min(100, cumulative), abc: row.abc } }),
    classes: (['A', 'B', 'C'] as const).map(abc => {
      const group = rows.filter(row => row.abc === abc), expenses = sum(group.map(row => row.expenses))
      return { abc, products: group.length, expenses, share: share(expenses, totalExpenses) }
    }),
  }
}

export function getProduct(id: number, query: AnalyticsQuery): ProductDetail {
  const stats = allProductStats(query).find(item => item.id === id) ?? null
  const values = entries(query).filter(entry => entry.productId === id)
  const priceObservations = observed(query).filter(entry => entry.productId === id)
  return {
    product: stats, priceStats: priceStats(priceObservations), recentLimit: 10,
    recentPurchases: values.sort((a, b) => b.receipt.purchasedAt.localeCompare(a.receipt.purchasedAt) || b.id - a.id).slice(0, 10).map(entry => ({
      lineId: entry.id, receiptId: entry.receipt.id, purchasedAt: entry.receipt.purchasedAt, merchant: entry.merchant,
      quantity: entry.quantity, unit: entry.product.unit, unitPrice: entry.price, expenses: entry.expenses,
      promotion: entry.promotionId !== null,
    })),
  }
}

function merchantPrices(query: AnalyticsQuery, productId: number): MerchantPrice[] {
  const values = observed(query).filter(entry => entry.productId === productId)
  return stores.flatMap(store => {
    const group = values.filter(entry => entry.merchant.id === store.id)
    const stats = priceStats(group)
    if (!stats) return []
    const min = [...group].sort((a, b) => a.price - b.price || b.date.localeCompare(a.date))[0]
    return [{ merchant: store, last: stats.last, lastAt: stats.lastAt, average: stats.average, min: stats.min, minAt: min.date, count: stats.count }]
  })
}

export function getStores(query: AnalyticsQuery): StoresData {
  const differences: HistoricalDifference[] = products.flatMap(item => {
    if (!item.comparisonKey) return []
    const prices = merchantPrices({ ...query, storeId: undefined }, item.id).sort((a, b) => a.last - b.last)
    if (prices.length < 2) return []
    const alternative = prices[0], baseline = prices.at(-1)!
    if (baseline.last <= alternative.last) return []
    return [{ productId: item.id, productName: item.name, comparisonKey: item.comparisonKey,
      baseline: baseline.merchant, alternative: alternative.merchant,
      baselinePrice: baseline.last, alternativePrice: alternative.last,
      baselineAt: baseline.lastAt, alternativeAt: alternative.lastAt,
      difference: roundMoney(baseline.last - alternative.last), percentage: baseline.last > 0 ? (baseline.last - alternative.last) / baseline.last * 100 : null,
    }]
  }).sort((a, b) => b.difference - a.difference).slice(0, 20)
  return { range: range(query), merchants: summarizeMerchants(query),
    product: products.find(item => item.id === query.productId) ?? null,
    prices: query.productId ? merchantPrices(query, query.productId) : [], differences,
  }
}
