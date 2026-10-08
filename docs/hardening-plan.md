# Hardening plan — security, privacy, performance

**Status: closed 2026-10-08.** Every step shipped except step 10 (deferred). See [Close-out](#close-out) for what was found and what's left.

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

### [x] 2. Board access checks on edition JSON routes

- **Why:** `src/app/api/communities/[slug]/edition/[year]/{standings,categories,comparison}/route.ts` only check "community exists + edition published". Pages also require `canBrowseCommunityBoards`. Private communities' results (including the per-Host comparison) are readable by slug.
- **Change:** one shared helper (e.g. `loadBrowsableEdition(slug, year)`) that resolves viewer role and returns 404 unless `canBrowseCommunityBoards(visibility, joinsClosed, role)`. Use it in all three routes.
- **Tests:** new route tests (mock community/edition/role): anon on private → 404; anon on public with joins open → 404; anon on public showcase → 200; member on private → 200.
- **Preview check:** hit the comparison URL for a private community signed out.

### [x] 2b. Staging validation harness (signed-in checks)

- **Why:** unit tests mock the session. Signed-in behavior (members see private boards, outsiders don't, Hosts see Host-only views) needs a real check on staging that runs with no manual setup and no one's personal password.
- **Fully automated — no accounts, communities, or joins made by hand.** Runs in GitHub Actions after every staging deploy.
- **One-time operator setup (only these two):**
  - Add GitHub secret `QA_ACCOUNT_PASSWORD` (any long random string; shared by the QA accounts).
  - Run `gh auth login` on the dev machine so the agent can read run results.
- **Config + guards** (`src/lib/qa/staging-fixtures.ts`): QA identities, community defs, and `resolveQaTarget` — refuses unless `QA_TARGET=staging`, `QA_STAGING_URL` is https and not a production host (`thegamies.gg`, `www.thegamies.gg`, the `thegamies-v2` Worker), and `QA_ACCOUNT_PASSWORD` passes the app's password rules. The CI job only ever receives `STAGING_*` secrets. Errors never echo secret values.
- **Fixture script** (`scripts/qa/ensure-staging-fixtures.ts`, `pnpm qa:fixtures`) — idempotent, safe to rerun:
  - **Accounts:** `gamies_qa_host`, `gamies_qa_member`, `gamies_qa_outsider` on `thegamies-qa-*@example.com`. Created through staging's `/api/auth/sign-up/email`, marked verified with `markNeonAuthEmailVerified`. If sign-in with `QA_ACCOUNT_PASSWORD` fails (secret rotated), the auth user is removed (`removeNeonAuthDirectoryUser`) and recreated; the profile is re-pointed to the new auth id.
  - **No mail:** the Neon Auth email webhook skips reserved undeliverable domains (`example.com`, `.test`, `.invalid`, …) — `isUndeliverableEmailAddress` in `src/lib/email/send.ts`.
  - **Profiles:** `ensureProfileForAuthUser`, then set private so QA accounts stay out of people search.
  - **Communities:** `gamies_qa_private` (private; host + member) and `gamies_qa_showcase` (public, joins closed; host only) via `createCommunity` + `updateCommunityDirectoryFlags`. Outsider is never a member. Fails loudly if a slug belongs to a non-QA account.
  - **Results:** when the year is not yet published, `seedCommunityEditionBallots` (8 seed ballots) then `publishEditionForSeed`. Writes `e2e/.auth/fixtures.json` (year, slugs, one enabled category id per community) for the specs.
- **Signed-in checks:**
  - `playwright.staging.config.ts`: `baseURL` = `QA_STAGING_URL`, no `webServer`, test dir `e2e/staging/`. Local `playwright.config.ts` ignores `staging/**`.
  - Global setup signs in each QA account via `POST /api/auth/sign-in/email` (the same endpoint the sign-in form uses) and saves cookies to `e2e/.auth/*.json` (gitignored).
  - `pnpm test:staging`. Specs are **read-only** (GET pages and APIs, no writes). Current specs use API contexts only, so CI skips the browser download; add `playwright install chromium` when a spec needs a page.
- **CI:** `qa` job in `.github/workflows/staging.yml`, `needs: [cloudflare, auth_email]` (Auth domain must be registered before sign-up), env from `STAGING_DATABASE_URL`, `STAGING_CF_APP_URL` (falls back to the deploy URL), `QA_ACCOUNT_PASSWORD`. Skips cleanly when the password secret is missing. Uploads `playwright-report-staging`; result row in the staging summary.
- **First specs (covers step 2), 19 tests:** each signed-in viewer's session is recognized; standings / categories / comparison APIs → 404 for signed out + outsider on `gamies_qa_private`, 200 for member + host, 200 for everyone on `gamies_qa_showcase`; edition page shows the private view exactly when access is denied (the page answers 200 either way).
- **Later steps add specs here:** step 3 (redirect after sign-in), step 4 (account delete origin), step 6 (headers present, sign-in still works under CSP), step 7 (account page props, private metadata).
- **Out of scope:** Google sign-in (needs a real Google login — stays a manual check).

## Phase 2 — Auth and secrets hardening

### [x] 3. Open redirect + email-verification skip

- **`safeNextPath`** (`src/lib/auth/safe-next.ts`): reject `\`, whitespace/control characters; decode once and re-check for `//` and `://`.
- **`skipEmailVerification`** (`src/lib/auth/skip-email-verification.ts`): fail closed — only skip when `NEXT_PUBLIC_APP_URL` is set and its hostname is `localhost` / `127.0.0.1` / `::1`.
- **Also:** `buildAbsoluteAppUrl` (`src/lib/auth/return-to.ts`) — parse and require exact loopback hostname; `errorCallbackPath` in `google-sign-in-client.ts` → run through `safeNextPath`.
- **Tests:** new `safe-next.test.ts` (`/\evil.com`, `/\t//evil.com`, `/%2F%2Fevil.com`, normal paths still pass); extend `skip-email-verification.test.ts` (missing app URL → false); `return-to.test.ts` (`http://localhost.evil.com` → null).
- **Staging spec:** `e2e/staging/auth-redirect.spec.ts` — signed-in host hits `/auth/complete-profile?next=…` (redirects straight to `next` when the profile exists); safe paths kept, unsafe ones land on `/account`. Signed out, an unsafe `next` is dropped from the sign-in link.
- **Local dev note:** the email-verification skip now needs `NEXT_PUBLIC_APP_URL` set to a loopback URL (Doppler `dev` / `dev_personal` and `.env.example` already do).

### [x] 4. Secret comparisons and origin check

- **Cron** (`src/app/api/cron/edition-freeze/route.ts`): Bearer only, constant-time compare; remove `?secret=`.
  - Check first: confirm nobody triggers freeze manually with `?secret=` (internal `scheduled` handler already uses Bearer). Update `docs/go-live.md` "manual hit" wording. Rotate `CRON_SECRET` if it was ever used in a URL.
- **First-admin claim** (`src/lib/site-ops/service.ts`): constant-time compare (reuse helper from `packages/igdb/src/timing-safe.ts` or a shared one).
- **Account delete origin check** (`originMatchesRequestHost` in `src/lib/auth/session-cookies.ts`): compare `Origin` against the configured app origin(s), not client `X-Forwarded-Host`.
- **Tests:** cron route test (query secret → 401, Bearer → 200, empty secret → 401); `session-cookies.test.ts` (forged `X-Forwarded-Host` → false); `site-ops/service.test.ts` (wrong / missing secret never reaches the database).
- **Staging spec:** `e2e/staging/account-delete-origin.spec.ts` — signed out, foreign `Origin` + forged `X-Forwarded-Host` → 403; own origin → 401 (reaches the session check). Signed out so nothing can be deleted.
- **Rotation:** not needed — `?secret=` was never used in a URL (confirmed 2026-10-07).

### [x] 5. Webhook and worker hardening

- **Body caps:** reject > ~256KB with 413 before buffering — `workers/igdb-webhooks/src/index.ts` and `src/app/api/webhooks/neon-auth-email/route.ts` (check `Content-Length`, then count bytes while reading).
- **Redact IGDB registration:** register/delete responses return only `id, entity, method, url, active` (same shape as the overview endpoint) — never `secret` / `api_key`.
- **Generic 500s:** worker and `src/app/api/admin/sync/route.ts` return a fixed message; log details server-side.
- **Neon timestamp skew:** `src/lib/email/neon-webhook.ts` — also reject timestamps more than ~60s in the future.
- **Email links:** `src/lib/email/templates.ts` `ctaButton` — allow `https:` only.
- **Admin proxy ids:** validate `id` / `webhookId` path segments (`[A-Za-z0-9-]+`) before building worker URLs.
- **Tests:** `neon-webhook.test.ts` (future timestamp), worker tests for 413 + redacted registration, template test for non-https href.
- **As built (2026-10-07):**
  - Shared `readTextWithLimit` + `toPublicWebhookRegistration` live in `@thegamies/igdb` (the worker has no test runner). Cap: 256KB on the Neon email webhook (checked before signature work).
  - **IGDB intake: no size cap, by decision — an IGDB delivery must never fail for size** (a refused delivery leaves that record stale, and repeated failures can get the webhook deactivated). The secret check before reading the body is the guard. Real payloads: median ~3.6KB, largest seen ~24KB (Call of Duty: Black Ops III; Nintendo for companies).
  - Cloudflare Queues caps messages at 128KB. Envelopes that would not fit (`fitsInQueueMessage`, 16KB headroom) skip the queue and are processed live — even when delivery is closed — and log `igdb-webhooks-oversized` with size, entity, and id. With no database binding the worker answers 503 so IGDB retries.
  - Generic 500 only on the IGDB intake (`/igdb`); admin-only worker routes and `/api/admin/sync` keep detailed errors for the operator.
  - Neon JWKS cached 10 minutes; an unknown `kid` refetches at most once a minute (rotation still works, forged requests can't force a fetch each time).
  - Email link check lives in `buildAuthEmail` (`isSafeEmailHref`): https, or http on loopback; anything else builds no email.
  - Admin proxy ids: webhook id digits only, event id UUID — checked in the app route and again in the worker.
  - Staging spec `e2e/staging/webhook-limits.spec.ts`: 300KB POST → 413; small unsigned → 401.
  - **Optional follow-up:** rotate `IGDB_WEBHOOK_SECRET` and re-register slots — registration responses carried it to the admin browser before this step.

### [x] 6. Security headers

- **Change:** `headers()` in `next.config.ts`: `X-Frame-Options: DENY` (or CSP `frame-ancestors 'none'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security`, `Permissions-Policy`.
- **CSP:** ship as `Content-Security-Policy-Report-Only` first; allowlist Neon Auth, Google sign-in, GA, AdSense, IGDB/R2 images. Enforce in a follow-up once preview is clean.
- **Decision needed:** enforce CSP in this PR or report-only first (recommended: report-only).
- **Preview check:** sign in (email + Google), ads, analytics, image upload, OG previews; browser console has no blocked resources.
- **Decided 2026-10-07 — minimal version:** `src/lib/security-headers.ts`, applied to every path in `next.config.ts`:
  - `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'` (enforced; structural only — never blocks AdSense, Analytics, or embeds)
  - `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`
  - `Strict-Transport-Security: max-age=31536000` — this host only, no `includeSubDomains`, no `preload` (easy to undo)
  - **Not doing:** source allowlist CSP (with `'unsafe-inline'` it adds little; AdSense domains change constantly), report endpoint, `Permissions-Policy`. A nonce-based CSP would be its own step — it forces every page to render per request.
  - Before 2026-10-07 neither production nor staging sent any of these.
  - Staging spec `e2e/staging/security-headers.spec.ts`: every header on pages, `/account`, and an API route, signed out and signed in.
  - Known gap, accepted: 307s from a page's `redirect()` (e.g. `/account` signed out) carry none of these headers on OpenNext. A bodyless redirect can't be framed or sniffed, and the page it lands on has every header. Covering redirects would need middleware on every request. The spec follows redirects and checks the landing page.

## Phase 3 — Privacy

### [x] 7. Privacy fixes

- **Account form DTO:** `src/app/account/page.tsx` passes only the fields `AccountProfileForm` uses (no `authUserId`, `isSiteAdmin`, `isSeed`).
- **Private community metadata:** `generateMetadata` on `communities/[slug]` (+ live, edition, members) returns generic title/no description for non-public communities.
- **TGA opt-in:** `saveCommunitySheet` / `importSiteSheetToCommunity` in `src/lib/tga-pickem/sheets.ts` require `isCommunityTgaOptedIn`.
- **Input caps:** `hydrateDraftGamesAction` caps `igdbIds` to the list max.
- **Social links on render:** `ProfileSocialLinks` only renders `https:` hrefs.
- **Tests:** unit tests for each (sheets opt-in, metadata for private, DTO shape, cap, social link filter).
- **As built (2026-10-07):**
  - Private metadata: product follows the "closed but discoverable" model (Reddit / Facebook private groups) — the private view already shows the name, so metadata keeps the name and drops the description for non-public communities. Only the overview page used the description; the OG image route already refused private communities. No viewer lookup (link-preview bots are always signed out). Hiding names entirely ("secret" communities) would be a product decision, not hardening.
  - `hydrateGamesByIgdbIds` caps at `LIST_MAX_ITEMS` (100) after de-duplicating; the action ignores non-array input.
  - `saveCommunitySheet` (and so `importSiteSheetToCommunity`) refuses when the community hasn't opted in for the year.
  - `normalizeSocialLinks` keeps only `https:` URLs.
  - `/account` passes `toAccountProfileFormProfile(profile)` (8 fields) to the form.
  - Staging spec `e2e/staging/community-metadata.spec.ts`: private page head has the name but not the description for signed out / outsider / member; showcase keeps its description.

## Phase 4 — Performance

### [x] 8. Integration test harness (prerequisite)

- **Why:** steps 9, 11, 12, 14 change SQL; mocked unit tests cannot prove the new queries return the same rows.
- **Change:** `pnpm test:integration` (Vitest project) against a Neon branch / test database — never production. Seed helpers for profiles, follows, lists, communities, editions. Add a CI job when a branch DB is available.
- **Decision (2026-10-07):** fresh Neon branch per CI run; the job runs only when database-related paths change.
- **Docs:** update `docs/engineering.md` (Integration tests section).
- **As built (2026-10-07):**
  - `pnpm test:integration` runs `*.int.test.ts` via `vitest.integration.config.mts`; `pnpm test` excludes them.
  - Guard: global setup refuses unless the database has `integration.marker`, created only by `pnpm test:integration:mark --confirm-test-database`. Staging and production are never marked.
  - CI job `integration` (`ci.yml`): creates `ci/integration-<run>-<attempt>` from `develop`, empties it (`scripts/integration/reset-ci-branch.ts`, CI-only), migrates from zero, marks it, runs the tests, deletes the branch even on failure or cancel. Path-filtered to `src/lib`, `packages/db`, integration files, the Vitest configs, `ci.yml`, the lockfile.
  - Seed helpers (`src/test/integration/seed.ts`): profiles, games, follows, library entries, lists + items, communities, members, editions. Rows carry a random tag so files can share a database; `cleanup()` deletes only that seeder's rows.
  - First test `src/lib/follow/follow-graph.int.test.ts` pins today's follow-graph results (the baseline step 9 must keep).

### [x] 9. Stop loading full follow lists

- **Why:** `listFollowedProfileIds` (`src/lib/follow/service.ts`) loads every followed id, then queries with a huge `IN (...)` on game detail, following feed, games trending.
- **Change:** replace with `EXISTS` / join on `profile_follows` inside `countFollowsLibraryForGame`, `listFollowingFeedPage`, `listTrendingBoard`. Remove the helper if unused.
- **Tests:** integration — same results as before for a seeded follow graph; unit tests on callers.
- **As built (2026-10-07):**
  - `countFollowsLibraryForGame(gameId, followerProfileId)`, `listFollowingFeedPage(followerProfileId, page)` and `listTrendingBoard({ followerProfileId })` filter with a correlated `EXISTS` on `profile_follows` (primary key lookup) instead of `IN (<every followed id>)`.
  - `listFollowedProfileIds` is gone. "Follows nobody" empty states (`/following` feed + trending, `/games?scope=following`) call `followsAnyone` (`LIMIT 1`) only when the result is empty. Game detail drops the extra query entirely (zero counts already render nothing).
  - Integration: `src/lib/activity/following-scope.int.test.ts` (feed + trending) and `src/lib/follow/follow-graph.int.test.ts` were run against the old code first, then the new code, with the same expected results. The pages had no unit tests; the empty-state switch is a one-line boolean, covered by `followsAnyone` in integration.

### [ ] 10. Narrow community revalidation

- **Why:** `revalidateCommunity` (`src/app/communities/actions.ts`) invalidates ~10 paths including two layouts on every write.
- **Change:** per-action revalidation map (invite rotate → settings; role change → members + header; ballot save → that edition year; settings → community shell). Drop `"layout"` unless shell data changed.
- **Tests:** unit — assert `revalidatePath` calls per action.
- **Preview check:** each action's visible change still appears without a hard refresh.
- **Deferred (2026-10-07):** no measurable gain today. OpenNext runs with the default no-op incremental/tag cache, and community pages are dynamic (session), so extra `revalidatePath` calls do no server work. In Server Functions any `revalidatePath` already purges the whole client router cache (Next docs: "temporary"), and the current page re-renders once either way. Revisit when an incremental cache (R2) or `"use cache"` is enabled for community data.

### [x] 11. Batch live-aggregate dirty-key refresh

- **Why:** `processDirtyKeys` (`src/lib/live-aggregate/refresh.ts`) does a sequential upsert + delete per dirty game and per dirty category.
- **Change:** one `INSERT … SELECT … ON CONFLICT` for all dirty ids (capped batch per tick), then one `DELETE`.
- **Tests:** integration — scores identical to the per-row path for a seeded year.
- **As built (2026-10-07):**
  - `refreshGotyBatch` / `refreshCategoryBatch`: one statement per batch (≤ `REFRESH_BATCH_SIZE` = 500 keys, ≤ 20 batches per run) — `DELETE … RETURNING` claims dirty keys, a `LEFT JOIN` aggregate recomputes absolute sums from contrib, positives upsert, zeros are deleted. A 10-game save goes from ~30 sequential round trips to 2.
  - Ordering fix: claiming before computing means a save that re-marks a key mid-refresh leaves a fresh mark (previously the post-compute delete could erase it and leave that score stale). `contribGeneration` is read before processing (saves mark dirty before bumping it), and `scoresGeneration` uses `greatest(...)` so it never moves backwards.
  - `src/lib/live-aggregate/refresh.int.test.ts` ran on the old code first, then the new: small batches, zero-score removal, category votes, list count, generation/version bump, parity with `rebuildYear`, a follow-up refresh, and "already current". The mid-refresh race itself is not reproducible deterministically without a test hook, so it is covered by the ordering, not a test.

### [x] 12. Page locked live categories in SQL

- **Why:** `src/lib/communities/live.ts` loads every frozen category row, then filters to one category in JS.
- **Change:** `WHERE category_id = …` + `LIMIT/OFFSET` (or top-N for the list view).
- **Tests:** unit + integration on a seeded lock.
- **As built (2026-10-07):**
  - Scope note: the lock snapshot only stores each category's top 3 display places (≤ 12 rows per category), so the old load-all was bounded. The single-category page now filters to that category in SQL, counts its games, and pages with `LIMIT/OFFSET`; display ranks come from `rank()` before the limit.
  - **Bug fixed — locking failed on ties:** `community_live_lock_goty` and `community_live_lock_category_rows` key on `place`, but the snapshot wrote the display rank (shared by ties), so any GOTY score tie or category vote tie in the top 3 made the lock (and lazy per-year snapshot) throw a duplicate-key error. The snapshot now stores row position; reads already recompute display ranks from score / votes. Existing snapshots without ties are unchanged (position = rank). The meta row is written last so a failed snapshot is rebuilt on the next read instead of serving a partial board.
  - **Bug fixed — category pager:** community live category pages (locked and unlocked) took page count from the GOTY board and "N games" from the rows on the page. Both now use the category's own game total (unlocked: `count(distinct game_id)` for members, only on the single-category page); page 2 ranks no longer restart at 1.
  - Open decision logged in `docs/decisions.md`: locked category depth (podium vs full list).
  - `src/lib/communities/live-categories.int.test.ts`: tie lock (failed on old code with the duplicate key), category paging locked + unlocked (failed on old code).

### [x] 13. Request waterfalls and cache

- Game detail (`src/app/games/[slug]/page.tsx`) and edition page (`src/app/communities/[slug]/edition/[year]/page.tsx`): `Promise.all` independent reads.
- Use `getRequestProfileByAuthUserId` in `/u/[username]`, `/create`, `/create/goty`, `/create/custom`, list share pages.
- Wrap `getPromotedTgaHref` in `cache()`; narrow the header profile select.
- **Tests:** existing page/lib tests; preview timing comparison.
- **As built (2026-10-07):**
  - Header: session and promoted TGA link load in parallel; profile via the request-cached lookup.
  - Game detail: artworks / screenshots / videos run together, alongside the viewer chain (session → profile → library entry + followed-library count in parallel). Each read keeps its own fallback.
  - Edition page: editions list + edition in parallel, then ballot, site GOTY prefill, award categories and custom categories in parallel.
  - `/u/[username]`, `/create`, `/create/goty`, `/create/custom`, `/u/[username]/[listSlug]`, `/l/[publicId]`: use `getRequestSessionUser` + `getRequestProfileByAuthUserId`, so the header and page share one session lookup and one profile query per request (previously each page did its own `auth.getSession()` and profile query). `/u/[username]` loads follow counts and the viewer's follow state in parallel.
  - Skipped: `cache()` on `getPromotedTgaHref` — only the header calls it, once per request, so request memoization saves nothing. Narrower header profile select — the header and pages share the cached full profile row; a narrower header query would add a second profile query on pages that need the full row.
  - No new tests: behavior is unchanged (same reads and fallbacks, reordered); existing unit + integration suites pass.

### [x] 14. Indexes

- Migration: `pg_trgm` GIN indexes on `profiles.display_name` and `profiles.username`.
- Mirror existing `games` search indexes (from `0000_modern_lockheed.sql`) in `packages/db/src/schema.ts` so drizzle-kit does not drop them.
- **Tests:** `pnpm db:migrate` on branch DB; `EXPLAIN` people search uses the index.
- **As built (2026-10-07):**
  - `0058_search_trgm_indexes.sql`: trigram GIN indexes on `profiles.display_name`, `profiles.username`, and `games.slug`.
  - **Found — catalog search was scanning all games:** catalog search matches `title ILIKE … OR slug ILIKE …`, and only `title` had a trigram index, so Postgres could not use it and scanned the table (~374k rows). With the slug index both sides use a bitmap OR: a less common title went from ~205–440 ms to ~10 ms warm on the personal branch.
  - `schema.ts` now declares every index that existed only in SQL: the `0000` games indexes (title trigram, year, popularity, first release date), `profiles_is_seed_true_idx` (`0047`), and the new ones. Drizzle snapshots stop at `0005`, so later migrations stay hand-written; the schema mirror keeps a future generate from dropping them.
  - The migration builds indexes inside drizzle's migration transaction (no `CONCURRENTLY`), so catalog sync writes to `games` wait for the slug index build (seconds); reads are unaffected.
  - People search still seq-scans on the current ~280 profiles (cheaper than the index); the planner switches as profiles grow.
  - `src/lib/people/search-indexes.int.test.ts` (failed on the old schema): indexes exist, and with seq scans disabled the people-search and catalog-search predicates are served by both trigram indexes.

### [x] 15. Cleanup and long-tail scale

- [x] Edition freeze (`src/lib/communities/edition-results.ts`) and `rebuildYear`: move to `INSERT … SELECT` / batched reads instead of loading everything into memory.
  - **As built (2026-10-07):** `src/lib/communities/edition-freeze-sql.ts` computes tallies, board order (`row_number()` with the same tie-breaks), cover URLs, and voter rows in Postgres, and writes each operation as one `db.batch` transaction (one Neon HTTP request). Freeze: ~9 queries + one sequential insert per 100–200 rows → 2 requests. Hosts rebuild, the community-award backfill (now one statement on each results view instead of up to four), and `rebuildYear` are each one transaction too.
  - **Bug fixed — partial freezes could publish:** the old freeze wrote the meta row first, then result rows in chunks. If the Worker was cut off mid-write (freeze usually runs in `after()`, ~30 s budget), meta existed with partial rows, and every later ensure treated it as done. Hosts rebuild could likewise leave an empty Hosts board, and `rebuildYear` emptied live standings while it ran. Now readers see the previous state until commit.
  - A failed full rebuild now keeps the previous snapshot (previously it had cleared everything first). Concurrent first freezes: the loser's transaction fails on the unique keys and returns the winner's meta.
  - Tests: `src/lib/communities/edition-freeze.int.test.ts` (ran on the old code first) — exact rows for both boards with every tie-break, enabled categories only, entry + game community awards, covers, voters, meta; no-op re-ensure; award backfill; Hosts-only rebuild; full rebuild; concurrent first freezes; and a failing write rolls back completely. `refresh.int.test.ts` adds a full rebuild over stale scores and dirty marks.
- [x] Host promote voice checks (`community-hosts.ts`): one grouped count.
  - **As built (2026-10-08):** `addVoiceToEditions` is one `INSERT … SELECT` that adds the voice only to editions still under `COMMUNITY_HOSTS_MAX`, instead of one count query per edition then an insert. The cap check and insert now happen in the same statement.
- [x] ~~Community overview editions: capped SQL instead of load-all-then-slice.~~ Not needed: a community has at most one edition per year (unique index on community + year), so the list grows by one row a year.
- [x] Delete dead unbounded helpers: `listCommunityMemberOptions`, `listOwnedForProfile`.
- [x] Trending (`listTrendingBoard` in `src/lib/activity/query.ts`) loads every matching (game, person) row in the window and scores + pages in worker memory. Move scoring into SQL (or a periodically refreshed score table) so a page reads only its 48 rows.
  - **As built (2026-10-08):** one statement per board — `DISTINCT ON (game, person)` keeps each person's latest counting event (same ordering as before: newest, then event id), recency × kind weights are SQL `CASE`s built from the same parsed settings, and the board sorts by score, headcount, game id. The page is clamped and sliced in SQL; the Worker gets ≤ 48 rows plus total and headcount. Same visibility filters and follow / community scopes.
  - Caveat: weights that aren't exact in binary (e.g. 0.3) can sum in a different order than the old JS loop, so two near-equal scores may swap. Default weights are exact.
  - Follow-up (not built): the site board still aggregates the window on every home / games view. If that gets hot, precompute it on the cron into a score table.
  - `src/lib/activity/trending-board.int.test.ts` (ran on the old code first): exact order with every tie-break, latest-event-only, zero-weight kinds, adult / private-entry / private-person / hidden-list / out-of-window exclusions, the 24h window, the headcount floor, and paging with clamp.
- [x] Worker typecheck: `tsc --noEmit` in `workers/igdb-webhooks` fails on missing Workers globals (`KVNamespace`, `fetch`, `console`, …) — the generated types aren't picked up, so the worker is only checked by wrangler's bundler. Wire `worker-configuration.d.ts` / `@cloudflare/workers-types` and add it to CI.
  - **As built (2026-10-08):** `worker-configuration.d.ts` was a hand-written ~30-line stub; it's now the real `wrangler types` output (production env, plain `string` vars, Workers runtime for the compatibility date). Secrets live in `secrets.d.ts`; `@types/node` covers `process.env` (Node compat). Went from 61 errors to 0 with no source changes — no real bugs were hiding.
  - CI `quality` job runs `pnpm typecheck:igdb-webhooks`: `wrangler types --check` (fails if the generated file is stale vs `wrangler.jsonc`) then `tsc`. Verified both fail when they should (planted type errors; a renamed var). `.gitattributes` keeps the generated file LF, since the check compares bytes and a CRLF checkout reads as stale. The generated file is excluded from ESLint.
- [x] Small-print fixes: join/ban race in `joinCommunityAsMember` (transaction).
  - **As built (2026-10-08):** join and ban each run as one `db.batch` transaction that first takes the same per-(community, person) advisory lock (`membership-lock.ts`). Join inserts only if no ban exists (`ON CONFLICT DO NOTHING`); ban inserts the ban and removes the membership together.
  - **Bugs fixed:** a join that checked for a ban just before a concurrent ban landed could re-add the person, leaving them banned *and* a member. Separately, two simultaneous joins (double click) made the second fail with "Could not join that community"; it now succeeds.
  - `src/lib/communities/membership.int.test.ts` failed on the old code (race reproduced in one run, the double join in the others) and passes 3/3 on the new code: double join, banned join refused, join loops racing a ban, Host promote respecting a full edition.
- ~~Flaky unit test: `src/components/home/HomePitch.test.tsx`~~ — failed CI twice on 2026-10-07 ("window is not defined" after jsdom teardown); fixed early by adding `afterEach(cleanup)` like the other component tests. Reopen if it recurs.
- **Tests:** integration for freeze output parity.

## Close-out

Closed 2026-10-08, after three days on `develop`; each step was checked on staging. Steps 1–9 and 11–15 shipped. Step 10 is deferred (below).

### Bugs found beyond the audit

The audit listed security, privacy and performance work. Writing integration tests against the old code first turned up real bugs too:

- **Live lock failed on ties** (step 12): any tied score or vote in a category's top 3 made locking throw a duplicate-key error.
- **Community live category pager** (step 12): page count and "N games" came from the wrong board, and page 2 ranks restarted at 1.
- **Catalog search scanned every game** (step 14): `title OR slug` matching couldn't use the title index, so each search scanned ~374k rows. With the slug index added it takes ~10 ms instead of ~200–440 ms.
- **Partial edition freezes could publish** (step 15): a Worker cut off mid-freeze left a "frozen" edition with incomplete results that never repaired itself.
- **Live score refresh could drop a fresh save** (step 11): a save landing mid-refresh could have its dirty mark erased, leaving that score stale.
- **Banned people could stay members** (step 15): a join racing a ban could re-add the person. Separately, a double-clicked Join failed the second request.

### Foundations added

- Integration tests against a throwaway Neon branch per CI run (step 8), guarded so they can't run on staging or production.
- Signed-in staging checks that run after every staging deploy with QA accounts that set themselves up (step 2b).
- Worker typecheck in CI (step 15).

### Left open

- **Step 10 — narrow community revalidation:** deferred until an incremental cache or `"use cache"` covers community data; today the extra revalidations cost nothing.
- **Optional:** rotate `IGDB_WEBHOOK_SECRET` and re-register slots (step 5). Registration responses sent it to the admin browser before the fix.
- **Optional:** precompute the site trending board on the cron if home / games traffic makes it hot (step 15).
- **Open decision:** locked category depth, podium vs full list (`docs/decisions.md`, from step 12).
- **Not doing:** source-allowlist CSP and `Permissions-Policy` (step 6). A nonce-based CSP would be its own project.
