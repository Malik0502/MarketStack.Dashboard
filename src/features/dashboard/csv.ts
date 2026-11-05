import type { HistoryPoint } from './types'

export function buildHistoryCsv(
  months: string[], expenses: HistoryPoint[] | null, taxes: HistoryPoint[] | null,
  headers: [string, string, string], formatNumber: (value: number) => string,
) {
  const format = (value: number | null | undefined) => value == null ? '' : formatNumber(value)
  const escape = (value: string) => /[;"\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
  const expenseByDate = new Map(expenses?.map(point => [point.purchasedAt, point.expense]))
  const taxByDate = new Map(taxes?.map(point => [point.purchasedAt, point.expense]))
  const rows = [headers, ...months.map(date => [
    date,
    format(expenseByDate.get(date)),
    format(taxByDate.get(date)),
  ])]
  return '\uFEFF' + rows.map(row => row.map(escape).join(';')).join('\r\n')
}
