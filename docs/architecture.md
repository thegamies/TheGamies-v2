# Architecture

## Overview

One coherent Next.js application, deployable to **Cloudflare Workers** (OpenNext). Neon provides Postgres and Auth. IGDB ingestion runs as a separate TypeScript worker, not inside normal web requests.

```text
Browser → Cloudflare Workers (OpenNext) → Neon (Postgres + Auth)
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
| Auth | Neon Auth (Managed Better Auth); profiles in app `profiles` table. Account deletion closes the auth user via SDK `deleteUser`, the Neon Auth Users API, and `neon_auth` SQL (SDK delete is often a no-op). The UI posts JSON to `/api/account/delete` (not a Server Action): after Auth close, OpenNext crashes if Next re-renders `/account` or `redirect()`s. |
| Access control | **App-layer** session + ownership until Auth JWT → DB role for RLS is defined |
| Catalog | IGDB via separate worker + queued Cloudflare webhooks |
| Validation | Zod |

## Hosting rules

- Do not call Cloudflare-only APIs from domain/feature modules (keep adapters thin).
- Prefer portable storage (R2 or S3) when object storage is needed.
- Local day-to-day: `pnpm dev` (Node). Cloudflare runtime parity: `pnpm preview:cf`.
- PR previews deploy one Cloudflare Worker and share one Neon branch per PR.

## Auth session

The browser talks only to this origin. Sign-in, sign-up, email confirmation, the Google session claim, and later session reads go to `/api/auth` on `thegamies.gg`. The Worker (`auth.handler()` in `src/app/api/auth/[...path]/route.ts`) calls Neon Auth at `NEON_AUTH_BASE_URL` and writes `Set-Cookie` on the response for this host.

Two cookies matter:

| Cookie | Role |
|---|---|
| `__Secure-neon-auth.session_token` | Login session |
| `__Secure-neon-auth.local.session_data` | Signed cache. A fresh one skips Neon on navigation for up to four hours (`SESSION_DATA_TTL_SEC`) |

They are `HttpOnly`, `Secure`, `Path=/`, and `SameSite=Lax`. The `__Secure-` prefix makes them host-only: no `Domain`, so they belong to the exact host that set them and travel only over HTTPS. On a later visit the browser attaches them as the `Cookie` header. The site does not fetch them.

A 429 is Neon Auth answering that Worker call. This app has no sign-in rate limit of its own. The Auth SDK does not copy the visitor address, so `src/lib/auth/auth-client-ip.ts` replaces `x-forwarded-for` with one value, Cloudflare’s `cf-connecting-ip`, and only on fetches to the Auth base URL. Neon has not documented which key the managed limiter uses. Current Better Auth trusts `x-forwarded-for` when that header holds a single address. A comma-separated list is ignored unless Better Auth is configured with `trustedProxies`. With no resolvable address, Better Auth uses one shared bucket per path. If Neon’s edge appends the Worker’s address before the limiter runs, our single value becomes a list and every visitor can share that bucket. Nothing in this repo can see that hop. The signal is a 429 that lands on more than one visitor at once.

Keep the Auth call on the Worker. Neon’s host cannot store a cookie for `thegamies.gg`: the browser keeps `Set-Cookie` for the host that sent it. Trusted domains only allow redirects and CSRF origins. `cookies.domain` applies when our response sets the cookie, which is what the `/api/auth` proxy is for. A handoff that reads a token from Neon’s JSON and posts it here would put the session token in page JavaScript, and later session checks would still leave from the Worker.

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
