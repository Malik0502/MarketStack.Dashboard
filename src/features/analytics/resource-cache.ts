export type ResourceSnapshot<T> = { status: 'loading' | 'ready' | 'error'; data: T | null }
type Loader<T> = (signal: AbortSignal) => Promise<T>
interface Entry {
  snapshot: ResourceSnapshot<unknown>; listeners: Set<() => void>; users: number
  expires: number; controller?: AbortController; generation: number
}

export function createResourceCache(maxEntries = 100) {
  const entries = new Map<string, Entry>()
  function entry(key: string) {
    let value = entries.get(key)
    if (!value) {
      // Never evict an active request or subscribed resource.
      if (entries.size >= maxEntries) {
        for (const [id, candidate] of entries) {
          if (!candidate.users && !candidate.listeners.size) { candidate.controller?.abort(); entries.delete(id); break }
        }
      }
      value = { snapshot: { status: 'loading', data: null }, listeners: new Set(), users: 0, expires: 0, generation: 0 }
      entries.set(key, value)
    }
    return value
  }
  function publish(value: Entry, snapshot: ResourceSnapshot<unknown>) {
    value.snapshot = snapshot
    value.listeners.forEach(listener => listener())
  }
  function start<T>(key: string, load: Loader<T>, force = false) {
    const value = entry(key)
    if (!force && (value.controller || (value.snapshot.status === 'ready' && value.expires > Date.now()))) return
    value.controller?.abort()
    const controller = new AbortController(), generation = ++value.generation
    value.controller = controller
    publish(value, { status: 'loading', data: null })
    const timer = setTimeout(() => controller.abort(), 12000)
    const aborted = () => rejectAbort?.(new DOMException('Aborted', 'AbortError'))
    let rejectAbort: ((reason: Error) => void) | undefined
    const cancellation = new Promise<never>((_, reject) => { rejectAbort = reject })
    controller.signal.addEventListener('abort', aborted, { once: true })
    void Promise.race([Promise.resolve().then(() => { controller.signal.throwIfAborted(); return load(controller.signal) }), cancellation]).then(data => {
      if (value.generation !== generation) return
      value.expires = Date.now() + (key.startsWith('catalog:') ? 300000 : 60000)
      publish(value, { status: 'ready', data })
    }, () => {
      if (value.generation === generation) publish(value, { status: value.users ? 'error' : 'loading', data: null })
    }).finally(() => {
      clearTimeout(timer)
      controller.signal.removeEventListener('abort', aborted)
      if (value.generation === generation) value.controller = undefined
    })
  }
  return {
    snapshot: <T>(key: string) => entry(key).snapshot as ResourceSnapshot<T>,
    subscribe(key: string, listener: () => void) {
      const value = entry(key)
      value.listeners.add(listener)
      return () => { value.listeners.delete(listener) }
    },
    acquire<T>(key: string, load: Loader<T>) {
      const value = entry(key)
      value.users++
      start(key, load)
      return () => {
        value.users--
        // React StrictMode can immediately subscribe again; retain that shared request.
        queueMicrotask(() => {
          if (!value.users && value.controller) {
            value.generation++
            value.controller.abort(); value.controller = undefined
            publish(value, { status: 'loading', data: null })
          }
        })
      }
    },
    refresh: <T>(key: string, load: Loader<T>) => start(key, load, true),
    prefetch: <T>(key: string, load: Loader<T>) => start(key, load),
    clear() { entries.forEach(value => value.controller?.abort()); entries.clear() },
  }
}

export const analyticsCache = createResourceCache()
