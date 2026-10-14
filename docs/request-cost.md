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

Game detail does not list public lists, and it does not query lists to decide ads. `/games/:slug` shows an ad whenever ads are enabled. The sitemap of game URLs is still the valued set (GOTY / category #1 / public lists), not the IGDB dump.

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

Published anonymous edition boards (Results, standings, categories, one category, Comparison, voters) share a Workers cache entry for 60 seconds, keyed by edition, view, mode, rank mode, category, and page (`https://thegamies.internal/cache/edition-public/…`). Signed-in Comparison and a named voter’s ballot stay live. The open ballot count stays live. A custom-award backfill runs only when the freeze meta says those rows are still missing. Community headers pass the Pick’em year from the community join and skip the slate completeness scan. Member and host counts are one aggregate.

## Link prefetch

Next.js `<Link>` prefetch is **off**: import `Link` from `@/lib/next-link` (lint bans `next/link`). A bundler alias over `next/link` did not apply in Turbopack production builds, so every link prefetched until imports were switched (found by the cost journey, 2026-10-08). Prefetch is not a free hint: it runs the destination route on the Worker (same queries as a real visit) and ships the RSC payload. A homepage of game covers would otherwise prefetch many `/games/[slug]` pages. Opt in with `prefetch={true}` only when the destination is cheap and a click is likely. Decorative art is not a link. Homepage discover strips (`Trending`, `Upcoming`) are SQL-capped (`HOME_DISCOVER_CAP`, 12).

Default `/games` pager total is `site_settings.catalog_game_count` (listed non-adult games), refreshed after IGDB game upserts — not `COUNT(*)` of `games` on every visit. Year and release filters still count. Hub search (`/games?q=`) pages with `LIMIT` + one extra row and does not count matches. Hub search and list-editor typeahead (`GET /api/games/search`) share `cachedBrowseGames`: Workers Cache API for 5 minutes, keyed by normalized `q` + filters + limit/offset + that catalog count (colo-local; a newly listed game changes the key). The hub HTML around those hits stays live. Public **site** trending (`/` strip and `/games?sort=trending` without a following/community scope) is stored in the Workers Cache API for 60 seconds (colo-local; TTL is the purge). Following and community trending stay live SQL. The rest of the public homepage — Big Picture, upcoming, landing top 5, category winners, and the promoted Pick’em schedule — shares one Workers Cache entry for 60 seconds (`https://thegamies.internal/cache/home-public`). Session and create/edit buttons stay live. A failed standings load is not cached. The homepage banner reads the promoted year’s open and show-start times and skips the slate completeness check.

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
| Response headers | `x-cost-wall-ms`, `x-cost-db-ms` (sum / work), `x-cost-db-span-ms` (overlap union / clock), `x-cost-db-trips`, `x-cost-db-trip-detail` (SQL fingerprints, no binds; load runner; not product UI) |

DB counting hooks `neonConfig.fetchFunction` (`packages/db/src/request-cost.ts`) and is a plain `fetch` when the meter is off. Worker CPU time is not visible from inside the Worker; read it from the invocation log Cloudflare records next to each line (Workers Logs, filter `journey`).

### Neon query time (same table as Console → Monitoring → Query performance)

`dbMs` on the Worker is **wait** (HTTP to Neon). Postgres execution time is `pg_stat_statements` (`mean_exec_time` / `total_exec_time`). The Console view reads a system copy. On **develop only**, the same extension is installed in `neondb` (one-off, not a shipped migration) so agents can query it. Production stays without the app-database extension.

The load runner snapshots `pg_stat_statements` before and after each scenario (same `DATABASE_URL` as staging/develop) and writes the delta into the HTML/markdown. **Exec** columns on Neon trips are a best-effort join on the Worker SQL fingerprint; unmatched exec stays in its own table. The window also includes any other develop traffic. Do not `pg_stat_statements_reset()` from the runner.

From Cursor, on develop (`br-royal-hall-ax9tmxqg`, `neondb`):

- Neon MCP `inspect_database` with `check`: `outliers` (highest total time) or `calls` (most frequent)
- Neon MCP `list_slow_queries` (`min_execution_time` in ms; default 1000 hides cheap-but-chatty SQL)
- SQL: `SELECT calls, mean_exec_time, total_exec_time, query FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 25`

Stats **reset when the compute suspends or restarts**. They are not per HTTP request and are not CU-hours. If the develop branch is reset from parent and the extension disappears, recreate it once on develop only (`CREATE EXTENSION IF NOT EXISTS pg_stat_statements`) — do not add a migration.

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

### Edition Results document size (2026-10-14)

Ranked Results / Categories were ~1–2 MB uncompressed HTML+Flight on a small showcase fixture (~600 cover tags across many awards with heavy ties). Each card is small alone; the cost is **count × (HTML + Flight copy)**. Ranked strips stay a server `StandingStrip` instead of a client `HorizontalScroll` per award — same side‑by‑side cards, fewer client islands. Mouse drag is one shared listener, not a scroller island per award. Comparison still uses `HorizontalScroll` for column sync. Collapsing ties into stacks was tried and reverted so the ranked look stays unchanged. Standing cards, comparison cells, empty cells, and tie-stack covers use shared classes (native cover `img`, no per-card fill style) so that utility list is not copied into the HTML and the flight.

More journeys (homepage, game covers) and extra Neon HTTP `db.batch` on other boards are **paused**. A Playwright walk measures **one visit**. It does not estimate a traffic bill.

Which URLs to put in a mix first (use × database cost): [endpoints.md](./endpoints.md). Ranked HTML: `e2e/.cost/endpoints.html` after `pnpm exec tsx scripts/cost/render-endpoints-html.ts`.

### Estimating traffic cost (load test)

Neon bills **CU-hours** (compute size × time the endpoint is awake). Workers bill invocations and CPU. Hold concurrent traffic on **staging** long enough to read those dashboards. Do not treat a single cold request × 3600 as an hour of CU. Suspend-on-idle (staging is five minutes) dominates quiet periods.

**Never production. Not part of the staging `qa` job.** Same refuse path as QA (`QA_TARGET=staging`, HTTPS, not a production host).

Dedicated fixtures (ensure does **not** flip the live Pick’em schedule or QA showcase). The **`pickem`** scenario uses the **2025** slate:

- Community `gamies_qa_load` opted into TGA 2025. Joins stay closed so anonymous readers can open the community boards.
- First half: 2025 picks are open; writers save a complete sheet (every category). Second half: the runner locks 2025 and readers hit standings. The original 2025 schedule is restored when the run ends.
- One 2025 edition on that community. Ensure plants 1,000 filled seed ballots and marks the first 3 of those accounts as hosts, then leaves voting open. The `editions` run reads and writes ballots for the first half, publishes and freezes for the results half, then leaves the public results board up (past the spoiler entrance). The next run opens voting again at the start.

```bash
# Doppler: QA_TARGET=staging, QA_STAGING_URL, DATABASE_URL, QA_ACCOUNT_PASSWORD
# Writers also need LOADTEST_SECRET (GitHub → staging Worker; local Doppler)

pnpm qa:loadtest:ensure -- --writers 50
pnpm cost:load -- --scenario=pickem --duration=10m --vus-read=20 --writers=50
# or --all (three scenarios)
# teardown: pnpm qa:loadtest:purge

# Optional: 1000 public scale communities × 1000 is_seed users (no Neon Auth),
# each user a member with a complete 2025 community Pick’em sheet (~1M sheets).
# Staging only. Purge with pnpm qa:pickem-scale -- --purge
pnpm qa:pickem-scale -- --year 2025 --communities 1000 --users 1000
```

`--ramp` is k6 `ramping-vus`: VUs start at 0 and reach the target linearly, then hold for the rest of `--duration`. Default **30s**. `--ramp 0` starts every loop at once (the old stampede). Duration includes the ramp (90s with a 30s ramp is 30s climb + 60s hold).

Scenarios (each includes a general mix of home, `/games`, a game, **game search**, `/rankings` explainer, `/game-of-the-year`, **2025** GOTY standings, 2025 categories, rotating category boards, **`/create`**, **`/create/goty`**, **`/create/custom`**, load-test **profiles** `/u/:username`, and planted **share lists** `/u/:username/:listSlug`): `general`, `pickem` (2025 open then locked at halfway), `editions` (2025 ballots, then published results at halfway, including Reveal). Default duration **10m**, `--vus-read=20`, `--writers=0`. HTML documents only, plus list-editor `GET /api/games/search`. Individual category URLs roll up as `/game-of-the-year/:year/categories?category=:id`. Search queries roll up as `/games?q=:q` and `/api/games/search?q=:q` (equal mix weights). Queries are drawn from the fixture catalog: **full title** most often, some mid-length tokens, and a few **2–3 character** prefixes. Re-run `pnpm qa:loadtest:ensure` so `fixtures.json` includes titles. `pickem-open` / `pickem-locked` still parse as `pickem`. `editions-filling` / `editions-results` still parse as `editions`.

Each run writes `e2e/.cost/load-{scenario}-{timestamp}.md` (counts, p50/p90/p95/p99 by group and by path/op, errors, UTC window), plus `.json` samples and `.html` with filters for group, kind (`/games/:slug` rolls up game pages; `/u/:username/:listSlug` rolls planted share URLs; Path chips drill into one slug. `list-create/:n`, `list-edit/:n`, and `list-delete/:n` roll up the same way; Path chips are `list-create/1` … `list-create/10`), and status. Endpoint and Neon-trip tables include **% time** (share of summed client time / summed trip wait in the current filter) and **Neon CPU** (mean Postgres exec per successful request: statement mean × trips on that URL). HTML tables use separate percentile columns, a percentile visibility filter, horizontal scroll, and click-to-sort headers. A timeline buckets the run (auto / 1s / 10s / 1m) and counts how many client requests in each bucket were at least as slow as the run’s p50 / p90 / p95 / p99. Client times are the load runner’s HTTP round-trip. After this Worker is on staging, samples store wall, **db clock** (`x-cost-db-span-ms`, overlap union), **db sum** (`x-cost-db-ms`, parallel trips add), and per-trip SQL fingerprints (`x-cost-db-trip-detail`, no bind params). Rebuild HTML from JSON with `pnpm exec tsx scripts/cost/render-load-html.ts e2e/.cost/load-….json`. Copy that window into Neon CU-hours and Cloudflare Worker CPU for `thegamies-v2-develop`. The report is not a dollar amount. `COST_LOAD_SKIP_REPAIR=1` skips edition repair and the 2025 Pick’em open/lock flip (GET-only smoke when fixtures already exist). Previous runs that only wrote markdown cannot be split by path.

Writers do not sign in. Each write sends the load-test secret and a writer index. The harness looks up that load-test profile and saves as them. That avoids Auth sign-in bursts.

Ensure builds a **capped** catalog pool (40 popular + 10 obscure by `popularity`, plus a 2025 ballot pool). List/library/GET game pages rotate across it (~80% popular). Each load-test account also gets one public custom list (`load-share`); readers pick from that group at random. Re-run `pnpm qa:loadtest:ensure` to refresh `fixtures.json` and to plant 1,000 filled 2025 ballots (3 hosts). Pick’em uses the real **2025** nominee slate; each writer fills every category (nominees rotate by writer index).

List writes are four labeled ops. Create, edit, and delete record **how many games** on the step (`list-create/5`, like `/games/hades`): **list-create/:n** (new list of 1–10), **list-edit/:n** (replace with 1–10), **list-delete/:n** (drop that many games). **list-reorder** stays one kind. Kind chips roll the counts; Path chips drill into `1`–`10`. Edit/reorder/delete seed an untimed create if the writer has no list yet (delete seeds at least as many games as it will drop). The API returns `publicId` so later writes reuse the list.

## Checklist (use on every list/search)

- [ ] What is the maximum rows this request can return? Is there a `LIMIT`?
- [ ] If membership/catalog is 10×, does this page still transfer a bounded payload?
- [ ] Is “search” a SQL query, or a filter over a full dump?
- [ ] Does a one-row write refetch an unbounded list or revalidate unrelated routes?
