# Engineering operating system

Day-to-day rules for The Gamies v2. Product and design live elsewhere; this doc owns **how we ship**.

## Principles

1. `develop` is the day-to-day integration branch; `main` is production.
2. Every change goes through a pull request (including solo work).
3. Preview before merging to `develop`; production only via `main`.
4. Test the risk, not the theater.
5. Do not invent product decisions while coding — see `docs/decisions.md`.
6. **User-facing copy only** in the product UI — no `pnpm`/CLI commands, env var names, or developer setup text in pages (including empty states). Ops details belong in `docs/`. See `.cursor/rules/user-facing-copy.mdc`.

## Version control

### Branches

| Branch | Role |
|---|---|
| `main` | Production only |
| `develop` | Integration / staging — default branch for active work |
| `feat/…` | New capability (branch from `develop`) |
| `fix/…` | Bug fix (branch from `develop`) |
| `chore/…` | Tooling, docs, deps, CI (branch from `develop`) |
| `hotfix/…` | Urgent production fix (branch from `main`, still via PR) |

Keep feature branches short-lived. Prefer many small PRs over long-lived feature branches.

### Commits

- Message focuses on **why**, not a file list.
- No secrets, `.env` files, credentials, or large unrelated binaries.
- Do not use `--no-verify` unless explicitly approved for that commit.

### Pull requests

- Day-to-day PRs target **`develop`** (squash merge by default).
- Release PRs promote **`develop` → `main`** (squash or merge commit; no force-push).
- No force-push to `main` or `develop`.
- PR description: what changed, how to verify, risk notes.
- Update docs / decision log in the same PR when behavior or policy changes.

### Tags / versions

- Tag production milestones as `v0.x.y` when a meaningful slice ships.
- Keep a short `CHANGELOG.md` entry per tagged release (can stay lightweight early).

## Environments

| Env | Trigger | App | Data |
|---|---|---|---|
| Local | Developer machine | `next dev` (Node); `pnpm preview:cf` for Workers parity | Neon dev branch or local connection string |
| Preview | PR into `develop` | **Vercel preview and Cloudflare Workers preview** | Shared Neon database branch for that PR |
| Staging | Push to `develop` | Both hosts (Vercel + Worker `thegamies-v2-develop`) | Neon staging via `STAGING_DATABASE_URL`; CI runs `pnpm db:migrate` before deploy |
| Production | Merge to `main` | Both hosts (production) | Neon production branch |

Rules:

- Never point a preview deploy at the production database.
- Never run exploratory migrations against production.
- `.env.example` documents required variables; real secrets stay in host dashboards / GitHub Actions / local env only.
- Dual-host setup details: [deployment.md](./deployment.md).

## Request cost (compute · egress · scale)

Every hot read path should be cheap under growth—not only correct for a small fixture.

Before choosing freeze/cache/list storage, walk the request:

1. **DB egress** — Bytes from Neon to the app per page view. Avoid patterns that pull an entire freeze blob to serve 50 rows.
2. **Compute** — Parse/serialize and memory on Vercel **and** Cloudflare Workers for that payload.
3. **Scale** — Behavior at 10× ballots, games, or traffic. Prefer SQL `LIMIT`/`OFFSET` (or keyset) on normalized freeze rows over “load all, slice in memory.”

**Do:** page-sized queries; small meta; client gets only what it renders.  
**Don’t:** fat `jsonb` snapshots on the hot path for boards or voter matrices.

Live lock and edition results freeze into **tables**, not one giant payload. See `.cursor/rules/request-cost.mdc`.

## Deployment

1. Branch from `develop` → open PR **into `develop`**.
2. CI runs lint/typecheck/build.
3. Preview workflow creates a Neon branch and deploys **both** Vercel and Cloudflare previews (when secrets are configured).
4. Human checks **both** preview URLs for user-facing work when both are live.
5. Squash merge to `develop` → **staging** deploy on both hosts.
6. When ready to ship: PR **`develop` → `main`** → **production** on both hosts.

### Migrations

- Migrations are reviewed in the PR with the code that needs them.
- Preview: apply migrations to the PR’s Neon branch.
- `develop` / staging: apply when merging into `develop`.
- Production: apply on merge to `main` (or a single explicit approved release step if we later tighten this).
- Destructive production database operations require an explicit human request in the conversation or PR — plans that mention reset are not permission.

### Hotfixes

Branch from `main` → PR into `main` → preview if possible → merge, then back-merge into `develop`. Skip process only for true outages, and document the exception in the PR.

## Testing

**Every feature ships with tests in the same PR** (or an immediately linked follow-up only when scaffolding is still missing — call that out explicitly). Risk still chooses *which* tests, not *whether* to test.

We optimize for **risk coverage**, not percentage theater — but “no tests” is not an acceptable default for feature work.

### Unit tests

**Required for:** pure domain logic — scoring, eligibility, validators, status derivation from dates, ranking math, Zod schemas that encode rules, and feature helpers that map/transform data (e.g. IGDB mapping, resume rules).

**Location:** next to the module or under a clear `__tests__` / `*.test.ts` convention once the app is scaffolded.

### Integration tests

**Required for:** paths that touch Postgres or auth in a meaningful way — e.g. ballot submit, result reads, catalog upsert/enrich, admin-protected sync routes, profile ownership helpers.

Until Postgres **RLS** is adopted (open: Auth JWT → DB role), permission tests target **app-layer** session checks and ownership helpers — not SQL policies. When RLS lands, add integration coverage for those policies.

Run against a Neon branch or ephemeral test database — never against production.

### Visual / e2e

**Required for** brand-defining UI once those pages exist:

- Community ballot (desktop + mobile)
- Community results (desktop + mobile)
- Ballot matrix (desktop)
- Category results (mobile)

Use Playwright screenshots compared to approved references under `design-references/` / `tests/visual/`.

### When is a change “tested enough”?

| Change type | Minimum bar |
|---|---|
| Docs / tokens comments only | Review |
| Feature / product behavior | Unit and/or integration tests for the new paths (same PR) |
| Pure logic (scoring, rules) | Unit tests |
| API / DB behavior | Integration check on branch DB |
| Community ballot or results UI | Lint + typecheck + desktop/mobile visual check |
| Infra / CI only | Pipeline proves itself on the PR |

### Local commands

- `lint`
- `typecheck`
- `test` (unit — Vitest)
- `test:watch`
- `test:integration` (when present)
- `test:visual` (when present)

Category Reveal stress-test (dev only): on edition Results, beside Competition · Dense, use **Repeat** and **Cap** controls (local `next dev` only). Cap limits games per derived rank; Repeat clones each derived rank. No URL params; no-op in production.

Catalog / IGDB sync unit coverage lives under `packages/igdb/src/*.test.ts` and `src/lib/admin-sync-schema.test.ts`. Integration tests against Neon remain a follow-up.

## App Router layouts and request data

Shared chrome and per-request auth must not create **server waterfalls** with page data.

### Site header

- Render **`SiteHeader` once in `src/app/layout.tsx`** (root layout).
- **Do not** import or render `SiteHeader` in individual `page.tsx` files or nested feature layouts (`create/`, etc.).
- Layout and page Server Components fetch **in parallel**; putting the header only in the page (and `await`ing page data first) serializes auth behind the page query.

### Per-request memoization (`cache`)

Use React `cache()` helpers in `src/lib/auth/session.ts`:

| Helper | Role |
|---|---|
| `getRequestSessionUser` | Neon Auth session user (once per request) |
| `getRequestProfileByAuthUserId` | Profile row for that auth id (once per request) |

`SiteHeader` and any page that needs the same session/profile (e.g. `/account`) should call these helpers so layout + page share one auth/profile round-trip.

Do **not** put `cache()` around DB clients or auth *factory* setup in a way that permanently caches `null` across requests when env loads late (see `getAuthOrNull` comments). `cache()` here is **per React request**, not process-lifetime.

### Page data

- Keep route-specific data fetching in the **page** (or a dedicated loader), not the root layout.
- Prefer **one Neon round-trip** for a board when HTTP latency dominates (see standings bundle in `docs/features/live-aggregate.md`).
- Optional later: wrap heavy page sections in `<Suspense>` so the layout shell can stream first.

### Checklist for new pages

1. No `<SiteHeader />` in the page.
2. Session/profile via `getRequestSessionUser` / `getRequestProfileByAuthUserId` when needed.
3. Page-only data fetches stay in the page module.
4. Avoid `await`ing page data before starting independent work that could live in layout (header already does).

## Day-to-day workflow

### Humans and AI

1. Name the task; list **in scope** and **out of scope**.
2. Confirm open decisions are already answered or explicitly deferred.
3. Create a branch from `develop`.
4. Implement one vertical slice.
5. Add tests for the feature in the same PR (unit and/or integration by risk). “No tests” needs an explicit documented exception.
6. Open PR into `develop` → exercise preview.
7. Squash merge to `develop`.
8. Periodically promote `develop` → `main` for production.
9. Update docs/decisions if policy or user-visible behavior changed.

### AI-specific gates

- One approved step per session unless multiple steps are explicitly approved together.
- Do not silently fill in open items from `docs/decisions.md`.
- Prefer portable domain logic in plain TypeScript modules; keep framework/host adapters thin.

## CI (target)

GitHub Actions on each PR:

1. Install deps  
2. Lint  
3. Typecheck  
4. Unit tests  
5. Integration tests when the job has a Neon branch / test DB  
6. Visual tests when screenshots are in scope for that PR (may be path-filtered later)

Vercel handles app build/deploy separately; CI is the quality gate, Vercel is the host.

## Tooling defaults (until changed in decisions)

| Topic | Default |
|---|---|
| Package manager | `pnpm` |
| Node | Active LTS |
| PR merge | Squash |
| Hosts | Vercel **and** Cloudflare Workers (OpenNext); dual PR previews |
| DB branches | Neon (one branch per PR, shared by both hosts) |

If we change a default, log it in `docs/decisions.md`.

## Definition of done

A PR is done when:

1. Scope matches what was approved.
2. CI passes.
3. Feature work includes tests in the same PR (unit/integration/visual by risk) and they pass. Docs-only / infra-only changes follow the “tested enough” table.
4. Preview checked for user-facing UI.
5. Docs/decisions updated when needed.
6. No known secret or production-data risk introduced.
