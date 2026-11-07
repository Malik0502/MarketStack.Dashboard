import { apiFetch } from '@/api/apiClient'
import type { MonthlyExpense } from '@/api/objects/dto/monthlyExpense'
import { metricEndpoints, type DashboardData, type Metrics } from './types'

export const emptyMetrics: Metrics = {
  totalExpense: null, totalTax: null, expenseChange: null, taxChange: null,
  purchases: null, averagePurchase: null, averageItems: null, discountShare: null,
}

async function readData<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  const response = await apiFetch<T>(endpoint, { signal })
  if (!response.success || response.data == null) throw new Error(endpoint)
  return response.data
}

export function normalizeHistory(data: Record<string, MonthlyExpense>): MonthlyExpense[] {
  const values = Object.values(data)
  if (values.some(value => !/^\d{4}-(0[1-9]|1[0-2])-01$/.test(value.purchasedAt) || !Number.isFinite(value.expense))) {
    throw new Error('Ungültiger Monatsverlauf')
  }
  return values.map(value => ({ ...value })).sort((a, b) => a.purchasedAt.localeCompare(b.purchasedAt))
}

export async function loadDashboard(signal: AbortSignal): Promise<DashboardData> {
  const metrics = { ...emptyMetrics }
  const errors: string[] = []
  const jobs = Object.entries(metricEndpoints).map(async ([key, endpoint]) => {
    try {
      const value = await readData<number>(endpoint, signal)
      if (!Number.isFinite(value)) throw new Error(endpoint)
      metrics[key as keyof Metrics] = value
    } catch { errors.push(endpoint) }
  })
  const history = async (endpoint: string) => {
    try { return normalizeHistory(await readData<Record<string, MonthlyExpense>>(endpoint, signal)) }
    catch { errors.push(endpoint); return null }
  }
  const [expenses, taxes] = await Promise.all([
    history('/analytics/expense/history'), history('/analytics/expense/tax-history'), Promise.all(jobs),
  ])
  return { metrics, expenses, taxes, errors, updatedAt: errors.length === 10 ? null : new Date() }
}

// Explicit, opt-in fixture. Never merged with live API responses.
export const demoData: DashboardData = {
  metrics: {
    totalExpense: 4826.35, totalTax: 421.86, expenseChange: 1.8, taxChange: 1.6,
    purchases: 126, averagePurchase: 38.3, averageItems: 12.4, discountShare: 27.8,
  },
  expenses: [356.8, 412.5, 378.2, 465.9, 398.4, 441.2, 386.75, 498.6, 527.4, 462.6, 498].map((expense, index) => ({
    purchasedAt: `2026-${String(index + 1).padStart(2, '0')}-01`, expense,
  })),
  taxes: [30.12, 35.6, 32.4, 40.8, 34.6, 38.9, 33.2, 43.5, 46.8, 40.14, 45.8].map((expense, index) => ({
    purchasedAt: `2026-${String(index + 1).padStart(2, '0')}-01`, expense,
  })),
  errors: [], updatedAt: null,
}
