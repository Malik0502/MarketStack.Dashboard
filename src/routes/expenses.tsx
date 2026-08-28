/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/expenses')({
  component: Expenses,
})

function Expenses() {
  return <div>Hello "/expenses"!</div>
}
