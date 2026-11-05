import { expect, test, type Page } from '@playwright/test'
import { createServer, type ViteDevServer } from 'vite'
import { writeFile } from 'node:fs/promises'

test.use({ baseURL: 'http://127.0.0.1:5196' })
let server: ViteDevServer
let mock: typeof import('../../src/features/analytics/mock/analytics')
test.beforeAll(async () => {
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-browser-fixtures', server: { middlewareMode: true, watch: null, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  mock = await server.ssrLoadModule('/src/features/analytics/mock/analytics.ts')
})
test.afterAll(async () => { await server?.close() })
test.beforeEach(async ({ page }) => { await page.clock.setFixedTime(new Date('2026-11-04T12:00:00Z')) })

async function installApi(page: Page, transform: (resource: string, data: unknown) => unknown = (_, data) => data) {
  const calls: string[] = []
  await page.route('**/api/analytics/**', async route => {
    const url = new URL(route.request().url()), resource = url.pathname.split('/').at(-1)!
    calls.push(resource)
    const query = Object.fromEntries(url.searchParams)
    const filters = { from: query.from, to: query.to, productId: query.productId ? Number(query.productId) : undefined }
    const data = resource === 'catalog' ? mock.getCatalog(query.search)
      : resource === 'prices' ? mock.getPrices(filters)
      : resource === 'stores' ? mock.getStores(filters)
      : resource === 'products' ? mock.getProducts(filters)
      : mock.getSpending(filters)
    await route.fulfill({ json: { success: true, title: null, message: '', errorCode: 0, data: transform(resource, data) } })
  })
  return calls
}

test('API catalog requests are shared with the picker and across routes', async ({ page }) => {
  const calls = await installApi(page)
  await page.goto('/prices')
  await expect(page.getByRole('combobox', { name: 'Produkt auswählen', exact: true })).toHaveValue('1')
  await expect(page.locator('[data-table-state=price-increases]')).toBeVisible()
  expect(calls.filter(resource => resource === 'catalog')).toHaveLength(1)
  await page.locator('.sidebar-link[href="/stores"]').click()
  await expect(page.getByRole('combobox', { name: 'Produkt auswählen', exact: true })).toHaveValue('1')
  expect(calls.filter(resource => resource === 'catalog')).toHaveLength(1)
})

test('a malformed nested API payload shows the recoverable error UI', async ({ page }) => {
  let malformed = true
  await installApi(page, (resource, data) => {
    if (resource === 'prices' && malformed) return { ...(data as object), series: [{ storeId: 'a', label: 'a', points: [{ date: 'invalid', price: Infinity, count: 1 }] }] }
    return data
  })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/prices')
  await expect(page.locator('.analytics-content [role=alert]')).toBeVisible()
  malformed = false
  await page.getByRole('button', { name: 'Erneut versuchen', exact: true }).click()
  await expect(page.locator('svg.chart-interaction')).toBeVisible()
  expect(errors).toEqual([])
})

for (const size of [1000, 10000]) test(`${size} rows remain complete and dense chart SVG has a bounded rendering budget`, async ({ page }, testInfo) => {
  test.setTimeout(60000)
  await installApi(page, (resource, value) => {
    if (resource !== 'prices') return value
    const data = structuredClone(value) as ReturnType<typeof mock.getPrices>
    const seed = data.stability[0]
    data.stability = Array.from({ length: size }, (_, index) => ({ ...seed, productId: index + 1, storeId: `branch-${index}`, productName: `Product ${index + 1}` }))
    const start = Date.parse(`${data.range.from}T00:00:00Z`)
    const points = Array.from({ length: size }, (_, index) => ({ date: new Date(start + index * 600000).toISOString(), price: 1 + (index % 100) / 100, count: 1 }))
    data.series = [{ storeId: 'dense', label: 'Dense series', points }]
    data.stats = mock.priceStats(points.map((point, index) => ({ date: point.date, price: point.price, id: index })))
    return data
  })
  await page.goto('/prices')
  const chart = page.locator('svg.chart-interaction')
  await expect(chart).toBeVisible()
  expect(await chart.locator('circle').count()).toBeLessThanOrEqual(601)
  const table = page.locator('[data-table-state=price-stability]')
  await expect(table.locator('tbody tr')).toHaveCount(10)
  const start = performance.now()
  await table.getByRole('combobox', { name: 'Einträge pro Seite' }).selectOption('0')
  await expect(table.locator('tbody tr')).toHaveCount(size)
  const duration = performance.now() - start
  const artifact = testInfo.outputPath('render-budget.json')
  await writeFile(artifact, JSON.stringify({ sourceRows: size, initialDomRows: 10, allDomRows: size, allSelectionMs: duration, svgMarks: await chart.locator('circle').count() }, null, 2))
  await testInfo.attach('render-budget', { path: artifact, contentType: 'application/json' })
  await expect(table.locator('tr').last()).toHaveCSS('content-visibility', 'auto')
  await chart.focus(); await chart.press('End')
  await expect(page.locator('[id$="-detail"]').first()).toContainText('1,99')
})
