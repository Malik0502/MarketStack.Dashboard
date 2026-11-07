import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker } from '@tanstack/react-router'
import { Trash2 } from 'lucide-react'
import { AppHeader } from '@/Components/Navigation/app-header'
import { Button } from '@/Components/ui/button'
import { DashboardCard } from '@/features/dashboard/components/dashboard-card'
import { findTags, removeTag, type Catalog, type Tag } from './tags'

export function AdminPage() {
  const { t } = useTranslation('user', { keyPrefix: 'admin' })
  const { t: user } = useTranslation('user')
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [name, setName] = useState('')
  const [search, setSearch] = useState('')
  const [tagSearch, setTagSearch] = useState('')
  const [assignmentSearch, setAssignmentSearch] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState<number[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const isMock = import.meta.env.VITE_ANALYTICS_SOURCE !== 'api'

  useEffect(() => {
    if (!isMock) return
    let active = true
    void import('@/features/analytics/mock/fixtures').then(({ tags, products }) => {
      if (active) setCatalog({ tags: tags.map(tag => ({ ...tag })), products: products.map(product => ({ id: product.id, name: product.name, tagIds: product.tags.map(tag => tag.id) })) })
    }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [isMock])

  const visible = useMemo(() => catalog?.products.filter(product => product.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())) ?? [], [catalog, search])
  const matchingTags = useMemo(() => findTags(catalog?.tags ?? [], tagSearch), [catalog, tagSearch])
  const assignmentTags = useMemo(() => findTags(catalog?.tags ?? [], assignmentSearch), [catalog, assignmentSearch])
  const product = catalog?.products.find(item => item.id === selected)
  const dirty = !!product && (draft.length !== product.tagIds.length || draft.some(id => !product.tagIds.includes(id)))
  useBlocker({ disabled: !dirty, shouldBlockFn: () => !window.confirm(user('leaveConfirm')), enableBeforeUnload: dirty })

  function createTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = name.trim()
    if (!value) { setError(t('required')); return }
    if (catalog?.tags.some(tag => tag.name.toLocaleLowerCase() === value.toLocaleLowerCase())) { setError(t('duplicate')); return }
    setCatalog(current => current && ({ ...current, tags: [...current.tags, { id: Math.max(0, ...current.tags.map(tag => tag.id)) + 1, name: value }] }))
    setName(''); setError(''); setMessage(t('created'))
  }

  function chooseProduct(id: number) {
    if (dirty && !window.confirm(t('discardConfirm'))) return
    const next = catalog?.products.find(item => item.id === id)
    setSelected(id); setDraft(next?.tagIds ?? []); setMessage('')
  }

  function save() {
    if (!product) return
    setCatalog(current => current && ({ ...current, products: current.products.map(item => item.id === product.id ? { ...item, tagIds: draft } : item) }))
    setMessage(t('saved'))
  }

  function deleteTag(tag: Tag) {
    const count = catalog?.products.filter(item => item.tagIds.includes(tag.id)).length ?? 0
    if (!window.confirm(user('tagDeleteConfirm', { name: tag.name, count }))) return
    setCatalog(current => current && removeTag(current, tag.id))
    setDraft(current => current.filter(id => id !== tag.id))
    setMessage(user('tagDeleted', { name: tag.name }))
  }

  return <>
    <AppHeader title={t('title')} />
    <div className="dashboard-page">
      <header className="mb-7"><h1 className="text-[28px] font-medium sm:text-[32px]">{t('title')}</h1><p className="mt-2 text-sm text-muted-foreground">{t('description')}</p></header>
      {!isMock ? <div className="data-notice mb-5" role="status">{t('unavailable')}</div> : <div className="data-notice notice-demo mb-5" role="status">{t('mockNotice')}</div>}
      {loadError && <p role="alert" className="mb-5 text-sm text-destructive">{t('loadError')}</p>}
      {isMock && catalog && <section aria-labelledby="tags-heading" className="space-y-4">
        <div><h2 id="tags-heading" className="text-lg font-medium">{t('section')}</h2><p className="mt-2 text-sm text-muted-foreground">{t('sectionDescription')}</p></div>
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
          <DashboardCard title={t('createTitle')} className="lg:col-span-1">
            <form onSubmit={createTag} className="space-y-4">
              <label className="analytics-field">{t('name')}<input name="tagName" autoComplete="off" maxLength={80} value={name} onChange={event => { setName(event.target.value); setError(''); setMessage('') }} aria-invalid={!!error} aria-describedby={error ? 'tag-error' : undefined} /></label>
              {error && <p id="tag-error" role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit">{t('create')}</Button>
            </form>
            <div className="mt-6 border-t pt-4"><h3 className="text-sm font-medium">{t('availableTags')}</h3>
              <label className="analytics-field mt-3">{user('tagSearch')}<input type="search" name="tagSearch" autoComplete="off" value={tagSearch} onChange={event => setTagSearch(event.target.value)} /></label>
              <ul className="mt-3 max-h-60 overflow-y-auto rounded-lg border">{matchingTags.map(tag => <li key={tag.id} className="flex min-h-10 items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-0"><span className="min-w-0 break-words">{tag.name}</span><Button type="button" variant="ghost" size="icon" aria-label={user('tagDeleteLabel', { name: tag.name })} title={user('tagDeleteLabel', { name: tag.name })} onClick={() => deleteTag(tag)}><Trash2 className="size-4" aria-hidden="true" /></Button></li>)}</ul>
              {!matchingTags.length && <p className="mt-3 text-xs text-muted-foreground" role="status">{user('tagNone')}</p>}
            </div>
          </DashboardCard>
          <DashboardCard title={t('assignTitle')} className="lg:col-span-2">
            <p className="mb-4 text-sm text-muted-foreground">{t('assignDescription')}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="analytics-field">{t('search')}<input type="search" name="productSearch" autoComplete="off" value={search} onChange={event => setSearch(event.target.value)} /></label>
              <label className="analytics-field">{t('product')}<select name="product" value={selected ?? ''} onChange={event => event.target.value && chooseProduct(Number(event.target.value))}>
                <option value="">{t('chooseProduct')}</option>
                {product && !visible.some(item => item.id === product.id) && <option value={product.id}>{product.name}</option>}
                {visible.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select></label>
            </div>
            {!visible.length && <p className="mt-3 text-sm text-muted-foreground" role="status">{t('noProducts')}</p>}
            {product ? <div className="mt-6 border-t pt-4"><fieldset><legend className="text-sm font-medium">{t('tagsFor', { product: product.name })}</legend><p className="mt-2 text-xs text-muted-foreground">{t('selectTags')}</p>
              <label className="analytics-field mt-4">{user('tagSearch')}<input type="search" name="assignmentTagSearch" autoComplete="off" value={assignmentSearch} onChange={event => setAssignmentSearch(event.target.value)} /></label>
              <p className="mt-4 text-xs text-muted-foreground">{user('tagSelected', { count: draft.length })}</p>
              <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border">{catalog.tags.filter(tag => draft.includes(tag.id) || assignmentTags.some(match => match.id === tag.id)).sort((a, b) => Number(draft.includes(b.id)) - Number(draft.includes(a.id))).map(tag => <label key={tag.id} className="flex min-h-10 min-w-0 cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-muted"><input type="checkbox" checked={draft.includes(tag.id)} onChange={event => { setDraft(current => event.target.checked ? [...current, tag.id] : current.filter(id => id !== tag.id)); setMessage('') }} /><span className="min-w-0 break-words">{tag.name}</span></label>)}</div>
              {!assignmentTags.length && <p className="mt-2 text-xs text-muted-foreground" role="status">{user('tagNone')}</p>}
            </fieldset><div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={save} disabled={!dirty}>{t('save')}</Button>{dirty && <span className="text-xs text-muted-foreground">{t('unsaved')}</span>}</div></div> : <p className="mt-6 border-t pt-4 text-sm text-muted-foreground">{t('chooseHint')}</p>}
          </DashboardCard>
        </div>
        <p className="text-sm text-muted-foreground" role="status" aria-live="polite">{message}</p>
      </section>}
    </div>
  </>
}
