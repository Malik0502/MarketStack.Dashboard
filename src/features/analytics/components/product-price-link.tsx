import { addTransitionType, startTransition, type ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { analytics, analyticsKey, defaultAnalyticsQuery } from '../data-source'
import { analyticsCache } from '../resource-cache'
import type { PriceFilterSearch } from '../price-route-search'
import { routeViewTransition } from '@/common/config/route-motion'

export function ProductPriceLink({ productId, search, children, className }: {
  productId: number; search: PriceFilterSearch; children: ReactNode; className?: string
}) {
  const navigate = useNavigate()
  const prefetch = () => {
    const query = { ...defaultAnalyticsQuery(), ...search, productId }
    analyticsCache.prefetch(analyticsKey('prices', query), signal => analytics.prices(query, signal))
  }
  return <Link to="/prices/$productId" params={{ productId: String(productId) }} search={search} className={className}
    preload="intent" onFocus={prefetch} onPointerEnter={prefetch} onClick={event => {
      // Preserve native new-tab, middle-click and modifier-key behavior.
      if (event.button || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      startTransition(() => {
        addTransitionType('nav-forward')
        void navigate({ to: '/prices/$productId', params: { productId: String(productId) }, search, viewTransition: routeViewTransition(['nav-forward']) })
      })
    }}>{children}</Link>
}
