# thegamies-v2

Restart of [The Gamies](https://thegamies.gg): community awards, Voices, and personal GOTY lists.

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
doppler run -- pnpm db:migrate
pnpm dev:secrets
```

- App: http://localhost:3000
- Games: http://localhost:3000/games
- Admin sync: http://localhost:3000/admin/sync
- Design system: http://localhost:3000/design-system

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
