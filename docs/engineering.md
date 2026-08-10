# Engineering operating system

Day-to-day rules for The Gamies v2. Product and design live elsewhere; this doc owns **how we ship**.

## Principles

1. `main` is production.
2. Every change goes through a pull request (including solo work).
3. Preview before production.
4. Test the risk, not the theater.
5. Do not invent product decisions while coding — see `docs/decisions.md`.

## Version control

### Branches

| Branch | Role |
|---|---|
| `main` | Production only |
| `feat/…` | New capability |
| `fix/…` | Bug fix |
| `chore/…` | Tooling, docs, deps, CI |
| `hotfix/…` | Urgent production fix (still via PR) |

Keep branches short-lived. Prefer many small PRs over long-lived feature branches.

### Commits

- Message focuses on **why**, not a file list.
- No secrets, `.env` files, credentials, or large unrelated binaries.
- Do not use `--no-verify` unless explicitly approved for that commit.

### Pull requests

- Open a PR for every change destined for `main`.
- Squash merge to `main` (default).
- No force-push to `main`.
- PR description: what changed, how to verify, risk notes.
- Update docs / decision log in the same PR when behavior or policy changes.

### Tags / versions

- Tag production milestones as `v0.x.y` when a meaningful slice ships.
- Keep a short `CHANGELOG.md` entry per tagged release (can stay lightweight early).

## Environments

| Env | Trigger | App | Data |
|---|---|---|---|
| Local | Developer machine | `next dev` | Neon dev branch or local connection string |
| Preview | Every PR | Vercel preview URL | Neon database branch for that PR |
| Production | Merge to `main` | Vercel production | Neon production branch |

Rules:

- Never point a preview deploy at the production database.
- Never run exploratory migrations against production.
- `.env.example` documents required variables; real secrets stay in Vercel / local env only.

## Deployment

1. Push a branch → open PR.
2. Vercel builds a **preview** deploy; Neon branch DB is wired when that integration exists.
3. CI must pass (lint, typecheck, required tests).
4. Human checks the preview URL for user-facing work.
5. Squash merge to `main` → **production** deploy.

### Migrations

- Migrations are reviewed in the PR with the code that needs them.
- Preview: apply migrations to the PR’s Neon branch.
- Production: apply on merge to `main` (or a single explicit approved release step if we later tighten this).
- Destructive production database operations require an explicit human request in the conversation or PR — plans that mention reset are not permission.

### Hotfixes

Same path as normal: branch from `main` → PR → preview if possible → merge. Skip process only for true outages, and document the exception in the PR.

## Testing

We optimize for **risk coverage**, not percentage theater.

### Unit tests

**Required for:** pure domain logic — scoring, eligibility, validators, status derivation from dates, ranking math, Zod schemas that encode rules.

**Location:** next to the module or under a clear `__tests__` / `*.test.ts` convention once the app is scaffolded.

### Integration tests

**Required for:** paths that touch Postgres or auth in a meaningful way — e.g. ballot submit, result reads, RLS/permission assumptions.

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
| Pure logic (scoring, rules) | Unit tests |
| API / DB behavior | Integration check on branch DB |
| Community ballot or results UI | Lint + typecheck + desktop/mobile visual check |
| Infra / CI only | Pipeline proves itself on the PR |

### Local commands (to be wired at scaffold)

Exact scripts will land with the Next.js app. Expect at least:

- `lint`
- `typecheck`
- `test` (unit)
- `test:integration` (when present)
- `test:visual` (when present)

## Day-to-day workflow

### Humans and AI

1. Name the task; list **in scope** and **out of scope**.
2. Confirm open decisions are already answered or explicitly deferred.
3. Create a branch.
4. Implement one vertical slice.
5. Add tests for the risky part.
6. Open PR → exercise preview.
7. Squash merge → verify production.
8. Update docs/decisions if policy or user-visible behavior changed.

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
| Host | Vercel |
| DB branches | Neon |

If we change a default, log it in `docs/decisions.md`.

## Definition of done

A PR is done when:

1. Scope matches what was approved.
2. CI passes.
3. Required tests for the change type exist and pass.
4. Preview checked for user-facing UI.
5. Docs/decisions updated when needed.
6. No known secret or production-data risk introduced.
