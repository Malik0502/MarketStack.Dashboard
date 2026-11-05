import { expect, test } from '@playwright/test'

const pageErrors = new WeakMap<object, string[]>()
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-04T12:00:00Z'))
  const errors: string[] = []
  pageErrors.set(page, errors)
  page.on('pageerror', error => errors.push(error.message))
})
test.afterEach(({ page }) => { expect(pageErrors.get(page)).toEqual([]) })

test('period/store filters and selected product survive reload, history and detail return', async ({ page }) => {
  await page.goto('/prices')
  await page.locator('.analytics-filter-toggle').click()
  await page.locator('.analytics-period button').filter({ hasText: /^YTD$/ }).click()
  await expect(page).toHaveURL(/from=2026-01-01/)
  await page.getByRole('combobox', { name: 'Händler', exact: true }).selectOption('north-centre')
  await expect(page).toHaveURL(/storeId=north-centre/)
  await page.reload()
  await expect(page.locator('.analytics-period [aria-pressed=true]')).toHaveText('YTD')
  await page.locator('.analytics-filter-toggle').click()
  await expect(page.getByRole('combobox', { name: 'Händler', exact: true })).toHaveValue('north-centre')
  await page.getByRole('combobox', { name: 'Produkt auswählen', exact: true }).selectOption('2')
  await expect(page).toHaveURL(/productId=2/)
  await page.goBack()
  await expect(page.getByRole('combobox', { name: 'Produkt auswählen', exact: true })).toHaveValue('1')
  const link = page.locator('[data-table-state=price-increases] a').first()
  await link.click()
  await expect(page).toHaveURL(/\/prices\/\d+/)
  await expect(page).toHaveTitle(/MarketStack/)
  await page.getByRole('link', { name: /Zurück zur Preisübersicht/ }).click()
  await expect(page).toHaveURL(/storeId=north-centre/)
  await expect(page.locator('.analytics-period [aria-pressed=true]')).toHaveText('YTD')
})

test('tables retain independent sorting and pagination in the URL', async ({ page }) => {
  await page.goto('/prices')
  const increases = page.locator('[data-table-state=price-increases]')
  const decreases = page.locator('[data-table-state=price-decreases]')
  await increases.getByRole('button', { name: 'Zuletzt beobachtet', exact: true }).click()
  await expect(increases.locator('th[aria-sort=descending]')).toContainText('Zuletzt beobachtet')
  await page.evaluate(() => {
    const original = Array.prototype.sort
    Object.assign(window, { auditRankingSorts: 0 })
    Array.prototype.sort = function (compare) {
      if (this.length && this[0] && typeof this[0] === 'object' && 'productId' in this[0] && 'storeId' in this[0]) {
        const target = window as typeof window & { auditRankingSorts: number }
        target.auditRankingSorts++
      }
      return original.call(this, compare)
    }
  })
  await increases.getByRole('button', { name: 'Weiter', exact: true }).click()
  await expect(increases.locator('[role=status]')).toContainText('Seite 2')
  expect(await page.evaluate(() => (window as typeof window & { auditRankingSorts: number }).auditRankingSorts)).toBe(0)
  await decreases.getByRole('combobox', { name: 'Einträge pro Seite' }).selectOption('25')
  await page.reload()
  await expect(increases.locator('[role=status]')).toContainText('Seite 2')
  await expect(increases.locator('th[aria-sort=descending]')).toContainText('Zuletzt beobachtet')
  await expect(decreases.getByRole('combobox', { name: 'Einträge pro Seite' })).toHaveValue('25')
  await decreases.getByRole('combobox', { name: 'Einträge pro Seite' }).selectOption('0')
  await expect(decreases.locator('[role=status]')).toContainText('Seite 1 von 1')
  expect(await decreases.locator('tbody tr').count()).toBeGreaterThan(0)
})

test('card headings, route metadata and modal keyboard focus are semantic', async ({ page }) => {
  await page.goto('/prices')
  await page.locator('.sidebar-link[href="/products"]').click()
  await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
  await expect(page).toHaveTitle('Produktanalysen · MarketStack')
  await expect(page.getByRole('heading', { name: 'ABC-Verteilung', exact: true, level: 2 })).toBeVisible()
  const trigger = page.getByRole('button', { name: 'Mehr Informationen: ABC-Verteilung', exact: true })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleName('ABC-Verteilung')
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Tab')
  await expect.poll(() => dialog.evaluate(element => element.contains(document.activeElement))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
})

for (const language of ['de', 'en', 'fr', 'tr']) {
  test(`320px navigation and dialogs fit in ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 })
    await page.goto('/products')
    await page.locator('.language-control select').selectOption(language)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(() => page.locator('.sidebar-link > span:not(.nav-active-dot)').evaluateAll(elements => elements.every(element => element.scrollWidth <= element.clientWidth))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.locator('button[aria-haspopup=dialog]').first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
  })
}

test('tablet toggle, filter disclosure and state previews remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 })
  await page.goto('/products')
  const toggle = page.locator('.sidebar-toggle')
  await toggle.click(); await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await toggle.press('Escape'); await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  const filters = page.locator('.analytics-sticky-filters')
  await filters.locator('summary').click()
  await page.getByRole('combobox', { name: 'Tag', exact: true }).selectOption('1')
  await filters.locator('summary').press('Escape')
  await expect(filters).not.toHaveAttribute('open')
  await filters.locator('summary').click()
  await expect(page.getByRole('combobox', { name: 'Tag', exact: true })).toHaveValue('1')
  const preview = page.getByRole('combobox', { name: 'Vorschauzustand', exact: true })
  for (const state of ['loading', 'empty', 'error', 'noResults']) {
    await preview.selectOption(state)
    await expect(page.locator('.analytics-content').getByRole(state === 'error' ? 'alert' : 'status')).toBeVisible()
  }
  await preview.selectOption('error')
  await page.locator('.analytics-content button').click()
  await expect(page.getByRole('heading', { name: 'ABC-Verteilung', exact: true })).toBeVisible()
})

test('charts have one keyboard entry, full table data and reduced-motion support', async ({ page }) => {
  await page.goto('/prices')
  const chart = page.locator('svg.chart-interaction').first()
  await chart.focus(); await chart.press('Home')
  const detail = page.locator('[id$="-detail"]').first()
  const first = await detail.textContent()
  await chart.press('End')
  await expect(detail).not.toHaveText(first!)
  await chart.press('ArrowLeft')
  await expect(chart).toBeFocused()
  await expect(chart.locator('[tabindex]')).toHaveCount(0)
  await page.getByText('Alle Diagrammdaten als Tabelle', { exact: true }).first().click()
  await expect(page.locator('details').filter({ hasText: 'Alle Diagrammdaten als Tabelle' }).last().getByRole('table')).toBeVisible()
  await expect.poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true)
})

test('native route transitions work and unsupported browsers retain ordinary navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/prices')
  await page.locator('[data-table-state=price-increases] a').first().waitFor()
  await page.evaluate(() => {
    const original = document.startViewTransition.bind(document)
    const transitions: string[][] = []
    Object.assign(window, { auditTransitions: transitions })
    document.startViewTransition = ((options: Parameters<typeof original>[0]) => {
      transitions.push(typeof options === 'object' && options && 'types' in options ? [...(options.types ?? [])] : [])
      return original(options)
    }) as typeof document.startViewTransition
  })
  await page.locator('[data-table-state=price-increases] a').first().hover()
  await page.locator('[data-table-state=price-increases] a').first().click()
  await expect(page).toHaveURL(/\/prices\/\d+/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as typeof window & { auditTransitions: string[][] }).auditTransitions.length)).toBeGreaterThan(0)
  expect(await page.evaluate(() => (window as typeof window & { auditTransitions: string[][] }).auditTransitions.some(types => types.includes('nav-forward')))).toBe(true)
  expect(errors).toEqual([])
  await page.evaluate(() => Object.defineProperty(document, 'startViewTransition', { value: undefined, configurable: true }))
  await page.locator('.sidebar-link[href="/products"]').click()
  await expect(page.getByRole('heading', { name: 'Produktanalysen', level: 1 })).toBeVisible()
  expect(errors).toEqual([])
})

test('Home URL controls preserve its ten distinct API endpoints and metric values', async ({ page }) => {
  const calls: string[] = []
  await page.route('https://localhost:7065/api/**', async route => {
    const endpoint = new URL(route.request().url()).pathname.replace('/api', '')
    calls.push(endpoint)
    const data = endpoint.endsWith('history') ? { jan: { purchasedAt: '2026-01-01', expense: 100 }, oct: { purchasedAt: '2026-10-01', expense: 120 } } : 123
    await route.fulfill({ headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, json: { success: true, data } })
  })
  await page.goto('/')
  await expect(page.locator('.dashboard-card.kpi-accent')).toContainText('123,00')
  expect(new Set(calls).size).toBe(10)
  const initialCalls = calls.length // StrictMode may mount/abort the development effect twice.
  await page.locator('.range-control button').last().click()
  await page.locator('.series-control button').last().click()
  await expect(page).toHaveURL(/range=all/)
  await expect(page).toHaveURL(/series=taxes/)
  expect(calls).toHaveLength(initialCalls)
  await page.reload()
  await expect(page.locator('.range-control button').last()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.series-control button').last()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.dashboard-card.kpi-accent')).toContainText('123,00')
})

test('language chunk failures keep the current language and show an actionable error', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  await page.goto('/products')
  await expect(page.locator('html')).toHaveAttribute('lang', 'de')
  await page.route('**/src/i18n/locales/fr/**', route => route.abort())
  await page.locator('.language-control select').selectOption('fr')
  await expect(page.getByRole('alert')).toContainText('Prüfe die Verbindung')
  await expect(page.locator('.language-control select')).toHaveValue('de')
  expect(await page.evaluate(() => localStorage.getItem('marketstack.language'))).toBeNull()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('dark theme persists with correctly themed controls and responsive routes', async ({ page }) => {
  await page.goto('/products')
  await page.locator('.theme-switch').click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/spending', '/prices', '/products', '/stores', '/prices/1', '/user']) {
      await page.goto(route)
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.locator('html')).toHaveClass(/dark/)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await page.locator('.language-control select').evaluate(element => getComputedStyle(element).colorScheme)).toBe('dark')
    }
  }
})

for (const width of [320, 768, 1440]) {
  test(`all routes retain layout and a valid heading outline at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of ['/', '/spending', '/prices', '/products', '/stores', '/prices/1', '/user']) {
      await page.goto(route)
      await expect(page.locator('h1')).toHaveCount(1)
      if (route !== '/' && route !== '/user') await expect(page.locator('.analytics-layout')).not.toHaveAttribute('data-loading', 'true')
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      expect(await page.locator('h1,h2,h3,h4,h5,h6').evaluateAll(headings => {
        let previous = 0
        return headings.every(heading => { const level = Number(heading.tagName.slice(1)), valid = level <= previous + 1; previous = level; return valid })
      })).toBe(true)
      if (route === '/products' && width !== 768) await page.screenshot({ path: `test-results/products-${width}.png` })
    }
  })
}
