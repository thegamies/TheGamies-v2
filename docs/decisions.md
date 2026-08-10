# Decision log

Record product and architecture decisions here. Do not invent answers to open items while implementing.

## Locked

| Date | Decision | Choice |
|---|---|---|
| 2026-08-09 | New repository | `thegamies/thegamies-v2` (same GitHub org); old repo is archive/reference |
| 2026-08-09 | Hosting | Vercel (Cloudflare/OpenNext later only if needed; keep app logic portable) |
| 2026-08-10 | Staging on develop | Push to `develop` deploys lasting staging: Vercel + Cloudflare Worker `thegamies-v2-develop` |
| 2026-08-10 | Secrets management | **Doppler** as source of truth; use default `dev` + `dev_personal`, `stg`, `prd` (personal configs on Development only); deploy tokens in GitHub Actions |
| 2026-08-09 | Database + Auth | Neon Postgres + Neon Auth (branching for previews) |
| 2026-08-09 | Application | Next.js App Router + TypeScript |
| 2026-08-09 | Styling | Tailwind CSS + project-owned design tokens |
| 2026-08-09 | Visual direction | Editorial Standings + editorial minimalism + soft brutalism |
| 2026-08-09 | v1 center | Community Official Vote (traffic driver) |
| 2026-08-09 | Library / played status | Out of v1 |
| 2026-08-09 | Always-live aggregate mode | Later; design Official Vote states first |
| 2026-08-09 | Initial implementation order | Docs → scaffold/deploy → static results design proof → ballot UI → schema/auth → IGDB worker |
| 2026-08-10 | Engineering operating system | `docs/engineering.md`: PR-required flow, preview/prod envs, risk-based unit/integration/visual tests, squash merges, `pnpm` + Node LTS defaults |
| 2026-08-10 | Integration branch | Day-to-day work targets `develop`; `main` remains production-only via promote PRs |
| 2026-08-10 | Fonts | Display: Bebas Neue; body: Archivo; deck/serif: Source Serif 4 |
| 2026-08-10 | Design gallery | Internal `/design-system` route for approved primitives and skeletons |

## Open (block dependent work until decided)

- Exact scoring formula for Combined (Community + Voice)
- Whether Voices equal the whole Community aggregate or a configured percentage
- Category voting modes in first release (single / multi / ranked)
- Community membership and ballot eligibility rules
- Whether submitted ballots can be edited before the deadline
- Tie-breaking rules
- Result publication timing
- Moderation and ballot invalidation workflow
- Initial user/profile scope for the restart
- Object storage for avatars / OG images (e.g. Vercel Blob, R2, S3)
