import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { analytics, defaultAnalyticsQuery } from './data-source'
import { useAnalytics } from './use-analytics'
import type { AnalyticsQuery, Scenario } from './types'

export function useAnalyticsFilters() {
  const search = useSearch({ from: '__root__', structuralSharing: true, select: search => {
    const { from, to, groupBy, productId, storeId, tagId, unit, page, pageSize, sortBy, sortDirection } = search
    return { from, to, groupBy, productId, storeId, tagId, unit, page, pageSize, sortBy, sortDirection }
  } })
  const navigate = useNavigate()
  const query = useMemo<AnalyticsQuery>(() => {
    return { ...defaultAnalyticsQuery(), ...Object.fromEntries(Object.entries(search).filter(([, value]) => value !== undefined)) }
  }, [search])
  const [scenario, setScenario] = useState<Scenario>('ready')
  const catalogLoader = useCallback((signal: AbortSignal) => analytics.catalog('', signal), [])
  const catalog = useAnalytics(catalogLoader, 'catalog:')
  const update = useCallback((patch: Partial<AnalyticsQuery>) => void navigate({ to: '.', resetScroll: false, viewTransition: false,
    search: previous => ({ ...previous, ...patch, page: patch.page ?? 1, tables: undefined }),
  }), [navigate])
  return { query, update, scenario, setScenario, catalog }
}
