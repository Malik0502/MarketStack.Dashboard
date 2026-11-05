import { createFileRoute, notFound } from '@tanstack/react-router'
import { ProductPricesPage } from '@/features/analytics/product-prices-page'

export const Route = createFileRoute('/prices_/$productId')({
  beforeLoad: ({ params }) => {
    const id = Number(params.productId)
    if (!Number.isSafeInteger(id) || id <= 0) throw notFound()
  },
  component: function ProductPricesRoute() {
    const { productId } = Route.useParams()
    return <ProductPricesPage key={productId} productId={Number(productId)} />
  },
})
