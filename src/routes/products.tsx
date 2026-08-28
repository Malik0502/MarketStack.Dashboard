/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/products')({
  component: Products,
})

function Products() {
  return <div>Hello "/products"!</div>
}
