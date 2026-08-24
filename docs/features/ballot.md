# Ballot

Ballots belong to **editions** only (not live rankings).

## Game of the Year (edition ballot)

- Ranked **top 10** (scoring uses the same window via `pointsForRank`)
- Personal GOTY lists still hold up to 100; **Import your Game of the Year list** copies the top 10 onto the ballot (warns first if games are already ranked)
- Artwork-forward cover grid while voting is open **and** after close (same `BallotRankGrid`)
- After an edit, **Save ballot** pins to the bottom (`PinnedSaveBar`). Leaving the page prompts **Unsaved changes**
- Reordering must feel direct and stable
- States: empty, partial, review, submitted, locked (after deadline / close)

### Storage (shipped)

Tables `community_edition_ballots` + `community_edition_ballot_items` — **not** personal `lists`, **not** `live_*_contrib`.

- **Eligibility:** signed-in community members (invite-only)
- **Edit:** allowed while edition status is `open` (until `closesAt`); read-only after close/publish
- GOTY eligibility matches personal GOTY helpers (`gotyEligibilityError`): year, released date, no editions, no adult, no pack/DLC-addon types; expansions allowed

## Categories

- Live alongside the main GOTY ballot; remain conceptually separate
- **Edition ballots:** site `award_categories` **single-choice** only; hosts may enable a **subset** (and order) per edition in Event Settings. The ballot lists **every** enabled award (no Add category). Submit keeps GOTY ranks and drops picks outside that subset; removing an award while open deletes its ballot picks.
- Empty categories show overlay search; a pick uses `CategoryPickCard` (large cover). **Clear** restores the search field
- **Site GOTY lists:** voters add awards from a **searchable square grid** (Add category dialog) with group filter. Eligibility is shown only when it is not current year.
- Custom per-edition defs / multi / ranked edition category modes deferred
- **Site live** categories (owned GOTY lists): single-choice locked — see [live-aggregate.md](./live-aggregate.md) / decisions

## Hosts

Community hosts designate **Hosts** **per edition** (Settings). Historical rosters stay with the year; locked after publish. Public UI says Host / Hosts; code stays Voice.

## Open decisions that still block polish

See `docs/decisions.md`: degrading score curve beyond top 10, richer voter matrix, invite-only eligibility, moderation.
