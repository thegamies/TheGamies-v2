# Secrets management (Doppler)

**Source of truth for app secrets:** [Doppler](https://www.doppler.com/) (free Developer plan is enough for solo / ≤3 users).

**Deploy credentials** (Vercel/Cloudflare/Neon API tokens) stay in **GitHub Actions secrets** — they authorize CI to deploy, they are not app runtime secrets.

## Project layout

Create one Doppler project:

```text
Project: thegamies-v2
```

Use **four configs** (maps cleanly to Doppler’s free-tier environment limit):

| Config | Used for | `DATABASE_URL` source |
|---|---|---|
| `local` | Laptop `pnpm dev` | Your Neon **dev** branch connection string |
| `develop` | Staging deploys from `develop` | Neon non-prod / develop branch |
| `preview` | Static secrets shared by PR previews | **Not** the PR DB — CI injects ephemeral Neon URL on top |
| `production` | `main` on Vercel + Cloudflare | Neon production branch |

```text
Doppler: thegamies-v2
  ├─ local        → developers
  ├─ develop      → staging hosts
  ├─ preview      → shared preview app secrets (no long-lived PR DB URLs)
  └─ production   → production hosts
```

## What goes in Doppler (app secrets)

Put these in each config (values differ per config):

| Key | `local` | `develop` | `preview` | `production` |
|---|---|---|---|---|
| `DATABASE_URL` | Neon dev | Neon develop/staging | *(leave empty or placeholder)* | Neon prod |
| `NEON_AUTH_BASE_URL` | Auth URL for that branch | same | *(CI may override from Neon branch)* | prod Auth URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | staging URL | preview placeholder | production URL |

Add future secrets here too (IGDB, storage keys, etc.) so you are not copying into three dashboards.

### What does *not* go in Doppler app configs

| Keep in GitHub Actions secrets | Why |
|---|---|
| `NEON_API_KEY`, `NEON_PROJECT_ID` | CI creates/deletes PR branches |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | CI deploys to Vercel |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | CI deploys to Cloudflare |

Optional later: store those in a Doppler **service config** and sync into GitHub — only worth it once the checklist is boring.

## PR previews (important)

Ephemeral Neon URLs must **not** be hand-maintained in Doppler.

Flow:

1. CI creates Neon `preview/pr-<n>` → gets `DATABASE_URL` (+ auth URL).
2. CI deploys Vercel + Cloudflare with that URL.
3. Doppler `preview` config only holds **static** shared preview secrets (feature flags, non-DB keys).

So: Doppler for stable secrets; Neon Action for per-PR database.

## One-time setup

1. Create a Doppler account (Developer free tier).
2. Create project `thegamies-v2`.
3. Rename/create configs: `local`, `develop`, `preview`, `production`.
4. Install CLI: https://docs.doppler.com/docs/install-cli  
   ```bash
   doppler login
   cd C:\Users\ecdm9\Documents\thegamies-v2
   doppler setup
   # select project thegamies-v2, config local
   ```
5. Fill secrets (dashboard or CLI):
   ```bash
   doppler secrets set DATABASE_URL="postgresql://..." --config local
   doppler secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000" --config local
   ```
6. Repo already has [`doppler.yaml`](../doppler.yaml) pinning default project/config for setup.

## Day-to-day local use

```bash
pnpm dev:secrets          # doppler run --config local -- next dev
pnpm preview:cf:secrets   # same injection for Cloudflare local preview (WSL/Linux)
```

Without Doppler (fallback): copy from `.env.example` into `.env` / `.dev.vars` manually — discouraged once Doppler is set up.

Generate a local `.env` file if a tool requires a real file:

```bash
doppler secrets download --config local --no-file --format env > .env
```

Never commit `.env`.

## Syncing to hosts (recommended order)

1. **Local** — `doppler run` (above). Done.
2. **Vercel** — Doppler → Integrations → Vercel → sync `develop` and `production` configs to the matching Vercel environments.  
   Or skip sync and let GitHub Actions pass env at deploy time.
3. **Cloudflare** — sync Worker secrets from Doppler, or set via CI/`wrangler secret` from Doppler in the workflow later.
4. **GitHub** — keep deploy tokens as repo secrets; optionally add `DOPPLER_TOKEN` (service token) later so Actions can `doppler secrets download --config develop`.

Minimal path that removes copy-paste pain: **Doppler for local + Vercel sync for develop/production**. Cloudflare can follow once the Worker exists.

## Service token for CI (optional next step)

When you want Actions to pull app secrets from Doppler:

1. Doppler → Project → Access → Service Account / token with read on `develop` / `production` / `preview`.
2. GitHub secret: `DOPPLER_TOKEN`
3. Workflow step:
   ```bash
   doppler secrets download --no-file --format env --config develop > .env
   ```

Not required for the current static scaffold.

## Rules

1. App secrets live in Doppler; do not duplicate into Slack/docs.
2. Deploy tokens live in GitHub (or a dedicated Doppler CI config later).
3. Never commit Doppler tokens, `.env`, or `.dev.vars`.
4. Production `DATABASE_URL` never used for local or preview.
5. PR databases are ephemeral — CI-owned, not Doppler-owned.
