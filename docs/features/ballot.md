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
- Site-wide category definitions **and** per-community categories (both in v1 product intent)
- Each category shows its voting rule clearly
- **Edition ballots (this slice):** site `award_categories` **single-choice** only (`community_edition_ballot_category_votes`)
- Per-community / multi / ranked edition category modes deferred
- **Site live** categories (owned GOTY lists): single-choice locked — see [live-aggregate.md](./live-aggregate.md) / decisions
- Avoid a long generic form; use artwork and clear selection states

## Open decisions that still block full ceremony

See `docs/decisions.md`: Combined Voice weight, community category modes beyond site single-choice, invite-only eligibility, tie-break, moderation.
