# Results

The final results page is the primary design-system foundation.

## Page narrative (shipped on Edition tab when published)

One results toolbar under the Results heading:

- **Secondary** underline tabs: Reveal · Highlights · Full standings · Categories · Voters · Your ballot (members only)  
- **Tertiary** text toggle: Community · Voices (hidden on Your ballot) · Competition · Dense  

Multi-year switching is a pop-open year control beside the Results heading (2+ public years). Community Overview · Live · Edition · Settings stay **primary** bordered chips. See `docs/design-system.md` → Navigation hierarchy.

**Reveal** (`?view=` default / `reveal`)

Calm sticky-scroll ceremony (not standings cards). **One sticky viewport per chapter** (title + stage together — nested sticky breaks iOS Safari) so place/award handoffs are horizontal (left in / right out at the same time). Long scrub distance keeps the pace deliberate. Respects `prefers-reduced-motion`.

1. **Chapter titles** pin with the stage and shrink early in the scrub  
2. **Game of the Year** — single stage cycles **#10 → #1**. Each rank: the number slides in, grows in the center, then parks on the **right, inset, on the same row as Tied** and **stays through every cover**. Ties: **Tied** lands in the middle, lifts, then each tied game’s cover gets its own beat. Solo ranks skip Tied and bring in that cover. The number only leaves when the next rank takes over.  
3. **Categories** — single stage cycles awards the same way; within each award layout **#1 · #2 · #3**, appear **#3 → #2 → #1**. A slot is a rank group (every tied game shows a cover). Competition can skip a slot (1–1–3: no #2); Dense fills 1 then 2  
4. **Summary** — Top 10 + each category’s #1 (all games at rank 1) on a normal scrolling board  
5. Quiet cue toward Highlights

**Highlights** (`?view=overview`)

1. **Game of the Year** — tertiary **Podiums · Ranked · Comparison**. Podiums: celebratory Top 3 + Rest of the Top 10 (**derived rank ≤ 3 / 10**, which can be more than 3/10 games). Ranked: one continuous wrapping Top 10 grid (no horizontal scroll); large place in front of the title. Comparison: per-rank chapters, each with You · Community · Voices · each Voice → link to **Full standings** when more than 10  
2. Category awards — tertiary **Podiums · Ranked · Comparison** toggle. Podiums: Top 3 per award (derived rank ≤ 3). Ranked: place in front of the title; #1 ≈ GOTY card size, #2/#3 smaller; one row. Comparison: same per-award chapters, each with You · Community (#1, stacked if tied) · Voices (#1) · each Voice → link to **Categories**  

Sections use the accent-tick `SectionRule` between later blocks.  

**Full standings** — cover card grid for the entire GOTY board (paged from the server).

**Categories** — per-award cover card grids, **10 per page**, Load more via API. Not the full tally dump on Highlights.

**Voters** (`?view=voters`) — SQL-paginated voter list (50) with name/@username search. Community · Voices filters Voices-only when on Voices. **Display name** opens that voter’s frozen ballot; **@username** opens their profile.

**Your ballot** (`?view=ballot`) — member-only read-only view of the signed-in member’s submitted ballot for this edition. Community · Voices toggle is hidden here.

**Public voter ballot** (`?view=ballot&voter=username`) — frozen GOTY + category picks for any submitted voter. Linked from Voice names (GOTY / category Comparison strips) and the Voters list. Profile is secondary via `@username` on the ballot page.

## Standings modes and views

```text
Reveal    Highlights    Full standings    Categories    Voters    Your ballot
Community     Voices
```

Community = all submitted ballots. Voices = designated Voice ballots only.

## Displayed rank

Freeze rows keep a unique **board order** `place` (sort key + pagination cursor). The number on cards is **derived at read** from equal GOTY **points** or category **votes**. Secondary keys (#1s, appearances, `gameId`) sort only — they do not split a rank.

Viewer chooser `?rank=` (default **competition**):

- **Competition** — SQL `RANK`: equal scores share a number; next score skips (1–1–3)
- **Dense** — SQL `DENSE_RANK`: equal scores share a number; next score is the next number (1–1–2)

Pages are **N games**, not N distinct ranks. Pager copy stays “51–100 of N games.” Top 10 / Top 3 means derived rank ≤ 10 / 3.

## GOTY comparison

Highlights GOTY Comparison uses parallel top-10 data as **per-rank chapters**. Community and Voices ties (equal points):

- **Skip** (default) — competition ranking: tied games share one slot as a compact rotating stack; next distinct score skips (e.g. #1 · #1 → next chapter **#3**). Follows `?rank=competition`.
- **Dense** — same stacks; next chapter is the next number (**#2**, not #3). Follows `?rank=dense`.
- **Board** — Comparison-only layout: the same tied stack fills every ordinal spot the group occupies (#1 and #2 both show the stack; #3 is the next game). Not a rank formula.

Tie stacks fit one card footprint (overlapping covers, auto-rotate + click to cycle). You and individual Voice columns stay single ballot ranks.

## Category results

Highlights: tertiary **Podiums · Ranked · Comparison**. Podiums keep podium (`maxPlace: 3` by derived rank) only. Ranked reuses that Top 3 with place in front of the title (tiered card sizes). Comparison keeps per-award chapters; each shows You · Community (#1, stacked if tied) · Voices (#1) · each Voice pick. Categories tab: SQL-paginated cover cards (10) per award.
