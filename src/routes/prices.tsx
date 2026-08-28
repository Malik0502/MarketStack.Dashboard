/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/prices')({
  component: Prices,
})

function Prices() {
  return <div>Hello "/prices"!</div>
}
