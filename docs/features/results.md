# Results

The final results page is the primary design-system foundation.

## Page narrative (shipped on Edition tab when published)

1. Celebratory winner reveal  
2. Second- and third-place  
3. Complete top-ten standings  
4. Community / Voices comparison (**Combined deferred** until Voice weight)  
5. Paged voter list (searchable; Voice marker)  
6. Category winners and tallies  

## Standings modes

```text
Community    Voices
```

Community = all submitted ballots. Voices = designated Voice ballots only.

GOTY past top 10 and voters use **SQL pagination** (50 per page) from normalized freeze tables.

## Ballot matrix

Shipped: searchable paged voter list + “Your ballot” for signed-in voters. Full horizontal matrix / virtualization is later polish.

## Category results

Winner-first editorial block, then tallies, filtered by the same mode switcher.
