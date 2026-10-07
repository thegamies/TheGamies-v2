# Hardening plan — security, privacy, performance

Source: codebase audit, 2026-10-06. Work top to bottom. Each step is one commit straight to `develop` (no PRs for this plan) → push → staging check. Tick the box when pushed.

Every step ships with tests in the same commit (see `docs/engineering.md`). Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` locally before pushing; CI runs the same.

## Phase 1 — Fix now

### [x] 1. Upgrade Next.js to 16.3.8

- **Why:** `next@16.3.0` is affected by GHSA-vcvr-r3jv-pc5j (critical RCE in `next/og` `ImageResponse`, fixed in 16.3.6) and CVE-2026-94483 (image optimization SSRF, fixed in 16.3.8). `/api/og` renders user-written text (display names, list titles, community names/descriptions).
- **Change:** bump `next` and `eslint-config-next` to `16.3.8` in `package.json`; refresh lockfile. Re-read `node_modules/next/dist/docs/` release notes for anything that affects OpenNext.
- **Tests:** existing suite + `src/lib/seo/og-image.test.ts`.
- **Preview check:** `/api/og?kind=game&slug=…`, `kind=list`, `kind=community`; game covers and avatars load through image optimization.

### [x] 1b. Upgrade OpenNext to 1.20.9

- **Why:** `@opennextjs/cloudflare@1.20.9` requires `next >=16.3.8`, matching the same advisory round. Kept separate from step 1 so a Workers build regression is easy to isolate.
- **Change:** bump `@opennextjs/cloudflare` to `^1.20.9` and `wrangler` to `^4.125.0`; refresh lockfile.
- **Staging check:** same as step 1, plus confirm the staging deploy succeeds and image optimization still goes through the `IMAGES` binding.

### [ ] 2. Board access checks on edition JSON routes

- **Why:** `src/app/api/communities/[slug]/edition/[year]/{standings,categories,comparison}/route.ts` only check "community exists + edition published". Pages also require `canBrowseCommunityBoards`. Private communities' results (including the per-Host comparison) are readable by slug.
- **Change:** one shared helper (e.g. `loadBrowsableEdition(slug, year)`) that resolves viewer role and returns 404 unless `canBrowseCommunityBoards(visibility, joinsClosed, role)`. Use it in all three routes.
- **Tests:** new route tests (mock community/edition/role): anon on private → 404; anon on public with joins open → 404; anon on public showcase → 200; member on private → 200.
- **Preview check:** hit the comparison URL for a private community signed out.

### [ ] 2b. Staging validation harness (signed-in checks)

- **Why:** unit tests mock the session. Signed-in behavior (members see private boards, outsiders don't, Hosts see Host-only views) needs a real check on staging that runs with no manual setup and no one's personal password.
- **Fully automated — no accounts, communities, or joins made by hand.** Runs in GitHub Actions after every staging deploy.
- **One-time operator setup (only these two):**
  - Add GitHub secret `QA_ACCOUNT_PASSWORD` (any long random string; shared by the QA accounts).
  - Run `gh auth login` on the dev machine so the agent can read run results.
- **Fixture script** (`scripts/qa/ensure-staging-fixtures.ts`, `pnpm qa:fixtures`) — idempotent, safe to rerun:
  - **Accounts:** `qa-host`, `qa-member`, `qa-outsider`, created through staging's normal email sign-up endpoint on reserved non-deliverable addresses (e.g. `@example.com`), then marked verified with `markNeonAuthEmailVerified`. If sign-in with `QA_ACCOUNT_PASSWORD` fails (secret rotated), remove the auth user (`remove-neon-auth-user`) and recreate it.
  - **Profiles:** created through the profile service (same fields as complete-profile).
  - **Communities:** `qa-private` (private; host = qa-host, member = qa-member) and `qa-showcase` (public, joins closed; host = qa-host), via the communities service.
  - **Results:** a published edition year on each — fill ballots with `seedCommunityEditionBallots`, publish with `publishEditionForSeed`, refresh with `refreshPublishedEditionResultsForSeed`. Skip when already published.
  - **Guards:** refuses to run unless `QA_TARGET=staging`, and refuses if `NEXT_PUBLIC_APP_URL` or `DATABASE_URL` matches production. Never prints passwords or connection strings.
- **Signed-in checks:**
  - `playwright.staging.config.ts`: `baseURL` = staging app URL, no `webServer`, test dir `e2e/staging/`.
  - Global setup signs in each QA account through `/auth/sign-in` and saves storage state to `e2e/.auth/*.json` (gitignored).
  - `pnpm test:staging` runs them. Specs are **read-only** (GET pages and APIs, no writes), so they are safe after every deploy.
- **CI:** new `qa` job in `.github/workflows/staging.yml`, `needs: cloudflare`, env from `STAGING_DATABASE_URL`, `STAGING_NEON_AUTH_BASE_URL`, `STAGING_CF_APP_URL`, `QA_ACCOUNT_PASSWORD`. Steps: install → `pnpm qa:fixtures` → install Chromium → `pnpm test:staging` → upload Playwright report; pass/fail lines in the job summary. Also runnable via `workflow_dispatch`.
- **First specs (covers step 2):** for standings / categories / comparison APIs and the edition page — signed out + outsider → 404 on `qa-private`; member + host → 200; everyone → 200 on `qa-showcase`.
- **Later steps add specs here:** step 3 (redirect after sign-in), step 4 (account delete origin), step 6 (headers present, sign-in still works under CSP), step 7 (account page props, private metadata).
- **Out of scope:** Google sign-in (needs a real Google login — stays a manual check).

## Phase 2 — Auth and secrets hardening

### [ ] 3. Open redirect + email-verification skip

- **`safeNextPath`** (`src/lib/auth/safe-next.ts`): reject `\`, whitespace/control characters; decode once and re-check for `//` and `://`.
- **`skipEmailVerification`** (`src/lib/auth/skip-email-verification.ts`): fail closed — only skip when `NEXT_PUBLIC_APP_URL` is set and its hostname is `localhost` / `127.0.0.1` / `::1`.
- **Also:** `buildAbsoluteAppUrl` (`src/lib/auth/return-to.ts`) — parse and require exact loopback hostname; `errorCallbackPath` in `google-sign-in-client.ts` → run through `safeNextPath`.
- **Tests:** new `safe-next.test.ts` (`/\evil.com`, `/\t//evil.com`, `/%2F%2Fevil.com`, normal paths still pass); extend `skip-email-verification.test.ts` (missing app URL → false); `return-to.test.ts` (`http://localhost.evil.com` → null).

### [ ] 4. Secret comparisons and origin check

- **Cron** (`src/app/api/cron/edition-freeze/route.ts`): Bearer only, constant-time compare; remove `?secret=`.
  - Check first: confirm nobody triggers freeze manually with `?secret=` (internal `scheduled` handler already uses Bearer). Update `docs/go-live.md` "manual hit" wording. Rotate `CRON_SECRET` if it was ever used in a URL.
- **First-admin claim** (`src/lib/site-ops/service.ts`): constant-time compare (reuse helper from `packages/igdb/src/timing-safe.ts` or a shared one).
- **Account delete origin check** (`originMatchesRequestHost` in `src/lib/auth/session-cookies.ts`): compare `Origin` against the configured app origin(s), not client `X-Forwarded-Host`.
- **Tests:** cron route test (query secret → 401, Bearer → 200, empty secret → 401); `session-cookies.test.ts` (forged `X-Forwarded-Host` → false); `site-ops/service.test.ts` still passes.

### [ ] 5. Webhook and worker hardening

- **Body caps:** reject > ~256KB with 413 before buffering — `workers/igdb-webhooks/src/index.ts` and `src/app/api/webhooks/neon-auth-email/route.ts` (check `Content-Length`, then count bytes while reading).
- **Redact IGDB registration:** register/delete responses return only `id, entity, method, url, active` (same shape as the overview endpoint) — never `secret` / `api_key`.
- **Generic 500s:** worker and `src/app/api/admin/sync/route.ts` return a fixed message; log details server-side.
- **Neon timestamp skew:** `src/lib/email/neon-webhook.ts` — also reject timestamps more than ~60s in the future.
- **Email links:** `src/lib/email/templates.ts` `ctaButton` — allow `https:` only.
- **Admin proxy ids:** validate `id` / `webhookId` path segments (`[A-Za-z0-9-]+`) before building worker URLs.
- **Tests:** `neon-webhook.test.ts` (future timestamp), worker tests for 413 + redacted registration, template test for non-https href.

### [ ] 6. Security headers

- **Change:** `headers()` in `next.config.ts`: `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`.
- **CSP:** ship as `Content-Security-Policy-Report-Only` first; allowlist Neon Auth, Google sign-in, GA, AdSense, IGDB/R2 images. Enforce in a follow-up once preview is clean.
- **Decision needed:** enforce CSP in this PR or report-only first (recommended: report-only).
- **Preview check:** sign in (email + Google), ads, analytics, image upload, OG previews; browser console has no blocked resources.

## Phase 3 — Privacy

### [ ] 7. Privacy fixes

- **Account form DTO:** `src/app/account/page.tsx` passes only the fields `AccountProfileForm` uses (no `authUserId`, `isSiteAdmin`, `isSeed`).
- **Private community metadata:** `generateMetadata` on `communities/[slug]` (+ live, edition, members) returns generic title/no description for non-public communities.
- **TGA opt-in:** `saveCommunitySheet` / `importSiteSheetToCommunity` in `src/lib/tga-pickem/sheets.ts` require `isCommunityTgaOptedIn`.
- **Input caps:** `hydrateDraftGamesAction` caps `igdbIds` to the list max.
- **Social links on render:** `ProfileSocialLinks` only renders `https:` hrefs.
- **Tests:** unit tests for each (sheets opt-in, metadata for private, DTO shape, cap, social link filter).

## Phase 4 — Performance

### [ ] 8. Integration test harness (prerequisite)

- **Why:** steps 9, 11, 12, 14 change SQL; mocked unit tests cannot prove the new queries return the same rows.
- **Change:** `pnpm test:integration` (Vitest project) against a Neon branch / test database — never production. Seed helpers for profiles, follows, lists, communities, editions. Add a CI job when a branch DB is available.
- **Decision needed:** Neon branch per CI run vs a shared test branch.
- **Docs:** update `docs/engineering.md` (Integration tests section).

### [ ] 9. Stop loading full follow lists

- **Why:** `listFollowedProfileIds` (`src/lib/follow/service.ts`) loads every followed id, then queries with a huge `IN (...)` on game detail, following feed, games trending.
- **Change:** replace with `EXISTS` / join on `profile_follows` inside `countFollowsLibraryForGame`, `listFollowingFeedPage`, `listTrendingBoard`. Remove the helper if unused.
- **Tests:** integration — same results as before for a seeded follow graph; unit tests on callers.

### [ ] 10. Narrow community revalidation

- **Why:** `revalidateCommunity` (`src/app/communities/actions.ts`) invalidates ~10 paths including two layouts on every write.
- **Change:** per-action revalidation map (invite rotate → settings; role change → members + header; ballot save → that edition year; settings → community shell). Drop `"layout"` unless shell data changed.
- **Tests:** unit — assert `revalidatePath` calls per action.
- **Preview check:** each action's visible change still appears without a hard refresh.

### [ ] 11. Batch live-aggregate dirty-key refresh

- **Why:** `processDirtyKeys` (`src/lib/live-aggregate/refresh.ts`) does a sequential upsert + delete per dirty game and per dirty category.
- **Change:** one `INSERT … SELECT … ON CONFLICT` for all dirty ids (capped batch per tick), then one `DELETE`.
- **Tests:** integration — scores identical to the per-row path for a seeded year.

### [ ] 12. Page locked live categories in SQL

- **Why:** `src/lib/communities/live.ts` loads every frozen category row, then filters to one category in JS.
- **Change:** `WHERE category_id = …` + `LIMIT/OFFSET` (or top-N for the list view).
- **Tests:** unit + integration on a seeded lock.

### [ ] 13. Request waterfalls and cache

- Game detail (`src/app/games/[slug]/page.tsx`) and edition page (`src/app/communities/[slug]/edition/[year]/page.tsx`): `Promise.all` independent reads.
- Use `getRequestProfileByAuthUserId` in `/u/[username]`, `/create`, `/create/goty`, `/create/custom`, list share pages.
- Wrap `getPromotedTgaHref` in `cache()`; narrow the header profile select.
- **Tests:** existing page/lib tests; preview timing comparison.

### [ ] 14. Indexes

- Migration: `pg_trgm` GIN indexes on `profiles.display_name` and `profiles.username`.
- Mirror existing `games` search indexes (from `0000_modern_lockheed.sql`) in `packages/db/src/schema.ts` so drizzle-kit does not drop them.
- **Tests:** `pnpm db:migrate` on branch DB; `EXPLAIN` people search uses the index.

### [ ] 15. Cleanup and long-tail scale

- Edition freeze (`src/lib/communities/edition-results.ts`) and `rebuildYear`: move to `INSERT … SELECT` / batched reads instead of loading everything into memory.
- Host promote voice checks (`community-hosts.ts`): one grouped count.
- Community overview editions: capped SQL instead of load-all-then-slice.
- Delete dead unbounded helpers: `listCommunityMemberOptions`, `listOwnedForProfile`.
- Small-print fixes: join/ban race in `joinCommunityAsMember` (transaction).
- **Tests:** integration for freeze output parity.
