import { createFileRoute, notFound } from '@tanstack/react-router'
import { ProductPricesPage } from '@/features/analytics/product-prices-page'
import { parsePriceFilterSearch } from '@/features/analytics/price-route-search'

export const Route = createFileRoute('/prices_/$productId')({
  validateSearch: parsePriceFilterSearch,
  beforeLoad: ({ params }) => {
    const id = Number(params.productId)
    if (!Number.isSafeInteger(id) || id <= 0) throw notFound()
  },
  component: function ProductPricesRoute() {
    const { productId } = Route.useParams()
    const filters = Route.useSearch()
    return <ProductPricesPage key={productId} productId={Number(productId)} initialFilters={filters} />
  },
})
