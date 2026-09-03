# Deployment

Hosting: **Cloudflare Workers (OpenNext)** only. Neon is the shared database/auth layer.

## Principles

1. One Next.js codebase; host adapters stay thin.
2. Every PR into `develop` gets a **Cloudflare Worker preview** (one URL) when CI secrets are configured.
3. Every push to `develop` deploys a lasting **staging** Worker.
4. One **Neon branch per PR**, parented from Neon **`develop`** (not production); the preview Worker uses that connection string.
5. Never point previews/staging at the production database.

## Local commands

```bash
pnpm install
pnpm dev              # Node Next.js (default local)
pnpm build            # next build
pnpm preview:cf       # OpenNext build + Wrangler local preview
pnpm deploy:cf        # OpenNext build + deploy to Cloudflare
```

## Project files

| File | Role |
|---|---|
| `wrangler.jsonc` | Cloudflare Worker name, compatibility, assets, observability (logs + traces). Edition freeze Cron Trigger is temporarily `[]` |
| `cloudflare-worker.ts` | OpenNext custom worker: `fetch` plus `scheduled` → edition freeze |
| `workers/igdb-webhooks/wrangler.jsonc` | Dedicated IGDB webhook Worker (Queue producer + consumer, KV delivery gate, cron pause/resume) |
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `public/_headers` | Long-cache headers for `/_next/static/*` |
| `.github/workflows/ci.yml` | Lint, typecheck, build on PR/push |
| `.github/workflows/preview.yml` | Neon branch + Cloudflare PR preview |
| `.github/workflows/branch-deploy.yml` | On-demand Cloudflare deploy for any git ref |
| `.github/workflows/staging.yml` | Push to `develop` → lasting staging Worker |
| `.github/workflows/production.yml` | Push to `main` → production Worker; also **Actions → Production Cloudflare deploy → Run workflow** (pick `main`) |

## Cloudflare notes

- OpenNext Cloudflare builds are verified in **Linux CI**. On native Windows, OpenNext may fail creating symlinks (`EPERM`); use WSL or rely on GitHub Actions for `pnpm preview:cf` / `pnpm deploy:cf`.
- **Edition freeze cron:** Temporarily **disabled** (`triggers.crons: []` in `wrangler.jsonc` so deploy removes the every-minute trigger). The `scheduled` handler in `cloudflare-worker.ts` remains: KV `CRON_SETTINGS` (pause from `/admin/scheduled`), then freeze via `WORKER_SELF_REFERENCE` + `CRON_SECRET`. Restore with `["* * * * *"]`. If `CRON_SECRET` is unset (typical for PR previews), the handler returns without work. Staging CI binds the develop KV namespace; production uses the id in `wrangler.jsonc`. PR/manual Workers omit that KV so they cannot pause lasting envs.
- **Observability:** App Worker and IGDB Workers persist logs, invocation logs, and traces (`observability` in wrangler, 100% sampling). Dashboard: Workers & Pages → the Worker → Observability.
- **IGDB webhooks Worker:** separate from OpenNext. Create **two** queues up front (`igdb-webhooks-develop`, `igdb-webhooks`) plus a KV namespace per env. The Worker is the queue consumer (not HTTP pull). Staging/production CI deploys it **only when relevant paths change** (`workers/igdb-webhooks/**`, `packages/igdb/**`, `packages/db/**`, `pnpm-lock.yaml`). Manual `workflow_dispatch` on staging also deploys it by default. Manual CLI: `pnpm deploy:igdb-webhooks:develop` / `pnpm deploy:igdb-webhooks:production`. Code deploys keep existing Worker secrets. Staging `secret bulk` only if dispatch checks `sync_igdb_webhook_secrets` (bulk publishes a second version). Point each app’s `IGDB_WEBHOOKS_WORKER_URL` at that env’s Worker. Register IGDB slots from `/admin/webhooks` on staging/production only — not every PR preview. Details: [`workers/igdb-webhooks/README.md`](../workers/igdb-webhooks/README.md).
- Local Node development remains `pnpm dev` and does not require OpenNext.

## Account setup (one-time)

### Neon

1. Create a Neon project for The Gamies v2.
2. Enable Neon Auth when ready (not required for static scaffold).
3. Create API key; note **project id**.
4. Production branch = default; previews create ephemeral branches in CI.

### Cloudflare

1. Cloudflare account with Workers enabled (Paid plan recommended for Worker size limits).
2. Create API token with Workers deploy permissions; note **account id**.
3. First deploy: `pnpm deploy:cf` after `wrangler login` (creates `thegamies-v2` worker).
4. Optional later: R2 bucket for Next incremental cache (`NEXT_INC_CACHE_R2_BUCKET`).

## GitHub Actions secrets

Full setup list (required vs optional, staging vs production): [github-secrets.md](./github-secrets.md).

Configure on the repo:

| Secret | Purpose |
|---|---|
| `NEON_API_KEY` | Create/delete PR database branches |
| `NEON_PROJECT_ID` | Neon project |
| `CLOUDFLARE_API_TOKEN` | Workers deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `STAGING_DATABASE_URL` | Neon URL for `develop` staging (`DATABASE_URL`) |
| `STAGING_NEON_AUTH_BASE_URL` | Auth URL for develop staging |
| `NEON_AUTH_COOKIE_SECRET` | Neon Auth cookie signing (32+ chars; staging + previews) |
| `STAGING_CF_APP_URL` | Optional `NEXT_PUBLIC_APP_URL` for Cloudflare staging (e.g. `https://thegamies-v2-develop.<account>.workers.dev`) |
| `PRODUCTION_DATABASE_URL` | Production Neon URL (`DATABASE_URL` on `thegamies-v2` and IGDB webhooks production). Never `STAGING_DATABASE_URL` |
| `PRODUCTION_NEON_AUTH_BASE_URL` | Production Neon Auth URL |
| `PRODUCTION_NEON_AUTH_COOKIE_SECRET` | Optional. Production cookie secret (else `NEON_AUTH_COOKIE_SECRET`) |
| `PRODUCTION_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` for Cloudflare production |
| `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL` | Production app → production IGDB webhook Worker origin |
| `PRODUCTION_IGDB_WEBHOOK_SECRET` | Production webhook slot base (host `IGDB_WEBHOOK_SECRET`). Never the staging secret |
| `CRON_SECRET` | Edition freeze cron (Cloudflare `scheduled` handler) |
| `IGDB_WEBHOOKS_WORKER_URL` | Staging app → IGDB webhooks Worker origin (defaults to the develop `workers.dev` URL if unset) |
| `IGDB_WEBHOOK_SECRET` | Staging webhook slot base (develop Worker `secret bulk`) |
| `ADMIN_SYNC_SECRET` | First site-operator claim + IGDB webhooks Worker proxy (staging + PR previews) |
| `IGDB_CLIENT_ID` | IGDB / Twitch client id |
| `IGDB_CLIENT_SECRET` | IGDB / Twitch client secret |
| `R2_ACCOUNT_ID` | Cloudflare account for avatar R2 |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_AVATAR_BUCKET` / `STAGING_R2_AVATAR_BUCKET` | Staging / preview upload bucket (prefer `STAGING_*`) |
| `AVATAR_PUBLIC_BASE_URL` / `STAGING_AVATAR_PUBLIC_BASE_URL` | Staging / preview public base (prefer `STAGING_*`) |
| `PRODUCTION_R2_AVATAR_BUCKET` | Production upload bucket (host env `R2_AVATAR_BUCKET`) |
| `PRODUCTION_AVATAR_PUBLIC_BASE_URL` | Production public base (host env `AVATAR_PUBLIC_BASE_URL`) |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 measurement id (public). Unset = site property. `off` disables gtag |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Optional. Unset = site AdSense publisher. `off` disables |

Until deploy credentials exist, `ci.yml` still runs quality checks; host deploys skip.

App secrets are stored in **GitHub** (manually imported) and pushed onto Cloudflare by CI — see [secrets.md](./secrets.md). Doppler remains for local `pnpm dev:secrets` only.

## Staging flow (`develop`)

```text
Push / merge to develop (or workflow_dispatch)
  → ci: lint + typecheck + build
  → migrate: pnpm db:migrate against STAGING_DATABASE_URL
  → staging: deploy Cloudflare worker thegamies-v2-develop
       (.dev.vars for build + wrangler secret bulk for runtime / dashboard)
  → igdb-webhooks: wrangler deploy thegamies-igdb-webhooks-develop when paths change
       (or always on workflow_dispatch unless force_igdb_webhooks is false;
        secret bulk only if sync_igdb_webhook_secrets)
```

Migrations run before the Worker deploy. If `STAGING_DATABASE_URL` is missing, migrate is skipped (Worker still deploys if Cloudflare secrets are set).

Cloudflare staging URL is stable across deploys (`thegamies-v2-develop.*.workers.dev`).

## PR preview flow

```text
PR opened/updated
  → ci: lint + typecheck + build
  → neon: create branch preview/pr-<n> from Neon `develop` (unique Auth URL via get_auth_url)
  → migrate / cloudflare: each job re-fetches DATABASE_URL via Neon API + branch_id
       (create-branch-action’s db_url cannot cross jobs — GitHub strips secret-bearing outputs)
  → register the Cloudflare origin as a Neon Auth trusted domain on that branch
  → comment the Worker URL on the PR
  → on PR close: delete Neon branch + optional CF preview worker
```

Helper: `scripts/ci/neon-database-url.sh <branch_id>` (pooled URI by default).

## Manual branch deploy (on demand)

Same Cloudflare + Neon stack as PR previews, but you choose when it runs.

```bash
# Deploy the current branch (slug derived from the branch name)
pnpm deploy:branch

# Deploy a specific ref with an explicit slug
pnpm deploy:branch -- cursor/my-feature-53d7 --slug my-feature

# Tear down Neon + Cloudflare for that slug
pnpm deploy:branch -- my-feature --slug my-feature --destroy
```

Or: GitHub → Actions → **Manual branch deploy** → Run workflow (`ref`, `slug`, `action`).

Resources:

| Resource | Name |
|---|---|
| Neon branch | `preview/manual-<slug>` |
| Cloudflare Worker | `thegamies-v2-manual-<slug>` |

Destroy removes the Neon branch and CF worker.

## Neon Auth URLs and domains

Two different “URLs” matter:

1. **Auth API URL (`NEON_AUTH_BASE_URL`)** — each Neon **database branch** gets its own Auth endpoint when Auth is enabled. CI reads it from `create-branch-action` (`get_auth_url: true`) and injects it into the Worker. Tokens from one branch are not valid on another.
2. **App origins (trusted domains)** — the hosts where the Next app runs (`*.workers.dev`, staging, production). Neon Auth will only redirect / accept CSRF origins that are allowlisted **on that Auth branch**.

What CI does for previews and manual deploys:

- Creates (or reuses) a Neon branch **parented from Neon `develop`** (not production) → gets `auth_url` + `branch_id`
- Downstream jobs resolve `DATABASE_URL` with `scripts/ci/neon-database-url.sh` (job outputs cannot carry the masked `db_url`)
- Deploys the Cloudflare Worker with that branch’s `DATABASE_URL` / `NEON_AUTH_BASE_URL`
- POSTs the deploy origin to Neon’s branch Auth domains API (`scripts/ci/register-neon-auth-domains.sh`)
- PUTs Auth **email webhooks** on that branch to the **Cloudflare** origin `/api/webhooks/neon-auth-email` (`scripts/ci/register-neon-auth-email-webhook.sh`). Staging does the same for Neon branch `develop` → worker `thegamies-v2-develop`.

Each Neon Auth branch has its own webhook URL. A preview Worker never receives production reset mail, and production never sends through a PR worker. Local personal branches: run the same script (or set the webhook in Console) against your Worker/`wrangler` preview URL.

The Neon branch name must be exactly `develop` (same branch `STAGING_DATABASE_URL` should point at). Rename in Neon or change `parent_branch` in the workflows if yours differs.

Staging CI also POSTs `STAGING_CF_APP_URL` as a trusted domain on Neon branch `develop`. Production App URLs still go in Neon Console → Auth → Configuration → Domains (exact origins), or a wildcard such as `https://*.workers.dev` if you want a broader preview allowlist. `localhost` ports are pre-approved; LAN IPs for phone testing are not — add those for local device testing.

You do **not** need one Neon Auth project per preview host. One Neon project, many branches; each branch carries its Auth URL + its own trusted-domain list.

## Production flow (`main`)

```text
Push / merge to main  —or—  Actions → Production Cloudflare deploy → Run workflow (branch: main)
  → migrate: pnpm db:migrate against PRODUCTION_DATABASE_URL (required; fails if missing)
  → cloudflare: deploy Worker thegamies-v2
       (.dev.vars for build + wrangler secret bulk for runtime; never STAGING_*)
  → igdb-webhooks: wrangler deploy thegamies-igdb-webhooks when paths change
       (or when workflow_dispatch checks force_igdb_webhooks;
        secret bulk only if sync_igdb_webhook_secrets)
```

1. Promote `develop` → `main` via PR — or re-run production from Actions on `main` after changing GitHub secrets (e.g. Auth URL).
2. CI migrates production Neon, then deploys `thegamies-v2`. Empty `PRODUCTION_DATABASE_URL` fails the workflow (no silent skip).
3. IGDB webhooks Worker `thegamies-igdb-webhooks` deploys when webhook-related paths change (after migrate), or when manual run enables force deploy.
4. Neon production branch only — never point `PRODUCTION_DATABASE_URL` at the develop branch.

## Environment variables

App secrets are managed in **GitHub Actions** for deploys and **Doppler** for local — see [secrets.md](./secrets.md).

Runtime keys (also listed in `.env.example`):

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL` (when Auth is enabled)
- `NEXT_PUBLIC_APP_URL` (per deployment)

Do not commit `.env` or `.dev.vars`.

Local with Doppler:

```bash
pnpm dev:secrets
```
