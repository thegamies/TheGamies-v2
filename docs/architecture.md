# Architecture

## Overview

One coherent Next.js application, deployable to **Cloudflare Workers** (OpenNext). Neon provides Postgres. Auth is self-hosted Better Auth in the Worker (`auth_*` tables). IGDB ingestion runs as a separate TypeScript worker, not inside normal web requests.

```text
Browser → Cloudflare Workers (OpenNext) → Neon Postgres
                └→ Better Auth in-Worker (`/api/auth`, auth_* tables)
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
| Host | **Cloudflare Workers (OpenNext)** |
| DB | Neon Postgres (server `DATABASE_URL` owner role; **no RLS policies yet**) |
| Auth | Self-hosted Better Auth in the OpenNext Worker (`auth_*` tables); profiles in app `profiles` table. Account deletion closes the auth user via Better Auth `deleteUser` + `auth_*` SQL. The UI posts JSON to `/api/account/delete` (not a Server Action): after Auth close, OpenNext crashes if Next re-renders `/account` or `redirect()`s. |
| Access control | **App-layer** session + ownership until Auth JWT → DB role for RLS is defined |
| Catalog | IGDB via separate worker + queued Cloudflare webhooks |
| Validation | Zod |

## Hosting rules

- Do not call Cloudflare-only APIs from domain/feature modules (keep adapters thin).
- Prefer portable storage (R2 or S3) when object storage is needed.
- Local day-to-day: `pnpm dev` (Node). Cloudflare runtime parity: `pnpm preview:cf`.
- PR previews deploy one Cloudflare Worker and share one Neon branch per PR.

## Auth session

The browser talks only to this origin. Sign-in, sign-up, email confirmation, Google OAuth callback, and session reads go to `/api/auth` on `thegamies.gg`. Better Auth runs **in the Worker** (`auth.handler()` in `src/app/api/auth/[...path]/route.ts`) against `auth_*` tables and writes `Set-Cookie` on the response for this host. There is no outbound Neon Managed Auth hop.

Session cookie (HTTPS):

| Cookie | Role |
|---|---|
| `__Secure-better-auth.session_token` | Login session (non-`__Secure-` name on local HTTP) |

Cookies are `HttpOnly`, `Secure` (on HTTPS), `Path=/`, and `SameSite=Lax`. The `__Secure-` prefix makes them host-only: no `Domain`, so they belong to the exact host that set them and travel only over HTTPS. Sign-out also expires legacy `__Secure-neon-auth.*` names left from the Managed Auth cutover.

Visitor IP for Auth comes from Cloudflare’s `cf-connecting-ip` (`src/lib/auth/auth-client-ip.ts`). Keep Auth on this origin so `Set-Cookie` lands on `thegamies.gg`. Detail: [self-hosted-better-auth-spike.md](./self-hosted-better-auth-spike.md).

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
- Site operators: `/admin` is a tool grid. `/admin/database` lists table, index, and toast sizes (catalog stats only — not row dumps)
- Do not use `export const runtime = "edge"` — unsupported with OpenNext Cloudflare

## Environments

| Env | Trigger | App | Data |
|---|---|---|---|
| Local | Developer machine | `next dev` | Neon dev branch |
| Preview | PR into `develop` | Cloudflare Workers preview (one URL) | Shared Neon branch for that PR |
| Staging | `develop` | Worker `thegamies-v2-develop` | Neon non-prod branch |
| Production | Merge to `main` | Worker `thegamies-v2` | Neon production branch |

See [deployment.md](./deployment.md) for wiring, secrets, and CLI setup.

## Future mobile

Expo later. Share types, schemas, scoring, terminology, and API contracts — not the full web UI.
