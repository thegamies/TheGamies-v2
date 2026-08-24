# Video Game Awards Pick’em

Third ranking system: predict the external Game Awards show. Public name is **Video Game Awards Pick’em**. Not Events. Not live GOTY.

See [product.md](../product.md) and [terminology.md](../terminology.md).

## Surfaces

- Public: `/the-game-awards`, `/the-game-awards/[year]` (`Your ballot` default, `?view=standings`, locked `?view=sheet&u=`)
- Admin: `/admin/the-game-awards`, `/admin/the-game-awards/[year]`, `/admin/the-game-awards/[year]/show`, `/admin/the-game-awards/seed` (fills leftover site sheets for standings/community seed accounts; optional community slug fills leftover community sheets for members already in that community)
- Community (members, opt-in): `/communities/[slug]/the-game-awards` (`Your ballot`, `?view=standings`, `?mode=voices` Hosts board, hosts `?view=settings`)

## Year controls

Status is **computed** when the year is **On** (`draft` → `scheduled` → `open` → `locked`). **Off** is a stored switch.

| Control | Effect |
|---|---|
| **On / Off** | Public game hidden when Off. Data stays. |
| **Go live** | Turns On and sets picks-open to now. Requires a complete slate. Does not Promote. |
| **Promote** | Primary nav + homepage band. One year at a time. Requires On + complete slate. |

On but not promoted: URL works (soft launch / archive).

## Slate

- Categories have **kind** `game` or `other`.
- **Game:** nominees are catalog games; UI links to `/games/[slug]`.
- **Other:** custom name + optional uploaded art (R2, same bucket as avatars). Artwork is not required to turn a year On.
- **Load 2025 categories** seeds official 2025 names, order, and kinds, then attaches nominees (catalog games + text for non-game awards).
- **Load 2025 nominees** replaces that year’s nominees with the 2025 seed (clears prior nominees, calls, and picks for the year), then reports titles missing from the catalog.
- **Load 2025 winners** calls the official 2025 winners on the current slate and scores existing sheets.
- **Copy categories** copies labels, descriptions, order, and kind only.

Picks lock at **show start**. Admin calls winners in the show room. Each call patches score rows for that category (SQL), then leaderboards page those rows. The public and community ballots mark the winner plus Correct / Incorrect on your pick after picks lock. While picks are open, called winners stay hidden. Your ballot shows the viewer’s score and rank (one score-row lookup). World Premieres official count is a separate tie-break (absolute difference).

## Scoring

1 point per correct **called** category. Uncalled awards do not score. World Premieres (absolute difference) is the competition tie-break. Equal points and equal WP share a place (1–2–2–4). After picks lock, a name on Standings opens that entry.

## Community

Same official slate and winners. Separate sheets. Import from the global sheet (warns before replacing picks already on the community ballot). After a complete community save, if they have no site sheet yet, prompt to copy that entry to the global game and open it. Opens when the community opts in and the site year is On with picks open. Closes at the same show start.

Opt-in seeds that year’s Host snapshot (`tga_community_hosts`) from current community Hosts. Promote / Retire syncs years that are not locked. Admins can still add or remove a Host for that year on **Settings** (`?view=settings`) or Community Settings. Standings has Community / Hosts; Hosts ranks only people on that year’s snapshot (SQL join + page).

## Request cost

Normalized pick and score rows. Leaderboards use SQL `LIMIT`. Winner calls `UPDATE` from pick tables for one category — do not load every sheet into the app.
