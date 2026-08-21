# Architecture

## Overview

One coherent Next.js application, deployable to **both Vercel and Cloudflare Workers** (OpenNext). Neon provides Postgres and Auth. IGDB ingestion runs as a separate TypeScript worker, not inside normal web requests.

```text
Browser → Vercel (Next.js)  ─┐
         Cloudflare Workers ─┼→ Neon (Postgres + Auth)
         (OpenNext)          ┘
                              └→ RLS: future (Auth JWT → DB role); today app-layer session/ownership

Separate: IGDB ingestion (`packages/igdb` CLI + `/admin/sync`) → Neon catalog tables
         IGDB webhooks Worker (`workers/igdb-webhooks` + Cloudflare Queue) → batched catalog writes
```

Product logic stays host-agnostic. Host-specific code lives only in thin adapters and deploy config.

## Locked stack

| Layer | Choice |
|---|---|
| App | Next.js App Router, TypeScript |
| Styles | Tailwind + design tokens |
| Hosts | **Vercel and Cloudflare Workers (OpenNext)** — both first-class |
| DB | Neon Postgres (server `DATABASE_URL` owner role; **no RLS policies yet**) |
| Auth | Neon Auth (Managed Better Auth); profiles in app `profiles` table. Account deletion closes the auth user via SDK `deleteUser`, the Neon Auth Users API, and `neon_auth` SQL (SDK delete is often a no-op). The UI posts JSON to `/api/account/delete` (not a Server Action): after Auth close, OpenNext crashes if Next re-renders `/account` or `redirect()`s. |
| Access control | **App-layer** session + ownership until Auth JWT → DB role for RLS is defined |
| Catalog | IGDB via separate worker + queued Cloudflare webhooks |
| Validation | Zod |

## Hosting rules

- Do not call Vercel-only or Cloudflare-only APIs from domain/feature modules.
- Prefer portable storage (R2 or S3) over Vercel Blob when object storage is added.
- Local day-to-day: `pnpm dev` (Node). Cloudflare runtime parity: `pnpm preview:cf`.
- PR previews deploy to **both** hosts and share one Neon branch per PR.

## Boundaries

- Keep the product as one Next.js app initially.
- Keep IGDB ingestion separate from user-facing requests.
- Use Postgres for product and aggregate data.
- Do not start with GraphQL, Redis, microservices, or a web/mobile monorepo.
- Add infrastructure only after demonstrated need.

## Rendering

- Public game / list / profile / community / results: server-rendered and cacheable where possible
- Authenticated editors and settings: client components where needed
- Search: server endpoint or Postgres function
- Social cards: generated Open Graph images
- Ranking pages: read from precomputed aggregate tables (not live recalculation of everything)
- Do not use `export const runtime = "edge"` — unsupported with OpenNext Cloudflare

## Environments

| Env | Trigger | App | Data |
|---|---|---|---|
| Local | Developer machine | `next dev` | Neon dev branch |
| Preview | PR into `develop` | Vercel preview **and** Cloudflare Workers preview | Shared Neon branch for that PR |
| Staging | `develop` | Both hosts (staging projects/workers) | Neon non-prod branch |
| Production | Merge to `main` | Both hosts (production) | Neon production branch |

See [deployment.md](./deployment.md) for wiring, secrets, and CLI setup.

## Future mobile

Expo later. Share types, schemas, scoring, terminology, and API contracts — not the full web UI.
