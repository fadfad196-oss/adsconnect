# AdsConnect

A working marketing data platform in the shape of Windsor.ai: connect your ad, analytics,
e-commerce, CRM and email sources, normalise them into one schema, deliver them to Looker Studio,
Sheets, BigQuery or your warehouse on a schedule, and run multi-touch attribution over the result.

Marketing site, product app and public API are all in this repo and all run from `npm run dev`.

## Live platform integrations

Six connectors read the real reporting API. Add the credentials, connect the account, and the
dashboards, explorer, pipelines and public API all serve live rows.

| Provider | Auth | Reads | Access you have to obtain |
| --- | --- | --- | --- |
| Google Ads | OAuth | `googleAds:searchStream` GAQL, campaign or ad group level | Developer token from a manager account; basic access is an application |
| Meta (Facebook, Instagram) | OAuth | `/act_<id>/insights`, daily, with purchase actions and values | `ads_read`; other businesses' accounts need App Review and verification |
| TikTok Ads | OAuth | `/report/integrated/get/`, BASIC auction reports | Developer app approval |
| LinkedIn Ads | OAuth | `/rest/adAnalytics` pivoted by campaign, plus campaign names | Marketing Developer Platform access, the slowest of the six |
| Adform | Client credentials | `/v1/buyer/stats/data`, submit, poll, read | Credentials issued by Adform support |
| Google Analytics 4 | OAuth | `properties/<id>:runReport` | None beyond enabling the API |

Setup, scopes, redirect URIs and the approval notes live at `/docs/connectors` in the running app,
and the variables are listed in `.env.example`. Nothing is hard-coded: a provider with missing
environment variables shows as "needs setup" rather than failing at request time.

**How live mode behaves**

- A connection is live when it holds platform credentials and its provider is configured; everything
  else serves sample rows, so a workspace with approvals pending still renders.
- Tokens are encrypted at rest with AES-256-GCM under a key derived from `APP_SECRET`, refreshed
  automatically before expiry, and never sent to the browser.
- Fetched rows are cached per connection and window (1h hourly, 6h daily, 24h weekly). "Sync now"
  clears that cache.
- A failing source keeps its error on the connection and raises a banner on the overview with a
  reconnect link, instead of silently returning fewer rows.

## What is still simulated

| Real | Simulated |
| --- | --- |
| The six integrations above, including OAuth, token refresh, paging and error handling | Metric rows for every other connector in the catalogue, from a seeded PRNG |
| Accounts, sessions, connections, pipelines, API keys (persisted) | Pipeline delivery: schedules and runs are recorded, files are not written to BigQuery or Sheets yet |
| Query engine: field validation, filters, group-by, ratio recomputation, ordering, limits, CSV | Conversion paths for attribution |
| Attribution engine: six rule-based models plus Markov removal effect | - |

Attribution deserves the asterisk: ad platform APIs report aggregates, not visitor-level
touchpoints, so the models run on modelled paths. Real multi-touch attribution needs a tracking
script on your own site and identity stitching, which is a separate build.

Generated rows are deterministic: the same query returns the same figures on the server and in the
browser, which is what makes the charts and the API agree.

Connector marks are rendered as initials on the platform's brand colour. No third-party logo files
are shipped, and the product names belong to their owners.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
npm test             # 26 tests over the data, query, attribution, credential and provider layers
npm run typecheck
```

Demo login: **demo@adsconnect.io / demo1234** (seven sources already connected, two pipelines, one
API key). Signing up creates a fresh workspace with three starter sources.

Copy `.env.example` to `.env.local` and fill in whichever platforms you have credentials for. With
none set, everything runs on sample data.

State lives in `.data/db.json`, created on first write. Point `ADSCONNECT_DATA_DIR` elsewhere if you
want it somewhere else. On a read-only host the store falls back to memory.

## What is in the app

| Route | What it does |
| --- | --- |
| `/` `/connectors` `/destinations` `/pricing` `/attribution` `/docs` | Marketing site, including a live-data hero dashboard and a page per connector and destination |
| `/app` | Overview: KPI tiles with period-over-period deltas, spend and revenue trend, spend by source, top campaigns, source table, sync status |
| `/app/connectors` | Connected accounts with sync, pause, frequency and disconnect, plus the full catalogue and a three-step connect flow |
| `/app/destinations` | Pipelines: destination, sources, fields, schedule, run now, pause, delete |
| `/app/data` | Data explorer over every connected source, with filters, small-multiple trends, CSV download and the equivalent API URL |
| `/app/attribution` | Seven models side by side, credit vs last click, model comparison, path length distribution, top paths |
| `/app/api-keys` `/app/settings` | Key management and workspace settings |
| `/docs/connectors` | Per-platform setup: credentials, scopes, redirect URIs, approval notes |

## API

```bash
curl "http://localhost:3000/api/v1/all?api_key=ac_live_xxx\
&date_preset=last_30d\
&fields=date,source,campaign,spend,clicks,conversions,revenue,roas"
```

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/all` | Rows across every connected source. `fields`, `connector`, `date_preset`, `date_from`, `date_to`, `filter`, `order_by`, `limit`, `format=json\|csv` |
| `GET /api/v1/attribution` | Channel credit under `model=last_click\|last_non_direct\|first_click\|linear\|time_decay\|position_based\|markov` |
| `GET /api/v1/connectors` | Public catalogue with each connector's dimensions and metrics |

Auth is `?api_key=` or `Authorization: Bearer`. Unknown fields, bad filters and missing keys return
`400`/`401` with a message naming the offending value. Ratio metrics (`ctr`, `cpc`, `cpm`, `cpa`,
`roas`, `conversion_rate`) are recomputed from summed components after aggregation, never averaged,
so a weekly CTR is not an average of daily CTRs. Full reference at `/docs`.

## Layout

```
app/(marketing)   public site
app/app           authenticated product
app/api           auth, workspace CRUD, session-auth query, public v1 API
lib/catalog.ts    connector and destination definitions, field sets
lib/metrics.ts    seeded row generation, date handling, aggregation
lib/attribution.ts journeys, six rule models, Markov removal effect
lib/query.ts      the one query path used by the API, explorer and pipelines
lib/providers/    live platform adapters, one file each, plus the shared HTTP layer
lib/sources.ts    routes each connection to its platform or to sample data, with caching
lib/secrets.ts    AES-256-GCM credential encryption and signed OAuth state
lib/store.ts      JSON-backed store (revalidates across Next.js workers)
components/charts custom SVG charts: line, bar, donut, ranked bars, sparkline
tests/            node:test suite
```

Charts are hand-written SVG with a validated categorical palette, crosshair and hover tooltips, and
a table view beside every chart. No chart library.

## Adding another live connector

1. Add the entry to `CONNECTORS` in `lib/catalog.ts` with its extra dimensions and metrics.
2. Write `lib/providers/<name>.ts` implementing the `Provider` interface: `isConfigured`,
   `authorizeUrl`, `exchangeCode`, `refresh`, `listAccounts`, `fetchRows`. Keep the response mapper a
   pure exported function so it can be tested without network.
3. Register it in `lib/providers/index.ts`.

The OAuth routes, credential storage, refresh, caching, error surfacing, explorer, pipelines and the
public API are provider-agnostic and need no changes.
