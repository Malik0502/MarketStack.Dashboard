import { Outlet, createRootRoute } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <div className="flex h-screen flex-col">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  ),
})