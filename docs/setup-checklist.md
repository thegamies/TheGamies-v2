# Manual wiring checklist

Repo config for dual-host + Doppler is in place. Work top to bottom.

## 0. Doppler (app secrets — do this first)

- [ ] Create Doppler account (Developer free tier is fine)
- [ ] Project matches [`doppler.yaml`](../doppler.yaml) (`thegamies`): Development / Preview / Production
- [ ] Development: **`dev`** + **`dev_personal`** (personal configs **on**) — `dev` = develop branch hosts
- [ ] Production: personal configs **off**
- [ ] Preview: static PR secrets only (optional)
- [ ] Install CLI: https://docs.doppler.com/docs/install-cli
  ```bash
  doppler login
  doppler setup   # project thegamies, config dev
  ```
- [ ] Set develop-host secrets on **`dev`** (after Neon exists): `DATABASE_URL`, `ADMIN_SYNC_SECRET`, IGDB keys, develop `NEXT_PUBLIC_APP_URL`, …
- [ ] Put local overrides on **`dev_personal`** (e.g. `NEXT_PUBLIC_APP_URL=http://localhost:3000`)
- [ ] Create Doppler service token for config **`dev`** → GitHub secret `DOPPLER_TOKEN`
- [ ] Day-to-day: `pnpm dev:secrets`  
  Full layout: [secrets.md](./secrets.md)

## 1. Neon

- [ ] Create Neon project for The Gamies v2
- [ ] Copy project id → GitHub secret `NEON_PROJECT_ID`
- [ ] Create API key → GitHub secret `NEON_API_KEY`
- [ ] Put the **dev** branch connection string into Doppler **`dev`** as `DATABASE_URL`
- [ ] (Recommended) Create lasting Neon branch `local/<you>`; set its URL on **`dev_personal`** as `DATABASE_URL`
- [ ] Put production URL into Doppler `prd`
- [ ] Set `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `ADMIN_SYNC_SECRET` on Doppler `dev` (and `prd`)
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
- [ ] (Recommended) Doppler → Integrations → Vercel for Production (`prd`); develop staging is injected by CI via `DOPPLER_TOKEN`

## 3. Cloudflare

- [ ] Workers enabled on the account (Paid recommended for size limits)
- [ ] API token with Workers edit → `CLOUDFLARE_API_TOKEN`
- [ ] Account id → `CLOUDFLARE_ACCOUNT_ID`
- [ ] First production deploy (Linux/WSL/CI):
  ```bash
  pnpm exec wrangler login
  pnpm deploy:cf
  ```
- [ ] Staging deploys sync Worker secrets from Doppler `dev` via CI (`wrangler secret bulk`)

## 4. GitHub

- [ ] Add **deploy** secrets listed in [deployment.md](./deployment.md)  
  (`DOPPLER_TOKEN`, `NEON_*`, `VERCEL_*`, `CLOUDFLARE_*` — not everyday app secrets in GitHub)
- [ ] Re-run **Staging dual deploy** on `develop` so both hosts pick up Doppler `dev`
- [ ] Open a PR into `develop` and confirm the **Dual-host previews** comment
- [ ] Until secrets exist, CI quality checks still run; host deploys skip with a comment

## 5. Verify

- [ ] `pnpm dev:secrets` loads the app (`dev_personal` inherits `dev`)
- [ ] `pnpm lint && pnpm typecheck && pnpm build` locally
- [ ] Vercel preview URL loads `/` and `/design-system`
- [ ] Cloudflare preview URL loads the same
- [ ] Both previews share the same Neon `preview/pr-<n>` branch when Neon secrets are set
