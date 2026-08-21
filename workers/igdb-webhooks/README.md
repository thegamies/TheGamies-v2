# IGDB webhooks Worker

Dedicated Cloudflare Worker for catalog webhook ingress + queued drain.

**Two lasting environments from day one** (mirrors site staging/prod):

| Env | Worker name | Queue | KV binding |
|---|---|---|---|
| Staging (`develop`) | `thegamies-igdb-webhooks-develop` | `igdb-webhooks-develop` | `IGDB_WEBHOOK_SETTINGS` (develop namespace) |
| Production | `thegamies-igdb-webhooks` | `igdb-webhooks` | `IGDB_WEBHOOK_SETTINGS` (prod namespace) |

PR previews do **not** get their own queue — use staging for admin/register.

## One-time Cloudflare setup

Create **both** queues (enable HTTP pull on each):

```bash
cd workers/igdb-webhooks

npx wrangler queues create igdb-webhooks-develop
npx wrangler queues consumer http add igdb-webhooks-develop

npx wrangler queues create igdb-webhooks
npx wrangler queues consumer http add igdb-webhooks
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
