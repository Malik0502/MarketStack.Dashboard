import type { DateRange } from './types'

export const analyticsPeriods = ['week', 'month', 'ytd', 'year', 'max'] as const
export type AnalyticsPeriod = typeof analyticsPeriods[number]

// Inclusive UTC calendar dates. Rolling periods include today, not an extra day
// at the start. Clamp month/year subtraction before adding that inclusive day.
export function analyticsPeriodRange(period: AnalyticsPeriod, to: string, coverage: DateRange | null = null): DateRange | null {
  const end = new Date(`${to}T00:00:00Z`)
  let start = new Date(end)
  switch (period) {
    case 'week': start.setUTCDate(start.getUTCDate() - 6); break
    case 'month':
    case 'year': {
      const month = end.getUTCMonth() - (period === 'month' ? 1 : 12)
      const lastDay = new Date(Date.UTC(end.getUTCFullYear(), month + 1, 0)).getUTCDate()
      start = new Date(Date.UTC(end.getUTCFullYear(), month, Math.min(end.getUTCDate(), lastDay)))
      start.setUTCDate(start.getUTCDate() + 1)
      break
    }
    case 'ytd': start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1)); break
    case 'max': return coverage && coverage.from <= to ? { from: coverage.from, to } : null
  }
  return { from: start.toISOString().slice(0, 10), to }
}
