import { useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { EmptyState } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'

export interface Column<T> {
  key: string; title: string; render: (row: T) => ReactNode
  sortValue?: (row: T) => number | string | null; numeric?: boolean
}

export function DataTable<T>({ rows, columns, rowKey, caption, initialSort, emptyMessage }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string | number; caption: string
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  emptyMessage?: string
}) {
  const [sort, setSort] = useState(initialSort)
  const { locale } = useFormat()
  if (!rows.length) return <EmptyState message={emptyMessage} />
  const column = columns.find(candidate => candidate.key === sort?.key)
  const sorted = column?.sortValue && sort ? [...rows].sort((a, b) => {
    const first = column.sortValue!(a), second = column.sortValue!(b)
    if (first === null || second === null) return first === second ? 0 : first === null ? 1 : -1
    const value = typeof first === 'number' && typeof second === 'number' ? first - second : String(first).localeCompare(String(second), locale)
    return sort.direction === 'asc' ? value : -value
  }) : rows
  return <div className="max-h-[460px] overflow-auto">
    <table className="w-full min-w-[520px] text-left text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky top-0 z-10 bg-card"><tr className="border-b text-[10px] tracking-wider text-muted-foreground uppercase">
        {columns.map(item => <th key={item.key} scope="col" className={`px-2 pb-3 font-medium ${item.numeric ? 'text-right' : ''}`}
          aria-sort={sort?.key === item.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
          {item.sortValue ? <button className={`inline-flex min-h-8 items-center gap-1 ${item.numeric ? 'justify-end' : ''}`} onClick={() => setSort({ key: item.key, direction: sort?.key === item.key && sort.direction === 'desc' ? 'asc' : 'desc' })}>
            {item.title}{sort?.key === item.key ? sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3" />}
          </button> : item.title}
        </th>)}
      </tr></thead>
      <tbody>{sorted.map(row => <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-muted/40">
        {columns.map(item => <td key={item.key} className={`px-2 py-3.5 ${item.numeric ? 'text-right tabular-nums' : ''}`}>{item.render(row)}</td>)}
      </tr>)}</tbody>
    </table>
  </div>
}
