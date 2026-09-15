# AdSense

Site publisher `ca-pub-9835884276920090`. Implementation notes for ads, indexing, and the publisher-review loop live here — not in the product UI.

## What Google rejected

The 2026 “Low value content” decision is a site-wide quality sample, not a missing `ads.txt` or Privacy page. Those were already in place. Reviewers were sampling a 365k-title IGDB catalog with almost no original desk copy.

Do **not** resubmit until Search Console shows the new surface (below) and a couple of weeks have passed.

## What we changed so the sample is a publication

- **Index** a game page only when it has original site value: public GOTY rank (including inherited parent/version ranks), a public category #1, or appearance on a public owned list. Other `/games/[slug]` URLs are `noindex, follow` so crawlers can still reach lists.
- **Sitemap** lists that valued set (capped), not the top-100-by-IGDB-popularity dump.
- **`/games?page=2+`** is `noindex`. Page 1 stays a hub with a short original intro.
- **Ads stay off** `/auth`, `/account`, `/privacy`, `/terms`, `/contact`, `/guidelines`, catalog pagination, and thin game pages. Ranked/listed game pages opt back in. The snippet is mounted only on publication routes (home, About, Rankings, standings, lists, profiles, communities, games hub page 1, valued game pages)—not from the root layout. It loads with `next/script` (`afterInteractive`) so React 19 does not skip a raw `<script>` in a layout; the `adsbygoogle.js?client=` URL is unchanged.
- Original pages: `/about` plus feature pages (`/about/lists`, `/about/communities`, `/about/library`, `/about/people`, `/about/pickem`), `/rankings` (method + lists + Events + Pick’em).

Do not “fix” this with AI-spun IGDB blurbs or a generic games blog. That recreates scaled/replicated content.

## Request a review (after a material crawl)

1. In Google Search Console for `thegamies.gg`, confirm:
   - `/`, `/about`, `/about/lists`, `/rankings`, `/game-of-the-year/2025`, `/game-of-the-year/2025/categories` are indexed.
   - A ranked game (for example a 2025 #1) is indexed.
   - A random catalog-only title is **not** indexed (or is excluded).
   - Sitemap submitted; Coverage is not flooding with `/games?page=` URLs.
2. Wait **2–4 weeks** after those URLs stabilize. Re-applying the next day is a common way to stay in the rejection loop.
3. In AdSense, request a site review **once**.
4. If it fails again with the same “low value content” label, deepen `/rankings` or About feature pages — do not add more catalog pages.

Traffic helps as a tie-breaker. It does not replace original pages.
