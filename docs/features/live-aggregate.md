# Live aggregate

Site-wide live Game of the Year standings and category rollups from **owned signed-in GOTY lists**. Separate from edition ballots.

## Layers

```text
list_items                 editor truth
    ↓
live_goty_contrib          scoring truth (≤10 scored rows / owned GOTY list)
live_category_contrib      category pick facts
    ↓  absolute SUM dirty keys (async / lazy, locked)
live_goty_scores           disposable site read cache
live_category_scores
```

Community live boards `SUM(live_goty_contrib)` / `SUM(live_category_contrib)` for current `community_members` — **not** filter `live_goty_scores`, and **not** fan out writes on list save. See [community.md](./community.md).

## Eligibility

- `lists.profileId IS NOT NULL` and `listType = 'goty'`
- Adult games excluded from contrib
- Default scoring: top 10 only (`pointsForRank` → 11 − rank)

## Write path

1. Owned GOTY save / claim / category vote update → replace that list’s contrib rows.
2. Mark durable dirty keys (`live_goty_dirty_games` / `live_category_dirty`) = old ∪ new keys (year-change dirties both years’ keys).
3. Bump `contribGeneration` on `live_goty_year_stats`.
4. **Return** — saves do not wait on score row updates (avoids write contention on popular games).
5. Schedule `tryRefreshYear` (Next `after` when available). Standings reads do **not** lazy-refresh by default (avoids extra Neon round-trips); pass `ensureFresh: true` or use admin refresh/rebuild when needed.

## Standings reads

**One** Neon HTTP round-trip loads the public board (like old `rankings_page_bundle`):

- year stats + GOTY total + paginated scores (joined to games/covers)
- all **active** category tallies in the selected **group** (top 10 each via `LATERAL`). Default group is Premier (`?group=`). Do not load every category on one request.

Ordered by `score DESC, game_id` so `live_goty_scores_year_score_idx` can satisfy the sort.

Displayed **rank is derived at read**, not stored on score rows (dirty-key SUM would invalidate a stored place). Numbering follows the site **tie numbering** setting on `/admin/rankings` (`site_settings.rank_mode`): default **competition** (`1 + COUNT(score > first row on the page)`, then walk the page — same score → same rank; new score → offset + local index + 1) or **dense** (`1 + COUNT(DISTINCT score > first)`, then walk without skips). Pages stay **50 games**. Not a public URL chooser. Category laterals walk the same way. Community live (SUM + lock snapshots) stays competition only for now.

## Refresh (single-flight)

- CAS lock via `refreshing` / `refreshStartedAt` on year stats (stale lock reclaim after 60s).
- Absolute `SUM` from contrib for each dirty key → overwrite or delete score rows.
- When dirty is empty and `contribGeneration > scoresGeneration`: set `scoresGeneration = contribGeneration` and bump **`standingsVersion` only then**.
- `rebuildYear`: delete year’s score caches + dirty rows, insert full `GROUP BY` from contrib, then bump version.

## Reveal gate

- Ranks always public.
- Scores, list mentions, rank histograms, and category vote counts hidden until `detailedStatsRevealed`.
- Site admin: `/admin/rankings` (same unlock as catalog sync).
- Community live: all years gated by `communities.live_scores_visible_from` (null = hidden). Hosts set date under Settings.
- Community live lock: `live_rankings_locked` + `community_live_lock_snapshots` freeze the public board until unlock.

## Categories

- Site defs in `award_categories` (kept in sync from `AWARD_CATEGORY_DEFS` via `ensureAwardCategories`, including on `/admin/seed`; GOTY itself is the main board).
- Groups (Premier, Major, Genre, …) for browsing standings and the ballot picker.
- **Eligibility** per category: current year, current/active, active in year, upcoming, any year. Current/active and active-in-year currently treat prior-year *released* titles as eligible (no live-ops catalog flag yet). **Upcoming** is later years only — not the list year, even if still unreleased. Remake/DLC categories allow edition/version titles.
- Owned GOTY lists and edition ballots: **one game per category**. Voters **add categories from a grouped list** instead of seeing every slot at once. Order follows `sort_order`.
- **Server validation** uses `categoryEligibilityError` for picks (GOTY ranking still uses GOTY rules).
- Plurality tallies in `live_category_scores`.
- Contrib sync only counts eligible picks (stale ineligible votes are ignored for scoring until cleared).

## URLs

- `/` — homepage Top 5 strips for featured years that already meet the public list floor (default: current + previous; admin override on `/admin/rankings`)
- `/standings` — all public years: Game of the Year top 5 plus the five most-voted category **#1s**; year CTA is **Full rankings**
- `/admin/seed` — Top 5 for every year with live scores
- `/game-of-the-year` → current year
- `/game-of-the-year/[year]` — GOTY cover-card grid paginated **50 per page** (`?page=2`); secondary **Game of the Year** · **Categories** (`?view=categories`); category chapters filtered by award group via a single dropdown (`?group=genre`) and searchable by name; categories ordered by most votes. Years below the public list floor show an editorial empty state (not a 404).
- `/games/[slug]` — 240px cover on the left; title, description, site GOTY **rank** per public year (Broadcast compact), **site category #1s**, and credits to the right. Description clamps to four lines with Show more / Show less. Rank is always public. Votes, points, and the list-position chart follow the reveal gate. Query is this game’s score rows plus a higher-score count for place — not the full year board. Editions with no scores inherit the parent title’s standings. Suppressed years are omitted.
- Community Live Rankings use the same board pattern under `/communities/[slug]/live/[year]`
- Year switching uses the shared top-right `YearSelect` (not a button row)
- Admin `/admin/seed` writes GOTY lists **and** category votes (top-rank weighted so leaders separate); community edition seed uses the same category pick weights

- `/admin` — ops index (sync, rankings, seed)
- `/admin/rankings` — reveal / refresh / rebuild + homepage year override + **tie numbering** (competition vs dense) + **minimum lists before GOTY is public** + **minimum category votes before category boards are public**

## Public board floors

GOTY years stay off the homepage, `/standings`, year boards, and game-page ranks until `live_goty_year_stats.list_count` meets `site_settings.public_board_min_lists` (default **5**, admin-editable). Each category board, landing highlight, and game-page category #1 stays hidden until **that award’s** `sum(live_category_scores.vote_count)` meets `site_settings.public_board_min_category_votes` (default **5**, admin-editable, independent of the list floor). A year with many sparse category picks does not unlock awards still under the floor. Public UI does not mention the numbers. Admin rebuild tools are unchanged.

## Homepage / all-years highlights

- Depth is **Top 5** (site tie numbering); ties at the cutoff are included in full. Equal cards use `--standing-fill-card`: min of editorial 5-up at `--page-max` (five fill a wide row with no scroll) and `--standing-fill-min-visible` across the current row. **Temporary** admin control on `/admin/rankings` (`standing_fill_min_visible`, default **3.2**). A decimal peeks the next cover so the row shows it can scroll. Extra ties stay on that row.
- **Top Categories:** up to five most-voted awards in the same fill-row; category names clamp to one line. Every game tied at #1 rotates in the same tie stack as community boards. Category name → that category board; game name → game page. **All categories** opens `?view=categories`.
- Admin may set `site_settings.landing_standings_years`; blank clears to calendar default.

## Non-goals

- Journal / cron drain as primary path
- Site live pause-updates lock
- Multi / ranked category modes

## Ops: standings seed

`/admin/seed` (same unlock as other admin tools) creates synthetic profiles
(`seed:standings:*` auth ids, usernames `seedvoter001`…) plus owned GOTY lists
**and** category votes (from each list’s ranked picks, top-rank weighted).

- Upserts the award catalog (`ensureAwardCategories`) before writing votes; errors if no active categories remain
- Up to **1000** seed indices; UI batches of 50
- **Reseed on** → Seed N rewrites voters `1…N`
- **Reseed off** → Seed N appends N new voters after the current max index (does not re-target `1…N` and skip)
- **Keep adding until stopped** also continues from max index
- Game picks from a large year pool with **rating bias** (−100…100): positive favors highly rated, negative favors lower-rated, 0 is uniform
- Category picks reuse the same GOTY shortlist with **top-rank weight** (shared with community edition seed) so #1/#2 pull away from flat ties
- Category vote / contrib inserts are **chunked** (Neon HTTP-safe); the admin result reports category count + votes written
- Year **rebuild** aggregates first, then replaces score rows in chunks (avoids wiping categories when a single large insert fails)
- Ends with one year score rebuild (or after Stop). If rebuild fails after lists are written, the seed result says so — use Rankings → Rebuild.

Community / edition ceremony seeding is separate: `/admin/communities` — see [community.md](./community.md).

Seed voters cannot sign in. Use Clear year / Clear all to remove them.
