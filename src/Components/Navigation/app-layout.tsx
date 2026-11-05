import { Outlet, useLocation } from '@tanstack/react-router'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import NavBar from './navbar'
import { PageContext } from './page-context'

export function AppLayout() {
  const { t } = useTranslation()
  const pathname = useLocation({ select: location => location.pathname })
  const previous = useRef<{ path: string; heading: HTMLElement | null }>({ path: pathname, heading: null })
  const [announcement, setAnnouncement] = useState('')
  const announce = useCallback((title: string) => {
    document.title = title
    setAnnouncement(title)
    const nextPath = window.location.pathname
    const heading = document.querySelector<HTMLElement>('#main-content h1')
    // Lazy route handoff can replace the heading after the URL already changed.
    // Follow that committed node too, but never refocus on filter/language updates.
    if (heading && (previous.current.path !== nextPath || (previous.current.heading !== null && previous.current.heading !== heading))) {
      heading.tabIndex = -1; heading.focus({ preventScroll: true })
    }
    previous.current = { path: nextPath, heading }
  }, [])
  return <PageContext value={announce}><div className="app-shell">
    <a className="skip-link" href="#main-content">{t('skipContent')}</a>
    <NavBar />
    <main id="main-content" className="app-main" tabIndex={-1}>
      <div className="route-view"><Outlet /></div>
    </main>
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announcement}</div>
  </div></PageContext>
}
