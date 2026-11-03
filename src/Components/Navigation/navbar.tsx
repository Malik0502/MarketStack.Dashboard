import { useId, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Layers2, LayoutDashboard, ShieldCheck, Wallet, ChartNoAxesCombined, Package, Store, PanelLeftOpen, PanelLeftClose } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function NavBar() {
  const { t } = useTranslation('navigation')
  const [expanded, setExpanded] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const navId = useId()
  const toggleLabel = t(expanded ? 'collapseNavigation' : 'expandNavigation')
  return <aside className="app-sidebar" data-expanded={expanded} onKeyDown={event => {
    if (event.key === 'Escape' && expanded && toggleRef.current?.getClientRects().length) {
      event.preventDefault()
      event.stopPropagation()
      setExpanded(false)
      toggleRef.current.focus()
    }
  }}>
    <Link to="/" className="brand" aria-label={t('brandHome')}>
      <span className="brand-mark"><Layers2 className="size-5" strokeWidth={2} /></span>
      <span className="brand-name">MarketStack<span className="text-primary">.</span></span>
    </Link>
    <button ref={toggleRef} type="button" className="sidebar-toggle" aria-expanded={expanded} aria-controls={navId}
      aria-label={toggleLabel} title={toggleLabel} onClick={() => setExpanded(value => !value)}>
      {expanded ? <PanelLeftClose className="size-[18px] shrink-0" aria-hidden="true" /> : <PanelLeftOpen className="size-[18px] shrink-0" aria-hidden="true" />}
      <span className="sidebar-toggle-text">{toggleLabel}</span>
    </button>
    <p className="sidebar-label">{t('analytics')}</p>
    <nav id={navId} aria-label={t('main')} className="sidebar-nav">
      <Link to="/" activeOptions={{ exact: true }} className="sidebar-link" title={t('home')}>
        <LayoutDashboard className="size-[18px]" strokeWidth={1.7} />
        <span>{t('home')}</span><span className="nav-active-dot" />
      </Link>
      {([
        ['/spending', 'spending', Wallet], ['/prices', 'prices', ChartNoAxesCombined],
        ['/products', 'products', Package], ['/stores', 'stores', Store],
      ] as const).map(([to, key, Icon]) => <Link key={to} to={to} className="sidebar-link" title={t(key)}>
        <Icon className="size-[18px]" strokeWidth={1.7} /><span>{t(key)}</span><span className="nav-active-dot" />
      </Link>)}
    </nav>
    <div className="sidebar-bottom">
      <div className="sidebar-info rounded-xl border p-4">
        <ShieldCheck className="mb-3 size-5 text-primary" strokeWidth={1.5} />
        <p className="text-xs font-medium">{t('privacyTitle')}</p>
        <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{t('privacyDescription')}</p>
      </div>
      <p className="mt-5 border-t pt-4 text-[10px] text-muted-foreground">MarketStack · {t('selfHosted')}</p>
    </div>
  </aside>
}
