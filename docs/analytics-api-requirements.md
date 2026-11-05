# Analytics API Requirements

## Implementation order

Implement and validate one complete page at a time:

1. [Spending](#1-spending): shared catalog, then spending aggregates.
2. [Prices](#2-prices): reuse catalog/product search, then price analytics.
3. [Products](#3-products): reuse tag/unit options, then product analytics and details.
4. [Stores](#4-stores): reuse catalog/product search, then merchant analytics.

There are **six distinct endpoints**. The catalog is shared by all four pages:
implement it once, not as four different page-specific endpoints. Every page
section lists all its dependencies, including selection/filter data, even when
an endpoint was already implemented for an earlier page.

| Step | Page | Purpose | Method and endpoint | Response `data` schema | Frontend source |
| --- | --- | --- | --- | --- | --- |
| 1.1 | Spending; shared by later pages | Filter metadata, coverage and searchable product catalog | `GET /api/analytics/catalog` | [Catalog](analytics-api.schema.json#/$defs/Catalog) | Mock |
| 1.2 | Spending | Distributions, frequency, weekdays, notable purchases and promotions | `GET /api/analytics/spending` | [SpendingData](analytics-api.schema.json#/$defs/SpendingData) | Mock |
| 2.1 | Prices | Product search and store selection | Reuse `GET /api/analytics/catalog` | [Catalog](analytics-api.schema.json#/$defs/Catalog) | Same shared contract |
| 2.2 | Prices | Price history, statistics, changes and stability | `GET /api/analytics/prices` | [PricesData](analytics-api.schema.json#/$defs/PricesData) | Mock |
| 3.1 | Products | Tag/unit filters and coverage | Reuse `GET /api/analytics/catalog` | [Catalog](analytics-api.schema.json#/$defs/Catalog) | Same shared contract |
| 3.2 | Products | Rankings, quantities, tags and ABC/Pareto | `GET /api/analytics/products` | [ProductsData](analytics-api.schema.json#/$defs/ProductsData) | Mock |
| 3.3 | Products | Selected-product detail drawer | `GET /api/analytics/products/{id}` | [ProductDetail](analytics-api.schema.json#/$defs/ProductDetail) | Mock |
| 4.1 | Stores | Product search and filter metadata | Reuse `GET /api/analytics/catalog` | [Catalog](analytics-api.schema.json#/$defs/Catalog) | Same shared contract |
| 4.2 | Stores | Merchant summaries and historical product comparisons | `GET /api/analytics/stores` | [StoresData](analytics-api.schema.json#/$defs/StoresData) | Mock |

**Mock** identifies the supplied frontend source, not automatic discovery of
backend availability. This specification contains the contracts required by the
frontend; it does not implement backend controllers, services or migrations.
Examples are synthetic and match the deterministic fixtures.

### How to read the schema references

The complete schemas are in [analytics-api.schema.json](analytics-api.schema.json).
A named reference such as `Catalog` means `$defs.Catalog`, with JSON Pointer
`#/$defs/Catalog`. Links include these pointers for schema-aware tooling; if a
viewer only opens the JSON file, search for the exact definition name.

All endpoint results use `DataResponse<T>`. The page-specific schema describes
the value of **`data`**, not a replacement for the response envelope. The common
envelope schemas are [SuccessEnvelope](analytics-api.schema.json#/$defs/SuccessEnvelope)
and [FailureEnvelope](analytics-api.schema.json#/$defs/FailureEnvelope).
Read [shared transport and domain rules](#shared-transport-and-data-conventions)
once and consult the per-page schema maps while implementing each DTO.

### Incremental integration

- Contracts: `src/features/analytics/types.ts`.
- Requests and source selection: `src/features/analytics/data-source.ts`.
- Mock calculations: `src/features/analytics/mock/analytics.ts`.
- Synthetic source records: `src/features/analytics/mock/fixtures.ts`.

Default source is `mock`. Set `VITE_ANALYTICS_SOURCE=api` and restart Vite/rebuild
to test your implemented endpoints through the existing `apiFetch` and `API_URL`.
This switch applies to **all new analytics pages**, not separately to each page.
After steps 1.1 and 1.2, Spending can be tested in API mode; other pages will show
errors until their own dependencies are implemented. There is no automatic
mock fallback for missing or failed API endpoints. Home's API services remain
independent and do not need changes for this implementation sequence.

### Frontend integration behavior (2026-11-04)

**The audit implementation does not change endpoint paths, query contracts,
response DTOs, aggregation semantics, or the JSON schemas.** No backend changes
are required by this frontend refactor. In particular, full result arrays remain
required; visual rendering budgets are not server response limits.

- Configure the public build-time base URL with `VITE_API_URL` (for example
  `https://localhost:7065/api` or `/api`). The previous localhost URL remains the
  development default. Restart/rebuild after changing environment configuration.
- `validate-payload.ts` validates nested `data` values against the same definitions
  in `analytics-api.schema.json`. Required fields, nullable fields, finite numeric
  values, calendar dates/timestamps, enums, and additional-property rules are now
  enforced at runtime. Send genuine ISO timestamps with an explicit UTC `Z` or
  offset, valid calendar dates and hours 00–23. Rejected responses enter the
  localized error/retry UI; they never fall back to mock data or fabricated zeroes.
- Identical in-flight analytics requests share one frontend cache entry. Catalog
  keys are fresh for five minutes; other analytics keys for one minute. Reuse on
  navigation avoids redundant requests; expiry is checked on acquisition, not by
  periodic polling. An explicit retry forces a fresh request. The cache is scoped
  to the current browser runtime, not a backend/shared-user cache; a future
  authentication/logout flow must invalidate it when identity changes.
- Filter/product/source-page state and namespaced local table state are encoded
  in the application URL. `tables`, Home `range`/`series`, and table view settings
  are **frontend-only** and are never forwarded to API endpoints. Existing
  `analyticsParams` continues to select only each endpoint's supported parameters.
- Chart lines use a bounded visual sample retaining local extrema and missing-data
  segment boundaries; Pareto bars group adjacent products above the rendering
  budget. All source observations/products remain available through keyboard
  inspection and the chart's paginated data table. Statistics and ABC classes are
  calculated from the full response, not from the rendered sample.
- “All rows” remains available. Browser rendering containment reduces off-screen
  painting; it does not authorize API truncation or change pagination contracts.

`npm run test:api-build` checks that API production assets contain no mock fixture
generator. `npm test` covers data calculations, response validation, request-cache
behavior and documented schema consistency. Automated browser tests are not included.

## 1. Spending

**Frontend route:** `/spending`.

Complete these dependencies before considering this page ready:

- [ ] **1.1** Implement the shared `GET /api/analytics/catalog` contract.
- [ ] **1.2** Implement `GET /api/analytics/spending` and its aggregates.
- [ ] Verify the period presets, store/chain grouping, all charts/highlights,
  promotion counts, empty results and invalid date ranges.

The page requests the catalog for global filter metadata and coverage. It has
**no product dropdown**. Store/chain grouping is a fixed UI enum, not a separate
lookup endpoint. The complete catalog is still a shared response contract,
including the product-search capability needed by the next page.

Typical request sequence (grouping changes only reload the aggregate):

```http
GET /api/analytics/catalog?search=&limit=50
GET /api/analytics/spending?from=2025-11-01&to=2026-10-31&groupBy=store
GET /api/analytics/spending?from=2025-11-01&to=2026-10-31&groupBy=chain
```

### 1.1 Catalog and filter options

**Endpoint:** `GET /api/analytics/catalog`  
**Response:** `DataResponse<Catalog>`  
**Data schema:** [Catalog](analytics-api.schema.json#/$defs/Catalog), `#/$defs/Catalog`  
**Implemented once; reused by:** Spending, Prices, Products and Stores.

| Response path | Schema name / JSON Pointer | Purpose |
| --- | --- | --- |
| `data` | [Catalog](analytics-api.schema.json#/$defs/Catalog) | Full catalog response |
| `data.products[]` | [Product](analytics-api.schema.json#/$defs/Product) | Searchable product identity and metadata |
| `data.products[].tags[]`, `data.tags[]` | [Tag](analytics-api.schema.json#/$defs/Tag) | Product tag assignments and global tag options |
| `data.stores[]` | [Merchant](analytics-api.schema.json#/$defs/Merchant) | Global branch/chain options |
| `data.units[]` | [Unit](analytics-api.schema.json#/$defs/Unit) | Known supported sales units |
| `data.coverage` | [DateRange](analytics-api.schema.json#/$defs/DateRange), or null | Global dataset coverage |
| `data.hasMore`, `data.nextCursor` | [Catalog properties](analytics-api.schema.json#/$defs/Catalog/properties) | More matching products and reserved continuation metadata |

| Query | Type | Required | Behavior |
| --- | --- | --- | --- |
| `search` | string | No | Case-insensitive product-name search; empty means initial suggestions |
| `limit` | integer | No | Default/current client value 50, maximum 50 |

Return matching `products`, all authorized `stores` and `tags`, verified `units`,
and overall receipt `coverage`. `coverage=null` for an empty dataset. `hasMore`
indicates additional product matches. `nextCursor` is nullable reserved metadata:
the current UI refines its search instead of requesting cursor pages. Searching
products does not change store/tag metadata or coverage. Unknown filters must not
be invented as options. Product `unit` and `comparisonKey` require the verification
described in the shared domain rules; a name-only match cannot establish comparability.

**Only `products` is filtered by `search`.** A search for milk must not narrow
`stores`, `tags`, `units` or `coverage` to milk-related records. Those remain
global metadata. `hasMore=true` means additional matching products exist beyond
the returned limit, **not** merely that there is more than one result.
`nextCursor` can always be null in the current implementation; the frontend does
not send a `cursor` parameter. Product metadata may use null for unknown unit,
pack size or verified identity, but the response fields themselves are required.

Database basis: Product + ProductTag + Tag, distinct Receipt.Store/Chain, and
minimum/maximum Receipt.PurchasedAt. Unit/pack/canonical metadata needs a reliable
source external to the current entity fields, or null.

Example for `?search=Milk&limit=50`:

```json
{
  "success": true, "title": "Success", "message": "Analytics retrieved", "errorCode": 0,
  "data": {
    "products": [{"id":1,"name":"Milk 1 l","tags":[{"id":1,"name":"Dairy"}],"unit":"piece","packSize":"1 l","comparisonKey":"MOCK-PACK-1"}],
    "stores": [{"id":"north-centre","name":"Centre","chain":"North Market"},{"id":"north-riverside","name":"Riverside","chain":"North Market"},{"id":"city-west","name":"West","chain":"City Foods"},{"id":"green-east","name":"East","chain":"Green Basket"}],
    "tags": [{"id":1,"name":"Dairy"},{"id":2,"name":"Pantry"},{"id":3,"name":"Produce"},{"id":4,"name":"Drinks"},{"id":5,"name":"Bakery"}],
    "units": ["piece","kg"], "coverage": {"from":"2024-11-01","to":"2026-10-31"},
    "hasMore": false, "nextCursor": null
  }
}
```

### 1.2 Spending aggregates

**Endpoint:** `GET /api/analytics/spending`  
**Response:** `DataResponse<SpendingData>`  
**Data schema:** [SpendingData](analytics-api.schema.json#/$defs/SpendingData), `#/$defs/SpendingData`  
**Page:** `/spending`.

| Response path | Schema name / JSON Pointer |
| --- | --- |
| `data` | [SpendingData](analytics-api.schema.json#/$defs/SpendingData) |
| `data.range` | [DateRange](analytics-api.schema.json#/$defs/DateRange) |
| `data.categories[]` | [Distribution](analytics-api.schema.json#/$defs/Distribution) |
| `data.merchants[]` | [MerchantSummary](analytics-api.schema.json#/$defs/MerchantSummary) |
| `data.weekdays[]` | [Weekday](analytics-api.schema.json#/$defs/Weekday) |
| `data.frequency[]` | [Frequency](analytics-api.schema.json#/$defs/Frequency) |
| `data.comparison` | [SpendingData.properties.comparison](analytics-api.schema.json#/$defs/SpendingData/properties/comparison) |
| `data.promotions` | [SpendingData.properties.promotions](analytics-api.schema.json#/$defs/SpendingData/properties/promotions) |
| `data.highlights` | [SpendingData.properties.highlights](analytics-api.schema.json#/$defs/SpendingData/properties/highlights) |
| Each non-null highlight | [ReceiptHighlight](analytics-api.schema.json#/$defs/ReceiptHighlight), containing [Merchant](analytics-api.schema.json#/$defs/Merchant) |

| Query | Type | Required | Behavior |
| --- | --- | --- | --- |
| `from`, `to` | date | Yes | Inclusive UTC bounds |
| `groupBy` | `store` or `chain` | No | Default `store`; affects merchant aggregation only |

| Statistic / response path | Meaning and calculation | Database basis |
| --- | --- | --- |
| Spending by tag: `categories[]` | Sum reconstructed line values. A product with N tags contributes 1/N to each tag. Add a `key=untagged` bucket for products without tags. `share=allocatedValue/allLineValues*100`. Zero denominator gives 0. | ReceiptItem + ProductTag + Tag, filtered by Receipt date |
| Spending by merchant: `merchants[]` | Sum receipt summary totals per branch or chain. Count distinct receipts, distinct products and actual receipt lines separately. Average = total / valued receipts, never average all product prices. | Receipt + independently aggregated ReceiptPriceSummary and ReceiptItem |
| Weekday purchases: `weekdays[]` | Always seven ISO weekdays (Monday=1…Sunday=7), grouped by receipt UTC date. Count distinct receipts and average receipt totals; null average when no purchases. | Receipt.PurchasedAt and receipt totals |
| Shopping frequency: `frequency[]` | Chronological first-of-month rows covering the requested period; count imported receipts and receipts with at least one promotion. Zero means no records in this dataset, not proof of no real-world shopping; catalog coverage discloses import limits. | Receipt and EXISTS over ReceiptItem.PromotionId |
| Period comparison: `comparison` | `current` is filtered receipt count. `previous` covers the immediately preceding interval with exactly the same number of UTC days. Return null if coverage is incomplete. `change=(current-previous)/previous*100`, null if previous is zero/unavailable. | Receipt.PurchasedAt and reliable import coverage |
| Promotions: `promotions` | `positions` counts lines with nonempty PromotionId, not quantities. `purchases` counts distinct receipts containing at least one such line. `share=purchases/current*100`, zero for an empty window. | ReceiptItem.Id, ReceiptId, PromotionId |
| Most/least expensive: `highlights.expensive/cheapest` | Receipt with highest/lowest known receipt total. Do not treat a missing total as zero. Include merchant, timestamp, receipt line count and distinct products. | Receipt, preaggregated receipt summaries and item counts |
| Most positions: `highlights.positions` | Receipt with the highest count of distinct ReceiptItem.Id, not quantity sum. | ReceiptItem |
| Most units: `highlights.units` | Highest quantity sum **only among receipts whose every line has verified `piece` units**. Mixed units or unknown units are ineligible. Return null if no eligible receipt. UI labels this restricted scope. | ReceiptItem.Quantity plus reliable unit metadata |

Use distinct tag links before allocation. Joining price summaries and items in
one ungrouped query duplicates receipt totals: aggregate each relation first.
Chain distinct-product counts must be recalculated, not summed from branches.
Tie-break notable receipts by stable receipt ID. For a mixed-unit receipt,
`ReceiptHighlight.quantity` and `unit` are null; never sum kg and pieces.

Empty result: empty category/merchant arrays, seven zero-count weekdays with
null averages, covered-month frequency rows, zero promotion counts and shares,
and null highlights. Missing receipt summaries are not free purchases; exclude
them from amount-based denominators/highlights or return a clear source-data
failure if totals cannot be represented reliably by this v1 contract.

Example for `?from=2026-10-02&to=2026-10-02&groupBy=store`:

```json
{
  "success":true,"title":"Success","message":"Analytics retrieved","errorCode":0,
  "data":{
    "range":{"from":"2026-10-02","to":"2026-10-02"},
    "categories":[{"key":"2","label":"Pantry","expenses":10.36,"share":78.96341463414635},{"key":"4","label":"Drinks","expenses":2.76,"share":21.036585365853657}],
    "merchants":[{"id":"green-east","name":"East","chain":"Green Basket","purchases":1,"expenses":13.12,"averagePurchase":13.12,"positions":3,"distinctProducts":3,"promotionPurchases":1,"promotionShare":100}],
    "weekdays":[{"weekday":1,"purchases":0,"averageExpense":null},{"weekday":2,"purchases":0,"averageExpense":null},{"weekday":3,"purchases":0,"averageExpense":null},{"weekday":4,"purchases":0,"averageExpense":null},{"weekday":5,"purchases":1,"averageExpense":13.12},{"weekday":6,"purchases":0,"averageExpense":null},{"weekday":7,"purchases":0,"averageExpense":null}],
    "frequency":[{"month":"2026-10-01","purchases":1,"promotionPurchases":1}],
    "comparison":{"current":1,"previous":0,"change":null},
    "promotions":{"positions":1,"purchases":1,"share":100},
    "highlights":{
      "expensive":{"id":185,"purchasedAt":"2026-10-02T10:00:00.000Z","merchant":{"id":"green-east","name":"East","chain":"Green Basket"},"expenses":13.12,"positions":3,"distinctProducts":3,"quantity":6,"unit":"piece"},
      "cheapest":{"id":185,"purchasedAt":"2026-10-02T10:00:00.000Z","merchant":{"id":"green-east","name":"East","chain":"Green Basket"},"expenses":13.12,"positions":3,"distinctProducts":3,"quantity":6,"unit":"piece"},
      "positions":{"id":185,"purchasedAt":"2026-10-02T10:00:00.000Z","merchant":{"id":"green-east","name":"East","chain":"Green Basket"},"expenses":13.12,"positions":3,"distinctProducts":3,"quantity":6,"unit":"piece"},
      "units":{"id":185,"purchasedAt":"2026-10-02T10:00:00.000Z","merchant":{"id":"green-east","name":"East","chain":"Green Basket"},"expenses":13.12,"positions":3,"distinctProducts":3,"quantity":6,"unit":"piece"}
    }
  }
}
```

## 2. Prices

**Frontend route:** `/prices`.

- [ ] **2.1** Reuse `GET /api/analytics/catalog` for product search, store options
  and coverage; no new lookup endpoint is needed.
- [ ] **2.2** Implement `GET /api/analytics/prices`.
- [ ] Verify searchable product selection, date/store filters, price statistics,
  branch histories, both change rankings and both stability extremes.

### 2.1 Product selection and store filter

**Endpoint:** `GET /api/analytics/catalog` (shared; implemented in step 1.1).  
**Response:** `DataResponse<Catalog>`; [Catalog](analytics-api.schema.json#/$defs/Catalog), `#/$defs/Catalog`.

The page initially requests `search=&limit=50`. The searchable product picker
also requests this endpoint with the entered `search` and `limit=50`.
`products[]` uses [Product](analytics-api.schema.json#/$defs/Product), including
[Tag](analytics-api.schema.json#/$defs/Tag) assignments and nullable unit/identity
metadata. `stores[]` uses [Merchant](analytics-api.schema.json#/$defs/Merchant)
for the store dropdown; `coverage` uses nullable
[DateRange](analytics-api.schema.json#/$defs/DateRange).
The full query table, response example and remaining catalog fields are defined
in [step 1.1](#11-catalog-and-filter-options). Only product suggestions are searched;
store options and coverage stay global. `hasMore` prompts search refinement;
the picker does not request cursor pages.

Selecting a product sends its `id` as `productId` to the prices endpoint.
The initial selection defaults to the first catalog product unless the page URL
provides `productId`. Selecting a store sends its opaque `id` as `storeId`;
choosing all stores omits it. Neither action requires a product-detail request.

Typical request sequence (illustrative actions, not a mandatory serial pipeline):

```http
GET /api/analytics/catalog?search=&limit=50
GET /api/analytics/prices?from=2025-11-01&to=2026-10-31&productId=1
GET /api/analytics/catalog?search=Milk&limit=50
GET /api/analytics/prices?from=2025-11-01&to=2026-10-31&productId=1&storeId=north-centre
```

### 2.2 Observed prices and price rankings

**Endpoint:** `GET /api/analytics/prices`  
**Response:** `DataResponse<PricesData>`  
**Data schema:** [PricesData](analytics-api.schema.json#/$defs/PricesData), `#/$defs/PricesData`  
**Pages:** `/prices` (overview, optional frontend URL search parameter `productId`)
and `/prices/{productId}` (dedicated product price page).

Product-name links in the price rankings, store comparisons and product drawer
open `/prices/{productId}`. That page shows only the selected product's statistics
and history, with a product-specific heading and a link back to the price overview.
Date/store context is carried in validated `from`, `to` and optional `storeId`
URL search parameters. The overview's existing product picker remains available.
Both views use the same `GET /api/analytics/prices` contract; there is no new
backend endpoint. The detail view does not render the returned global rankings.

| Response path | Schema name / JSON Pointer |
| --- | --- |
| `data` | [PricesData](analytics-api.schema.json#/$defs/PricesData) |
| `data.range` | [DateRange](analytics-api.schema.json#/$defs/DateRange) |
| `data.product` | [Product](analytics-api.schema.json#/$defs/Product), or null |
| `data.stats` | [PriceStats](analytics-api.schema.json#/$defs/PriceStats), or null |
| `data.series[]` | [PriceSeries](analytics-api.schema.json#/$defs/PriceSeries) |
| `data.series[].points[]` | [PricePoint](analytics-api.schema.json#/$defs/PricePoint) |
| `data.increases[]`, `data.decreases[]`, `data.stability[]` | [PriceRanking](analytics-api.schema.json#/$defs/PriceRanking), containing [PriceStats](analytics-api.schema.json#/$defs/PriceStats) |
| `data.historyTruncated` | [PricesData.properties.historyTruncated](analytics-api.schema.json#/$defs/PricesData/properties/historyTruncated) |

| Query | Type | Required | Behavior |
| --- | --- | --- | --- |
| `from`, `to` | date | Yes | Inclusive UTC observation window |
| `productId` | integer | Yes | Selected product; affects product, stats and history only |
| `storeId` | opaque branch string | No | Restricts both selected history and global rankings |

The rankings cover **all comparable products** under the date/store filters,
not only the selected product. A product selection updates the history and
summary while retaining the rankings as a discovery tool.

| Statistic / response path | Calculation |
| --- | --- |
| `product` | Selected Product metadata, or null if no representable selection |
| `stats` | Statistics over comparable observed unit prices for the selected product; no quantity weighting and no promotion-based separation |
| `series[]` | Separate chronological series per physical branch. Never connect observations from different branches as one line. Points contain the actual observation time and unit price. |
| `increases[]` | All eligible product/branch groups with positive first-to-last change, ordered by descending percentage; no top-20 cap |
| `decreases[]` | All eligible groups with negative first-to-last change, ordered by ascending percentage; no top-20 cap |
| `stability[]` | All eligible product/branch groups with at least three observations and a positive mean; ordered by descending CV, not limited to the stable/volatile extremes |

`PriceRanking.previous` is the **first** price in the selected period, not the
immediately preceding purchase or a regular reference price. `last` is the last
observed price, never a guaranteed current selling price. Require at least two
distinct receipts and distinct observation times for change rankings. Order
ties by timestamp then ReceiptItem.Id. Compute `difference=last-previous` and
`percentage=difference/previous*100`; a zero previous price produces null
percentage, never division by zero. Such rows sort after calculable percentages.

`PriceStats` uses min/max, arithmetic mean, conventional median (mean of the two
middle values for even N), latest price/time, count of underlying observations,
population standard deviation `sqrt(sum((p-mean)^2)/N)`, and coefficient of
variation `standardDeviation/mean*100`. CV is null for a zero/nonpositive mean.
A single observation has standard deviation zero but is not a stability ranking.

Database basis: ReceiptItem.Price/Quantity/ProductId/StoreInternItemId/TaxType,
Receipt.PurchasedAt/Store/Chain, Product, and verified identity/unit metadata.
Do not compare name-only merged products or per-kg prices with per-pack prices.

For large histories return at most 250 points per branch and set
`historyTruncated=true` if limited. Keep statistics over the **complete** filtered
observation set. If aggregating points by UTC day, `price` is that day's
arithmetic mean and `count` is its underlying count; retain the latest actual
observation timestamp. Overall statistics must still be computed from raw
observations, not unweighted means of daily means. Current mock points each
represent one actual synthetic receipt line. No observations means `stats=null`,
`series=[]`; independent rankings may still have results.

Example for `?from=2026-10-02&to=2026-10-02&productId=12`:

```json
{
  "success":true,"title":"Success","message":"Analytics retrieved","errorCode":0,
  "data":{
    "range":{"from":"2026-10-02","to":"2026-10-02"},
    "product":{"id":12,"name":"Dark chocolate 100 g","tags":[{"id":2,"name":"Pantry"}],"unit":"piece","packSize":"100 g","comparisonKey":"MOCK-PACK-12"},
    "stats":{"min":2.03,"max":2.03,"average":2.03,"median":2.03,"last":2.03,"lastAt":"2026-10-02T10:00:00.000Z","count":1,"standardDeviation":0,"coefficientOfVariation":0},
    "series":[{"storeId":"green-east","label":"Green Basket · East","points":[{"date":"2026-10-02T10:00:00.000Z","price":2.03,"count":1}]}],
    "increases":[],"decreases":[],"stability":[],"historyTruncated":false
  }
}
```

Example `PriceRanking` from a longer fixture period:

```json
{"productId":3,"productName":"Butter 250 g","comparisonKey":"MOCK-PACK-3","storeId":"north-riverside","storeName":"North Market · Riverside","previous":1.96,"last":2.91,"previousAt":"2026-01-11T13:00:00.000Z","lastAt":"2026-08-14T14:00:00.000Z","difference":0.95,"percentage":48.46938775510205,"stats":{"min":1.96,"max":2.91,"average":2.4528571428571433,"median":2.56,"last":2.91,"lastAt":"2026-08-14T14:00:00.000Z","count":7,"standardDeviation":0.36783980541667816,"coefficientOfVariation":14.996381117744592}}
```

## 3. Products

**Frontend route:** `/products`.

- [ ] **3.1** Reuse `GET /api/analytics/catalog` for tag/unit options and coverage.
- [ ] **3.2** Implement `GET /api/analytics/products`, including aggregates,
  filters, sorting, pagination and complete-population rankings.
- [ ] **3.3** Implement `GET /api/analytics/products/{id}` for the detail drawer.
- [ ] Verify tag/unit filtering, stable ABC results across
  pages, detail totals/history and the link to the already implemented Prices page.

### 3.1 Tag and unit filter options

**Endpoint:** `GET /api/analytics/catalog` (shared; implemented in step 1.1).  
**Response:** `DataResponse<Catalog>`; [Catalog](analytics-api.schema.json#/$defs/Catalog), `#/$defs/Catalog`.

Request `search=&limit=50` on page initialization. The tag dropdown consumes
`tags[]`: [Tag](analytics-api.schema.json#/$defs/Tag); the unit dropdown consumes
`units[]`: [Unit](analytics-api.schema.json#/$defs/Unit); coverage consumes nullable
[DateRange](analytics-api.schema.json#/$defs/DateRange). The response remains the
complete Catalog object. See [step 1.1](#11-catalog-and-filter-options) for all
query parameters, fields and the response example.

**There is no product picker or product-name search field on this page.**
The page does not send a `search` filter to the aggregate/detail endpoints. Clicking
a ranked/listed product requests the detail endpoint with that product's `id`.
Tag/unit changes send `tagId`/`unit` to the aggregate and detail requests;
the all-tags/all-units choices omit those parameters.

Typical request sequence:

```http
GET /api/analytics/catalog?search=&limit=50
GET /api/analytics/products?from=2025-11-01&to=2026-10-31&page=1&pageSize=10&sortBy=expenses&sortDirection=desc
GET /api/analytics/products?from=2025-11-01&to=2026-10-31&tagId=1&unit=piece&page=1&pageSize=10&sortBy=expenses&sortDirection=desc
GET /api/analytics/products/1?from=2025-11-01&to=2026-10-31&tagId=1&unit=piece
```

### 3.2 Product rankings, tags, quantities and ABC

**Endpoint:** `GET /api/analytics/products`  
**Response:** `DataResponse<ProductsData>`  
**Data schema:** [ProductsData](analytics-api.schema.json#/$defs/ProductsData), `#/$defs/ProductsData`  
**Page:** `/products`.

| Response path | Schema name / JSON Pointer |
| --- | --- |
| `data` | [ProductsData](analytics-api.schema.json#/$defs/ProductsData) |
| `data.range` | [DateRange](analytics-api.schema.json#/$defs/DateRange) |
| `data.rows[]`, `data.topExpenses[]`, `data.topFrequency[]`, `data.topPromotions[]`, `data.quantities[]` | [ProductStats](analytics-api.schema.json#/$defs/ProductStats), including [Tag](analytics-api.schema.json#/$defs/Tag) assignments |
| `data.tags[]` | [TagStats](analytics-api.schema.json#/$defs/TagStats) |
| `data.pareto[]` | [ParetoPoint](analytics-api.schema.json#/$defs/ParetoPoint) |
| `data.classes[]` | [AbcClass](analytics-api.schema.json#/$defs/AbcClass) |
| Totals and pagination fields | [ProductsData.properties](analytics-api.schema.json#/$defs/ProductsData/properties) |

| Query | Type | Required | Behavior |
| --- | --- | --- | --- |
| `from`, `to` | date | Yes | Inclusive UTC receipt bounds |
| `tagId` | integer | No | Include products carrying the tag, using EXISTS rather than a duplicating join |
| `unit` | `piece` or `kg` | No | Include only products with this verified unit; enables the quantity ranking |
| `search` | string | No | Optional contract capability for case-insensitive product-name filtering; not used by the current Products UI |
| `page` | integer | No | One-based, default 1 |
| `pageSize` | integer | No | Default 10, range 1…50 |
| `sortBy` | `expenses`, `purchases`, `name` | No | Default expenses; quantity ranking is a separate homogeneous-unit array |
| `sortDirection` | `asc` or `desc` | No | Default desc; product ID is the stable tie-breaker |

All filters apply **before** aggregation/classification and pagination.
`totalProducts` counts matching purchased products, not the full catalog.
`totalExpenses` sums their reconstructed line values. `rows` is the requested
page, `totalPages=ceil(totalProducts/pageSize)` (zero when empty). The other
arrays are computed from the complete filtered population, not the visible page.

| Statistic / response path | Meaning and calculation | Source |
| --- | --- | --- |
| `ProductStats.expenses/share` | Sum Price×Quantity line values; divide by total matching line values for share | ReceiptItem and Receipt date |
| `ProductStats.purchases` | Count distinct ReceiptId per ProductId, even if multiple lines on one receipt | ReceiptItem.ReceiptId/ProductId |
| `ProductStats.quantity` | Sum source quantities for this product; unit metadata states whether this is interpretable/comparable | ReceiptItem.Quantity and verified unit |
| `topExpenses` | Top 10 products by expenses descending, with share | Full product aggregates |
| `topFrequency` | Top 10 by distinct purchase count descending | Full product aggregates |
| `quantities` | Top 20 by quantity within the explicitly selected known unit; empty when no unit selected | Filtered homogeneous-unit aggregates |
| `topPromotions` | Top 10 by count of lines with nonempty PromotionId; omit zero counts | ReceiptItem.PromotionId |
| `tags` | Distinct purchased product count and distinct receipt count per tag; spend allocated equally among each product's complete tag set | ProductTag/Tag plus filtered items |
| `pareto` | Products ordered by spend descending; cumulative spend/total×100 | Full filtered product aggregates |
| `classes` | A/B/C product counts, expenditures and shares, including zero-sized classes | Full classified population |

When a tag filter selects a product with multiple tags, retain its complete tag
set and split its spending across that set. Tag purchase counts are not additive
because one receipt may contain several tags. Untagged spending contributes to
the denominator but has no TagStats row; Spending exposes its explicit untagged
bucket instead. Quantity totals must not compare kilograms against pieces, and
pieces/packs must not be described as equal normalized weights.

ABC uses cumulative share **before** each product: below 80% => A, below 95% => B,
otherwise C. This includes the threshold-crossing product in the preceding
class. Tie-break by product ID. Classification and shares must not change with
pagination or sort direction. Empty data has empty rankings/Pareto and three
zero-valued class rows. A nonpositive spend denominator cannot support meaningful
ABC percentages and must not produce fabricated shares.

For very large catalogs the Pareto response may contain the top 20 products and
one aggregate remainder with `productId=null`, `name=""`, `abc=null`. Its expenses
sum the omitted products and its cumulative share is 100. This is an aggregated
remainder, not a fabricated product. Individual class totals still cover all
products. Mock fixtures contain twelve products and return the full Pareto list.

Example for `?from=2026-10-02&to=2026-10-02&search=Dark&page=1&pageSize=10&sortBy=expenses&sortDirection=desc`:

```json
{
  "success":true,"title":"Success","message":"Analytics retrieved","errorCode":0,
  "data":{
    "range":{"from":"2026-10-02","to":"2026-10-02"},"totalProducts":1,"totalExpenses":4.06,
    "rows":[{"id":12,"name":"Dark chocolate 100 g","tags":[{"id":2,"name":"Pantry"}],"unit":"piece","packSize":"100 g","comparisonKey":"MOCK-PACK-12","purchases":1,"quantity":2,"expenses":4.06,"share":100,"promotionPositions":0,"abc":"A"}],
    "page":1,"pageSize":10,"totalPages":1,
    "topExpenses":[{"id":12,"name":"Dark chocolate 100 g","tags":[{"id":2,"name":"Pantry"}],"unit":"piece","packSize":"100 g","comparisonKey":"MOCK-PACK-12","purchases":1,"quantity":2,"expenses":4.06,"share":100,"promotionPositions":0,"abc":"A"}],
    "topFrequency":[{"id":12,"name":"Dark chocolate 100 g","tags":[{"id":2,"name":"Pantry"}],"unit":"piece","packSize":"100 g","comparisonKey":"MOCK-PACK-12","purchases":1,"quantity":2,"expenses":4.06,"share":100,"promotionPositions":0,"abc":"A"}],
    "topPromotions":[],"quantities":[],
    "tags":[{"id":2,"name":"Pantry","products":1,"purchases":1,"expenses":4.06,"share":100}],
    "pareto":[{"productId":12,"name":"Dark chocolate 100 g","expenses":4.06,"cumulativeShare":100,"abc":"A"}],
    "classes":[{"abc":"A","products":1,"expenses":4.06,"share":100},{"abc":"B","products":0,"expenses":0,"share":0},{"abc":"C","products":0,"expenses":0,"share":0}]
  }
}
```

### 3.3 Product detail drawer

**Endpoint:** `GET /api/analytics/products/{id}`  
**Response:** `DataResponse<ProductDetail>`  
**Data schema:** [ProductDetail](analytics-api.schema.json#/$defs/ProductDetail), `#/$defs/ProductDetail`  
**Page:** `/products`; link to `/prices/{id}` with the current date range.

| Response path | Schema name / JSON Pointer |
| --- | --- |
| `data` | [ProductDetail](analytics-api.schema.json#/$defs/ProductDetail) |
| `data.product` | [ProductStats](analytics-api.schema.json#/$defs/ProductStats), or null |
| `data.priceStats` | [PriceStats](analytics-api.schema.json#/$defs/PriceStats), or null |
| `data.recentPurchases[]` | [ProductPurchase](analytics-api.schema.json#/$defs/ProductPurchase), containing [Merchant](analytics-api.schema.json#/$defs/Merchant) |
| `data.recentLimit` | [ProductDetail.properties.recentLimit](analytics-api.schema.json#/$defs/ProductDetail/properties/recentLimit) |

Path `id` is the stable Product.Id. Query parameters: required `from`, `to`;
optional `tagId`, `unit`, `search` with the same meanings as the aggregate contract.
The current Products UI sends only tag/unit filters, not `search`.
These retain the current ranking/filter context, including the share denominator.
Pagination/sort parameters do not affect detail aggregates and are not sent.

- `product`: the same ProductStats as in the complete filtered product list.
  Product name/tags come from Product/Tag; purchases count distinct receipts;
  quantity and spend sum all matching lines, not just the recent list.
- `priceStats`: comparable unit-price statistics from matching receipts, following
  the price rules above. Null when identity/unit comparability cannot be established.
- `recentPurchases`: **all** matching receipt lines, ordered timestamp
  descending then line ID descending; each includes branch, actual quantity,
  observed unit price, reconstructed line value, and promotion presence.
  Raw purchase history remains available even when missing unit/identity
  metadata prevents comparative price statistics.
- `recentLimit`: 10, retained as legacy metadata for DTO compatibility; it no
  longer caps `recentPurchases`. The UI pages the complete history locally and
  no longer displays the old "latest ten" notice. A stable `lineId` is required
  because multiple lines of the same product can occur on one receipt. Product
  totals and distinct receipt counts still describe the complete filtered period,
  never just the visible table page.

Unknown product ID or an existing product without purchases under the current
filters: success with `product=null`, `priceStats=null`, and `recentPurchases=[]`.
Malformed/nonpositive IDs are invalid input. No comparison price is invented
for missing observations.

Example for `/12?from=2026-10-02&to=2026-10-02`:

```json
{
  "success":true,"title":"Success","message":"Analytics retrieved","errorCode":0,
  "data":{
    "product":{"id":12,"name":"Dark chocolate 100 g","tags":[{"id":2,"name":"Pantry"}],"unit":"piece","packSize":"100 g","comparisonKey":"MOCK-PACK-12","purchases":1,"quantity":2,"expenses":4.06,"share":30.945121951219512,"promotionPositions":0,"abc":"A"},
    "priceStats":{"min":2.03,"max":2.03,"average":2.03,"median":2.03,"last":2.03,"lastAt":"2026-10-02T10:00:00.000Z","count":1,"standardDeviation":0,"coefficientOfVariation":0},
    "recentPurchases":[{"lineId":1841,"receiptId":185,"purchasedAt":"2026-10-02T10:00:00.000Z","merchant":{"id":"green-east","name":"East","chain":"Green Basket"},"quantity":2,"unit":"piece","unitPrice":2.03,"expenses":4.06,"promotion":false}],
    "recentLimit":10
  }
}
```

## 4. Stores

**Frontend route:** `/stores`.

- [ ] **4.1** Reuse `GET /api/analytics/catalog` for searchable product selection
  and coverage.
- [ ] **4.2** Implement `GET /api/analytics/stores`.
- [ ] Verify branch/chain grouping, merchant metrics, product selection,
  historical prices/dates and non-comparable/insufficient observation states.

### 4.1 Product selection and filter metadata

**Endpoint:** `GET /api/analytics/catalog` (shared; implemented in step 1.1).  
**Response:** `DataResponse<Catalog>`; [Catalog](analytics-api.schema.json#/$defs/Catalog), `#/$defs/Catalog`.

Initialization requests `search=&limit=50`. The searchable picker requests
`search=<entered product name>&limit=50` and consumes `products[]`:
[Product](analytics-api.schema.json#/$defs/Product), with
[Tag](analytics-api.schema.json#/$defs/Tag) assignments. Coverage uses nullable
[DateRange](analytics-api.schema.json#/$defs/DateRange). All other catalog fields
are still returned globally, not narrowed by product search. Query definitions,
the response example and `hasMore`/`nextCursor` behavior are in
[step 1.1](#11-catalog-and-filter-options).

The page defaults to the first catalog product; selection sends `productId` to
the stores endpoint. Store/chain grouping is a fixed UI enum (`groupBy`), not a
lookup API. This page has no individual-store dropdown. Grouping affects the
overview only: product-price comparisons remain per physical branch.

Typical request sequence:

```http
GET /api/analytics/catalog?search=&limit=50
GET /api/analytics/stores?from=2025-11-01&to=2026-10-31&groupBy=store&productId=1
GET /api/analytics/catalog?search=Milk&limit=50
GET /api/analytics/stores?from=2025-11-01&to=2026-10-31&groupBy=chain&productId=1
```

### 4.2 Store/chain analysis and historical comparisons

**Endpoint:** `GET /api/analytics/stores`  
**Response:** `DataResponse<StoresData>`  
**Data schema:** [StoresData](analytics-api.schema.json#/$defs/StoresData), `#/$defs/StoresData`  
**Page:** `/stores`.

| Response path | Schema name / JSON Pointer |
| --- | --- |
| `data` | [StoresData](analytics-api.schema.json#/$defs/StoresData) |
| `data.range` | [DateRange](analytics-api.schema.json#/$defs/DateRange) |
| `data.merchants[]` | [MerchantSummary](analytics-api.schema.json#/$defs/MerchantSummary) |
| `data.product` | [Product](analytics-api.schema.json#/$defs/Product), or null |
| `data.prices[]` | [MerchantPrice](analytics-api.schema.json#/$defs/MerchantPrice), containing [Merchant](analytics-api.schema.json#/$defs/Merchant) |
| `data.differences[]` | [HistoricalDifference](analytics-api.schema.json#/$defs/HistoricalDifference); baseline and alternative are [Merchant](analytics-api.schema.json#/$defs/Merchant) |

| Query | Type | Required | Behavior |
| --- | --- | --- | --- |
| `from`, `to` | date | Yes | Inclusive UTC receipt/observation bounds |
| `groupBy` | `store` or `chain` | No | Default store; affects merchant overview only |
| `productId` | integer | No | Selected product for the per-branch price comparison |

| Statistic / response path | Calculation and meaning |
| --- | --- |
| `merchants[]` | Same MerchantSummary semantics as Spending: receipt counts, receipt summary expenses, basket average, positions, distinct products and receipt promotion share. Recalculate distinct counts when grouping by chain. |
| `product` | Selected Product metadata or null; does not restrict the merchant overview. |
| `prices[]` | Per physical branch for the selected verified product: latest observed unit price/date, arithmetic mean, lowest observed price/date and count. This stays branch-specific even when overview groupBy=chain. |
| `differences[]` | All products with verified comparable identity and observations at two or more branches, without a top-20 cap. Select the highest and lowest **last observed** branch prices; output both prices, branches and observation timestamps. Sort by absolute positive price difference descending. |

For a difference, `baselinePrice` is the higher last-observed branch price,
`alternativePrice` is the lower. `difference=baselinePrice-alternativePrice`;
`percentage=difference/baselinePrice*100` or null for a zero baseline. Omit equal
prices and non-comparable products. This is a **historical gap**, not a guaranteed
saving, regular-price discount, or live offer. Observation dates can differ and
must remain visible. The UI links the product to its observed price analysis.

Database basis: Receipt/ReceiptPriceSummary for merchant totals; ReceiptItem and
Product with verified unit/pack identity for price comparisons; PromotionId for
promotion frequency only. Do not rank stores by average prices of unrelated
product assortments. No observations means `prices=[]`; fewer than two comparable
branches means no HistoricalDifference for that product. Missing identity metadata
must not be replaced with name-only matching.

Example for `?from=2026-10-02&to=2026-10-02&groupBy=store&productId=12`:

```json
{
  "success":true,"title":"Success","message":"Analytics retrieved","errorCode":0,
  "data":{
    "range":{"from":"2026-10-02","to":"2026-10-02"},
    "merchants":[{"id":"green-east","name":"East","chain":"Green Basket","purchases":1,"expenses":13.12,"averagePurchase":13.12,"positions":3,"distinctProducts":3,"promotionPurchases":1,"promotionShare":100}],
    "product":{"id":12,"name":"Dark chocolate 100 g","tags":[{"id":2,"name":"Pantry"}],"unit":"piece","packSize":"100 g","comparisonKey":"MOCK-PACK-12"},
    "prices":[{"merchant":{"id":"green-east","name":"East","chain":"Green Basket"},"last":2.03,"lastAt":"2026-10-02T10:00:00.000Z","average":2.03,"min":2.03,"minAt":"2026-10-02T10:00:00.000Z","count":1}],
    "differences":[]
  }
}
```

Example HistoricalDifference from the longer fixture period:

```json
{"productId":3,"productName":"Butter 250 g","comparisonKey":"MOCK-PACK-3","baseline":{"id":"north-riverside","name":"Riverside","chain":"North Market"},"alternative":{"id":"north-centre","name":"Centre","chain":"North Market"},"baselinePrice":2.91,"alternativePrice":1.84,"baselineAt":"2026-08-14T14:00:00.000Z","alternativeAt":"2026-09-20T16:00:00.000Z","difference":1.07,"percentage":36.769759450171826}
```

## Shared transport and data conventions

These rules apply to every implementation phase. The schema file exhaustively
defines each field, nested object, array, required property and nullable value.
All object properties are required unless explicitly stated otherwise; null
and omission are different. Schemas and examples are checked against the
TypeScript DTOs and mock payloads in automated tests.

Successful responses use the existing `DataResponse<T>` envelope,
[SuccessEnvelope](analytics-api.schema.json#/$defs/SuccessEnvelope):

```json
{"success":true,"title":"Success","message":"Analytics retrieved","errorCode":0,"data":{}}
```

Here `{}` illustrates the envelope slot only; actual `data` must match the
endpoint-specific schema. An error uses a non-success HTTP status and the
existing [FailureEnvelope](analytics-api.schema.json#/$defs/FailureEnvelope):

```json
{"success":false,"title":"Error","message":"Invalid date range","errorCode":5,"data":null}
```

Use existing backend error-code conventions. `400` is appropriate for invalid
filters. These read projections represent an unknown selected product with a
null product and empty observations, just like the mock source. Server failures
must not become an empty successful result. Error text is not used as translated
UI copy. Requests use the existing `API_URL`: a base URL ending in `/api`
receives relative paths beginning with `/analytics`. There are no secrets in
the `VITE_ANALYTICS_SOURCE` flag.

### Primitive fields and date boundaries

| Type | JSON representation | Meaning |
| --- | --- | --- |
| Product/tag/receipt/line ID | Positive integer | Stable entity identity, not an array index |
| Merchant ID | String | Stable opaque branch key; chain grouping uses a distinct key such as `chain:North Market` |
| Date | `YYYY-MM-DD` | Calendar date with UTC day boundaries |
| Timestamp | ISO 8601 UTC string ending in `Z` | Actual observation or receipt time |
| Money | Finite JSON number | EUR amount; never localized strings, `NaN`, or infinity |
| Percentage | Finite JSON number | Percentage points: `25` means 25%, not 0.25 |
| Quantity | Finite JSON number | In the product's declared sales unit, not a guessed unit |
| Unit | `"piece"`, `"kg"`, or `null` where permitted | `piece` includes a known pack; null means unverified |
| Missing scalar | `null` | Unavailable, not zero |
| Empty collection | `[]` | Successful request with no matching records |

Use decimal arithmetic for monetary aggregation. Round each reconstructed line
value to EUR cents before summation; retain precision when allocating that value
between multiple tags. The UI formats currency to two decimals, so rounded
category labels can differ by a cent from the exact sum. Percentages and
statistical calculations should retain precision until presentation.

[DateRange](analytics-api.schema.json#/$defs/DateRange) contains `from` and `to`.
Both bounds are inclusive. Query timestamps with `PurchasedAt >= from at 00:00 UTC`
and `PurchasedAt < day after to at 00:00 UTC`. The frontend validates real dates
and `from <= to`. There is no fixed ten-year cap: the Max preset must be able to
include the entire imported history. Server validation must allow this complete
coverage too (replacing the earlier 3,660-day limit). The new pages explicitly
label UTC date boundaries; do not silently apply server-local or browser-local
timezone conversion.

The global sticky filter bar uses compact presets instead of editable dates:

The bar starts collapsed. Its disclosure button shows the selected period and
an active-extra-filter count; opening it reveals the presets and extra selectors.
Closing it does not reset filters. This is presentation state only and is not
sent to the backend.

| Preset | Inclusive UTC range |
| --- | --- |
| 1W (French: 1S; Turkish: 1H) | Today and the preceding six days |
| 1M (Turkish: 1A) | One rolling calendar month through today; subtract one month, clamp the day to that month's end, then add one day for the inclusive start |
| YTD | January 1 of the reference year through today |
| 1J (English/Turkish: 1Y; French: 1A) | One rolling calendar year through today; subtract twelve months with the same clamping/inclusive-start rule |
| Max (Turkish: Maks) | Earliest `Catalog.coverage.from` through today; unavailable if coverage is null |

"Today" means the current UTC date in API mode, or the fixed fixture coverage
end in mock mode. The initial preset is 1J/1Y/1A. Selecting another preset preserves
store/group/tag/unit selections and resets product-list pagination to page 1.
There is no reset button, no custom-date input and no new API query parameter:
the source still sends the resulting `from`/`to` strings. Existing date-bearing
links remain supported, even if their range does not exactly match a preset.

### Source entities and business semantics

| Source | Required fields and use |
| --- | --- |
| `Receipt` | `Id`, `PurchasedAt`, `Store`, `Chain`: distinct purchases, UTC date grouping and branch/chain identity |
| `ReceiptPriceSummary` | `ReceiptId`, `TaxBaseAmount`, `TaxAmount`: receipt totals and tax semantics |
| `ReceiptItem` | `Id`, `ReceiptId`, `ProductId`, `Price`, `Quantity`, `PromotionId`, `StoreInternItemId`, `TaxType`: positions, reconstructed values, price identity and promotion counts |
| `Product` | `Id`, `Name`: product identity and display name |
| `ProductTag` | `ProductId`, `TagId`: many-to-many classification |
| `Tag` | `Id`, `Name`: tag identity and display label |

The Lidl parser imports `data-unit-price` into `ReceiptItem.Price`. The mapper
does not multiply it by quantity. A reconstructed line value is therefore
`round(Price * Quantity, 2)`. `TaxBaseAmount` is the tax-inclusive total according
to `ReceiptPriceInfo` and the receipt-import code; `TaxAmount` is tax contained
within that total. Never add tax again. Store and receipt spending use the sum
of receipt price summaries, exactly like Home. Product/tag spending uses
reconstructed line values. Receipt-wide discounts, deposits or import omissions
can prevent these two bases from reconciling. Do not proportionally invent a
reconciliation: label their distinct bases as the UI does.

The current entities have no persisted unit, pack size, GTIN or canonical
cross-chain identity, and the product import can merge equal names. These are
**not** reliable substitutes for physical product identity. Proposed `Product`
metadata includes nullable `unit`, `packSize`, and `comparisonKey` to make this
limitation explicit. Existing product and tag IDs remain the original integers.

- A non-null `comparisonKey` attests that the same physical product, pack size,
  currency, and sales-unit price semantics have been verified across included
  observations. It is not merely a normalized product name or ProductId.
- Where canonical identity is unavailable, a strictly verified source cohort
  may use chain + source item ID + product ID + tax type + compatible quantity
  and unit semantics. Do not merge different cohorts in a single product's
  returned price series. Return null statistics/empty comparisons rather than
  mixing unresolved cohorts. A future cohort selector would require an explicit
  contract extension; none is assumed by the current UI.
- Cross-chain comparisons are permitted only with verified canonical identity.
  The mock fixtures explicitly define this identity; real imports do not.
- `unit=null` excludes a product from quantity rankings. A raw quantity total
  with unknown unit can be shown with the unknown-unit label, but must not be
  presented as kilograms or a comparable package count.
- Never compare aggregate average prices across different assortments.
- Split multi-tag spending equally over distinct assignments, never duplicate
  the full amount for every tag. Promotion statistics are counts/shares only:
  no promotion-conditioned average prices or invented promotional savings.

The fixture dataset represents positive purchase lines. Real backend returns,
negative quantities, voided lines and unresolved price semantics require an
explicit policy: do not silently feed them into positive-share/ABC rankings or
unit-price statistics. Report unsupported source conditions as errors or make
an explicit, documented contract extension before displaying misleading results.

## Shared JSON model reference

All fields below are required in their objects; nullable fields explicitly list
`null`. Each definition name is also its key under `$defs` in the JSON file.
Per-page maps above identify which response paths use these models.

| Schema definition | Important fields and semantics |
| --- | --- |
| [Tag](analytics-api.schema.json#/$defs/Tag) | `id: integer`, `name: string` (API data label, not a translation key) |
| [Merchant](analytics-api.schema.json#/$defs/Merchant) | `id: string`, `name: string` (branch or chain display name), `chain: string` |
| [Product](analytics-api.schema.json#/$defs/Product) | `id`, `name`, `tags: Tag[]`, `unit: Unit|null`, `packSize: string|null`, `comparisonKey: string|null` |
| [MerchantSummary](analytics-api.schema.json#/$defs/MerchantSummary) | Merchant fields plus `purchases`, `expenses`, `averagePurchase: number|null`, `positions`, `distinctProducts`, `promotionPurchases`, `promotionShare` |
| [Distribution](analytics-api.schema.json#/$defs/Distribution) | `key: string` (tag ID or `untagged`), `label: string`, `expenses: number`, `share: number` |
| [ReceiptHighlight](analytics-api.schema.json#/$defs/ReceiptHighlight) | `id`, `purchasedAt`, `merchant`, `expenses`, `positions`, `distinctProducts`, `quantity: number|null`, `unit: Unit|null` |
| [Weekday](analytics-api.schema.json#/$defs/Weekday) | `weekday: 1…7`, `purchases`, `averageExpense: number|null` |
| [Frequency](analytics-api.schema.json#/$defs/Frequency) | `month` (first-of-month date), `purchases`, `promotionPurchases` |
| [PriceStats](analytics-api.schema.json#/$defs/PriceStats) | `min`, `max`, `average`, `median`, `last`, `lastAt`, `count`, `standardDeviation`, `coefficientOfVariation: number|null` |
| [PricePoint](analytics-api.schema.json#/$defs/PricePoint) | `date: timestamp`, `price: number`, `count: integer` (underlying observation count) |
| [PriceSeries](analytics-api.schema.json#/$defs/PriceSeries) | `storeId`, `label`, `points: PricePoint[]` |
| [PriceRanking](analytics-api.schema.json#/$defs/PriceRanking) | `productId`, `productName`, `comparisonKey`, `storeId`, `storeName`, `previous`, `last`, `previousAt`, `lastAt`, `difference`, `percentage: number|null`, `stats: PriceStats` |
| [ProductStats](analytics-api.schema.json#/$defs/ProductStats) | Product fields plus `purchases`, `quantity`, `expenses`, `share`, `promotionPositions`, `abc: A|B|C` |
| [TagStats](analytics-api.schema.json#/$defs/TagStats) | Tag fields plus `products`, `purchases`, `expenses`, `share` |
| [ParetoPoint](analytics-api.schema.json#/$defs/ParetoPoint) | `productId: integer|null`, `name`, `expenses`, `cumulativeShare`, `abc: A|B|C|null` |
| [AbcClass](analytics-api.schema.json#/$defs/AbcClass) | `abc: A|B|C`, `products`, `expenses`, `share` |
| [ProductPurchase](analytics-api.schema.json#/$defs/ProductPurchase) | `lineId`, `receiptId`, `purchasedAt`, `merchant`, `quantity`, `unit: Unit|null`, `unitPrice`, `expenses`, `promotion: boolean` |
| [MerchantPrice](analytics-api.schema.json#/$defs/MerchantPrice) | `merchant`, `last`, `lastAt`, `average`, `min`, `minAt`, `count` |
| [HistoricalDifference](analytics-api.schema.json#/$defs/HistoricalDifference) | `productId`, `productName`, `comparisonKey`, `baseline: Merchant`, `alternative: Merchant`, `baselinePrice`, `alternativePrice`, `baselineAt`, `alternativeAt`, `difference`, `percentage: number|null` |

## Existing Home endpoints and optional future work

Home is not an implementation phase: its existing endpoints stay unchanged.
The analytics pages need different, filtered aggregates and do not request
Home's global metrics. Their mock badge never labels Home's live data.

| Page | Statistics | Method | Endpoint | Status |
| --- | --- | --- | --- | --- |
| Home | Existing expense metrics and histories | GET | `/api/expense/{total,total-tax,percentage-change,tax-percentage-change,history,tax-history}` | Existing; unchanged |
| Home | Existing purchase metrics | GET | `/api/receipt/{total,average-purchase-value,average-items,discount-share}` | Existing; unchanged |

No additional optional endpoint is required for the current UI. Canonical
identity/unit enrichment, full catalog pagination, and receipt-detail navigation
are possible future capabilities, not implemented API dependencies.

## Table pagination and complete result sets

All tables on Prices, Products and Stores, including the product-detail purchase
history, allow access to every matching row. Empty tables retain their empty-state
message. Each nonempty table has its own pagination; changing one does not change
the page of a neighboring table.

- **Product overview:** existing source-side pagination, ten rows per request,
  using `page`, `pageSize` and `totalPages`. The current UI uses the fixed default
  order (item value descending), without sort-order dropdowns.
- **Other tables:** local pagination of complete response arrays, with ten rows
  initially, selectable 10/25/50/all rows, first/previous/next/last controls and
  visible row/total counts. Local column sorting applies to the full result set
  **before** pagination and resets the active page. Filter/data changes reset
  each affected table to its first page.
- Do not truncate `PricesData.increases`, `decreases`, `stability`,
  `StoresData.differences` or `ProductDetail.recentPurchases`. Otherwise local
  pagination would only expose the old capped subset. No new query parameter or
  route is used for local table pagination; response field names remain unchanged.
- Merchant summaries, selected-product merchant prices and tag statistics also
  return complete matching arrays. Chart-specific top-10/top-20 arrays and the
  price-history point cap are unchanged; charts are not paginated tables.
- **Backend integration note:** this revises the previous ranking/history limits.
  Existing implementations that return only the first 20 rankings, 30 stability
  extremes or ten purchase lines must return the complete eligible array. There
  is no client-side way to discover omitted rows in those older responses.
- For large production populations, explicit server-side per-table pagination
  (including independent page/sort/total metadata) is a future contract extension.
  Do not silently cap these arrays until such a contract is implemented in both
  data source and UI. Only frontend/mock code and documentation are supplied here;
  no backend implementation is included.

## Performance, consistency and acceptance requirements

- Aggregate on the server and return DTOs, not every receipt/item/entity graph.
  Filter dates before aggregation. Use read-only projections and avoid per-row
  queries for products, tags or receipt summaries.
- Keep receipt-summary and item/tag aggregations independent to prevent join
  multiplication. Use distinct ReceiptId/ProductId/ReceiptItem.Id as appropriate.
- Stable sorting and page limits must be applied after totals and ABC calculations.
  The UI sorts complete returned price/store table rows locally; product-list
  sorting and pagination are requested from the source.
- Preserve all dates, counts, shares and units across endpoints for identical
  filter contexts. Product detail, price stats, recent purchases and rankings
  must describe the same underlying observations and identities.
- Avoid sending receipt ticket IDs, raw receipt HTML, loyalty credentials or
  unnecessary personal information. Merchant IDs must be stable without exposing
  private credentials.
- Test inclusive date boundaries, leap years, empty results, partial import
  coverage, missing tax summaries, zero denominators, duplicate joins, multi-tag
  products, multiple lines on one receipt, unknown units/identity, and single
  observations. Cross-chain name collisions must not create a comparison group.
- **Never implement average price with promotion, average price without promotion,
  or disguised equivalents.** Promotion statistics are counts and shares only.
  Do not calculate promotional savings without reliable regular reference prices.
- The frontend includes selectable mock loading/empty/error/no-results previews.
  These are local UI states, not API query parameters. In API mode only actual
  request states are used, and mocks are not an error fallback.

Implementing these six contracts and enabling API mode replaces the analytics
mock source without changing page components, charts, filters or Home services.
