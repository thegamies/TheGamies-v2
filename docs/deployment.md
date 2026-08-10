# Deployment

Dual-host deployment: **Vercel** and **Cloudflare Workers (OpenNext)**. Both are first-class. Neon is the shared database/auth layer.

## Principles

1. One Next.js codebase; host adapters stay thin.
2. Every PR into `develop` gets **both** preview URLs when CI secrets are configured.
3. One **Neon branch per PR**; both previews use that connection string.
4. Never point previews at the production database.

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
| `vercel.json` | Vercel build/framework hints |
| `wrangler.jsonc` | Cloudflare Worker name, compatibility, assets |
| `open-next.config.ts` | OpenNext Cloudflare adapter config |
| `public/_headers` | Long-cache headers for `/_next/static/*` |
| `.github/workflows/ci.yml` | Lint, typecheck, build on PR/push |
| `.github/workflows/preview.yml` | Neon branch + Vercel + Cloudflare PR previews |

## Cloudflare notes

- OpenNext Cloudflare builds are verified in **Linux CI**. On native Windows, OpenNext may fail creating symlinks (`EPERM`); use WSL or rely on GitHub Actions for `pnpm preview:cf` / `pnpm deploy:cf`.
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

Until secrets exist, `ci.yml` still runs quality checks; `preview.yml` skips host deploys that lack credentials.

## PR preview flow

```text
PR opened/updated
  → ci: lint + typecheck + build
  → neon: create branch preview/pr-<n>
  → vercel: deploy preview with DATABASE_URL (+ NEON_AUTH_BASE_URL when set)
  → cloudflare: OpenNext build + deploy worker thegamies-v2-pr-<n> with same env
  → comment both URLs on the PR
  → on PR close: delete Neon branch + optional CF preview worker
```

## Production flow

1. Promote `develop` → `main` via PR.
2. Vercel production deploy from `main`.
3. Cloudflare production deploy of worker `thegamies-v2` (CI on `main` or `pnpm deploy:cf`).
4. Neon production branch only.

## Environment variables

App secrets are managed in **Doppler** — see [secrets.md](./secrets.md).

Runtime keys (also listed in `.env.example`):

- `DATABASE_URL`
- `NEON_AUTH_BASE_URL` (when Auth is enabled)
- `NEXT_PUBLIC_APP_URL` (host-specific per deployment)

Do not commit `.env`, `.dev.vars`, or `.vercel`.

Local with Doppler:

```bash
pnpm dev:secrets
```
