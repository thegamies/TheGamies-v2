# Architecture

## Overview

One coherent Next.js application on Vercel. Neon provides Postgres and Auth. IGDB ingestion runs as a separate TypeScript worker, not inside normal web requests.

```text
Browser → Vercel (Next.js App Router)
            ├─ Server-rendered public pages
            ├─ Route handlers / server actions (thin)
            └─ Neon (Postgres + Auth + RLS)

Separate: IGDB ingestion worker → Neon catalog tables
```

## Locked stack

| Layer | Choice |
|---|---|
| App | Next.js App Router, TypeScript |
| Styles | Tailwind + design tokens |
| Host | Vercel (preview + production) |
| DB | Neon Postgres |
| Auth | Neon Auth |
| Catalog | IGDB via separate worker |
| Validation | Zod |

## Boundaries

- Keep the product as one Next.js app initially.
- Keep IGDB ingestion separate from user-facing requests.
- Use Postgres for product and aggregate data.
- Do not start with GraphQL, Redis, microservices, or a web/mobile monorepo.
- Add infrastructure only after demonstrated need.
- Prefer portable domain logic (plain TS modules) so a later Cloudflare move is a port, not a rewrite.

## Rendering

- Public game / list / profile / community / results: server-rendered and cacheable where possible
- Authenticated editors and settings: client components where needed
- Search: server endpoint or Postgres function
- Social cards: generated Open Graph images
- Ranking pages: read from precomputed aggregate tables (not live recalculation of everything)

## Environments

Target workflow:

- `main` → production (Vercel + Neon production branch)
- PR → Vercel preview + Neon database branch (auth branches with DB)

Exact wiring lands with the scaffold/deploy step.

## Future mobile

Expo later. Share types, schemas, scoring, terminology, and API contracts — not the full web UI.
