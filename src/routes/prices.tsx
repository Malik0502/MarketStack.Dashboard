import { createFileRoute } from '@tanstack/react-router'
import { PricesPage } from '@/features/analytics/prices-page'

export const Route = createFileRoute('/prices')({
  component: function PricesRoute() {
    const productId = Route.useSearch({ select: search => search.productId })
    const navigate = Route.useNavigate()
    return <PricesPage selectedProductId={productId} onProductChange={id => void navigate({ resetScroll: false, viewTransition: false, search: previous => ({ ...previous, productId: id }) })} />
  },
})
