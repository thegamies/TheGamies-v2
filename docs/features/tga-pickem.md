# Video Game Awards Pick’em

Third ranking system: predict the external Game Awards show. Public name is **Video Game Awards Pick’em**. Not Events. Not live GOTY.

See [product.md](../product.md) and [terminology.md](../terminology.md).

## Surfaces

- Public: `/the-game-awards`, `/the-game-awards/[year]` (`Your ballot` default, `?view=standings`, locked `?view=sheet&u=`)
- Admin: `/admin/the-game-awards`, `/admin/the-game-awards/[year]`, `/admin/the-game-awards/[year]/show`, `/admin/the-game-awards/seed` (fills leftover site sheets for `is_seed` standings/community accounts; optional community slug fills leftover community sheets for members already in that community)
- Community (members create a year; closed-join public guests may browse the ballot and Standings): `/communities/[slug]/the-game-awards` (`Your ballot` default, `?view=standings`, locked `?view=sheet&u=`, hosts `?view=settings`). Create at `/communities/[slug]/create/the-game-awards`.

## Year controls

Status is **computed** when the year is **On** (`draft` → `scheduled` → `open` → `locked`). **Off** is a stored switch.

| Control | Effect |
|---|---|
| **On / Off** | Public game hidden when Off. Data stays. |
| **Go live** | Turns On and sets picks-open to now. Requires a complete slate. Does not Promote. |
| **Promote** | Primary nav + homepage `PromoBanner`. One year at a time. Requires On + complete slate. Copy follows year status: coming soon / picks open / live results. |

On but not promoted: URL works (soft launch / archive).

## Slate

- Categories have **kind** `game` or `other`.
- **Game:** nominees are catalog games; UI links to `/games/[slug]`.
- **Other:** custom name + optional uploaded art (R2, same bucket as avatars). Artwork is not required to turn a year On.
- **Load 2025 categories** seeds official 2025 names, order, and kinds, then attaches nominees (catalog games + text for non-game awards).
- **Load 2025 nominees** replaces that year’s nominees with the 2025 seed (clears prior nominees, calls, and ballot masks for the year), then reports titles missing from the catalog. Catalog matching is not limited to that release year (ongoing, prior, and unreleased titles can attach). Admin nominee search uses the full catalog the same way. Text awards (Performance, Adaptation, Content Creator, Esports Athlete/Team) upload stored 2025 portraits to the image bucket.
- **Load 2025 winners** calls the official 2025 winners on the current slate and scores existing sheets.
- **Copy categories** copies labels, descriptions, order, kind, and the stable award slot. Replacing a year that already has categories clears that year’s ballot masks.

Picks lock at **show start**. The nominee ballot is hidden while the year is scheduled (coming soon) or still a draft. It appears when picks open, then stays after lock for review and scoring. Admin calls winners in the show room. Each call recounts ballot masks into the existing score rows, then leaderboards page those rows. The public and community ballots mark the winner plus Correct / Incorrect on your pick after picks lock. While picks are open, Standings lists who has a sheet (names only). Places, points, and opening a sheet wait until picks lock. Called winners stay hidden and Standings does not show places or points until then.

## Scoring

1 point per correct **called** category. Uncalled awards do not score. World Premieres (absolute difference) is the competition tie-break. Equal points and equal WP share a place (1–2–2–4). After picks lock, a name on Standings opens that entry.

A ballot is a byte mask on the sheet, plus the World Premieres guess. Each award and each nominee keeps a slot assigned once, when it is created. Display order can change without rewriting masks. Slot 0 in the mask means no pick. Removing an award or nominee retires that slot so later additions do not reuse it.

Saving a ballot writes that mask and that person’s score row at 0 points, including the World Premieres delta when the official count is already set. Saving again refreshes the mask and the delta and leaves points alone. It also adjusts a pick count for each nominee that changed, so a tally does not need one row per pick. There is no public tally screen.

A winner call, or setting the official World Premieres count, recounts that year’s masks in one pass and writes points, the World Premieres delta, and place onto the existing site and community score rows. It does not insert score rows and it does not read the old pick tables. Those tables stay in the database. The app does not read or write them. Standings then read 50 score rows ordered by place. Your ballot reads your one score row. Until the first winner call, place is empty and the ballot still says score and rank appear as awards are called. The Hosts board ranks the snapshot from stored points, because that place is among hosts.

## Community

Same official slate and winners. Separate sheets. Import from the global sheet (warns before replacing picks already on the community ballot). After a complete community save, if they have no site sheet yet, prompt to copy that entry to the global game and open it. Opens when the community creates that year and the site year is On with picks open. Closes at the same show start. On **public + joins closed** communities, guests see the same ballot slate (read-only) and Standings; locked sheets stay readable. Regular public and private interiors stay members-only.

Community Settings lists created years (including locked). **Create** only offers a site-On year that has not locked (promoted first, else newest). Delete is on Pick’em **Settings** (`?view=settings`); type the year to confirm. Delete removes that community’s sheets, standings, and Host snapshot.

Create seeds that year’s Host snapshot (`tga_community_hosts`) from current community Hosts (capped at **12**). Promote / Retire syncs years that are not locked. Admins can still add or remove a Host for that year on Pick’em **Settings** (same **12** cap). Standings has Community / Hosts; Hosts ranks only people on that year’s snapshot (SQL join + page).

## Request cost

One mask per sheet, plus one score row. Leaderboards use SQL `LIMIT` on stored place. A winner call drops the standings index, recounts masks, writes points and place, then builds the index once. Do not load every sheet into the app.
