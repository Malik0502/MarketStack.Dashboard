# MarketStack Dashboard Architecture

## Purpose and scope

MarketStack.Dashboard is a client-side application for analyzing imported
shopping receipts. It displays purchase metrics, monthly spending and tax
histories, shopping insights, and downloadable monthly reports.

The frontend consumes the MarketStack REST API. Receipt imports, persistence,
and metric calculations belong to the backend. The dashboard is responsible
for request handling, calendar-based projections, localization, and presentation.

## Technology stack

| Area | Technology |
| --- | --- |
| Application | React and TypeScript |
| Development and bundling | Vite |
| Routing | TanStack Router with file-based routes |
| Styling | Tailwind CSS and CSS custom properties |
| UI primitives | shadcn/ui components built on Base UI |
| Icons | Lucide React |
| Translations | i18next and react-i18next |
| Locale formatting | Native `Intl` APIs |
| Dashboard charts | Responsive SVG renderer |
| Automated tests | Node.js test runner with Vite module loading |

Dependency versions are defined in `package.json` and pinned by `package-lock.json`.

## Project structure

```text
src/
  main.tsx                        Application bootstrap and providers
  App.tsx                         Router provider
  index.css                       Theme tokens, layout, and shared styling
  routeTree.gen.ts                Generated route definitions
  routes/
    __root.tsx                    Root layout and not-found registration
    index.tsx                     Dashboard route
    user.tsx                      User-area route
  api/
    apiClient.ts                  Shared HTTP client and response handling
    objects/                      API response and DTO types
    services/                     Additional endpoint adapters
  common/config/constants.ts      API base URL
  Components/
    ui/                           Shared shadcn UI primitives
    Navigation/
      app-layout.tsx              Application shell and route outlet
      app-header.tsx              Sticky header, preferences, and user link
      navbar.tsx                  Responsive sidebar navigation
      preference-controls.tsx     Theme switch and language selector
      not-found.tsx               Unknown-route view
  features/
    dashboard/
      dashboard.tsx               Card composition, filters, and export actions
      types.ts                    Dashboard and chart data contracts
      data.ts                     API loading, validation, and demo fixture
      use-dashboard.ts            Request lifecycle and dashboard data state
      selectors.ts                Calendar windows and monthly comparisons
      csv.ts                      Monthly CSV serialization
      format.ts                   Re-export of shared locale formatters
      components/
        dashboard-card.tsx        Card wrapper and empty state
        dashboard-header.tsx      Status, toolbar, notices, and data help
        kpi-card.tsx              Metric and optional change indicator
        expense-chart.tsx         Interactive monthly chart
        insight-cards.tsx         Shopping profile and monthly comparison
        history-table.tsx         Monthly data table
    user/
      user-page.tsx               User-feature availability notice
  theme/                          Theme provider and context
  i18n/
    index.ts                      Translation resources and initialization
    format.ts                     Shared Intl formatters and formatting hook
    locales/{de,en,fr,tr}/        Translation JSON files
  lib/
    preferences.ts                Storage access and preference resolution
    utils.ts                      Shared utilities
tests/                            Automated regression and palette tests
```

Route files register pages; feature components own page behavior. Shared
navigation and UI primitives do not fetch dashboard data. Data loading,
transformations, formatting, and rendering have separate modules.

## Routing and navigation

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `Dashboard` | Purchase analytics and reporting |
| `/spending` | `SpendingPage` | Tag/store distribution, frequency, weekdays and notable purchases |
| `/prices` | `PricesPage` | Comparable observed prices, changes and stability |
| `/prices/$productId` | `ProductPricesPage` | Dedicated product price statistics/history with return navigation |
| `/products` | `ProductsPage` | Product rankings, quantities, tags, Pareto and detail drawer |
| `/stores` | `StoresPage` | Branch/chain analytics and historical product comparisons |
| `/user` | `UserPage` | Availability notice for future user features |
| Unmatched paths | `NotFound` | Localized message and return link |

`AppLayout` renders the sidebar, skip link, and route outlet. `AppHeader`
provides the page label, theme and language controls, and user icon. The
dashboard supplies its API status and help action to this shared header.

Navigation uses TanStack Router links for client-side transitions and active
states. Production hosting must serve `index.html` for application routes so
direct visits and reloads work. There are no workspace controls or sidebar
links that only scroll to dashboard sections.

`routeTree.gen.ts` is maintained by the TanStack Router Vite plugin. Add route
files under `src/routes/` rather than editing the generated route tree manually.

## API integration

The backend uses .NET, EF Core, and PostgreSQL. Its receipt-import pipeline
provides the data used by the analytics endpoints. Database entities are not
frontend contracts unless an API explicitly exposes them.

The API base URL is read from `VITE_API_URL` by `src/common/config/constants.ts`
(HTTP(S) URL or root-relative `/api`; previous localhost default retained). Endpoint
paths below are relative to that URL. Requests use the shared `apiFetch` helper.

### Response envelope

Responses use `DataResponse<T>` with `success`, `data`, `message`, `title`,
and `errorCode` fields. The loader accepts a result only when the response
indicates success and contains valid data. HTTP errors, malformed response
bodies, failed envelopes, and invalid values become endpoint-level failures.

### Dashboard endpoints

| GET endpoint | Data type | Meaning |
| --- | --- | --- |
| `/expense/total` | `number` | Sum of `TaxBaseAmount` |
| `/expense/total-tax` | `number` | Sum of `TaxAmount` |
| `/expense/percentage-change` | `number` | Growth in cumulative expenses contributed by recent receipts |
| `/expense/tax-percentage-change` | `number` | Growth in cumulative taxes contributed by recent receipts |
| `/expense/history` | `Record<string, MonthlyExpense>` | Monthly expenses |
| `/expense/tax-history` | `Record<string, MonthlyExpense>` | Monthly taxes |
| `/receipt/total` | `number` | Imported receipt count |
| `/receipt/average-purchase-value` | `number` | Average purchase value |
| `/receipt/average-items` | `number` | Average items per purchase |
| `/receipt/discount-share` | `number` | Promotional item share, expressed as a percentage |

```ts
interface MonthlyExpense {
  purchasedAt: string // YYYY-MM-01
  expense: number
}
```

History records are validated and sorted by their ISO purchase dates, not
dictionary keys. Formatting never replaces the stored ISO dates.

The dashboard calls only these read endpoints. Product lists, store lists,
individual receipt lists, market prices, and budgets are not available through
its current API integration.

## Data lifecycle and state

```text
API responses
  -> data.ts: validate and normalize
  -> use-dashboard.ts: retain data and loading state
  -> selectors.ts: derive the selected calendar window
  -> components / CSV: format and present values
```

`loadDashboard` loads the ten endpoints in parallel. Failures are recorded
individually so successful responses remain usable. `useDashboard` owns loading,
refresh, live data, and demo selection. Requests are aborted after twelve seconds
or when the component unmounts. Theme and language changes do not reload data.

| Value | Meaning |
| --- | --- |
| Metric `null` | Value is unavailable |
| Metric or expense `0` | A genuine recorded zero |
| Raw history `[]` | A successfully loaded history with no records |
| History series `null` | The series is unavailable |
| `HistoryPoint.expense === null` | No recorded value for that calendar month |

Missing or failed values must not be converted to zero. Cards display an
unavailable marker; charts and tables distinguish gaps from recorded values.

Demo data is an explicit opt-in fixture in `data.ts`. It is displayed with a
visible mock-data notice and is never merged with live API results. Returning
to API mode restores the live data state.

## Metric semantics

- Summary metrics cover all recorded purchases, independently of the chart filter.
- Expenses use the backend's `TaxBaseAmount`; taxes use `TaxAmount`. The frontend
  does not infer additional net/gross amounts or tax ratios from these names.
- The weekly indicators represent growth in a cumulative total, not a comparison
  between two weeks. Their percentage is `(total - priorTotal) / priorTotal * 100`,
  where `priorTotal` excludes receipts in the backend's recent seven-day window.
- Promotional share is already a percentage; it must not be multiplied by 100
  again before display.
- Weighed items count as one item per receipt line, following backend rules.
- Monthly change requires consecutive recorded months and a nonzero reference
  month: `(latest - previous) / previous * 100`.
- Ongoing months may be incomplete. Empty datasets can cause backend averages or
  percentage calculations to fail; those responses remain unavailable in the UI.

## Calendar windows and charts

`selectHistoryWindow` derives a shared monthly axis for expenses and taxes.

| Filter | Interval |
| --- | --- |
| Last 6 months | Six calendar months including the current local month |
| Last 12 months | Twelve calendar months including the current local month |
| All time | Earliest through latest recorded month across both series |

Month arithmetic uses integer month indices, avoiding rollover errors caused
by day-based calculations around month ends or leap years. Fixed windows
contain exactly six or twelve positions, even when records are missing.
The API returns full histories without date parameters; filtering is client-side.

The selector returns a new projection without modifying source data. An
available series is aligned to each monthly position with `null` for missing
records. An unavailable series stays `null`. An all-time window without any
records has no positions.

`ExpenseChart` uses a container-responsive SVG viewBox. Desktop layouts show
all labels for six- and twelve-month windows. Narrow layouts reduce label
density while retaining every monthly position for keyboard, pointer, and
touch interaction. Lines and filled areas stop at missing values rather than
connecting across gaps. Displayed totals sum available values only; the
calendar-month count and recorded-month count are shown separately.

The monthly table exposes the same window as readable values. The monthly
focus card uses the latest recorded month from the full expense history,
independently of the selected chart period.

## CSV export

`buildHistoryCsv` serializes the shared selected window using:

- UTF-8 with a byte order mark;
- semicolon-separated, escaped fields;
- localized headers and decimal values;
- unchanged ISO month dates;
- empty fields for missing values and numeric values for genuine zeros.

Export is available when the selected window contains at least one expense or
tax value. Demo filenames include `MOCK` to distinguish them from live reports.

## Layout, themes, and accessibility

The desktop dashboard uses a twelve-column CSS grid. Cards declare their own
column spans and stack at narrower widths. The sidebar becomes an icon rail
on tablets (768–1199px), with a localized toggle to expand it to the full 228px
navigation including labels and collapse it back to the 76px icon rail. The main
content margin follows the width rather than being covered by an overlay. The
toggle exposes `aria-expanded`/`aria-controls`; Escape collapses the expanded
tablet navigation and returns focus to the toggle. Expansion is retained while
navigating between pages in the current app session. The toggle is hidden on
desktop and mobile, whose existing layouts remain unchanged.
Below 768px the same five route links become a fixed
bottom navigation bar with icons and localized labels; no duplicate navigation
DOM or route definitions are needed. User, theme and language controls remain
in the sticky top header. Page padding reserves the bar height and the device's
bottom safe area so final rows/actions remain reachable. Sticky analytics filter
panels also reserve this space on short screens; dialogs remain above navigation.

The shared header uses `position: sticky`, `top: 0`, an opaque themed background,
and an elevated stacking order. Its responsive height accommodates controls
while keeping them visible during scrolling on dashboard and user pages.

Theme tokens in `src/index.css` define surfaces, borders, text, actions, and
semantic colors. Light mode uses cool neutral surfaces; dark mode uses slate
surfaces with light text. Expenses use cyan accents, taxes use violet, and
red/green indicate increasing/decreasing expenses. Components should consume
these tokens instead of introducing theme-specific hardcoded colors.

`ThemeProvider` supplies the active theme through context. The
`marketstack.theme` localStorage key stores `light` or `dark`. Without a valid
saved preference, the system color scheme applies and follows system changes.
A synchronous script in `index.html` applies the initial class and color scheme
before paint. Storage failures do not prevent in-memory theme selection.

Accessibility includes a skip link, named navigation, visible focus indicators,
`aria-pressed` filter controls, keyboard-accessible chart positions, and reduced
motion support. `tests/palette.test.mjs` checks minimum contrast ratios of 7:1
for main text, 4.5:1 for secondary text, and 3:1 for chart accents.

## Internationalization

Translation resources live in `src/i18n/locales/{de,en,fr,tr}/`:

| Namespace | Content |
| --- | --- |
| `common` | Shared actions, loading, missing values, and not-found text |
| `navigation` | Navigation, preferences, and language names |
| `dashboard` | Metrics, charts, filters, notices, insights, and exports |
| `user` | User-page availability notice |

Components use typed translation keys through react-i18next. The
`marketstack.language` localStorage key stores `de`, `en`, `fr` or `tr`. The initial language
comes from the saved preference or the first supported entry in `navigator.languages`;
unsupported lists fall back to German. Regional variants such as `fr-FR`/`fr-CA` and `tr-TR` resolve to
French and Turkish respectively.
Theme and language preferences are independent. All four namespaces, including
analytics explanations and accessible labels, are translated in all four languages.
Language entry modules are loaded on demand through an i18next backend. The initial
language and German fallback are ready before mounting React. Switching languages
loads one language chunk without resetting the page, and only the latest requested
selection wins. Load failures retain the active language and display a localized
connection/reload message. The complete resource map in `src/i18n/resources.ts` is
used for types/tests, not eagerly imported by the running application.

The language selector and its accessible label follow the active UI language:
"Deutsch / Englisch / Französisch / Türkisch", "German / English / French / Turkish",
"Allemand / Anglais / Français / Turc", or "Almanca / İngilizce / Fransızca / Türkçe".
The language codes and saved preference remain
unchanged when the displayed option names are translated.

`src/i18n/format.ts` centralizes native `Intl` formatting for de-DE, en-GB, fr-FR and tr-TR,
including numbers, decimal values, EUR amounts, percentages, months, and times.
Formatter objects are reused per locale and option set, including dates and weekdays.
Language changes update the document language, title, and meta description
without resetting data, filters, or demo state. Brand names, API identifiers,
and ISO dates are not translated.
Tests enforce equal resource keys and interpolation variables across all four
languages. Explicit `_many` resources support French million-count plural forms;
the matching keys in German/English retain their existing plural wording. French
period shortcuts use 1S (semaine) and 1A (an); preset calculations and API filters
are language-independent. Turkish shortcuts use 1H (hafta), 1A (ay), 1Y (yıl)
and Maks. French and Turkish CSV headers/decimal formatting are tested too.
Turkish formatting uses its native percentage placement (e.g. `%27,8`); amounts
remain denominated in EUR, not TRY, because language selection does not convert currency.

## User area

The user icon opens `/user`, which displays a localized availability notice:
"In Arbeit" in German, "Coming soon" in English, "Bientôt disponible" in French
and "Yakında" in Turkish. The page shares the sticky
header and preference controls. Authentication, account settings, and user
management are not implemented.

## Thematic analytics pages

`src/features/analytics/` extends the existing shell, sticky header, theme tokens,
translation resources, `DashboardCard`, `KpiCard`, and empty-state patterns.
Home's components, data services, metrics and filters remain independent.

```text
features/analytics/
  types.ts                 DTOs and interchangeable data-source interface
  data-source.ts           API adapter, source selection, query validation
  use-analytics.ts         Subscription to shared abortable keyed requests and UI states
  resource-cache.ts        In-flight deduplication, freshness, cancellation and retry
  validate-payload.ts      Runtime DTO checks using the documented JSON Schema
  use-filters.ts           Router-backed filter state and shared catalog loading
  mock/fixtures.ts         Deterministic synthetic receipts and metadata
  mock/analytics.ts        Mock projections matching proposed API contracts
  components/              Filters, product picker, charts, tables, detail drawer
  *-page.tsx               The four page compositions
```

The new pages default to a clearly labeled mock source. No mock data replaces
Home's existing API responses. Setting `VITE_ANALYTICS_SOURCE=api` selects the
proposed analytics endpoints through the shared HTTP client, with no automatic
fallback. Source selection does not require changes to page components.

The complete backend specification is
[analytics-api-requirements.md](analytics-api-requirements.md), with exhaustive
JSON DTO definitions in [analytics-api.schema.json](analytics-api.schema.json).
Those proposed endpoints are not existing backend features. The contract
documents price/unit limitations, allocation rules, filters, examples, edge
cases and aggregate calculations needed for a server implementation.

Analytics period filters use inclusive UTC day boundaries and compact 1W/1S, 1M,
YTD, 1J/1Y/1A and Max buttons, without editable date inputs or a reset button.
The default is one rolling calendar year. Mock periods end at the fixed fixture
coverage date; API periods end at the current UTC date. Month/year subtraction
clamps invalid month-end days and adds one day for the inclusive start. Max
begins at the catalog's earliest date without the previous ten-year limit.
The API still receives `from`/`to`; existing date-bearing links remain supported.
Changing the period keeps other filters and resets product pagination. These
filters do not alter Home's current-local-month semantics.
The global date/extra-filter bar remains sticky below the app header on every
analytics page, including the dedicated product price page. A local ResizeObserver
tracks the actual header height so wrapping, resizing and language changes do
not cause overlap. The bar sits above table headers but below dialogs, and is
height-limited with internal scrolling for short viewports. The last rendered
content height is retained during reloads so editing a pinned filter does not
collapse the page and jump the user back to the top. Home is unaffected.
The filter bar starts collapsed as a compact native `details`/`summary` disclosure
with a filter icon, the selected period and a count of active extra filters.
Opening it reveals the existing controls and data coverage; closing it preserves
all selections. Enter/Space toggle the disclosure; Escape closes it and returns
focus to the summary. All labels are localized. The expanded mobile controls
remain a single horizontally swipeable row; collapsed fields are hidden and
excluded from keyboard navigation by native disclosure semantics.
The price overview retains its picker selection in the validated `productId` URL
search parameter. Clicking product links opens the dedicated `/prices/$productId`
page instead of updating the overview in place. The path ID is validated, and
date/store URL context is carried into the detail view and back to the overview.
Both views share `ProductPriceAnalysis` and the existing prices API contract;
the dedicated page does not display global rankings. The non-nested file route
`prices_.$productId.tsx` keeps the product view separate from the overview layout.
Product details on Products still use a modal Base UI dialog with focus management.

Counts distinguish receipts, lines, products, quantities and promotional lines.
Multi-tag spending is allocated rather than duplicated. Quantities require
comparable units; price comparisons require verified product/pack identity.
Historical price gaps are not current offers or promotional savings. No
promotion-conditioned average price is part of the contracts or UI.

Mock-mode preview controls expose loading, empty, error and no-results states.
Request keys and cancellation prevent stale data after filter changes. Tables
sort complete table result sets locally before independent pagination; the product list requests complete-population
sorting and pagination from its source. Chart, aggregate and DTO/schema consistency
unit tests use the same deterministic fixtures. A separate Playwright suite verifies
actual browser behavior, including API-mode responses and large synthetic datasets.

### URL state, accessibility, and rendering budgets

The root route validates URL state in `src/lib/url-state.ts`. Analytics period,
grouping, product/store/tag/unit and product source pagination derive directly from
validated router search, so reload/history changes cannot leave a second local
filter state behind. Meaningful filter/page changes push history; local table sort
and page-size changes replace the current entry. Each ranking/table has a stable
namespaced key under `tables`. Changing analytics filters clears dependent local
table state. Hover, chart point selection, native disclosure state and modal focus
remain transient. Home's chart `range` and `series` are also URL-backed, with its
existing metric requests and calendar calculations unchanged.

`AnalyticsFilters` is a frame with a shared period control and composed
`GroupingFilter`, `StoreFilter`, `TagFilter` and `UnitFilter` children. Resource
statuses have an explicit union and exhaustive message mapping. Shared cards use
contextual h2/h3/h4 levels, leaving the primitive CardTitle unchanged. Headers set
localized page/product titles and announce navigation. Committed route headings
receive focus; filters and language changes do not steal it. Dialogs preserve Base
UI focus management and add scroll containment/safe-area padding.

Charts have one keyboard entry, arrow/Home/End inspection, an SVG-wide nearest-point
pointer surface, and a complete paginated data-table alternative. Line rendering
retains local extrema within 600 marks per series (a shared 1,200-point target),
without connecting missing-value segments. Pareto renders at most 600 adjacent
product groups; underlying statistics and tables still use all products. Large
table rows use `content-visibility` containment instead of removing rows from the
DOM, preserving accessibility, find/copy and the All option. Printing disables
containment and the table's scroll-height cap.

### Motion integration

React/React DOM 19.3.1 are stable dependencies. Native page view transitions are
coordinated by TanStack Router, not by manual `document.startViewTransition` calls.
Its external-store route updates did not activate an outer React ViewTransition
reliably in browser tests, so the router's supported integration owns route snapshots.
Header, navigation and sticky filters are isolated; lateral navigation fades,
explicit list/detail actions carry forward/back types, and ordinary same-route
filter updates disable route animation. Unsupported browsers navigate normally.

For small table reorders, `useDeferredValue` activates keyed React ViewTransition
row boundaries. At more than 50 displayed rows these boundaries are omitted to
avoid thousands of snapshots. Shared product identity can pair the drawer label
and ready detail heading; prefetch reuses the semantic price-resource cache key.
If incoming identity is not ready, ordinary page navigation is the fallback.
No Suspense data migration or decorative loading animation is required. Reduced
motion disables all view-transition pseudo-element animations as well as ordinary
CSS motion. See [implementation notes](frontend-audit-implementation.md).

## Development and configuration

```sh
npm ci             # Install dependencies from the lockfile
npm run dev        # Start the development server
npm test           # Run automated tests
npm run lint       # Run ESLint
npm run build      # Type-check and create the production bundle
npm run preview    # Serve the production bundle locally
npm run test:api-build # Verify API output excludes mock initialization
npx playwright install chromium # One-time local browser installation
npm run test:browser # Browser regressions with managed mock/API dev servers
```

Configure API access using `VITE_API_URL` in `.env.local` (see `.env.example`). For local development,
the backend CORS policy allows `http://localhost:5173`. Other origins require
corresponding backend configuration. Local backend HTTPS certificates must be
trusted by the browser. Starting the backend can trigger database migrations
and scheduled import jobs.

Client-side code and bundled configuration are public. Do not place passwords,
private API keys, access tokens, or other secrets in frontend source or `VITE_*`
environment variables. Use mock data for publicly shared screenshots and avoid
including personal receipt data in documentation or fixtures.

## Testing and extension guidelines

Tests use Node's native runner and Vite module loading for TypeScript and alias
resolution. Their cache is isolated in `node_modules/.vite-tests`. Regression
coverage includes API failures, date validation, null versus zero, calendar
boundaries, missing months, preference resolution, translation parity,
localized formatting, CSV serialization, and palette contrast.

When extending the application:

1. **Add a card:** compose a component under `features/dashboard/components/`,
   reuse `DashboardCard` or an existing card type, and choose responsive grid spans.
2. **Add data:** use an actual API contract, validate it in the data layer, and
   keep derived calculations separate from rendering. Preserve partial failures
   and the distinction between missing and zero values.
3. **Add a page:** implement the feature component, register a file-based route,
   and use router links for navigation. Include the shared header where applicable.
4. **Add a language:** create matching namespace JSON files, register resources
   and supported language resolution, add a selector option, and define locale
   formatting. Extend translation-parity tests.
5. **Add a chart:** use the shared history contracts and theme tokens, preserve
   missing-value semantics, provide keyboard-accessible values and a complete data
   alternative, and respect the rendering budget. The SVG components have no
   dependency on TanStack Charts, d3-scale or Motion.

Run tests, linting, and the production build before publishing changes. Check
both themes and languages, small and large viewports, direct route access,
browser history, and sticky-header behavior. Card drag-and-drop and persisted
user-defined layouts are outside the current feature scope.
