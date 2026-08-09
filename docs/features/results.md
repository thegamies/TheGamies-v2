# Results

The final results page is the primary design-system foundation. Build it with realistic static fixtures before wiring production data.

## Page narrative

1. Celebratory winner reveal  
2. Second- and third-place  
3. Complete top-ten standings  
4. Combined / Community / Voices comparison  
5. Individual-ballot exploration  
6. Category winners and vote breakdowns  

## Winner area

Large winner artwork, rank marker, title, total points, first-place vote count, ballot count, short editorial explanation; smaller second/third treatments.

## Standings modes

Single surface with:

```text
Combined    Community    Voices
```

Switching source updates ordering and primary score; keep contextual columns available.

Suggested columns: Rank | Game | Selected-source points | Community | Voices | #1 votes | Ballots

Game expand: community rank, voice rank, appearance rate, rank-distribution, 1st–10th counts.

## Ballot matrix

| Voter | #1 | #2 | #3 | … | #10 |

- Horizontally scrollable; voter column pinned on desktop
- Searchable; filter Everyone / Community / Voices
- Voices get a subtle public marker
- Link to individual ballot
- Virtualize or paginate for large communities
- Mobile: focused views, not a compressed full matrix

## Category results

Winner-first editorial block, then detailed tallies, with Community / Voices / View voters using the same table language as standings.
