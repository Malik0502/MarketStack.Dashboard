import { createFileRoute } from '@tanstack/react-router'
import { ProductsPage } from '@/features/analytics/products-page'

export const Route = createFileRoute('/products')({ component: ProductsPage })
