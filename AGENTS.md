# The Gamies (v2)

Consumer gaming platform for personal Game of the Year lists and community-run awards.

## Identity

Feel like an independent gaming publication crossed with a personal record collection and premium sports standings.

Do **not** feel like a SaaS dashboard, admin panel, generic shadcn app, crypto/esports site, card grid, or neon gaming landing page.

Visual system: **Editorial Standings** with editorial minimalism and soft brutalism. See `docs/design-system.md`.

## Stack (locked)

- Next.js App Router + TypeScript
- Tailwind CSS + project-owned design tokens
- Hosting: Vercel **and** Cloudflare Workers (OpenNext) — portable app, dual PR previews
- Database + Auth: Neon (Postgres + Neon Auth)
- Game catalog: IGDB via a separate ingestion worker
- Validation: Zod
- Client data: TanStack Query only where it clearly helps

## Product priorities (v1)

**In:** games browse/detail, GOTY + custom lists (anon create + soft save prompt + editorial list view), user pages, site live GOTY aggregate (signed-in lists, admin lock), communities with optional live rankings + year **editions** (hidden ballots → frozen Combined/Community/Voices + categories + voters).  
**Out:** library/played status, native mobile, messaging, GraphQL, microservices, recalculating frozen edition results, Remotion/video export.

Editions ≠ live rankings — see `docs/product.md`.

## Docs

| Topic | Doc |
|---|---|
| Product | `docs/product.md` |
| Terms | `docs/terminology.md` |
| Architecture | `docs/architecture.md` |
| Design | `docs/design-system.md` |
| Engineering / day-to-day | `docs/engineering.md` |
| Deployment (dual host) | `docs/deployment.md` |
| Secrets (Doppler) | `docs/secrets.md` |
| Account wiring checklist | `docs/setup-checklist.md` |
| Local reference checkouts | `docs/references.md` |
| Decisions | `docs/decisions.md` |
| Community / ballot / results | `docs/features/` |

## Workflow

Full rules: `docs/engineering.md`. Short form:

1. Clarify scope; list in/out for the session.
2. Get explicit approval before implementing a phase or multi-step feature.
3. Branch from `develop` → implement one approved step → PR into `develop` → preview → squash merge. Promote `develop` → `main` for production.
4. Do not invent answers to open decisions in `docs/decisions.md`.
5. Test by risk: unit for domain logic, integration for DB/auth paths, visual for ballot/results UI.
6. After finishing a task or substantive reply, always propose **What’s next**.

## Verification

After visual changes: lint, typecheck, relevant tests, desktop + mobile screenshots against references, check difficult fixtures.

## Completion

A task is done when behavior matches the docs, engineering checks pass, visual rules are preserved, and intentional deviations are documented.

## End of turn

After finishing a task or substantive reply, always end with a short **What’s next** — concrete options or the recommended next step — so day-to-day work keeps a clear follow-up.
