# thegamies-v2

Restart of [The Gamies](https://thegamies.gg): community awards, Hosts, and personal GOTY lists.

This repository is the clean rebuild. The previous monorepo (`thegamies/TheGamies`) is reference/archive only.

## Current status

Next.js App Router with Editorial Standings tokens, catalog browse/detail, IGDB sync (CLI + `/admin/sync`), and **dual-host deploy** (Vercel + Cloudflare Workers via OpenNext). Neon is the shared DB.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Hosts: Vercel **and** Cloudflare Workers (OpenNext)
- Neon (Postgres + Auth)
- Drizzle + `@thegamies/db` / `@thegamies/igdb` packages

## Develop

```bash
pnpm install
# Prefer your personal Neon branch (see docs/secrets.md)
doppler run --config dev_personal -- pnpm db:migrate
doppler run --config dev_personal -- pnpm dev
# or, if Doppler personal configs are enabled: pnpm db:migrate:secrets && pnpm dev:secrets
```

- App: http://localhost:3000
- Games: http://localhost:3000/games
- Auth: http://localhost:3000/auth/sign-in
- Admin sync: http://localhost:3000/admin/sync
- Design system: http://localhost:3000/design-system

**Production-mode local** (no `next dev` debug overhead — use this to judge speed). Still `dev_personal`, not Doppler `prd` / the production DB:

```bash
doppler run --config dev_personal -- pnpm build
doppler run --config dev_personal -- pnpm start
```

Rebuild after code changes. Auth cookies are `secure` in this mode, so sign-in may fail on `http://localhost`.

**Doppler:** Repo pins `config: dev` in `doppler.yaml`. Local DB/URL overrides live on `dev_personal`. If migrate hits the wrong Neon branch, use `--config dev_personal` — details in [docs/secrets.md](docs/secrets.md).

```bash
pnpm sync:igdb:secrets import --year 2026
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

See [docs/igdb-sync.md](docs/igdb-sync.md) for catalog sync details.

## Docs

Start with [AGENTS.md](./AGENTS.md) and [docs/](./docs/).
