import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { EmptyState } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'
import type { ParetoPoint } from '../types'

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
export interface GraphSeries { id: string; label: string; points: { date: string; value: number }[] }

export function TimeSeriesChart({ series, title, format }: { series: GraphSeries[]; title: string; format: (value: number) => string }) {
  const { date } = useFormat()
  const { width, ref } = useChartWidth()
  const [active, setActive] = useState<string | null>(null)
  const points = series.flatMap((line, seriesIndex) => line.points.map((point, index) => ({
    ...point, line: line.label, color: colors[seriesIndex % colors.length], key: `${line.id}:${point.date}:${index}`,
    time: Date.parse(point.date),
  })))
  if (!points.length) return <EmptyState />
  const left = width < 500 ? 46 : 62, right = 18, top = 16, height = 240, bottom = 40
  const start = Math.min(...points.map(point => point.time)), end = Math.max(...points.map(point => point.time))
  const maximum = Math.max(1, ...points.map(point => point.value))
  const x = (time: number) => end === start ? (left + width - right) / 2 : left + (time - start) / (end - start) * (width - left - right)
  const y = (value: number) => top + (height - top - bottom) * (1 - value / maximum)
  const selected = points.find(point => point.key === active) ?? points.at(-1)!
  const detail = `${selected.line} · ${date(selected.date)} · ${format(selected.value)}`
  return <div ref={ref}>
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px] text-muted-foreground">{series.map((line, index) => <span key={line.id} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: colors[index % colors.length] }} />{line.label}</span>)}</div>
    <p className="mb-2 min-h-8 text-xs font-medium tabular-nums" aria-live="polite">{detail}</p>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={title}>
      {[0, 1, 2, 3, 4].map(index => <g key={index}>
        <line x1={left} x2={width - right} y1={y(maximum * index / 4)} y2={y(maximum * index / 4)} stroke="var(--border)" strokeDasharray="3 5" />
        <text x={left - 9} y={y(maximum * index / 4) + 4} fill="var(--muted-foreground)" fontSize="10" textAnchor="end">{format(maximum * index / 4)}</text>
      </g>)}
      {series.map((line, index) => <polyline key={line.id} points={line.points.map(point => `${x(Date.parse(point.date))},${y(point.value)}`).join(' ')} fill="none" stroke={colors[index % colors.length]} strokeWidth="2" strokeLinejoin="round" />)}
      {points.map(point => <circle key={point.key} cx={x(point.time)} cy={y(point.value)} r={point === selected ? 5 : 3.5} fill="var(--card)" stroke={point.color} strokeWidth="2"
        tabIndex={0} role="img" aria-label={`${point.line} · ${date(point.date)} · ${format(point.value)}`}
        onFocus={() => setActive(point.key)} onPointerEnter={() => setActive(point.key)} onPointerDown={() => setActive(point.key)}>
        <title>{point.line} · {date(point.date)} · {format(point.value)}</title>
      </circle>)}
      {Array.from({ length: width < 500 ? 3 : 5 }, (_, index) => {
        // Tick positions use time, not array indices; irregular observations remain irregular.
        const ratio = index / (width < 500 ? 2 : 4), time = start + ratio * (end - start)
        return <text key={index} x={x(time)} y={height - 12} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{date(new Date(time).toISOString())}</text>
      })}
    </svg>
  </div>
}

export function ParetoChart({ points }: { points: ParetoPoint[] }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const { money, percent, number } = useFormat()
  const { width, ref } = useChartWidth()
  const [active, setActive] = useState<number | null>(null)
  if (!points.length) return <EmptyState />
  const left = 52, right = 42, top = 20, bottom = 30, height = 250
  const max = Math.max(1, ...points.map(point => point.expenses))
  const step = (width - left - right) / points.length
  const x = (index: number) => left + step * (index + 0.5)
  const y = (percentage: number) => top + (height - top - bottom) * (1 - percentage / 100)
  const selected = points[active ?? 0] ?? points[0]
  return <div ref={ref}>
    <div className="mb-3 flex flex-wrap gap-4 text-[11px] text-muted-foreground">
      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--chart-expense)]" />{t('itemExpenses')} · EUR</span>
      <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--chart-tax)]" />{t('cumulative')}</span>
    </div>
    <p className="mb-3 min-h-10 text-xs" aria-live="polite">{selected.name || t('other')} · <strong>{money(selected.expenses)}</strong> · {t('cumulative')}: {percent(selected.cumulativeShare)}</p>
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={t('pareto')}>
      {[0, 25, 50, 75, 100].map(value => <g key={value}>
        <line x1={left} x2={width - right} y1={y(value)} y2={y(value)} stroke="var(--border)" strokeDasharray="3 5" />
        <text x={left - 7} y={y(value) + 4} textAnchor="end" fontSize="10" fill="var(--muted-foreground)">{number(max * value / 100)}</text>
        <text x={width - right + 6} y={y(value) + 4} fontSize="10" fill="var(--chart-tax)">{percent(value)}</text>
      </g>)}
      {points.map((point, index) => <g key={point.productId ?? 'other'}>
        <rect x={x(index) - step * 0.3} y={y(point.expenses / max * 100)} width={step * 0.6} height={y(0) - y(point.expenses / max * 100)} fill="var(--chart-expense)" opacity={active === index ? 1 : 0.65}
          tabIndex={0} role="img" aria-label={`${point.name || t('other')} · ${money(point.expenses)} · ${percent(point.cumulativeShare)}`}
          onFocus={() => setActive(index)} onPointerEnter={() => setActive(index)} onPointerDown={() => setActive(index)}>
          <title>{point.name || t('other')} · {money(point.expenses)} · {percent(point.cumulativeShare)}</title>
        </rect>
        {(points.length <= 15 || index % Math.ceil(points.length / 8) === 0) && <text x={x(index)} y={height - 9} textAnchor="middle" fontSize="10" fill="var(--muted-foreground)">{number(index + 1)}</text>}
      </g>)}
      <polyline points={points.map((point, index) => `${x(index)},${y(point.cumulativeShare)}`).join(' ')} fill="none" stroke="var(--chart-tax)" strokeWidth="2.5" />
    </svg>
    <p className="mt-2 text-[11px] text-muted-foreground">{t('abcDisplay.chartHint')}</p>
  </div>
}
