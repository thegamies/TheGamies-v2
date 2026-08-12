# Ballot

Ballots belong to **editions** only (not live rankings).

## Game of the Year (edition ballot)

- Ranked list aligned with personal GOTY capacity (up to 100 on personal lists)
- Edition **scoring defaults to top 10**; full-list degrading scores are a configurable future/scoring-engine option
- Artwork-forward layout; one editorial ranking composition (not ten dashboard cards)
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
- Per-community / multi / ranked edition category modes deferred
- **Site live** categories (owned GOTY lists): single-choice locked — see [live-aggregate.md](./live-aggregate.md) / decisions

## Voices

Hosts designate Voices **per edition** (Settings). Historical rosters stay with the year; locked after publish.

## Open decisions that still block polish

See `docs/decisions.md`: degrading score curve beyond top 10, richer voter matrix, invite-only eligibility, moderation.
