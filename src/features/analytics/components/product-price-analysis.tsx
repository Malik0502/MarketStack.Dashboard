import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { DashboardCard, EmptyState } from '@/features/dashboard/components/dashboard-card'
import { useFormat } from '@/i18n/format'
import { AnalyticsNote } from './analytics-layout'
import { PriceStatistics } from './price-statistics'
import { TimeSeriesChart } from './charts'
import type { PricesData } from '../types'
import { CardHeadingContext, type CardHeading } from '@/features/dashboard/components/card-heading-context'

export function ProductPriceAnalysis({ data, headingLevel = 'h2' }: { data: PricesData; headingLevel?: CardHeading }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const { money } = useFormat()
  const series = useMemo(() => data.series.map(series => ({
    id: series.storeId, label: series.label, points: series.points.map(point => ({ date: point.date, value: point.price })),
  })), [data.series])
  return <CardHeadingContext value={headingLevel}><div className="space-y-4">
    <PriceStatistics stats={data.stats} />
    <DashboardCard title={`${t('priceHistory')}${data.product ? ` · ${data.product.name}` : ''}`}>
      {data.series.length ? <TimeSeriesChart title={t('priceHistory')} format={money} series={series} /> : <EmptyState message={t('insufficient')} />}
      {data.historyTruncated && <p className="mt-3 text-xs text-muted-foreground">{t('truncated')}</p>}
    </DashboardCard>
    <AnalyticsNote>{t('historicalNote')}</AnalyticsNote>
  </div></CardHeadingContext>
}
