import { useCallback, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { HistoryPoint } from '../types'
import { useFormat } from '../format'
import { EmptyState } from './dashboard-card'

interface ChartPoint extends HistoryPoint { x: number; y: number | null }

export function ExpenseChart({ data, loading, tax = false }: {
  data: HistoryPoint[] | null; loading: boolean; tax?: boolean
}) {
  const { t } = useTranslation(['dashboard', 'common'])
  const { money, month, monthLabel, number } = useFormat()
  const gradient = useId().replaceAll(':', '')
  const [activeDate, setActiveDate] = useState<string | null>(null)
  const [containerWidth, setContainerWidth] = useState(760)
  const chartRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const observer = new ResizeObserver(([entry]) => setContainerWidth(Math.max(240, entry.contentRect.width)))
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  if (loading || !data?.length) {
    return <EmptyState loading={loading} message={data === null ? t('error.history') : undefined} />
  }

  const compact = containerWidth < 500
  const width = containerWidth, height = compact ? 220 : 240
  const left = compact ? 42 : 54, right = 16, top = 22, bottom = 38
  const values = data.flatMap(point => point.expense === null ? [] : [point.expense])
  const maximum = Math.max(1, ...values)
  const step = 10 ** Math.floor(Math.log10(maximum))
  const floor = Math.floor(Math.min(0, ...values) / step) * step
  const ceiling = Math.ceil(maximum / step) * step
  const plotHeight = height - top - bottom
  const yFor = (value: number) => top + plotHeight * (ceiling - value) / (ceiling - floor)
  const points: ChartPoint[] = data.map((point, index) => ({
    ...point,
    x: data.length === 1 ? (width + left - right) / 2 : left + index / (data.length - 1) * (width - left - right),
    y: point.expense === null ? null : yFor(point.expense),
  }))
  const selected = points.find(point => point.purchasedAt === activeDate) ?? points[points.length - 1]
  const color = tax ? 'var(--chart-tax)' : 'var(--chart-expense)'
  const valueLabel = (value: number | null) => value === null ? t('common:missing') : money(value)

  // Missing values break both the line and area. Never bridge gaps or invent zeros.
  const segments: ChartPoint[][] = []
  for (const point of points) {
    if (point.y === null) { segments.push([]); continue }
    if (!segments.length) segments.push([])
    segments[segments.length - 1].push(point)
  }

  return <div ref={chartRef}>
    <div className="mb-2 flex min-h-10 flex-wrap items-baseline justify-between gap-2 text-xs">
      <span className="flex items-center gap-2 text-muted-foreground">
        <span className="size-2 rounded-full" style={{ background: color }} />
        {t('analysis.unit', { series: t(tax ? 'common:taxes' : 'common:expenses') })}
      </span>
      <span className="text-muted-foreground" aria-live="polite">
        {month(selected.purchasedAt, true)}
        <strong className="ml-2 font-semibold text-foreground tabular-nums">{valueLabel(selected.expense)}</strong>
      </span>
    </div>
    <svg viewBox={`0 0 ${width} ${height}`} height={height} className="expense-chart w-full overflow-visible"
      role="group" aria-label={t(tax ? 'analysis.taxLabel' : 'analysis.expensesLabel')}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map(index => {
        const y = top + plotHeight * index / 4
        return <g key={index}>
          <line x1={left} x2={width - right} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 5" />
          <text x={left - 12} y={y + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize="11">
            {number(ceiling - (ceiling - floor) * index / 4)}
          </text>
        </g>
      })}
      {segments.filter(segment => segment.length > 0).map(segment => {
        const path = segment.map(point => `${point.x},${point.y}`).join(' ')
        return <g key={segment[0].purchasedAt}>
          <polygon points={`${segment[0].x},${yFor(0)} ${path} ${segment.at(-1)!.x},${yFor(0)}`} fill={`url(#${gradient})`} />
          <polyline points={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        </g>
      })}
      <line x1={selected.x} x2={selected.x} y1={top} y2={top + plotHeight} stroke={color} strokeOpacity="0.25" strokeDasharray="4 4" />
      {points.map((point, index) => {
        const showLabel = (!compact && points.length <= 12) || index === 0 || index === points.length - 1
          || index % Math.max(1, Math.ceil(points.length / (compact ? 3 : 6))) === 0
        const detail = t('analysis.point', { month: month(point.purchasedAt, true), value: valueLabel(point.expense) })
        return <g key={point.purchasedAt} data-month={point.purchasedAt} data-missing={point.expense === null}>
          {showLabel && <text x={point.x} y={height - 9} textAnchor="middle" fill="var(--muted-foreground)" fontSize="11">
            {monthLabel(point.purchasedAt)}
          </text>}
          {point.y !== null
            ? <circle cx={point.x} cy={point.y} r={selected === point ? 5 : 3} fill={selected === point ? color : 'var(--card)'} stroke={color} strokeWidth="2" />
            : <line x1={point.x - 3} x2={point.x + 3} y1={top + plotHeight - 4} y2={top + plotHeight - 4} stroke="var(--muted-foreground)" strokeWidth="2" />}
          <rect x={point.x - Math.min(22, (width - left) / points.length / 2)} y={top - 8}
            width={Math.min(44, (width - left) / points.length)} height={plotHeight + 16} fill="transparent"
            tabIndex={0} role="img" aria-label={detail}
            onFocus={() => setActiveDate(point.purchasedAt)} onPointerEnter={() => setActiveDate(point.purchasedAt)}
            onPointerDown={() => setActiveDate(point.purchasedAt)} className="cursor-crosshair focus:outline-2 focus:outline-primary">
            <title>{detail}</title>
          </rect>
        </g>
      })}
    </svg>
    <p className="mt-3 text-[11px] text-muted-foreground">{t('analysis.hint')}</p>
    {points.some(point => point.expense === null) && <p className="mt-1 text-[11px] text-muted-foreground">{t('analysis.missingHint')}</p>}
  </div>
}
