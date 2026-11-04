import { EmptyState } from '@/features/dashboard/components/dashboard-card'

export function BarList({ rows, format, onSelect }: {
  rows: { id: string | number; label: string; value: number; detail?: string }[]
  format: (value: number) => string; onSelect?: (id: string | number) => void
}) {
  if (!rows.length) return <EmptyState />
  const max = Math.max(1, ...rows.map(row => row.value))
  return <ul className="space-y-4">{rows.map(row => <li key={row.id}>
    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
      {onSelect ? <button className="min-w-0 text-left font-medium underline-offset-4 hover:text-primary hover:underline" onClick={() => onSelect(row.id)}>{row.label}</button> : <span className="min-w-0 font-medium">{row.label}</span>}
      <span className="shrink-0 font-medium tabular-nums">{format(row.value)}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-[var(--chart-expense)]" style={{ width: `${Math.max(0, row.value / max * 100)}%` }} /></div>
    {row.detail && <p className="mt-1 text-xs text-muted-foreground tabular-nums">{row.detail}</p>}
  </li>)}</ul>
}
