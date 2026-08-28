/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/stores')({
  component: Stores,
})

function Stores() {
  return <div>Hello "/stores"!</div>
}
