import type { ViewTransitionOptions } from '@tanstack/router-core'

// Firefox's live page snapshots can visibly compress async route content on
// first navigation. CSS sizing workarounds were insufficient
// browser. Use ordinary navigation until that compositor issue is resolved.
// Keep this narrow compatibility fallback shared by defaults and explicit links.
export function routeViewTransition(types: ViewTransitionOptions['types']): false | ViewTransitionOptions {
  if (typeof navigator !== 'undefined' && /Firefox\//.test(navigator.userAgent)) return false
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  return { types }
}
