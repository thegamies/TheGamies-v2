# Secrets management

**Local:** [Doppler](https://www.doppler.com/) (Developer free plan) via `pnpm dev:secrets`.  
**Deployed hosts (Vercel / Cloudflare):** GitHub Actions secrets, pushed onto each deploy by CI. No Doppler service token required (Teams-only).

**CI does not read Doppler.** When app secrets change, **manually import / update them in GitHub Actions secrets**, then re-run the staging (or preview) deploy so hosts pick them up.

**Setup checklist (every secret name):** [github-secrets.md](./github-secrets.md).

Deploy credentials (`VERCEL_*`, `CLOUDFLARE_*`, `NEON_*` API keys) also stay in GitHub Actions.

## Doppler (local only)

```text
Project: thegamies   (see doppler.yaml)

Development
  ├─ dev              → shared local/develop defaults
  └─ dev_personal     → your laptop overrides (keep enabled)

Preview / Production configs are optional for local reference; CI does not read Doppler.
```

| Config | Used for |
|---|---|
| `dev` | Shared defaults you copy into GitHub for deploys |
| `dev_personal` | Local overrides (private Neon branch, localhost URL, etc.) |

[`doppler.yaml`](../doppler.yaml) pins **`config: dev`** — do **not** change it to `dev_personal` (that config is per-developer and must not be committed as the repo default).

### Personal Neon branch (`dev_personal`)

Put your private branch URL (e.g. Neon **rapid-snow**) on **`dev_personal`** as `DATABASE_URL`. Shared `dev` may point at a different branch (e.g. **plain-sound**).

If `doppler run` reports `DOPPLER_CONFIG=dev` (personal configs not applied), **force** `dev_personal`:

```bash
# Check which DB host you will hit (no password printed)
doppler run --config dev_personal -- node -e "console.log((process.env.DATABASE_URL||'').match(/@([^/?]+)/)?.[1])"

# Migrate / dev / sync against your personal branch
doppler run --config dev_personal -- pnpm db:migrate
doppler run --config dev_personal -- pnpm dev
doppler run --config dev_personal -- pnpm sync:igdb import --year 2026
```

`pnpm db:migrate:secrets` and `pnpm dev:secrets` only use `dev_personal` automatically when Doppler Development **personal configs are enabled** and the CLI is set up for them. Verify:

```bash
doppler run -- node -e "console.log(process.env.DOPPLER_CONFIG)"
# expect: dev_personal   (or enable personal configs / use --config dev_personal)
```

```bash
pnpm preview:cf:secrets   # Cloudflare local preview (WSL/Linux)
```

Never commit `.env`.

## GitHub Actions → hosts (deploy path)

CI reads repo secrets and injects them on staging / preview / production Cloudflare deploys:

| GitHub secret | Becomes | Used by |
|---|---|---|
| `STAGING_DATABASE_URL` | `DATABASE_URL` | develop staging (both hosts) |
| `STAGING_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | develop staging (alias: GitHub `NEON_AUTH_BASE_URL` also accepted) |
| `NEON_AUTH_COOKIE_SECRET` | same | staging + PR previews (32+ chars) |
| `STAGING_VERCEL_APP_URL` | `NEXT_PUBLIC_APP_URL` | Vercel staging only (or use `VERCEL_STAGING_ALIAS`) |
| `STAGING_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare staging only |
| `PRODUCTION_DATABASE_URL` | `DATABASE_URL` | Production Cloudflare app Worker + IGDB webhooks Worker. Never `STAGING_DATABASE_URL` |
| `PRODUCTION_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | Production Cloudflare app Worker (production Neon Auth URL) |
| `PRODUCTION_NEON_AUTH_COOKIE_SECRET` | `NEON_AUTH_COOKIE_SECRET` | Production Cloudflare (alias: GitHub `NEON_AUTH_COOKIE_SECRET`) |
| `PRODUCTION_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare production only |
| `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL` | `IGDB_WEBHOOKS_WORKER_URL` | Production app → production webhook Worker. Never the develop URL |
| `ADMIN_SYNC_SECRET` | same | staging + PR previews |
| `CRON_SECRET` | same | Vercel Cron + Cloudflare Worker Cron (`scheduled` → `/api/cron/edition-freeze`, Bearer). Staging and production CI inject onto the matching OpenNext Worker |
| `IGDB_CLIENT_ID` | same | staging + PR previews |
| `IGDB_CLIENT_SECRET` | same | staging + PR previews |
| `IGDB_WEBHOOK_SECRET` | same | Base secret for IGDB webhook slots (`{base}:{entity}:{method}`) — staging/production webhooks Worker `secret bulk` + local register |
| `IGDB_WEBHOOKS_WORKER_URL` | same | Staging app → develop webhook Worker. Staging CI injects onto the app (defaults to `https://thegamies-igdb-webhooks-develop.ecdm981.workers.dev` if unset) |
| `IGDB_WEBHOOK_QUEUE_ID` | Worker var (per env) | Queue UUID for pause/resume (`igdb-webhooks-develop` vs `igdb-webhooks`) |
| `CLOUDFLARE_API_TOKEN` | Worker secret | Queues Edit token used by the webhook Worker to pull/ack (may reuse deploy token if scoped) |
| `R2_ACCOUNT_ID` | same | avatar uploads (Cloudflare R2; shared account is fine) |
| `R2_ACCESS_KEY_ID` | same | avatar uploads (token must reach both staging and production buckets) |
| `R2_SECRET_ACCESS_KEY` | same | avatar uploads |
| `R2_AVATAR_BUCKET` | same | Legacy alias for `STAGING_R2_AVATAR_BUCKET` |
| `AVATAR_PUBLIC_BASE_URL` | same | Legacy alias for `STAGING_AVATAR_PUBLIC_BASE_URL` |
| `STAGING_R2_AVATAR_BUCKET` | `R2_AVATAR_BUCKET` | **staging / preview** upload bucket |
| `STAGING_AVATAR_PUBLIC_BASE_URL` | `AVATAR_PUBLIC_BASE_URL` | **staging / preview** public CDN base |
| `PRODUCTION_R2_AVATAR_BUCKET` | `R2_AVATAR_BUCKET` | **production** upload bucket (separate from staging) |
| `PRODUCTION_AVATAR_PUBLIC_BASE_URL` | `AVATAR_PUBLIC_BASE_URL` | **production** public CDN base |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | same | GA4 measurement id (public; inlined at build). Unset = no analytics |
| `AUTH_EMAIL_FROM` | same | Optional. Cloudflare Auth mail From address (default `The Gamies <noreply@thegamies.gg>`) |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | same | Optional on the app: close Auth directory users (Console → Auth → Users). Also used in CI for PR branches. |

PR previews: Neon branch URL from CI overrides `DATABASE_URL` / auth; static keys above still come from GitHub.

**Cloudflare:** Staging CI runs `wrangler secret bulk` on `thegamies-v2-develop` and, when paths match, on the IGDB webhooks Worker. Production CI writes `.dev.vars`, deploys `thegamies-v2`, then `secret bulk` from **production** GitHub secrets only (never `STAGING_*`). IGDB webhooks production bulk still requires `PRODUCTION_DATABASE_URL`. Empty keys are skipped; existing Worker secrets for those keys are left as-is.  
**Vercel:** Staging CI passes `--env` on each deployment. Production Vercel still uses `vercel pull --environment=production` (set vars on the Vercel project).

**Manual import (required):** Copy values into the GitHub secrets above when they change. Free-plan Doppler has no service-token CI path; do not rely on auto-sync for this deploy process.

## Deploy credentials (GitHub only)

| Secret | Purpose |
|---|---|
| `NEON_API_KEY`, `NEON_PROJECT_ID` | PR database branches |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | Vercel deploys |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Workers deploys |
| `VERCEL_STAGING_ALIAS` | Optional stable Vercel hostname |

## Rules

1. Doppler = laptop. GitHub = what CI pushes to hosts.
2. **Manually import** app secrets into GitHub when they change — CI never pulls Doppler.
3. Production DB URL never used for local or PR previews.
4. PR databases are ephemeral — CI-owned.
5. After changing GitHub app secrets, re-run the matching deploy (**Staging dual deploy** or production on `main`) so Workers pick them up via `secret bulk`.
