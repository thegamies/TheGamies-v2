# Manual wiring checklist

Repo config for dual-host + Doppler is in place. Work top to bottom.

## 0. Doppler (app secrets — do this first)

- [ ] Create Doppler account (Developer free tier is fine)
- [ ] Create project `thegamies-v2` (keep default Development / Staging / Production)
- [ ] Development: keep **`dev`** + **`dev_personal`** (personal configs **on**)
- [ ] Staging / Production: personal configs **off** (`stg`, `prd` only)
- [ ] Optional: add Preview env with config `preview` for static PR secrets
- [ ] Install CLI: https://docs.doppler.com/docs/install-cli
  ```bash
  doppler login
  cd C:\Users\ecdm9\Documents\thegamies-v2
  doppler setup   # project thegamies-v2, config dev
  ```
- [ ] Set shared secrets on **`dev`** (after Neon exists):
  ```bash
  doppler secrets set DATABASE_URL="postgresql://..." --config dev
  doppler secrets set NEXT_PUBLIC_APP_URL="http://localhost:3000" --config dev
  ```
- [ ] Use `dev_personal` only for private overrides (or leave empty to inherit `dev`)
- [ ] Day-to-day: `pnpm dev:secrets`  
  Full layout: [secrets.md](./secrets.md)

## 1. Neon

- [ ] Create Neon project for The Gamies v2
- [ ] Copy project id → GitHub secret `NEON_PROJECT_ID`
- [ ] Create API key → GitHub secret `NEON_API_KEY`
- [ ] Put the **dev** branch connection string into Doppler **`dev`** as `DATABASE_URL`
- [ ] (Recommended) Create lasting Neon branch `local/<you>`; set its URL on **`dev_personal`** as `DATABASE_URL`
- [ ] Put staging and production URLs into Doppler `stg` / `prd`
- [ ] Set `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `ADMIN_SYNC_SECRET` on Doppler `dev` (and stg/prd)
- [ ] `doppler run -- pnpm db:migrate`
- [ ] (Later) Enable Neon Auth; CI already requests `auth_url` when available

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
- [ ] (Recommended) Doppler → Integrations → Vercel: sync `stg` + `prd`

## 3. Cloudflare

- [ ] Workers enabled on the account (Paid recommended for size limits)
- [ ] API token with Workers edit → `CLOUDFLARE_API_TOKEN`
- [ ] Account id → `CLOUDFLARE_ACCOUNT_ID`
- [ ] First production deploy (Linux/WSL/CI):
  ```bash
  pnpm exec wrangler login
  pnpm deploy:cf
  ```
- [ ] (Later) Sync Worker secrets from Doppler `stg` / `prd` or via CI

## 4. GitHub

- [ ] Add **deploy** secrets listed in [deployment.md](./deployment.md)  
  (`NEON_*`, `VERCEL_*`, `CLOUDFLARE_*` — not your everyday app secrets)
- [ ] Open a PR into `develop` and confirm the **Dual-host previews** comment
- [ ] Until secrets exist, CI quality checks still run; host deploys skip with a comment

## 5. Verify

- [ ] `pnpm dev:secrets` loads the app (`dev_personal` inherits `dev`)
- [ ] `pnpm lint && pnpm typecheck && pnpm build` locally
- [ ] Vercel preview URL loads `/` and `/design-system`
- [ ] Cloudflare preview URL loads the same
- [ ] Both previews share the same Neon `preview/pr-<n>` branch when Neon secrets are set
