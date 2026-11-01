import { useTranslation } from 'react-i18next'
import { useFormat } from '../format'
import type { HistoryPoint } from '../types'
import { EmptyState } from './dashboard-card'

export function HistoryTable({ expenses, taxes, loading }: {
  expenses: HistoryPoint[] | null; taxes: HistoryPoint[] | null; loading: boolean
}) {
  const { t } = useTranslation(['dashboard', 'common'])
  const { money, month } = useFormat()
  const dates = [...new Set([...(expenses ?? []), ...(taxes ?? [])].map(entry => entry.purchasedAt))].sort().reverse()
  if (loading || !dates.length) {
    return <EmptyState loading={loading} message={expenses === null && taxes === null ? t('error.table') : undefined} />
  }
  const format = (value: number | null | undefined) => value == null ? t('common:missing') : money(value)

  return <div className="overflow-x-auto">
    <table className="w-full min-w-[340px] text-left text-xs">
      <caption className="sr-only">{t('table.caption')}</caption>
      <thead><tr className="border-b text-[10px] font-medium tracking-wider text-muted-foreground uppercase">
        <th scope="col" className="pb-3 font-medium">{t('common:month')}</th>
        <th scope="col" className="pb-3 text-right font-medium">{t('common:expenses')}</th>
        <th scope="col" className="pb-3 text-right font-medium">{t('common:taxes')}</th>
      </tr></thead>
      <tbody>{dates.map(date => <tr key={date} className="border-b last:border-0 hover:bg-muted/40">
        <th scope="row" className="py-3.5 font-medium">{month(date, true)}</th>
        <td className="py-3.5 text-right font-medium tabular-nums">{format(expenses?.find(entry => entry.purchasedAt === date)?.expense)}</td>
        <td className="py-3.5 text-right text-muted-foreground tabular-nums">{format(taxes?.find(entry => entry.purchasedAt === date)?.expense)}</td>
      </tr>)}</tbody>
    </table>
  </div>
}
