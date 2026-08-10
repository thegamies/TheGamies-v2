# Secrets management (Doppler)

**Source of truth for app secrets:** [Doppler](https://www.doppler.com/) (free Developer plan is enough for solo / ≤3 users).

**Deploy credentials** (Vercel/Cloudflare/Neon API tokens) stay in **GitHub Actions secrets** — they authorize CI to deploy, they are not app runtime secrets.

## Project layout

Use Doppler’s default shape — don’t invent parallel names.

```text
Project: thegamies-v2

Development
  ├─ dev              → shared local/dev defaults
  └─ dev_personal     → your overrides (keep enabled)

Staging
  ├─ stg              → develop / staging hosts
  └─ stg_personal     → off

Production
  ├─ prd              → main / production hosts
  └─ prd_personal     → off forever

(Optional 4th env) Preview
  └─ preview          → static PR-preview secrets only (no long-lived PR DB URLs)
```

| Config | Used for | Personal configs | `DATABASE_URL` |
|---|---|---|---|
| `dev` | Shared laptop defaults | base for `dev_personal` | Neon **dev** branch (shared) |
| `dev_personal` | Your machine overrides | **on** | Override only if you need a private Neon branch / flags |
| `stg` | Staging from git `develop` | **off** | Neon develop/staging |
| `prd` | Production (`main`) | **off** | Neon production |
| `preview` | Static secrets for PR previews | **off** | Empty — CI injects ephemeral Neon URL |

### How `dev` + `dev_personal` work

1. Put shared values on **`dev`** (`NEXT_PUBLIC_APP_URL=http://localhost:3000`, shared Neon dev URL, etc.).
2. Put only *your* differences on **`dev_personal`** (or leave it empty so it inherits `dev`).
3. `doppler run` uses **`dev_personal`** when personal configs are enabled for Development — you get `dev` ∪ your overrides.

That is the intended Doppler workflow.

## What goes in Doppler (app secrets)

| Key | `dev` | `stg` | `preview` | `prd` |
|---|---|---|---|---|
| `DATABASE_URL` | Neon dev | Neon staging | *(CI overrides per PR)* | Neon prod |
| `NEON_AUTH_BASE_URL` | Auth for that branch | same | *(CI may override)* | prod Auth URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | staging URL | placeholder | production URL |
| `IGDB_CLIENT_ID` | Twitch/IGDB app | same | same | same |
| `IGDB_CLIENT_SECRET` | Twitch/IGDB app | same | same | same |
| `ADMIN_SYNC_SECRET` | Unlock `/admin/sync` | same | optional | same |

`dev_personal` may override `DATABASE_URL` to a lasting `local/<you>` Neon branch. See [igdb-sync.md](./igdb-sync.md).

### What does *not* go in Doppler app configs

| Keep in GitHub Actions secrets | Why |
|---|---|
| `NEON_API_KEY`, `NEON_PROJECT_ID` | CI creates/deletes PR branches |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | CI deploys to Vercel |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | CI deploys to Cloudflare |

## PR previews

Ephemeral Neon URLs are **not** stored in Doppler.

1. CI creates Neon `preview/pr-<n>` → `DATABASE_URL`.
2. CI runs `pnpm db:migrate` against that branch.
3. CI deploys Vercel + Cloudflare with that URL.
4. Doppler `preview` (if you create it) only holds **static** shared preview secrets.

## One-time setup

1. Create Doppler project `thegamies-v2` (keep default Development / Staging / Production).
2. Leave **`dev` + `dev_personal`** as-is; enable personal configs on Development only.
3. Turn **off** personal configs on Staging and Production (`stg_personal` / `prd_personal`).
4. Optionally add a Preview environment with config `preview`.
5. Install CLI: https://docs.doppler.com/docs/install-cli
   ```bash
   doppler login
   cd C:\Users\ecdm9\Documents\thegamies-v2
   doppler setup
   # project: thegamies-v2
   # config: dev  (CLI will use dev_personal when personal configs are on)
   ```
6. Set shared secrets on `dev`:
   ```bash
   doppler secrets set DATABASE_URL="postgresql://..." --config dev
   doppler secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000" --config dev
   ```
7. Only set `dev_personal` keys when you need a private override.

Repo [`doppler.yaml`](../doppler.yaml) pins project + `dev`.

## Day-to-day local use

```bash
pnpm dev:secrets          # doppler run -- next dev  (uses dev_personal → inherits dev)
pnpm preview:cf:secrets   # same for Cloudflare local preview (WSL/Linux)
```

Generate a file only if a tool requires it:

```bash
doppler secrets download --no-file --format env > .env
```

Never commit `.env`.

## Syncing to hosts

1. **Local** — `pnpm dev:secrets`.
2. **Vercel** — sync Doppler `stg` → Vercel Preview/Staging, `prd` → Production.
3. **Cloudflare** — sync Worker secrets from `stg` / `prd`, or inject via CI later.
4. **GitHub** — deploy tokens only; optional `DOPPLER_TOKEN` later for Actions downloads.

## Rules

1. Shared local defaults → `dev`. Personal overrides → `dev_personal`.
2. Never enable personal configs on `prd`.
3. Deploy tokens stay in GitHub Actions.
4. Production `DATABASE_URL` never used for local or PR previews.
5. PR databases are ephemeral — CI-owned, not Doppler-owned.
