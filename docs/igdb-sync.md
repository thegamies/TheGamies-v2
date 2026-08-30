# IGDB Sync

Game metadata comes from the [IGDB API](https://api-docs.igdb.com/). Sync runs only on the server (CLI or admin API). Credentials never reach the browser.

## Model

**Core-first + link-then-enrich** (goty backfill/incremental mechanics + selective lookups):

1. **Games sync** upserts product rows and writes **junction links** by IGDB id (`game_platforms.platform_igdb_id`, etc.). No placeholder name rows in lookup tables. Link wipe/rewrite runs only when the payload’s id lists change (`games.links_checksum`).
2. **Enrich** loads distinct link ids for a scope (e.g. `--year 2026`), subtracts ids already in the lookup table, fetches **only missing** entities from IGDB, upserts real rows.
3. Cover art uses the `covers` table (`image_id` → CDN URL). Artworks, screenshots, and videos use the same enrich/webhook model; wide stills use `t_720p`.

Entity stubbing (fake `[stub]` names) is not used.

## Endpoints

| Step | IGDB endpoint | Local writes |
|---|---|---|
| Core games | `/v4/games` | `games` + junction links; `cover_igdb_id`, `game_type_igdb_id` |
| Covers | `/v4/covers` | `covers` (including `image_type`) |
| Artworks | `/v4/artworks` | `artworks` + `game_artworks` (no deprecated `artwork_type`) |
| Screenshots | `/v4/screenshots` | `screenshots` + `game_screenshots` |
| Game videos | `/v4/game_videos` | `game_videos` + `game_video_links` |
| Image types | `/v4/image_types` | `image_types` |
| Platforms | `/v4/platforms` | `platforms` |
| Genres | `/v4/genres` | `genres` |
| Themes | `/v4/themes` | `themes` |
| Keywords | `/v4/keywords` | `keywords` |
| Game types | `/v4/game_types` | `game_types` |
| Involved companies | `/v4/involved_companies` | roles + `company_igdb_id` on `game_companies` |
| Companies | `/v4/companies` | `companies` |
| Time to beat | `/v4/game_time_to_beats` | `game_time_to_beats` |

## Webhooks (Cloudflare Queue)

IGDB deliveries hit a **dedicated Worker** (`workers/igdb-webhooks`), not the OpenNext app Worker. Staging and production each have their own Worker, queue, and KV (see [`workers/igdb-webhooks/README.md`](../workers/igdb-webhooks/README.md)).

**Flow:**

1. IGDB `POST`s to `{worker}/igdb` with `X-Secret`.
2. Worker verifies the secret, builds an envelope, **enqueues** to Cloudflare Queue, returns **200** (keeps the subscription alive). Ingress never opens Neon (except **Live** mode).
3. A **Worker queue consumer** (`queue()` handler, `max_concurrency: 10`, batch 25) applies the batch on a fresh isolate: game create/updates share one catalog upsert (last write per IGDB id). Cron every minute reads Cloudflare queue backlog and **pauses or resumes** delivery (Auto while 25+ wait, sticky Open, or Closed). Saving settings syncs that immediately. A separate **hourly** cron **truncates** `igdb_webhook_events` when auto cleanup is on (`0` disables). Ops can **Clear event logs** from `/admin/webhooks`.
4. Ops configure mode, delivery, event-log cleanup, and registrations on `/admin/webhooks` (site operators; the app proxies to the Worker with `ADMIN_SYNC_SECRET`). After this media work, re-register so **Artworks, Screenshots, Game videos, and Image types** slots exist (staging then production). Do not register deprecated Artwork Types.

A queue can have only one consumer type. This Worker is the consumer — do not also attach HTTP pull.

**Event log:** each delivery inserts a row with the IGDB body. After a **successful** apply, `payload` is cleared (metadata + status remain). Failed/pending rows keep the body for Reprocess. Hourly/manual cleanup truncates the table.

**Staging logs:** Workers Logs is enabled for `thegamies-igdb-webhooks-develop` (`wrangler tail --env develop`, or the Worker’s Logs tab). Cron emits JSON with `"msg":"igdb-webhooks"` and `"event":"delivery-sync"` (minute) or `"event":"log-cleanup"` (hourly). Production stays off until we want the volume.

**Cadence / mode:** default **Queued** + **Auto** — each `intervalMinutes` cycle, open while at least 25 messages wait; pause once fewer than 25 remain, and do not reopen until the next cycle (even if the backlog grows). **Open** keeps applying; cron will not pause. **Closed** holds messages; cron will not resume; ingress still enqueues. **Open delivery now** resumes the queue this cycle. **Live** applies on ingress unless delivery is Closed (then new events go to the queue). A `Failed query: <sql>` in the event log is almost always a dropped Neon HTTP call, not a bad game row.

Game create/update upserts already clear `igdb_removed_at`; there is no extra update after that.

**Game deletes** set `games.igdb_removed_at` (soft delist) so list and standings rows are not cascaded away. Create/update clears that timestamp.

**Secrets / URLs:** see [secrets.md](./secrets.md) and [deployment.md](./deployment.md). Point IGDB registrations only at the Cloudflare webhook Worker URL. Staging and production use **different** webhook slot bases. `/admin/webhooks` only shows slots for that environment’s callback URL. Do not auto-register PR preview workers against production IGDB slots. Staging and production CI deploy the Worker when `workers/igdb-webhooks`, `packages/igdb`, `packages/db`, or the lockfile change.

## CLI

```bash
# pnpm sync:igdb wraps Doppler (doppler.yaml `dev`, or `dev_personal` if
# personal configs apply). Force a config with:
# doppler run --config dev_personal -- pnpm sync:igdb …

# Year backfill — auto-resumes unfinished year runs (omit --after)
pnpm sync:igdb backfill --year 2026
pnpm sync:igdb backfill --year 2026 --after 0   # force restart
pnpm sync:igdb enrich platforms --year 2026
pnpm sync:igdb enrich all --year 2026
pnpm sync:igdb enrich all                 # all years
pnpm sync:igdb import --year 2026               # resumes year backfill, then enrich
pnpm sync:igdb incremental

# Full catalog by IGDB id (lowest first). Omit --max-pages to finish the entity.
pnpm sync:igdb catalog --entity platforms
pnpm sync:igdb catalog                          # all types, in order
pnpm sync:igdb catalog --after 0                # restart all from the first type

# Rows updated since a date (unix seconds or ISO). Same per-type id cursor.
pnpm sync:igdb updated --entity games --since 2026-01-01
pnpm sync:igdb updated                          # all types; since = last successful updated run
```

Resume looks at the latest `backfill` `sync_runs` row for that year (or full catalog when `--year` is omitted). Continues when the run errored, is still running, hit its page cap, or was marked truncated.

**Catalog / updated** each entity has its own IGDB id space (`catalog_covers` vs `catalog_games`). `all` runs types one after another; a failure resumes the current type from its last id and does not restart types that already finished in that pass. `--after 0` restarts the id cursor for that type (or the whole `all` pass).

**Enrich** only fetches lookup rows whose IGDB ids appear on games/junctions but are **not yet** in the lookup table. It does not create stub/placeholder rows and does not re-hit IGDB for ids already enriched. Omit `--year` to enrich from the whole catalog.

The CLI prints the Doppler config it is using (`dev` vs `dev_personal`). Admin Catalog sync still uses the Worker’s database for that hostname, not Doppler.

## Admin

`/admin/sync` — site operators only. Use **Continue year** to resume a truncated/failed year backfill; **Backfill year (from start)** forces `afterId: 0`. Check **Enrich all years** to omit the year filter (full catalog). **Walk from start** / **Continue catalog** (and the matching update-since controls) loop one IGDB page per request until that type finishes; leave the tab open. Continue after a failed page uses the last saved id. Browser never talks to IGDB directly.

### Hosted timeouts (Cloudflare)

`POST /api/admin/sync` can run for a long enrich. Cloudflare Workers cap request duration — prefer the CLI for large backfills.

- **Backfill / incremental** already run in page chunks (`maxPages`) so you can Continue.
- **Catalog / updated** in the admin UI fire **one IGDB page per request**; the page keeps requesting the next until that type (or all types) finishes. Leave the tab open. Continue after a failure uses the last saved id.
- **Enrich all** in the admin UI fires **one entity per HTTP request** so each step gets its own budget. If a step times out, re-run — enrich only fetches missing lookups.
- A **single** entity with a huge missing set (e.g. all-years keywords) can still exceed 60s; use the CLI with no timeout:

```bash
pnpm sync:igdb enrich all
pnpm sync:igdb enrich covers   # omit --year = all years
```

## Local Neon branch

Recommended: lasting personal branch + Doppler `dev` / `dev_personal`:

1. Create Neon branch `local/<you>`.
2. `doppler secrets set DATABASE_URL="…" --config dev_personal`
3. `doppler run -- pnpm db:migrate`
4. `pnpm sync:igdb import --year 2026`
5. `pnpm dev:secrets`

Shared `dev` keeps the shared Neon URL. Personal override only changes your machine.

## PR previews

`preview.yml` creates `preview/pr-<n>`, runs `pnpm db:migrate` on that URL, then deploys the Cloudflare preview Worker.

## Packages

- `packages/db` — Drizzle schema + migrations
- `packages/igdb` — client, sync, CLI
