import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { EmptyState } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'
import { Button } from '@/Components/ui/button'
import { paginateRows } from '../table-pagination'

export interface Column<T> {
  key: string; title: string; render: (row: T) => ReactNode
  sortValue?: (row: T) => number | string | null; numeric?: boolean
}

export function DataTable<T>({ rows, columns, rowKey, caption, initialSort, emptyMessage, paginate = true, resetKey = '' }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string | number; caption: string
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  emptyMessage?: string
  paginate?: boolean; resetKey?: string
}) {
  const [sort, setSort] = useState(initialSort)
  const [pagination, setPagination] = useState({ key: '', page: 1, pageSize: 10 })
  const { locale, number } = useFormat()
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics.pagination' })
  const tableId = useId()
  const datasetKey = JSON.stringify([resetKey, rows.map(rowKey)])
  if (!rows.length) return <EmptyState message={emptyMessage} />
  const column = columns.find(candidate => candidate.key === sort?.key)
  const sorted = column?.sortValue && sort ? [...rows].sort((a, b) => {
    const first = column.sortValue!(a), second = column.sortValue!(b)
    if (first === null || second === null) return first === second ? 0 : first === null ? 1 : -1
    const value = typeof first === 'number' && typeof second === 'number' ? first - second : String(first).localeCompare(String(second), locale)
    return sort.direction === 'asc' ? value : -value
  }) : rows
  const page = paginateRows(sorted, pagination.key === datasetKey ? pagination.page : 1, pagination.pageSize)
  const changePage = (value: number) => setPagination(current => ({ ...current, key: datasetKey, page: value }))
  return <div>
    <div className="max-h-[460px] overflow-auto">
    <table id={tableId} className="w-full min-w-[520px] text-left text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky top-0 z-10 bg-card"><tr className="border-b text-xs text-muted-foreground">
        {columns.map(item => <th key={item.key} scope="col" className={`px-2 pb-3 font-medium ${item.numeric ? 'text-right' : ''}`}
          aria-sort={sort?.key === item.key ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
          {item.sortValue ? <button className={`inline-flex min-h-8 items-center gap-1 ${item.numeric ? 'justify-end' : ''}`} onClick={() => {
            setSort({ key: item.key, direction: sort?.key === item.key && sort.direction === 'desc' ? 'asc' : 'desc' })
            changePage(1)
          }}>
            {item.title}{sort?.key === item.key ? sort.direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3" />}
          </button> : item.title}
        </th>)}
      </tr></thead>
      <tbody>{(paginate ? page.rows : sorted).map(row => <tr key={rowKey(row)} className="border-b last:border-0 hover:bg-muted/40">
        {columns.map(item => <td key={item.key} className={`px-2 py-3 ${item.numeric ? 'text-right tabular-nums' : ''}`}>{item.render(row)}</td>)}
      </tr>)}</tbody>
    </table>
    </div>
    {paginate && <nav aria-label={t('navigation', { title: caption })} aria-controls={tableId} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <div className="space-y-1" role="status" aria-live="polite" aria-atomic="true">
        <p>{t('range', { from: number(page.from), to: number(page.to), total: number(page.total) })}</p>
        <p>{t('page', { page: number(page.page), pages: number(page.totalPages) })}</p>
      </div>
      <label className="analytics-field">{t('pageSize')}
        <select value={pagination.pageSize} onChange={event => setPagination({ key: datasetKey, page: 1, pageSize: Number(event.target.value) })}>
          {[10, 25, 50].map(size => <option key={size} value={size}>{number(size)}</option>)}
          <option value={0}>{t('all')}</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={page.page <= 1} onClick={() => changePage(1)}>{t('first')}</Button>
        <Button variant="outline" size="sm" disabled={page.page <= 1} onClick={() => changePage(page.page - 1)}>{t('previous')}</Button>
        <Button variant="outline" size="sm" disabled={page.page >= page.totalPages} onClick={() => changePage(page.page + 1)}>{t('next')}</Button>
        <Button variant="outline" size="sm" disabled={page.page >= page.totalPages} onClick={() => changePage(page.totalPages)}>{t('last')}</Button>
      </div>
    </nav>}
  </div>
}
