import { useCallback, useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { analytics, analyticsReferenceDate } from '../data-source'
import { analyticsPeriods, analyticsPeriodRange, type AnalyticsPeriod } from '../date-periods'
import { useAnalytics } from '../use-analytics'
import type { AnalyticsQuery, Catalog, GroupBy, Unit } from '../types'

export function AnalyticsFilters({ query, update, catalog, group = false, store = false, tags = false, quantities = false }: {
  query: AnalyticsQuery; update: (patch: Partial<AnalyticsQuery>) => void; catalog: Catalog | null
  group?: boolean; store?: boolean; tags?: boolean; quantities?: boolean
}) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const [choice, setChoice] = useState<({ period: AnalyticsPeriod } & Pick<AnalyticsQuery, 'from' | 'to'>) | null>(null)
  const to = analyticsReferenceDate()
  const periods = analyticsPeriods.map(period => ({ period, range: analyticsPeriodRange(period, to, catalog?.coverage ?? null) }))
  const selected = choice?.from === query.from && choice?.to === query.to ? choice.period
    : periods.find(({ range }) => range?.from === query.from && range.to === query.to)?.period
  return <div className="analytics-filters flex flex-wrap items-end gap-3">
    <fieldset className="analytics-period min-w-0">
      <legend className="mb-1.5 text-[11px] text-muted-foreground">{t('period.label')}</legend>
      <div className="range-control">
        {periods.map(({ period, range }) => <button key={period} type="button" aria-pressed={selected === period}
          aria-label={t(`period.${period}.label`)} title={range ? t(`period.${period}.label`) : t('period.unavailable')}
          disabled={!range} className="disabled:cursor-not-allowed disabled:opacity-50" onClick={() => {
            if (!range) return
            setChoice({ period, ...range })
            if (range.from !== query.from || range.to !== query.to) update(range)
          }}>{t(`period.${period}.short`)}</button>)}
      </div>
    </fieldset>
    {group && <label className="analytics-field">{t('groupBy')}<select value={query.groupBy} onChange={event => update({ groupBy: event.target.value as GroupBy })}>
      <option value="store">{t('groupStore')}</option><option value="chain">{t('groupChain')}</option>
    </select></label>}
    {store && <label className="analytics-field">{t('store')}<select value={query.storeId ?? ''} onChange={event => update({ storeId: event.target.value || undefined })}>
      <option value="">{t('allStores')}</option>{catalog?.stores.map(item => <option key={item.id} value={item.id}>{item.chain} · {item.name}</option>)}
    </select></label>}
    {tags && <label className="analytics-field">{t('tag')}<select value={query.tagId ?? ''} onChange={event => update({ tagId: event.target.value ? Number(event.target.value) : undefined })}>
      <option value="">{t('allTags')}</option>{catalog?.tags.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>}
    {quantities && <label className="analytics-field">{t('unit')}<select value={query.unit ?? ''} onChange={event => update({ unit: event.target.value as Unit || undefined })}>
      <option value="">{t('allUnits')}</option>{catalog?.units.map(unit => <option key={unit} value={unit}>{t(unit)}</option>)}
    </select></label>}
  </div>
}

export function ProductPicker({ value, onChange, selectedName }: { value: number | undefined; onChange: (id: number) => void; selectedName?: string }) {
  const { t } = useTranslation('dashboard', { keyPrefix: 'analytics' })
  const [search, setSearch] = useState('')
  const deferred = useDeferredValue(search)
  const load = useCallback((signal: AbortSignal) => analytics.catalog(deferred, signal), [deferred])
  const result = useAnalytics(load, `product-search:${deferred}`)
  const options = result.data?.products ?? []
  return <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
    <label className="analytics-field min-w-0 flex-1">{t('searchProduct')}
      <input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder={t('searchProduct')} />
    </label>
    <label className="analytics-field min-w-0 flex-1">{t('selectProduct')}
      <select value={value ?? ''} onChange={event => event.target.value && onChange(Number(event.target.value))}>
        {!value && <option value="">{t('selectProduct')}</option>}
        {value && !options.some(item => item.id === value) && <option value={value}>{selectedName ?? `#${value}`}</option>}
        {options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
    {result.status !== 'ready' && <p className="w-full text-xs text-muted-foreground" role="status">{t(result.status === 'error' ? 'error' : 'loading')}</p>}
    {result.status === 'ready' && !options.length && <p className="w-full text-xs text-muted-foreground">{t('noResults')}</p>}
    {result.data?.hasMore && <p className="w-full text-xs text-muted-foreground">{t('refineSearch')}</p>}
  </div>
}
