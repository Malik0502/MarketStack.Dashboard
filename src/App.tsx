import { createRouter, RouterProvider } from "@tanstack/react-router"
import { routeTree } from "./routeTree.gen"

const router = createRouter({ routeTree, defaultViewTransition: {
  types: ({ pathChanged }) => pathChanged && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? ['route'] : false,
} })

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
