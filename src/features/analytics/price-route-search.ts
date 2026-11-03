import { validRange } from './data-source'

export interface PriceFilterSearch { from?: string; to?: string; storeId?: string }

export function parsePriceFilterSearch(search: Record<string, unknown>): PriceFilterSearch {
  const range = typeof search.from === 'string' && typeof search.to === 'string'
    && validRange({ from: search.from, to: search.to }) ? { from: search.from, to: search.to } : {}
  return { ...range, ...(typeof search.storeId === 'string' && search.storeId ? { storeId: search.storeId } : {}) }
}
