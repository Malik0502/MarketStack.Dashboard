import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export function DashboardCard({ title, eyebrow, action, children, className, contentClassName }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string; contentClassName?: string
}) {
  return <Card className={cn('dashboard-card', className)}>
    <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 sm:px-6">
      <div>{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}<CardTitle className="text-[15px] font-semibold tracking-tight">{title}</CardTitle></div>
      {action}
    </CardHeader>
    <CardContent className={cn('min-w-0 flex-1 px-5 sm:px-6', contentClassName)}>{children}</CardContent>
  </Card>
}

export function EmptyState({ loading, message }: { loading?: boolean; message?: string }) {
  const { t } = useTranslation()
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-5 text-center text-sm text-muted-foreground" role="status">
    {loading ? <><div className="h-1.5 w-24 animate-pulse rounded-full bg-primary/30" />{t('loading')}</> : message ?? t('empty')}
  </div>
}
