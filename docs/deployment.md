# Deployment

Dual-host deployment: **Vercel** and **Cloudflare Workers (OpenNext)**. Both are first-class. Neon is the shared database/auth layer.

## Principles

1. One Next.js codebase; host adapters stay thin.
2. Every PR into `develop` gets **both** preview URLs when CI secrets are configured.
3. Every push to `develop` deploys a lasting **staging** site on both hosts.
4. One **Neon branch per PR**, parented from Neon **`develop`** (not production); both previews use that connection string.
5. Never point previews/staging at the production database.

## Local commands

```bash
pnpm install
pnpm dev              # Node Next.js (default local)
pnpm build            # next build (used by both hosts)
pnpm preview:cf       # OpenNext build + Wrangler local preview
pnpm deploy:vercel    # requires Vercel CLI login + linked project
pnpm deploy:cf        # OpenNext build + deploy to Cloudflare
```

## Project files

| File | Role |
|---|---|
| `vercel.json` | Vercel build/framework hints; `git.deploymentEnabled: false` so only GitHub Actions deploys; cron for edition freeze |
| `wrangler.jsonc` | Cloudflare Worker name, compatibility, assets |
| `workers/igdb-webhooks/wrangler.jsonc` | Dedicated IGDB webhook Worker (Queue producer + consumer, KV delivery gate, cron pause/resume) |
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `public/_headers` | Long-cache headers for `/_next/static/*` |
| `.github/workflows/ci.yml` | Lint, typecheck, build on PR/push |
| `.github/workflows/preview.yml` | Neon branch + Vercel + Cloudflare PR previews |
| `.github/workflows/branch-deploy.yml` | On-demand dual-host deploy for any git ref |
| `.github/workflows/staging.yml` | Push to `develop` → lasting staging on both hosts |
| `.github/workflows/production.yml` | Push to `main` → production on both hosts |

## Cloudflare notes

- OpenNext Cloudflare builds are verified in **Linux CI**. On native Windows, OpenNext may fail creating symlinks (`EPERM`); use WSL or rely on GitHub Actions for `pnpm preview:cf` / `pnpm deploy:cf`.
- **Edition freeze cron:** Vercel hits `/api/cron/edition-freeze` every minute (`vercel.json`). On Cloudflare, schedule an HTTP cron (or Worker Cron that `fetch`es the Worker URL) with `Authorization: Bearer $CRON_SECRET` — OpenNext does not auto-route CF Cron Triggers to App Router routes.
- **IGDB webhooks Worker:** separate from OpenNext. Create **two** queues up front (`igdb-webhooks-develop`, `igdb-webhooks`) plus a KV namespace per env. The Worker is the queue consumer (not HTTP pull). Deploy with `pnpm deploy:igdb-webhooks:develop` / `pnpm deploy:igdb-webhooks:production`. Set Worker secrets/vars per `--env`. Point each app’s `IGDB_WEBHOOKS_WORKER_URL` at that env’s Worker. Register IGDB slots from `/admin/webhooks` on staging/production only — not every PR preview. Details: [`workers/igdb-webhooks/README.md`](../workers/igdb-webhooks/README.md).
- Local Node development remains `pnpm dev` and does not require OpenNext.

## Account setup (one-time)

### Neon

1. Create a Neon project for The Gamies v2.
2. Enable Neon Auth when ready (not required for static scaffold).
3. Create API key; note **project id**.
4. Production branch = default; previews create ephemeral branches in CI.

### Vercel

1. Import `thegamies/TheGamies-v2`.
2. Set root to repo root; framework Next.js; install `pnpm install`; build `pnpm build`.
3. Production branch: `main`. Preview branches: all (especially PRs into `develop`).
4. Create a Vercel token for CI; note **org id** and **project id** (`vercel link` locally).
5. Optional: Neon Vercel integration — CI still creates an explicit shared branch so Cloudflare can use the same DB.

### Cloudflare

1. Cloudflare account with Workers enabled (Paid plan recommended for Worker size limits).
2. Create API token with Workers deploy permissions; note **account id**.
3. First deploy: `pnpm deploy:cf` after `wrangler login` (creates `thegamies-v2` worker).
4. Optional later: R2 bucket for Next incremental cache (`NEXT_INC_CACHE_R2_BUCKET`).

## GitHub Actions secrets

Configure on the repo:

| Secret | Purpose |
|---|---|
| `NEON_API_KEY` | Create/delete PR database branches |
| `NEON_PROJECT_ID` | Neon project |
| `VERCEL_TOKEN` | Preview + production deploys |
| `VERCEL_ORG_ID` | Vercel team/org |
| `VERCEL_PROJECT_ID` | Vercel project |
| `CLOUDFLARE_API_TOKEN` | Workers deploy |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |
| `STAGING_DATABASE_URL` | Neon URL for `develop` staging (`DATABASE_URL`) |
| `STAGING_NEON_AUTH_BASE_URL` | Auth URL for develop staging |
| `NEON_AUTH_COOKIE_SECRET` | Neon Auth cookie signing (32+ chars; staging + previews) |
| `STAGING_VERCEL_APP_URL` | Optional `NEXT_PUBLIC_APP_URL` for Vercel staging |
| `STAGING_CF_APP_URL` | Optional `NEXT_PUBLIC_APP_URL` for Cloudflare staging (e.g. `https://thegamies-v2-develop.<account>.workers.dev`) |
| `ADMIN_SYNC_SECRET` | Unlock `/admin/sync` (staging + PR previews) |
| `IGDB_CLIENT_ID` | IGDB / Twitch client id |
| `IGDB_CLIENT_SECRET` | IGDB / Twitch client secret |
| `R2_ACCOUNT_ID` | Cloudflare account for avatar R2 |
| `R2_ACCESS_KEY_ID` | R2 access key |
| `R2_SECRET_ACCESS_KEY` | R2 secret key |
| `R2_AVATAR_BUCKET` | Avatar bucket (same as the prior Gamies) |
| `AVATAR_PUBLIC_BASE_URL` | Public base URL for avatar objects |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | GA4 measurement id (public; both hosts). Unset = no gtag |
| `VERCEL_STAGING_ALIAS` | Optional stable Vercel hostname; also used as public URL if `STAGING_VERCEL_APP_URL` unset |

Until deploy credentials exist, `ci.yml` still runs quality checks; host deploys skip.

App secrets are stored in **GitHub** (manually imported) and pushed onto Vercel/Cloudflare by CI — see [secrets.md](./secrets.md). Doppler remains for local `pnpm dev:secrets` only.

## Staging flow (`develop`)

```text
Push / merge to develop (or workflow_dispatch)
  → ci: lint + typecheck + build
  → migrate: pnpm db:migrate against STAGING_DATABASE_URL
  → staging: deploy Vercel with GitHub app secrets as --env
  → staging: deploy Cloudflare worker thegamies-v2-develop
       (.dev.vars for build + wrangler secret bulk for runtime / dashboard)
```

Migrations run before both host deploys. If `STAGING_DATABASE_URL` is missing, migrate is skipped (hosts still deploy if their secrets are set).

Cloudflare staging URL is stable across deploys (`thegamies-v2-develop.*.workers.dev`).
Vercel gets a new deployment URL each time unless you set `VERCEL_STAGING_ALIAS`.

## PR preview flow

```text
PR opened/updated
  → ci: lint + typecheck + build
  → neon: create branch preview/pr-<n> from Neon `develop` (unique Auth URL via get_auth_url)
  → migrate / vercel / cloudflare: each job re-fetches DATABASE_URL via Neon API + branch_id
       (create-branch-action’s db_url cannot cross jobs — GitHub strips secret-bearing outputs)
  → register Vercel + Cloudflare origins as Neon Auth trusted domains on that branch
  → comment both URLs on the PR
  → on PR close: delete Neon branch + optional CF preview worker
```

Helper: `scripts/ci/neon-database-url.sh <branch_id>` (pooled URI by default).
## Manual branch deploy (on demand)

Same dual-host stack as PR previews, but you choose when it runs.

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
| Vercel | Preview deployment URL for that commit |

Destroy removes the Neon branch and CF worker. Vercel preview deployments are left alone (they expire on Vercel’s schedule).

## Neon Auth URLs and domains

Two different “URLs” matter:

1. **Auth API URL (`NEON_AUTH_BASE_URL`)** — each Neon **database branch** gets its own Auth endpoint when Auth is enabled. CI reads it from `create-branch-action` (`get_auth_url: true`) and injects it into Vercel/Cloudflare. Tokens from one branch are not valid on another.
2. **App origins (trusted domains)** — the hosts where the Next app runs (`*.vercel.app`, `*.workers.dev`, staging, production). Neon Auth will only redirect / accept CSRF origins that are allowlisted **on that Auth branch**.

What CI does for previews and manual deploys:

- Creates (or reuses) a Neon branch **parented from Neon `develop`** (not production) → gets `auth_url` + `branch_id`
- Downstream jobs resolve `DATABASE_URL` with `scripts/ci/neon-database-url.sh` (job outputs cannot carry the masked `db_url`)
- Deploys both hosts with that branch’s `DATABASE_URL` / `NEON_AUTH_BASE_URL`
- POSTs each deploy origin to Neon’s branch Auth domains API (`scripts/ci/register-neon-auth-domains.sh`)
- PUTs Auth **email webhooks** on that branch to the **Cloudflare** origin `/api/webhooks/neon-auth-email` (`scripts/ci/register-neon-auth-email-webhook.sh`). Staging does the same for Neon branch `develop` → worker `thegamies-v2-develop`.

Each Neon Auth branch has its own webhook URL. A preview Worker never receives production reset mail, and production never sends through a PR worker. Local personal branches: run the same script (or set the webhook in Console) against your Worker/`wrangler` preview URL.

The Neon branch name must be exactly `develop` (same branch `STAGING_DATABASE_URL` should point at). Rename in Neon or change `parent_branch` in the workflows if yours differs.

What you still configure by hand for lasting environments:

- Staging / production App URLs in Neon Console → Auth → Configuration → Domains (exact origins), or wildcards such as `https://*.vercel.app` / `https://*.workers.dev` if you want a broader preview allowlist
- `localhost` ports are pre-approved; LAN IPs for phone testing are not — add those for local device testing

You do **not** need one Neon Auth project per preview host. One Neon project, many branches; each branch carries its Auth URL + its own trusted-domain list.

## Production flow

1. Promote `develop` → `main` via PR.
2. Vercel production deploy from `main`.
3. Cloudflare production deploy of worker `thegamies-v2` (CI on `main` or `pnpm deploy:cf`).
4. Neon production branch only.

## Environment variables

App secrets are managed in **GitHub Actions** for deploys and **Doppler** for local — see [secrets.md](./secrets.md).

Runtime keys (also listed in `.env.example`):

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL` (when Auth is enabled)
- `NEXT_PUBLIC_APP_URL` (host-specific per deployment)

Do not commit `.env`, `.dev.vars`, or `.vercel`.

Local with Doppler:

```bash
pnpm dev:secrets
```
