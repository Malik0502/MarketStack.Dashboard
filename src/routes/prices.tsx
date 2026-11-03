import { createFileRoute } from '@tanstack/react-router'
import { PricesPage } from '@/features/analytics/prices-page'
import { parsePriceFilterSearch, type PriceFilterSearch } from '@/features/analytics/price-route-search'

export const Route = createFileRoute('/prices')({
  validateSearch: (search: Record<string, unknown>): PriceFilterSearch & { productId?: number } => {
    const id = Number(search.productId)
    return { ...parsePriceFilterSearch(search), ...(Number.isSafeInteger(id) && id > 0 ? { productId: id } : {}) }
  },
  component: function PricesRoute() {
    const { productId, ...filters } = Route.useSearch()
    const navigate = Route.useNavigate()
    return <PricesPage selectedProductId={productId} initialFilters={filters} onProductChange={id => void navigate({ search: previous => ({ ...previous, productId: id }) })} />
  },
})
