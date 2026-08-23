# Product

The Gamies is a consumer gaming platform centered on personal Game of the Year lists, custom lists, game discovery, and community-run awards.

The long-term differentiator: creators, podcasts, Discord communities, Twitch streamers, publications, and other groups can run their own awards. Each **edition** can combine audience ballots with ballots from designated **Hosts**. Separately, **live rankings** continuously aggregate signed-in users’ lists.

## Principles

1. Game artwork and rankings are the primary visual material.
2. Public pages are editorial and content-led; administration is separate.
3. Rankings should be understandable at a glance but support deep exploration.
4. Community, Host, and Combined results stay distinct concepts on **edition** results.
5. **Editions** and **live rankings** are separate systems — do not mix their data or freeze rules.
6. Public game, profile, list, and results pages must be crawlable and shareable. Communities default to **private** (invite join); **public** communities allow open join and appear on profiles. Live/edition/members interiors stay members-only.
7. Mobile is a first-class layout, not a compressed desktop page.
8. Interface stays restrained; personality comes from composition, typography, artwork, and rank treatment.

---

## Two ranking systems (do not conflate)

### Editions (year awards ceremony)

- Community runs an end-of-year **edition** (GOTY year).
- Members (and Hosts) submit **ballots**: GOTY ranking + categories.
- Results stay **hidden** until the edition closes.
- Published results are a **frozen snapshot** — they never recalculate.
- Public results show Combined / Community / Hosts, plus **current users / voters** exploration.

### Live rankings (ongoing board)

- Continuously update from **signed-in users’ lists** (not edition ballots).
- Independent of editions.
- Optional **lock** for suspense (pause updates until unlocked).
- Exists for:
  - **Site-wide** GOTY aggregate (+ categories as applicable)
  - **Per-community** live board (community can turn live rankings **on or off**)
- Lock authority:
  - Community live board → **community admin** only
  - Site-wide live board → **site admin** only

```text
Site
  ├─ Live GOTY aggregate (signed-in lists; admin-lockable)
  ├─ Games browse + game detail
  ├─ Users + lists (GOTY + custom; anonymous create with soft sign-in prompt)
  └─ Communities
        ├─ Live rankings (optional on/off; admin-lockable)
        └─ Editions (year)
              ├─ Ballots hidden until close
              ├─ Frozen results (Combined / Community / Hosts)
              ├─ GOTY + categories
              └─ Voter / current-user exploration
```

---

## v1 scope — in

### Catalog
- Games browse with filters and sorting (parity intent with prior TheGamies app)
- Game detail with the same information classes as the prior build (cover, title, dates, platforms, genres, companies, playtime, etc. as catalog supports)

### Lists
- **GOTY list** per year: up to **100** ranked games
- **Default scoring uses top 10 only**; scoring must be configurable later to weight the full list with a degrading score curve
- **Custom lists** (named ranked lists)
- Shareable list URLs
- **Anonymous create**: anyone can build/publish a list without an account (proto / SocialGamerCard flow)
- Soft prompt to **sign in to save** (persist to account), with **don’t prompt again**
- **Editorial list view** for sharing (static editorial composition from the `goty` proto; video/Remotion deferred)

### Users
- Auth profiles (username, display, bio, avatar upload, **banner**, social links, basic visibility)
- Change **username** (30-day cooldown), **display name**, and **password** on `/account`; **forgot password** on sign-in
- User pages with lists, communities, avatar, banner, and social profiles (X, YouTube, Twitch, Bluesky handles; website as a full URL)
- Community identity with optional avatar, banner, and the same social link platforms
- Anonymous list authors remain public via list URL until/unless claimed by sign-in

### Site aggregate
- Live yearly GOTY aggregate from **signed-in lists only** (abuse control)
- Category rollups where categories apply
- Site-admin lock for suspense

### Communities
- Community home, members, settings (admin surface separate from public chrome)
- Optional **live rankings** toggle
- **Editions** per GOTY year: ballot window → hidden → frozen results
- Edition GOTY + **categories**
- **Hosts** in v1: Combined / Community / Hosts results (public name; code stays Voice / `?mode=voices`)
- Show **current users / voters** on edition results (ballot exploration / who’s in)

### Categories
- **Both** site-wide category definitions and per-community categories

---

## v1 scope — out

- Library / played status
- Native mobile app
- Messaging / complex notification system
- Remotion / video list export (editorial **static** view is in)
- GraphQL / microservices
- Real-time recalculation of **frozen edition** results
- Heavy admin tools embedded in public community pages

---

## Success loops (v1)

1. **Anonymous / casual** — land → build GOTY or custom list → see editorial view → soft prompt to save account.  
2. **Discovery** — browse games → game page → add to list.  
3. **Aggregate** — signed-in lists feed live site GOTY board (lockable).  
4. **Community ceremony** — join (invite or public Join) → submit edition ballot (+ categories) → wait for reveal → explore frozen Combined/Community/Hosts + voters.  
5. **Community live** — if enabled, see always-updating community board from members’ lists.

---

## Implementation order (after this lock)

1. Catalog browse + game detail  
2. Lists (GOTY + custom) + anonymous create + sign-in prompt + editorial list view  
3. User pages + auth  
4. Site live aggregate (+ lock)  
5. Communities + live toggle + editions (ballots, Hosts, frozen results, categories, voters)  
6. IGDB worker hardening / sync ops as needed for catalog depth  

Scoring curve details for “full list degrading scores” and exact Combined Host weight remain open — see [decisions.md](./decisions.md).
