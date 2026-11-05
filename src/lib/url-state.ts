import { validRange } from '@/features/analytics/date-range'
import type { AnalyticsQuery } from '@/features/analytics/types'

export interface TableState {
  page?: number; pageSize?: number; sort?: string; direction?: 'asc' | 'desc'
}
export interface FrontendSearch extends Partial<AnalyticsQuery> {
  range?: '6' | '12' | 'all'; series?: 'expenses' | 'taxes'
  tables?: Record<string, TableState>
}

const positive = (value: unknown) => {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) return undefined
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? number : undefined
}

export function parseFrontendSearch(search: Record<string, unknown>): FrontendSearch {
  const result: FrontendSearch = {}
  if (typeof search.from === 'string' && typeof search.to === 'string' && validRange({ from: search.from, to: search.to })) {
    result.from = search.from; result.to = search.to
  }
  if (search.groupBy === 'chain' || search.groupBy === 'store') result.groupBy = search.groupBy
  if (typeof search.storeId === 'string' && search.storeId.length <= 200 && search.storeId) result.storeId = search.storeId
  if (positive(search.productId)) result.productId = positive(search.productId)
  if (positive(search.tagId)) result.tagId = positive(search.tagId)
  if (positive(search.page)) result.page = positive(search.page)
  if (positive(search.pageSize) && Number(search.pageSize) <= 50) result.pageSize = positive(search.pageSize)
  if (search.unit === 'piece' || search.unit === 'kg') result.unit = search.unit
  if (search.sortBy === 'expenses' || search.sortBy === 'purchases' || search.sortBy === 'name') result.sortBy = search.sortBy
  if (search.sortDirection === 'asc' || search.sortDirection === 'desc') result.sortDirection = search.sortDirection
  if (search.range === '6' || search.range === '12' || search.range === 'all') result.range = search.range
  if (search.series === 'expenses' || search.series === 'taxes') result.series = search.series
  if (search.tables && typeof search.tables === 'object' && !Array.isArray(search.tables)) {
    const tables: Record<string, TableState> = {}
    for (const [key, value] of Object.entries(search.tables).slice(0, 30)) {
      if (!/^[a-z][a-z0-9-]{0,63}$/.test(key) || !value || typeof value !== 'object' || Array.isArray(value)) continue
      const input = value as Record<string, unknown>, table: TableState = {}
      if (positive(input.page)) table.page = positive(input.page)
      if ((typeof input.pageSize === 'number' || typeof input.pageSize === 'string') && [0, 10, 25, 50].includes(Number(input.pageSize))) table.pageSize = Number(input.pageSize)
      if (typeof input.sort === 'string' && /^[a-zA-Z][\w-]{0,63}$/.test(input.sort)) table.sort = input.sort
      if (input.direction === 'asc' || input.direction === 'desc') table.direction = input.direction
      tables[key] = table
    }
    if (Object.keys(tables).length) result.tables = tables
  }
  return result
}
