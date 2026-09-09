# Ballot

Ballots belong to **editions** only (not live rankings).

## Game of the Year (edition ballot)

- Ranked **top 10** (scoring uses the same window via `pointsForRank`)
- Personal GOTY lists still hold up to 100; **Import your Game of the Year list** copies the top 10 onto the ballot (warns first if games are already ranked)
- After a **complete** ballot save (top 10 plus every award pick), if this **event** has not prompted them yet, show what would be created on their site GOTY list. That prompt adds only missing pieces: a new GOTY list when they have none for that year, and site award picks they do not already have. Existing ranks and category picks are never changed. Accept or **Not now** both count as the one auto-prompt for that event (other years in the same community can still prompt).
- **Export to my list** is on the open ballot and on **Your ballot** after close or publish (not on another voter’s ballot). Disabled while the open ballot is unsaved, or when there are no games or site award picks. It can create a list, **Add missing** site awards, or **Replace list**. Replace shows what will change: rank from → to, extra games that would be removed, and award picks from → to. It does not wipe a longer ranking when the ballot has no games. Community awards stay on the event. Creating a new list includes the same **Ranked / Games only / Hidden** control as the list editor.
- Artwork-forward cover grid while voting is open **and** after close (same `BallotRankGrid`)
- After an edit, **Save ballot** pins to the bottom (`PinnedSaveBar`). Leaving the page prompts **Unsaved changes**
- Reordering must feel direct and stable
- States: empty, partial, review, submitted, locked (after deadline / close)

### Storage (shipped)

Tables `community_edition_ballots` + `community_edition_ballot_items` — **not** personal `lists`, **not** `live_*_contrib`.

- **Eligibility:** signed-in community members (invite-only)
- **Edit:** allowed while edition status is `open` (until `closesAt`); read-only after close/publish
- **Host preview:** while `scheduled`, community admins (event Hosts) can open **Ballot** to inspect GOTY layout and **add, edit, and reorder** awards (same category tools as Event Settings). Site award order saves from that preview. Members still only see the coming-soon deck.
- GOTY eligibility matches personal GOTY helpers (`gotyEligibilityError`): year, released date, no editions, no adult, no pack/DLC-addon types; expansions allowed

## Categories

- Live alongside the main GOTY ballot; remain conceptually separate from the Top 10
- **Edition ballots — one Categories list:** site awards and community (custom) awards share a single **Categories / Award picks** chapter, ordered by the event’s interleaved `sortOrder` (hosts reorder site + custom together in Event Settings). Community awards still show a **Community** tag on each block.
- **Site awards:** hosts enable a **subset** (and order) of site `award_categories` in Event Settings. Single-choice game picks. Every enabled award is always on the ballot (no Add category). Submit keeps GOTY ranks and drops picks outside that subset. Search respects each award’s eligibility.
- **Community categories:** hosts may add custom awards per event (name, short description, answer type). Answer types:
  - **Any Game** — free game search filtered by the category’s eligibility (same modes as site awards: current year, any year released, upcoming). Any year released means already out, that event year or earlier.
  - **Selected Games** — pick from host-defined entries (each tied to one game; game unique in the category). Entry games follow the category’s eligibility when hosts add them.
  - **Text + Game** — pick from entries with a custom title + associated game. Associated games follow the category’s eligibility when hosts add them (same modes as Any Game / Selected Games).
  - **Text Only** — pick from text entries (no game)
- Host-managed entries may include title, optional description, and a YouTube / Twitch support link (validated; embed or Watch; no autoplay; YouTube timestamps preserved). **Text + Game** and **Text Only** entries may also set an optional image (JPEG or WebP). Caps: 40 custom categories per event, 50 entries per category.
- Category and entry **definitions** (site enablement and custom) edit only while status is `draft` / `scheduled`. Once voting **opens**, definition changes are blocked so existing votes keep their meaning. Deleting a custom category uses a confirmation dialog (no typed name). Hosts reorder categories and entries with a far-right drag handle; order changes save with Event Settings (not immediately).
- Empty site / Any Game slots show overlay search; a pick uses `CategoryPickCard` (large cover). **Clear** restores the search field. Selected / text types use entry cards.
- Multi / ranked edition category modes deferred
- **Site GOTY lists:** voters add awards from a **searchable square grid** (Add category dialog) with group filter. Eligibility is shown only when it is not current year. Best Ongoing and Most Anticipated are omitted from the picker on lists older than last year.
- Eligibility is shown on community ballots and event settings when it is not current year (any year released includes “{year} or earlier”).
- **Site live** categories (owned GOTY lists): single-choice locked — see [live-aggregate.md](./live-aggregate.md) / decisions
- **Results:** frozen category boards and category meta use the same shared `sortOrder` (site and community interleaved). Community labels still append “· Community”.

## Hosts

Community hosts designate **Hosts** **per edition** (Settings). Historical rosters stay with the year; locked after publish. Public UI says Host / Hosts; code stays Voice.

## Open decisions that still block polish

See `docs/decisions.md`: degrading score curve beyond top 10, richer voter matrix, invite-only eligibility, moderation.
