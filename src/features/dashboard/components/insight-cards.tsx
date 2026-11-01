import { ArrowDownRight, ArrowUpRight, ShoppingBasket, TicketPercent } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DashboardCard } from './dashboard-card'
import { useFormat } from '../format'
import type { DashboardData } from '../types'
import { getMonthlyChange } from '../selectors'

export function ShoppingInsights({ metrics, loading }: { metrics: DashboardData['metrics']; loading: boolean }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const { number, percent } = useFormat()
  const share = metrics.discountShare
  return <DashboardCard title={t('profile.title')} eyebrow={t('profile.eyebrow')} className="lg:col-span-4">
    <div className="flex items-center gap-4 border-b pb-5">
      <div className="relative flex size-[104px] shrink-0 items-center justify-center">
        <svg viewBox="0 0 104 104" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <circle cx="52" cy="52" r="43" fill="none" stroke="var(--muted)" strokeWidth="8" />
          <circle cx="52" cy="52" r="43" fill="none" stroke="var(--chart-expense)" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${Math.min(100, Math.max(0, share ?? 0)) / 100 * 270.18} 270.18`} />
        </svg>
        <span className="text-xl font-semibold tracking-tight tabular-nums">
          {loading || share == null ? t('common:unavailableValue') : percent(share)}
        </span>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold"><TicketPercent className="size-4 text-primary" />{t('profile.promotions')}</div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('profile.description')}</p>
      </div>
    </div>
    <div className="mt-5 flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-xl bg-muted"><ShoppingBasket className="size-5 text-muted-foreground" strokeWidth={1.5} /></div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{t('profile.items')}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">
          {loading || metrics.averageItems == null ? t('common:unavailableValue') : number(metrics.averageItems, 1)}{' '}
          <span className="text-xs font-normal text-muted-foreground">{t('profile.average')}</span>
        </p>
      </div>
    </div>
    <p className="mt-5 text-[11px] leading-relaxed text-muted-foreground">{t('profile.note')}</p>
  </DashboardCard>
}

export function MonthlyInsight({ expenses }: { expenses: DashboardData['expenses'] }) {
  const { t } = useTranslation(['dashboard', 'common'])
  const { money, month, percent } = useFormat()
  const latest = expenses?.at(-1)
  const change = getMonthlyChange(expenses)
  const Trend = change != null && change < 0 ? ArrowDownRight : ArrowUpRight
  return <DashboardCard title={t('focus.title')} eyebrow={t('focus.eyebrow')}>
    <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{latest ? money(latest.expense) : t('common:unavailableValue')}</p>
      <span className="text-xs text-muted-foreground">{latest ? month(latest.purchasedAt) : t('common:missing')}</span>
    </div>
    {change != null
      ? <div className={`flex flex-wrap items-center gap-2 text-xs ${change < 0 ? 'trend-down' : change > 0 ? 'trend-up' : 'text-muted-foreground'}`}>
        <Trend className="size-4" /><strong>{change > 0 ? '+' : ''}{percent(change)}</strong>
        <span className="text-muted-foreground">{t('focus.comparison')}</span>
      </div>
      : <p className="text-xs text-muted-foreground">{t('focus.noComparison')}</p>}
    <div className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
      {latest ? t('focus.note', { month: month(latest.purchasedAt, true) }) : t('focus.empty')}
    </div>
  </DashboardCard>
}
