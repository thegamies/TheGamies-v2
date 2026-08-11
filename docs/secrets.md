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
| `dev_personal` | Local overrides (`NEXT_PUBLIC_APP_URL=http://localhost:3000`, private Neon branch) |

```bash
pnpm dev:secrets          # doppler run -- next dev
pnpm preview:cf:secrets   # Cloudflare local preview (WSL/Linux)
```

Never commit `.env`.

## GitHub Actions → hosts (deploy path)

CI reads repo secrets and injects them on every staging / preview deploy:

| GitHub secret | Becomes | Used by |
|---|---|---|
| `STAGING_DATABASE_URL` | `DATABASE_URL` | develop staging (both hosts) |
| `STAGING_NEON_AUTH_BASE_URL` | `NEON_AUTH_BASE_URL` | develop staging |
| `STAGING_VERCEL_APP_URL` | `NEXT_PUBLIC_APP_URL` | Vercel staging only (or use `VERCEL_STAGING_ALIAS`) |
| `STAGING_CF_APP_URL` | `NEXT_PUBLIC_APP_URL` | Cloudflare staging only |
| `ADMIN_SYNC_SECRET` | same | staging + PR previews |
| `IGDB_CLIENT_ID` | same | staging + PR previews |
| `IGDB_CLIENT_SECRET` | same | staging + PR previews |

PR previews: Neon branch URL from CI overrides `DATABASE_URL` / auth; static keys above still come from GitHub.

**Cloudflare:** CI runs `wrangler secret bulk` so secrets appear under Worker → Settings → Variables and Secrets.  
**Vercel:** CI passes `--env` on each deployment.

Keep Doppler `dev` and GitHub in sync manually (copy values when they change), or use Doppler’s free **GitHub sync** integration (counts toward the 5 sync limit) to push `dev` into GitHub secrets automatically.

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
