# AdSense

Site publisher `ca-pub-9835884276920090`. Implementation notes for ads, indexing, and the publisher-review loop live here — not in the product UI.

## What Google rejected

The 2026 “Low value content” decision is a site-wide quality sample, not a missing `ads.txt` or Privacy page. Those were already in place. Reviewers were sampling a 365k-title IGDB catalog with almost no original desk copy.

A later review still failed with the same label while the Indexed set was mostly legal + GOTY hubs and almost no About/Rankings desk pages. Catalog `noindex` alone did not produce a stronger publication sample.

Do **not** resubmit until Search Console shows the publication surface (below) and a couple of weeks have passed.

## Current indexing and ads

- **Index** `/games/[slug]` and `/games` browse pages (including pagination). Catalog `noindex` was removed so Google can index game URLs again.
- **Sitemap** still lists the valued game set (public GOTY rank, public category #1, or a public owned list), capped — not every IGDB row. Discovery of the rest is via crawl/links.
- **Ads stay off** `/auth`, `/account`, `/privacy`, `/terms`, `/contact`, `/guidelines`, catalog pagination (`/games?page=2+`), and thin game pages (no public site value). Ranked/listed game pages opt back in. The snippet is mounted only on publication routes (home, About, Rankings, standings, lists, profiles, communities, games hub page 1, valued game pages)—not from the root layout. It loads with `next/script` (`afterInteractive`) so React 19 does not skip a raw `<script>` in a layout; the `adsbygoogle.js?client=` URL is unchanged.
- Original pages: `/about` plus feature pages (`/about/lists`, `/about/communities`, `/about/library`, `/about/people`, `/about/pickem`), `/rankings` (method + lists + Events + Pick’em).

Do not “fix” AdSense with AI-spun IGDB blurbs or a generic games blog. That recreates scaled/replicated content. Deepen desk copy on `/rankings` and About feature pages instead.

## Request a review (after a material crawl)

1. In Google Search Console for `thegamies.gg`, confirm:
   - `/`, `/about`, `/about/lists`, `/rankings`, `/game-of-the-year/2025`, `/game-of-the-year/2025/categories` are indexed.
   - A ranked game (for example a 2025 #1) is indexed.
   - Sitemap submitted.
2. Wait **2–4 weeks** after those URLs stabilize. Re-applying the next day is a common way to stay in the rejection loop.
3. In AdSense, request a site review **once**.
4. If it fails again with the same “low value content” label, deepen `/rankings` or About feature pages — do not add AI catalog filler.

Traffic helps as a tie-breaker. It does not replace original pages.
