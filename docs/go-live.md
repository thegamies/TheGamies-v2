# Go-live remaining work

Snapshot: **22 August 2026**, from the product lock, decision log, and current code. This is a punch list, not a new product decision. Do not invent answers to open items in [decisions.md](./decisions.md) while closing these.

**How to read it**

| Bucket | Meaning |
|---|---|
| **Must** | Production would be broken, unsafe, or embarrassing without this |
| **Should** | You will regret skipping this in the first public week |
| **Later** | Real gaps, but not required to turn the site on |
| **Out of v1** | Locked out — do not pull these into a launch branch |

The consumer product is largely built. The remaining risk is **production wiring**, **public chrome**, and a few **v1 feature holes**.

---

## Already shipped (do not relitigate)

These v1 loops exist in the app today:

- Games browse (title / year / sort / release status) and game detail (cover, summary, dates, platforms, genres, companies, time-to-beat, site GOTY rank, category #1s, videos / artwork / screenshots)
- GOTY + custom lists, anonymous build, sign-in to save/share, editorial list view, image export
- Profiles, account settings, username cooldown, password change / forgot, account deletion (tombstone)
- Site live GOTY + categories, public floor, reveal gate, admin refresh/rebuild
- Private communities, invites, live rankings (on/off, reveal date, lock), events/editions (ballot → freeze → Reveal / Results / Comparison / Voters)
- Auth emails via Cloudflare Worker, cookie banner + optional GA4, Terms / Privacy / Guidelines / About / Contact
- Cloudflare **staging + PR previews**, IGDB CLI + `/admin/sync`, queued IGDB webhooks Worker (code + staging/production envs designed)

Explicitly **out of v1** (leave them out): library/played status, native app, messaging, Remotion/video export, GraphQL, recalculating frozen edition results, Postgres RLS until Auth JWT → DB role is decided.

---

## Must before the site goes live

Production deploy is not a copy of staging. Closing these is the launch itself.

### 1. Production pipeline parity

`.github/workflows/production.yml` deploys Cloudflare (`pnpm deploy:cf` + production `secret bulk`). Compared with [staging.yml](../.github/workflows/staging.yml) it does **not**:

- Run `pnpm db:migrate` against a production Neon URL
- Point Neon Auth email webhooks at the production Worker
- Inject `NEON_API_KEY` / `NEON_PROJECT_ID` onto the app (account close)

**Shipped:** production Cloudflare `secret bulk` uses `PRODUCTION_DATABASE_URL`, `PRODUCTION_NEON_AUTH_BASE_URL`, `PRODUCTION_CF_APP_URL`, `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL`, `PRODUCTION_R2_AVATAR_BUCKET`, `PRODUCTION_AVATAR_PUBLIC_BASE_URL`, and shared keys (`CRON_SECRET`, R2 account/keys, IGDB client, `ADMIN_SYNC_SECRET`). It never reads `STAGING_*` or the staging upload bucket.

### 2. Canonical public origin

Decide the live hostname (`thegamies.gg`) on Cloudflare. Then:

- DNS + TLS
- Neon Auth **trusted domains** for that origin (and www if used)
- `NEXT_PUBLIC_APP_URL` on the production Worker
- Redirect `workers.dev` so cookies, Auth, and share links do not split

Email and OG URLs will be wrong until this is one origin.

### 3. Production Neon + Auth mail

- Production Neon branch, backups, and `DATABASE_URL` only on production
- Neon Auth on that branch: application name **The Gamies**, sign-up, verification **link** (not leftover OTP), password reset to `/auth/reset-password`
- Webhook `send.magic_link` / `send.otp` → production Worker `/api/webhooks/neon-auth-email` (once; do not leave it on staging)
- Cloudflare **Email Sending** for `noreply@thegamies.gg` (SPF / DKIM / DMARC)
- Inbound routing for `hello@`, `privacy@`, `support@` — those addresses are already in the UI

Without this, sign-up confirmation and password reset fail in production.

### 4. Catalog on production

Empty browse is a launch-killer.

- Backfill + enrich the production catalog (CLI; admin HTTP will time out on large enrich)
- Deploy **production** IGDB webhooks Worker + queue + KV (CI deploys code when webhook paths change; first-time Queue/KV + `PRODUCTION_DATABASE_URL` bulk still need to exist); set `PRODUCTION_IGDB_WEBHOOKS_WORKER_URL` on GitHub so the production app Worker gets it; register slots from `/admin/webhooks` on production only
- Confirm covers resolve (host `AVATAR_PUBLIC_BASE_URL` from `PRODUCTION_AVATAR_PUBLIC_BASE_URL` is avatars; game art is IGDB CDN)
- Use separate upload buckets: staging `STAGING_R2_AVATAR_BUCKET` + `STAGING_AVATAR_PUBLIC_BASE_URL`; production `PRODUCTION_R2_AVATAR_BUCKET` + `PRODUCTION_AVATAR_PUBLIC_BASE_URL`

### 5. Edition freeze cron

**Shipped:** Cloudflare Cron Trigger on the OpenNext Worker POSTs `/api/cron/edition-freeze` via `WORKER_SELF_REFERENCE`. Staging CI injects `CRON_SECRET` onto `thegamies-v2-develop`. Production CI bulk-uploads `CRON_SECRET` onto `thegamies-v2` with the rest of the production app secrets.

Still confirm `CRON_SECRET` exists in GitHub. Without it, Cloudflare’s handler no-ops and events can sit on “calculating” until a schedule write (`after()` kick) or a manual hit.

### 6. Hide ops from the public product

**Shipped:** `/admin` is gated on `profiles.is_site_admin`. Admin is off consumer chrome except for site operators. Guessable `/admin` URLs 404 for everyone else. First operator claims with the admin code (never the env var name). Promote others under Admin → Site operators.

Still open:

- `/design-system` is hidden from nav on lasting staging/production; the URL still works and has no `robots: noindex`
- Keep seed tools off the consumer path (or extra-confirm / disable when the app is production)

### 7. Share + crawl basics

Shipped on Cloudflare:

- `robots.txt` / paged `sitemap.xml` (top 100 popular games per year, public GOTY boards, public community homes; no people)
- `metadataBase` from `NEXT_PUBLIC_APP_URL`
- Open Graph / Twitter metadata, a static default card (`/og.png`), and generated cards at `/api/og` (game, list, profile, GOTY year, public community)
- Editorial `not-found` / `error` pages
- `noindex` on create, auth, design-system, dev, private profiles, and members-only community interiors

Confirm `NEXT_PUBLIC_APP_URL` is the public Cloudflare origin so canonical and `og:image` URLs resolve.

### 8. Staging secrets that production will also need

Confirm these exist on **production** (and staging, where still missing):

| Secret | Why |
|---|---|
| `CRON_SECRET` | Freeze cron |
| `IGDB_WEBHOOKS_WORKER_URL` + `IGDB_WEBHOOK_SECRET` | Catalog freshness |
| `NEON_API_KEY` + `NEON_PROJECT_ID` on the **app** | Account deletion can reuse email |
| `R2_*` account/keys + `STAGING_R2_AVATAR_BUCKET` / `STAGING_AVATAR_PUBLIC_BASE_URL` | Staging / preview uploads |
| `PRODUCTION_R2_AVATAR_BUCKET` + `PRODUCTION_AVATAR_PUBLIC_BASE_URL` | Production uploads (separate bucket) |
| `AUTH_EMAIL_FROM` | From-address if not the default |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Only if you want analytics on day one |
| `ADMIN_SYNC_SECRET` | Ops; rotate if it ever leaked in a screenshot |

---

## Should before live (first-week quality)

### Product holes vs the v1 lock

| Item | Status | Launch note |
|---|---|---|
| **Site live lock** (pause updates for suspense) | Product **in**; [live-aggregate.md](./features/live-aggregate.md) lists it as a **non-goal** | Reveal already hides scores. If launch GOTY needs a frozen public board, this is unfinished. If ranks may move until you reveal scores, you can ship without it. |
| **Games browse pagination + filters** | Page loads **48** games; `offset` exists in `browseGames` but the UI has no next page. No platform / genre filter (parity intent with the prior app) | Browse feels unfinished and hides most of the catalog. |
| **Combined / Host weight** | Deferred; UI is Community · Hosts only | Fine for launch if you are not promising a Combined board. |
| **Per-community award defs** | Site single-choice only | Fine; hosts pick a subset of site awards. |
| **Community live tie numbering** | Competition only | Fine unless a host needs dense. |

### Safety and abuse

- No app-level rate limit or Turnstile on sign-up, list save, or search. Neon Auth may throttle some Auth routes; ranking spam is still “create accounts.” Terms already forbid it; there is **no in-product report / ballot invalidate** (open decision). Minimum: working support inbox + a host-side way to pull a bad ballot (even if that is ops/rebuild, document it).
- App-layer session checks only (RLS deferred). Acceptable for v1 if those checks stay on every write. Do not treat RLS as a launch blocker.
- Seed voters on a production database would pollute public GOTY. Disable or hard-gate `/admin/seed` in production.

### Observability

- No Sentry / similar. Bookmark Worker logs, plus Neon + Email Sending delivery.
- No `CHANGELOG.md` / `v0.x` tag yet ([engineering.md](./engineering.md) asked for this at milestones).

### Tests the engineering bar still wants

Unit coverage is broad. Still missing relative to [engineering.md](./engineering.md):

- Playwright **visual** for ballot + results (desktop and mobile)
- **Integration** tests against a Neon branch (called out as a follow-up)
- `e2e/` is essentially the nav-guard spec

Launch can proceed on staging QA, but ceremony pages are the brand. A pass on real fixtures (ties, many Hosts, empty ballot, just-published) matters more than new features.

### Legal / trust

Terms and Privacy exist (13+, cookies, public lists). Before a public URL:

- Confirm the copy with whoever owns legal (especially US 13+ / COPPA posture and cookie banner)
- Mailboxes actually receive mail
- Cookie banner + GA id: unset id → no gtag (good); banner still shows (intentional)

### Hosting plans

- Cloudflare **Workers paid** is assumed for size limits **and** Email Sending. Production catalog sync should be CLI for large runs (Worker request duration caps apply).

---

## Later (real, not launch-blocking)

- Degrading score curve beyond top 10 (open decision; default top 10 is locked)
- Edition category modes: multi / ranked / custom defs (open)
- Approval join, bans, extra roles (open)
- Full all-member ballot matrix virtualization (Hosts-only comparison is shipped)
- Live-ops catalog flag for “current/active” eligibility (prior-year released titles currently count)
- R2 incremental cache (`NEXT_INC_CACHE_R2_BUCKET`)
- `<Suspense>` streaming of heavy page sections
- Expo / native
- Postgres RLS after Auth JWT → DB role is defined
- Video Game Awards Pick’em (site + community; admin slate and show room)

---

## Cleanup (small, do on the way to `main`)

- Default favicon / apple-touch if the current `.ico` is a placeholder
- README “Current status” still reads like a scaffold; retitle when production exists
- `docs/setup-checklist.md` is still an unchecked wiring list — treat it as the **ops** companion to this doc
- Preview check of Auth, list save, community ballot, freeze, and email on **staging** before promote

---

## Suggested order

1. **Production workflow** — migrate, Auth webhook, production secrets  
2. **Domain + Auth + mail** — one origin, trusted domains, sending + inboxes  
3. **Catalog** — backfill production, webhooks Worker live  
4. Confirm `CRON_SECRET` is in GitHub so freeze Cron authorizes on the Worker  
5. **Chrome cleanup** — design-system `noindex` / production 404; seed off production. Site operators are shipped.  
6. **Share/SEO** — sitemap, robots, OG, error pages  
7. **Games browse** — pagination (and filters if you want catalog parity)  
8. **Staging ceremony QA** — ballot, close, freeze, reveal, comparison, account delete  
9. **Promote `develop` → `main`** when the checklist above is green  

Skip Combined scoring, RLS, richer category modes, and the degrading curve until those decisions are closed.

---

## Open decisions (do not fill in during launch work)

From [decisions.md](./decisions.md):

- Exact degrading score curve beyond top 10  
- Edition / community category voting beyond site single-choice  
- Approval membership and extra eligibility  
- Moderation and ballot invalidation workflow  
- Auth JWT → Postgres role for RLS  

Launch implication: ship invite-only, top-10 scoring, Community · Hosts, and email-the-hosts / support for abuse. Do not build Combined weight or RLS in the launch PR.
