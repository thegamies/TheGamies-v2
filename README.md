# thegamies-v2

Restart of [The Gamies](https://thegamies.gg): community awards, Voices, and personal GOTY lists.

This repository is the clean rebuild. The previous monorepo (`thegamies/TheGamies`) is reference/archive only.

## Current status

Next.js App Router scaffold with Editorial Standings tokens, skeleton primitives, and `/design-system` gallery.

See `AGENTS.md` and `docs/`. Day-to-day process: `docs/engineering.md`. Local reference junctions: `docs/references.md`.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Vercel
- Neon (Postgres + Auth) — not wired yet
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
