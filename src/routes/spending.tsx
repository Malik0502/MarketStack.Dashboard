import { createFileRoute } from '@tanstack/react-router'
import { SpendingPage } from '@/features/analytics/spending-page'

export const Route = createFileRoute('/spending')({ component: SpendingPage })
