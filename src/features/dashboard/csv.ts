import type { HistoryPoint } from './types'

export function buildHistoryCsv(
  months: string[], expenses: HistoryPoint[] | null, taxes: HistoryPoint[] | null,
  headers: [string, string, string], formatNumber: (value: number) => string,
) {
  const format = (value: number | null | undefined) => value == null ? '' : formatNumber(value)
  const escape = (value: string) => /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
  const rows = [headers, ...months.map(date => [
    date,
    format(expenses?.find(point => point.purchasedAt === date)?.expense),
    format(taxes?.find(point => point.purchasedAt === date)?.expense),
  ])]
  return '\uFEFF' + rows.map(row => row.map(escape).join(';')).join('\r\n')
}
