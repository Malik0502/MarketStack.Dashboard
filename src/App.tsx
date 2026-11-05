import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"
import { routeViewTransition } from "./common/config/route-motion"

const router = createRouter({ routeTree, defaultViewTransition: routeViewTransition(
  ({ pathChanged }) => pathChanged && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? ['route'] : false,
) })

declare module "@tanstack/react-router"{
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return (
    <RouterProvider router={router}/>
  )
}
