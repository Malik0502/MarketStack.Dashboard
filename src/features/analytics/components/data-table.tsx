import { addTransitionType, startTransition, useDeferredValue, useId, useMemo, useState, ViewTransition, type ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { TableState } from '@/lib/url-state'
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

export function DataTable<T>({ rows, columns, rowKey, caption, initialSort, emptyMessage, paginate = true, resetKey = '', stateKey }: {
  rows: T[]; columns: Column<T>[]; rowKey: (row: T) => string | number; caption: string
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  emptyMessage?: string
  paginate?: boolean; resetKey?: string; stateKey?: string
}) {
  const [local, setLocal] = useState<TableState & { key?: string }>({})
  const url = useSearch({ from: '__root__', structuralSharing: true, select: search => stateKey ? search.tables?.[stateKey] : undefined })
  const navigate = useNavigate()
  const state = stateKey ? url ?? {} : local.key === resetKey ? local : {}
  const sortKey = state.sort ?? initialSort?.key, direction = state.direction ?? initialSort?.direction ?? 'desc'
  const { locale, number } = useFormat()
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics.pagination' })
  const tableId = useId()
  const column = columns.find(candidate => candidate.key === sortKey)
  const sorted = useMemo(() => column?.sortValue ? [...rows].sort((a, b) => {
    const first = column.sortValue!(a), second = column.sortValue!(b)
    if (first === null || second === null) return first === second ? 0 : first === null ? 1 : -1
    const value = typeof first === 'number' && typeof second === 'number' ? first - second : String(first).localeCompare(String(second), locale)
    return direction === 'asc' ? value : -value
  }) : rows, [rows, column, direction, locale])
  const page = useMemo(() => paginateRows(sorted, state.page ?? 1, state.pageSize ?? 10), [sorted, state.page, state.pageSize])
  const presentation = useMemo(() => ({ key: resetKey, rows: paginate ? page.rows : sorted }), [resetKey, paginate, page.rows, sorted])
  const deferred = useDeferredValue(presentation)
  const visible = deferred.key === resetKey ? deferred.rows : presentation.rows
  const change = (patch: TableState, replace = false) => startTransition(() => {
    addTransitionType('table-update')
    if (stateKey) void navigate({ to: '.', resetScroll: false, replace, viewTransition: false, search: previous => ({ ...previous,
      tables: { ...previous.tables, [stateKey]: { ...previous.tables?.[stateKey], ...patch } },
    }) })
    else setLocal(current => ({ ...(current.key === resetKey ? current : {}), ...patch, key: resetKey }))
  })
  const changePage = (value: number) => change({ page: value })
  if (!rows.length) return <EmptyState message={emptyMessage} />
  return <div data-table-state={stateKey}>
    <div className="table-scroll max-h-[460px] overflow-auto">
    <table id={tableId} className="w-full min-w-[520px] text-left text-xs">
      <caption className="sr-only">{caption}</caption>
      <thead className="sticky top-0 z-10 bg-card"><tr className="border-b text-xs text-muted-foreground">
        {columns.map(item => <th key={item.key} scope="col" className={`px-2 pb-3 font-medium ${item.numeric ? 'text-right' : ''}`}
          aria-sort={sortKey === item.key ? direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
          {item.sortValue ? <button className={`inline-flex min-h-8 items-center gap-1 ${item.numeric ? 'justify-end' : ''}`} onClick={() => {
            change({ sort: item.key, direction: sortKey === item.key && direction === 'desc' ? 'asc' : 'desc', page: 1 }, true)
          }}>
            {item.title}{sortKey === item.key ? direction === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" /> : <ArrowUpDown className="size-3" />}
          </button> : item.title}
        </th>)}
      </tr></thead>
      <tbody>{visible.map(row => {
        const content = <tr key={rowKey(row)} className="contained-table-row border-b last:border-0 hover:bg-muted/40">
          {columns.map(item => <td key={item.key} className={`break-words px-2 py-3 ${item.numeric ? 'text-right tabular-nums' : ''}`}>{item.render(row)}</td>)}
        </tr>
        return visible.length <= 50 ? <ViewTransition key={rowKey(row)} default="none" update="table-update">{content}</ViewTransition> : content
      })}</tbody>
    </table>
    </div>
    {paginate && <nav aria-label={t('navigation', { title: caption })} aria-controls={tableId} className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
      <div className="space-y-1" role="status" aria-live="polite" aria-atomic="true">
        <p>{t('range', { from: number(page.from), to: number(page.to), total: number(page.total) })}</p>
        <p>{t('page', { page: number(page.page), pages: number(page.totalPages) })}</p>
      </div>
      <label className="analytics-field">{t('pageSize')}
        <select name="pageSize" value={state.pageSize ?? 10} onChange={event => change({ page: 1, pageSize: Number(event.target.value) }, true)}>
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
