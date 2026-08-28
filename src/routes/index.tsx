/* eslint-disable react-refresh/only-export-components */
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: RouteComponent,
})

function RouteComponent() {
  return(
    <div className="bg-white h-full">
    </div>
  )
}
