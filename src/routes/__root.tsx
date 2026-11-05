import { createRootRoute } from '@tanstack/react-router'
import { AppLayout } from '@/Components/Navigation/app-layout'
import { NotFound } from '@/Components/Navigation/not-found'
import { parseFrontendSearch } from '@/lib/url-state'

export const Route = createRootRoute({ validateSearch: parseFrontendSearch, component: AppLayout, notFoundComponent: NotFound })
