import { createFileRoute } from '@tanstack/react-router'
import { StoresPage } from '@/features/analytics/stores-page'

export const Route = createFileRoute('/stores')({ component: StoresPage })
