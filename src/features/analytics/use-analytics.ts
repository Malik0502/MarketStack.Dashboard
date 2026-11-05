import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { analyticsSource } from './data-source'
import { analyticsCache } from './resource-cache'
import type { AnalyticsStatus, Scenario } from './types'

export function useAnalytics<T>(load: (signal: AbortSignal) => Promise<T>, key: string, scenario: Scenario = 'ready', enabled = true) {
  const preview = analyticsSource === 'mock' ? scenario : 'ready'
  const subscribe = useCallback((listener: () => void) => enabled && preview === 'ready' ? analyticsCache.subscribe(key, listener) : () => {}, [key, enabled, preview])
  const snapshot = useCallback(() => analyticsCache.snapshot<T>(key), [key])
  const result = useSyncExternalStore(subscribe, snapshot, snapshot)
  useEffect(() => {
    if (!enabled || preview !== 'ready') return
    return analyticsCache.acquire(key, load)
  }, [load, key, preview, enabled])
  const status: AnalyticsStatus = !enabled ? 'disabled' : preview !== 'ready' ? preview : result.status
  return {
    data: status === 'ready' ? result.data : null,
    status, retry: () => analyticsCache.refresh(key, load), source: analyticsSource,
  }
}
