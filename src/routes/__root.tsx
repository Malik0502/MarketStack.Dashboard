import { createRootRoute } from '@tanstack/react-router'
import { AppLayout } from '@/Components/Navigation/app-layout'
import { NotFound } from '@/Components/Navigation/not-found'

export const Route = createRootRoute({ component: AppLayout, notFoundComponent: NotFound })
