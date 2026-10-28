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
- [ ] Set shared local defaults on **`dev`**; laptop overrides on **`dev_personal`** (personal Neon branch URL)
- [ ] Day-to-day: `doppler run --config dev_personal -- pnpm dev` (or `pnpm dev:secrets` only if personal configs auto-apply — see [secrets.md](./secrets.md))
- [ ] Confirm config: `doppler run -- node -e "console.log(process.env.DOPPLER_CONFIG)"` → expect `dev_personal` for laptop work

## 1. Neon

- [ ] Create Neon project for The Gamies v2
- [ ] Copy every GitHub Actions secret from [github-secrets.md](./github-secrets.md) (Settings → Secrets and variables → Actions)
- [ ] Copy project id → GitHub secret `NEON_PROJECT_ID`
- [ ] Create API key → GitHub secret `NEON_API_KEY`
- [ ] Put develop Neon URL in GitHub `STAGING_DATABASE_URL` (and optionally Doppler `dev` for local). Neon branch name should be **`develop`** — PR/manual previews parent from it.
- [ ] (Recommended) lasting Neon branch `local/<you>` on Doppler `dev_personal`
- [ ] **Better Auth:** generate secret (`openssl rand -base64 32`) → Doppler `BETTER_AUTH_SECRET` + GitHub `NEON_AUTH_COOKIE_SECRET` (legacy GitHub name until renamed; CI maps it to `BETTER_AUTH_SECRET`). Set `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to the app origin. Details: [self-hosted-better-auth-spike.md](./self-hosted-better-auth-spike.md).
- [ ] Reset links go to `/auth/reset-password`. Local `pnpm dev` on localhost skips confirm-email (no Auth mail on Node). Hosted deploys require email verification.
- [ ] Auth branded mail: enable Cloudflare Email Sending for `thegamies.gg`. Better Auth hooks send via the Worker `EMAIL` binding (no Neon Auth webhook). Details: [email-templates.md](./email-templates.md).
- [ ] IGDB catalog webhooks: create staging + production Queue/KV once. CI deploys the Worker on path changes (`develop` → develop env, `main` → production). Set GitHub `IGDB_WEBHOOK_SECRET` (staging) and `PRODUCTION_IGDB_WEBHOOK_SECRET` (production, different value); staging `IGDB_WEBHOOKS_WORKER_URL` or accept the develop default. Register slots from `/admin/webhooks` on staging/production only. Details: [igdb-sync.md](./igdb-sync.md), [workers/igdb-webhooks/README.md](../workers/igdb-webhooks/README.md).
- [ ] Account deletion closes the Better Auth user (`auth_*`) so the email can be reused.
- [ ] `localhost` ports work for local Auth; **LAN IPs are not** auto-trusted for phone/device testing — open the URL you use on the phone (e.g. `http://192.168.1.123:3000`). `next.config.ts` allowlists this machine’s current LAN IPs for `/_next` assets; restart `next dev` after a network change. Extra hostnames go in Doppler `ALLOWED_DEV_ORIGINS`.
- [ ] Google sign-in: create a Google Cloud **Web** OAuth client. Authorized JavaScript origins = app origins (`http://localhost:3000`, staging Worker, `https://thegamies.gg`). Redirect URIs = `{app origin}/api/auth/callback/google` per env. Paste Client ID/secret into Doppler / GitHub `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Consent screen app name **The Gamies**; Testing mode needs your Google account as a test user.
- [ ] PR / manual previews: CI creates a Neon branch (Postgres + migrated `auth_*`); Better Auth runs in that preview Worker against the branch. Details: [deployment.md](./deployment.md).
- [ ] `doppler run --config dev_personal -- pnpm db:migrate` (includes `profiles` + `auth_*`; hits your personal Neon branch)

## 2. Cloudflare

- [ ] Workers enabled on the account (Paid recommended for size limits)
- [ ] API token with Workers edit → `CLOUDFLARE_API_TOKEN`
- [ ] Account id → `CLOUDFLARE_ACCOUNT_ID`
- [ ] First production deploy (Linux/WSL/CI):
  ```bash
  pnpm exec wrangler login
  pnpm deploy:cf
  ```
- [ ] Staging CI runs `wrangler secret bulk` so secrets show on `thegamies-v2-develop`; production CI does the same for `thegamies-v2` from `PRODUCTION_*` secrets

## 3. GitHub (app secrets for deploys)

- [ ] Add deploy credentials: `NEON_*`, `CLOUDFLARE_*`
- [ ] **Manually import** app secrets into GitHub (from Doppler `dev` or your notes): `STAGING_DATABASE_URL`, `NEON_AUTH_COOKIE_SECRET` (→ `BETTER_AUTH_SECRET`), `ADMIN_SYNC_SECRET`, `CRON_SECRET`, `IGDB_CLIENT_ID`, `IGDB_CLIENT_SECRET`, `IGDB_WEBHOOK_SECRET`, plus R2 account/keys (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`), staging upload location (`STAGING_R2_AVATAR_BUCKET`, `STAGING_AVATAR_PUBLIC_BASE_URL`), production upload location (`PRODUCTION_R2_AVATAR_BUCKET`, `PRODUCTION_AVATAR_PUBLIC_BASE_URL`), plus `NEXT_PUBLIC_GA_MEASUREMENT_ID` when Analytics should run, plus optional `AUTH_EMAIL_FROM` for branded Auth mail, plus optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- [ ] Production Cloudflare (never reuse `STAGING_*`): `PRODUCTION_DATABASE_URL`, `PRODUCTION_CF_APP_URL`, `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL`, `PRODUCTION_IGDB_WEBHOOK_SECRET` (optional `PRODUCTION_NEON_AUTH_COOKIE_SECRET` → `BETTER_AUTH_SECRET`)
- [ ] Optional staging public URL: `STAGING_CF_APP_URL` (also drives `BETTER_AUTH_URL`)
- [ ] Re-run **Staging deploy** on `develop` after importing or changing secrets
- [ ] Confirm Cloudflare Worker `thegamies-v2-develop` → Settings → Variables and Secrets
- [ ] When secrets change later: update GitHub manually, then redeploy — CI does not sync from Doppler
- [ ] Until secrets exist, CI quality checks still run; host deploys skip with a comment

## 4. Verify

- [ ] `pnpm dev:secrets` loads the app locally
- [ ] `pnpm lint && pnpm typecheck && pnpm build` locally
- [ ] Staging URL loads; a site operator can open `/admin` (first operator claims with the admin code)
- [ ] Cloudflare previews use Neon `preview/pr-<n>` when Neon secrets are set
