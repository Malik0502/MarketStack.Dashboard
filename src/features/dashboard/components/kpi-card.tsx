import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/Components/ui/card'
import { cn } from '@/lib/utils'
import { useFormat } from '../format'
import { useTranslation } from 'react-i18next'

export function KpiCard({ title, value, detail, icon: Icon, change, accent, loading }: {
  title: string; value: string | null; detail: string; icon: LucideIcon; change?: number | null; accent?: boolean; loading: boolean
}) {
  const { t } = useTranslation()
  const { percent } = useFormat()
  const Trend = change == null || change === 0 ? Minus : change < 0 ? ArrowDownRight : ArrowUpRight
  return <Card className={cn('dashboard-card relative', accent && 'kpi-accent')}>
    <CardContent className="px-5 sm:px-6">
      <div className="mb-6 flex items-center justify-between gap-2"><h2 className="text-[13px] font-medium text-muted-foreground">{title}</h2><Icon className="size-[18px] text-muted-foreground" strokeWidth={1.6} /></div>
      {loading ? <div className="mb-4 h-9 w-36 rounded bg-muted" /> : <p className="mb-4 text-[clamp(1.6rem,2.5vw,2rem)] leading-none font-medium tracking-[-0.02em] tabular-nums">{value ?? t('unavailableValue')}</p>}
      <div className="flex min-h-6 flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {change != null && !loading && <span className={cn('trend-badge inline-flex items-center gap-0.5 rounded-md px-1.5 py-1 font-semibold', change > 0 ? 'trend-up' : change < 0 ? 'trend-down' : 'bg-muted text-muted-foreground')}><Trend className="size-3" />{change > 0 ? '+' : ''}{percent(change)}</span>}
        <span>{detail}</span>
      </div>
    </CardContent>
  </Card>
}
