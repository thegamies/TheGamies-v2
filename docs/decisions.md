# Decision log

Record product and architecture decisions here. Do not invent answers to open items while implementing.

## Locked

| Date | Decision | Choice |
|---|---|---|
| 2026-08-09 | New repository | `thegamies/thegamies-v2` (same GitHub org); old repo is archive/reference |
| 2026-08-09 | Hosting | Dual-host: Vercel + Cloudflare Workers (OpenNext) |
| 2026-08-10 | Staging on develop | Push to `develop` deploys lasting staging: Vercel + Cloudflare Worker `thegamies-v2-develop` |
| 2026-08-10 | Secrets management | **Doppler** for local (`dev` / `dev_personal`). **GitHub Actions secrets** for deploy — manually imported; CI pushes them to Vercel/Cloudflare on staging & preview deploys (no Doppler service token / Teams) |
| 2026-08-09 | Database + Auth | Neon Postgres + Neon Auth (branching for previews) |
| 2026-08-09 | Application | Next.js App Router + TypeScript |
| 2026-08-09 | Styling | Tailwind CSS + project-owned design tokens |
| 2026-08-09 | Visual direction | Editorial Standings + editorial minimalism + soft brutalism |
| 2026-08-09 | Library / played status | Out of v1 |
| 2026-08-10 | Engineering operating system | `docs/engineering.md` |
| 2026-08-10 | Integration branch | Day-to-day work targets `develop`; `main` production via promote PRs |
| 2026-08-10 | Fonts | Display: Bebas Neue; body: Archivo; deck/serif: Source Serif 4 |
| 2026-08-10 | Design gallery | Internal `/design-system` route |
| 2026-08-10 | Editions vs live rankings | **Separate systems.** Editions = ballots, hidden until close, frozen forever. Live = continuous from signed-in lists, optional lock, community on/off |
| 2026-08-10 | Voices in v1 | **Yes** on editions (Combined / Community / Voices); show current users/voters |
| 2026-08-10 | Anonymous lists | Allowed; soft prompt to sign in to save; **don’t prompt again** option |
| 2026-08-10 | GOTY list length / scoring | Lists hold up to **100**; **default score top 10**; engine must allow expanding to full list with degrading scores later |
| 2026-08-10 | Live aggregate eligibility | **Signed-in lists only** (site + community live) |
| 2026-08-10 | Categories | **Both** site-wide and per-community |
| 2026-08-10 | Live lock authority | Community live → community admin; site live → site admin |
| 2026-08-10 | v1 product surface | Catalog browse/detail, GOTY+custom lists, anon create + editorial list view, user pages, site live aggregate, communities with live toggle + editions |
| 2026-08-10 | Catalog ORM | **Drizzle** + Neon serverless |
| 2026-08-10 | IGDB sync model | Core-first games + junction links by igdb id; enrich missing lookups only; no entity stubs; covers/themes/keywords/game_types included |
| 2026-08-10 | IGDB ops | Node CLI + `/admin/sync` (ADMIN_SYNC_SECRET); webhooks deferred |
| 2026-08-10 | Local DB | Doppler `dev` + `dev_personal`; lasting personal Neon branch recommended |
| 2026-08-10 | Feature testing | **Every feature ships with tests in the same PR** (risk chooses unit vs integration vs visual; “no tests” is not the default) |
| 2026-08-11 | Profile access control | **App-layer** session checks (`auth.getSession`) + ownership on profile writes. **Postgres RLS deferred** until Auth JWT → DB role is defined — do not invent policies yet |
| 2026-08-11 | List drafts / Save / Share | **No list status column.** Signed-in create attaches owned list (slug + profile) immediately. Anon: draft cookie until Share → `/l/[publicId]`; claim → `/u/[username]/[slug]`. Owned `/l/[publicId]` redirects to slug URL. **Save** signed-in only. Notes require sign-in. |
| 2026-08-11 | Site live aggregate | **`live_goty_contrib` / `live_category_contrib` = scoring truth**; **`live_*_scores` = disposable cache**. Save replaces contrib + marks dirty keys; **async/lazy locked absolute SUM refresh** (saves do not contend on score rows). **`standingsVersion` bumps only after refresh succeeds**. Reveal gate: ranks public, scores/votes hidden until admin reveals. Site live categories: **single-choice** on owned GOTY; plurality. Community later = `SUM(contrib)` for members (no save fan-out). |
| 2026-08-11 | Community create + join | **Any signed-in user with a profile** can create a community (creator = internal admin). **Open join/leave** for signed-in profiles. Last admin cannot leave. Invite-only membership deferred. |
| 2026-08-12 | Community live reveal | One community date: **`live_scores_visible_from`** (null = scores hidden for **all** live years). Hosts set date / reveal now / hide under Settings. |
| 2026-08-12 | Community live lock | Hosts lock/unlock under Settings. Lock freezes the public board via **`community_live_lock_snapshots`** (current year eager; other years lazy). Unlock discards snapshots and resumes live `SUM(contrib)`. |
| 2026-08-12 | Community edition schedule | **`community_editions`** with `opensAt` / `closesAt` / `publishesAt`. Status **computed** (draft → scheduled → open → closed → published). No stored status enum. |
| 2026-08-12 | Edition ballot eligibility | **Open community members** (signed-in profile + `community_members` row, including hosts). Invite-only / approval gates deferred. |
| 2026-08-12 | Edition ballot edit window | **Editable while status is `open`** (until `closesAt`). No separate “submitted forever” freeze before close. Read-only after close/publish. |
| 2026-08-12 | Edition ballot categories (v1 slice) | **Site `award_categories` single-choice only** on the edition ballot. Per-community defs / multi / ranked modes deferred. |

## Open (block dependent work until decided)

- Exact scoring formula for Combined (Community + Voice weight / %)
- Exact degrading score curve when scoring expands beyond top 10
- Edition / community category voting modes beyond site single-choice
- Invite-only / approval membership and any eligibility beyond open members
- Tie-breaking rules (editions + live)
- Moderation and ballot invalidation workflow
- Object storage for avatars / OG images (e.g. Vercel Blob, R2, S3)
- Auth JWT → Postgres role pattern for **RLS** (until then: app-layer session/ownership only)
