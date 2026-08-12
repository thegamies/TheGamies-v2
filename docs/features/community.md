# Community

## Two systems

| System | Source | Visibility | Mutability |
|---|---|---|---|
| **Live rankings** | Signed-in members’ lists | Always visible when enabled | Continuous; community admin may **lock** |
| **Editions** | Edition ballots (GOTY + categories) | Hidden until edition closes | **Frozen** after publish |

Communities may turn **live rankings** on or off. Editions are the end-of-year ceremony flow.

## Identity + membership (shipped)

Signed-in users with a **profile** can **create** a community. The creator is the first internal `admin` member. Anyone signed in with a profile may **join or leave** (open membership). The last host cannot leave.

Public UI never says admin / judge / expert — members are listed by display name. Internal role is `admin` | `member`.

`liveRankingsEnabled` exists on the row (default false) but there is **no Live tab or toggle** yet.

### URLs

- `/communities` — public directory
- `/communities/new` — signed-in create (requires profile)
- `/communities/[slug]` — public home (identity, members, join/leave)
- Profile `/u/[username]` lists communities the person belongs to

### Non-goals (this slice)

- Editions, ballots, Voices, frozen results
- Community live rankings UI / `SUM(contrib)` board / lock
- Invite-only or approval join, bans, extra roles
- Settings surface, cover/avatar upload
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
- Community admin can lock/unlock for suspense
- Not fed by edition ballots; not written into frozen edition snapshots
- Later boards should `SUM(live_goty_contrib)` for member profiles — not filter `live_goty_scores`

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
