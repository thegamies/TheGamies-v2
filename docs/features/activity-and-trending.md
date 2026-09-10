# Activity, feed, and trending

Shared `activity_events` for library status changes and GOTY list membership. The **home feed** groups those events by person. **Trending** counts distinct people per game. Communities do **not** get a member activity feed. **Later than v1 launch.**

See [library.md](./library.md), [follow.md](./follow.md), [lists.md](./lists.md), and [live-aggregate.md](./live-aggregate.md).

## Events

Append-only `activity_events`:

| Kind | When |
|---|---|
| `library_wishlist` | Status set to Wishlist |
| `library_backlog` | Status set to Backlog |
| `library_playing` | Status set to Playing |
| `library_paused` | Status set to Paused |
| `library_beat` | Status set to Beat |
| `library_dropped` | Status set to Dropped |
| `library_cleared` | Removed from the library |
| `list_add` | Game added to an owned **GOTY** list that is `ranked` or `games_only` |
| `list_remove` | Game removed from that GOTY list |
| `list_reveal` | Owner flips that GOTY list from `games_only` or `hidden` to `ranked` |

No rank-move events. No category-pick events. **Hidden** GOTY lists emit no `list_*` events (including while hidden). Custom lists emit **no** list events in the first slice (GOTY-only; custom membership later if the feed stays quiet enough).

Each GOTY save that diffs items stamps one `batch_id` on every add/remove from that save. Library one-clicks each get their own `batch_id`. `list_reveal` is one row per list (nullable `game_id`).

Columns: `id`, `profile_id`, `game_id` (nullable for reveal), `kind`, `list_id` nullable, `batch_id`, `created_at`. **Do not copy visibility onto the event.** Reads join current `library_entries.visibility` / `lists.rank_visibility` (and skip missing library rows). Retract = set private, hide the list, or delete the row.

Account close deletes the person’s events (or they become unjoinable after library/list delete).

## Follow feed (`/following`)

Actor set = people the viewer follows ([follow.md](./follow.md)). Signed-in **`/following`** opens the **Activity** tab first. Unsigned home stays Big Picture + GOTY strips. Unsigned `/following` goes to **People** search (`/people`).

**Group on read** so one person is one card per UTC day:

- Same person + UTC calendar day → one row (library kinds and GOTY list ticks together).
- Sort the feed by that row’s **latest** event, not by when the person first appeared that day.
- Page in SQL by those person-days (not by raw event rows).
- 1 game: name the title. A few: covers + names. Many: count + cover stack. Each cover shows the action and clock (Started playing, Beat, …). Mixed days flatten to one newest-first strip.

Omit private library, hidden lists, tombstoned profiles, and private profiles. Empty state is “follow people whose lists you already open,” not a community ticker.

## Community: no member feed

Joining a community does not subscribe you to members’ library or list ticks. Community chrome stays Overview / Live Rankings / Trending / Events / Members. Trending is on even if Live Rankings are off.

Optional **later**: rare ceremony notices only (voting opened, results published, a Host flipped GOTY to ranked). Not a social firehose.

## Trending

Game-shaped cover boards. Not a people ticker, and not a numbered standings list — sort is internal; the UI shows covers and titles only. Independent of live GOTY sort (a title can trend in March and sit at #40 on the year list).

**Window:** default **7 days**; optional 24h / 30d. Each person still counts once per game (Playing + GOTY-add is still one person; use their **most recent** counting event). **Sort** is the sum of recency × kind weight; the board does not show a people count. Defaults: last 24 hours = 1, 1–3 days = ½, rest of the 7-day window = ¼, 7–30 days = ⅛ (30-day chip only). Kind defaults: wishlist / backlog / beat / GOTY-add = 1, Playing = **1.25**, paused / dropped / cleared / remove / reveal = **0** (omitted). Both recency and kind weights are admin-editable on `/admin/rankings`. Recency still dominates a modest Playing bump. A 40-game GOTY save still counts that person once per title.

**Counting kinds:** any event whose kind weight is above zero. Defaults match `library_wishlist`, `library_backlog`, `library_playing`, `library_beat`, `list_add`. **Dropped and paused are not hype** at weight 0 — omit from the main board unless an operator raises them. Do not fold IGDB `hypes` / `follows` into the rank. Exclude adult games. Exclude private library and hidden-list events via the same on-read joins as the feed.

**Scopes:**

| Board | Whose events | Where |
|---|---|---|
| Site Games trending (`/games?sort=trending`) | Public events | Public; crawlable when the board meets the floor |
| Community | Public events from **current members** | Community interior (members-only, like Live / Events) |
| Following | People the viewer follows | Signed-in **Following → Trending** (`/following?view=trending`) and the Games filter (`scope=following`) |

Community trending is **on even if Live Rankings are off**. It is a different board (velocity, not GOTY points). `/trending` redirects to Games trending so old links keep working. Community chrome still has its own Trending tab.

**Empty floor (site):** hide the public board (editorial empty, not a 404) until at least `site_settings.public_trending_min_people` (default **5**) distinct people have produced a counting event in the default window. Admin-editable on `/admin/rankings`. Public copy does not name the number. Community / following trending have no site-wide floor (small friend groups should still see a thin board).

**First slice:** Games browse **Trending** sort for the site board (Everyone, plus People you follow when signed in). Signed-in **Following** also has a **Trending** tab for people you follow only. No homepage strip and no top-level Trending tab. Community trending is a community interior surface (placement next to Live Rankings when built).

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
