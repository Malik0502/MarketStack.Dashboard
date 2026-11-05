import { createElement, useContext, type ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '@/Components/ui/card'
import { CardHeadingContext, type CardHeading } from './card-heading-context'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export function DashboardCard({ title, eyebrow, action, children, className, contentClassName, headingLevel }: {
  title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string; contentClassName?: string; headingLevel?: CardHeading
}) {
  const inheritedLevel = useContext(CardHeadingContext)
  const Heading = headingLevel ?? inheritedLevel
  const nextLevel = `h${Math.min(6, Number(Heading.slice(1)) + 1)}` as CardHeading
  return <Card className={cn('dashboard-card', className)}>
    <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 sm:px-6">
      <div className="min-w-0 break-words">{eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}{createElement(Heading, { 'data-slot': 'card-title', className: 'text-[15px] font-medium' }, title)}</div>
      {action}
    </CardHeader>
    <CardContent className={cn('min-w-0 flex-1 px-5 sm:px-6', contentClassName)}><CardHeadingContext value={nextLevel}>{children}</CardHeadingContext></CardContent>
  </Card>
}

export function EmptyState({ loading, message }: { loading?: boolean; message?: string }) {
  const { t } = useTranslation()
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 px-5 text-center text-sm text-muted-foreground" role="status">
    {loading ? <><div className="h-1 w-24 rounded-full bg-muted-foreground/30" />{t('loading')}</> : message ?? t('empty')}
  </div>
}
