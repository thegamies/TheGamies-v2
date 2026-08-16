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
| 2026-08-11 | List drafts / Save / Share | **No list status column.** Signed-in create attaches owned list (slug + profile) immediately. **Save** and **Share with a link** require sign-in. Anon: draft cookie + **Share as image** (no DB). Editor does not create new `/l/` rows. Legacy `/l/[publicId]` claim → `/u/[username]/[slug]`. Owned `/l/[publicId]` redirects to slug URL. Notes require sign-in. Post-auth `intent=save|share` restores the draft and completes save or publish. |
| 2026-08-15 | List editor Share menu | Toolbar: **Save** + **Share** only. Export is not top-level — image lives under Share. Share menu: **Share as image** (everyone) · **Share with a link** (sign-in). |
| 2026-08-15 | Auth return path | After sign-in **or** sign-up, redirect to safe relative `next` when provided; else `/account`. Header/mobile Sign in sets `next` to the current page. Sign in ↔ Create account preserve `next` and list `intent`. |
| 2026-08-16 | List editor chrome | Title above GOTY/Categories tabs. Categories visible signed-out with sign-in CTA (picks signed-in only). Format/Size hidden on Categories; Categories Share is link-only. Settings: rank style only (no list type/year). Formats: Poster · List · **Grid**. Notes max 500 + enlarge. Signed-in floating `PinnedSaveBar` when dirty. |
| 2026-08-16 | List card interaction | Poster/Grid: hold (~280ms) to drag (scroll locked during hold so the page does not cancel the gesture); tap opens an **external Remove popover** that points at the card (not an on-card control); tap elsewhere dismisses. Stronger touch-callout / select / image-drag locks. **List:** text **Remove** beside the title (no cover ✕); hold-to-reorder. |
| 2026-08-11 | Site live aggregate | **`live_goty_contrib` / `live_category_contrib` = scoring truth**; **`live_*_scores` = disposable cache**. Save replaces contrib + marks dirty keys; **async/lazy locked absolute SUM refresh** (saves do not contend on score rows). **`standingsVersion` bumps only after refresh succeeds**. Reveal gate: ranks public, scores/votes hidden until admin reveals. Site live categories: **single-choice** on owned GOTY; plurality. Community later = `SUM(contrib)` for members (no save fan-out). |
| 2026-08-11 | Community create + join | **Any signed-in user with a profile** can create a community (creator = internal admin). **Open join/leave** for signed-in profiles. Last admin cannot leave. Invite-only membership deferred. |
| 2026-08-12 | Community live reveal | One community date: **`live_scores_visible_from`** (null = scores hidden for **all** live years). Hosts set date / reveal now / hide under Settings. |
| 2026-08-12 | Community live lock | Hosts lock/unlock under Settings. Lock freezes the public board into **normalized** `community_live_lock_*` tables (SQL-paginated reads). Unlock discards rows and resumes live `SUM(contrib)`. No fat JSONB on the hot path. |
| 2026-08-12 | Request cost (reads) | Hot paths must consider **DB egress + compute + scale**. Prefer normalized freeze rows + SQL pagination; avoid fat JSONB blobs that force full read/parse per page. See `docs/engineering.md` / `.cursor/rules/request-cost.mdc`. |
| 2026-08-12 | Community edition schedule | **`community_editions`** with `opensAt` / `closesAt` / `publishesAt`. Status **computed** (draft → scheduled → open → closed → published). No stored status enum. |
| 2026-08-12 | Edition ballot eligibility | **Open community members** (signed-in profile + `community_members` row, including hosts). Invite-only / approval gates deferred. |
| 2026-08-12 | Edition ballot edit window | **Editable while status is `open`** (until `closesAt`). No separate “submitted forever” freeze before close. Read-only after close/publish. |
| 2026-08-12 | Edition ballot categories (v1 slice) | **Site `award_categories` single-choice only** on the edition ballot. Per-community defs / multi / ranked modes deferred. |
| 2026-08-12 | Edition Voices | **Per-edition** host designation among community members (`community_edition_voices`). Year history retained; roster immutable after publish. |
| 2026-08-12 | Edition Combined scoring | **Deferred from public UI** until Voice weight exists. Results show **Community · Hosts** only. Combined ≡ Community under simple union is not shown as a third tab. |
| 2026-08-12 | Edition results freeze | Write-once when first published. **Rebuild** if edition leaves published then publishes again, or via ops rebuild. Never silent overwrite while staying published. |
| 2026-08-12 | Shared ranks | **Do not store display ranks.** Equal GOTY points / category votes / live scores share a displayed rank derived at read. Secondary keys (#1s, appearances, `gameId`) **sort only**. Unique freeze / lock `place` stays board order + pagination cursor. |
| 2026-08-14 | Edition rank mode | **Host setting** on the event (`community_editions.rank_mode`), default **competition** (1–1–3). **Dense** (1–1–2) is the other option. Hosts may change it anytime — displayed rank is derived at read, not stored. Not a public `?rank=` chooser. GOTY Comparison follows that setting (no Board / span picker). |
| 2026-08-15 | Site live rank mode | **Admin setting** on `/admin/rankings` (`site_settings.rank_mode`), default **competition**. Dense is the other option. Applies to site GOTY + category live boards and homepage/all-years Top 5. Not a public chooser. Community live stays competition only for now. |
| 2026-08-14 | Community public labels | **Events** (not Edition) and **Live Rankings** (not Live) in public UI. URLs and code keep `/edition` and `/live`. Overview: Events block + About; members on `/members` (SQL-paginated). |
| 2026-08-14 | Voice public name | Public UI uses **Host** / **Hosts**. Code, URLs, and tables stay Voice (`?mode=voices`, `community_edition_voices`). |
| 2026-08-14 | Event create requires schedule | Hosts create an event with **year + opens/closes/publishes** in one dialog. No draft create. Status is still **computed** from timestamps; incomplete timestamps remain `draft` only for legacy rows. |
| 2026-08-14 | Award category catalog | Site `award_categories` expanded (sort 2–64) with **groups** and **eligibility**. Ballot/GOTY UI is a searchable award **grid**, not every slot at once. Standings load **one group** of category laterals (`?group=`). Current/active ≈ released this year or earlier until a live-ops flag exists. **Upcoming** excludes the list year. Remake/DLC allow editions. |

## Open (block dependent work until decided)

- Exact degrading score curve when scoring expands beyond top 10
- Edition / community category voting modes beyond site single-choice
- Invite-only / approval membership and any eligibility beyond open members
- Moderation and ballot invalidation workflow
- Object storage for avatars / OG images (e.g. Vercel Blob, R2, S3)
- Auth JWT → Postgres role pattern for **RLS** (until then: app-layer session/ownership only)
