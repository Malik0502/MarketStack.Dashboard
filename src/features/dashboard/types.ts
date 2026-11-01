import type { MonthlyExpense } from '@/api/objects/dto/monthlyExpense'

export const metricEndpoints = {
  totalExpense: '/expense/total',
  totalTax: '/expense/total-tax',
  expenseChange: '/expense/percentage-change',
  taxChange: '/expense/tax-percentage-change',
  purchases: '/receipt/total',
  averagePurchase: '/receipt/average-purchase-value',
  averageItems: '/receipt/average-items',
  discountShare: '/receipt/discount-share',
} as const

export type MetricKey = keyof typeof metricEndpoints
export type Metrics = Record<MetricKey, number | null>
export interface DashboardData {
  metrics: Metrics
  expenses: MonthlyExpense[] | null
  taxes: MonthlyExpense[] | null
  errors: string[]
  updatedAt: Date | null
}
export type HistoryRange = '6' | '12' | 'all'

// A missing calendar month is different from a recorded month with expense 0.
export interface HistoryPoint {
  purchasedAt: string
  expense: number | null
}
