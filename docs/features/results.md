# Results

The final results page is the primary design-system foundation.

## Page narrative (shipped on Events tab when published)

One results toolbar under the Results heading:

- **Secondary** underline tabs: Reveal · Results · Full standings · Categories · Voters · Your ballot (members only) · Settings (hosts)  
- **Tertiary** text toggle: Community · Hosts (hidden on Your ballot)  

Multi-year switching is a pop-open year control beside the Results heading (2+ public years). Switching years keeps the current view (Reveal · Results · …) and Community · Hosts board. Community Overview · Live Rankings · Events · Members · Settings stay **primary** bordered chips. See `docs/design-system.md` → Navigation hierarchy.

**Reveal** (`?view=` default / `reveal`)

Calm sticky-scroll ceremony (not standings cards). **One sticky viewport per chapter** (title + stage together — nested sticky breaks iOS Safari) so place/award handoffs are horizontal (left in / right out at the same time). Long scrub distance keeps the pace deliberate. Respects `prefers-reduced-motion`.

1. **Opener** — compact centered welcome (`Welcome to the {community} community {year} Video Game Awards` / countdown of the top 10, then category awards) with a dotted accent wash; **Scroll to reveal** plus a short accent line under it. GOTY chapter header (with its rule) fades in from the first scroll  
2. **Chapter titles** pin with the stage at full size at the top. Eyebrow is `{year} {community} community` (uppercase); titles are `{year} Game of the Year` / `{year} Categories`. GOTY ranks sit in the stage *below* the header. Short viewports raise the parked rank/Tied and scale covers so the board stays below that header.  
3. **Game of the Year** — single stage cycles **#10 → #1**. Each rank: the number slides in, grows in the center, then parks on the **right, inset, on the same row as Tied** and **stays through every cover**. Ties: **Tied** lands in the middle, lifts, then each tied game’s cover gets its own beat. Solo ranks skip Tied and bring in that cover. The number only leaves when the next rank takes over.  
4. **Categories** — single stage cycles awards. Each award is one **CategoryRevealBoard** of `#1 · #2 · #3` columns. Columns stay full-size in layout; each **slides in from off-screen left** via `translate3d` and packs stage-left (**#3 → #2 → #1**, earlier ranks push right). Every derived-rank ≤ 3 game is shown; ties use multi-row mosaics with titles. Competition numbering can skip a slot (1–1–3: no #2); dense fills 1 then 2 — follows the event setting  
5. **Summary** — sticky chapter header (`{year} Summary`) with Top 10 + category #1 boards; tied category winners use the rotating stack  
6. **Continue to full results** + **Return to top**

**Host results preview** (while voting is **closed**, before publish): secondary tab **Results preview** before Ballot (`?view=show`), community hosts only. Inner nav: Reveal · Results · Full standings · Categories (same URLs as public results views, host-gated while closed). Default **demo** uses placeholder covers and Game 1… titles for GOTY + each event award. Results keeps **Ranked · Comparison** (SSR matrices; no published-only API). **Show real results** navigates to `&source=live` (separate request) and SSR-loads freeze boards. Public standings/comparison APIs stay published-only; host Full standings uses SSR rows (first page when live).

**Results** (`?view=results`, also accepts `overview`)

Tertiary **Ranked · Comparison** at the top of the page (default Ranked) applies to both GOTY and Categories. SSR loads Ranked data only (GOTY through 10 + category podiums); Comparison matrices fetch on first Comparison click (`/api/.../comparison`).

1. **Game of the Year** — Ranked: one continuous wrapping Top 10 grid (no horizontal scroll); large place in front of the title. Comparison: per-rank chapters, each with You · Community · Hosts · each Host; **rank rows share one horizontal scroll** so columns stay aligned → link to **Full standings** when more than 10. Comparison numbering follows the event’s competition or dense setting (no Skip / Dense / Board picker).  
2. Category awards — Ranked: every freeze row with **displayed rank ≤ 3** per award (full ties at the cutoff), **one line**, `HorizontalScroll` if needed; place in front of the title; #1 slightly wider. Comparison: same per-award chapters, each with You · Community (#1, stacked if tied) · Hosts (#1) · each Host. Each award links to **Full standings** for that category (`?view=category&category=`).  

Sections use the accent-tick `SectionRule` between later blocks.  

**Full standings** — cover card grid for the entire GOTY board (paged from the server). Release year is not shown on cards.

**Categories** — top 3 per award on one line (horizontal scroll if needed), with a link to full category standings.

**Category standings** (`?view=category&category=`) — paginated cover cards for one award (**10** per page, Load more via API).

**Voters** (`?view=voters`) — SQL-paginated voter list (50) with name/@username search. Available after results publish **and** while voting is open or closed (turnout; names only — ballots stay hidden until publish). Community · Hosts filters Hosts-only when on Hosts. After publish, **display name** opens that voter’s ballot (from ballot tables, read-only after close); **@username** opens their profile.

**Your ballot** (`?view=ballot`) — member-only read-only view of the signed-in member’s submitted ballot for this edition. Community · Hosts toggle is hidden here.

**Debug (local `next dev` only):** on Results, beside Community · Hosts, use **Repeat** (Off · ×2 · …) and **Cap** (− / Off / +) to stress category Reveal mosaics — cap truncates each derived-rank group first, then repeat clones each rank. No URL params; hidden in production.

## Standings modes and views

```text
Reveal    Results    Full standings    Categories    Voters    Your ballot
Community     Hosts
Ranked        Comparison
```

Community = all submitted ballots. Hosts = designated Host ballots only.

## Displayed rank

Freeze rows keep a unique **board order** `place` (sort key + pagination cursor). The number on cards is **derived at read** from equal GOTY **points** or category **votes**. Secondary keys (#1s, appearances, `gameId`) sort only — they do not split a rank.

Host setting on the event (Event Settings → Tie numbering). Default **dense** for new events. Hosts may change it anytime; displayed rank is derived at read. Not a public URL chooser.

- **Competition** — SQL `RANK`: equal scores share a number; next score skips (1–1–3)
- **Dense** — SQL `DENSE_RANK`: equal scores share a number; next score is the next number (1–1–2)

Pages are **N games**, not N distinct ranks. Pager copy stays “51–100 of N games.” Top 10 / Top 3 means derived rank ≤ 10 / 3.

## GOTY comparison

Results GOTY Comparison uses parallel top-10 data as **per-rank chapters**. Rank rows share one horizontal scroll so You / Community / Hosts / Host columns stay aligned. Community and Hosts each load every freeze row with **displayed rank ≤ 10** (full ties at the cutoff), not the first N board-order places. Community and Hosts ties (equal points) follow the event’s numbering (competition skip or dense). Tied games share one slot as a compact rotating stack. No Board / span layout picker.

Tie stacks fit one card footprint (overlapping covers, auto-rotate + click to cycle). You and individual Host columns stay single ballot ranks.

## Category results

Results: tertiary **Ranked · Comparison** (shared for GOTY and Categories). Ranked GOTY is a wrapping Top 10; Ranked Categories is displayed rank ≤ 3 on one line with horizontal scroll (full ties). Comparison keeps per-award / per-rank chapters; each shows You · Community (#1, stacked if tied) · Hosts (#1) · each Host pick. Categories tab mirrors top 3 strips; full tallies live on `?view=category&category=` (SQL-paginated cover cards, 10 per page).
