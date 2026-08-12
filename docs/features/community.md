# Community

## Two systems

| System | Source | Visibility | Mutability |
|---|---|---|---|
| **Live rankings** | Signed-in members’ lists | Board visible when enabled; scores from host date (all years); lock freezes board | Continuous until **locked** |
| **Editions** | Edition ballots (GOTY + categories) | Hidden until `publishesAt` | **Frozen** after publish (payload later) |

Communities may turn **live rankings** on or off. Editions are the end-of-year ceremony flow.

## Identity + membership (shipped)

Signed-in users with a **profile** can **create** a community. The creator is the first internal `admin` member. Anyone signed in with a profile may **join or leave** (open membership). The last host cannot leave.

Public UI never says admin / judge / expert — members are listed by display name. Internal role is `admin` | `member`.

`liveRankingsEnabled` defaults false. Hosts toggle it under Settings. When on, `/communities/[slug]/live` shows a public board: **`SUM(live_goty_contrib)` / `SUM(live_category_contrib)` for current members** — never `live_*_scores`.

**Reveal gate:** ranks public. Scores stay hidden until `live_scores_visible_from` (null = hidden for every year; set a date, reveal now, or clear to hide). Hosts manage this under Settings.

**Lock:** hosts can freeze the public board (`live_rankings_locked`). Lock stores a snapshot (`community_live_lock_snapshots`); member list changes do not move standings until unlock. Current year is snapshotted on lock; other years snapshot lazily on first view.

## Edition schedule shell (shipped)

Table `community_editions`: one row per `(communityId, year)` with `opensAt`, `closesAt`, `publishesAt` (nullable).

**Status is computed** (no stored enum):

- missing any timestamp → `draft` (hosts only)
- before `opensAt` → `scheduled` (coming soon)
- before `closesAt` → `open` (voting open)
- before `publishesAt` → `closed` (results pending)
- else → `published`

Hosts create editions and set the three times under Settings (optional “set to now” shortcuts). Public home shows ceremony status for non-draft editions. Nav: one **Edition** tab (year switcher inside) when any non-draft edition exists — ballot and results share that surface.

### URLs

- `/communities` — public directory
- `/communities/new` — signed-in create (requires profile)
- `/communities/[slug]` — public home (identity, members, join/leave, edition status)
- `/communities/[slug]/live` → current year; `/communities/[slug]/live/[year]?page=`
- `/communities/[slug]/edition` → featured year; `/communities/[slug]/edition/[year]` — GOTY ceremony (vote + results by schedule)
- `/communities/[slug]/ballot` → redirects to edition
- `/communities/[slug]/results` → redirects to edition
- `/communities/[slug]/settings` — hosts only (live + edition schedule)
- Profile `/u/[username]` lists communities the person belongs to

### Non-goals (next slices)

- Voices, Combined weight, frozen result payloads, voter matrix
- Invite-only or approval join, bans, extra roles
- Cover/avatar upload
- Site-admin-only create gate
- Per-community / multi / ranked edition category modes

## Public shell

```text
Community identity
Live rankings status (if enabled) / lock state
Active edition status and year
Hosts / Voices

Overview    Live    Edition    Members
```

Exact tab labels can flex; keep **Live** and **Edition** distinct. Vote and results share the Edition tab with a year switcher.

Settings and event management live on a separate administrative surface.

## Live rankings

- Optional per community
- Fed by signed-in lists only (same abuse rule as site aggregate)
- Board is `SUM(live_*_contrib)` for current members — not `live_*_scores`
- Ranks public; scores from host date (`live_scores_visible_from`) for every live year
- Hosts can **lock** to freeze the public board (snapshot; unlock resumes live SUM)
- Not fed by edition ballots; not written into frozen edition snapshots

## Editions

### Required states

1. Coming soon (`scheduled`)
2. Voting open (`open`) — members edit GOTY + site category picks
3. User actively completing ballot (`open` + editor)
4. User submitted ballot (saved; still editable while `open`)
5. Voting closed; results pending (`closed`) — member ballot read-only
6. Final results published (`published` + frozen payload later)
7. Individual voter ballot / current users exploration (later)
8. Community settings (separate from public pages)

### Ballots (shipped)

Separate tables from personal lists / live contrib:

- `community_edition_ballots` — one per `(editionId, profileId)`
- `community_edition_ballot_items` — ranked GOTY (up to 100; scoring later uses top 10 via `pointsForRank`)
- `community_edition_ballot_category_votes` — site `award_categories` **single-choice** only

**Eligibility:** signed-in profile that is a community member (including hosts). Non-members see join / sign-in CTAs.

**Edit window:** submit and update while status is `open` (until `closesAt`). After close/publish, the voter’s ballot is read-only (or “you did not submit”).

Does not write `live_*_contrib`. Does not feed live rankings.

### Results (later)

- Modes: **Combined · Community · Voices**
- Show **current users / voters** (searchable exploration)
- Categories with winner-first presentation
- Snapshot never recalculates after publish

## Voices

Voices are in v1 for editions. Public UI keeps the term **Voice** (not admin/judge/expert).
