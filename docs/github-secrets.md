# GitHub Actions secrets (setup)

CI reads **repository secrets** only. There are no required GitHub **Actions variables** (`vars.*`).

**Where:** repo → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**.

Copy values in by hand when they change (CI does not read Doppler). After you add or edit a secret, re-run the matching workflow so hosts pick it up (`secret bulk` on Cloudflare; `--env` on Vercel staging).

Related: [secrets.md](./secrets.md) (Doppler + how CI pushes to hosts), [deployment.md](./deployment.md), [setup-checklist.md](./setup-checklist.md).

## Required to deploy anything

Without these, host jobs skip:

| Secret | Used by |
|---|---|
| `CLOUDFLARE_API_TOKEN` | All Cloudflare Worker deploys |
| `CLOUDFLARE_ACCOUNT_ID` | All Cloudflare Worker deploys |
| `VERCEL_TOKEN` | All Vercel deploys |
| `VERCEL_ORG_ID` | All Vercel deploys |
| `VERCEL_PROJECT_ID` | All Vercel deploys |

## Required for PR / branch previews

| Secret | Used by |
|---|---|
| `NEON_API_KEY` | Create/delete PR Neon branches; Auth domain registration |
| `NEON_PROJECT_ID` | Same |

Also needed on preview deploys if you want those features to work: `NEON_AUTH_COOKIE_SECRET`, `ADMIN_SYNC_SECRET`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, R2 set (below). Preview `DATABASE_URL` / Auth URL come from the Neon branch CI creates — do not put production DB URLs here.

## Staging (`develop`)

| Secret | Becomes on the host | Notes |
|---|---|---|
| `STAGING_DATABASE_URL` | `DATABASE_URL` | Required. Staging migrate + both hosts + IGDB webhooks develop |
| `STAGING_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | Alias: `NEON_AUTH_BASE_URL` if the staging name is unset |
| `NEON_AUTH_COOKIE_SECRET` | same | 32+ chars. Staging + previews |
| `STAGING_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare staging public origin |
| `STAGING_VERCEL_APP_URL` | `NEXT_PUBLIC_APP_URL` | Vercel staging. Or set `VERCEL_STAGING_ALIAS` |
| `VERCEL_STAGING_ALIAS` | hostname | Optional stable Vercel alias |
| `CRON_SECRET` | same | Edition freeze Cron (Vercel + Cloudflare). Shared with production |
| `ADMIN_SYNC_SECRET` | same | Site-operator claim + IGDB Worker proxy |
| `IGDB_CLIENT_ID` | same | Twitch / IGDB |
| `IGDB_CLIENT_SECRET` | same | Twitch / IGDB |
| `IGDB_WEBHOOK_SECRET` | same | Webhook slot base (`{base}:{entity}:{method}`) |
| `IGDB_WEBHOOKS_WORKER_URL` | same | Staging app → develop webhook Worker. Optional; CI defaults to `https://thegamies-igdb-webhooks-develop.ecdm981.workers.dev` |
| `R2_ACCOUNT_ID` | same | Avatar uploads |
| `R2_ACCESS_KEY_ID` | same | Avatar uploads |
| `R2_SECRET_ACCESS_KEY` | same | Avatar uploads |
| `R2_AVATAR_BUCKET` | same | Avatar bucket name |
| `AVATAR_PUBLIC_BASE_URL` | same | Public CDN base for avatars |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | same | Optional. Unset = no analytics |
| `AUTH_EMAIL_FROM` | same | Optional. Cloudflare Auth mail From |

## Production (`main`)

**Never reuse `STAGING_*` on production.** Production Cloudflare (`thegamies-v2` + IGDB webhooks production) only reads the names below.

| Secret | Becomes on the host | Notes |
|---|---|---|
| `PRODUCTION_DATABASE_URL` | `DATABASE_URL` | Required for production CF `secret bulk` (app + webhooks Worker) |
| `PRODUCTION_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | Production Neon Auth URL |
| `PRODUCTION_NEON_AUTH_COOKIE_SECRET` | `NEON_AUTH_COOKIE_SECRET` | Optional. Else CI uses `NEON_AUTH_COOKIE_SECRET` |
| `PRODUCTION_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare production public origin |
| `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL` | `IGDB_WEBHOOKS_WORKER_URL` | Production app → production webhook Worker. Never the develop URL |
| `CRON_SECRET` | same | Same secret as staging unless you choose to rotate later |
| `ADMIN_SYNC_SECRET` | same | Shared |
| `IGDB_CLIENT_ID` | same | Shared |
| `IGDB_CLIENT_SECRET` | same | Shared |
| `IGDB_WEBHOOK_SECRET` | same | Shared base; slot URLs differ per env |
| `R2_ACCOUNT_ID` | same | Shared (same bucket unless you split later) |
| `R2_ACCESS_KEY_ID` | same | Shared |
| `R2_SECRET_ACCESS_KEY` | same | Shared |
| `R2_AVATAR_BUCKET` | same | Shared |
| `AVATAR_PUBLIC_BASE_URL` | same | Shared |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | same | Optional |
| `AUTH_EMAIL_FROM` | same | Optional |

**Vercel Production** does **not** get these from GitHub. Set Production env on the Vercel project (CI uses `vercel pull --environment=production`).

## Same value, two GitHub names (staging vs production)

| On the host | Staging GitHub secret | Production GitHub secret |
|---|---|---|
| `DATABASE_URL` | `STAGING_DATABASE_URL` | `PRODUCTION_DATABASE_URL` |
| `NEON_AUTH_BASE_URL` | `STAGING_NEON_AUTH_BASE_URL` (or `NEON_AUTH_BASE_URL`) | `PRODUCTION_NEON_AUTH_BASE_URL` |
| `NEON_AUTH_COOKIE_SECRET` | `NEON_AUTH_COOKIE_SECRET` | `PRODUCTION_NEON_AUTH_COOKIE_SECRET` (or `NEON_AUTH_COOKIE_SECRET`) |
| `NEXT_PUBLIC_APP_URL` (Cloudflare) | `STAGING_CF_APP_URL` | `PRODUCTION_CF_APP_URL` |
| `NEXT_PUBLIC_APP_URL` (Vercel) | `STAGING_VERCEL_APP_URL` / `VERCEL_STAGING_ALIAS` | Vercel dashboard (not GitHub) |
| `IGDB_WEBHOOKS_WORKER_URL` | `IGDB_WEBHOOKS_WORKER_URL` | `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL` |

Shared names (`CRON_SECRET`, `ADMIN_SYNC_SECRET`, `IGDB_*`, R2, GA, `AUTH_EMAIL_FROM`) are one GitHub secret used by both lasting environments.

## Not GitHub secrets

These are already in wrangler / CI — do not add them as Actions secrets unless you change the pipelines:

- IGDB queue / account ids (`IGDB_WEBHOOK_QUEUE_ID`, etc.)
- Cron pause KV namespace ids (`CRON_SETTINGS`) — production id in `wrangler.jsonc`; staging CI swaps the develop id
- Preview worker names / Neon branch URLs (CI-owned)

## After you save secrets

1. Staging: run **Staging dual deploy** (or push `develop`).
2. Production Cloudflare: push `main` (or the production workflow). Empty keys are skipped; existing Worker secrets for those keys stay.
3. Production Vercel: update the Vercel project Production env, then deploy.
