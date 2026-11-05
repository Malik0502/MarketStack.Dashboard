import { useCallback, useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'
import type { ParetoPoint } from '../types'
import { chartKeyIndex, nearestIndex, sampleExtrema } from '../chart-model'
import { DataTable, type Column } from './data-table'

function useChartWidth() {
  const [width, setWidth] = useState(700)
  const ref = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(240, entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return { width, ref }
}

const colors = ['var(--chart-expense)', 'var(--chart-tax)', 'var(--primary)', 'var(--positive)', 'var(--warning)', 'var(--negative)']
export interface GraphSeries { id: string; label: string; color?: string; points: { date: string; value: number | null }[] }

export function TimeSeriesChart({ series, title, format, axisLabel }: {
  series: GraphSeries[]; title: string; format: (value: number) => string; axisLabel?: (value: string) => string
}) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const { t: common } = useTranslation()
  const { date } = useFormat()
  const { width, ref } = useChartWidth()
  const id = useId(), [active, setActive] = useState<number | null>(null)
  const model = useMemo(() => {
    const rows = series.flatMap((line, seriesIndex) => {
      let segment = 0
      return [...line.points].sort((a, b) => a.date.localeCompare(b.date)).map((point, index) => {
        if (point.value === null) segment++
        return { ...point, line: line.label, seriesId: line.id, color: line.color ?? colors[seriesIndex % colors.length],
          key: `${line.id}:${point.date}:${index}`, segment, time: Date.parse(point.date), index: 0 }
      })
    }).sort((a, b) => a.time - b.time || a.seriesId.localeCompare(b.seriesId))
    let maximum = 1, minimum = 0
    rows.forEach((point, index) => { point.index = index; if (point.value !== null) { maximum = Math.max(maximum, point.value); minimum = Math.min(minimum, point.value) } })
    const lines = series.map(line => rows.filter(point => point.seriesId === line.id))
    const budget = Math.max(4, Math.min(600, Math.floor(1200 / Math.max(1, lines.length))))
    const paths = lines.map(line => {
      const sampled = sampleExtrema(line.filter(point => point.value !== null), point => point.value!, budget)
      const segments: (typeof sampled)[] = []
      for (const point of sampled) {
        if (!segments.length || segments.at(-1)!.at(-1)!.segment !== point.segment) segments.push([])
        segments.at(-1)!.push(point)
      }
      return { sampled, segments }
    })
    return { rows, lines, paths, maximum, minimum }
  }, [series])
  type Row = typeof model.rows[number]
  const columns = useMemo<Column<Row>[]>(() => [
    { key: 'series', title: t('chart.series'), render: row => row.line, sortValue: row => row.line },
    { key: 'date', title: t('date'), render: row => date(row.date), sortValue: row => row.time },
    { key: 'value', title: t('chart.value'), render: row => row.value === null ? common('missing') : format(row.value), numeric: true, sortValue: row => row.value },
  ], [t, common, date, format])
  if (!model.rows.length) return <EmptyState />
  const left = width < 500 ? 46 : 62, right = 20, top = 16, height = 240, bottom = 40
  const start = model.rows[0].time, end = model.rows.at(-1)!.time
  const x = (time: number) => end === start ? (left + width - right) / 2 : left + (time - start) / (end - start) * (width - left - right)
  const y = (value: number) => top + (height - top - bottom) * (model.maximum - value) / (model.maximum - model.minimum)
  const selected = model.rows[Math.min(active ?? model.rows.length - 1, model.rows.length - 1)]
  const detail = `${selected.line} · ${date(selected.date)} · ${selected.value === null ? common('missing') : format(selected.value)}`
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const next = chartKeyIndex(event.key, selected.index, model.rows.length)
    if (next !== null) { event.preventDefault(); setActive(next) }
  }
  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const pointerX = (event.clientX - box.left) * width / box.width
    const pointerY = (event.clientY - box.top) * height / box.height
    const time = start + Math.max(0, Math.min(1, (pointerX - left) / (width - left - right))) * (end - start)
    let closest = selected.index, distance = Infinity
    for (const line of model.lines) {
      if (!line.length) continue
      const index = nearestIndex(line, time, point => point.time)
      for (const candidate of [line[index - 1], line[index], line[index + 1]]) {
        if (!candidate) continue
        const delta = (x(candidate.time) - pointerX) ** 2 + ((candidate.value === null ? height - bottom : y(candidate.value)) - pointerY) ** 2
        if (delta < distance) { distance = delta; closest = candidate.index }
      }
    }
    setActive(closest)
  }
  return <div ref={ref}>
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">{series.map((line, index) => <span key={line.id} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ background: line.color ?? colors[index % colors.length] }} />{line.label}</span>)}</div>
    <p id={`${id}-detail`} className="mb-2 min-h-8 text-xs font-medium tabular-nums" aria-live="polite">{detail}</p>
    <p id={`${id}-help`} className="sr-only">{t('chart.instructions')}</p>
    <svg className="chart-interaction" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} tabIndex={0} role="group"
      aria-label={title} aria-describedby={`${id}-help ${id}-detail`} onKeyDown={onKeyDown} onPointerDown={onPointer}
      onPointerMove={event => { if (event.pointerType === 'mouse') onPointer(event) }}>
      <g aria-hidden="true">
        {[0, 1, 2, 3, 4].map(index => {
          const value = model.minimum + (model.maximum - model.minimum) * index / 4
          return <g key={index}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="var(--border)" strokeDasharray="3 5" />
            <text x={left - 8} y={y(value) + 4} fill="var(--muted-foreground)" fontSize="10" textAnchor="end">{format(value)}</text></g>
        })}
        {model.paths.map((line, index) => <g key={series[index].id}>
          {line.segments.map((segment, i) => <polyline key={i} points={segment.map(point => `${x(point.time)},${y(point.value!)}`).join(' ')} fill="none" stroke={series[index].color ?? colors[index % colors.length]} strokeWidth="2" strokeLinejoin="round" />)}
          {line.sampled.map(point => <circle key={point.key} cx={x(point.time)} cy={y(point.value!)} r="2" fill={point.color} />)}
        </g>)}
        <line x1={x(selected.time)} x2={x(selected.time)} y1={top} y2={height - bottom} stroke={selected.color} strokeDasharray="4 4" />
        {selected.value !== null && <circle cx={x(selected.time)} cy={y(selected.value)} r="5" fill="var(--card)" stroke={selected.color} strokeWidth="2" />}
        {Array.from({ length: width < 500 ? 3 : 5 }, (_, index) => {
          const time = start + index / (width < 500 ? 2 : 4) * (end - start)
          return <text key={index} x={x(time)} y={height - 12} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{(axisLabel ?? date)(new Date(time).toISOString())}</text>
        })}
      </g>
    </svg>
    <p className="mt-2 text-[11px] text-muted-foreground">{t('chart.instructions')}</p>
    {model.rows.length > 600 && <p className="mt-2 text-[11px] text-muted-foreground">{t('chart.sampled')}</p>}
    <details className="mt-3"><summary className="cursor-pointer text-xs text-primary hover:underline">{t('chart.data')}</summary>
      <div className="mt-3"><DataTable caption={title} rows={model.rows} columns={columns} rowKey={row => row.key} /></div>
    </details>
  </div>
}

export function ParetoChart({ points }: { points: ParetoPoint[] }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const { money, percent, number } = useFormat()
  const { width, ref } = useChartWidth()
  const id = useId(), [active, setActive] = useState(0)
  const bins = useMemo(() => {
    const size = Math.max(1, Math.ceil(points.length / 600))
    return Array.from({ length: Math.ceil(points.length / size) }, (_, index) => {
      const from = index * size, to = Math.min(points.length, from + size)
      let expenses = 0
      for (let i = from; i < to; i++) expenses += points[i].expenses
      return { from, to, expenses, cumulativeShare: points[to - 1].cumulativeShare }
    })
  }, [points])
  const rows = useMemo(() => points.map((point, index) => ({ ...point, index })), [points])
  const columns = useMemo<Column<typeof rows[number]>[]>(() => [
    { key: 'product', title: t('product'), render: row => row.name || t('other') },
    { key: 'expenses', title: t('itemExpenses'), render: row => money(row.expenses), sortValue: row => row.expenses, numeric: true },
    { key: 'cumulative', title: t('cumulative'), render: row => percent(row.cumulativeShare), numeric: true },
  ], [t, money, percent])
  if (!points.length) return <EmptyState />
  const left = 52, right = 42, top = 20, bottom = 30, height = 250
  const maximum = bins.reduce((max, bin) => Math.max(max, bin.expenses), 1)
  const step = (width - left - right) / bins.length
  const x = (index: number) => left + step * (index + 0.5)
  const y = (value: number) => top + (height - top - bottom) * (1 - value / 100)
  const selectedIndex = Math.min(active, points.length - 1), selected = points[selectedIndex]
  const keyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    const next = chartKeyIndex(event.key, selectedIndex, points.length)
    if (next !== null) { event.preventDefault(); setActive(next) }
  }
  const pointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    setActive(Math.max(0, Math.min(points.length - 1, Math.floor(((event.clientX - box.left) * width / box.width - left) / (width - left - right) * points.length))))
  }
  return <div ref={ref}>
    <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground"><span>{t('itemExpenses')} · EUR</span><span>{t('cumulative')}</span></div>
    <p id={`${id}-detail`} className="mb-3 min-h-10 text-xs tabular-nums" aria-live="polite">{selected.name || t('other')} · <strong>{money(selected.expenses)}</strong> · {t('cumulative')}: {percent(selected.cumulativeShare)}</p>
    <p id={`${id}-help`} className="sr-only">{t('chart.instructions')}</p>
    <svg className="chart-interaction" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="group" tabIndex={0}
      aria-label={t('pareto')} aria-describedby={`${id}-help ${id}-detail`} onKeyDown={keyDown} onPointerDown={pointer} onPointerMove={event => { if (event.pointerType === 'mouse') pointer(event) }}>
      <g aria-hidden="true">
        {[0, 25, 50, 75, 100].map(value => <g key={value}>
          <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="var(--border)" strokeDasharray="3 5" />
          <text x={left - 8} y={y(value) + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{number(maximum * value / 100)}</text>
          <text x={width - right + 8} y={y(value) + 4} fontSize="10" fill="var(--chart-tax)">{percent(value)}</text>
        </g>)}
        {bins.map((bin, index) => <g key={bin.from}>
          <rect x={x(index) - step * 0.3} y={y(bin.expenses / maximum * 100)} width={step * 0.6} height={y(0) - y(bin.expenses / maximum * 100)} fill="var(--chart-expense)" opacity={selectedIndex >= bin.from && selectedIndex < bin.to ? 1 : 0.65} />
          {(bins.length <= 15 || index % Math.ceil(bins.length / 8) === 0) && <text x={x(index)} y={height - 9} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{number(bin.from + 1)}</text>}
        </g>)}
        <polyline points={bins.map((bin, index) => `${x(index)},${y(bin.cumulativeShare)}`).join(' ')} fill="none" stroke="var(--chart-tax)" strokeWidth="2.5" />
      </g>
    </svg>
    <p className="mt-2 text-[11px] text-muted-foreground">{t('abcDisplay.chartHint')}</p>
    <p className="mt-2 text-[11px] text-muted-foreground">{t('chart.instructions')}</p>
    {points.length > 600 && <p className="mt-2 text-[11px] text-muted-foreground">{t('chart.grouped')}</p>}
    <details className="mt-3"><summary className="cursor-pointer text-xs text-primary hover:underline">{t('chart.data')}</summary>
      <div className="mt-3"><DataTable caption={t('pareto')} rows={rows} columns={columns} rowKey={row => row.index} /></div>
    </details>
  </div>
}
