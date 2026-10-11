# Routes and test priority

Canonical list: [`src/lib/site-endpoints/catalog.ts`](../src/lib/site-endpoints/catalog.ts). Ranked tables are a standalone HTML file like load reports: `pnpm exec tsx scripts/cost/render-endpoints-html.ts` then open `e2e/.cost/endpoints.html`. Cursor: `.cursor/rules/site-endpoints.mdc`.

When you add, rename, or retire a `page.tsx`, `route.ts`, or an important save, update the catalog in the **same change**. Do not leave a new URL undocumented.

## How the scores work

Each row has editorial scores (not a live meter):

| Field | Meaning |
|---|---|
| **Use** | How often people will hit it. 5 = home / game / GOTY on a busy night. 1 = legal, redirects, ops. |
| **Database** | Cost of **one** hit: Neon round trips, fat SQL, writes. 5 = home activity + rails, game detail (~12 trips), list save (~13 trips), freeze. 1 = static explainer. |
| **Test priority** | What to put in load / integration first. **4 = test first** (high use **or** high database on a path that can spike). **1 = smoke / docs**. |
| **Cache easy** | Fit for OpenNext incremental cache on R2. 5 = public, few keys, stable. 1 = POST, session, or unbounded `q=`. |
| **Cache hard** | Invalidation pain. 5 = a person saving a list / library row / Pick’em sheet must purge (or the page lies). 1 = almost never. |

**Cache first** (HTML column) is `use × database × easy ÷ hard`. Sort that to pick R2 work. `/rankings` and default `/games` are easy wins. GOTY boards and `/` are high value but a list save has to drop the tag. Search `q=` is a bad first target (one key per string).

Test priority is **use × database**, then judgment (a rare freeze is still “should test” because one run is expensive; `/rankings` is used in the mix but cheap).

A streamer link spikes **use** on `/`, `/games/:slug`, and GOTY boards. Chat-dump writes spike **list save** and Pick’em sheets. Those stay at the top even if daily traffic is quiet.

## Test first (priority 4)

Hit these in staging traffic mixes and keep an eye on round trips (`docs/request-cost.md`).

| Route | Use | Database | Why |
|---|---|---|---|
| `GET /` | 5 | 5 | Land + activity feed. Streamer-link risk. |
| `GET /games` | 5 | 4 | Paged catalog + `count(*)`. |
| `GET /games?q=` | 4 | 4 | SQL title search. |
| `GET /games/:slug` | 5 | 5 | ~12 sequential trips. |
| `GET /api/games/search` | 4 | 3 | List-editor typeahead. |
| `GET /game-of-the-year` | 5 | 4 | GOTY hub. |
| `GET /game-of-the-year/:year` | 5 | 4 | Year standings. |
| `GET /game-of-the-year/:year/categories` | 4 | 4 | Category boards. |
| `GET /create/goty` | 4 | 3 | Editor; save is the heavy part. |
| list save (`saveOwnedListAction`) | 4 | 5 | ~10–13 trips per save. |

Already in the general load mix: `/`, `/games`, search, `/games/:slug`, GOTY, list/library writes.

## Should test (priority 3)

Shared list URLs, profiles, community live/results/ballot, Pick’em year pages, Auth proxy, edition freeze cron (rare clock, expensive SQL).

## Cover when touched (priority 2)

Members, settings, follow, `/people`, `/rankings`, Auth chrome, OG images, admin rebuild/sync.

## Smoke / docs (priority 1)

About, terms, privacy, redirects (`/game`, `/standings`, `/trending`), most ops screens.

## Mutations that are not URLs

List save, library, ballots, Pick’em sheets, follow, and community host tools are **server actions** (POST back to the page). They still get a catalog row because they are the write hot path. Staging load writes go through `POST /api/qa/loadtest` (not production).

## Related

- Request cost: `docs/request-cost.md`
- Load mix: `src/lib/request-cost/load-mix.ts`
