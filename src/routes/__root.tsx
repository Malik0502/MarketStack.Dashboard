import { Outlet, createRootRoute } from '@tanstack/react-router'
import NavBar from '../Components/Navigation/navbar'

export const Route = createRootRoute({
  component: () => (
    <div className="flex h-screen flex-col">
      <NavBar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  ),
})