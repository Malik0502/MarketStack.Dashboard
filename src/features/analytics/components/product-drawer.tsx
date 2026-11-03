import { useCallback } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFormat } from '@/i18n/format'
import { DashboardCard, EmptyState } from '@/features/dashboard/components/dashboard-card'
import { analytics } from '../data-source'
import { useAnalytics } from '../use-analytics'
import { AnalyticsState } from './analytics-layout'
import { DataTable } from './data-table'
import { PriceStatistics } from './price-statistics'
import type { AnalyticsQuery } from '../types'

export function ProductDrawer({ productId, query, onClose }: { productId: number | null; query: AnalyticsQuery; onClose: () => void }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const format = useFormat()
  const load = useCallback((signal: AbortSignal) => analytics.product(productId ?? 0, query, signal), [productId, query])
  const result = useAnalytics(load, `product:${productId}:${JSON.stringify(query)}`, 'ready', productId !== null)
  const data = result.data, item = data?.product
  return <Dialog.Root open={productId !== null} onOpenChange={open => { if (!open) onClose() }}>
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/60 data-[closed]:hidden" />
      <Dialog.Popup className="fixed inset-y-0 right-0 z-50 w-full max-w-3xl overflow-y-auto border-l bg-background p-5 shadow-xl outline-none data-[closed]:hidden sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <Dialog.Title className="text-lg font-semibold">{t('productDetails')}</Dialog.Title>
          <Dialog.Close className="flex size-9 items-center justify-center rounded-lg hover:bg-muted" aria-label={t('closeDetails')}><X className="size-4" /></Dialog.Close>
        </div>
        <Dialog.Description className="mb-5 text-sm text-muted-foreground">{item?.name ?? t('product')}</Dialog.Description>
        <AnalyticsState status={result.status} retry={result.retry}>
          {data && item ? <div className="space-y-4">
            <div className="flex flex-wrap gap-2">{item.tags.map(tag => <span key={tag.id} className="rounded-md border bg-card px-2 py-1 text-xs">{tag.name}</span>)}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DashboardCard title={t('purchases')}><p className="text-xl font-semibold">{format.number(item.purchases)}</p></DashboardCard>
              <DashboardCard title={t('quantity')}><p className="text-xl font-semibold">{format.number(item.quantity, 3)}</p><p className="mt-2 text-xs text-muted-foreground">{item.unit ? t(item.unit) : t('unknownUnit')} · {item.packSize ?? t('missing')}</p></DashboardCard>
              <DashboardCard title={t('itemExpenses')}><p className="text-xl font-semibold">{format.money(item.expenses)}</p></DashboardCard>
            </div>
            <h3 className="text-sm font-semibold">{t('priceStatistics')}</h3>
            <PriceStatistics stats={data.priceStats} compact />
            <p className="text-[11px] text-muted-foreground">{t('historicalNote')}</p>
            <Link to="/prices/$productId" params={{ productId: String(item.id) }} search={{ from: query.from, to: query.to }} className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">{t('openPrices')}</Link>
            <DashboardCard title={t('purchaseHistory')}>
              <p className="mb-3 text-[11px] text-muted-foreground">{t('purchaseHistoryNote')}</p>
              <DataTable resetKey={`${productId}:${JSON.stringify(query)}`} caption={t('purchaseHistory')} rows={data.recentPurchases} rowKey={row => row.lineId} columns={[
                { key: 'date', title: t('date'), render: row => format.date(row.purchasedAt), sortValue: row => row.purchasedAt },
                { key: 'store', title: t('merchant'), render: row => `${row.merchant.chain} · ${row.merchant.name}` },
                { key: 'quantity', title: t('quantity'), render: row => `${format.number(row.quantity, 3)} ${row.unit ? t(row.unit) : t('unknownUnit')}`, numeric: true },
                { key: 'price', title: t('unitPrice'), render: row => format.money(row.unitPrice), numeric: true },
                { key: 'expenses', title: t('itemExpenses'), render: row => format.money(row.expenses), numeric: true },
                { key: 'promotion', title: t('promotionPositions'), render: row => t(row.promotion ? 'yes' : 'no') },
              ]} />
            </DashboardCard>
          </div> : data && <EmptyState message={t('noResults')} />}
        </AnalyticsState>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>
}
