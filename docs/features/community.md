# Community

## Two systems

| System | Source | Visibility | Mutability |
|---|---|---|---|
| **Live rankings** | Signed-in members’ lists | Board visible when enabled; scores from host date (all years); lock freezes board | Continuous until **locked** |
| **Editions** | Edition ballots (GOTY + categories) | Hidden until edition closes | **Frozen** after publish |

Communities may turn **live rankings** on or off. Editions are the end-of-year ceremony flow.

## Identity + membership (shipped)

Signed-in users with a **profile** can **create** a community. The creator is the first internal `admin` member. Anyone signed in with a profile may **join or leave** (open membership). The last host cannot leave.

Public UI never says admin / judge / expert — members are listed by display name. Internal role is `admin` | `member`.

`liveRankingsEnabled` defaults false. Hosts toggle it under Settings. When on, `/communities/[slug]/live` shows a public board: **`SUM(live_goty_contrib)` / `SUM(live_category_contrib)` for current members** — never `live_*_scores`.

**Reveal gate:** ranks public. Scores stay hidden until `live_scores_visible_from` (null = hidden for every year; set a date, reveal now, or clear to hide). Hosts manage this under Settings.

**Lock:** hosts can freeze the public board (`live_rankings_locked`). Lock stores a snapshot (`community_live_lock_snapshots`); member list changes do not move standings until unlock. Current year is snapshotted on lock; other years snapshot lazily on first view.

### URLs

- `/communities` — public directory
- `/communities/new` — signed-in create (requires profile)
- `/communities/[slug]` — public home (identity, members, join/leave)
- `/communities/[slug]/live` → current year; `/communities/[slug]/live/[year]?page=`
- `/communities/[slug]/settings` — hosts only (live on/off, lock, scores date)
- Profile `/u/[username]` lists communities the person belongs to

### Non-goals (this slice)

- Editions, ballots, Voices, frozen results
- Invite-only or approval join, bans, extra roles
- Cover/avatar upload
- Site-admin-only create gate

## Public shell (edition-aware, later)

```text
Community identity
Live rankings status (if enabled) / lock state
Active edition status and year
Hosts / Voices

Overview    Live    Ballot    Results    Members
```

Exact tab labels can flex; keep **Live** and **Edition Ballot/Results** distinct.

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

1. Coming soon  
2. Voting open  
3. User actively completing ballot  
4. User submitted ballot  
5. Voting closed; results pending (still hidden)  
6. Final results published (frozen)  
7. Individual voter ballot / current users exploration  
8. Community settings (separate from public pages)

### Results

- Modes: **Combined · Community · Voices**
- Show **current users / voters** (searchable exploration)
- Categories with winner-first presentation
- Snapshot never recalculates after publish

## Voices

Voices are in v1 for editions. Public UI keeps the term **Voice** (not admin/judge/expert).
