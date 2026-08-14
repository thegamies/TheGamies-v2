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

Displayed **rank is derived at read**, not stored on score rows (dirty-key SUM would invalidate a stored place). Default **competition**: `1 + COUNT(score > first row on the page)`, then walk the page (same score → same rank; new score → offset + local index + 1). Pages stay **50 games**. Site live has no dense chooser. Category laterals walk the top 10 the same way. Community live (SUM + lock snapshots) uses the same numbering.

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

- Site defs in `award_categories` (seeded from `AWARD_CATEGORY_DEFS`, sort 2–64; GOTY itself is the main board).
- Groups (Premier, Major, Genre, …) for browsing standings and the ballot picker.
- **Eligibility** per category: current year, current/active, active in year, upcoming, any year. Current/active and active-in-year currently treat prior-year *released* titles as eligible (no live-ops catalog flag yet). **Upcoming** is later years only — not the list year, even if still unreleased. Remake/DLC categories allow edition/version titles.
- Owned GOTY lists and edition ballots: **one game per category**. Voters **add categories from a grouped list** instead of seeing every slot at once. Order follows `sort_order`.
- **Server validation** uses `categoryEligibilityError` for picks (GOTY ranking still uses GOTY rules).
- Plurality tallies in `live_category_scores`.
- Contrib sync only counts eligible picks (stale ineligible votes are ignored for scoring until cleared).

## URLs

- `/game-of-the-year` → current year
- `/game-of-the-year/[year]` — GOTY board paginated **50 per page** (`?page=2`); category boards by group (`?group=genre`)
- `/admin` — ops index (sync, rankings, seed)
- `/admin/rankings`

## Non-goals

- Journal / cron drain as primary path
- Site live pause-updates lock
- Multi / ranked category modes

## Ops: standings seed

`/admin/seed` (same unlock as other admin tools) creates synthetic profiles
(`seed:standings:*` auth ids, usernames `seedvoter001`…) plus owned GOTY lists.

- Up to **1000** seed indices; UI batches of 50
- **Reseed** rewrites rankings for existing seed voters in range
- **Keep adding until stopped** continues from max index
- Game picks from a large year pool with **rating bias** (−100…100): positive favors highly rated, negative favors lower-rated, 0 is uniform
- Ends with one year score rebuild (or after Stop)

Community / edition ceremony seeding is separate: `/admin/communities` — see [community.md](./community.md).

Seed voters cannot sign in. Use Clear year / Clear all to remove them.
