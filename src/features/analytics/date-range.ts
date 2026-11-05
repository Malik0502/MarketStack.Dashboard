import type { DateRange } from './types'

export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date)
}

export function validRange(query: DateRange) {
  return validDate(query.from) && validDate(query.to) && query.from <= query.to
}
