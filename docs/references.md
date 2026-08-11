# Local reference projects

Use local checkouts for discovery while building v2. They must **not** be committed.

## Layout

```text
references/
  legacy-thegamies/     # old thegamies/TheGamies monorepo
  visual-prototype/     # design/test project whose look we like
```

`references/` is gitignored except `.gitkeep`.

## Prefer junctions (no duplicate repos)

```powershell
cd C:\Users\ecdm9\Documents\thegamies-v2
New-Item -ItemType Junction -Path "references\legacy-thegamies" -Target "C:\Users\ecdm9\Documents\TheGamies"
New-Item -ItemType Junction -Path "references\visual-prototype" -Target "C:\Users\ecdm9\goty"
```

Optional: add those folders as extra roots in a Cursor multi-root workspace for easier search.

## Rules

- Mine visual patterns, copy, and UX flows from `goty` (tokens, borders, type hierarchy).
- Do not copy stack, folder sprawl, list-export/Remotion scope, or dashboard UI habits wholesale.
- Design tokens and Editorial Standings in this repo remain the source of truth.
