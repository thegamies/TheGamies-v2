# Decision log

Record product and architecture decisions here. Do not invent answers to open items while implementing.

## Locked

| Date | Decision | Choice |
|---|---|---|
| 2026-08-09 | New repository | `thegamies/thegamies-v2` (same GitHub org); old repo is archive/reference |
| 2026-08-09 | Hosting | Dual-host: Vercel + Cloudflare Workers (OpenNext) |
| 2026-08-10 | Staging on develop | Push to `develop` deploys lasting staging: Vercel + Cloudflare Worker `thegamies-v2-develop` |
| 2026-08-10 | Secrets management | **Doppler** as source of truth; `dev` + `dev_personal`, `stg`, `prd`, `preview`; deploy tokens in GitHub Actions |
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

## Open (block dependent work until decided)

- Exact scoring formula for Combined (Community + Voice weight / %)
- Exact degrading score curve when scoring expands beyond top 10
- Category voting modes in first release (single / multi / ranked) per category type
- Community membership and edition ballot eligibility rules
- Whether submitted edition ballots can be edited before the deadline
- Tie-breaking rules (editions + live)
- Edition result publication timing (manual publish vs auto on close)
- Moderation and ballot invalidation workflow
- Object storage for avatars / OG images (e.g. Vercel Blob, R2, S3)
- Claim flow details when an anonymous list author signs in
