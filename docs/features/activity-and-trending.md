# Activity, feed, and trending

Shared `activity_events` for library status changes and GOTY list membership. The **home feed** groups those events by person. **Trending** counts distinct people per game. Communities do **not** get a member activity feed. **Later than v1 launch.**

See [library.md](./library.md), [follow.md](./follow.md), [lists.md](./lists.md), and [live-aggregate.md](./live-aggregate.md).

## Events

Append-only `activity_events`:

| Kind | When |
|---|---|
| `library_want` | Status set to Want to play |
| `library_playing` | Status set to Playing |
| `library_played` | Status set to Played |
| `library_dropped` | Status set to Dropped |
| `library_cleared` | Removed from the library |
| `list_add` | Game added to an owned **GOTY** list that is `ranked` or `games_only` |
| `list_remove` | Game removed from that GOTY list |
| `list_reveal` | Owner flips that GOTY list from `games_only` or `hidden` to `ranked` |

No rank-move events. No category-pick events. **Hidden** GOTY lists emit no `list_*` events (including while hidden). Custom lists emit **no** list events in the first slice (GOTY-only; custom membership later if the feed stays quiet enough).

Each GOTY save that diffs items stamps one `batch_id` on every add/remove from that save. Library one-clicks each get their own `batch_id`. `list_reveal` is one row per list (nullable `game_id`).

Columns: `id`, `profile_id`, `game_id` (nullable for reveal), `kind`, `list_id` nullable, `batch_id`, `created_at`. **Do not copy visibility onto the event.** Reads join current `library_entries.visibility` / `lists.rank_visibility` (and skip missing library rows). Retract = set private, hide the list, or delete the row.

Account close deletes the person’s events (or they become unjoinable after library/list delete).

## Follow feed (home)

Actor set = people the viewer follows ([follow.md](./follow.md)). Signed-in only. Unsigned home does not show this feed (site trending may still be public).

**Group on read** so mass updates are one card:

- Same `batch_id` → one card (GOTY save with many adds/removes: “updated 2026 GOTY” with added / removed covers).
- Library clicks: group by person + kind + ~1 hour window.
- Do not mix library kinds on one card (Want vs Playing vs Played vs Dropped stay separate cards).
- Do not mix library with lists.
- Do not group across people or calendar days.
- 1 game: name the title. A few: covers + names. Many: count + cover stack.

Omit private library, hidden lists, tombstoned profiles, and private profiles. Empty state is “follow people whose lists you already open,” not a community ticker.

## Community: no member feed

Joining a community does not subscribe you to members’ library or list ticks. Community chrome stays Overview / Live Rankings / Events / Members.

Optional **later**: rare ceremony notices only (voting opened, results published, a Host flipped GOTY to ranked). Not a social firehose.

## Trending

Game-shaped cover boards. Not a people ticker. Independent of live GOTY sort (a title can trend in March and sit at #40 on the year list).

**Window:** default **7 days**; optional 24h / 30d. Score = **distinct `profile_id` per `game_id`** in the window among counting kinds. One person Playing and GOTY-adding the same game still counts once. A 40-game GOTY save still counts that person once per title, not 40 times for the same title — distinct people is the anti-whale rule **across** people; per game, each person is one.

**Counting kinds:** `library_want`, `library_playing`, `library_played`, `list_add`. **Dropped is not hype** — omit from the main board (optional later “cooling off” strip). Do not fold IGDB `hypes` / `follows` into the rank. Exclude adult games. Exclude private library and hidden-list events via the same on-read joins as the feed.

**Scopes:**

| Board | Whose events | Where |
|---|---|---|
| Site `/trending` | Public events | Public; crawlable when the board meets the floor |
| Community | Public events from **current members** | Community interior (members-only, like Live / Events) |
| Following | People the viewer follows | Signed-in, personalized |

Community trending is **on even if Live Rankings are off**. It is a different board (velocity, not GOTY points).

**Empty floor (site):** hide the public board (editorial empty, not a 404) until at least `site_settings.public_trending_min_people` (default **5**) distinct people have produced a counting event in the default window. Admin-editable on `/admin/rankings` when this ships. Public copy does not name the number. Community / following trending have no site-wide floor (small friend groups should still see a thin board).

**First slice:** standalone `/trending` only — no homepage strip. Community trending is a community interior surface (placement next to Live Rankings when built).

**Cache:** first slice is a windowed `GROUP BY` on `activity_events`. Add `library_trending_scores` + dirty keys later if site trending is hot — same idea as [live-aggregate.md](./live-aggregate.md), not a per-viewer cache. Following trending is always a read-time join.

## Retention

First slice keeps events (feed pages; trending only needs the window). No auto-purge. Later ops may truncate older than 30 days if the table grows — not a launch or first-slice requirement.

## Schema (when built)

See tables in [library.md](./library.md) / [follow.md](./follow.md) plus `activity_events` and `lists.rank_visibility`. Rate limits on follow and library writes wait with other abuse work (v1 already has none on list save).

## Non-goals (this feature)

- Community member activity feed
- Messaging / complex notifications
- Mixing edition ballots into `activity_events`
- Changing live GOTY scoring or when `live_goty_scores` refreshes
- Per-viewer materialized follow-feed tables
