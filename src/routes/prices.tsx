import { createFileRoute } from '@tanstack/react-router'
import { PricesPage } from '@/features/analytics/prices-page'

export const Route = createFileRoute('/prices')({
  validateSearch: (search: Record<string, unknown>): { productId?: number } => {
    const id = Number(search.productId)
    return Number.isSafeInteger(id) && id > 0 ? { productId: id } : {}
  },
  component: function PricesRoute() {
    const { productId } = Route.useSearch()
    const navigate = Route.useNavigate()
    return <PricesPage selectedProductId={productId} onProductChange={id => void navigate({ search: { productId: id } })} />
  },
})
