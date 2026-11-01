import { useCallback, useEffect, useState } from 'react'
import { demoData, emptyMetrics, loadDashboard } from './data'
import type { DashboardData } from './types'

const initialData: DashboardData = { metrics: emptyMetrics, expenses: null, taxes: null, errors: [], updatedAt: null }

export function useDashboard() {
  const [liveData, setLiveData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [demo, setDemo] = useState(false)
  const [revision, setRevision] = useState(0)
  const refresh = useCallback(() => { setLoading(true); setRevision(value => value + 1) }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 12000)
    let active = true
    loadDashboard(controller.signal).then(result => {
      if (active) { setLiveData(result); setLoading(false) }
    }).finally(() => window.clearTimeout(timeout))
    return () => { active = false; controller.abort(); window.clearTimeout(timeout) }
  }, [revision])

  return { data: demo ? demoData : liveData, loading: loading && !demo, demo, setDemo, refresh }
}
