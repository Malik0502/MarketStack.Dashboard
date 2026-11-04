import { Link } from '@tanstack/react-router'
import { ArrowLeft, Construction, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AppHeader } from '@/Components/Navigation/app-header'
import { Card, CardContent } from '@/Components/ui/card'

export function UserPage() {
  const { t } = useTranslation(['user', 'navigation', 'common'])
  return <>
    <AppHeader title={t('navigation:user')} />
    <div className="dashboard-page">
      <p className="eyebrow mb-2.5">{t('eyebrow')}</p>
      <h1 className="text-[28px] font-medium tracking-[-0.02em] sm:text-[32px]">{t('title')}</h1>
      <Card className="dashboard-card mt-7 max-w-2xl">
        <CardContent className="px-5 sm:px-6">
          <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-muted text-primary">
            <UserRound className="size-7" strokeWidth={1.5} />
          </div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Construction className="size-5 text-primary" />{t('status')}</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">{t('description')}</p>
          <Link to="/" className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline">
            <ArrowLeft className="size-4" />{t('common:backHome')}
          </Link>
        </CardContent>
      </Card>
    </div>
  </>
}
