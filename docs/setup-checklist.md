# Manual wiring checklist

Work top to bottom.

## 0. Doppler (local only)

- [ ] Create Doppler account (Developer free tier is fine)
- [ ] Project matches [`doppler.yaml`](../doppler.yaml) (`thegamies`)
- [ ] Development: **`dev`** + **`dev_personal`** (personal configs **on**)
- [ ] Install CLI: https://docs.doppler.com/docs/install-cli
  ```bash
  doppler login
  doppler setup   # project thegamies, config dev
  ```
- [ ] Set shared local defaults on **`dev`**; laptop overrides on **`dev_personal`**
- [ ] Day-to-day: `pnpm dev:secrets`  
  Full layout: [secrets.md](./secrets.md)

## 1. Neon

- [ ] Create Neon project for The Gamies v2
- [ ] Copy project id → GitHub secret `NEON_PROJECT_ID`
- [ ] Create API key → GitHub secret `NEON_API_KEY`
- [ ] Put develop Neon URL in GitHub `STAGING_DATABASE_URL` (and optionally Doppler `dev` for local)
- [ ] (Recommended) lasting Neon branch `local/<you>` on Doppler `dev_personal`
- [ ] Enable **Neon Auth** on the project branch; copy Auth URL → Doppler `NEON_AUTH_BASE_URL` + GitHub `STAGING_NEON_AUTH_BASE_URL`
- [ ] Generate cookie secret (`openssl rand -base64 32`) → Doppler + GitHub `NEON_AUTH_COOKIE_SECRET`
- [ ] Add trusted domains in Neon Auth for local + staging hosts
- [ ] `doppler run -- pnpm db:migrate` locally (includes `profiles`)

## 2. Vercel

- [ ] Import `thegamies/TheGamies-v2`
- [ ] Framework: Next.js; install `pnpm install`; build `pnpm build`
- [ ] Production branch: `main`
- [ ] Create token → `VERCEL_TOKEN`
- [ ] From a linked checkout: note org/project ids → `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
  ```bash
  pnpm exec vercel login
  pnpm exec vercel link
  ```
- [ ] Develop staging env is injected by CI from GitHub secrets (no Doppler Teams token)

## 3. Cloudflare

- [ ] Workers enabled on the account (Paid recommended for size limits)
- [ ] API token with Workers edit → `CLOUDFLARE_API_TOKEN`
- [ ] Account id → `CLOUDFLARE_ACCOUNT_ID`
- [ ] First production deploy (Linux/WSL/CI):
  ```bash
  pnpm exec wrangler login
  pnpm deploy:cf
  ```
- [ ] Staging CI runs `wrangler secret bulk` so secrets show on the Worker

## 4. GitHub (app secrets for deploys)

- [ ] Add deploy credentials: `NEON_*`, `VERCEL_*`, `CLOUDFLARE_*`
- [ ] **Manually import** app secrets into GitHub (from Doppler `dev` or your notes): `STAGING_DATABASE_URL`, `STAGING_NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ADMIN_SYNC_SECRET`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`
- [ ] Optional per-host public URLs: `STAGING_CF_APP_URL`, `STAGING_VERCEL_APP_URL` (or `VERCEL_STAGING_ALIAS`)
- [ ] Re-run **Staging dual deploy** on `develop` after importing or changing secrets
- [ ] Confirm Cloudflare Worker `thegamies-v2-develop` → Settings → Variables and Secrets
- [ ] When secrets change later: update GitHub manually, then redeploy — CI does not sync from Doppler
- [ ] Until secrets exist, CI quality checks still run; host deploys skip with a comment

## 5. Verify

- [ ] `pnpm dev:secrets` loads the app locally
- [ ] `pnpm lint && pnpm typecheck && pnpm build` locally
- [ ] Staging URLs load; `/admin/sync` unlocks with `ADMIN_SYNC_SECRET`
- [ ] Vercel + Cloudflare previews share Neon `preview/pr-<n>` when Neon secrets are set
