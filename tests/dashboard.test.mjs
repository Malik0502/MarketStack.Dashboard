import { after, afterEach, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

let server
let dashboard
let selectors
let formatting
let preferences
let csv
let localization
const originalFetch = globalThis.fetch

before(async () => {
  server = await createServer({
    cacheDir: 'node_modules/.vite-tests',
    server: { middlewareMode: true, watch: null, ws: false },
    appType: 'custom',
    // Tests only use SSR modules; do not touch the running app's dependency cache.
    optimizeDeps: { noDiscovery: true, include: [] },
  })
  dashboard = await server.ssrLoadModule('/src/features/dashboard/data.ts')
  selectors = await server.ssrLoadModule('/src/features/dashboard/selectors.ts')
  formatting = await server.ssrLoadModule('/src/features/dashboard/format.ts')
  preferences = await server.ssrLoadModule('/src/lib/preferences.ts')
  csv = await server.ssrLoadModule('/src/features/dashboard/csv.ts')
  localization = await server.ssrLoadModule('/src/i18n/index.ts')
})
afterEach(() => { globalThis.fetch = originalFetch })
after(async () => { await server?.close() })

const history = {
  feb: { purchasedAt: '2026-02-01', expense: 0 },
  jan: { purchasedAt: '2026-01-01', expense: 120.25 },
}
const response = data => new Response(JSON.stringify({ success: true, data }), {
  headers: { 'Content-Type': 'application/json' },
})

test('history is chronological, immutable, and preserves genuine zero values', () => {
  const snapshot = structuredClone(history)
  const result = dashboard.normalizeHistory(history)
  assert.deepEqual(result.map(value => value.purchasedAt), ['2026-01-01', '2026-02-01'])
  assert.equal(result[1].expense, 0)
  result[0].expense = 1
  assert.deepEqual(history, snapshot)
})

test('malformed dates and non-finite amounts are rejected', () => {
  for (const point of [
    { purchasedAt: 'invalid', expense: 1 },
    { purchasedAt: '2026-13-01', expense: 1 },
    { purchasedAt: '2026-01-01', expense: NaN },
  ]) assert.throws(() => dashboard.normalizeHistory({ point }))
})

test('all ten real API contracts are loaded without losing ISO dates', async () => {
  const calls = []
  globalThis.fetch = async url => {
    calls.push(String(url))
    return response(String(url).includes('history') ? history : 42)
  }
  const result = await dashboard.loadDashboard(new AbortController().signal)
  assert.equal(calls.length, 10)
  assert.ok(calls.every(url => new URL(url).pathname.startsWith('/api/analytics/')))
  assert.ok(calls.some(url => new URL(url).pathname === '/api/analytics/expense/tax-history'))
  assert.ok(calls.some(url => new URL(url).pathname === '/api/analytics/receipt/total'))
  assert.equal(result.metrics.purchases, 42)
  assert.equal(result.expenses[0].purchasedAt, '2026-01-01')
  assert.deepEqual(result.errors, [])
  assert.ok(result.updatedAt instanceof Date)
})

test('partial HTTP failure does not replace missing data with zero', async () => {
  globalThis.fetch = async url => String(url).endsWith('/receipt/total')
    ? new Response('<html>Server error</html>', { status: 500 })
    : response(String(url).includes('history') ? {} : 0)
  const result = await dashboard.loadDashboard(new AbortController().signal)
  assert.equal(result.metrics.purchases, null)
  assert.equal(result.metrics.totalExpense, 0)
  assert.deepEqual(result.expenses, [])
  assert.deepEqual(result.errors, ['/analytics/receipt/total'])
})

test('API-level errors and wrong numeric types remain unavailable', async () => {
  globalThis.fetch = async url => String(url).endsWith('/receipt/total')
    ? new Response(JSON.stringify({ success: false, message: 'Unavailable' }))
    : response(String(url).includes('history') ? {} : '42')
  const result = await dashboard.loadDashboard(new AbortController().signal)
  assert.equal(result.metrics.purchases, null)
  assert.equal(result.metrics.totalExpense, null)
  assert.equal(result.errors.length, 8)
})

test('offline or aborted requests settle with explicit unavailable states', async () => {
  globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError') }
  const controller = new AbortController()
  controller.abort()
  const result = await dashboard.loadDashboard(controller.signal)
  assert.equal(result.errors.length, 10)
  assert.equal(result.updatedAt, null)
  assert.equal(result.expenses, null)
  assert.equal(result.taxes, null)
  assert.ok(Object.values(result.metrics).every(value => value === null))
})

test('mock totals are internally consistent and not combined with API state', () => {
  const { demoData } = dashboard
  const sum = entries => Math.round(entries.reduce((total, entry) => total + entry.expense, 0) * 100) / 100
  assert.equal(sum(demoData.expenses), demoData.metrics.totalExpense)
  assert.equal(sum(demoData.taxes), demoData.metrics.totalTax)
  assert.equal(demoData.updatedAt, null)
})

test('calendar windows cross years and represent missing months without zero-filling', () => {
  const expenses = [
    { purchasedAt: '2025-07-01', expense: 1 },
    { purchasedAt: '2025-12-01', expense: 2 },
    { purchasedAt: '2026-01-01', expense: 3 },
  ]
  const result = selectors.selectHistoryWindow({ expenses, taxes: null }, '6', new Date(2026, 0, 31))
  assert.deepEqual(result.expenses.map(point => point.expense), [null, null, null, null, 2, 3])
  assert.equal(result.taxes, null)
  const all = selectors.selectHistoryWindow({ expenses, taxes: [] }, 'all')
  assert.equal(all.expenses.length, 7)
  assert.equal(all.expenses.filter(point => point.expense !== null).length, 3)
})

test('expense and tax series share the current calendar window, not the latest recorded month', () => {
  const expenses = [{ purchasedAt: '2025-01-01', expense: 1 }]
  const taxes = [{ purchasedAt: '2026-01-01', expense: 2 }]
  const result = selectors.selectHistoryWindow({ expenses, taxes }, '6', new Date(2026, 0, 31))
  assert.equal(result.expenses.length, 6)
  assert.ok(result.expenses.every(point => point.expense === null))
  assert.equal(result.taxes.at(-1).expense, 2)
})

test('month comparison requires a consecutive, nonzero reference month', () => {
  const point = (purchasedAt, expense) => ({ purchasedAt, expense })
  assert.equal(selectors.getMonthlyChange(null), null)
  assert.equal(selectors.getMonthlyChange([point('2025-12-01', 100), point('2026-01-01', 80)]), -20)
  assert.equal(selectors.getMonthlyChange([point('2025-11-01', 100), point('2026-01-01', 80)]), null)
  assert.equal(selectors.getMonthlyChange([point('2025-12-01', 0), point('2026-01-01', 80)]), null)
})

test('12-month regression: November to October has exactly 12 ordered intervals', () => {
  const source = {
    expenses: [
      { purchasedAt: '2026-01-01', expense: 0 },
      { purchasedAt: '2026-10-01', expense: 80 },
    ], taxes: [],
  }
  const before = structuredClone(source)
  const result = selectors.selectHistoryWindow(source, '12', new Date(2026, 9, 31))
  assert.equal(result.months.length, 12)
  assert.equal(result.months[0], '2025-11-01')
  assert.equal(result.months.at(-1), '2026-10-01')
  assert.equal(new Set(result.months).size, 12)
  assert.equal(result.expenses[2].expense, 0)
  assert.equal(result.expenses[0].expense, null)
  assert.equal(result.expenses.filter(point => point.expense !== null).length, 2)
  assert.deepEqual(source, before)
})

test('month lengths and leap years do not cause rollover or off-by-one errors', () => {
  for (const now of [new Date(2024, 1, 29), new Date(2026, 0, 31), new Date(2026, 3, 30)]) {
    for (const range of ['6', '12']) {
      const result = selectors.selectHistoryWindow({ expenses: [], taxes: [] }, range, now)
      assert.equal(result.months.length, Number(range))
      assert.equal(result.months.at(-1), `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
      assert.ok(result.months.every(date => date.endsWith('-01')))
      assert.deepEqual(result.months, [...result.months].sort())
    }
  }
})

test('range changes do not retain stale months and future values stay outside fixed windows', () => {
  const data = { expenses: [
    { purchasedAt: '2025-11-01', expense: 5 },
    { purchasedAt: '2026-10-01', expense: 10 },
    { purchasedAt: '2026-11-01', expense: 999 },
  ], taxes: null }
  const now = new Date(2026, 9, 31)
  const twelve = selectors.selectHistoryWindow(data, '12', now)
  const six = selectors.selectHistoryWindow(data, '6', now)
  const again = selectors.selectHistoryWindow(data, '12', now)
  assert.equal(six.months[0], '2026-05-01')
  assert.equal(six.expenses.filter(point => point.expense !== null).length, 1)
  assert.deepEqual(again, twelve)
  assert.ok(!twelve.expenses.some(point => point.expense === 999))
  assert.equal(selectors.selectHistoryWindow(data, 'all', now).months.at(-1), '2026-11-01')
})

test('unavailable series remain null while loaded but missing months remain explicit gaps', () => {
  const result = selectors.selectHistoryWindow({ expenses: null, taxes: [] }, '12', new Date(2026, 9, 1))
  assert.equal(result.expenses, null)
  assert.equal(result.taxes.length, 12)
  assert.ok(result.taxes.every(point => point.expense === null))
  assert.deepEqual(selectors.selectHistoryWindow({ expenses: [], taxes: null }, 'all').months, [])
})

test('all four languages cover the same translation keys and interpolation variables', async () => {
  const paths = (value, prefix = '') => Object.entries(value).flatMap(([key, entry]) =>
    typeof entry === 'object' ? paths(entry, `${prefix}${key}.`) : [`${prefix}${key}`])
  const { resources } = await server.ssrLoadModule('/src/i18n/resources.ts')
  assert.ok(paths(resources.de).length > 100)
  const valueAt = (resource, path) => path.split('.').reduce((value, key) => value[key], resource)
  const variables = text => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map(match => match[1]).sort()
  for (const language of preferences.languages) {
    assert.deepEqual(paths(resources.de).sort(), paths(resources[language]).sort(), language)
    for (const path of paths(resources.en)) {
      const text = valueAt(resources[language], path)
      assert.equal(typeof text, 'string', `${language}: ${path}`)
      assert.ok(text.trim().length > 0, `${language}: ${path}`)
      assert.deepEqual(variables(text), variables(valueAt(resources.en, path)), `${language}: ${path}`)
    }
  }
})

test('the future user feature has complete status labels in all four languages', async () => {
  await localization.changeLanguage('de')
  assert.equal(localization.default.t('user:status'), 'In Arbeit')
  assert.equal(localization.default.t('navigation:user'), 'Benutzer')
  await localization.changeLanguage('en')
  assert.equal(localization.default.t('user:status'), 'In progress')
  assert.equal(localization.default.t('navigation:user'), 'User account')
  await localization.changeLanguage('fr')
  assert.equal(localization.default.t('user:status'), 'En cours')
  assert.equal(localization.default.t('navigation:user'), 'Compte utilisateur')
  await localization.changeLanguage('tr')
  assert.equal(localization.default.t('user:status'), 'Geliştirme aşamasında')
  assert.equal(localization.default.t('navigation:user'), 'Kullanıcı hesabı')
})

test('language selector labels follow the active UI language', async () => {
  const labels = {
    de: ['Sprache auswählen', 'Deutsch', 'Englisch', 'Französisch', 'Türkisch'],
    en: ['Select language', 'German', 'English', 'French', 'Turkish'],
    fr: ['Choisir la langue', 'Allemand', 'Anglais', 'Français', 'Turc'],
    tr: ['Dil seçin', 'Almanca', 'İngilizce', 'Fransızca', 'Türkçe'],
  }
  for (const language of preferences.languages) {
    await localization.changeLanguage(language)
    assert.deepEqual(['language', 'german', 'english', 'french', 'turkish'].map(key => localization.default.t(`navigation:${key}`)), labels[language])
    assert.equal(localization.default.resolvedLanguage, language)
  }
})

test('rendered language selector displays translated option names and its accessible label', async () => {
  const { PreferenceControls } = await server.ssrLoadModule('/src/Components/Navigation/preference-controls.tsx')
  const { ThemeContext } = await server.ssrLoadModule('/src/theme/theme-context.ts')
  const expected = {
    de: { label: 'Sprache auswählen', options: ['Deutsch', 'Englisch', 'Französisch', 'Türkisch'] },
    en: { label: 'Select language', options: ['German', 'English', 'French', 'Turkish'] },
    fr: { label: 'Choisir la langue', options: ['Allemand', 'Anglais', 'Français', 'Turc'] },
    tr: { label: 'Dil seçin', options: ['Almanca', 'İngilizce', 'Fransızca', 'Türkçe'] },
  }
  const previousLanguage = localization.default.language
  try {
    for (const language of preferences.languages) {
      await localization.changeLanguage(language)
      const html = renderToStaticMarkup(createElement(ThemeContext.Provider, {
        value: { theme: 'light', setTheme: () => {} },
      }, createElement(PreferenceControls)))
      assert.deepEqual([...html.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map(match => match[1]), expected[language].options)
      assert.ok(html.includes(`aria-label="${expected[language].label}"`))
      assert.doesNotMatch(html, /lang="en"/)
      assert.match(html, new RegExp(`<option value="${language}"[^>]*selected`))
    }
  } finally { await localization.changeLanguage(previousLanguage) }
})

test('language changes localize numbers, dates, percentages and CSV without changing data', async () => {
  const de = formatting.createFormat('de')
  const en = formatting.createFormat('en')
  const fr = formatting.createFormat('fr')
  const tr = formatting.createFormat('tr')
  assert.equal(de.number(1234.5, 1), '1.234,5')
  assert.equal(en.number(1234.5, 1), '1,234.5')
  assert.equal(de.month('2026-10-01', true), 'Oktober 2026')
  assert.equal(en.month('2026-10-01', true), 'October 2026')
  assert.equal(de.percent(27.8).replaceAll(/\s/g, ''), '27,8%')
  assert.equal(en.percent(27.8), '27.8%')
  assert.equal(de.decimal(12.5), '12,50')
  assert.equal(en.decimal(12.5), '12.50')
  assert.equal(fr.locale, 'fr-FR')
  assert.equal(fr.number(1234.5, 1).replaceAll(/\s/g, ''), '1234,5')
  assert.equal(fr.money(12.5).replaceAll(/\s/g, ''), '12,50€')
  assert.equal(fr.percent(27.8).replaceAll(/\s/g, ''), '27,8%')
  assert.equal(fr.decimal(12.5), '12,50')
  assert.equal(fr.month('2026-10-01', true), 'octobre 2026')
  assert.equal(fr.weekday(1), 'lundi')
  assert.ok(fr.date('2026-10-02').includes('oct.'))
  assert.equal(tr.locale, 'tr-TR')
  assert.equal(tr.number(1234.5, 1), '1.234,5')
  assert.equal(tr.money(12.5).replaceAll(/\s/g, ''), '€12,50')
  assert.equal(tr.percent(27.8).replaceAll(/\s/g, ''), '%27,8')
  assert.equal(tr.decimal(12.5), '12,50')
  assert.equal(tr.month('2026-10-01', true), 'Ekim 2026')
  assert.equal(tr.weekday(1), 'Pazartesi')
  const source = structuredClone(dashboard.demoData)
  const now = new Date(2026, 9, 31)
  await localization.changeLanguage('de')
  const windowDe = selectors.selectHistoryWindow(source, '12', now)
  await localization.changeLanguage('en')
  assert.equal(localization.default.t('navigation:overview'), 'Overview')
  assert.deepEqual(selectors.selectHistoryWindow(source, '12', now), windowDe)
  await localization.changeLanguage('fr')
  assert.equal(localization.default.t('navigation:overview'), 'Vue d’ensemble')
  assert.deepEqual(selectors.selectHistoryWindow(source, '12', now), windowDe)
  assert.deepEqual(source, dashboard.demoData)
  await localization.changeLanguage('tr')
  assert.equal(localization.default.t('navigation:overview'), 'Genel bakış')
  assert.deepEqual(selectors.selectHistoryWindow(source, '12', now), windowDe)
})

test('French plural forms and CSV labels remain French for zero, one, multiple and million counts', async () => {
  await localization.changeLanguage('fr')
  const t = localization.default.getFixedT('fr', 'dashboard')
  for (const [count, expected] of [[0, '0 produit distinct'], [1, '1 produit distinct'], [2, '2 produits distincts'], [1000000, '1000000 produits distincts']]) {
    assert.equal(t('analytics.abcDisplay.products', { count, value: String(count) }), expected)
  }
  const result = csv.buildHistoryCsv(['2026-01-01'], [{ purchasedAt: '2026-01-01', expense: 12.5 }], null,
    [localization.default.t('common:month'), t('csv.expenses'), t('csv.taxes')], formatting.createFormat('fr').decimal)
  assert.equal(result, '\uFEFFMois;Dépenses EUR;Taxes EUR\r\n2026-01-01;12,50;')
})

test('Turkish counts and CSV exports use Turkish text while keeping EUR and ISO dates', async () => {
  await localization.changeLanguage('tr')
  const t = localization.default.getFixedT('tr', 'dashboard')
  for (const count of [0, 1, 2, 1000000]) {
    assert.equal(t('analytics.abcDisplay.products', { count, value: String(count) }), `${count} farklı ürün`)
  }
  const result = csv.buildHistoryCsv(['2026-01-01'], [{ purchasedAt: '2026-01-01', expense: 12.5 }], null,
    [localization.default.t('common:month'), t('csv.expenses'), t('csv.taxes')], formatting.createFormat('tr').decimal)
  assert.equal(result, '\uFEFFAy;Harcamalar EUR;Vergiler EUR\r\n2026-01-01;12,50;')
})

test('CSV keeps gaps empty, zero numeric, ISO dates stable and headers escaped', () => {
  const result = csv.buildHistoryCsv(['2026-01-01', '2026-02-01'], [
    { purchasedAt: '2026-01-01', expense: 0 },
    { purchasedAt: '2026-02-01', expense: null },
  ], null, ['Month', 'Expenses; EUR', 'Taxes EUR'], formatting.createFormat('en').decimal)
  assert.equal(result, '\uFEFFMonth;"Expenses; EUR";Taxes EUR\r\n2026-01-01;0.00;\r\n2026-02-01;;')
})

test('preference resolution supports system defaults, explicit choices and language fallbacks', () => {
  assert.equal(preferences.resolveTheme(null, true), 'dark')
  assert.equal(preferences.resolveTheme(null, false), 'light')
  assert.equal(preferences.resolveTheme('light', true), 'light')
  assert.equal(preferences.resolveTheme('dark', false), 'dark')
  assert.equal(preferences.resolveTheme('invalid', true), 'dark')
  assert.equal(preferences.resolveLanguage('en-US'), 'en')
  assert.equal(preferences.resolveLanguage('de-AT'), 'de')
  assert.deepEqual(preferences.languages, ['de', 'en', 'fr', 'tr'])
  assert.equal(preferences.resolveLanguage('fr-FR'), 'fr')
  assert.equal(preferences.resolveLanguage('FR_ca'), 'fr')
  assert.equal(preferences.resolveLanguage('tr-TR'), 'tr')
  assert.equal(preferences.resolveLanguage('TR_cy'), 'tr')
  assert.equal(preferences.resolveLanguage('es-ES'), 'de')
  assert.equal(preferences.resolveLanguage(undefined), 'de')
  assert.doesNotThrow(() => preferences.writePreference('test', 'value'))
})

test('pre-paint bootstrap agrees with theme resolution, even when localStorage is blocked', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1]
  for (const saved of [null, 'light', 'dark', 'invalid', 'blocked']) {
    for (const systemDark of [true, false]) {
      let applied
      const style = {}
      runInNewContext(script, {
        localStorage: { getItem() { if (saved === 'blocked') throw Error('blocked'); return saved } },
        matchMedia: () => ({ matches: systemDark }),
        document: { documentElement: { style, classList: { toggle: (_name, value) => { applied = value } } } },
      })
      const expected = preferences.resolveTheme(saved === 'blocked' ? null : saved, systemDark)
      assert.equal(applied, expected === 'dark')
      assert.equal(style.colorScheme, expected)
    }
  }
})
