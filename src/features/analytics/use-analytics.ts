import { useEffect, useState } from 'react'
import { analyticsSource } from './data-source'
import type { Scenario } from './types'

export function useAnalytics<T>(load: (signal: AbortSignal) => Promise<T>, key: string, scenario: Scenario = 'ready', enabled = true) {
  const [result, setResult] = useState<{ key: string; data: T | null; error: boolean } | null>(null)
  const [revision, setRevision] = useState(0)
  const requestKey = `${key}:${revision}`
  const preview = analyticsSource === 'mock' ? scenario : 'ready'

  useEffect(() => {
    if (!enabled || preview !== 'ready') return
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), 12000)
    let active = true
    load(controller.signal).then(data => {
      if (active) setResult({ key: requestKey, data, error: false })
    }).catch(() => {
      if (active) setResult({ key: requestKey, data: null, error: true })
    }).finally(() => window.clearTimeout(timer))
    return () => { active = false; controller.abort(); window.clearTimeout(timer) }
  }, [load, requestKey, preview, enabled])

  const current = result?.key === requestKey ? result : null
  const status = !enabled ? 'noResults' : preview !== 'ready' ? preview : !current ? 'loading' : current.error ? 'error' : 'ready'
  return {
    data: status === 'ready' ? current?.data ?? null : null,
    status, retry: () => setRevision(value => value + 1), source: analyticsSource,
  }
}
