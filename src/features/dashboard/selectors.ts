import type { MonthlyExpense } from '@/api/objects/dto/monthlyExpense'
import type { DashboardData, HistoryPoint, HistoryRange } from './types'

function monthIndex(date: string) {
  return Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1
}

function monthDate(index: number) {
  return `${Math.floor(index / 12)}-${String(index % 12 + 1).padStart(2, '0')}-01`
}

/** Fixed ranges include the current local calendar month, independent of data availability.
 * The backend has no date parameters: its full history is aligned client-side.
 * Month arithmetic uses integer indices, never day-based Date.setMonth rollover.
 */
export function selectHistoryWindow(
  data: Pick<DashboardData, 'expenses' | 'taxes'>,
  range: HistoryRange,
  now = new Date(),
) {
  const indices = [...(data.expenses ?? []), ...(data.taxes ?? [])].map(point => monthIndex(point.purchasedAt))
  const currentMonth = now.getFullYear() * 12 + now.getMonth()
  const end = range === 'all' && indices.length ? Math.max(...indices) : currentMonth
  const start = range === 'all' ? (indices.length ? Math.min(...indices) : end + 1) : end - Number(range) + 1
  const months = Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => monthDate(start + index))

  function align(entries: MonthlyExpense[] | null): HistoryPoint[] | null {
    if (entries === null) return null
    const values = new Map(entries.map(point => [point.purchasedAt, point.expense]))
    return months.map(purchasedAt => ({ purchasedAt, expense: values.get(purchasedAt) ?? null }))
  }
  return { months, expenses: align(data.expenses), taxes: align(data.taxes) }
}

export function getMonthlyChange(expenses: MonthlyExpense[] | null): number | null {
  const latest = expenses?.at(-1)
  const previous = expenses?.at(-2)
  if (!latest || !previous || previous.expense === 0 || monthIndex(latest.purchasedAt) - monthIndex(previous.purchasedAt) !== 1) return null
  return (latest.expense - previous.expense) / previous.expense * 100
}
