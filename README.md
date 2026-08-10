# thegamies-v2

Restart of [The Gamies](https://thegamies.gg): community awards, Voices, and personal GOTY lists.

This repository is the clean rebuild. The previous monorepo (`thegamies/TheGamies`) is reference/archive only.

## Current status

Next.js App Router scaffold with Editorial Standings tokens, `/design-system` gallery, and **dual-host deploy** (Vercel + Cloudflare Workers via OpenNext). Neon is the shared DB/Auth target.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Hosts: Vercel **and** Cloudflare Workers (OpenNext)
- Neon (Postgres + Auth)
- IGDB catalog via separate worker — later

## Develop

```bash
pnpm install
pnpm dev
```

- App: http://localhost:3000
- Design system: http://localhost:3000/design-system

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Cloudflare runtime preview (Linux/WSL/CI recommended):

```bash
pnpm preview:cf
pnpm deploy:cf
```

Deploy docs and required GitHub secrets: [`docs/deployment.md`](docs/deployment.md).
