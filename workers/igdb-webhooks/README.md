# IGDB webhooks Worker

Dedicated Cloudflare Worker for catalog webhook ingress and queued apply.

**Two lasting environments from day one** (mirrors site staging/prod):

| Env | Worker name | Queue | KV binding |
|---|---|---|---|
| Staging (`develop`) | `thegamies-igdb-webhooks-develop` | `igdb-webhooks-develop` | `IGDB_WEBHOOK_SETTINGS` (develop namespace) |
| Production | `thegamies-igdb-webhooks` | `igdb-webhooks` | `IGDB_WEBHOOK_SETTINGS` (prod namespace) |

PR previews do **not** get their own queue — use staging for admin/register.

## One-time Cloudflare setup

Create **both** queues (Worker consumer is attached on deploy — do **not** add HTTP pull; a queue can have only one consumer type):

```bash
cd workers/igdb-webhooks

npx wrangler queues create igdb-webhooks-develop
npx wrangler queues create igdb-webhooks
```

If a queue still has an HTTP pull consumer, remove it before deploy:

```bash
npx wrangler queues consumer http remove igdb-webhooks-develop
npx wrangler queues consumer http remove igdb-webhooks
```

Create **both** KV namespaces and paste ids into `wrangler.jsonc` (`env.develop` / `env.production`):

```bash
npx wrangler kv namespace create IGDB_WEBHOOK_SETTINGS_DEVELOP
npx wrangler kv namespace create IGDB_WEBHOOK_SETTINGS
```

Copy each queue’s UUID into that env’s `vars.IGDB_WEBHOOK_QUEUE_ID` (dashboard → Queues, or API). Set `CLOUDFLARE_ACCOUNT_ID` and optional `IGDB_WEBHOOK_PUBLIC_URL` (Worker origin, used when registering IGDB callbacks).

## Secrets (per env)

```bash
# Staging
npx wrangler secret put DATABASE_URL --env develop
npx wrangler secret put ADMIN_SYNC_SECRET --env develop
npx wrangler secret put IGDB_WEBHOOK_SECRET --env develop
npx wrangler secret put IGDB_CLIENT_ID --env develop
npx wrangler secret put IGDB_CLIENT_SECRET --env develop
npx wrangler secret put CLOUDFLARE_API_TOKEN --env develop

# Production
npx wrangler secret put DATABASE_URL --env production
npx wrangler secret put ADMIN_SYNC_SECRET --env production
npx wrangler secret put IGDB_WEBHOOK_SECRET --env production
npx wrangler secret put IGDB_CLIENT_ID --env production
npx wrangler secret put IGDB_CLIENT_SECRET --env production
npx wrangler secret put CLOUDFLARE_API_TOKEN --env production
```

Use the matching Neon branch URL for each env’s `DATABASE_URL`. Prefer different `IGDB_WEBHOOK_SECRET` values so a staging slot secret cannot authenticate against production.

## Deploy

```bash
pnpm deploy:igdb-webhooks:develop
pnpm deploy:igdb-webhooks:production
```

## App config

Point each app deploy’s `IGDB_WEBHOOKS_WORKER_URL` at the matching Worker origin (no trailing slash):

- Staging app → `https://thegamies-igdb-webhooks-develop.<account>.workers.dev` (or custom host)
- Production app → `https://thegamies-igdb-webhooks.<account>.workers.dev`

Register IGDB slots only from that env’s `/admin/webhooks` so callbacks stay on the correct Worker/queue.

## Logs (develop)

Workers Logs is on for `thegamies-igdb-webhooks-develop` only (not production). Cron writes a JSON line with `"msg":"igdb-webhooks"` and `"event":"delivery-sync"`.

Dashboard: Workers & Pages → `thegamies-igdb-webhooks-develop` → Logs.

Or:

```bash
pnpm --filter @thegamies/igdb-webhooks-worker exec wrangler tail --env develop
```

Redeploy the develop Worker after changing this (`pnpm deploy:igdb-webhooks:develop`).

## Delivery

The Worker `queue()` handler applies each batch (`max_concurrency: 1`, `max_batch_size`: 25). A batch smaller than 25 is treated as the last packet: Auto drain pauses until the next interval (cron will not reopen the current window). Sticky **Open** stays on. A batch of 25 keeps delivery going. Cron every minute only pause/resumes Cloudflare queue delivery from KV:

- **Auto** — open for `windowMinutes` at the start of each `intervalMinutes` cycle (UTC)
- **Open** — always deliver; cron will not pause
- **Closed** — always paused; cron will not resume; ingress still enqueues

Saving settings PATCHes `delivery_paused` immediately. `POST /internal/drain` resumes delivery (409 if Closed) and marks the queue as still draining. In Auto, that stays open until a short batch (under 25) or the next scheduled close.

`Failed query: <sql>` on a failed event is usually a dropped Neon HTTP call. The event log stores the underlying cause when present. Reprocess works for pending and failed.

