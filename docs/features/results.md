# Results

The final results page is the primary design-system foundation.

## Page narrative (shipped on Edition tab when published)

One results toolbar under the Results heading:

- **Secondary** underline tabs: Highlights · Full standings · Categories · Voters · Your ballot (members only)  
- **Tertiary** text toggle: Community · Voices (hidden on Your ballot)  

Multi-year switching is a pop-open year control beside the Results heading (2+ public years). Community Overview · Live · Edition · Settings stay **primary** bordered chips. See `docs/design-system.md` → Navigation hierarchy.

**Highlights** (`?view=` default / `overview`)

1. **GOTY Top 3** — celebratory podium (#1 · #2 · #3)  
2. **Rest of the Top 10** — places 4–10 in one row (fits wide desktop; horizontal scroll on smaller screens) → link to **Full standings** when more than 10  
3. Ballot matrix (page-sticky column headers synced to horizontal pan; drag / prev·next)  
4. Category podiums (#1 · #2 · #3 left-aligned, tops aligned; fluid covers fit 360px without sideways scroll) → link to **Categories**  

Sections use the accent-tick `SectionRule` between later blocks.  

**Full standings** — cover card grid for the entire GOTY board (paged from the server).

**Categories** — per-award cover card grids, **10 per page**, Load more via API. Not the full tally dump on Highlights.

**Voters** (`?view=voters`) — SQL-paginated voter list (50) with name/@username search. Community · Voices filters Voices-only when on Voices. **Display name** opens that voter’s frozen ballot; **@username** opens their profile.

**Your ballot** (`?view=ballot`) — member-only read-only view of the signed-in member’s submitted ballot for this edition. Community · Voices toggle is hidden here.

**Public voter ballot** (`?view=ballot&voter=username`) — frozen GOTY + category picks for any submitted voter. Linked from Voice names (ballot matrix + category strips) and the Voters list. Profile is secondary via `@username` on the ballot page.

## Standings modes and views

```text
Highlights    Full standings    Categories    Voters    Your ballot
Community     Voices
```

Community = all submitted ballots. Voices = designated Voice ballots only.

## Ballot matrix

Horizontally scrollable parallel top-10 lists on Highlights. Cover cards have **no** rank on the art — matrix uses the pinned `#` column. Rest of the Top 10, Full standings, and Categories put the accent rank **in front of the title** (not on the cover).

## Category results

Highlights: podium (`maxPlace: 3`), then a ballot-matrix-style horizontal table (You · each Voice pick). Categories tab: SQL-paginated cover cards (10) per award.
