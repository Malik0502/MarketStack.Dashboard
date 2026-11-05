import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { HistoryPoint } from '../types'
import { useFormat } from '../format'
import { EmptyState } from './dashboard-card'
import { TimeSeriesChart } from '@/features/analytics/components/charts'

export function ExpenseChart({ data, loading, tax = false }: { data: HistoryPoint[] | null; loading: boolean; tax?: boolean }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const { money, monthLabel } = useFormat()
  const label = t(tax ? 'common:taxes' : 'common:expenses')
  const series = useMemo(() => [{ id: tax ? 'taxes' : 'expenses', label,
    color: tax ? 'var(--chart-tax)' : 'var(--chart-expense)',
    points: (data ?? []).map(point => ({ date: point.purchasedAt, value: point.expense })),
  }], [data, tax, label])
  if (loading || !data?.length) return <EmptyState loading={loading} message={data === null ? t('error.history') : undefined} />
  return <>
    <TimeSeriesChart series={series} title={t(tax ? 'analysis.taxLabel' : 'analysis.expensesLabel')} format={money} axisLabel={monthLabel} />
    {data.some(point => point.expense === null) && <p className="mt-2 text-[11px] text-muted-foreground">{t('analysis.missingHint')}</p>}
  </>
}
