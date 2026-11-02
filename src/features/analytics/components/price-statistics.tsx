import { useTranslation } from 'react-i18next'
import { useFormat } from '@/i18n/format'
import { DashboardCard } from '@/features/dashboard/components/dashboard-card'
import type { PriceStats } from '../types'

export function PriceStatistics({ stats, compact = false }: { stats: PriceStats | null; compact?: boolean }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const { money, number, date } = useFormat()
  return <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 ${compact ? '' : 'xl:grid-cols-6'}`}>
    {(['last', 'average', 'min', 'max', 'median', 'count'] as const).map(key => <DashboardCard key={key}
      title={t(key === 'average' ? 'mean' : key === 'min' ? 'minimum' : key === 'max' ? 'maximum' : key === 'count' ? 'observations' : key)}>
      <p className="text-xl font-semibold tracking-tight tabular-nums">{stats ? key === 'count' ? number(stats[key]) : money(stats[key]) : t('missing')}</p>
      {key === 'last' && stats && <p className="mt-2 text-[10px] text-muted-foreground">{date(stats.lastAt)}</p>}
    </DashboardCard>)}
  </div>
}
