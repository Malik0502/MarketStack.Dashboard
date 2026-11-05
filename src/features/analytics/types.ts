export type Unit = 'piece' | 'kg'
export type GroupBy = 'store' | 'chain'
export type Scenario = 'ready' | 'loading' | 'empty' | 'error' | 'noResults'
export type AnalyticsStatus = Scenario | 'invalid' | 'disabled'
export interface DateRange { from: string; to: string }
export interface AnalyticsQuery extends DateRange {
  groupBy?: GroupBy; productId?: number; storeId?: string; tagId?: number
  unit?: Unit; search?: string; page?: number; pageSize?: number
  sortBy?: 'expenses' | 'purchases' | 'name'; sortDirection?: 'asc' | 'desc'
}
export interface Tag { id: number; name: string }
export interface Merchant { id: string; name: string; chain: string }
export interface Product {
  id: number; name: string; tags: Tag[]; unit: Unit | null
  packSize: string | null; comparisonKey: string | null
}
export interface Catalog {
  products: Product[]; stores: Merchant[]; tags: Tag[]; units: Unit[]
  coverage: DateRange | null; hasMore: boolean; nextCursor: string | null
}
export interface Distribution { key: string; label: string; expenses: number; share: number }
export interface MerchantSummary extends Merchant {
  purchases: number; expenses: number; averagePurchase: number | null
  positions: number; distinctProducts: number; promotionPurchases: number; promotionShare: number
}
export interface ReceiptHighlight {
  id: number; purchasedAt: string; merchant: Merchant; expenses: number
  positions: number; distinctProducts: number; quantity: number | null; unit: Unit | null
}
export interface SpendingData {
  range: DateRange; categories: Distribution[]; merchants: MerchantSummary[]
  weekdays: { weekday: number; purchases: number; averageExpense: number | null }[]
  frequency: { month: string; purchases: number; promotionPurchases: number }[]
  comparison: { current: number; previous: number | null; change: number | null }
  promotions: { positions: number; purchases: number; share: number }
  highlights: { expensive: ReceiptHighlight | null; cheapest: ReceiptHighlight | null; positions: ReceiptHighlight | null; units: ReceiptHighlight | null }
}
export interface PriceStats {
  min: number; max: number; average: number; median: number; last: number
  lastAt: string; count: number; standardDeviation: number; coefficientOfVariation: number | null
}
export interface PricePoint { date: string; price: number; count: number }
export interface PriceSeries { storeId: string; label: string; points: PricePoint[] }
export interface PriceRanking {
  productId: number; productName: string; comparisonKey: string; storeId: string; storeName: string
  previous: number; last: number; previousAt: string; lastAt: string
  difference: number; percentage: number | null; stats: PriceStats
}
export interface PricesData {
  range: DateRange; product: Product | null; stats: PriceStats | null; series: PriceSeries[]
  increases: PriceRanking[]; decreases: PriceRanking[]; stability: PriceRanking[]
  historyTruncated: boolean
}
export interface ProductStats extends Product {
  purchases: number; quantity: number; expenses: number; share: number
  promotionPositions: number; abc: 'A' | 'B' | 'C'
}
export interface TagStats extends Tag { products: number; purchases: number; expenses: number; share: number }
export interface ParetoPoint { productId: number | null; name: string; expenses: number; cumulativeShare: number; abc: 'A' | 'B' | 'C' | null }
export interface ProductsData {
  range: DateRange; totalProducts: number; totalExpenses: number
  rows: ProductStats[]; page: number; pageSize: number; totalPages: number
  topExpenses: ProductStats[]; topFrequency: ProductStats[]; quantities: ProductStats[]
  topPromotions: ProductStats[]
  tags: TagStats[]; pareto: ParetoPoint[]
  classes: { abc: 'A' | 'B' | 'C'; products: number; expenses: number; share: number }[]
}
export interface ProductPurchase {
  lineId: number; receiptId: number; purchasedAt: string; merchant: Merchant; quantity: number
  unit: Unit | null; unitPrice: number; expenses: number; promotion: boolean
}
export interface ProductDetail {
  product: ProductStats | null; priceStats: PriceStats | null
  // Full matching history; recentLimit is retained as legacy metadata, not a response cap.
  recentPurchases: ProductPurchase[]; recentLimit: number
}
export interface MerchantPrice {
  merchant: Merchant; last: number; lastAt: string; average: number
  min: number; minAt: string; count: number
}
export interface HistoricalDifference {
  productId: number; productName: string; comparisonKey: string
  baseline: Merchant; alternative: Merchant; baselinePrice: number; alternativePrice: number
  baselineAt: string; alternativeAt: string; difference: number; percentage: number | null
}
export interface StoresData {
  range: DateRange; merchants: MerchantSummary[]; product: Product | null
  prices: MerchantPrice[]; differences: HistoricalDifference[]
}
export interface AnalyticsDataSource {
  catalog(search: string, signal: AbortSignal): Promise<Catalog>
  spending(query: AnalyticsQuery, signal: AbortSignal): Promise<SpendingData>
  prices(query: AnalyticsQuery, signal: AbortSignal): Promise<PricesData>
  products(query: AnalyticsQuery, signal: AbortSignal): Promise<ProductsData>
  product(id: number, query: AnalyticsQuery, signal: AbortSignal): Promise<ProductDetail>
  stores(query: AnalyticsQuery, signal: AbortSignal): Promise<StoresData>
}
