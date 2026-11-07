import type { MonthlyExpense } from '@/api/objects/dto/monthlyExpense'

export const metricEndpoints = {
  totalExpense: '/analytics/expense/total',
  totalTax: '/analytics/expense/total-tax',
  expenseChange: '/analytics/expense/percentage-change',
  taxChange: '/analytics/expense/tax-percentage-change',
  purchases: '/analytics/receipt/total',
  averagePurchase: '/analytics/receipt/average-purchase-value',
  averageItems: '/analytics/receipt/average-items',
  discountShare: '/analytics/receipt/discount-share',
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
