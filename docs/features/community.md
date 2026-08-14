# Community

## Two systems

| System | Source | Visibility | Mutability |
|---|---|---|---|
| **Live Rankings** | Signed-in members’ lists | Board visible when enabled; scores from host date (all years); lock freezes board | Continuous until **locked** |
| **Events** (internal: editions) | Event ballots (GOTY + categories) | Hidden until `publishesAt` | **Frozen** after publish (payload later) |

Communities may turn **Live Rankings** on or off. Events are the end-of-year awards vote. Code and URLs keep `live` / `edition`.

## Identity + membership (shipped)

Signed-in users with a **profile** can **create** a community (name + optional description; URL slug is derived from the name). The creator is the first internal `admin` member. Anyone signed in with a profile may **join or leave** (open membership). Admins can add other admins under Settings → Community. The last admin cannot leave — that note lives on Settings, not Overview.

Public member lists never say admin / judge / expert — people are listed by display name. Settings → Community uses **Admin**. Event boards still say **Host**. Internal role is `admin` | `member`.

`liveRankingsEnabled` defaults false. Hosts toggle it under Settings. When on, `/communities/[slug]/live` shows a public board: **`SUM(live_goty_contrib)` / `SUM(live_category_contrib)` for current members** — never `live_*_scores`.

**Reveal gate:** ranks public. Scores stay hidden until `live_scores_visible_from` (null = hidden for every year; set a date, reveal now, or clear to hide). Hosts manage this under Settings.

**Lock:** hosts can freeze the public board (`live_rankings_locked`). Lock stores **normalized** freeze rows (`community_live_lock_meta` / `_goty` / `_category_rows`); page reads use SQL `LIMIT`. Member list changes do not move standings until unlock. Current year is snapshotted on lock; other years snapshot lazily on first view. Unlock deletes freeze rows.

## Edition schedule shell (shipped)

Table `community_editions`: one row per `(communityId, year)` with `opensAt`, `closesAt`, `publishesAt` (nullable).

**Status is computed** (no stored enum):

- missing any timestamp → `draft` (legacy / incomplete rows only; hosts cannot create a draft)
- before `opensAt` → `scheduled` (coming soon)
- before `closesAt` → `open` (voting open)
- before `publishesAt` → `closed` (results pending)
- else → `published`

Hosts create events from Overview (when none exist yet) or Settings → Events (**Create event** opens a dialog): year picker plus all three dates and times. The open date may be in the past (voting already open). Close cannot precede open, and publish cannot precede close — including on the same day. Each schedule field has a **Set to now** shortcut. Saving warns if the times are out of order, or if they would skip ahead to closed/published or change a live event’s status. New events always have a full schedule — not a draft. Hosts can **delete** an event after typing that year to confirm (ballots and results go with it). Public home and the Events tab both use **{year} Video Game Awards**. Overview adds a **Community vote ·** status kicker (Opens / Closes / Reveals times, then Results). Nav: **Events** tab (year switcher inside) when any non-draft event exists — ballot and results share that surface. While voting is **open** or **closed**, Events also shows **Voters** (paginated names; picks stay hidden until publish) and the awards header shows how many ballots were submitted. Public UI says **Events** and **Live Rankings**; URLs stay `/edition` and `/live`.

### URLs

- `/communities` — public directory
- `/communities/new` — signed-in create (requires profile)
- `/communities/[slug]` — public home (identity, about, join/leave for members, featured event; hosts with no events yet see **Create event**)
- `/communities/[slug]/members` — paged member roster
- `/communities/[slug]/live` → current year; `/communities/[slug]/live/[year]?page=`
- `/communities/[slug]/edition` → featured year; `/communities/[slug]/edition/[year]` — GOTY event (vote + results by schedule)
- `/communities/[slug]/ballot` → redirects to edition
- `/communities/[slug]/results` → redirects to edition
- `/communities/[slug]/settings` — hosts only. Secondary tabs: **Live Rankings** (`?tab=live`, default), **Events** (`?tab=events&year=`), and **Community** (`?tab=community`). Events: **Create event** dialog (year + full schedule; open may be in the past), year selector, **Open event** (that year with Settings selected), **Delete event** (type the year to confirm). Per-year schedule, Hosts, host preview. Community: add/remove admins (last admin cannot be removed) and leave.
- Profile `/u/[username]` lists communities the person belongs to

### Non-goals (next slices)

- Weighted Combined (Host %)
- Invite-only or approval join, bans, extra roles
- Cover/avatar upload
- Site-admin-only create gate
- Per-community / multi / ranked edition category modes
- Full all-member ballot matrix virtualization

## Public shell

```text
Community identity
Live Rankings status (if enabled) / lock state
Active event status and year
Hosts

Overview    Live Rankings    Events    Members
```

Exact tab labels: **Live Rankings** and **Events** (not Live / Edition). Vote and results share the Events tab with a year switcher. Settings is hosts only, with Live Rankings · Events · Community as secondary tabs.

Settings and event management live on a separate administrative surface. Community Settings Events creates years and edits one year at a time; **Open event** opens that year on the event page with Settings selected.

## Live rankings

- Optional per community
- Fed by signed-in lists only (same abuse rule as site aggregate)
- Board is `SUM(live_*_contrib)` for current members — not `live_*_scores`
- Ranks public; scores from host date (`live_scores_visible_from`) for every live year
- Hosts can **lock** to freeze the public board (normalized freeze rows + SQL pagination; unlock resumes live SUM)
- Not fed by edition ballots; not written into frozen edition snapshots

## Editions

### Required states

1. Coming soon (`scheduled`) — Events tab shows open time + **On the ballot** preview (GOTY + categories)
2. Voting open (`open`) — members edit GOTY + site category picks
3. User actively completing ballot (`open` + editor)
4. User submitted ballot (saved; still editable while `open`)
5. Voting closed; results pending (`closed`) — member ballot read-only; Events heading shows the reveal datetime
6. Final results published (`published` + frozen normalized boards)
7. Individual voter exploration (paged voter list on results; deeper matrix later)
8. Event Settings tab for hosts (`?view=settings`): schedule, tie numbering, Hosts, host preview of submitted ballots, **Delete event** (type the year). Community Settings Events creates years (full schedule, no draft) and switches year; **Open event** lands on this tab.

### Ballots (shipped)

Separate tables from personal lists / live contrib:

- `community_edition_ballots` — one per `(editionId, profileId)`
- `community_edition_ballot_items` — ranked GOTY (up to 10; scoring uses `pointsForRank`)
- `community_edition_ballot_category_votes` — site `award_categories` **single-choice** only

**Eligibility:** signed-in profile that is a community member (including hosts). Non-members see join / sign-in CTAs.

**Edit window:** submit and update while status is `open` (until `closesAt`). After close/publish, the voter’s ballot is read-only (or “you did not submit”).

Does not write `live_*_contrib`. Does not feed live rankings.

### Ops seed (admin)

`/admin/communities` (admin code): create synthetic `seed:community:*` profiles, join a community by slug, optionally mark Hosts, write edition ballots (creates a scheduled-open edition window if missing). Clear removes seed memberships/ballots/Hosts; optional profile delete. Separate from standings seed (`/admin/seed`).

### Hosts (shipped)

Community hosts designate **Hosts** **per edition** under Settings (`community_edition_voices`). The list defaults to **community hosts + current Hosts**; they **search members** by name or @username to designate others. Roster is year-specific and locks after publish. Public UI says Host / Hosts; URLs stay `?mode=voices`.

### Results (shipped)

On publish, write-once freeze into normalized tables (`community_edition_result_*`). Public mode switcher is **Community · Hosts** (Combined hidden until weighted scoring). Displayed rank is derived at read from equal points/votes using the event’s **tie numbering** setting (competition 1–1–3 default, or dense 1–1–2). Hosts set this in Event Settings and may change it after publish (no freeze rebuild). Unique freeze `place` stays board order. GOTY and voters are **SQL-paginated** (50 games, not 50 ranks). Categories load in full (small).

**GOTY / category Comparison:** Results GOTY and Categories share tertiary **Ranked · Comparison** at the top of the page (default Ranked). GOTY Ranked is a wrapping Top 10 grid with place in front of the title. Category Ranked is displayed rank ≤ 3 per award on one line with horizontal scroll (full ties). Comparison lays out parallel lists as per-rank (GOTY) or per-award (Categories) chapters — You · Community · Hosts · each Host — not one mega-table. GOTY Comparison numbering follows the event’s competition or dense setting.

**Views:** Reveal · Results · Full standings · Categories · Voters · Your ballot (`?view=`; default is Reveal / `reveal`; Results is `?view=results`, `overview` still works) as **secondary** underline tabs; Community · Hosts as **tertiary** text toggle on the same toolbar (hidden on Your ballot; Hosts filters the Voters list). Your ballot is members only. Multi-year switching is a pop-open year control to the right of **{year} Video Game Awards** — only when 2+ public years exist. Switching years keeps the current view and Community · Hosts board. Reveal is a sticky-scroll ceremony (DOM-scrubbed; GOTY #10→#1 with park-right numbers and per-cover tied beats; categories slide full-size #1·#2·#3 columns in from off-screen left #3→#2→#1 so earlier ranks push right smoothly). Results GOTY and Categories share **Ranked · Comparison**; Categories tab loads paginated cover-card tallies (10/page); Voters is SQL-paginated with search. Host / voter **display names** open `?view=ballot&voter=username` (frozen ballot); **@username** goes to profile.

**Recalc rules:** first time status becomes `published`, freeze from current ballots. While still published, schedule tweaks do **not** rebuild. If the edition leaves published (reopen voting) and publishes again, results **rebuild**. Ops `/admin/communities` “Publish / rebuild results” always rebuilds.

### Results (later polish)

- Category matrix / richer individual voter deep pages
- Virtualized all-member columns (current matrix is Hosts-only)

## Hosts

Hosts (the event board) are in v1 for editions. Public UI uses **Host** / **Hosts**. Code and URLs stay Voice (`?mode=voices`).
