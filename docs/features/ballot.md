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

- **Eligibility:** signed-in community members (open membership for now)
- **Edit:** allowed while edition status is `open` (until `closesAt`); read-only after close/publish
- GOTY eligibility matches personal GOTY helpers (`gotyEligibilityError`)

## Categories

- Live alongside the main GOTY ballot; remain conceptually separate
- **Edition ballots:** site `award_categories` **single-choice** only
- Empty categories show overlay search; a pick uses `CategoryPickCard` (large cover). **Clear** restores the search field
- Voters add awards from a **searchable square grid** with a scrolling Show all / group tab bar. Show all is a single board with a group tag in each tile. Eligibility is shown only when it is not current year.
- Per-community / multi / ranked edition category modes deferred
- **Site live** categories (owned GOTY lists): single-choice locked — see [live-aggregate.md](./live-aggregate.md) / decisions

## Hosts

Community hosts designate **Hosts** **per edition** (Settings). Historical rosters stay with the year; locked after publish. Public UI says Host / Hosts; code stays Voice.

## Open decisions that still block polish

See `docs/decisions.md`: degrading score curve beyond top 10, richer voter matrix, invite-only eligibility, moderation.
