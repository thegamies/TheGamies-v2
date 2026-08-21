# IGDB Sync

Game metadata comes from the [IGDB API](https://api-docs.igdb.com/). Sync runs only on the server (CLI or admin API). Credentials never reach the browser.

## Model

**Core-first + link-then-enrich** (goty backfill/incremental mechanics + selective lookups):

1. **Games sync** upserts product rows and writes **junction links** by IGDB id (`game_platforms.platform_igdb_id`, etc.). No placeholder name rows in lookup tables.
2. **Enrich** loads distinct link ids for a scope (e.g. `--year 2026`), subtracts ids already in the lookup table, fetches **only missing** entities from IGDB, upserts real rows.
3. Cover art uses the `covers` table (`image_id` → CDN URL).

Entity stubbing (fake `[stub]` names) is not used.

## Endpoints

| Step | IGDB endpoint | Local writes |
|---|---|---|
| Core games | `/v4/games` | `games` + junction links; `cover_igdb_id`, `game_type_igdb_id` |
| Covers | `/v4/covers` | `covers` |
| Platforms | `/v4/platforms` | `platforms` |
| Genres | `/v4/genres` | `genres` |
| Themes | `/v4/themes` | `themes` |
| Keywords | `/v4/keywords` | `keywords` |
| Game types | `/v4/game_types` | `game_types` |
| Involved companies | `/v4/involved_companies` | roles + `company_igdb_id` on `game_companies` |
| Companies | `/v4/companies` | `companies` |
| Time to beat | `/v4/game_time_to_beats` | `game_time_to_beats` |

## Webhooks (Cloudflare Queue)

IGDB deliveries hit a **dedicated Worker** (`workers/igdb-webhooks`), not Vercel and not the OpenNext app Worker. Staging and production each have their own Worker, queue, and KV (see [`workers/igdb-webhooks/README.md`](../workers/igdb-webhooks/README.md)).

**Flow:**

1. IGDB `POST`s to `{worker}/igdb` with `X-Secret`.
2. Worker verifies the secret, builds an envelope, **enqueues** to Cloudflare Queue, returns **200** (keeps the subscription alive). Ingress never opens Neon.
3. A **cron every minute** checks KV cadence (`intervalMinutes`, `maxMessagesPerDrain`, `paused`). When due, it **pulls** a batch, writes `igdb_webhook_events`, applies catalog upserts/deletes, then acks/retries.
4. Ops configure cadence and registrations on `/admin/webhooks` (proxied to the Worker with the admin code).

**Cadence / mode:** default **Queued** — every 15 minutes, pull batches until empty. Switch to **Live** in `/admin/webhooks` to apply each delivery immediately (wakes Neon per event). Pause in Live routes new deliveries to the queue instead; **Drain now** still clears any backlog.

**Game deletes** set `games.igdb_removed_at` (soft delist) so list and standings rows are not cascaded away. Create/update clears that timestamp.

**Secrets / URLs:** see [secrets.md](./secrets.md) and [deployment.md](./deployment.md). Point IGDB registrations only at the Cloudflare webhook Worker URL. Do not auto-register PR preview workers against production IGDB slots.

## CLI

```bash
# Year backfill — auto-resumes unfinished year runs (omit --after)
doppler run -- pnpm sync:igdb backfill --year 2026
doppler run -- pnpm sync:igdb backfill --year 2026 --after 0   # force restart
doppler run -- pnpm sync:igdb enrich platforms --year 2026
doppler run -- pnpm sync:igdb enrich all --year 2026
doppler run -- pnpm sync:igdb enrich all                 # all years
doppler run -- pnpm sync:igdb import --year 2026               # resumes year backfill, then enrich
doppler run -- pnpm sync:igdb incremental
```

Resume looks at the latest `backfill` `sync_runs` row for that year (or full catalog when `--year` is omitted). Continues when the run errored, is still running, hit its page cap, or was marked truncated.

**Enrich** only fetches lookup rows whose IGDB ids appear on games/junctions but are **not yet** in the lookup table. It does not create stub/placeholder rows and does not re-hit IGDB for ids already enriched. Omit `--year` to enrich from the whole catalog.

Or `pnpm sync:igdb:secrets …`.

## Admin

`/admin/sync` — unlock with `ADMIN_SYNC_SECRET`, then run the same actions. Use **Continue year** to resume a truncated/failed year backfill; **Backfill year (from start)** forces `afterId: 0`. Check **Enrich all years** to omit the year filter (full catalog). Browser never talks to IGDB directly.

### Hosted timeouts (Vercel / Cloudflare)

`POST /api/admin/sync` sets `maxDuration = 300` (honored on Vercel Pro; **Hobby is still ~60s**). Cloudflare Workers also cap request duration.

- **Backfill / incremental** already run in page chunks (`maxPages`) so you can Continue.
- **Enrich all** in the admin UI fires **one entity per HTTP request** so each step gets its own budget. If a step times out, re-run — enrich only fetches missing lookups.
- A **single** entity with a huge missing set (e.g. all-years keywords) can still exceed 60s; use the CLI with no timeout:

```bash
doppler run -- pnpm sync:igdb enrich all
doppler run -- pnpm sync:igdb enrich covers   # omit --year = all years
```

## Local Neon branch

Recommended: lasting personal branch + Doppler `dev` / `dev_personal`:

1. Create Neon branch `local/<you>`.
2. `doppler secrets set DATABASE_URL="…" --config dev_personal`
3. `doppler run -- pnpm db:migrate`
4. `doppler run -- pnpm sync:igdb import --year 2026`
5. `pnpm dev:secrets`

Shared `dev` keeps the shared Neon URL. Personal override only changes your machine.

## PR previews

`preview.yml` creates `preview/pr-<n>`, runs `pnpm db:migrate` on that URL, then deploys both hosts.

## Packages

- `packages/db` — Drizzle schema + migrations
- `packages/igdb` — client, sync, CLI
