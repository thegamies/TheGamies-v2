# Results

The final results page is the primary design-system foundation.

## Page narrative (shipped on Edition tab when published)

1. Celebratory winner reveal  
2. Second- and third-place  
3. Complete top-ten standings  
4. **Ballot matrix** — You · Community · Voices · each Voice (horizontal scroll)  
5. Paged voter list (searchable; Voice marker)  
6. Category winners and tallies  

## Standings modes

```text
Community    Voices
```

Community = all submitted ballots. Voices = designated Voice ballots only.

Winner / Top 10 load on the page. Top 10 uses the games-browse **cover card grid**. Full standings beyond #10 stay collapsed until expanded, then load from the server in pages (50) — not on the initial HTML response.

GOTY voters use **SQL pagination** (50 per page) from normalized freeze tables.

## Ballot matrix

Horizontally scrollable parallel top-10 lists on published results:

| # (sticky) | You | Community | Voices | Voice A | Voice B | … |
|---|---|---|---|---|---|---|
| 1 | game | game | game | game | game | … |
| … | … | … | … | … | … | … |
| 10 | … | … | … | … | … | … |

- **Rows:** ranks 1–10 (same down every column).
- **Columns:** each source’s top-10 **game** list (cover + title; — if empty). Only the rank column stays pinned; all list columns scroll horizontally.
- **You** column only when the signed-in viewer has a frozen ballot.
- Voice columns = all designated Voices for the edition (not every community member).
- Fixed top 10 — no matrix pagination.
- Category matrix deferred.

Shipped separately: searchable paged voter list + “Your ballot” for signed-in voters. Full virtualization / all-member columns remain later polish.

## Category results

Winner-first editorial block, then tallies, filtered by the same mode switcher.
