import { Dialog } from '@base-ui/react/dialog'
import { Info, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export type CardInfoTopic = 'frequency' | 'topExpenses' | 'topFrequency' | 'totalProducts' | 'itemExpenses' | 'abcOverview' | 'pareto' | 'promotionProducts' | 'tags' | 'quantities' | 'stability'

export function CardInfo({ topic }: { topic: CardInfoTopic }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const title = t(topic)
  return <Dialog.Root>
    <Dialog.Trigger type="button" aria-label={t('cardInfo.open', { title })} title={t('cardInfo.open', { title })}
      className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      <Info className="size-4" aria-hidden="true" />
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 data-[closed]:hidden" />
      <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-5 text-card-foreground shadow-xl outline-none data-[closed]:hidden sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <Dialog.Title className="text-base font-semibold tracking-tight">{title}</Dialog.Title>
          <Dialog.Close type="button" aria-label={t('cardInfo.close')}
            className="-mt-1 -mr-2 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <X className="size-4" aria-hidden="true" />
          </Dialog.Close>
        </div>
        <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">{t(`cardInfo.${topic}.description`)}</Dialog.Description>
        <h3 className="mt-5 mb-2 text-sm font-semibold">{t('cardInfo.calculation')}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t(`cardInfo.${topic}.calculation`)}</p>
        <p className="mt-5 rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground">{t(`cardInfo.${topic}.note`)}</p>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
