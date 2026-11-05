// Rendering budgets never alter the source observations used by statistics or tables.
export function sampleExtrema<T>(items: readonly T[], value: (item: T) => number, budget = 600): T[] {
  if (items.length <= budget) return [...items]
  const indices = new Set([0, items.length - 1])
  const buckets = Math.max(1, Math.floor((budget - 2) / 2))
  for (let bucket = 0; bucket < buckets; bucket++) {
    const start = 1 + Math.floor(bucket * (items.length - 2) / buckets)
    const end = 1 + Math.floor((bucket + 1) * (items.length - 2) / buckets)
    let minimum = start, maximum = start
    for (let index = start + 1; index < end; index++) {
      if (value(items[index]) < value(items[minimum])) minimum = index
      if (value(items[index]) > value(items[maximum])) maximum = index
    }
    indices.add(minimum); indices.add(maximum)
  }
  return [...indices].sort((a, b) => a - b).map(index => items[index])
}

export function nearestIndex<T>(items: readonly T[], target: number, value: (item: T) => number) {
  let low = 0, high = items.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (value(items[middle]) < target) low = middle + 1
    else high = middle
  }
  if (!low) return 0
  if (low === items.length) return items.length - 1
  return target - value(items[low - 1]) <= value(items[low]) - target ? low - 1 : low
}

export function chartKeyIndex(key: string, current: number, length: number) {
  if (key === 'Home') return 0
  if (key === 'End') return length - 1
  if (key === 'ArrowLeft' || key === 'ArrowDown') return Math.max(0, current - 1)
  if (key === 'ArrowRight' || key === 'ArrowUp') return Math.min(length - 1, current + 1)
  return null
}
