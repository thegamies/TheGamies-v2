# Secrets management

**Local:** [Doppler](https://www.doppler.com/) (Developer free plan) via `pnpm dev:secrets`.  
**Deployed hosts (Vercel / Cloudflare):** GitHub Actions secrets, pushed onto each deploy by CI. No Doppler service token required (Teams-only).

**CI does not read Doppler.** When app secrets change, **manually import / update them in GitHub Actions secrets**, then re-run the staging (or preview) deploy so hosts pick them up.

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

CI reads repo secrets and injects them on every staging / preview deploy:

| GitHub secret | Becomes | Used by |
|---|---|---|
| `STAGING_DATABASE_URL` | `DATABASE_URL` | develop staging (both hosts) |
| `STAGING_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | develop staging (alias: GitHub `NEON_AUTH_BASE_URL` also accepted) |
| `NEON_AUTH_COOKIE_SECRET` | same | staging + PR previews (32+ chars) |
| `STAGING_VERCEL_APP_URL` | `NEXT_PUBLIC_APP_URL` | Vercel staging only (or use `VERCEL_STAGING_ALIAS`) |
| `STAGING_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare staging only |
| `ADMIN_SYNC_SECRET` | same | staging + PR previews |
| `IGDB_CLIENT_ID` | same | staging + PR previews |
| `IGDB_CLIENT_SECRET` | same | staging + PR previews |

PR previews: Neon branch URL from CI overrides `DATABASE_URL` / auth; static keys above still come from GitHub.

**Cloudflare:** CI runs `wrangler secret bulk` so secrets appear under Worker → Settings → Variables and Secrets.  
**Vercel:** CI passes `--env` on each deployment.

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
5. After changing GitHub app secrets, re-run **Staging dual deploy** (or push to `develop`) so Workers pick them up via `secret bulk`.
