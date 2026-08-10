# Manual wiring checklist

Repo config for dual-host is in place. Complete these account steps so previews/production actually deploy.

## 1. Neon

- [ ] Create Neon project for The Gamies v2
- [ ] Copy project id → GitHub secret `NEON_PROJECT_ID`
- [ ] Create API key → GitHub secret `NEON_API_KEY`
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

## 3. Cloudflare

- [ ] Workers enabled on the account (Paid recommended for size limits)
- [ ] API token with Workers edit → `CLOUDFLARE_API_TOKEN`
- [ ] Account id → `CLOUDFLARE_ACCOUNT_ID`
- [ ] First production deploy (Linux/WSL/CI):
  ```bash
  pnpm exec wrangler login
  pnpm deploy:cf
  ```

## 4. GitHub

- [ ] Add all secrets listed in [deployment.md](./deployment.md)
- [ ] Open a PR into `develop` and confirm the **Dual-host previews** comment
- [ ] Until secrets exist, CI quality checks still run; host deploys skip with a comment

## 5. Verify

- [ ] `pnpm lint && pnpm typecheck && pnpm build` locally
- [ ] Vercel preview URL loads `/` and `/design-system`
- [ ] Cloudflare preview URL loads the same
- [ ] Both previews share the same Neon `preview/pr-<n>` branch when Neon secrets are set
