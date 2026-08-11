# Secrets management (Doppler)

**Source of truth for app secrets:** [Doppler](https://www.doppler.com/) (free Developer plan is enough for solo / ≤3 users).

**Deploy credentials** (Vercel/Cloudflare/Neon API tokens) stay in **GitHub Actions secrets** — they authorize CI to deploy, they are not app runtime secrets.

## Project layout

```text
Project: thegamies   (see doppler.yaml)

Development
  ├─ dev              → develop branch hosts (Vercel + Cloudflare staging) + shared defaults
  └─ dev_personal     → local machine overrides (keep enabled)

Preview
  └─ preview          → static PR-preview secrets only (no long-lived PR DB URLs)

Production
  ├─ prd              → main / production hosts
  └─ prd_personal     → off forever
```

| Config | Used for | Personal configs | `DATABASE_URL` |
|---|---|---|---|
| `dev` | Git `develop` hosts + shared defaults | base for `dev_personal` | Neon develop / shared non-prod |
| `dev_personal` | Your laptop overrides | **on** | Override for a private Neon branch / `NEXT_PUBLIC_APP_URL=http://localhost:3000` |
| `preview` | Static secrets for PR previews | **off** | Empty — CI injects ephemeral Neon URL |
| `prd` | Production (`main`) | **off** | Neon production |

### How `dev` + `dev_personal` work

1. Put **develop-host** values on **`dev`** (staging Worker/Vercel URLs, shared Neon develop URL, `ADMIN_SYNC_SECRET`, IGDB keys, etc.).
2. Put only *your* local differences on **`dev_personal`** (usually `NEXT_PUBLIC_APP_URL=http://localhost:3000`, optional private Neon branch).
3. Local `doppler run` uses **`dev_personal`** when personal configs are enabled — you get `dev` ∪ your overrides.
4. CI staging deploys use a **service token scoped to `dev`** (never `dev_personal`).

## What goes in Doppler (app secrets)

| Key | `dev` | `preview` | `prd` |
|---|---|---|---|
| `DATABASE_URL` | Neon develop | *(CI overrides per PR)* | Neon prod |
| `NEON_AUTH_BASE_URL` | Auth for develop | *(CI may override)* | prod Auth URL |
| `NEXT_PUBLIC_APP_URL` | develop host URL | placeholder | production URL |
| `IGDB_CLIENT_ID` | Twitch/IGDB app | same | same |
| `IGDB_CLIENT_SECRET` | Twitch/IGDB app | same | same |
| `ADMIN_SYNC_SECRET` | Unlock `/admin/sync` | optional | same |

`dev_personal` may override `DATABASE_URL` / `NEXT_PUBLIC_APP_URL` for local work. See [igdb-sync.md](./igdb-sync.md).

### What does *not* go in Doppler app configs

| Keep in GitHub Actions secrets | Why |
|---|---|
| `DOPPLER_TOKEN` | Service token for config `dev` — CI injects app secrets into staging deploys |
| `NEON_API_KEY`, `NEON_PROJECT_ID` | CI creates/deletes PR branches |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | CI deploys to Vercel |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | CI deploys to Cloudflare |

Optional fallbacks if `DOPPLER_TOKEN` is missing: `STAGING_DATABASE_URL`, `STAGING_NEON_AUTH_BASE_URL`.

## PR previews

Ephemeral Neon URLs are **not** stored in Doppler.

1. CI creates Neon `preview/pr-<n>` → `DATABASE_URL`.
2. CI runs `pnpm db:migrate` against that branch.
3. CI deploys Vercel + Cloudflare with that URL.
4. Doppler `preview` only holds **static** shared preview secrets (when wired).

## One-time setup

1. Create Doppler project (repo pins `thegamies` in [`doppler.yaml`](../doppler.yaml)).
2. Environments: **Development**, **Preview**, **Production**.
3. Development: keep **`dev` + `dev_personal`**; personal configs **on**.
4. Production: personal configs **off**.
5. Install CLI: https://docs.doppler.com/docs/install-cli
   ```bash
   doppler login
   doppler setup
   # project: thegamies
   # config: dev  (CLI uses dev_personal when personal configs are on)
   ```
6. Set develop-host secrets on `dev`, local overrides on `dev_personal`.
7. Create a Doppler **service token** for config `dev` → GitHub secret `DOPPLER_TOKEN`.

## Day-to-day local use

```bash
pnpm dev:secrets          # doppler run -- next dev  (dev_personal → inherits dev)
pnpm preview:cf:secrets   # same for Cloudflare local preview (WSL/Linux)
```

Never commit `.env`.

## Syncing to hosts

1. **Local** — `pnpm dev:secrets` (`dev_personal`).
2. **Develop / staging (Vercel + Cloudflare)** — CI downloads Doppler `dev` via `DOPPLER_TOKEN` and injects on each staging deploy (`staging.yml`). Cloudflare also runs `wrangler secret bulk`.
3. **Production** — Doppler `prd` (integration and/or CI; production workflow can be wired the same way).
4. **GitHub** — deploy tokens + `DOPPLER_TOKEN` only.

## Rules

1. Shared develop-host defaults → `dev`. Local overrides → `dev_personal`.
2. Never enable personal configs on `prd`.
3. Deploy tokens stay in GitHub Actions.
4. Production `DATABASE_URL` never used for local or PR previews.
5. PR databases are ephemeral — CI-owned, not Doppler-owned.
