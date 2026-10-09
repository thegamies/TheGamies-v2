# Request cost — efficient reads and writes

How we choose data paths so a page stays cheap as the product grows. Applies to **every** surface: public boards, ballots, settings, host tools, admin. “Operators are few” or “we’ll filter in the UI” does not exempt a query.

Cursor rule: `.cursor/rules/request-cost.mdc`. Short form also in [engineering.md](./engineering.md).

## The question

Before you load, freeze, cache, or search, ask how the **hot path** behaves—not only what the UI shows.

1. **DB egress** — Bytes from Neon to the app per request. Does this view pull a whole table, roster, or blob to render a page?
2. **Compute** — Parse/serialize and memory on Cloudflare Workers for that payload.
3. **Scale** — At 10× members, voters, games, or traffic, is the same pattern still cheap?

If the answer is “load everything, then slice,” the design is wrong.

## Lists

**Never load an unbounded list** without SQL `LIMIT` / `OFFSET` (or keyset) on the read path.

| Do | Don’t |
|---|---|
| Query the page you will render | `SELECT` every row, then paginate in JS/React |
| Cap default views (current Hosts, first page, recent hits) | Ship the full roster “because the dropdown/search needs it” |
| Same rules on settings/admin as on public boards | “Hosts will scroll; membership stays small” |

The client receives **only the rows it paints**. A 50-row page is 50 rows over the wire—not 5,000 with 50 displayed.

Game detail does not list every public list that includes the title; a capped public-list probe (`GAME_PUBLIC_LISTS_CAP`) still feeds ads / site-value signals. The sitemap of game URLs is the valued set (GOTY / category #1 / public lists), not the IGDB dump.

## Search is SQL, not a client filter

A search box that filters an already-downloaded list is **not search**. It is a filter, and it forces an unbounded load on every page view.

**Do**

- Default state: a small, purposeful set (e.g. current Hosts + community hosts), still `LIMIT`ed
- Typing: server query (`ILIKE` / indexes) with a **hit cap** (typically 20)
- `%term%` `ILIKE` on a large table needs a `gin_trgm_ops` index on **every** column in the `OR`; one unindexed column makes Postgres scan the whole table (see `src/lib/people/search-indexes.int.test.ts`)
- Blank query: return no search hits; show the default set—do not dump the catalog
- Debounce typeahead; do not refetch the full collection

**Don’t**

- Load all members/games/awards into the client so the input can `includes()` locally
- Use `getAll` + `array.filter` as the search implementation
- Grow the payload because “search needs to see everything”

## Writes

A small mutation (add/remove one Host, one category) should not pay for a large read.

- Persist the row; **optimistic UI** when the next paint is obvious
- Revalidate **the routes that show that row**, not the entire community (live, members, ballot, results, profile, …)
- After save, reload a **page-sized** list—not the unbounded collection you just forbade on first load

Neon HTTP is roughly **one round trip per query**. Serial `await`s stack. Don’t add extra community/edition/member fetches if you already have ids. Independent Results reads (freeze meta, GOTY top 10, category podiums, TGA nav) start together; GOTY top-N is one window `RANK` / `DENSE_RANK` query, same as category podiums. Wait for freeze ensure before board reads only when `freezeStatus` is not already `ready`.

## Link prefetch

Next.js `<Link>` prefetch is **off**: import `Link` from `@/lib/next-link` (lint bans `next/link`). A bundler alias over `next/link` did not apply in Turbopack production builds, so every link prefetched until imports were switched (found by the cost journey, 2026-10-08). Prefetch is not a free hint: it runs the destination route on the Worker (same queries as a real visit) and ships the RSC payload. A homepage of game covers would otherwise prefetch many `/games/[slug]` pages. Opt in with `prefetch={true}` only when the destination is cheap and a click is likely. Decorative art is not a link. Homepage discover strips (`Trending`, `Upcoming`) are SQL-capped (`HOME_DISCOVER_CAP`, 12). The trending helper reuses the existing windowed board query and ships only the first page of covers.

## Freeze and snapshots

Live lock and edition results freeze into **tables of rows**, not one giant JSON payload you parse to serve 50 standings. Page those rows in SQL. See [community.md](./features/community.md) and [engineering.md](./engineering.md).

## Measuring cost per visitor

Staging deploys with `REQUEST_COST_METER=1` (`--var` in `.github/workflows/staging.yml`; never production). With it on, the Worker entry (`src/lib/cloudflare/request-cost.ts`) logs one JSON line per request:

| Field | Meaning |
|---|---|
| `kind` | `document`, `rsc` (in-app navigation), `action` (Server Function), `image` (`/_next/image` transform), `api`, `other` |
| `dbRoundTrips` / `dbStatements` | Neon HTTP requests / SQL statements (a `db.batch` is one trip, several statements) |
| `dbBytes` | Decoded Neon response bytes: an upper bound on billed transfer |
| `responseBytes` | Uncompressed bytes the Worker sent |
| `journey` / `step` | From the `x-cost-journey` / `x-cost-step` request headers |

DB counting hooks `neonConfig.fetchFunction` (`packages/db/src/request-cost.ts`) and is a plain `fetch` when the meter is off. Worker CPU time is not visible from inside the Worker; read it from the invocation log Cloudflare records next to each line (Workers Logs, filter `journey`).

Run a journey against staging:

```bash
# both terminals: one tag per run
export COST_RUN_TAG=cost-$(date +%s)

# terminal 1: capture this run's Worker lines
mkdir -p e2e/.cost
pnpm exec wrangler tail thegamies-v2-develop --header "x-cost-journey:$COST_RUN_TAG" --format json > e2e/.cost/tail.json

# terminal 2 (same QA env as pnpm test:staging, plus COST_RUN_TAG)
pnpm cost:journeys
pnpm cost:report    # writes e2e/.cost/report.md
```

Each journey warms the first path **three** times (no `x-cost-journey` header) so Neon and the Worker are awake before the recorded document. Staging can sit idle for five minutes; a cold first hit is not comparable to a warm baseline. Set `COST_WARMUP_HITS=0` to skip.

Every staging deploy also runs the journeys in the `qa` job (non-blocking): the report lands in the job summary and the raw files in the `request-cost` artifact.

Journeys live in `e2e/cost/`; each step is a real visit (first step a full page load, later steps click the in-page link when present). Playwright disables the HTTP cache while it routes requests, so every image counts. The report shows unique images separately because Cloudflare Images bills unique transformations. Static `/_next/static` assets are served by the assets binding and do not invoke the Worker.

Current journeys: `edition-results` (Results → Full standings → Hosts standings → Categories → one category → Comparison → Voters → a voter's ballot), signed out and as a member.

Staging `qa` always runs that journey. Wrangler tail on CI often captures no `request_cost` lines (the report falls back to browser counts). For DB trips, bytes, and wall time, run locally with `wrangler tail` as above.

### What edition Results showed (2026-10-08–09)

- Duplicate community/edition/freeze reads were cut; independent board reads start together; GOTY top-N is one window `RANK` / `DENSE_RANK` query.
- Warm Worker + Neon: Results document is on the order of **11–13** DB round trips and **~350–500 ms** wall. A cold first hit can look like a regression; always warm (or ignore document 1).
- Link prefetch was still running destination RSC until imports switched to `@/lib/next-link`. After that, the Results step has **no prefetch RSC**; remaining RSC are real in-app clicks.

More journeys (homepage, game covers) and extra Neon HTTP `db.batch` on other boards are **paused**. A Playwright walk measures **one visit**. It does not estimate a traffic bill.

### Estimating traffic cost (load test)

Neon bills **CU-hours** (compute size × time the endpoint is awake). Workers bill invocations and CPU. To turn a per-visit journey into “what does N people cost,” run a **load test on staging** (never production): warm the compute, then hold concurrent traffic long enough to read CU-hours and Worker CPU from the dashboards. Compare that to the journey’s trips/bytes so you know whether the bill is “many round trips” or “compute stayed awake.”

Do not treat a single cold request × 3600 as an hour of CU. Suspend-on-idle (staging is five minutes) dominates quiet periods.

## Checklist (use on every list/search)

- [ ] What is the maximum rows this request can return? Is there a `LIMIT`?
- [ ] If membership/catalog is 10×, does this page still transfer a bounded payload?
- [ ] Is “search” a SQL query, or a filter over a full dump?
- [ ] Does a one-row write refetch an unbounded list or revalidate unrelated routes?
