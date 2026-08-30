# Community

## Two systems

| System | Source | Visibility | Mutability |
|---|---|---|---|
| **Live Rankings** | Signed-in members’ lists | Board visible when enabled; scores from host date (all years); lock freezes board | Continuous until **locked** |
| **Events** (internal: editions) | Event ballots (GOTY + categories) | Hidden until `publishesAt` | **Frozen** after publish (payload later) |

Communities may turn **Live Rankings** on or off. Events are the end-of-year awards vote. Code and URLs keep `live` / `edition`.

## Identity + membership (shipped)

Signed-in users with a **profile** can **create** a community (name + optional description + **visibility**; URL slug is derived from the name). The creator is the first internal `admin` member. Default visibility is **private** (invite-only; not listed on profiles). **Public** communities anyone can join from the community page, and they appear on member **profiles**. `/communities` lists **My Communities** (memberships only) — not a public Discover directory. Private interiors stay members-only; public non-members see a limited home (about + Join). Live, Events, members, ballot, and settings stay members-only. Private join still uses an **invite code**. Admins always see **Copy invite** in the community header. They manage the current code, generate a new one, and optionally turn on **open invites** (members can copy the invite from the header) under Settings → Invite. Admins set **banner**, **avatar**, **social links**, and **visibility** under Settings → Community. Admins can edit **name** and **description** there; the URL **slug stays fixed**. Admins can add other admins under Settings → Community. Admins can **remove** or **ban** members from the Members page (remove allows rejoin with invite or public Join; ban blocks join until unbanned). Banned people are listed under Settings → Community with Unban. Admins can **request deletion** (type the community name to confirm); the request is stored as `pending` in `community_deletion_requests` for ops to fulfill — the community is not wiped immediately. The last admin cannot leave — that note lives on Settings, not Overview. The last host also cannot delete their account until they add another host. Account deletion tombs the profile: lists and memberships go; published ceremonies keep an anonymized **Former member** voter line (scores stay frozen, including Results Comparison host columns).

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

Hosts create events from Overview (when none exist yet) or Settings → Events (**Create event** goes to `/create/event`): year, schedule, categories, and tie numbering (dense by default) in one submit. Leaving with a draft prompts to stay or leave. The open date may be in the past (voting already open). Close cannot precede open, and publish cannot precede close — including on the same day. Each schedule field is a split date + time picker with a **Set to now** shortcut. Order errors and status-change copy appear under the field that caused them; Create/Save is one click when the order is valid (status-change copy is informational, not a second confirm). New events always have a full schedule — not a draft. Hosts can **delete** an event after typing that year to confirm (ballots and results go with it). Public home and the Events tab both use **{year} Video Game Awards**. Overview lists up to **three** public events (open → coming soon → closed → results, then newest created) as `PromoBanner`s — year watermark, status, and a CTA (Cast your ballot / View event / See results). If the community is opted into an enabled Pick’em year, that banner sits above Events (promoted year first, else newest) and links into the community board. Nav: **Events** tab (year switcher inside) when any non-draft event exists — ballot and results share that surface. While voting is **open** or **closed**, Events also shows **Voters** (paginated names; picks stay hidden until publish) and the awards header shows how many ballots were submitted. Public UI says **Events** and **Live Rankings**; URLs stay `/edition` and `/live`.

### URLs

- `/communities` — **Communities** page with a **My Communities** list of signed-in memberships only (paged; 24 per page). Not a public directory.
- `/communities/new` — signed-in create (requires profile)
- `/communities/join/[code]` — join with a current invite code
- `/communities/[slug]` — home: members see about, leave, and up to three events (hosts with none yet see **Create event**). **Public** non-members see limited about + Join. **Private** non-members see an invite-only notice.
- `/communities/[slug]/members` — paged member roster (members only)
- `/communities/[slug]/live` → current year; `/communities/[slug]/live/[year]?page=`
- `/communities/[slug]/edition` → featured year; `/communities/[slug]/edition/[year]` — GOTY event (vote + results by schedule)
- `/communities/[slug]/ballot` → redirects to edition
- `/communities/[slug]/results` → redirects to edition
- `/communities/[slug]/settings` — hosts only. Secondary tabs: **Live Rankings** (`?tab=live`, default), **Events** (`?tab=events`), **Hosts** (`?tab=hosts`), **Community** (`?tab=community`), and **Invite** (`?tab=invite`). Events: **Create event** plus a list of years with links to **Edition settings** / **Manage hosts** / **Host preview** (open/closed). Hosts: Promote / Retire the community Hosts roster (SQL-capped search). Community: name + description + **visibility** + social links, banner + avatar upload, add/remove admins (SQL-capped search; last admin cannot be removed), banned list + unban, leave, and request deletion (type name to confirm → `community_deletion_requests`). Invite: copy the current join link, generate a new code (retires the old one), and toggle **open invites** so members (not only admins) can copy the invite from the header.
- `/communities/[slug]/create/event` — hosts only. Create event: year, schedule, categories, tie numbering. Redirects to that year’s Edition settings.
- Profile `/u/[username]` **Communities** tab (`?tab=communities`) lists **public** communities the person belongs to (paged; 24 per page). Private memberships stay off profiles.

### Non-goals (next slices)

- Weighted Combined (Host %)
- Approval join, extra roles
- Site-admin-only create gate
- Per-community custom defs / multi / ranked edition category modes
- Full all-member ballot matrix virtualization

## Public shell

```text
Community identity
Live Rankings status (if enabled) / lock state
Active event status and year
Hosts

Overview    Live Rankings    Events    Video Game Awards Pick’em (if opted in)    Members
```

Exact tab labels: **Live Rankings** and **Events** (not Live / Edition). Vote and results share the Events tab with a year switcher. Settings is hosts only, with Live Rankings · Events · Hosts · Community · Invite as secondary tabs.

Settings and event management live on a separate administrative surface. Community Settings → Events lists every year and links into that year’s Edition settings / Manage hosts / Host preview.

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
8. Event **Settings** tab (`?view=settings`) with tertiary panels: **Edition settings** (default — schedule, categories, and tie numbering share one Save), **Manage hosts** (`&panel=hosts`, writable after close), **Host preview** (`&panel=preview`, paged, while open/closed). While **closed**, hosts also get a secondary **Results preview** tab before Ballot (`?view=show`): inner Reveal · Results · Full standings · Categories. Default **demo** uses placeholder covers and Game 1… names; **Show real results** navigates to `&source=live` (separate request) and SSR-loads freeze standings (no published-only APIs). Community Settings → Events links to **Create event** and into those panels. Category add on create + Edition settings is a viewport-contained modal: search stays pinned, tiles stay in the grid with **Added**, tap again to unselect.

### Ballots (shipped)

Separate tables from personal lists / live contrib:

- `community_edition_ballots` — one per `(editionId, profileId)`
- `community_edition_ballot_items` — ranked GOTY (up to 10; scoring uses `pointsForRank`)
- `community_edition_ballot_category_votes` — site `award_categories` **single-choice** only (enabled subset from `community_edition_categories`)
- `community_edition_categories` — which site awards are on this event (+ order). Reveal / Results / Categories join freeze rows to this set so awards removed from settings no longer appear. Removing an award while voting is open also deletes that award’s ballot picks.

**Eligibility:** signed-in profile that is a community member (including hosts). Non-members see a private notice and need an invite.

**Edit window:** submit and update while status is `open` (until `closesAt`). After close/publish, the voter’s ballot is read-only (or “you did not submit”).

Does not write `live_*_contrib`. Does not feed live rankings.

### Ops seed (admin)

`/admin/communities` (site operators): create synthetic `seed:community:*` profiles, join a community by slug, optionally mark Hosts, write edition ballots (creates a scheduled-open edition window if missing). No total seed-index cap. Each server request writes at most 50 members (bulk inserts); the admin UI loops larger counts and can keep appending until Stop. Frozen results rebuild once at the end of a run if that option is on. Clear removes seed memberships/ballots/Hosts; optional profile delete. Separate from standings seed (`/admin/seed`). Community pick’em sheets are seeded on `/admin/the-game-awards/seed` (community slug; empty seed-member sheets only; community must already be opted in).

### Hosts (shipped)

**Admin** (`community_members.role = admin`) is not a Host. Hosts are a separate community roster (`community_hosts`, Promote / Retire under Settings → **Hosts**). Creating a community makes the founder an admin only.

Open or draft GOTY events, and pick’em years that are not locked, stay in sync with current Hosts. Closed, published, or locked years keep that year’s snapshot until someone edits it by hand. Manage hosts on an event (`?view=settings&panel=hosts`, `community_edition_voices`) still adds or removes a member **for that year only** — including after close. That does not Promote or Retire them. Default list is **current community Hosts + this year’s Hosts** (SQL-capped). Search is a **server query** (name / @username, hit cap). Public UI says Host / Hosts; URLs stay `?mode=voices`. Schedule and categories live under Settings → **Edition settings**.

### Results (shipped)

On close, write-once freeze into normalized tables (`community_edition_result_*`) for **GOTY boards, category tallies, and the voter roster only**. Changing Hosts after freeze **rebuilds Hosts rows only** (`mode = voices`); the Community board stays frozen. Individual voter GOTY ranks and category picks are **not** copied into freeze tables — Results Comparison and voter ballot views read them from `community_edition_ballot_*` (read-only after close). Those ballot rows and freeze voter lines **restrict-delete** against `profiles`, so tombstoning a host cannot CASCADE the person off Comparison. Public mode switcher is **Community · Hosts** (Combined hidden until weighted scoring). Displayed rank is derived at read from equal points/votes using the event’s **tie numbering** setting (dense 1–1–2 default for new events, or competition 1–1–3). Hosts set this in Event Settings and may change it after publish (no freeze rebuild). Unique freeze `place` stays board order. GOTY and voters are **SQL-paginated** (50 games, not 50 ranks). Categories load in full (small).

Board tallies are computed with **SQL `GROUP BY`** on ballot tables (same `pointsForRank` / plurality rules as before), then chunked into freeze rows for Neon HTTP. Hosts boards join `community_edition_voices`. Category top-N reads use window `RANK` / `DENSE_RANK` (not a correlated scan over full tallies). Reveal and Results Ranked SSR load GOTY through 10 + category podiums only; Comparison is `?view=comparison` and SSR-loads matrices on that route. If a freeze fails mid-write, tables are cleared so the next ensure/rebuild can retry a complete snapshot. Rebuild no longer photocopies every voter’s category picks (that was the multi-minute / timeout path at a few hundred ballots).

**GOTY / category Comparison:** Results GOTY and Categories share **Ranked / Comparison** on the board row below the view tabs (default Ranked). GOTY Ranked is a wrapping Top 10 grid with place in front of the title. Category Ranked is displayed rank ≤ 3 per award on one line with horizontal scroll (full ties). Comparison lays out parallel lists as per-rank (GOTY) or per-award (Categories) chapters — You · Community · Hosts · each Host — not one mega-table. GOTY Comparison numbering follows the event’s competition or dense setting.

**Views:** Spoiler-safe **entrance** on bare published URL (first 30 days after `publishesAt`, until the browser remembers a Results choice (cookie + localStorage)) → then **Results** by default. **Reveal** · Results · Full standings · Categories · Voters · Your ballot (`?view=reveal` / `results` / …) as **secondary** underline tabs; Community / Hosts as segmented controls on the row below the divider (hidden on Your ballot; Hosts filters the Voters list). Your ballot is members only. Multi-year switching is a pop-open year control to the right of **{year} Video Game Awards** — only when 2+ public years exist. Switching years keeps the current view and Community · Hosts board. Reveal is a sticky-scroll ceremony (DOM-scrubbed; GOTY #10→#1 with park-right numbers and per-cover tied beats; categories slide full-size #1·#2·#3 columns in from off-screen left #3→#2→#1 so earlier ranks push right smoothly). Results GOTY and Categories share **Ranked · Comparison**; Categories tab loads paginated cover-card tallies (10/page); Voters is SQL-paginated with search. Host / voter **display names** open `?view=ballot&voter=username` (frozen ballot); **@username** goes to profile.

**Recalc rules:** freeze begins when voting **closes** (cron + schedule `after()` kick), with exclusive `freeze_status` claim. Results become public when `publishesAt` is reached **and** freeze is ready. While computing, the edition page shows a calculating message. While still published, schedule tweaks do **not** rebuild. If the edition leaves published (reopen voting) and publishes again, results **rebuild**. Ops `/admin/communities` “Publish / rebuild results” always rebuilds.

### Results (later polish)

- Category matrix / richer individual voter deep pages
- Virtualized all-member columns (current matrix is Hosts-only)

## Hosts

Hosts (the event board) are in v1 for editions. Public UI uses **Host** / **Hosts**. Code and URLs stay Voice (`?mode=voices`).
