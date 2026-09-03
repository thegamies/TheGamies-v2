# GitHub Actions secrets (setup)

CI reads **repository secrets** only. There are no required GitHub **Actions variables** (`vars.*`).

**Where:** repo → **Settings** → **Secrets and variables** → **Actions** → **Repository secrets**.

Copy values in by hand when they change (CI does not read Doppler). After you add or edit a secret, re-run the matching workflow so Workers pick it up (`secret bulk` on Cloudflare).

Related: [secrets.md](./secrets.md) (Doppler + how CI pushes to hosts), [deployment.md](./deployment.md), [setup-checklist.md](./setup-checklist.md).

## Required to deploy anything

Without these, host jobs skip:

| Secret | Used by |
|---|---|
| `CLOUDFLARE_API_TOKEN` | All Cloudflare Worker deploys |
| `CLOUDFLARE_ACCOUNT_ID` | All Cloudflare Worker deploys |

## Required for PR / branch previews

| Secret | Used by |
|---|---|
| `NEON_API_KEY` | Create/delete PR Neon branches; Auth domain registration |
| `NEON_PROJECT_ID` | Same |

Also needed on preview deploys if you want those features to work: `NEON_AUTH_COOKIE_SECRET`, `ADMIN_SYNC_SECRET`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, staging R2 bucket/base (`STAGING_R2_AVATAR_BUCKET`, `STAGING_AVATAR_PUBLIC_BASE_URL`) plus shared R2 account/keys. Preview `DATABASE_URL` / Auth URL come from the Neon branch CI creates — do not put production DB URLs here.

## Staging (`develop`)

| Secret | Becomes on the host | Notes |
|---|---|---|
| `STAGING_DATABASE_URL` | `DATABASE_URL` | Required. Staging migrate + app Worker + IGDB webhooks develop |
| `STAGING_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | Alias: `NEON_AUTH_BASE_URL` if the staging name is unset |
| `NEON_AUTH_COOKIE_SECRET` | same | 32+ chars. Staging + previews |
| `STAGING_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare staging public origin |
| `CRON_SECRET` | same | Edition freeze Cron (Cloudflare Worker). Shared with production |
| `ADMIN_SYNC_SECRET` | same | Site-operator claim + IGDB Worker proxy |
| `IGDB_CLIENT_ID` | same | Twitch / IGDB |
| `IGDB_CLIENT_SECRET` | same | Twitch / IGDB |
| `IGDB_WEBHOOK_SECRET` | same | Staging webhook slot base (`{base}:{entity}:{method}`). Never reuse on production |
| `IGDB_WEBHOOKS_WORKER_URL` | same | Staging app → develop webhook Worker. Optional; CI defaults to `https://thegamies-igdb-webhooks-develop.ecdm981.workers.dev` |
| `R2_ACCOUNT_ID` | same | Avatar uploads (account can be shared with production) |
| `R2_ACCESS_KEY_ID` | same | Avatar uploads (token must reach the staging bucket) |
| `R2_SECRET_ACCESS_KEY` | same | Avatar uploads |
| `STAGING_R2_AVATAR_BUCKET` | `R2_AVATAR_BUCKET` | Staging / preview upload bucket. Alias: `R2_AVATAR_BUCKET` if unset |
| `STAGING_AVATAR_PUBLIC_BASE_URL` | `AVATAR_PUBLIC_BASE_URL` | Staging / preview public CDN base. Alias: `AVATAR_PUBLIC_BASE_URL` if unset |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | same | Optional. Unset = site GA4 property. `off` disables |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | same | Optional. Unset = site AdSense publisher. `off` disables |
| `AUTH_EMAIL_FROM` | same | Optional. Cloudflare Auth mail From |

## Production (`main`)

**Never reuse `STAGING_*` on production.** Production Cloudflare (`thegamies-v2` + IGDB webhooks production) only reads the names below.

| Secret | Becomes on the host | Notes |
|---|---|---|
| `PRODUCTION_DATABASE_URL` | `DATABASE_URL` | Required. Production migrate + CF `secret bulk` (app + webhooks Worker). Never the develop Neon URL |
| `PRODUCTION_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | Production Neon Auth URL |
| `PRODUCTION_NEON_AUTH_COOKIE_SECRET` | `NEON_AUTH_COOKIE_SECRET` | Optional. Else CI uses `NEON_AUTH_COOKIE_SECRET` |
| `PRODUCTION_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare production public origin |
| `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL` | `IGDB_WEBHOOKS_WORKER_URL` | Production app → production webhook Worker. Never the develop URL |
| `PRODUCTION_IGDB_WEBHOOK_SECRET` | `IGDB_WEBHOOK_SECRET` | Production webhook slot base. Never the staging `IGDB_WEBHOOK_SECRET` |
| `CRON_SECRET` | same | Same secret as staging unless you choose to rotate later |
| `ADMIN_SYNC_SECRET` | same | Shared |
| `IGDB_CLIENT_ID` | same | Shared |
| `IGDB_CLIENT_SECRET` | same | Shared |
| `R2_ACCOUNT_ID` | same | Shared account id (same Cloudflare account is fine) |
| `R2_ACCESS_KEY_ID` | same | Shared (token must reach the **production** bucket) |
| `R2_SECRET_ACCESS_KEY` | same | Shared |
| `PRODUCTION_R2_AVATAR_BUCKET` | `R2_AVATAR_BUCKET` | **Production-only** upload bucket. Never the staging bucket |
| `PRODUCTION_AVATAR_PUBLIC_BASE_URL` | `AVATAR_PUBLIC_BASE_URL` | **Production-only** public CDN base |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | same | Optional. Unset = site GA4 property. `off` disables |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | same | Optional. Unset = site AdSense publisher. `off` disables |
| `AUTH_EMAIL_FROM` | same | Optional |

## Same value, two GitHub names (staging vs production)

| On the host | Staging GitHub secret | Production GitHub secret |
|---|---|---|
| `DATABASE_URL` | `STAGING_DATABASE_URL` | `PRODUCTION_DATABASE_URL` |
| `NEON_AUTH_BASE_URL` | `STAGING_NEON_AUTH_BASE_URL` (or `NEON_AUTH_BASE_URL`) | `PRODUCTION_NEON_AUTH_BASE_URL` |
| `NEON_AUTH_COOKIE_SECRET` | `NEON_AUTH_COOKIE_SECRET` | `PRODUCTION_NEON_AUTH_COOKIE_SECRET` (or `NEON_AUTH_COOKIE_SECRET`) |
| `NEXT_PUBLIC_APP_URL` | `STAGING_CF_APP_URL` | `PRODUCTION_CF_APP_URL` |
| `IGDB_WEBHOOKS_WORKER_URL` | `IGDB_WEBHOOKS_WORKER_URL` | `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL` |
| `IGDB_WEBHOOK_SECRET` | `IGDB_WEBHOOK_SECRET` | `PRODUCTION_IGDB_WEBHOOK_SECRET` |
| `R2_AVATAR_BUCKET` | `STAGING_R2_AVATAR_BUCKET` (or `R2_AVATAR_BUCKET`) | `PRODUCTION_R2_AVATAR_BUCKET` |
| `AVATAR_PUBLIC_BASE_URL` | `STAGING_AVATAR_PUBLIC_BASE_URL` (or `AVATAR_PUBLIC_BASE_URL`) | `PRODUCTION_AVATAR_PUBLIC_BASE_URL` |

Shared names (`CRON_SECRET`, `ADMIN_SYNC_SECRET`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, R2 account/keys, GA, `AUTH_EMAIL_FROM`) are one GitHub secret used by both lasting environments. **Upload bucket, public base, and IGDB webhook slot secret are not shared.**

## Not GitHub secrets

These are already in wrangler / CI — do not add them as Actions secrets unless you change the pipelines:

- IGDB queue / account ids (`IGDB_WEBHOOK_QUEUE_ID`, etc.)
- Cron pause KV namespace ids (`CRON_SETTINGS`) — production id in `wrangler.jsonc`; staging CI swaps the develop id
- Preview worker names / Neon branch URLs (CI-owned)

## After you save secrets

1. Staging: run **Staging deploy** (or push `develop`).
2. Production Cloudflare: push `main` (or the production workflow). Empty keys are skipped; existing Worker secrets for those keys stay.
