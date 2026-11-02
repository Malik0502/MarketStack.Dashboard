import { useCallback, useState } from 'react'
import { analytics, defaultAnalyticsQuery } from './data-source'
import { useAnalytics } from './use-analytics'
import type { AnalyticsQuery, Scenario } from './types'

export function useAnalyticsFilters(initial?: Partial<AnalyticsQuery>) {
  const [query, setQuery] = useState<AnalyticsQuery>(() => ({ ...defaultAnalyticsQuery(), ...initial }))
  const [scenario, setScenario] = useState<Scenario>('ready')
  const catalogLoader = useCallback((signal: AbortSignal) => analytics.catalog('', signal), [])
  const catalog = useAnalytics(catalogLoader, 'catalog')
  const update = (patch: Partial<AnalyticsQuery>) => setQuery(value => ({ ...value, page: 1, ...patch }))
  return { query, update, scenario, setScenario, catalog }
}
