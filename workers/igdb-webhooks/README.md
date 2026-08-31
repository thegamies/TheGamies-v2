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

Use the matching Neon branch URL for each env’s `DATABASE_URL`. Staging and production **must** use different `IGDB_WEBHOOK_SECRET` values so a staging slot secret cannot authenticate against production. Production CI maps GitHub `PRODUCTION_IGDB_WEBHOOK_SECRET` onto the Worker’s `IGDB_WEBHOOK_SECRET`.

Admin `/admin/webhooks` lists only IGDB slots whose callback URL matches this Worker. The other environment’s registrations are omitted, so a different base does not show as unrecognized or unregistered.

## Deploy

**CI (default):** push to `develop` / `main` deploys the matching Worker when these paths change:

- `workers/igdb-webhooks/**`
- `packages/igdb/**`
- `packages/db/**`
- `pnpm-lock.yaml`

Staging **workflow_dispatch** deploys the Worker even if those paths did not change (uncheck `force_igdb_webhooks` to follow the path filter). PR previews do **not** deploy this Worker.

Push deploys **code only** (`wrangler deploy`). Secrets already on the Worker stay put. `wrangler secret bulk` publishes a second version, so staging only bulk-syncs on **workflow_dispatch** with `sync_igdb_webhook_secrets`. Production only bulks if the job env has `SYNC_IGDB_WEBHOOK_SECRETS=true`.

**Manual:**

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

Workers Logs is on for `thegamies-igdb-webhooks-develop` only (not production). Cron writes a JSON line with `"msg":"igdb-webhooks"` and `"event":"delivery-sync"` (minute) or `"event":"log-cleanup"` (hourly).

Dashboard: Workers & Pages → `thegamies-igdb-webhooks-develop` → Logs.

Or:

```bash
pnpm --filter @thegamies/igdb-webhooks-worker exec wrangler tail --env develop
```

Redeploy the develop Worker after changing this (`pnpm deploy:igdb-webhooks:develop`).

## Delivery

The Worker `queue()` handler applies each batch (`max_concurrency: 10`, `max_batch_size`: 25) as one catalog unit: game create/updates share one upsert. It does not pause delivery. Cron every minute reads Cloudflare queue **metrics** (`backlog_count`) and pause/resumes:

- **Auto** — each `intervalMinutes` cycle, open while backlog is 25 or more. Pause when it drops under 25. Stay paused until the next cycle even if more than 25 wait. Drain / Open can resume earlier.
- **Open** — always deliver; drain will not pause
- **Closed** — always paused; cron will not resume; ingress still enqueues

Saving settings PATCHes `delivery_paused` immediately. `POST /internal/drain` resumes delivery (409 if Closed) and marks the queue as still draining. In Auto, that stays open until cron sees fewer than 25 messages waiting.

## Event log cleanup

A separate **hourly** cron (`0 * * * *`) **truncates** `igdb_webhook_events` when auto cleanup is enabled (KV `logRetentionHours` > 0). Minute cron never opens Neon for this. Admin **Clear event logs** always truncates. `POST /admin/events/cleanup` on the Worker.

`Failed query: <sql>` on a failed event is usually a dropped Neon HTTP call. The event log stores the underlying cause when present. Successful apply clears `payload`; Reprocess works for pending and failed until the table is truncated.
