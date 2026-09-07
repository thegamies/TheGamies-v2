# Library

Personal shelf of games with a status. Separate from GOTY / custom lists and from edition ballots. **Later than v1 launch** — do not implement on the launch branch. See [product.md](../product.md), [follow.md](./follow.md), and [activity-and-trending.md](./activity-and-trending.md).

## Why

Lists are the yearly argument. Library is the diary: what someone wants, is playing, has played, or dropped — including titles that cannot sit on a GOTY ranking (unreleased, wrong year). Follow, trending, and community “what moved” boards read library **activity**, not a census of the whole shelf.

## Statuses

One row per profile per game. Statuses are mutually exclusive:

| Status | Meaning |
|---|---|
| **Want to play** | On the shelf, not started |
| **Playing** | In progress |
| **Played** | Finished / has a take |
| **Dropped** | Stopped without treating it as Played |

No row = not in the library. Replay is **Played → Playing** (the event log records the transition). No cap on how many games may be Playing. No owned / beaten / hours / star rating — GOTY remains the ranked argument. Custom lists remain named ranked piles; Want is the one-click shelf.

Uncoupled from GOTY:

- Played does not add the game to a GOTY list.
- GOTY does not require Played (unfinished contenders are valid).
- Hidden / games-only GOTY hides **order** (and categories); library visibility is its own control.

## Visibility

Each `library_entries` row is `public` or `private` (default **public**).

- **Private** — owner library only. No follow feed. No site, community, or following trending.
- **Public** — visible on the owner’s Library tab (when the profile is public) and eligible for feed / trending.

Community trending counts **public member rows only**. Do not anonymize private rows into a count (small communities would leak).

Changing a row to private **retracts** it: feed and trending **filter on read** against current `library_entries.visibility`. Clearing the row (remove from library) drops it from those reads. Do not freeze visibility onto `activity_events` at write time.

## Surfaces (when built)

- Game page: Want / Playing / Played / Dropped for signed-in profiles. Unsigned visitors get the same sign-in prompt pattern as list Save/Share. Later: counts of people you follow, not a public roster.
- Profile `/u/[username]`: **Library** tab beside Lists and Communities (`?tab=library`). SQL-paginated; never dump the shelf.
- Account close: delete library rows and related activity events (tombstone stays on the profile as today).

Unsigned / anonymous list drafts never write library.

## Catalog rules

Library may include titles GOTY ranking rejects (unreleased Want is the point). Adult titles are allowed on the shelf. **Trending excludes adult games** (same as live GOTY boards). Live GOTY eligibility is unchanged.

## Schema (when built)

`library_entries`: primary key `(profile_id, game_id)`; `status`; `visibility`; `updated_at`. Indexes for `(status, game_id)` and `(profile_id, updated_at)`.

This table **is** contrib for “who has this status.” Do not duplicate a `library_contrib` table. Site trending caches are later, only if a windowed `GROUP BY` on events is too hot — see [activity-and-trending.md](./activity-and-trending.md).

## Non-goals (this feature)

- Notifications / email / push when a status changes
- Import from Steam / IGDB / elsewhere
- Seed voters writing library rows
- Completionist tracking
- Community member activity feed (library ticks in a community firehose)
