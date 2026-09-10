# Library

Personal shelf of games with a status. Separate from GOTY / custom lists and from edition ballots. **Later than v1 launch** — do not implement on the launch branch. See [product.md](../product.md), [follow.md](./follow.md), and [activity-and-trending.md](./activity-and-trending.md).

## Why

Lists are the yearly argument. Library is the diary: what someone wishlists, has queued, is playing, paused, beat, or dropped — including titles that cannot sit on a GOTY ranking (unreleased, wrong year). Follow, trending, and community “what moved” boards read library **activity**, not a census of the whole shelf.

## Statuses

One row per profile per game. Statuses are mutually exclusive:

| Status | Meaning |
|---|---|
| **Wishlist** | Marked for later, not a working queue |
| **Backlog** | On the shelf to play |
| **Playing** | In progress |
| **Paused** | Stopped for now, still on the shelf |
| **Beat** | Finished |
| **Dropped** | Stopped without treating it as Beat |

No row = not in the library. Replay is **Beat → Playing** (the event log records the transition). No cap on how many games may be Playing. No owned / hours / star rating — GOTY remains the ranked argument. Custom lists remain named ranked piles; Backlog is the queued shelf.

Uncoupled from GOTY:

- Beat does not add the game to a GOTY list.
- GOTY does not require Beat (unfinished contenders are valid).
- Hidden / games-only GOTY hides **order** (and categories); library visibility is its own control.

## Visibility

Each `library_entries` row is `public` or `private` (default **public**).

- **Private** — owner library only. No follow feed. No site, community, or following trending.
- **Public** — visible on the owner’s Library tab (when the profile is public) and eligible for feed / trending.

Community trending counts **public member rows only**. Do not anonymize private rows into a count (small communities would leak).

Changing a row to private **retracts** it: feed and trending **filter on read** against current `library_entries.visibility`. Clearing the row (remove from library) drops it from those reads. Do not freeze visibility onto `activity_events` at write time.

## Surfaces (when built)

- Game page: **Add to library** under the cover opens a status picker (icons + Wishlist / Backlog / Playing / Paused / Beat / Dropped). Unsigned visitors get the same sign-in prompt pattern as list Save/Share. **Only I can see this**, **Remove from library**, and counts of people you follow sit under the cover with that control.
- Profile `/u/[username]`: **Library** tab beside Lists and Communities (`?tab=library`). SQL-paginated; never dump the shelf.
- Account close: delete library rows and related activity events (tombstone stays on the profile as today).

Unsigned / anonymous list drafts never write library.

## Catalog rules

Library may include titles GOTY ranking rejects (unreleased Wishlist / Backlog is the point). Adult titles are allowed on the shelf. **Trending excludes adult games** (same as live GOTY boards). Live GOTY eligibility is unchanged.

## Schema (when built)

`library_entries`: primary key `(profile_id, game_id)`; `status`; `visibility`; `updated_at`. Indexes for `(status, game_id)` and `(profile_id, updated_at)`.

This table **is** contrib for “who has this status.” Do not duplicate a `library_contrib` table. Site trending caches are later, only if a windowed `GROUP BY` on events is too hot — see [activity-and-trending.md](./activity-and-trending.md).

## Ops (local / staging)

Admin Standings seed can fill public Wishlist / Backlog / Playing / Beat rows on seed accounts (and matching activity events) so site trending has enough people. The catalog pool is this year’s **already released** titles, ranked by **popularity × recency** (a recent hit beats an older one; TBA / Dec 31 placeholders and brand-new nobodies drop out). **Playing** rotates through the hottest dozen of those so many accounts share the same current games; Beat / Backlog / Wishlist use the rest of the pool. Playing events are stamped in the last day. Seed accounts stay out of public People search. Site operators, and local or preview builds, can follow them; everyone else cannot.

## Non-goals (this feature)

- Notifications / email / push when a status changes
- Import from Steam / IGDB / elsewhere
- Completionist tracking
- Community member activity feed (library ticks in a community firehose)
